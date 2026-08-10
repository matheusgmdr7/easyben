import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  WHATSAPP_BILLING_EVENT_LABELS,
  WHATSAPP_BILLING_EVENT_TYPES,
  type WhatsAppBillingEventType,
} from "./event-types"

export type RelatorioEnviosParams = {
  administradoraId: string
  de: string
  ate: string
  eventType?: string
  status?: string
  page?: number
  limit?: number
}

export type MensagemRelatorioRow = {
  id: string
  fatura_id: string | null
  cliente_administradora_id: string
  cliente_nome: string | null
  event_type: string
  event_label: string
  telefone_mascara: string
  status: string
  reference_date: string
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at: string | null
  error_message: string | null
}

const STATUS_SUCESSO = new Set(["queued", "sent", "delivered", "read"])
const STATUS_FALHA = new Set(["failed", "failed_permanent", "undelivered"])

function intervaloIso(de: string, ate: string) {
  return {
    inicio: `${de}T00:00:00.000Z`,
    fim: `${ate}T23:59:59.999Z`,
  }
}

export async function montarRelatorioEnviosWhatsApp(params: RelatorioEnviosParams) {
  const de = String(params.de).slice(0, 10)
  const ate = String(params.ate).slice(0, 10)
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 25))
  const offset = (page - 1) * limit
  const { inicio, fim } = intervaloIso(de, ate)

  let query = supabaseAdmin
    .from("whatsapp_messages")
    .select(
      "id, fatura_id, cliente_administradora_id, event_type, telefone, status, reference_date, created_at, sent_at, delivered_at, read_at, failed_at, error_message",
      { count: "exact" }
    )
    .eq("administradora_id", params.administradoraId)
    .gte("created_at", inicio)
    .lte("created_at", fim)
    .order("created_at", { ascending: false })

  if (params.eventType) query = query.eq("event_type", params.eventType)
  if (params.status) query = query.eq("status", params.status)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) throw new Error(error.message)

  const clienteIds = Array.from(
    new Set((data || []).map((m) => m.cliente_administradora_id).filter(Boolean))
  )

  const nomesClientes: Record<string, string> = {}
  if (clienteIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, cliente_nome")
      .eq("administradora_id", params.administradoraId)
      .in("cliente_administradora_id", clienteIds.slice(0, 500))

    for (const row of rows || []) {
      if (row.cliente_administradora_id && row.cliente_nome) {
        nomesClientes[row.cliente_administradora_id] = row.cliente_nome
      }
    }
  }

  const { data: todasNoPeriodo } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("event_type, status, error_message")
    .eq("administradora_id", params.administradoraId)
    .gte("created_at", inicio)
    .lte("created_at", fim)
    .limit(10000)

  const porStatus: Record<string, number> = {}
  const porEvento: Record<string, { total: number; sucesso: number; falha: number }> = {}
  const errosAgrupados: Record<string, number> = {}

  for (const row of todasNoPeriodo || []) {
    const st = String(row.status || "pending")
    porStatus[st] = (porStatus[st] || 0) + 1

    const ev = String(row.event_type || "outro")
    if (!porEvento[ev]) porEvento[ev] = { total: 0, sucesso: 0, falha: 0 }
    porEvento[ev].total++
    if (STATUS_SUCESSO.has(st)) porEvento[ev].sucesso++
    if (STATUS_FALHA.has(st)) porEvento[ev].falha++

    if (STATUS_FALHA.has(st) && row.error_message) {
      const chave = String(row.error_message).slice(0, 120)
      errosAgrupados[chave] = (errosAgrupados[chave] || 0) + 1
    }
  }

  const totalPeriodo = (todasNoPeriodo || []).length
  const totalSucesso = (todasNoPeriodo || []).filter((r) => STATUS_SUCESSO.has(String(r.status))).length
  const totalFalha = (todasNoPeriodo || []).filter((r) => STATUS_FALHA.has(String(r.status))).length
  const totalPendente = totalPeriodo - totalSucesso - totalFalha

  const porEventoLista = WHATSAPP_BILLING_EVENT_TYPES.map((eventType) => ({
    event_type: eventType,
    event_label: WHATSAPP_BILLING_EVENT_LABELS[eventType],
    total: porEvento[eventType]?.total || 0,
    sucesso: porEvento[eventType]?.sucesso || 0,
    falha: porEvento[eventType]?.falha || 0,
  })).filter((e) => e.total > 0)

  const mensagens: MensagemRelatorioRow[] = (data || []).map((m) => ({
    id: m.id,
    fatura_id: m.fatura_id,
    cliente_administradora_id: m.cliente_administradora_id,
    cliente_nome: nomesClientes[m.cliente_administradora_id] || null,
    event_type: m.event_type,
    event_label:
      WHATSAPP_BILLING_EVENT_LABELS[m.event_type as WhatsAppBillingEventType] || m.event_type,
    telefone_mascara: String(m.telefone || "").replace(/\d(?=\d{4})/g, "*"),
    status: m.status,
    reference_date: m.reference_date,
    created_at: m.created_at,
    sent_at: m.sent_at,
    delivered_at: m.delivered_at,
    read_at: m.read_at,
    failed_at: m.failed_at,
    error_message: m.error_message,
  }))

  return {
    periodo: { de, ate },
    resumo: {
      total: totalPeriodo,
      sucesso: totalSucesso,
      falha: totalFalha,
      pendente: totalPendente,
    },
    por_status: porStatus,
    por_evento: porEventoLista,
    erros_frequentes: Object.entries(errosAgrupados)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([mensagem, qtd]) => ({ mensagem, qtd })),
    mensagens,
    page,
    limit,
    total: count ?? 0,
    total_pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  }
}
