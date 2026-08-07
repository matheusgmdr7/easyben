import { supabaseAdmin } from "@/lib/supabase-admin"
import { FinanceirasService } from "@/services/financeiras-service"

export type ContextoSaudacaoWhatsApp = {
  clienteNome: string
  telefone: string
  financeiraNome: string
  planoDescricao: string
  cobertura: string
}

type PropostaSaudacaoRow = {
  nome?: string | null
  telefone?: string | null
  produto_nome?: string | null
  plano_nome?: string | null
  sigla_plano?: string | null
  produto_descricao?: string | null
  cobertura?: string | null
  acomodacao?: string | null
}

function montarDescricaoPlano(proposta: PropostaSaudacaoRow | null | undefined): string {
  if (!proposta) return "Plano de saúde"

  const titulo =
    String(proposta.plano_nome || proposta.produto_nome || proposta.sigla_plano || "").trim() ||
    String(proposta.produto_descricao || "").trim().slice(0, 120)

  if (!titulo) return "Plano de saúde"

  const acomodacao = String(proposta.acomodacao || "").trim()
  if (acomodacao && !titulo.toLowerCase().includes(acomodacao.toLowerCase())) {
    return `${titulo} — ${acomodacao}`
  }
  return titulo
}

function montarCobertura(proposta: PropostaSaudacaoRow | null | undefined): string {
  if (!proposta) return "—"
  const c =
    String(proposta.cobertura || "").trim() ||
    String(proposta.acomodacao || "").trim()
  return c || "—"
}

async function carregarFinanceiraNome(params: {
  administradoraId: string
  faturaId?: string
}): Promise<string> {
  if (!params.faturaId) return "—"

  const { data: fatura } = await supabaseAdmin
    .from("faturas")
    .select("financeira_id, gateway_nome")
    .eq("id", params.faturaId)
    .maybeSingle()

  if (fatura?.financeira_id) {
    const financeira = await FinanceirasService.buscarPorId(
      String(fatura.financeira_id),
      params.administradoraId
    )
    if (financeira?.nome?.trim()) return financeira.nome.trim()
  }

  const gateway = String(fatura?.gateway_nome || "").trim()
  return gateway || "—"
}

/**
 * Dados específicos do template de saudação (variáveis 2–5).
 * {2} financeira · {3} plano · {4} cobertura · {5} portal (via settings em dispatch).
 */
export async function carregarContextoSaudacaoWhatsApp(params: {
  administradoraId: string
  clienteAdministradoraId: string
  telefone?: string
  clienteNome?: string
  faturaId?: string
}): Promise<ContextoSaudacaoWhatsApp | { erro: string }> {
  let telefone = params.telefone?.trim() || ""
  let clienteNome = params.clienteNome?.trim() || ""
  let proposta: PropostaSaudacaoRow | null = null

  const { data: cliente } = await supabaseAdmin
    .from("clientes_administradoras")
    .select("proposta_id")
    .eq("id", params.clienteAdministradoraId)
    .maybeSingle()

  if (cliente?.proposta_id) {
    const { data: prop } = await supabaseAdmin
      .from("propostas")
      .select(
        "nome, telefone, produto_nome, plano_nome, sigla_plano, produto_descricao, cobertura, acomodacao"
      )
      .eq("id", cliente.proposta_id)
      .maybeSingle()

    proposta = (prop as PropostaSaudacaoRow) || null
    if (!telefone) telefone = String(proposta?.telefone || "").trim()
    if (!clienteNome) clienteNome = String(proposta?.nome || "").trim()
  }

  if (!telefone) {
    return { erro: "telefone_invalido" }
  }

  const financeiraNome = await carregarFinanceiraNome({
    administradoraId: params.administradoraId,
    faturaId: params.faturaId,
  })

  return {
    clienteNome: clienteNome || "Cliente",
    telefone,
    financeiraNome,
    planoDescricao: montarDescricaoPlano(proposta),
    cobertura: montarCobertura(proposta),
  }
}
