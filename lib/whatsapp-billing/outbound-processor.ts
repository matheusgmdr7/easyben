import { supabaseAdmin } from "@/lib/supabase-admin"
import type { WhatsAppOutboundJobPayload } from "./event-types"
import { montarIdempotencyKey } from "./idempotency"
import { whatsappBillingLog } from "./logger"
import { telefoneParaTwilioWhatsApp } from "./content-variables"
import { enviarWhatsAppTemplateTwilio, extrairCodigoErroTwilio, isTwilioValidationError } from "./twilio-client"

const STATUS_SUCESSO = new Set(["queued", "sent", "delivered", "read"])

export async function processarJobOutboundWhatsApp(payload: WhatsAppOutboundJobPayload) {
  const idempotencyKey = montarIdempotencyKey({
    eventType: payload.eventType,
    clienteId: payload.clienteId,
    referenceDate: payload.referenceDate,
    faturaId: payload.faturaId,
  })

  const { data: existente } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id, status, message_sid")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()

  if (existente && STATUS_SUCESSO.has(String(existente.status))) {
    whatsappBillingLog.info("outbound.skip_idempotent", {
      idempotencyKey,
      messageSid: existente.message_sid,
    })
    return { skipped: true, messageSid: existente.message_sid }
  }

  const { data: template, error: tplErr } = await supabaseAdmin
    .from("billing_templates")
    .select("content_sid, ativo, variaveis_map")
    .eq("event_type", payload.eventType)
    .eq("ativo", true)
    .maybeSingle()

  if (tplErr || !template?.content_sid) {
    whatsappBillingLog.error("outbound.template_missing", {
      eventType: payload.eventType,
      supabaseError: tplErr?.message ?? null,
      hasRow: Boolean(template),
      contentSid: template?.content_sid ?? null,
      supabaseProject: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? null,
    })
    throw new Error(`Template não encontrado para eventType=${payload.eventType}`)
  }

  if (String(template.content_sid).startsWith("HX_PLACEHOLDER")) {
    throw new Error(
      `ContentSid placeholder para ${payload.eventType}. Atualize billing_templates com o SID real da Twilio.`
    )
  }

  const to = telefoneParaTwilioWhatsApp(payload.telefone)
  if (!to) {
    throw new Error("Telefone inválido para WhatsApp")
  }

  const contentVariables = payload.variaveis

  const registroBase = {
    administradora_id: payload.administradoraId,
    cliente_administradora_id: payload.clienteId,
    fatura_id: payload.faturaId || null,
    event_type: payload.eventType,
    reference_date: payload.referenceDate,
    idempotency_key: idempotencyKey,
    telefone: payload.telefone,
    content_sid: template.content_sid,
    content_variables: contentVariables,
    status: "pending",
    attempt_count: (existente ? 1 : 0) + 1,
  }

  let messageId = existente?.id as string | undefined

  if (!messageId) {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("whatsapp_messages")
      .insert(registroBase)
      .select("id")
      .single()
    if (insErr) throw new Error(`Erro ao registrar mensagem: ${insErr.message}`)
    messageId = inserted.id
  } else {
    await supabaseAdmin
      .from("whatsapp_messages")
      .update({ attempt_count: registroBase.attempt_count, status: "pending" })
      .eq("id", messageId)
  }

  try {
    const result = await enviarWhatsAppTemplateTwilio({
      to,
      contentSid: template.content_sid,
      contentVariables,
    })

    await supabaseAdmin
      .from("whatsapp_messages")
      .update({
        message_sid: result.messageSid,
        status: result.status === "queued" ? "queued" : "sent",
        queued_at: new Date().toISOString(),
        sent_at: result.status !== "queued" ? new Date().toISOString() : null,
        error_code: null,
        error_message: null,
      })
      .eq("id", messageId)

    return { skipped: false, messageSid: result.messageSid }
  } catch (err: unknown) {
    const permanente = isTwilioValidationError(err)
    const errorCode = extrairCodigoErroTwilio(err)
    await supabaseAdmin
      .from("whatsapp_messages")
      .update({
        status: permanente ? "failed_permanent" : "failed",
        failed_at: new Date().toISOString(),
        error_code: errorCode,
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", messageId)

    if (permanente) {
      whatsappBillingLog.warn("outbound.failed_permanent", { idempotencyKey })
      return { skipped: false, failedPermanent: true }
    }
    throw err
  }
}
