import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"
import { erroColunaNomePlano, lerNomePlanoProduto } from "@/lib/nome-plano-produto"

function normalizarCpf(cpf: string | null): string {
  return String(cpf || "").replace(/\D/g, "")
}

function formatarCpfMascara(cpf: string): string {
  const d = normalizarCpf(cpf)
  if (d.length !== 11) return d
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function isUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim())
}

function normalizarEscalaValorMonetario(valor: unknown): number | null {
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0) return null
  // Alguns legados foram salvos em centavos (ex.: 99500 => 995.00)
  if (Number.isInteger(n) && n >= 10000) return n / 100
  return n
}

type RotuloProduto = {
  nome: string | null
  nomePlano: string | null
  contratoNome: string | null
  operadoraId: string | null
}

/** Evita repetir a consulta que falha enquanto a coluna nome_plano ainda não existe. */
let nomePlanoColunaDisponivel: boolean | null = null

const SELECT_PRODUTO =
  "id, nome, faixas, contrato_id, contratos_administradora(nome_fantasia, razao_social, operadora_id)"
const SELECT_PRODUTO_COM_PLANO =
  "id, nome, nome_plano, faixas, contrato_id, contratos_administradora(nome_fantasia, razao_social, operadora_id)"

function contratoDoProduto(row: { contratos_administradora?: unknown }): { nome: string | null; operadoraId: string | null } {
  const emb = row.contratos_administradora
  const contrato = (Array.isArray(emb) ? emb[0] : emb) as
    | { nome_fantasia?: string | null; razao_social?: string | null; operadora_id?: string | null }
    | null
    | undefined
  if (!contrato) return { nome: null, operadoraId: null }
  return {
    nome: String(contrato.nome_fantasia || "").trim() || String(contrato.razao_social || "").trim() || null,
    operadoraId: contrato.operadora_id ? String(contrato.operadora_id) : null,
  }
}

async function buscarRotulosProdutos(produtoIds: string[]): Promise<Map<string, RotuloProduto>> {
  const mapa = new Map<string, RotuloProduto>()
  const ids = Array.from(new Set(produtoIds.map((id) => String(id || "").trim()).filter(Boolean)))
  if (ids.length === 0) return mapa

  const consultar = (colunas: string) =>
    supabaseAdmin.from("produtos_contrato_administradora").select(colunas).in("id", ids)

  let consulta =
    nomePlanoColunaDisponivel === false ? await consultar(SELECT_PRODUTO) : await consultar(SELECT_PRODUTO_COM_PLANO)
  if (erroColunaNomePlano(consulta.error)) {
    nomePlanoColunaDisponivel = false
    consulta = await consultar(SELECT_PRODUTO)
  } else if (!consulta.error) {
    nomePlanoColunaDisponivel = true
  }

  for (const row of consulta.data || []) {
    const contrato = contratoDoProduto(row as { contratos_administradora?: unknown })
    const nomePlano = lerNomePlanoProduto(row)
    mapa.set(String(row.id), {
      nome: String(row.nome || "").trim() || null,
      nomePlano: nomePlano || null,
      contratoNome: contrato.nome,
      operadoraId: contrato.operadoraId,
    })
  }
  return mapa
}

const SELECT_FAMILIA =
  "id, cpf, nome, tipo, cpf_titular, produto_id, valor_mensal, plano, dados_adicionais"

async function buscarFamiliaNoGrupo(
  tenantId: string,
  grupoId: string,
  cpfAlvo: string
): Promise<Record<string, unknown>[]> {
  const digitos = normalizarCpf(cpfAlvo)
  if (digitos.length !== 11) return []
  const mascarado = formatarCpfMascara(digitos)
  const filtro = [
    `cpf.eq.${digitos}`,
    `cpf.eq."${mascarado}"`,
    `cpf_titular.eq.${digitos}`,
    `cpf_titular.eq."${mascarado}"`,
  ].join(",")
  const { data, error } = await supabaseAdmin
    .from("vidas_importadas")
    .select(SELECT_FAMILIA)
    .eq("tenant_id", tenantId)
    .eq("grupo_id", grupoId)
    .or(filtro)
    .limit(200)
  if (error) {
    console.error("Erro ao buscar família do cliente:", error)
    return []
  }
  return (data || []) as Record<string, unknown>[]
}

