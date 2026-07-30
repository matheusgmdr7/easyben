import IORedis from "ioredis"
import { whatsappBillingLog } from "./logger"

let redis: IORedis | null = null

/** Aceita só a URL; corrige colagem acidental do comando redis-cli do Upstash. */
export function normalizarRedisUrl(raw: string): string {
  let url = raw.trim()

  if (url.includes("redis-cli")) {
    const afterFlagU = url.match(/(?:^|\s)-u\s+(rediss?:\/\/\S+)/i)
    const withAuth = url.match(/(rediss?:\/\/[^/\s]+@[^\s"']+)/i)
    const extraida = afterFlagU?.[1] ?? withAuth?.[1]
    if (extraida) {
      url = extraida
      whatsappBillingLog.warn("redis.url_normalizada", { motivo: "comando redis-cli detectado" })
    }
  }

  if (url.startsWith("redis://") && url.includes("upstash.io")) {
    url = `rediss://${url.slice("redis://".length)}`
  }

  return url
}

export function getRedisConnection(): IORedis {
  if (redis) return redis

  const raw = process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim()
  if (!raw) {
    throw new Error("Redis não configurado: defina REDIS_URL ou UPSTASH_REDIS_URL")
  }

  const url = normalizarRedisUrl(raw)

  redis = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith("rediss://") ? {} : undefined,
  })

  redis.on("error", (err) => {
    whatsappBillingLog.error("redis.error", { message: err.message })
  })

  return redis
}

export async function fecharRedisConnection() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
