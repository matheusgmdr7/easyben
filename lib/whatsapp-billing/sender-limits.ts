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
  /** Twilio retornou messaging_limit Unavailable — tier ainda não sincronizado da Meta. */
  tier_indisponivel_twilio: boolean
  /** Ex.: número de envio (.env) diferente do sender ONLINE na Twilio. */
  aviso_configuracao: string | null
  whatsapp_from_env: string | null
  atualizado_em: string
}

const STATUS_CONTAM_QUOTA = new Set([
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
])

export function limiteIndisponivelNaTwilio(raw: string | null | undefined): boolean {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
  return s === "unavailable" || s === "indisponível" || s === "indisponivel" || s === "n/a"
}

/** Converte texto Twilio/Meta ("250 Customers/24hr", "10K Customers/24hr") em número. */
export function parseMessagingLimitMax(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (s.includes("unlimited") || s.includes("ilimitad")) return null
  if (limiteIndisponivelNaTwilio(raw)) return null

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

function senderEstaOnline(row: TwilioSenderApiRow | null | undefined): boolean {
  return String(row?.status || "").toUpperCase() === "ONLINE"
}

/** Evita usar senders[0] quando for sandbox OFFLINE e existir número de produção ONLINE. */
export function escolherSenderWhatsAppTwilio(
  senders: TwilioSenderApiRow[],
  whatsappFrom: string
): { row: TwilioSenderApiRow | null; aviso: string | null } {
  if (senders.length === 0) return { row: null, aviso: null }

  const alvo = whatsappFrom.toLowerCase()
  const digitsAlvo = alvo.replace(/\D/g, "")

  const exato = senders.find((s) => String(s.sender_id || "").toLowerCase() === alvo)
  if (exato) return { row: exato, aviso: null }

  const porSufixo = senders.find((s) =>
    String(s.sender_id || "")
      .replace(/\D/g, "")
      .endsWith(digitsAlvo.slice(-11))
  )
  if (porSufixo) return { row: porSufixo, aviso: null }

  const online = senders.filter((s) => senderEstaOnline(s))
  const producao =
    online.find((s) => !String(s.sender_id || "").includes("14155238886")) || online[0] || null

  if (producao) {
    return {
      row: producao,
      aviso: `TWILIO_WHATSAPP_NUMBER (${whatsappFrom}) não bate com nenhum sender na Twilio. Painel usa ${producao.sender_id}. Defina TWILIO_WHATSAPP_NUMBER ou TWILIO_WHATSAPP_SENDER_SID para o número verificado.`,
    }
  }

  return { row: senders[0], aviso: null }
}

export async function consultarSenderWhatsAppTwilio(): Promise<{
  sender: WhatsAppSenderLimitInfo
  aviso_configuracao: string | null
  whatsapp_from_env: string
}> {
  const cfg = getTwilioConfig()
  const senderSidEnv = process.env.TWILIO_WHATSAPP_SENDER_SID?.trim()

  if (senderSidEnv) {
    const row = await buscarSenderTwilioPorSid(senderSidEnv)
    if (row) {
      let aviso: string | null = null
      const envNorm = cfg.whatsappFrom.toLowerCase()
      const rowNorm = String(row.sender_id || "").toLowerCase()
      if (rowNorm && envNorm !== rowNorm) {
        aviso = `TWILIO_WHATSAPP_SENDER_SID aponta para ${row.sender_id}, mas TWILIO_WHATSAPP_NUMBER é ${cfg.whatsappFrom}. Os envios usam o número do .env — alinhe as variáveis.`
      }
      return { sender: mapearSender(row), aviso_configuracao: aviso, whatsapp_from_env: cfg.whatsappFrom }
    }
  }

  const senders = await listarSendersTwilio()
  const { row, aviso } = escolherSenderWhatsAppTwilio(senders, cfg.whatsappFrom)

  return {
    sender: mapearSender(row),
    aviso_configuracao: aviso,
    whatsapp_from_env: cfg.whatsappFrom,
  }
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

  let avisoConfiguracao: string | null = null
  let whatsappFromEnv: string | null = null

  try {
    const consulta = await consultarSenderWhatsAppTwilio()
    sender = consulta.sender
    avisoConfiguracao = consulta.aviso_configuracao
    whatsappFromEnv = consulta.whatsapp_from_env
  } catch (err) {
    twilioConfigurado = false
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes("Twilio não configurado")) throw err
  }

  const uso_24h = await contarDestinatariosUnicos24h()
  const max = sender.messaging_limit_max
  const tierIndisponivelTwilio =
    max == null && limiteIndisponivelNaTwilio(sender.messaging_limit_raw)

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

  if (avisoConfiguracao) em_risco = true
  // tier Unavailable sozinho não indica esgotamento — só falta sync Meta→Twilio no painel.

  return {
    sender,
    uso_24h,
    restantes,
    percentual_uso,
    em_risco,
    twilio_configurado: twilioConfigurado,
    tier_indisponivel_twilio: tierIndisponivelTwilio,
    aviso_configuracao: avisoConfiguracao,
    whatsapp_from_env: whatsappFromEnv,
    atualizado_em: new Date().toISOString(),
  }
}
