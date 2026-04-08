import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/** Evita timeout em importações grandes (Netlify/Vercel). Ajuste no painel se necessário. */
export const maxDuration = 300

function normalizarCpf(valor: string | number | null | undefined): string {
  const dig = String(valor ?? "").replace(/\D/g, "")
  if (!dig) return ""
  return dig.slice(-11).padStart(11, "0")
}

function cpfFormatadoBr(cpf11: string): string {
  if (cpf11.length !== 11) return cpf11
  return `${cpf11.slice(0, 3)}.${cpf11.slice(3, 6)}.${cpf11.slice(6, 9)}-${cpf11.slice(9)}`
}

/** matricula / matricula_saude = carteirinha saúde; matricula_odonto = odonto (importação seletiva). */
type LinhaEntrada = {
  cpf?: string
  nome?: string
  /** Legado: mesmo que matricula_saude */
  matricula?: string
  matricula_saude?: string
  matricula_odonto?: string
}

type VidaRow = {
  id: string
  nome: string | null
  cpf: string | null
  dados_adicionais: Record<string, unknown> | null
  ativo: boolean | null
  tipo: string | null
  cliente_administradora_id: string | null
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function carregarVidasPorCpfs(
  administradoraId: string,
  tenantId: string,
  cpfsNorm: string[]
): Promise<Map<string, VidaRow[]>> {
  const map = new Map<string, VidaRow[]>()
  if (cpfsNorm.length === 0) return map

  // Aceita CPF salvo com ou sem máscara no banco.
  const termosBusca = Array.from(
    new Set(
      cpfsNorm.flatMap((c) => [c, cpfFormatadoBr(c)]).filter((c) => c.length > 0)
    )
  )

  for (const termos of chunkArray(termosBusca, 300)) {
    const { data, error } = await supabaseAdmin
      .from("vidas_importadas")
      .select(
        "id, nome, cpf, dados_adicionais, ativo, tipo, cliente_administradora_id"
      )
      .eq("tenant_id", tenantId)
      .eq("administradora_id", administradoraId)
      .in("cpf", termos)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message || "Erro ao listar vidas importadas")
    }
    const chunk = (data || []) as VidaRow[]
    for (const row of chunk) {
      const k = normalizarCpf(row.cpf)
      if (!k || k.length !== 11) continue
      const arr = map.get(k) || []
      arr.push(row)
      map.set(k, arr)
    }
  }
  return map
}

