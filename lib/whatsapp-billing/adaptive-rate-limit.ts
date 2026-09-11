import { getRedisConnection } from "./redis"
import {
  WHATSAPP_ADAPTIVE_RATE_REDIS_KEY,
  WHATSAPP_WORKER_MAX_PER_SECOND_DEFAULT,
  WHATSAPP_WORKER_MAX_PER_SECOND_MAX,
  WHATSAPP_WORKER_MAX_PER_SECOND_MIN,
} from "./rate-limit-policy"
import { whatsappBillingLog } from "./logger"

const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000
const SUCCESS_STREAK_FOR_INCREASE = 50

let localMaxPerSecond = WHATSAPP_WORKER_MAX_PER_SECOND_DEFAULT
let successStreak = 0
let lastRateLimitAt = 0

function clampRate(n: number): number {
  return Math.max(
    WHATSAPP_WORKER_MAX_PER_SECOND_MIN,
    Math.min(WHATSAPP_WORKER_MAX_PER_SECOND_MAX, Math.round(n))
  )
}

export async function getAdaptiveMaxPerSecond(): Promise<number> {
  try {
    const redis = getRedisConnection()
    const raw = await redis.get(WHATSAPP_ADAPTIVE_RATE_REDIS_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed) && parsed > 0) {
        localMaxPerSecond = clampRate(parsed)
      }
    }
  } catch {
    /* Redis indisponível — usa valor local */
  }
  return localMaxPerSecond
}

async function persistRate(rate: number): Promise<void> {
  localMaxPerSecond = clampRate(rate)
  try {
    const redis = getRedisConnection()
    await redis.set(WHATSAPP_ADAPTIVE_RATE_REDIS_KEY, String(localMaxPerSecond), "EX", 86400)
  } catch {
    /* ok */
  }
}

/** Chamado quando Twilio/Meta retorna 63017, 63018 ou 429. */
export async function registrarRateLimitMeta(): Promise<void> {
  lastRateLimitAt = Date.now()
  successStreak = 0
  const novo = Math.max(WHATSAPP_WORKER_MAX_PER_SECOND_MIN, localMaxPerSecond - 1)
  if (novo !== localMaxPerSecond) {
    await persistRate(novo)
    whatsappBillingLog.warn("adaptive_rate.decreased", { maxPerSecond: novo })
  }
}

/** Chamado após envio bem-sucedido — aumenta gradualmente após streak. */
export async function registrarEnvioSucessoAdaptativo(): Promise<void> {
  if (Date.now() - lastRateLimitAt < RATE_LIMIT_COOLDOWN_MS) return

  successStreak++
  if (successStreak < SUCCESS_STREAK_FOR_INCREASE) return
  if (localMaxPerSecond >= WHATSAPP_WORKER_MAX_PER_SECOND_MAX) return

  successStreak = 0
  const novo = localMaxPerSecond + 1
  await persistRate(novo)
  whatsappBillingLog.info("adaptive_rate.increased", { maxPerSecond: novo })
}

/** Token bucket simples em memória por worker (complementa limiter BullMQ). */
let tokens = WHATSAPP_WORKER_MAX_PER_SECOND_DEFAULT
let lastRefill = Date.now()

export async function aguardarSlotEnvioAdaptativo(): Promise<void> {
  const maxPerSecond = await getAdaptiveMaxPerSecond()
  const now = Date.now()
  const elapsed = now - lastRefill
  if (elapsed >= 1000) {
    const intervals = Math.floor(elapsed / 1000)
    tokens = Math.min(maxPerSecond, tokens + intervals * maxPerSecond)
    lastRefill = now
  }
  if (tokens >= 1) {
    tokens--
    return
  }
  const waitMs = 1000 - (now - lastRefill)
  await new Promise((r) => setTimeout(r, Math.max(50, waitMs)))
  tokens = 0
  lastRefill = Date.now()
}
