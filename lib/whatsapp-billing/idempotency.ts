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

function dataIsoEmTimeZone(timeZone: string, offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${day}`
}

/** Data de referência (YYYY-MM-DD) em America/Sao_Paulo. */
export function referenceDateHoje(): string {
  return dataIsoEmTimeZone("America/Sao_Paulo")
}

export function referenceDateAmanha(): string {
  return dataIsoEmTimeZone("America/Sao_Paulo", 1)
}
