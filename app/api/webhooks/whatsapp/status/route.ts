import { NextRequest } from "next/server"
import { handleTwilioWebhookPost } from "@/lib/whatsapp-billing/webhook-route"
import { processarCallbackStatusTwilio } from "@/lib/whatsapp-billing/status-handler"

export const maxDuration = 30

const PATH = "/api/webhooks/whatsapp/status"

/**
 * POST /api/webhooks/whatsapp/status
 * Callback de status Twilio (queued, sent, delivered, read, failed, undelivered).
 */
export async function POST(request: NextRequest) {
  return handleTwilioWebhookPost(request, PATH, processarCallbackStatusTwilio)
}
