/**
 * Tipos de evento de cobrança WhatsApp (Twilio Content Templates).
 * Templates globais; variáveis preenchidas por administradora/cliente/fatura.
 */
export const WHATSAPP_BILLING_EVENT_TYPES = [
  "saudacao_boas_vindas",
  "primeiro_boleto_gerado",
  "lembrete_d5",
  "aviso_d1",
  "aviso_d0",
  "cobranca_d3",
  "cobranca_d7",
  "cobranca_d15",
  "cobranca_d25",
  "confirmacao_pagamento",
] as const

export type WhatsAppBillingEventType = (typeof WHATSAPP_BILLING_EVENT_TYPES)[number]

export const WHATSAPP_BILLING_EVENT_LABELS: Record<WhatsAppBillingEventType, string> = {
  saudacao_boas_vindas: "Saudação e boas-vindas",
  primeiro_boleto_gerado: "Primeiro boleto gerado",
  lembrete_d5: "Lembrete D-5",
  aviso_d1: "Aviso véspera (D-1)",
  aviso_d0: "Aviso no vencimento (D0)",
  cobranca_d3: "Cobrança D+3",
  cobranca_d7: "Cobrança D+7",
  cobranca_d15: "D+15 — Evite cancelamento",
  cobranca_d25: "D+25 — Cancelamento/jurídico",
  confirmacao_pagamento: "Confirmação de pagamento",
}

export function isWhatsAppBillingEventType(value: string): value is WhatsAppBillingEventType {
  return (WHATSAPP_BILLING_EVENT_TYPES as readonly string[]).includes(value)
}

/** Filas BullMQ */
export const WHATSAPP_QUEUE_OUTBOUND = "whatsapp-outbound-notifications"
export const WHATSAPP_QUEUE_INBOUND = "whatsapp-inbound-processing"

export const TWILIO_REQUEST_TIMEOUT_MS = 10_000

/** Atraso entre saudação e mensagem do primeiro boleto (24 horas). */
export const PRIMEIRO_BOLETO_MENSAGEM_DELAY_MS = 24 * 60 * 60 * 1000

/** Status outbound persistidos em whatsapp_messages */
export type WhatsAppMessageStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "failed_permanent"
  | "undelivered"

export type WhatsAppOutboundJobPayload = {
  clienteId: string
  administradoraId: string
  telefone: string
  eventType: WhatsAppBillingEventType
  faturaId?: string | null
  referenceDate: string
  variaveis: Record<string, string>
}

export type WhatsAppInboundJobPayload = {
  inboundMessageId: string
  messageSid: string
  telefone: string
  body: string
}

export type BillingTemplateRow = {
  id: string
  event_type: WhatsAppBillingEventType
  content_sid: string
  descricao: string | null
  variaveis_map: Record<string, string>
  ativo: boolean
}

export type ContentVariablesInput = {
  cliente_nome: string
  administradora_nome: string
  valor_fatura?: string
  data_vencimento?: string
  data_pagamento?: string
  link_boleto?: string
  numero_fatura?: string
  url_portal_cliente?: string
  telefone_suporte?: string
}
