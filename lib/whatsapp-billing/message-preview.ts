import { supabaseAdmin } from "@/lib/supabase-admin"
import type { WhatsAppBillingEventType } from "./event-types"
import {
  montarVariaveisInternas,
  mapearParaContentVariablesTwilio,
  type DadosEnvioWhatsApp,
} from "./content-variables"
import { getTwilioClient } from "./twilio-client"
import { resolverDadosEnvioTeste } from "./test-templates"

const LABELS_VARIAVEIS: Record<string, string> = {
  cliente_nome: "Nome do cliente",
  administradora_nome: "Administradora",
  financeira_nome: "Financeira",
  plano_descricao: "Plano",
  cobertura: "Cobertura",
  valor_fatura: "Valor da fatura",
  data_vencimento: "Vencimento",
  data_pagamento: "Data pagamento",
  link_boleto: "Link do boleto",
  numero_fatura: "Nº fatura",
  url_portal_cliente: "Portal do cliente",
  telefone_suporte: "Telefone suporte",
}

export type VariavelMensagemPreview = {
  twilio_key: string
  chave_interna: string
  label: string
  valor: string
}

export type PreviewMensagemWhatsApp = {
  event_type: WhatsAppBillingEventType
  content_sid: string | null
  variaveis_twilio: Record<string, string>
  variaveis: VariavelMensagemPreview[]
  corpo_template: string | null
  mensagem_renderizada: string | null
}

export async function buscarCorpoTemplateTwilio(contentSid: string): Promise<string | null> {
  try {
    const twilio = getTwilioClient()
    const content = await twilio.content.v1.contents(contentSid).fetch()
    const types = content.types as Record<string, { body?: string }> | undefined
    if (!types) return null
    for (const t of Object.values(types)) {
      if (t?.body?.trim()) return t.body.trim()
    }
    return null
  } catch {
    return null
  }
}

export function renderizarCorpoTemplate(
  body: string,
  contentVariables: Record<string, string>
): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, key: string) => contentVariables[key] ?? `{{${key}}}`)
}

export async function montarPreviewMensagemFromRegistro(params: {
  eventType: WhatsAppBillingEventType
  contentSid: string
  contentVariables: Record<string, string>
}): Promise<Pick<PreviewMensagemWhatsApp, "variaveis" | "corpo_template" | "mensagem_renderizada">> {
  const { data: template } = await supabaseAdmin
    .from("billing_templates")
    .select("variaveis_map")
    .eq("event_type", params.eventType)
    .maybeSingle()

  const variaveisMap = (template?.variaveis_map || {}) as Record<string, string>

  const variaveis: VariavelMensagemPreview[] = Object.entries(variaveisMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([twilioKey, chaveInterna]) => ({
      twilio_key: twilioKey,
      chave_interna: chaveInterna,
      label: LABELS_VARIAVEIS[chaveInterna] || chaveInterna,
      valor: params.contentVariables[twilioKey] || "—",
    }))

  const contentSid = String(params.contentSid || "").trim()
  let corpoTemplate: string | null = null
  let mensagemRenderizada: string | null = null

  if (contentSid && !contentSid.startsWith("HX_PLACEHOLDER")) {
    corpoTemplate = await buscarCorpoTemplateTwilio(contentSid)
    if (corpoTemplate) {
      mensagemRenderizada = renderizarCorpoTemplate(corpoTemplate, params.contentVariables)
    }
  }

  if (!mensagemRenderizada && variaveis.length > 0) {
    mensagemRenderizada = variaveis.map((v) => `${v.label}: ${v.valor}`).join("\n")
  }

  return {
    variaveis,
    corpo_template: corpoTemplate,
    mensagem_renderizada: mensagemRenderizada,
  }
}

export async function montarPreviewMensagemWhatsApp(params: {
  administradoraId: string
  eventType: WhatsAppBillingEventType
  clienteAdministradoraId?: string
  dados?: DadosEnvioWhatsApp
}): Promise<PreviewMensagemWhatsApp | { erro: string }> {
  const { data: template } = await supabaseAdmin
    .from("billing_templates")
    .select("content_sid, variaveis_map, ativo")
    .eq("event_type", params.eventType)
    .maybeSingle()

  const variaveisMap = (template?.variaveis_map || {}) as Record<string, string>
  if (!template?.ativo || !variaveisMap || Object.keys(variaveisMap).length === 0) {
    return { erro: "template_indisponivel" }
  }

  let dados: DadosEnvioWhatsApp
  if (params.dados) {
    dados = params.dados
  } else {
    const resolvido = await resolverDadosEnvioTeste({
      administradoraId: params.administradoraId,
      clienteAdministradoraId: params.clienteAdministradoraId,
    })
    if ("erro" in resolvido) return resolvido
    dados = resolvido.dados
  }

  const { data: settings } = await supabaseAdmin
    .from("billing_notification_settings")
    .select("telefone_suporte_whatsapp, url_portal_cliente")
    .eq("administradora_id", params.administradoraId)
    .maybeSingle()

  const variaveisInternas = montarVariaveisInternas({
    ...dados,
    telefoneSuporte: dados.telefoneSuporte ?? settings?.telefone_suporte_whatsapp,
    urlPortalCliente: dados.urlPortalCliente ?? settings?.url_portal_cliente,
  })

  const variaveisTwilio = mapearParaContentVariablesTwilio(variaveisInternas, variaveisMap)

  const variaveis: VariavelMensagemPreview[] = Object.entries(variaveisMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([twilioKey, chaveInterna]) => ({
      twilio_key: twilioKey,
      chave_interna: chaveInterna,
      label: LABELS_VARIAVEIS[chaveInterna] || chaveInterna,
      valor: variaveisTwilio[twilioKey] || "—",
    }))

  const contentSid = String(template.content_sid || "").trim()
  let corpoTemplate: string | null = null
  let mensagemRenderizada: string | null = null

  if (contentSid && !contentSid.startsWith("HX_PLACEHOLDER")) {
    corpoTemplate = await buscarCorpoTemplateTwilio(contentSid)
    if (corpoTemplate) {
      mensagemRenderizada = renderizarCorpoTemplate(corpoTemplate, variaveisTwilio)
    }
  }

  if (!mensagemRenderizada && variaveis.length > 0) {
    mensagemRenderizada = variaveis.map((v) => `${v.label}: ${v.valor}`).join("\n")
  }

  return {
    event_type: params.eventType,
    content_sid: contentSid || null,
    variaveis_twilio: variaveisTwilio,
    variaveis,
    corpo_template: corpoTemplate,
    mensagem_renderizada: mensagemRenderizada,
  }
}
