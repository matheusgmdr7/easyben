/**
 * Worker BullMQ — processamento inbound WhatsApp.
 * Rodar: npm run worker:whatsapp:inbound
 */
import "../lib/load-env-local"
import { Worker } from "bullmq"
import {
  WHATSAPP_QUEUE_INBOUND,
  fecharRedisConnection,
  getRedisConnection,
  processarJobInboundWhatsApp,
  whatsappBillingLog,
  type WhatsAppInboundJobPayload,
} from "../lib/whatsapp-billing"

const worker = new Worker<WhatsAppInboundJobPayload>(
  WHATSAPP_QUEUE_INBOUND,
  async (job) => {
    whatsappBillingLog.info("worker.inbound.start", { jobId: job.id, messageSid: job.data.messageSid })
    return processarJobInboundWhatsApp(job.data)
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
    drainDelay: 2000,
  }
)

worker.on("failed", (job, err) => {
  whatsappBillingLog.error("worker.inbound.failed", {
    jobId: job?.id,
    messageSid: job?.data?.messageSid,
    message: err.message,
  })
})

whatsappBillingLog.info("worker.inbound.ready", { queue: WHATSAPP_QUEUE_INBOUND })

async function shutdown() {
  await worker.close()
  await fecharRedisConnection()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
