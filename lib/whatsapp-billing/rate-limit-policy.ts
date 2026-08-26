/** Política de rate limit e retry para envios WhatsApp outbound. */

export const WHATSAPP_OUTBOUND_JOB_ATTEMPTS = 8
export const WHATSAPP_OUTBOUND_BACKOFF_MS = 60_000

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