/** Carteirinha do plano de saúde (campo principal). */
function numeroCarteirinhaSaudeDeVida(v: Record<string, unknown> | null | undefined): string | null {
  if (!v) return null
  const direct = String(v.numero_carteirinha || "").trim()
  if (direct) return direct
  const adic = v.dados_adicionais
  if (adic && typeof adic === "object") {
    const rec = adic as Record<string, unknown>
    const n = String(
      rec["numero_carteirinha"] ?? rec["Número da carteirinha"] ?? rec["carteirinha"] ?? ""
    ).trim()
    if (n) return n
  }
  return null
}

function numeroCarteirinhaOdontoDeVida(v: Record<string, unknown> | null | undefined): string | null {
  if (!v) return null
  const direct = String((v as { numero_carteirinha_odonto?: unknown }).numero_carteirinha_odonto || "").trim()
  if (direct) return direct
  const adic = v.dados_adicionais
  if (adic && typeof adic === "object") {
    const rec = adic as Record<string, unknown>
    const n = String(rec["numero_carteirinha_odonto"] ?? rec["carteirinha_odonto"] ?? "").trim()
    if (n) return n
  }
  return null
}

function valorMensalDeVida(v: Record<string, unknown> | null | undefined): number | null {
  if (!v) return null
  const direto = normalizarEscalaValorMonetario(v.valor_mensal)
  if (direto != null) return direto
  const adic = v.dados_adicionais
  if (adic && typeof adic === "object") {
    const rec = adic as Record<string, unknown>
    const candidatos = [
      rec["valor_mensal"],
      rec["valor mensal"],
      rec["mensalidade"],
      rec["valor"],
      rec["Valor mensal"],
      rec["Valor"],
    ]
    for (const c of candidatos) {
      const n = normalizarEscalaValorMonetario(c)
      if (n != null) return n
    }
  }
  return null
}

