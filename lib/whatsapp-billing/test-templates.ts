import { supabaseAdmin } from "@/lib/supabase-admin"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { carregarTelefoneAtualClienteCobranca } from "@/lib/telefone-cliente-cobranca"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import type { DadosEnvioWhatsApp } from "./content-variables"
import { dispararNotificacaoWhatsApp } from "./dispatch"
import {
  WHATSAPP_BILLING_EVENT_LABELS,
  WHATSAPP_BILLING_EVENT_TYPES,
  type WhatsAppBillingEventType,
} from "./event-types"
import { referenceDateHoje } from "./idempotency"
import { carregarContextoSaudacaoWhatsApp } from "./saudacao-context"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"
import { FinanceirasService } from "@/services/financeiras-service"

export type TemplateTesteInfo = {
  event_type: WhatsAppBillingEventType
  label: string
  descricao: string | null
  content_sid: string | null
  ativo: boolean
  pronto: boolean
}

export type ClienteTesteOpcao = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  plano_nome: string | null
  cobertura: string | null
}

export type PreviewDadosTesteWhatsApp = {
  cliente_nome: string
  financeira_nome: string
  plano_descricao: string
  cobertura: string
  valor_fatura: string | null
  data_vencimento: string | null
  data_pagamento: string | null
  link_boleto: string | null
  numero_fatura: string | null
  url_portal_cliente: string | null
  telefone_cadastro: string | null
  administradora_nome: string
}

function somarDiasIso(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function carregarNomeAdministradora(administradoraId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("administradoras")
    .select("nome, razao_social, nome_fantasia")
    .eq("id", administradoraId)
    .maybeSingle()
  return String(data?.nome || data?.nome_fantasia || data?.razao_social || "Administradora").trim()
}

async function carregarSettingsWhatsApp(administradoraId: string) {
  const { data } = await supabaseAdmin
    .from("billing_notification_settings")
    .select("url_portal_cliente, telefone_suporte_whatsapp")
    .eq("administradora_id", administradoraId)
    .maybeSingle()
  return data
}

async function carregarPrimeiraFinanceira(administradoraId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("administradora_financeiras")
    .select("id, nome")
    .eq("administradora_id", administradoraId)
    .eq("ativo", true)
    .order("nome")
    .limit(1)
    .maybeSingle()

  if (data?.id) {
    const fin = await FinanceirasService.buscarPorId(String(data.id), administradoraId)
    if (fin?.nome?.trim()) return fin.nome.trim()
  }
  return String(data?.nome || "—").trim()
}

async function carregarUltimaFaturaCliente(
  administradoraId: string,
  clienteAdministradoraId: string
) {
  const { data } = await supabaseAdmin
    .from("faturas")
    .select(
      "id, valor, vencimento, numero_fatura, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id, financeira_id, gateway_nome, pagamento_data, status, cliente_telefone"
    )
    .eq("administradora_id", administradoraId)
    .eq("cliente_administradora_id", clienteAdministradoraId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function carregarFinanceiraDaFatura(
  administradoraId: string,
  fatura: { financeira_id?: string | null; gateway_nome?: string | null } | null
): Promise<string> {
  if (fatura?.financeira_id) {
    const fin = await FinanceirasService.buscarPorId(String(fatura.financeira_id), administradoraId)
    if (fin?.nome?.trim()) return fin.nome.trim()
  }
  const gateway = String(fatura?.gateway_nome || "").trim()
  if (gateway) return gateway
  return carregarPrimeiraFinanceira(administradoraId)
}

export async function listarTemplatesParaTeste(): Promise<TemplateTesteInfo[]> {
  const { data } = await supabaseAdmin
    .from("billing_templates")
    .select("event_type, descricao, content_sid, ativo")
    .order("event_type")

  const porTipo = new Map((data || []).map((r) => [r.event_type, r]))

  return WHATSAPP_BILLING_EVENT_TYPES.map((eventType) => {
    const row = porTipo.get(eventType)
    const sid = String(row?.content_sid || "").trim()
    return {
      event_type: eventType,
      label: WHATSAPP_BILLING_EVENT_LABELS[eventType],
      descricao: row?.descricao ? String(row.descricao) : null,
      content_sid: sid || null,
      ativo: row?.ativo !== false,
      pronto: Boolean(sid && !sid.startsWith("HX_PLACEHOLDER") && row?.ativo !== false),
    }
  })
}

export async function listarClientesParaTeste(
  administradoraId: string
): Promise<ClienteTesteOpcao[]> {
  const { data, error } = await supabaseAdmin
    .from("vw_clientes_administradoras_completo")
    .select("id, cliente_nome, cliente_cpf, cliente_telefone, plano_nome, produto_nome, cobertura")
    .eq("administradora_id", administradoraId)
    .eq("status", "ativo")
    .order("cliente_nome", { ascending: true })
    .limit(400)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    nome: String(row.cliente_nome || "Cliente"),
    cpf: row.cliente_cpf ? String(row.cliente_cpf) : null,
    telefone: row.cliente_telefone ? String(row.cliente_telefone) : null,
    plano_nome: String(row.plano_nome || row.produto_nome || "").trim() || null,
    cobertura: row.cobertura ? String(row.cobertura) : null,
  }))
}

