import { NextRequest } from "next/server"
import { handleTwilioWebhookPost } from "@/lib/whatsapp-billing/webhook-route"
import { processarCallbackInboundTwilio } from "@/lib/whatsapp-billing/inbound-handler"

export const maxDuration = 30

const PATH = "/api/webhooks/whatsapp/inbound"

/**
 * POST /api/webhooks/whatsapp/inbound
 * Mensagens recebidas do cliente no WhatsApp.
 */
export async function POST(request: NextRequest) {
  return handleTwilioWebhookPost(request, PATH, processarCallbackInboundTwilio)
}
