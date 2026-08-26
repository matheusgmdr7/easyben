import Twilio from "twilio"
import { TWILIO_REQUEST_TIMEOUT_MS } from "./event-types"
import { TWILIO_RETRYABLE_ERROR_CODES } from "./rate-limit-policy"
import { whatsappBillingLog } from "./logger"

export type TwilioConfig = {
  accountSid: string
  authToken: string
  whatsappFrom: string
  webhookBaseUrl?: string
}

export function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim()
  const webhookBaseUrl =
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.PRODUCTION_URL?.trim()

  if (!accountSid || !authToken || !whatsappNumber) {
    throw new Error(
      "Twilio não configurado: defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_NUMBER"
    )
  }

  const whatsappFrom = whatsappNumber.startsWith("whatsapp:")
    ? whatsappNumber
    : whatsappNumber.startsWith("+")
      ? `whatsapp:${whatsappNumber}`
      : `whatsapp:+${whatsappNumber.replace(/\D/g, "")}`

  return { accountSid, authToken, whatsappFrom, webhookBaseUrl }
}

let client: ReturnType<typeof Twilio> | null = null

export function getTwilioClient() {
  if (client) return client
  const cfg = getTwilioConfig()
  client = Twilio(cfg.accountSid, cfg.authToken, { autoRetry: false, maxRetries: 0 })
  return client
}

export function isTwilioRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    const msg = err instanceof Error ? err.message : String(err || "")
    return msg.includes("Timeout Twilio")
  }
  const code = extrairCodigoErroTwilio(err)
  if (code && TWILIO_RETRYABLE_ERROR_CODES.has(code)) return true
  const status = Number((err as { status?: number }).status)
  if (status === 429 || status >= 500) return true
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes("Timeout Twilio")) return true
  return false
}

export function isTwilioValidationError(err: unknown): boolean {
  if (isTwilioRetryableError(err)) return false
  if (!err || typeof err !== "object") return false
  const code = Number((err as { code?: number }).code)
  if (Number.isFinite(code) && code >= 20000 && code < 70000) return true
  const status = Number((err as { status?: number }).status)
  return status === 400 || status === 404 || status === 422
}

export function extrairCodigoErroTwilio(err: unknown): string | null {
  if (!err || typeof err !== "object") return null
  const code = (err as { code?: number | string }).code
  if (code === undefined || code === null || code === "") return null
  return String(code)
}

export async function enviarWhatsAppTemplateTwilio(params: {
  to: string
  contentSid: string
  contentVariables: Record<string, string>
}): Promise<{ messageSid: string; status: string }> {
  const cfg = getTwilioConfig()
  const twilio = getTwilioClient()

  const timer = setTimeout(() => {
    whatsappBillingLog.warn("twilio.send.timeout_watch", { contentSid: params.contentSid })
  }, TWILIO_REQUEST_TIMEOUT_MS)

  try {
    whatsappBillingLog.info("twilio.send.start", {
      to: params.to.replace(/\d(?=\d{4})/g, "*"),
      contentSid: params.contentSid,
    })

    const statusCallback = cfg.webhookBaseUrl
      ? `${cfg.webhookBaseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/status`
      : undefined

    const message = await Promise.race([
      twilio.messages.create({
        from: cfg.whatsappFrom,
        to: params.to,
        contentSid: params.contentSid,
        contentVariables: JSON.stringify(params.contentVariables),
        ...(statusCallback ? { statusCallback } : {}),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout Twilio após 10s")), TWILIO_REQUEST_TIMEOUT_MS)
      ),
    ])

    whatsappBillingLog.info("twilio.send.success", {
      messageSid: message.sid,
      status: message.status,
    })

    return { messageSid: message.sid, status: message.status || "queued" }
  } catch (err: unknown) {
    whatsappBillingLog.error("twilio.send.error", {
      contentSid: params.contentSid,
      validation: isTwilioValidationError(err),
      message: err instanceof Error ? err.message : String(err),
    })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function validarAssinaturaTwilio(params: {
  signature: string | null
  url: string
  body: Record<string, string>
}): boolean {
  if (!params.signature) return false
  const cfg = getTwilioConfig()
  return Twilio.validateRequest(cfg.authToken, params.signature, params.url, params.body)
}
