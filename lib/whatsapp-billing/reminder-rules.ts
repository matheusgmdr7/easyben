import type { WhatsAppBillingEventType } from "./event-types"
import { referenceDateHoje } from "./idempotency"
export type RegraLembrete = {
  eventType: WhatsAppBillingEventType
  dayOffset: number
}

export const REGRAS_LEMBRETE_COBRANCA: RegraLembrete[] = [
  { eventType: "lembrete_d5", dayOffset: 5 },
  { eventType: "aviso_d1", dayOffset: 1 },
  { eventType: "aviso_d0", dayOffset: 0 },
  { eventType: "cobranca_d3", dayOffset: -3 },
  { eventType: "cobranca_d7", dayOffset: -7 },
  { eventType: "cobranca_d15", dayOffset: -15 },
  { eventType: "cobranca_d25", dayOffset: -25 },
]

export function dataComOffset(baseDate: string, dayOffset: number): string {
  const d = new Date(`${baseDate}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + dayOffset)
  return d.toISOString().slice(0, 10)
}

/** Data de vencimento alvo para disparar hoje um evento com dayOffset. */
export function vencimentoAlvoParaEvento(dayOffset: number, hoje?: string): string {
  return dataComOffset(hoje || referenceDateHoje(), dayOffset)
}

/** Horário de envio (TIME) já passou em America/Sao_Paulo? */
export function horarioEnvioPermitido(horarioEnvio: string | null | undefined): boolean {
  const raw = String(horarioEnvio || "09:00:00").trim()
  const [hStr, mStr] = raw.split(":")
  const alvoH = Number(hStr)
  const alvoM = Number(mStr)
  if (!Number.isFinite(alvoH) || !Number.isFinite(alvoM)) return true

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const hora = Number(parts.find((p) => p.type === "hour")?.value || "0")
  const min = Number(parts.find((p) => p.type === "minute")?.value || "0")

  return hora * 60 + min >= alvoH * 60 + alvoM
}

const STATUS_ABERTOS = new Set(["pendente", "atrasada"])

export function faturaElegivelLembrete(status: string | null | undefined): boolean {
  return STATUS_ABERTOS.has(String(status || "").trim().toLowerCase())
}

/** Escolhe o template mais adequado para envio manual conforme vencimento. */
export function inferirEventoCobrancaPorVencimento(
  vencimento: string,
  hoje?: string
): WhatsAppBillingEventType {
  const v = String(vencimento || "").slice(0, 10)
  const ref = hoje || referenceDateHoje()
  const diff = Math.round(
    (new Date(`${v}T12:00:00.000Z`).getTime() - new Date(`${ref}T12:00:00.000Z`).getTime()) /
      86_400_000
  )

  if (diff >= 5) return "lembrete_d5"
  if (diff >= 1) return "aviso_d1"
  if (diff === 0) return "aviso_d0"
  if (diff >= -3) return "cobranca_d3"
  if (diff >= -7) return "cobranca_d7"
  if (diff >= -15) return "cobranca_d15"
  return "cobranca_d25"
}
