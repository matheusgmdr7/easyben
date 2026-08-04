/**
 * Worker BullMQ — envio outbound WhatsApp (Twilio).
 * Rodar em processo separado: npm run worker:whatsapp
 */
import "../lib/load-env-local"
import { Worker } from "bullmq"
import {
  WHATSAPP_QUEUE_OUTBOUND,
  fecharRedisConnection,
  getRedisConnection,
  processarJobOutboundWhatsApp,
  whatsappBillingLog,
  type WhatsAppOutboundJobPayload,
} from "../lib/whatsapp-billing"

const RATE_LIMIT_MAX = 15
const RATE_LIMIT_DURATION_MS = 1000

const worker = new Worker<WhatsAppOutboundJobPayload>(
  WHATSAPP_QUEUE_OUTBOUND,
  async (job) => {
    whatsappBillingLog.info("worker.outbound.start", { jobId: job.id, eventType: job.data.eventType })
    const result = await processarJobOutboundWhatsApp(job.data)
    whatsappBillingLog.info("worker.outbound.done", { jobId: job.id, result })
    return result
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
    drainDelay: 2000,
    limiter: {
      max: RATE_LIMIT_MAX,
      duration: RATE_LIMIT_DURATION_MS,
    },
  }
)

worker.on("failed", (job, err) => {
  whatsappBillingLog.error("worker.outbound.failed", {
    jobId: job?.id,
    eventType: job?.data?.eventType,
    message: err.message,
  })
})

worker.on("error", (err) => {
  whatsappBillingLog.error("worker.outbound.error", { message: err.message })
})

whatsappBillingLog.info("worker.outbound.ready", {
  queue: WHATSAPP_QUEUE_OUTBOUND,
  rateLimit: `${RATE_LIMIT_MAX}/s`,
})

async function shutdown() {
  whatsappBillingLog.info("worker.outbound.shutdown")
  await worker.close()
  await fecharRedisConnection()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
