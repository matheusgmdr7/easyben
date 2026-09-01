/** Política de rate limit e retry para envios WhatsApp outbound. */

import type { WhatsAppBillingEventType } from "./event-types"

export const WHATSAPP_OUTBOUND_JOB_ATTEMPTS = 8
export const WHATSAPP_OUTBOUND_BACKOFF_MS = 60_000

/** Escalonamento entre lembretes enfileirados no cron (protege tier Meta/Twilio). */
export const WHATSAPP_LEMBRETE_STAGGER_MS = 3_000

/** Máximo de faturas enfileiradas por evento/admin em um run de cron (evita timeout 26s Netlify). */
export const WHATSAPP_CRON_FATURAS_POR_LOTE = 60

/** Catch-up: faturas por run (D0/D-1 sem envio bem-sucedido). */
export const WHATSAPP_CATCHUP_FATURAS_POR_LOTE = 80

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

/** Worker: mensagens por segundo (alinhar ao tier da conta Meta/Twilio). */
export const WHATSAPP_WORKER_MAX_PER_SECOND = 2
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
