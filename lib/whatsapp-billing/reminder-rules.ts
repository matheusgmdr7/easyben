import type { WhatsAppBillingEventType } from "./event-types"
import { referenceDateHoje } from "./idempotency"
import { faturaStatusEmAberto, normalizarStatusFatura } from "@/lib/fatura-status"
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

/** Status de fatura elegíveis para lembrete/cobrança automática. */
export const STATUS_FATURA_LEMBRETE = ["pendente", "atrasada", "vencida"] as const

function minutosAgoraBrt(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const hora = Number(parts.find((p) => p.type === "hour")?.value || "0")
  const min = Number(parts.find((p) => p.type === "minute")?.value || "0")
  return hora * 60 + min
}

function minutosHorarioEnvio(horarioEnvio: string | null | undefined): number {
  const raw = String(horarioEnvio || "09:00:00").trim()
  const [hStr, mStr] = raw.split(":")
  const alvoH = Number(hStr)
  const alvoM = Number(mStr)
  if (!Number.isFinite(alvoH) || !Number.isFinite(alvoM)) return 9 * 60
  return alvoH * 60 + alvoM
}

/** Horário de envio (TIME) já passou em America/Sao_Paulo? */
export function horarioEnvioPermitido(horarioEnvio: string | null | undefined): boolean {
  return minutosAgoraBrt() >= minutosHorarioEnvio(horarioEnvio)
}

/**
 * Atraso em ms até o horário configurado (BRT). Zero se o horário já passou hoje.
 * Usado pelo cron às 09:00 para enfileirar envios à tarde sem pular o cliente.
 */
export function calcularDelayAteHorarioEnvio(horarioEnvio: string | null | undefined): number {
  const diff = minutosHorarioEnvio(horarioEnvio) - minutosAgoraBrt()
  if (diff <= 0) return 0
  return diff * 60 * 1000
}

export function faturaElegivelLembrete(status: string | null | undefined): boolean {
  return faturaStatusEmAberto(normalizarStatusFatura(status))
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
