import type { WhatsAppBillingEventType } from "./event-types"

export function montarIdempotencyKey(params: {
  eventType: WhatsAppBillingEventType
  clienteId: string
  referenceDate: string
  faturaId?: string | null
}): string {
  const fatura = params.faturaId?.trim() || "none"
  return `${params.eventType}:${params.clienteId}:${params.referenceDate}:${fatura}`
}

export function referenceDateHoje(): string {
  return new Date().toISOString().slice(0, 10)
}

export function referenceDateAmanha(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
