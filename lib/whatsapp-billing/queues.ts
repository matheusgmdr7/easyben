import { Queue } from "bullmq"
import {
  WHATSAPP_QUEUE_INBOUND,
  WHATSAPP_QUEUE_OUTBOUND,
  type WhatsAppInboundJobPayload,
  type WhatsAppOutboundJobPayload,
} from "./event-types"
import {
  WHATSAPP_OUTBOUND_BACKOFF_MS,
  WHATSAPP_OUTBOUND_JOB_ATTEMPTS,
  prioridadeFilaWhatsApp,
} from "./rate-limit-policy"
import { getRedisConnection } from "./redis"

function queueConnection() {
  return { connection: getRedisConnection() }
}

let outboundQueue: Queue<WhatsAppOutboundJobPayload> | null = null
let inboundQueue: Queue<WhatsAppInboundJobPayload> | null = null

export function getOutboundQueue() {
  if (!outboundQueue) {
    outboundQueue = new Queue<WhatsAppOutboundJobPayload>(WHATSAPP_QUEUE_OUTBOUND, {
      ...queueConnection(),
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    })
  }
  return outboundQueue
}

export function getInboundQueue() {
  if (!inboundQueue) {
    inboundQueue = new Queue<WhatsAppInboundJobPayload>(WHATSAPP_QUEUE_INBOUND, {
      ...queueConnection(),
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    })
  }
  return inboundQueue
}

/** BullMQ não aceita ":" em jobId; idempotency_key no banco mantém ":". */
export function sanitizarJobIdBullMQ(id: string): string {
  return id.replace(/:/g, "__")
}

export async function enfileirarNotificacaoOutbound(
  payload: WhatsAppOutboundJobPayload,
  jobId?: string,
  options?: { delayMs?: number; attempts?: number; backoffMs?: number; priority?: number }
) {
  const queue = getOutboundQueue()
  return queue.add("send", payload, {
    jobId: jobId ? sanitizarJobIdBullMQ(jobId) : undefined,
    priority: options?.priority ?? prioridadeFilaWhatsApp(payload.eventType),
    attempts: options?.attempts ?? WHATSAPP_OUTBOUND_JOB_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: options?.backoffMs ?? WHATSAPP_OUTBOUND_BACKOFF_MS,
    },
    ...(options?.delayMs && options.delayMs > 0 ? { delay: options.delayMs } : {}),
  })
}

export async function enfileirarInboundProcessing(payload: WhatsAppInboundJobPayload) {
  const queue = getInboundQueue()
  return queue.add("process", payload, {
    jobId: payload.messageSid,
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
  })
}
