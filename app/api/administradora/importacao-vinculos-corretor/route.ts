import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sincronizarCorretorClienteEVidas } from "@/lib/corretor-cliente-vinculo"

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

function normalizarNome(valor: string): string {
  return String(valor || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

type LinhaEntrada = { cpf?: string; nome?: string; corretor?: string }

type VidaRow = {
  id: string
  nome: string | null
  cpf: string | null
  tipo: string | null
  grupo_id: string | null
  corretor_id: string | null
  cliente_administradora_id: string | null
  ativo: boolean | null
}

type StatusLinha = "ok" | "erro" | "ignorado" | "conflito" | "pronto"

type ResultadoLinha = {
  linha: number
  cpf: string
  nome_planilha?: string
  beneficiario_nome?: string
  corretor_nome?: string
  corretor_id?: string | null
  grupos?: string
  status: StatusLinha
  mensagem?: string
  vinculo_chaves?: string[]
}

type Alvo = {
  chave: string
  clienteId: string | null
  vidaIds: string[]
  corretorAtual: string | null
  nomes: string[]
  grupos: string[]
}

/**
 * POST /api/administradora/importacao-vinculos-corretor
 * Body: { administradora_id, modo?: "validar" | "aplicar", corretor_id?: string,
 *         tratar_existentes?: "sobrescrever" | "pular", linhas: { nome, cpf, corretor }[] }
 * Localiza o cliente pelo CPF em grupos ativos e grava o corretor no contrato e nas vidas.
 * Sem corretor_id, o nome da planilha precisa coincidir com um corretor já cadastrado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = typeof body?.administradora_id === "string" ? body.administradora_id.trim() : ""
    const corretorFixoId = typeof body?.corretor_id === "string" ? body.corretor_id.trim() : ""
    const modo = body?.modo === "validar" ? "validar" : "aplicar"
    const tratarExistentes =
      body?.tratar_existentes === "sobrescrever" ? "sobrescrever" : body?.tratar_existentes === "pular" ? "pular" : null
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

    const { data: corretores, error: corErr } = await supabaseAdmin
      .from("corretores_administradora")
      .select("id, nome")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
    if (corErr) {
      return NextResponse.json({ error: corErr.message || "Erro ao listar corretores" }, { status: 500 })
    }

    const corretorPorId = new Map<string, string>()
    const corretorPorNome = new Map<string, { id: string; nome: string }>()
    const nomesAmbiguos = new Set<string>()
    for (const c of corretores || []) {
      const id = String(c.id || "").trim()
      const nome = String(c.nome || "").trim()
      if (!id || !nome) continue
      corretorPorId.set(id, nome)
      const chave = normalizarNome(nome)
      if (!chave) continue
      if (corretorPorNome.has(chave) && corretorPorNome.get(chave)?.id !== id) {
        nomesAmbiguos.add(chave)
        corretorPorNome.delete(chave)
      } else if (!nomesAmbiguos.has(chave)) {
        corretorPorNome.set(chave, { id, nome })
      }
    }

    if (corretorFixoId && !corretorPorId.has(corretorFixoId)) {
      return NextResponse.json({ error: "O corretor selecionado não está cadastrado nesta administradora." }, { status: 400 })
    }

    const grupoPorId = new Map<string, { nome: string; ativo: boolean }>()
    for (let from = 0; from < 20000; from += 1000) {
      const { data: grupos, error: grupoErr } = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome, ativo")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .range(from, from + 999)
      if (grupoErr) {
        return NextResponse.json({ error: grupoErr.message || "Erro ao listar grupos" }, { status: 500 })
      }
      for (const g of grupos || []) {
        grupoPorId.set(String(g.id), {
          nome: String(g.nome || "").trim() || "Grupo",
          ativo: g.ativo !== false,
        })
      }
      if (!grupos || grupos.length < 1000) break
    }

    const cpfsEntrada = Array.from(new Set(linhas.map((l) => normalizarCpf(l?.cpf)).filter((c) => c.length === 11)))
    const vidasPorCpf = new Map<string, VidaRow[]>()
    for (const termos of chunkArray(
      Array.from(new Set(cpfsEntrada.flatMap((c) => [c, cpfFormatadoBr(c)]))),
      240
    )) {
      const { data, error } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, nome, cpf, tipo, grupo_id, corretor_id, cliente_administradora_id, ativo")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .in("cpf", termos)
        .limit(5000)
      if (error) {
        return NextResponse.json({ error: error.message || "Erro ao localizar beneficiários" }, { status: 500 })
      }
      for (const row of (data || []) as VidaRow[]) {
        const k = normalizarCpf(row.cpf)
        if (k.length !== 11) continue
        const arr = vidasPorCpf.get(k) || []
        arr.push(row)
        vidasPorCpf.set(k, arr)
      }
    }

    const clienteIds = new Set<string>()
    for (const arr of vidasPorCpf.values()) {
      for (const v of arr) {
        if (v.cliente_administradora_id) clienteIds.add(String(v.cliente_administradora_id))
      }
    }
    const corretorDoCliente = new Map<string, string | null>()
    for (const ids of chunkArray(Array.from(clienteIds), 100)) {
      const { data, error } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, corretor_id")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .in("id", ids)
      if (error) {
        return NextResponse.json({ error: error.message || "Erro ao ler o vínculo atual" }, { status: 500 })
      }
      for (const row of data || []) {
        const id = String((row as { id?: string }).id || "")
        const cor = String((row as { corretor_id?: string | null }).corretor_id || "").trim() || null
        if (id) corretorDoCliente.set(id, cor)
      }
    }

    const nomeCorretor = (id: string | null) => (id ? corretorPorId.get(id) || "corretor cadastrado" : "")

    type Classificada = ResultadoLinha & { alvos: Alvo[] }
    const classificadas: Classificada[] = []

    for (let i = 0; i < linhas.length; i++) {
      const linhaNum = i + 1
      const raw = linhas[i] || {}
      const cpf = normalizarCpf(raw.cpf)
      const nomePlan = String(raw.nome ?? "").trim()
      const base = { linha: linhaNum, cpf: cpf || "—", nome_planilha: nomePlan || undefined, alvos: [] as Alvo[] }

      if (cpf.length !== 11) {
        classificadas.push({ ...base, status: "erro", mensagem: "CPF inválido ou vazio" })
        continue
      }

      let corretorId = corretorFixoId || ""
      let corretorNome = corretorId ? corretorPorId.get(corretorId) || "" : ""
      if (!corretorId) {
        const nomeInformado = String(raw.corretor ?? "").trim()
        const chaveNome = normalizarNome(nomeInformado)
        if (!chaveNome) {
          classificadas.push({
            ...base,
            status: "erro",
            mensagem: "Informe o nome do corretor na planilha ou selecione o corretor antes de importar.",
          })
          continue
        }
        if (nomesAmbiguos.has(chaveNome)) {
          classificadas.push({
            ...base,
            status: "erro",
            mensagem: `Há mais de um corretor cadastrado com o nome "${nomeInformado}".`,
          })
          continue
        }
        const achado = corretorPorNome.get(chaveNome)
        if (!achado) {
          classificadas.push({
            ...base,
            status: "erro",
            mensagem: `Corretor não cadastrado: ${nomeInformado}`,
          })
          continue
        }
        corretorId = achado.id
        corretorNome = achado.nome
      }

      const encontradas = vidasPorCpf.get(cpf) || []
      const emGrupoAtivo = encontradas.filter((v) => {
        if (v.ativo === false) return false
        if (!v.grupo_id) return true
        return grupoPorId.get(String(v.grupo_id))?.ativo !== false
      })
      if (emGrupoAtivo.length === 0) {
        const soInativo = encontradas.some((v) => v.grupo_id && grupoPorId.get(String(v.grupo_id))?.ativo === false)
        const soBenefInativo = encontradas.some((v) => v.ativo === false)
        classificadas.push({
          ...base,
          corretor_id: corretorId,
          corretor_nome: corretorNome,
          status: "erro",
          mensagem: soInativo
            ? "Cliente encontrado apenas em grupo inativo"
            : soBenefInativo
              ? "Beneficiário inativo"
              : "Cliente não encontrado",
        })
        continue
      }

      const porCliente = new Map<string, VidaRow[]>()
      const semCliente: VidaRow[] = []
      for (const v of emGrupoAtivo) {
        const ca = String(v.cliente_administradora_id || "").trim()
        if (!ca) {
          semCliente.push(v)
          continue
        }
        const arr = porCliente.get(ca) || []
        arr.push(v)
        porCliente.set(ca, arr)
      }

      const alvos: Alvo[] = []
      const montar = (chave: string, clienteId: string | null, vidas: VidaRow[]): Alvo => {
        const idsAtuais = new Set<string>()
        if (clienteId) {
          const doCliente = corretorDoCliente.get(clienteId)
          if (doCliente) idsAtuais.add(doCliente)
        }
        for (const v of vidas) {
          const cor = String(v.corretor_id || "").trim()
          if (cor) idsAtuais.add(cor)
        }
        const diferente = Array.from(idsAtuais).find((id) => id !== corretorId) || null
        return {
          chave,
          clienteId,
          vidaIds: vidas.map((v) => String(v.id)),
          corretorAtual: diferente || (idsAtuais.has(corretorId) ? corretorId : null),
          nomes: Array.from(new Set(vidas.map((v) => String(v.nome || "").trim()).filter(Boolean))),
          grupos: Array.from(
            new Set(
              vidas.map((v) => (v.grupo_id ? grupoPorId.get(String(v.grupo_id))?.nome || "Grupo" : "Sem grupo"))
            )
          ),
        }
      }
      for (const [ca, vidas] of porCliente) alvos.push(montar(`ca:${ca}`, ca, vidas))
      for (const v of semCliente) alvos.push(montar(`vida:${v.id}`, null, [v]))

      const beneficiarioNome = Array.from(new Set(alvos.flatMap((a) => a.nomes))).join(", ")
      const grupos = Array.from(new Set(alvos.flatMap((a) => a.grupos))).join(", ")
      const temOutro = alvos.some((a) => a.corretorAtual && a.corretorAtual !== corretorId)
      const todosIguais = alvos.every((a) => a.corretorAtual === corretorId)
      const atualNome = Array.from(
        new Set(alvos.map((a) => a.corretorAtual).filter((id): id is string => Boolean(id && id !== corretorId)))
      )
        .map((id) => nomeCorretor(id))
        .join(", ")

      let status: StatusLinha = "pronto"
      let mensagem = `Pronto para vincular a ${corretorNome}${grupos ? ` (${grupos})` : ""}.`
      if (temOutro) {
        status = "conflito"
        mensagem = `Já vinculado a ${atualNome || "outro corretor"}${grupos ? ` · ${grupos}` : ""}.`
      } else if (todosIguais) {
        status = "ignorado"
        mensagem = `Já vinculado a ${corretorNome}.`
      }

      classificadas.push({
        ...base,
        status,
        mensagem,
        beneficiario_nome: beneficiarioNome || undefined,
        corretor_nome: corretorNome,
        corretor_id: corretorId,
        grupos: grupos || undefined,
        vinculo_chaves: alvos.map((a) => a.chave),
        alvos,
      })
    }

    const chaveConflitante = new Set<string>()
    const primeiroCorretor = new Map<string, string>()
    for (const item of classificadas) {
      if (item.status === "erro" || !item.corretor_id) continue
      for (const chave of item.vinculo_chaves || []) {
        const prev = primeiroCorretor.get(chave)
        if (prev && prev !== item.corretor_id) chaveConflitante.add(chave)
        else if (!prev) primeiroCorretor.set(chave, item.corretor_id)
      }
    }
    for (const item of classificadas) {
      if ((item.vinculo_chaves || []).some((chave) => chaveConflitante.has(chave))) {
        item.status = "erro"
        item.mensagem = "O arquivo traz corretores diferentes para o mesmo cliente."
        item.alvos = []
      }
    }

    const gravar = new Map<string, { clientes: Set<string>; vidas: Set<string> }>()
    const resultados: ResultadoLinha[] = classificadas.map((item) => {
      let status = item.status
      if (status === "conflito") {
        if (modo === "validar" || !tratarExistentes) status = "conflito"
        else if (tratarExistentes === "pular") status = "ignorado"
        else status = "pronto"
      }
      if (modo === "aplicar" && status === "pronto") {
        for (const alvo of item.alvos) {
          const bucket = gravar.get(item.corretor_id || "") || { clientes: new Set<string>(), vidas: new Set<string>() }
          if (alvo.clienteId) bucket.clientes.add(alvo.clienteId)
          for (const vidaId of alvo.vidaIds) bucket.vidas.add(vidaId)
          if (item.corretor_id) gravar.set(item.corretor_id, bucket)
        }
        status = "ok"
        item.mensagem = `Vinculado a ${item.corretor_nome}${item.grupos ? ` (${item.grupos})` : ""}.`
      }
      if (modo === "aplicar" && status === "conflito") {
        item.mensagem = item.mensagem || "Já existe outro corretor vinculado."
      }
      return {
        linha: item.linha,
        cpf: item.cpf,
        nome_planilha: item.nome_planilha,
        beneficiario_nome: item.beneficiario_nome,
        corretor_nome: item.corretor_nome,
        corretor_id: item.corretor_id,
        grupos: item.grupos,
        status,
        mensagem:
          status === "ignorado" && item.status === "conflito"
            ? `${item.mensagem || "Já existe outro corretor."} Vínculo mantido.`
            : item.mensagem,
        vinculo_chaves: item.vinculo_chaves,
      }
    })

    if (modo === "aplicar") {
      for (const [corretorId, bucket] of gravar) {
        if (!corretorId || (bucket.clientes.size === 0 && bucket.vidas.size === 0)) continue
        await sincronizarCorretorClienteEVidas({
          administradoraId,
          tenantId,
          corretorId,
          clienteAdministradoraIds: Array.from(bucket.clientes),
          vidaIds: Array.from(bucket.vidas),
          registrarHistoricoVidas: true,
        })
      }
    }

    const resumo = {
      atualizados: resultados.filter((r) => r.status === "ok").length,
      erros: resultados.filter((r) => r.status === "erro").length,
      ignorados: resultados.filter((r) => r.status === "ignorado").length,
      conflitos: resultados.filter((r) => r.status === "conflito").length,
      prontos: resultados.filter((r) => r.status === "pronto").length,
    }

    return NextResponse.json({ resultados, resumo })
  } catch (e: unknown) {
    console.error("Erro importacao-vinculos-corretor:", e)
    const msg = e instanceof Error ? e.message : "Erro ao importar vínculos de corretor"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
