import { supabaseAdmin } from "@/lib/supabase-admin"
import type { WhatsAppInboundJobPayload } from "./event-types"
import { whatsappBillingLog } from "./logger"

/**
 * Processamento assíncrono de mensagens inbound (fase 2 — stub).
 * Futuro: roteamento para atendimento/chamados/respostas automáticas.
 */
export async function processarJobInboundWhatsApp(payload: WhatsAppInboundJobPayload) {
  const { error } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", payload.inboundMessageId)
    .is("processed_at", null)

  if (error) {
    whatsappBillingLog.error("inbound.process.db_error", {
      inboundMessageId: payload.inboundMessageId,
      message: error.message,
    })
    throw error
  }

  whatsappBillingLog.info("inbound.process.done", {
    inboundMessageId: payload.inboundMessageId,
    messageSid: payload.messageSid,
  })

  return { processed: true }
}