export async function montarDadosExemploEnvioWhatsApp(
  administradoraId: string
): Promise<DadosEnvioWhatsApp> {
  const hoje = referenceDateHoje()
  const vencimento = somarDiasIso(hoje, 10)
  const settings = await carregarSettingsWhatsApp(administradoraId)

  const [administradoraNome, financeiraNome] = await Promise.all([
    carregarNomeAdministradora(administradoraId),
    carregarPrimeiraFinanceira(administradoraId),
  ])

  return {
    clienteNome: "Cliente Teste",
    administradoraNome,
    financeiraNome,
    planoDescricao: "Plano Saúde Exemplo — Apartamento",
    coberturaPlano: "Nacional",
    valorFatura: 350,
    dataVencimento: vencimento,
    dataPagamento: hoje,
    linkBoleto: "https://www.asaas.com/b/pdf/exemplo-teste",
    numeroFatura: "000123",
    urlPortalCliente: settings?.url_portal_cliente || "https://easyben.com.br/benefit/cliente",
    telefoneSuporte: settings?.telefone_suporte_whatsapp || undefined,
  }
}

export async function montarDadosEnvioWhatsAppCliente(params: {
  administradoraId: string
  clienteAdministradoraId: string
}): Promise<
  | {
      dados: DadosEnvioWhatsApp
      telefoneCadastro: string | null
      faturaId: string | null
    }
  | { erro: string }
> {
  const tenantId = await resolveTenantIdForAdministradora(params.administradoraId)
  const fatura = await carregarUltimaFaturaCliente(
    params.administradoraId,
    params.clienteAdministradoraId
  )

  const telefonePre =
    (await carregarTelefoneAtualClienteCobranca({
      administradoraId: params.administradoraId,
      clienteAdministradoraId: params.clienteAdministradoraId,
      telefoneFatura: fatura?.cliente_telefone,
      tenantId,
    })) ||
    String(fatura?.cliente_telefone || "").trim() ||
    undefined

  const ctx = await carregarContextoSaudacaoWhatsApp({
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
    faturaId: fatura?.id,
    telefone: telefonePre,
    exigirTelefone: false,
  })

  if ("erro" in ctx) {
    return { erro: ctx.erro }
  }

  const telefoneCadastro = telefonePre || ctx.telefone || null

  const settings = await carregarSettingsWhatsApp(params.administradoraId)
  const administradoraNome = await carregarNomeAdministradora(params.administradoraId)
  const financeiraNome = await carregarFinanceiraDaFatura(params.administradoraId, fatura)

  const hoje = referenceDateHoje()
  const linkBoleto = fatura ? getBoletoLinkFromFatura(fatura) : null

  return {
    dados: {
      clienteNome: ctx.clienteNome,
      administradoraNome,
      financeiraNome: financeiraNome !== "—" ? financeiraNome : ctx.financeiraNome,
      planoDescricao: ctx.planoDescricao,
      coberturaPlano: ctx.cobertura,
      valorFatura:
        fatura?.valor != null ? Number(fatura.valor) : undefined,
      dataVencimento: fatura?.vencimento
        ? String(fatura.vencimento).slice(0, 10)
        : somarDiasIso(hoje, 10),
      dataPagamento: fatura?.pagamento_data
        ? String(fatura.pagamento_data).slice(0, 10)
        : hoje,
      linkBoleto: linkBoleto || undefined,
      numeroFatura: fatura?.numero_fatura ? String(fatura.numero_fatura) : undefined,
      urlPortalCliente: settings?.url_portal_cliente || undefined,
      telefoneSuporte: settings?.telefone_suporte_whatsapp || undefined,
    },
    telefoneCadastro,
    faturaId: fatura?.id || null,
  }
}

