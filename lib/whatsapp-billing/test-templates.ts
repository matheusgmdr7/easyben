import { supabaseAdmin } from "@/lib/supabase-admin"
import { FinanceirasService } from "@/services/financeiras-service"
import type { DadosEnvioWhatsApp } from "./content-variables"
import { dispararNotificacaoWhatsApp } from "./dispatch"
import {
  WHATSAPP_BILLING_EVENT_LABELS,
  WHATSAPP_BILLING_EVENT_TYPES,
  type WhatsAppBillingEventType,
} from "./event-types"
import { referenceDateHoje } from "./idempotency"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"

export type TemplateTesteInfo = {
  event_type: WhatsAppBillingEventType
  label: string
  descricao: string | null
  content_sid: string | null
  ativo: boolean
  pronto: boolean
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
  return String(data?.nome || "Financeira Exemplo").trim()
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

export async function montarDadosExemploEnvioWhatsApp(
  administradoraId: string
): Promise<DadosEnvioWhatsApp> {
  const hoje = referenceDateHoje()
  const vencimento = somarDiasIso(hoje, 10)

  const { data: settings } = await supabaseAdmin
    .from("billing_notification_settings")
    .select("url_portal_cliente, telefone_suporte_whatsapp")
    .eq("administradora_id", administradoraId)
    .maybeSingle()

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
    telefoneSuporte: settings?.telefone_suporte_whatsapp || "5521980553681",
  }
}

export async function dispararTesteTemplateWhatsApp(params: {
  administradoraId: string
  telefone: string
  eventType: WhatsAppBillingEventType
}): Promise<{ enqueued: boolean; reason?: string; jobId?: string }> {
  const digits = normalizarTelefoneWhatsApp(params.telefone)
  if (!digits) {
    return { enqueued: false, reason: "telefone_invalido" }
  }

  const dados = await montarDadosExemploEnvioWhatsApp(params.administradoraId)
  const stamp = Date.now()
  const testClienteId = `__teste_whatsapp__${digits}`

  return dispararNotificacaoWhatsApp(
    {
      eventType: params.eventType,
      administradoraId: params.administradoraId,
      clienteAdministradoraId: testClienteId,
      telefone: digits,
      referenceDate: `${referenceDateHoje()}_teste_${stamp}`,
      dados,
    },
    { ignorarAutomatico: true }
  )
}

export async function dispararTodosTemplatesTeste(params: {
  administradoraId: string
  telefone: string
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
    })
    if (r.enqueued) enfileirados += 1
    else falhas.push({ event_type: eventType, reason: r.reason })
  }

  return { total: lista.length, enfileirados, falhas }
}
