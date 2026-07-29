/**
 * Teste rápido Twilio + Redis — rodar: npx tsx scripts/test-whatsapp-env.ts
 * Não commitar; usa .env.local via dotenv se disponível.
 */
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import IORedis from "ioredis"
import Twilio from "twilio"

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

async function testRedis() {
  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL
  if (!url) throw new Error("UPSTASH_REDIS_URL ausente")
  const redis = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith("rediss://") ? {} : undefined,
  })
  const pong = await redis.ping()
  await redis.quit()
  return pong
}

async function testTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const number = process.env.TWILIO_WHATSAPP_NUMBER
  if (!sid || !token || !number) throw new Error("Vars Twilio incompletas")
  const client = Twilio(sid, token)
  const account = await client.api.accounts(sid).fetch()
  return { friendlyName: account.friendlyName, whatsappNumber: number }
}

async function main() {
  const results: string[] = []

  try {
    const pong = await testRedis()
    results.push(`Redis: OK (${pong})`)
  } catch (e) {
    results.push(`Redis: FALHOU — ${e instanceof Error ? e.message : e}`)
  }

  try {
    const tw = await testTwilio()
    results.push(`Twilio: OK (conta "${tw.friendlyName}", número ${tw.whatsappNumber})`)
  } catch (e) {
    results.push(`Twilio: FALHOU — ${e instanceof Error ? e.message : e}`)
  }

  console.log(results.join("\n"))
  if (results.some((r) => r.includes("FALHOU"))) process.exit(1)
}

main()