export async function previewDadosTesteWhatsApp(params: {
  administradoraId: string
  clienteAdministradoraId: string
}): Promise<PreviewDadosTesteWhatsApp | { erro: string }> {
  const montado = await montarDadosEnvioWhatsAppCliente(params)
  if ("erro" in montado) return montado

  const d = montado.dados
  return {
    cliente_nome: d.clienteNome,
    administradora_nome: d.administradoraNome,
    financeira_nome: d.financeiraNome || "—",
    plano_descricao: d.planoDescricao || "—",
    cobertura: d.coberturaPlano || "—",
    valor_fatura:
      d.valorFatura != null && Number.isFinite(Number(d.valorFatura))
        ? formatarMoeda(Number(d.valorFatura))
        : null,
    data_vencimento: d.dataVencimento
      ? formatarData(String(d.dataVencimento).slice(0, 10))
      : null,
    data_pagamento: d.dataPagamento
      ? formatarData(String(d.dataPagamento).slice(0, 10))
      : null,
    link_boleto: d.linkBoleto || null,
    numero_fatura: d.numeroFatura || null,
    url_portal_cliente: d.urlPortalCliente || null,
    telefone_cadastro: montado.telefoneCadastro,
  }
}

async function resolverDadosEnvioTeste(params: {
  administradoraId: string
  clienteAdministradoraId?: string
}): Promise<
  | { dados: DadosEnvioWhatsApp; clienteId: string; faturaId?: string | null }
  | { erro: string }
> {
  if (params.clienteAdministradoraId) {
    const montado = await montarDadosEnvioWhatsAppCliente({
      administradoraId: params.administradoraId,
      clienteAdministradoraId: params.clienteAdministradoraId,
    })
    if ("erro" in montado) return montado
    return {
      dados: montado.dados,
      clienteId: params.clienteAdministradoraId,
      faturaId: montado.faturaId,
    }
  }

  return {
    dados: await montarDadosExemploEnvioWhatsApp(params.administradoraId),
    clienteId: `__teste_ficticio__`,
    faturaId: null,
  }
}

export async function dispararTesteTemplateWhatsApp(params: {
  administradoraId: string
  telefone: string
  eventType: WhatsAppBillingEventType
  clienteAdministradoraId?: string
}): Promise<{ enqueued: boolean; reason?: string; jobId?: string }> {
  const digits = normalizarTelefoneWhatsApp(params.telefone)
  if (!digits) {
    return { enqueued: false, reason: "telefone_invalido" }
  }

  const resolvido = await resolverDadosEnvioTeste({
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
  })
  if ("erro" in resolvido) {
    return { enqueued: false, reason: resolvido.erro }
  }

  const stamp = Date.now()

  return dispararNotificacaoWhatsApp(
    {
      eventType: params.eventType,
      administradoraId: params.administradoraId,
      clienteAdministradoraId: resolvido.clienteId,
      telefone: digits,
      faturaId: resolvido.faturaId,
      referenceDate: `${referenceDateHoje()}_teste_${stamp}`,
      dados: resolvido.dados,
    },
    { ignorarAutomatico: true }
  )
}

export async function dispararTodosTemplatesTeste(params: {
  administradoraId: string
  telefone: string
  clienteAdministradoraId?: string
  eventTypes?: WhatsAppBillingEventType[]
}): Promise<{
  total: number
  enfileirados: number
  falhas: Array<{ event_type: WhatsAppBillingEventType; reason?: string }>
}> {
  const lista = params.eventTypes?.length
    ? params.eventTypes
    : (await listarTemplatesParaTeste()).filter((t) => t.pronto).map((t) => t.event_type)

  const falhas: Array<{ event_type: WhatsAppBillingEventType; reason?: string }> = []
  let enfileirados = 0

  for (const eventType of lista) {
    const r = await dispararTesteTemplateWhatsApp({
      administradoraId: params.administradoraId,
      telefone: params.telefone,
      eventType,
      clienteAdministradoraId: params.clienteAdministradoraId,
    })
    if (r.enqueued) enfileirados += 1
    else falhas.push({ event_type: eventType, reason: r.reason })
  }

  return { total: lista.length, enfileirados, falhas }
}
