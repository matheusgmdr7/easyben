import { NextRequest, NextResponse } from "next/server"
import { parseTwilioFormBody, validarWebhookTwilio, TWILIO_WEBHOOK_OK } from "./webhook-utils"
import { whatsappBillingLog } from "./logger"

type Handler = (body: Record<string, string>) => Promise<void>

export async function handleTwilioWebhookPost(
  request: NextRequest,
  pathname: string,
  handler: Handler
): Promise<Response> {
  try {
    const raw = await request.text()
    const body = parseTwilioFormBody(raw)

    if (!validarWebhookTwilio(request, body, pathname)) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 403 })
    }

    try {
      await handler(body)
    } catch (err: unknown) {
      whatsappBillingLog.error("webhook.handler_error", {
        pathname,
        message: err instanceof Error ? err.message : String(err),
      })
    }

    return TWILIO_WEBHOOK_OK
  } catch (err: unknown) {
    whatsappBillingLog.error("webhook.request_error", {
      pathname,
      message: err instanceof Error ? err.message : String(err),
    })
    return TWILIO_WEBHOOK_OK
  }
}
