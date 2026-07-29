import { supabaseAdmin } from "@/lib/supabase-admin"
import { mapearStatusTwilio } from "./webhook-utils"
import { whatsappBillingLog } from "./logger"

export async function processarCallbackStatusTwilio(body: Record<string, string>): Promise<void> {
  const messageSid = String(body.MessageSid || body.SmsSid || "").trim()
  const messageStatus = String(body.MessageStatus || body.SmsStatus || "").trim()

  if (!messageSid) {
    whatsappBillingLog.warn("webhook.status.missing_sid", { keys: Object.keys(body) })
    return
  }

  const status = mapearStatusTwilio(messageStatus)
  if (!status) {
    whatsappBillingLog.info("webhook.status.ignored", { messageSid, messageStatus })
    return
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    status,
    updated_at: now,
  }

  if (status === "queued") update.queued_at = now
  if (status === "sent") update.sent_at = now
  if (status === "delivered") update.delivered_at = now
  if (status === "read") update.read_at = now
  if (status === "failed" || status === "undelivered") {
    update.failed_at = now
    update.error_code = body.ErrorCode || null
    update.error_message = body.ErrorMessage || body.MessageStatus || null
  }

  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .update(update)
    .eq("message_sid", messageSid)
    .select("id")
    .maybeSingle()

  if (error) {
    whatsappBillingLog.error("webhook.status.db_error", { messageSid, message: error.message })
    return
  }

  if (!data) {
    whatsappBillingLog.info("webhook.status.not_found", { messageSid, messageStatus })
    return
  }

  whatsappBillingLog.info("webhook.status.updated", { messageSid, status })
}
