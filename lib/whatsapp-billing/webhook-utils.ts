import type { NextRequest } from "next/server"
import { validarAssinaturaTwilio } from "./twilio-client"
import { whatsappBillingLog } from "./logger"
import type { WhatsAppMessageStatus } from "./event-types"

export function parseTwilioFormBody(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw)
  const body: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    body[key] = value
  }
  return body
}

export function montarWebhookUrl(request: NextRequest, pathname: string): string {
  const base =
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    process.env.PRODUCTION_URL?.trim().replace(/\/$/, "")
  const qs = request.nextUrl.search

  if (base) {
    return `${base}${pathname}${qs}`
  }

  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  return `${proto}://${host}${pathname}${qs}`
}

export function webhookValidationEnabled(): boolean {
  return process.env.TWILIO_SKIP_WEBHOOK_VALIDATION !== "1"
}

export function validarWebhookTwilio(request: NextRequest, body: Record<string, string>, pathname: string): boolean {
  if (!webhookValidationEnabled()) {
    whatsappBillingLog.warn("webhook.validation_skipped", { pathname })
    return true
  }

  const signature = request.headers.get("x-twilio-signature")
  const url = montarWebhookUrl(request, pathname)
  const ok = validarAssinaturaTwilio({ signature, url, body })

  if (!ok) {
    whatsappBillingLog.warn("webhook.invalid_signature", { pathname, url })
  }
  return ok
}

const MAPA_STATUS_TWILIO: Record<string, WhatsAppMessageStatus> = {
  accepted: "queued",
  queued: "queued",
  sending: "queued",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "undelivered",
  canceled: "failed",
}

export function mapearStatusTwilio(messageStatus: string | undefined): WhatsAppMessageStatus | null {
  const key = String(messageStatus || "").trim().toLowerCase()
  return MAPA_STATUS_TWILIO[key] ?? null
}

export function extrairTelefoneE164(from: string | undefined): string {
  const raw = String(from || "").replace(/^whatsapp:/i, "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`
}

export function extrairDigitosTelefone(valor: string | undefined): string {
  return String(valor || "").replace(/\D/g, "")
}

/** Resposta vazia 200 exigida pela Twilio (não expor erro interno). */
export const TWILIO_WEBHOOK_OK = new Response("", { status: 200 })
