import { supabaseAdmin } from "@/lib/supabase-admin"
import { enfileirarInboundProcessing } from "./queues"
import { extrairDigitosTelefone, extrairTelefoneE164 } from "./webhook-utils"
import { whatsappBillingLog } from "./logger"

async function resolverClientePorTelefone(telefoneE164: string): Promise<{
  cliente_administradora_id: string | null
  administradora_id: string | null
}> {
  const digits = extrairDigitosTelefone(telefoneE164)
  const suffix11 = digits.slice(-11)
  const suffix10 = digits.slice(-10)
  if (suffix11.length < 10) {
    return { cliente_administradora_id: null, administradora_id: null }
  }

  const { data: recente } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("cliente_administradora_id, administradora_id")
    .or(`telefone.ilike.%${suffix11},telefone.ilike.%${suffix10}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recente?.cliente_administradora_id) {
    return {
      cliente_administradora_id: recente.cliente_administradora_id,
      administradora_id: recente.administradora_id,
    }
  }

  const { data: fatura } = await supabaseAdmin
    .from("faturas")
    .select("cliente_administradora_id, administradora_id, cliente_telefone")
    .or(`cliente_telefone.ilike.%${suffix11},cliente_telefone.ilike.%${suffix10}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fatura?.cliente_administradora_id) {
    return {
      cliente_administradora_id: fatura.cliente_administradora_id,
      administradora_id: fatura.administradora_id,
    }
  }

  return { cliente_administradora_id: null, administradora_id: null }
}

export async function processarCallbackInboundTwilio(body: Record<string, string>): Promise<void> {
  const messageSid = String(body.MessageSid || body.SmsSid || "").trim()
  const from = extrairTelefoneE164(body.From)
  const texto = String(body.Body || "").trim()

  if (!messageSid) {
    whatsappBillingLog.warn("webhook.inbound.missing_sid")
    return
  }

  const { data: existente } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .select("id")
    .eq("message_sid", messageSid)
    .maybeSingle()

  if (existente?.id) {
    whatsappBillingLog.info("webhook.inbound.duplicate", { messageSid })
    return
  }

  const cliente = await resolverClientePorTelefone(from)

  const { data: inserted, error } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .insert({
      message_sid: messageSid,
      telefone: from,
      cliente_administradora_id: cliente.cliente_administradora_id,
      administradora_id: cliente.administradora_id,
      body: texto,
      raw_payload: body,
    })
    .select("id")
    .single()

  if (error) {
    whatsappBillingLog.error("webhook.inbound.db_error", { messageSid, message: error.message })
    return
  }

  whatsappBillingLog.info("webhook.inbound.saved", {
    messageSid,
    inboundId: inserted.id,
    telefone: from.replace(/\d(?=\d{4})/g, "*"),
  })

  try {
    await enfileirarInboundProcessing({
      inboundMessageId: inserted.id,
      messageSid,
      telefone: from,
      body: texto,
    })
  } catch (err: unknown) {
    whatsappBillingLog.error("webhook.inbound.enqueue_error", {
      messageSid,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
