/** Política de rate limit e retry para envios WhatsApp outbound. */

import type { WhatsAppBillingEventType } from "./event-types"

export const WHATSAPP_OUTBOUND_JOB_ATTEMPTS = 8
export const WHATSAPP_OUTBOUND_BACKOFF_MS = 60_000

/** Escalonamento entre lembretes enfileirados no cron (protege tier Meta/Twilio). */
export const WHATSAPP_LEMBRETE_STAGGER_MS = 3_000

/** Página de faturas consultadas por iteração do cron paginado. */
export const WHATSAPP_CRON_PAGE_SIZE = 100

/** Máximo de faturas enfileiradas por evento/admin em um run de cron (legado / fallback). */
export const WHATSAPP_CRON_FATURAS_POR_LOTE = 100

/** Catch-up: faturas enfileiradas por evento em um run (todos os lembretes). */
export const WHATSAPP_CATCHUP_FATURAS_POR_LOTE = 150

/** Orçamento de tempo do cron paginado (Netlify ~26s; Vercel até 300s). */
export const WHATSAPP_CRON_TIME_BUDGET_MS = Number(
  process.env.WHATSAPP_CRON_TIME_BUDGET_MS || 24_000
)

/** Recovery cron: mensagens reenfileiradas por execução. */
export const WHATSAPP_RECOVERY_MAX_MESSAGES = 800

/** Rate adaptativo worker (msg/s). */
export const WHATSAPP_WORKER_MAX_PER_SECOND_DEFAULT = 2
export const WHATSAPP_WORKER_MAX_PER_SECOND_MIN = 1
export const WHATSAPP_WORKER_MAX_PER_SECOND_MAX = 5
export const WHATSAPP_ADAPTIVE_RATE_REDIS_KEY = "whatsapp:worker:max_per_second"

/**
 * Prioridade BullMQ (menor número = processado antes).
 * Confirmação de pagamento fica atrás dos lembretes de vencimento.
 */
const PRIORIDADE_FILA: Partial<Record<WhatsAppBillingEventType, number>> = {
  aviso_d0: 1,
  aviso_d1: 2,
  lembrete_d5: 3,
  cobranca_d3: 4,
  cobranca_d7: 5,
  cobranca_d15: 6,
  cobranca_d25: 7,
  saudacao_boas_vindas: 8,
  primeiro_boleto_gerado: 9,
  confirmacao_pagamento: 20,
}

export function prioridadeFilaWhatsApp(eventType: WhatsAppBillingEventType): number {
  return PRIORIDADE_FILA[eventType] ?? 10
}

/** Intervalo entre saudações enfileiradas (evita pico na Twilio). */
export const WHATSAPP_SAUDACAO_STAGGER_MS = 4_000
export const WHATSAPP_SAUDACAO_MAX_STAGGER_MS = 30 * 60 * 1000

/** Worker: mensagens por segundo inicial (adaptativo via Redis). */
export const WHATSAPP_WORKER_MAX_PER_SECOND = WHATSAPP_WORKER_MAX_PER_SECOND_DEFAULT
export const WHATSAPP_WORKER_CONCURRENCY = 2

/** Códigos Twilio que devem ser retentados (não são falha permanente). */
export const TWILIO_RETRYABLE_ERROR_CODES = new Set([
  "63017", // limite de taxa
  "63018", // conta WhatsApp restrita (tier) — retentar quando liberar
  "20429", // too many requests (Twilio API)
])

export const WHATSAPP_RECOVERY_ERROR_CODES = new Set([...TWILIO_RETRYABLE_ERROR_CODES])

/** Delay entre reenfileiramentos em lote (cron/script). */
export const WHATSAPP_RECOVERY_STAGGER_MS = 5_000

export function calcularDelayEscalonadoSaudacao(clienteId: string): number {
  let hash = 0
  for (let i = 0; i < clienteId.length; i++) {
    hash = (hash * 31 + clienteId.charCodeAt(i)) >>> 0
  }
  const slots = Math.max(1, Math.floor(WHATSAPP_SAUDACAO_MAX_STAGGER_MS / WHATSAPP_SAUDACAO_STAGGER_MS))
  return (hash % slots) * WHATSAPP_SAUDACAO_STAGGER_MS
}
