import { supabaseAdmin } from "@/lib/supabase-admin"
import { getTwilioConfig } from "./twilio-client"

export type WhatsAppSenderLimitInfo = {
  sender_sid: string | null
  sender_id: string | null
  status: string | null
  messaging_limit_raw: string | null
  messaging_limit_max: number | null
  quality_rating: string | null
  offline_reasons: string[] | null
}

export type WhatsAppUsage24h = {
  destinatarios_unicos: number
  janela_inicio: string
  janela_fim: string
}

export type WhatsAppLimitesPainel = {
  sender: WhatsAppSenderLimitInfo
  uso_24h: WhatsAppUsage24h
  restantes: number | null
  percentual_uso: number | null
  em_risco: boolean
  twilio_configurado: boolean
  atualizado_em: string
}

const STATUS_CONTAM_QUOTA = new Set([
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
])

/** Converte texto Twilio/Meta ("250 Customers/24hr", "10K Customers/24hr") em número. */
export function parseMessagingLimitMax(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (s.includes("unlimited") || s.includes("ilimitad")) return null

  const tierMatch = s.match(/tier[_-]?(\d+(?:k|m)?)/i)
  if (tierMatch) {
    return parseNumeroComSufixo(tierMatch[1])
  }

  const numMatch = s.match(/([\d.,]+)\s*(k|m)?/)
  if (!numMatch) return null
  const base = parseNumeroComSufixo(`${numMatch[1]}${numMatch[2] || ""}`)
  return base
}

function parseNumeroComSufixo(token: string): number | null {
  const t = token.replace(/,/g, "").trim().toLowerCase()
  if (!t) return null
  if (t.endsWith("k")) {
    const n = Number(t.slice(0, -1))
    return Number.isFinite(n) ? Math.round(n * 1000) : null
  }
  if (t.endsWith("m")) {
    const n = Number(t.slice(0, -1))
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : null
  }
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : null
}

function normalizarTelefoneContagem(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "")
  if (digits.length >= 10) return digits.slice(-13)
  return digits
}

type TwilioSenderApiRow = {
  sid?: string
  sender_id?: string
  status?: string
  properties?: {
    quality_rating?: string | null
    messaging_limit?: string | null
  } | null
  offline_reasons?: Array<{ code?: string; message?: string }> | null
}

async function listarSendersTwilio(): Promise<TwilioSenderApiRow[]> {
  const cfg = getTwilioConfig()
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")
  const rows: TwilioSenderApiRow[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 5; page++) {
    const qs = new URLSearchParams({ Channel: "whatsapp", PageSize: "50" })
    if (pageToken) qs.set("PageToken", pageToken)

    const res = await fetch(`https://messaging.twilio.com/v2/Channels/Senders?${qs}`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Twilio Senders API ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = (await res.json()) as {
      senders?: TwilioSenderApiRow[]
      meta?: { next_page_token?: string | null }
    }
    rows.push(...(data.senders || []))
    pageToken = data.meta?.next_page_token || undefined
    if (!pageToken) break
  }

  return rows
}

async function buscarSenderTwilioPorSid(senderSid: string): Promise<TwilioSenderApiRow | null> {
  const cfg = getTwilioConfig()
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")
  const res = await fetch(`https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Twilio Sender ${res.status}: ${body.slice(0, 200)}`)
  }
  return (await res.json()) as TwilioSenderApiRow
}

function mapearSender(row: TwilioSenderApiRow | null | undefined): WhatsAppSenderLimitInfo {
  const messagingLimitRaw = row?.properties?.messaging_limit ?? null
  return {
    sender_sid: row?.sid ? String(row.sid) : null,
    sender_id: row?.sender_id ? String(row.sender_id) : null,
    status: row?.status ? String(row.status) : null,
    messaging_limit_raw: messagingLimitRaw,
    messaging_limit_max: parseMessagingLimitMax(messagingLimitRaw),
    quality_rating: row?.properties?.quality_rating ? String(row.properties.quality_rating) : null,
    offline_reasons:
      row?.offline_reasons?.map((r) => String(r.message || r.code || "")).filter(Boolean) || null,
  }
}

export async function consultarSenderWhatsAppTwilio(): Promise<WhatsAppSenderLimitInfo> {
  const cfg = getTwilioConfig()
  const senderSidEnv = process.env.TWILIO_WHATSAPP_SENDER_SID?.trim()

  if (senderSidEnv) {
    const row = await buscarSenderTwilioPorSid(senderSidEnv)
    if (row) return mapearSender(row)
  }

  const senders = await listarSendersTwilio()
  const alvo = cfg.whatsappFrom.toLowerCase()
  const digitsAlvo = alvo.replace(/\D/g, "")

  const row =
    senders.find((s) => String(s.sender_id || "").toLowerCase() === alvo) ||
    senders.find((s) => String(s.sender_id || "").replace(/\D/g, "").endsWith(digitsAlvo.slice(-11))) ||
    senders[0]

  return mapearSender(row)
}

export async function contarDestinatariosUnicos24h(): Promise<WhatsAppUsage24h> {
  const agora = new Date()
  const inicio = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  const telefones = new Set<string>()
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("telefone, status")
      .gte("created_at", inicio.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(error.message)

    const chunk = data || []
    for (const row of chunk) {
      const status = String((row as { status?: string }).status || "").toLowerCase()
      if (!STATUS_CONTAM_QUOTA.has(status)) continue
      const tel = normalizarTelefoneContagem(String((row as { telefone?: string }).telefone || ""))
      if (tel) telefones.add(tel)
    }

    if (chunk.length < pageSize) break
    offset += pageSize
    if (offset > 200_000) break
  }

  return {
    destinatarios_unicos: telefones.size,
    janela_inicio: inicio.toISOString(),
    janela_fim: agora.toISOString(),
  }
}

export async function obterPainelLimitesWhatsApp(): Promise<WhatsAppLimitesPainel> {
  let twilioConfigurado = true
  let sender: WhatsAppSenderLimitInfo = {
    sender_sid: null,
    sender_id: null,
    status: null,
    messaging_limit_raw: null,
    messaging_limit_max: null,
    quality_rating: null,
    offline_reasons: null,
  }

  try {
    sender = await consultarSenderWhatsAppTwilio()
  } catch (err) {
    twilioConfigurado = false
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes("Twilio não configurado")) throw err
  }

  const uso_24h = await contarDestinatariosUnicos24h()
  const max = sender.messaging_limit_max
  const usados = uso_24h.destinatarios_unicos

  let restantes: number | null = null
  let percentual_uso: number | null = null
  let em_risco = false

  if (max != null && max > 0) {
    restantes = Math.max(0, max - usados)
    percentual_uso = Math.min(100, Math.round((usados / max) * 100))
    em_risco = restantes <= Math.max(10, Math.floor(max * 0.1))
  }

  const statusUpper = String(sender.status || "").toUpperCase()
  if (statusUpper && statusUpper !== "ONLINE") em_risco = true
  if (String(sender.quality_rating || "").toUpperCase() === "LOW") em_risco = true

  return {
    sender,
    uso_24h,
    restantes,
    percentual_uso,
    em_risco,
    twilio_configurado: twilioConfigurado,
    atualizado_em: new Date().toISOString(),
  }
}
