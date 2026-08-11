import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  WHATSAPP_BILLING_EVENT_LABELS,
  WHATSAPP_BILLING_EVENT_TYPES,
  type WhatsAppBillingEventType,
} from "./event-types"
import {
  STATUS_FALHA_WHATSAPP,
  agregarErrosFrequentes,
  classificarMotivoErroWhatsApp,
  contarFalhasComESemMotivo,
  type ErroFrequenteRelatorio,
  type FalhaRecenteRelatorio,
  type LinhaAgregacaoFalha,
} from "./relatorio-erros"

export type { ErroFrequenteRelatorio, FalhaRecenteRelatorio } from "./relatorio-erros"

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
  error_code: string | null
  titulo_erro: string | null
}

const STATUS_SUCESSO = new Set(["queued", "sent", "delivered", "read"])
const STATUS_FALHA_FILTRO = "__falhas__"

function intervaloIso(de: string, ate: string) {
  return {
    inicio: `${de}T00:00:00.000Z`,
    fim: `${ate}T23:59:59.999Z`,
  }
}

async function carregarLinhasPeriodoParaAgregacao(params: {
  administradoraId: string
  inicio: string
  fim: string
  eventType?: string
  status?: string
}): Promise<LinhaAgregacaoFalha[]> {
  const pageSize = 1000
  const rows: LinhaAgregacaoFalha[] = []
  let offset = 0

  for (;;) {
    let query = supabaseAdmin
      .from("whatsapp_messages")
      .select("event_type, status, error_message, error_code, failed_at, created_at")
      .eq("administradora_id", params.administradoraId)
      .gte("created_at", params.inicio)
      .lte("created_at", params.fim)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (params.eventType) query = query.eq("event_type", params.eventType)
    if (params.status === STATUS_FALHA_FILTRO) {
      query = query.in("status", [...STATUS_FALHA_WHATSAPP])
    } else if (params.status) {
      query = query.eq("status", params.status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    const chunk = data || []
    rows.push(...chunk)
    if (chunk.length < pageSize) break
    offset += pageSize
    if (offset > 50000) break
  }

  return rows
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
      "id, fatura_id, cliente_administradora_id, event_type, telefone, status, reference_date, created_at, sent_at, delivered_at, read_at, failed_at, error_message, error_code",
      { count: "exact" }
    )
    .eq("administradora_id", params.administradoraId)
    .gte("created_at", inicio)
    .lte("created_at", fim)
    .order("created_at", { ascending: false })

  if (params.eventType) query = query.eq("event_type", params.eventType)
  if (params.status === STATUS_FALHA_FILTRO) {
    query = query.in("status", [...STATUS_FALHA_WHATSAPP])
  } else if (params.status) {
    query = query.eq("status", params.status)
  }

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

  const linhasAgregacao = await carregarLinhasPeriodoParaAgregacao({
    administradoraId: params.administradoraId,
    inicio,
    fim,
    eventType: params.eventType,
    status: params.status,
  })

  const porStatus: Record<string, number> = {}
  const porEvento: Record<string, { total: number; sucesso: number; falha: number }> = {}

  for (const row of linhasAgregacao) {
    const st = String(row.status || "pending")
    porStatus[st] = (porStatus[st] || 0) + 1

    const ev = String(row.event_type || "outro")
    if (!porEvento[ev]) porEvento[ev] = { total: 0, sucesso: 0, falha: 0 }
    porEvento[ev].total++
    if (STATUS_SUCESSO.has(st)) porEvento[ev].sucesso++
    if (STATUS_FALHA_WHATSAPP.has(st)) porEvento[ev].falha++
  }

  const totalPeriodo = linhasAgregacao.length
  const totalSucesso = linhasAgregacao.filter((r) => STATUS_SUCESSO.has(String(r.status))).length
  const totalFalha = linhasAgregacao.filter((r) => STATUS_FALHA_WHATSAPP.has(String(r.status))).length
  const totalPendente = totalPeriodo - totalSucesso - totalFalha
  const { comMotivo, semMotivo } = contarFalhasComESemMotivo(linhasAgregacao)
  const errosFrequentes = agregarErrosFrequentes(linhasAgregacao, totalFalha)

  const porEventoLista = WHATSAPP_BILLING_EVENT_TYPES.map((eventType) => ({
    event_type: eventType,
    event_label: WHATSAPP_BILLING_EVENT_LABELS[eventType],
    total: porEvento[eventType]?.total || 0,
    sucesso: porEvento[eventType]?.sucesso || 0,
    falha: porEvento[eventType]?.falha || 0,
  })).filter((e) => e.total > 0)

  const mensagens: MensagemRelatorioRow[] = (data || []).map((m) => {
    const cls = classificarMotivoErroWhatsApp({
      error_message: m.error_message,
      error_code: m.error_code,
      status: m.status,
    })
    return {
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
      error_code: m.error_code,
      titulo_erro: STATUS_FALHA_WHATSAPP.has(String(m.status)) ? cls.titulo : null,
    }
  })

  let falhasRecentesQuery = supabaseAdmin
    .from("whatsapp_messages")
    .select(
      "id, cliente_administradora_id, event_type, telefone, status, created_at, failed_at, error_message, error_code"
    )
    .eq("administradora_id", params.administradoraId)
    .gte("created_at", inicio)
    .lte("created_at", fim)
    .in("status", [...STATUS_FALHA_WHATSAPP])
    .order("failed_at", { ascending: false, nullsFirst: false })
    .limit(12)

  if (params.eventType) falhasRecentesQuery = falhasRecentesQuery.eq("event_type", params.eventType)

  const { data: falhasRecentesRaw } = await falhasRecentesQuery

  const falhasClienteIds = Array.from(
    new Set((falhasRecentesRaw || []).map((m) => m.cliente_administradora_id).filter(Boolean))
  )
  const nomesFalhas: Record<string, string> = { ...nomesClientes }
  const idsNovos = falhasClienteIds.filter((id) => !nomesFalhas[id])
  if (idsNovos.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, cliente_nome")
      .eq("administradora_id", params.administradoraId)
      .in("cliente_administradora_id", idsNovos.slice(0, 500))
    for (const row of rows || []) {
      if (row.cliente_administradora_id && row.cliente_nome) {
        nomesFalhas[row.cliente_administradora_id] = row.cliente_nome
      }
    }
  }

  const falhasRecentes: FalhaRecenteRelatorio[] = (falhasRecentesRaw || []).map((m) => {
    const cls = classificarMotivoErroWhatsApp({
      error_message: m.error_message,
      error_code: m.error_code,
      status: m.status,
    })
    return {
      id: m.id,
      created_at: m.created_at,
      failed_at: m.failed_at,
      event_type: m.event_type,
      event_label:
        WHATSAPP_BILLING_EVENT_LABELS[m.event_type as WhatsAppBillingEventType] || m.event_type,
      status: m.status,
      error_code: m.error_code,
      titulo_erro: cls.titulo,
      mensagem: cls.mensagem,
      cliente_nome: nomesFalhas[m.cliente_administradora_id] || null,
      telefone_mascara: String(m.telefone || "").replace(/\d(?=\d{4})/g, "*"),
    }
  })

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
    falhas_resumo: {
      total: totalFalha,
      com_motivo: comMotivo,
      sem_motivo: semMotivo,
    },
    erros_frequentes: errosFrequentes,
    falhas_recentes: falhasRecentes,
    mensagens,
    page,
    limit,
    total: count ?? 0,
    total_pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  }
}