function planoDeVida(v: Record<string, unknown> | null | undefined, fallback: string | null): string | null {
  if (!v) return fallback
  const fromPlano = String(v.plano || "").trim()
  if (fromPlano) return fromPlano
  const adic = v.dados_adicionais
  if (adic && typeof adic === "object") {
    const rec = adic as Record<string, unknown>
    const p = String(rec["Plano"] ?? rec["plano"] ?? "").trim()
    if (p) return p
  }
  return fallback
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = String(searchParams.get("tenant_slug") || "").trim().toLowerCase()
    const cpf = normalizarCpf(searchParams.get("cpf"))

    if (!tenantSlug) {
      return NextResponse.json({ error: "tenant_slug é obrigatório." }, { status: 400 })
    }
    if (cpf.length !== 11) {
      return NextResponse.json({ error: "CPF inválido. Informe 11 dígitos." }, { status: 400 })
    }

    const slugSemHifen = tenantSlug.replace(/-/g, "")
    const slugComHifenNormalizado = tenantSlug
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    const slugsCandidatos = Array.from(new Set([tenantSlug, slugSemHifen, slugComHifenNormalizado].filter(Boolean)))

    const { data: tenantRows, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, nome, nome_marca, slug, status")
      .in("slug", slugsCandidatos)
      .eq("status", "ativo")
      .limit(1)

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message || "Erro ao validar plataforma." }, { status: 500 })
    }
    const tenant = Array.isArray(tenantRows) ? tenantRows[0] : null
    if (!tenant?.id) {
      return NextResponse.json({ error: "Plataforma não encontrada." }, { status: 404 })
    }

    const tenantId = tenant.id as string

    const [{ data: vida }, { data: propostaDireta }] = await Promise.all([
      supabaseAdmin
        .from("vidas_importadas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("cpf", cpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("propostas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("cpf", cpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!vida && !propostaDireta) {
      return NextResponse.json({ error: "Cliente não encontrado para este CPF nesta plataforma." }, { status: 404 })
    }

    const proposta = propostaDireta || null
    const cpfMascarado = formatarCpfMascara(cpf)
    const tipoVidaLogin = String(vida?.tipo || "").toLowerCase()
    const titularCpf =
      tipoVidaLogin === "dependente"
        ? normalizarCpf(String(vida?.cpf_titular || ""))
        : normalizarCpf(String(vida?.cpf || cpf))
    const cpfFamilia = titularCpf.length === 11 ? titularCpf : cpf
    const selectClienteAdm =
      "id, administradora_id, proposta_id, status, valor_mensal, numero_contrato, data_vigencia, numero_carteirinha, numero_carteirinha_odonto"

    const clienteAdmPromise = (async () => {
      let clienteAdmId: string | null = vida?.cliente_administradora_id ? String(vida.cliente_administradora_id) : null
      let clienteAdm: any = null
      if (!clienteAdmId && proposta?.id) {
        const { data: clienteAdmPorProposta } = await supabaseAdmin
          .from("clientes_administradoras")
          .select(selectClienteAdm)
          .eq("tenant_id", tenantId)
          .eq("proposta_id", proposta.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (clienteAdmPorProposta?.id) {
          clienteAdmId = String(clienteAdmPorProposta.id)
          clienteAdm = clienteAdmPorProposta
        }
      }
      if (clienteAdmId && !clienteAdm) {
        const { data: clienteAdmDireto } = await supabaseAdmin
          .from("clientes_administradoras")
          .select(selectClienteAdm)
          .eq("tenant_id", tenantId)
          .eq("id", clienteAdmId)
          .maybeSingle()
        clienteAdm = clienteAdmDireto || null
      }
      return { clienteAdmId, clienteAdm }
    })()

    const [clienteAdmPack, grupoRes, vidasFamilia, vidasCpfRes, clientesAdmCpfRes] = await Promise.all([
      clienteAdmPromise,
      vida?.grupo_id
        ? supabaseAdmin
            .from("grupos_beneficiarios")
            .select("nome")
            .eq("tenant_id", tenantId)
            .eq("id", vida.grupo_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      vida?.grupo_id ? buscarFamiliaNoGrupo(tenantId, String(vida.grupo_id), cpfFamilia) : Promise.resolve([]),
      supabaseAdmin
        .from("vidas_importadas")
        .select("id, cliente_administradora_id")
        .eq("tenant_id", tenantId)
        .in("cpf", [cpf, cpfMascarado])
        .limit(200),
      supabaseAdmin
        .from("vw_clientes_administradoras_completo")
        .select("id, administradora_id")
        .in("cliente_cpf", [cpf, cpfMascarado])
        .limit(200),
    ])

    const clienteAdm = clienteAdmPack.clienteAdm
    const clienteAdmId = clienteAdmPack.clienteAdmId
    const grupoNome = grupoRes.data?.nome || null

    const produtoId = (vida?.produto_id || proposta?.produto_id || null) as string | null

    const vidaRec = (vida as Record<string, unknown> | null | undefined) ?? null
    const numeroCarteirinha =
      numeroCarteirinhaSaudeDeVida(vidaRec) ||
      String((clienteAdm as { numero_carteirinha?: string } | null)?.numero_carteirinha || "").trim() ||
      null
    const numeroCarteirinhaOdonto =
      numeroCarteirinhaOdontoDeVida(vidaRec) ||
      String((clienteAdm as { numero_carteirinha_odonto?: string } | null)?.numero_carteirinha_odonto || "").trim() ||
      null

    const dataVigencia =
      clienteAdm?.data_vigencia ||
      (vida?.dados_adicionais && typeof vida.dados_adicionais === "object"
        ? String(
            (vida.dados_adicionais as Record<string, unknown>)["data_vigencia"] ??
              (vida.dados_adicionais as Record<string, unknown>)["Data Vigência"] ??
              (vida.dados_adicionais as Record<string, unknown>)["dataVigencia"] ??
              ""
          ).slice(0, 10) || null
        : null)

    const valorMensal =
      normalizarEscalaValorMonetario(clienteAdm?.valor_mensal ?? null) ??
      valorMensalDeVida((vida as Record<string, unknown> | null | undefined) ?? null)

    const administradoraIdOperadora =
      (clienteAdm?.administradora_id as string | undefined) ||
      ((vida as { administradora_id?: string } | null)?.administradora_id ?? null)

    const idsFatura = new Set<string>()
    if (isUuid(clienteAdmId)) idsFatura.add(String(clienteAdmId))
    const administradoraIdsFatura = new Set<string>()
    if (clienteAdm?.administradora_id) administradoraIdsFatura.add(String(clienteAdm.administradora_id))
    for (const v of vidasCpfRes.data || []) {
      if (isUuid(v?.cliente_administradora_id)) idsFatura.add(String(v.cliente_administradora_id))
    }
    for (const ca of clientesAdmCpfRes.data || []) {
      if (isUuid(ca?.id)) idsFatura.add(String(ca.id))
      if (ca?.administradora_id) administradoraIdsFatura.add(String(ca.administradora_id))
    }

    const produtoIdsFamilia = vidasFamilia.map((row) => String(row.produto_id || ""))
    const [rotulosProdutos, faturasCarregadas] = await Promise.all([
      buscarRotulosProdutos([...(produtoId ? [String(produtoId)] : []), ...produtoIdsFamilia]),
      (async () => {
        if (idsFatura.size === 0) return [] as any[]
        let query = supabaseAdmin
          .from("faturas")
          .select(
            "id, numero_fatura, valor, vencimento, status, pagamento_data, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id, cliente_administradora_id, administradora_id"
          )
          .eq("tenant_id", tenantId)
          .in("cliente_administradora_id", Array.from(idsFatura))
          .order("vencimento", { ascending: false })
          .limit(100)
        if (administradoraIdsFatura.size > 0) {
          query = query.in("administradora_id", Array.from(administradoraIdsFatura))
        }
        const { data: dataFaturas, error: faturasError } = await query
        if (faturasError) {
          console.error("Erro ao buscar faturas no dashboard cliente:", faturasError)
          return []
        }
        return (dataFaturas || []).map((f: any) => ({
          id: f.id,
          numero_fatura: f.numero_fatura,
          valor: f.valor,
          valor_total: Number(f.valor ?? 0),
          vencimento: f.vencimento,
          data_vencimento: f.vencimento,
          status: f.status,
          pagamento_data: f.pagamento_data,
          asaas_boleto_url: f.asaas_boleto_url,
          boleto_url: f.boleto_url,
          boleto_link: getBoletoLinkFromFatura(f),
          cliente_administradora_id: f.cliente_administradora_id,
          administradora_id: f.administradora_id,
        }))
      })(),
    ])

    const rotuloProduto = produtoId ? rotulosProdutos.get(String(produtoId)) : undefined
    const produtoNome =
      rotuloProduto?.nome ||
      proposta?.produto ||
      proposta?.plano ||
      proposta?.produto_nome ||
      null
    const planoImportado =
      (vida?.plano as string | null) ||
      (vida?.dados_adicionais && typeof vida.dados_adicionais === "object"
        ? String(
            (vida.dados_adicionais as Record<string, unknown>)["Plano"] ??
              (vida.dados_adicionais as Record<string, unknown>)["plano"] ??
              ""
          ).trim() || null
        : null) ||
      produtoNome ||
      null
    const planoNome = rotuloProduto?.nomePlano || planoImportado
    let operadoraNome = rotuloProduto?.contratoNome || null
    if (!operadoraNome && rotuloProduto?.operadoraId) {
      const { data: opRow } = await supabaseAdmin
        .from("operadoras")
        .select("fantasia, nome")
        .eq("id", rotuloProduto.operadoraId)
        .maybeSingle()
      operadoraNome = String(opRow?.fantasia || "").trim() || String(opRow?.nome || "").trim() || null
    }
    if (!operadoraNome && administradoraIdOperadora) {
      const { data: admRow } = await supabaseAdmin
        .from("administradoras")
        .select("nome_fantasia, nome, razao_social")
        .eq("id", administradoraIdOperadora)
        .maybeSingle()
      operadoraNome =
        String(admRow?.nome_fantasia || "").trim() ||
        String(admRow?.nome || "").trim() ||
        String(admRow?.razao_social || "").trim() ||
        null
    }
    if (!operadoraNome) {
      operadoraNome = String(tenant.nome_marca || tenant.nome || "").trim() || null
    }
    const faturas = faturasCarregadas

    type BenefCart = {
      cpf: string
      nome: string | null
      tipo: string
      /** Carteirinha do plano de saúde. */
      numero_carteirinha: string | null
      numero_carteirinha_odonto: string | null
      plano: string | null
      operadora: string | null
      valor_mensal: number | null
      /** CPF deste cartão é o mesmo usado no login. */
      cpf_login: boolean
    }

    const beneficiariosCarteirinha: BenefCart[] = []

    if (vida?.grupo_id) {
      const todasVidasGrupo = vidasFamilia

      let familia: Record<string, unknown>[] = []
      if (titularCpf.length !== 11) {
        familia = (todasVidasGrupo || []).filter(
          (row: Record<string, unknown>) => normalizarCpf(String(row.cpf || "")) === cpf
        )
      } else {
        familia = (todasVidasGrupo || []).filter((row: Record<string, unknown>) => {
          const t = String(row.tipo || "").toLowerCase()
          const rowCpf = normalizarCpf(String(row.cpf || ""))
          if (t === "titular") return rowCpf === titularCpf
          if (t === "dependente")
            return normalizarCpf(String(row.cpf_titular || "")) === titularCpf
          return false
        })
      }

      familia.sort((a, b) => {
        const at = String(a.tipo || "").toLowerCase() === "titular" ? 0 : 1
        const bt = String(b.tipo || "").toLowerCase() === "titular" ? 0 : 1
        if (at !== bt) return at - bt
        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
      })

      const rotulosFamilia = rotulosProdutos

      for (const row of familia) {
        const isTitular = String(row.tipo || "").toLowerCase() === "titular"
        const rowCpf = normalizarCpf(String(row.cpf || ""))
        const valorNaVida = valorMensalDeVida(row)
        /** Titular: prioriza valor do contrato (cliente_adm); dependente: valor da própria vida, senão o do titular/contrato. */
        const valorMensalCard = isTitular
          ? valorMensal ?? valorNaVida
          : valorNaVida ?? valorMensal
        const rotuloMembro = rotulosFamilia.get(String(row.produto_id || ""))
        beneficiariosCarteirinha.push({
          cpf: rowCpf,
          nome: (row.nome as string) || null,
          tipo: String(row.tipo || "titular"),
          numero_carteirinha: numeroCarteirinhaSaudeDeVida(row),
          numero_carteirinha_odonto: numeroCarteirinhaOdontoDeVida(row),
          plano: rotuloMembro?.nomePlano || planoDeVida(row, rotuloMembro?.nome || planoNome),
          operadora: operadoraNome,
          valor_mensal: valorMensalCard,
          cpf_login: rowCpf === cpf,
        })
      }
    }

    if (beneficiariosCarteirinha.length === 0) {
      beneficiariosCarteirinha.push({
        cpf,
        nome: vida?.nome || proposta?.nome || null,
        tipo: String(vida?.tipo || "titular"),
        numero_carteirinha: numeroCarteirinha || null,
        numero_carteirinha_odonto: numeroCarteirinhaOdonto || null,
        plano: planoNome,
        operadora: operadoraNome,
        valor_mensal: valorMensal,
        cpf_login: true,
      })
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        nome_marca: tenant.nome_marca,
        slug: tenant.slug,
      },
      beneficiarios_carteirinha: beneficiariosCarteirinha,
      cliente: {
        cpf,
        nome: vida?.nome || proposta?.nome || null,
        tipo: vida?.tipo || "titular",
        produto: produtoNome,
        plano: planoNome,
        numero_carteirinha: numeroCarteirinha || null,
        numero_carteirinha_odonto: numeroCarteirinhaOdonto || null,
        grupo_nome: grupoNome,
        operadora: operadoraNome,
        numero_contrato: clienteAdm?.numero_contrato || null,
        data_vigencia: dataVigencia || null,
        valor_mensal: valorMensal,
        status: clienteAdm?.status || proposta?.status || (vida?.ativo === false ? "cancelado" : "ativo"),
      },
      faturas,
    })
  } catch (e: unknown) {
    console.error("Erro no dashboard do cliente:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao consultar cliente." },
      { status: 500 }
    )
  }
}