/**
 * POST /api/administradora/importacao-matriculas
 * Body: { administradora_id, linhas: [{ cpf, matricula?, matricula_saude?, matricula_odonto?, nome? }] }
 * Atualiza carteirinha saúde e/ou odonto por CPF: prioriza vidas_importadas; se não houver vida, tenta clientes_administradoras via proposta.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = typeof body?.administradora_id === "string" ? body.administradora_id.trim() : ""
    const linhas = Array.isArray(body?.linhas) ? (body.linhas as LinhaEntrada[]) : []

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }
    if (linhas.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar" }, { status: 400 })
    }
    if (linhas.length > 2000) {
      return NextResponse.json(
        { error: "Limite de 2000 linhas por envio. Divida o arquivo em partes menores." },
        { status: 400 }
      )
    }

    const { data: adm, error: admErr } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    if (admErr || !adm?.tenant_id) {
      return NextResponse.json({ error: "Administradora não encontrada" }, { status: 404 })
    }
    const tenantId = String(adm.tenant_id)

    const cpfsEntrada = Array.from(
      new Set(
        linhas
          .map((l) => normalizarCpf(l?.cpf))
          .filter((c) => c.length === 11)
      )
    )

    const vidasPorCpf = await carregarVidasPorCpfs(administradoraId, tenantId, cpfsEntrada)

    /** Carteirinhas já salvas no contrato (colunas), para cruzar com JSON da vida ao detectar "já cadastrado". */
    const carteirinhasContratoPorClienteId = new Map<string, { saude: string; odonto: string }>()
    {
      const idsCa = new Set<string>()
      for (const arr of vidasPorCpf.values()) {
        for (const v of arr) {
          const id = v.cliente_administradora_id
          if (id) idsCa.add(id)
        }
      }
      const idList = Array.from(idsCa)
      for (const ids of chunkArray(idList, 300)) {
        if (ids.length === 0) continue
        const { data: rowsCa, error: errCa } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, numero_carteirinha, numero_carteirinha_odonto")
          .eq("tenant_id", tenantId)
          .eq("administradora_id", administradoraId)
          .in("id", ids)
        if (errCa) {
          return NextResponse.json(
            { error: errCa.message || "Erro ao carregar carteirinhas dos contratos" },
            { status: 500 }
          )
        }
        for (const row of (rowsCa || []) as {
          id: string
          numero_carteirinha?: string | null
          numero_carteirinha_odonto?: string | null
        }[]) {
          carteirinhasContratoPorClienteId.set(row.id, {
            saude: String(row.numero_carteirinha || "").trim(),
            odonto: String(row.numero_carteirinha_odonto || "").trim(),
          })
        }
      }
    }

    // Pré-carrega propostas por CPF (com/sem máscara) para evitar consultas por linha.
    const propostasPorCpf = new Map<string, Set<string>>()
    if (cpfsEntrada.length > 0) {
      const termosProposta = Array.from(
        new Set(cpfsEntrada.flatMap((c) => [c, cpfFormatadoBr(c)]))
      )
      type PropostaRow = { id: string; cpf: string | null }
      const propostasRows: PropostaRow[] = []
      for (const termos of chunkArray(termosProposta, 300)) {
        const { data: propData, error: propErr } = await supabaseAdmin
          .from("propostas")
          .select("id, cpf")
          .eq("tenant_id", tenantId)
          .in("cpf", termos)
        if (propErr) {
          return NextResponse.json(
            { error: propErr.message || "Erro ao buscar propostas para importação" },
            { status: 500 }
          )
        }
        propostasRows.push(...((propData || []) as PropostaRow[]))
      }

      for (const p of propostasRows) {
        const k = normalizarCpf(p.cpf)
        if (!k || !p.id) continue
        const set = propostasPorCpf.get(k) || new Set<string>()
        set.add(p.id)
        propostasPorCpf.set(k, set)
      }
    }

    // Pré-carrega contratos por proposta para evitar consultas por linha.
    const clientesPorProposta = new Map<string, string[]>()
    const propostaIdsTodos = Array.from(
      new Set(Array.from(propostasPorCpf.values()).flatMap((s) => Array.from(s)))
    )
    if (propostaIdsTodos.length > 0) {
      type ClientePropostaRow = { id: string; proposta_id: string | null }
      for (const ids of chunkArray(propostaIdsTodos, 300)) {
        const { data: clientesRows, error: caErr } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id")
          .eq("tenant_id", tenantId)
          .eq("administradora_id", administradoraId)
          .in("proposta_id", ids)
        if (caErr) {
          return NextResponse.json(
            { error: caErr.message || "Erro ao buscar contratos para importação" },
            { status: 500 }
          )
        }
        for (const c of (clientesRows || []) as ClientePropostaRow[]) {
          if (!c.proposta_id || !c.id) continue
          const arr = clientesPorProposta.get(c.proposta_id) || []
          arr.push(c.id)
          clientesPorProposta.set(c.proposta_id, arr)
        }
      }
    }

    type ItemResultado = {
      linha: number
      cpf: string
      nome_planilha?: string
      status: "ok" | "erro" | "ignorado"
      mensagem?: string
      destino?: "vida_importada" | "cliente_administradora"
      beneficiario_nome?: string
      /** Indica se já existia valor antes desta linha (para saúde / odonto). */
      ja_tinha_saude?: boolean
      ja_tinha_odonto?: boolean
    }

    const resultados: ItemResultado[] = []
    const historicoLote: {
      vida_id: string
      tenant_id: string
      alteracoes: Record<string, unknown>
    }[] = []

    for (let i = 0; i < linhas.length; i++) {
      const linhaNum = i + 1
      const raw = linhas[i] || {}
      const cpf = normalizarCpf(raw.cpf)
      const matSaude = String(raw.matricula_saude ?? raw.matricula ?? "").trim()
      const matOdonto = String(raw.matricula_odonto ?? "").trim()
      const nomePlan = String(raw.nome ?? "").trim()

      if (!cpf || cpf.length !== 11) {
        resultados.push({
          linha: linhaNum,
          cpf: cpf || "—",
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: "CPF inválido ou vazio",
        })
        continue
      }

      if (!matSaude && !matOdonto) {
        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: "Informe matrícula saúde e/ou matrícula odonto",
        })
        continue
      }

      const candidatosVida = vidasPorCpf.get(cpf) || []
      const vidasAtivas = candidatosVida.filter((v) => v.ativo !== false)
      const pool = vidasAtivas.length > 0 ? vidasAtivas : candidatosVida

      if (pool.length > 1) {
        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: `Mais de um beneficiário com este CPF na base (${pool.length}). Ajuste manualmente no grupo.`,
        })
        continue
      }

      if (pool.length === 1) {
        const vida = pool[0]
        const da =
          vida.dados_adicionais && typeof vida.dados_adicionais === "object" && !Array.isArray(vida.dados_adicionais)
            ? { ...vida.dados_adicionais }
            : {}
        const antesSaude = String(
          (da["numero_carteirinha"] as string) ||
            (da["Número da carteirinha"] as string) ||
            (da["carteirinha"] as string) ||
            ""
        ).trim()
        const antesOdonto = String((da["numero_carteirinha_odonto"] as string) || (da["carteirinha_odonto"] as string) || "").trim()
        const caCart =
          vida.cliente_administradora_id != null
            ? carteirinhasContratoPorClienteId.get(vida.cliente_administradora_id)
            : undefined
        const ja_tinha_saude = Boolean(antesSaude) || Boolean(caCart?.saude)
        const ja_tinha_odonto = Boolean(antesOdonto) || Boolean(caCart?.odonto)

        if (matSaude) da["numero_carteirinha"] = matSaude
        if (matOdonto) da["numero_carteirinha_odonto"] = matOdonto

        const { error: upErr } = await supabaseAdmin
          .from("vidas_importadas")
          .update({ dados_adicionais: da })
          .eq("id", vida.id)
          .eq("tenant_id", tenantId)
          .eq("administradora_id", administradoraId)

        if (upErr) {
          resultados.push({
            linha: linhaNum,
            cpf,
            nome_planilha: nomePlan || undefined,
            status: "erro",
            mensagem: upErr.message || "Erro ao atualizar vida importada",
          })
          continue
        }

        const histPayload: Record<string, unknown> = { origem: "importacao-matriculas" }
        if (matSaude) {
          histPayload.saude = { antes: antesSaude || null, depois: matSaude }
        }
        if (matOdonto) {
          histPayload.odonto = { antes: antesOdonto || null, depois: matOdonto }
        }
        if (matSaude && !matOdonto) {
          histPayload.antes = antesSaude || null
          histPayload.depois = matSaude
        }

        historicoLote.push({
          vida_id: vida.id,
          tenant_id: tenantId,
          alteracoes: {
            importacao_matriculas: histPayload,
          },
        })

        if (vida.cliente_administradora_id) {
          const updCa: Record<string, string> = {}
          if (matSaude) updCa.numero_carteirinha = matSaude
          if (matOdonto) updCa.numero_carteirinha_odonto = matOdonto
          if (Object.keys(updCa).length > 0) {
            await supabaseAdmin
              .from("clientes_administradoras")
              .update(updCa)
              .eq("id", vida.cliente_administradora_id)
              .eq("administradora_id", administradoraId)
              .eq("tenant_id", tenantId)
          }
        }

        const notas: string[] = []
        if (ja_tinha_saude || ja_tinha_odonto) {
          notas.push(
            `Já cadastrado: ${[ja_tinha_saude ? "saúde" : "", ja_tinha_odonto ? "odonto" : ""].filter(Boolean).join(" e ")}`
          )
        }

        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "ok",
          destino: "vida_importada",
          beneficiario_nome: vida.nome || undefined,
          ja_tinha_saude,
          ja_tinha_odonto,
          mensagem: notas[0],
        })
        continue
      }

      // Sem vida: tentar cliente_administradoras + proposta (mesmo CPF), usando mapas pré-carregados.
      const propIds = Array.from(propostasPorCpf.get(cpf) || [])
      if (propIds.length === 0) {
        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: "Nenhum beneficiário encontrado com este CPF (vidas importadas ou proposta)",
        })
        continue
      }

      const listaCa = Array.from(
        new Set(
          propIds.flatMap((id) => clientesPorProposta.get(id) || [])
        )
      ).map((id) => ({ id }))
      if (listaCa.length === 0) {
        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: "Proposta encontrada, mas sem contrato nesta administradora",
        })
        continue
      }

      if (listaCa.length > 1) {
        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: "Mais de um contrato vinculado a este CPF nesta administradora",
        })
        continue
      }

      const ca = listaCa[0] as { id: string }
      const { data: rowCa } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("numero_carteirinha, numero_carteirinha_odonto")
        .eq("id", ca.id)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      const jaS = Boolean(String((rowCa as { numero_carteirinha?: string } | null)?.numero_carteirinha || "").trim())
      const jaO = Boolean(String((rowCa as { numero_carteirinha_odonto?: string } | null)?.numero_carteirinha_odonto || "").trim())

      const updCa: Record<string, string> = {}
      if (matSaude) updCa.numero_carteirinha = matSaude
      if (matOdonto) updCa.numero_carteirinha_odonto = matOdonto

      const { error: upCa } = await supabaseAdmin
        .from("clientes_administradoras")
        .update(updCa)
        .eq("id", ca.id)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)

      if (upCa) {
        resultados.push({
          linha: linhaNum,
          cpf,
          nome_planilha: nomePlan || undefined,
          status: "erro",
          mensagem: upCa.message || "Erro ao atualizar cliente",
        })
        continue
      }

      const notasCa: string[] = []
      if (jaS || jaO) {
        notasCa.push(
          `Já cadastrado: ${[jaS ? "saúde" : "", jaO ? "odonto" : ""].filter(Boolean).join(" e ")}`
        )
      }

      resultados.push({
        linha: linhaNum,
        cpf,
        nome_planilha: nomePlan || undefined,
        status: "ok",
        destino: "cliente_administradora",
        beneficiario_nome: nomePlan || undefined,
        ja_tinha_saude: jaS,
        ja_tinha_odonto: jaO,
        mensagem: notasCa[0],
      })
    }

    if (historicoLote.length > 0) {
      for (const lote of chunkArray(historicoLote, 80)) {
        const { error: histErr } = await supabaseAdmin.from("vidas_importadas_historico").insert(lote)
        if (histErr) {
          console.warn("importacao-matriculas historico em lote:", histErr.message)
        }
      }
    }

    const ok = resultados.filter((r) => r.status === "ok").length
    const erros = resultados.filter((r) => r.status === "erro").length

    return NextResponse.json({
      ok: true,
      resumo: { total: linhas.length, atualizados: ok, erros },
      resultados,
    })
  } catch (e: unknown) {
    console.error("importacao-matriculas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao processar importação" },
      { status: 500 }
    )
  }
}
