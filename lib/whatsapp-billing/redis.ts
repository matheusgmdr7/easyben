import IORedis from "ioredis"
import { whatsappBillingLog } from "./logger"

let redis: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (redis) return redis

  const url = process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim()
  if (!url) {
    throw new Error("Redis não configurado: defina REDIS_URL ou UPSTASH_REDIS_URL")
  }

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
