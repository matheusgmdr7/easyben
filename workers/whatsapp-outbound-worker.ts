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
import { identificarPapelSupabaseKey, resolverSupabaseUrl } from "../lib/supabase-admin"

import {
  WHATSAPP_WORKER_CONCURRENCY,
  WHATSAPP_WORKER_MAX_PER_SECOND,
} from "../lib/whatsapp-billing/rate-limit-policy"

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
    concurrency: WHATSAPP_WORKER_CONCURRENCY,
    drainDelay: 2000,
    limiter: {
      max: WHATSAPP_WORKER_MAX_PER_SECOND,
      duration: 1000,
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
  rateLimit: `${WHATSAPP_WORKER_MAX_PER_SECOND}/s`,
  supabaseProject: resolverSupabaseUrl()?.match(/https:\/\/([^.]+)/)?.[1] ?? "nao_configurado",
  supabaseKeyRole: identificarPapelSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY) ?? "desconhecido",
})

async function verificarSupabaseNoStartup() {
  try {
    const { supabaseAdmin } = await import("../lib/supabase-admin")
    const { data, error } = await supabaseAdmin
      .from("billing_templates")
      .select("event_type, content_sid")
      .eq("event_type", "cobranca_d3")
      .eq("ativo", true)
      .maybeSingle()
    whatsappBillingLog.info("worker.outbound.supabase_check", {
      ok: !error && Boolean(data?.content_sid),
      supabaseError: error?.message ?? null,
      contentSid: data?.content_sid ? `${String(data.content_sid).slice(0, 6)}…` : null,
    })
  } catch (err: unknown) {
    whatsappBillingLog.error("worker.outbound.supabase_check", {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

void verificarSupabaseNoStartup()

async function shutdown() {
  whatsappBillingLog.info("worker.outbound.shutdown")
  await worker.close()
  await fecharRedisConnection()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
