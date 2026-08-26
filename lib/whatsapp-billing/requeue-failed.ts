import { supabaseAdmin } from "@/lib/supabase-admin"
import type { WhatsAppBillingEventType } from "./event-types"
import { enfileirarNotificacaoOutbound } from "./queues"
import { WHATSAPP_RECOVERY_ERROR_CODES, WHATSAPP_RECOVERY_STAGGER_MS } from "./rate-limit-policy"
import { whatsappBillingLog } from "./logger"

export type ReenfileirarFalhasOptions = {
  /** Datas de reference_date (YYYY-MM-DD), inclusive. */
  referenceDates?: string[]
  /** Intervalo de failed_at (ISO). */
  failedFrom?: string
  failedTo?: string
  /** Intervalo de created_at (ISO) — útil para undelivered sem failed_at preenchido cedo. */
  createdFrom?: string
  createdTo?: string
  errorCodes?: string[]
  dryRun?: boolean
  maxMessages?: number
  staggerMs?: number
  recoverySuffix?: string
}

export type ReenfileirarFalhasResultado = {
  total: number
  enqueued: number
  skipped: number
  dryRun: boolean
  errors: string[]
  amostra: Array<{
    id: string
    event_type: string
    error_code: string | null
    failed_at: string | null
    reference_date: string
  }>
}

export async function reenfileirarMensagensWhatsAppFalhas(
  options: ReenfileirarFalhasOptions = {}
): Promise<ReenfileirarFalhasResultado> {
  const errorCodes = options.errorCodes?.length
    ? options.errorCodes
    : [...WHATSAPP_RECOVERY_ERROR_CODES]
  const staggerMs = options.staggerMs ?? WHATSAPP_RECOVERY_STAGGER_MS
  const maxMessages = options.maxMessages ?? 500
  const recoverySuffix = options.recoverySuffix ?? `recovery:${Date.now()}`
  const dryRun = Boolean(options.dryRun)

  const STATUS_REENFILEIRAVEL = ["failed", "failed_permanent", "undelivered"]

  let query = supabaseAdmin
    .from("whatsapp_messages")
    .select(
      "id, idempotency_key, administradora_id, cliente_administradora_id, telefone, event_type, reference_date, fatura_id, content_variables, status, error_code, failed_at, created_at"
    )
    .in("status", STATUS_REENFILEIRAVEL)
    .in("error_code", errorCodes)
    .order("created_at", { ascending: true })
    .limit(maxMessages)

  if (options.referenceDates?.length) {
    query = query.in("reference_date", options.referenceDates)
  }
  if (options.failedFrom) {
    query = query.gte("failed_at", options.failedFrom)
  }
  if (options.failedTo) {
    query = query.lte("failed_at", options.failedTo)
  }
  if (options.createdFrom) {
    query = query.gte("created_at", options.createdFrom)
  }
  if (options.createdTo) {
    query = query.lte("created_at", options.createdTo)
  }

  const { data: rows, error } = await query
  if (error) throw new Error(`Erro ao buscar falhas: ${error.message}`)

  const lista = rows ?? []
  const resultado: ReenfileirarFalhasResultado = {
    total: lista.length,
    enqueued: 0,
    skipped: 0,
    dryRun,
    errors: [],
    amostra: lista.slice(0, 10).map((row) => ({
      id: row.id,
      event_type: row.event_type,
      error_code: row.error_code,
      failed_at: row.failed_at,
      reference_date: row.reference_date,
    })),
  }

  for (let i = 0; i < lista.length; i++) {
    const row = lista[i]
    const jobId = `${row.idempotency_key}:${recoverySuffix}`
    const delayMs = i * staggerMs

    if (dryRun) {
      resultado.enqueued++
      continue
    }

    try {
      await enfileirarNotificacaoOutbound(
        {
          clienteId: row.cliente_administradora_id,
          administradoraId: row.administradora_id,
          telefone: row.telefone,
          eventType: row.event_type as WhatsAppBillingEventType,
          faturaId: row.fatura_id,
          referenceDate: row.reference_date,
          variaveis: (row.content_variables || {}) as Record<string, string>,
        },
        jobId,
        { delayMs }
      )
      resultado.enqueued++
    } catch (err: unknown) {
      resultado.skipped++
      const msg = err instanceof Error ? err.message : String(err)
      resultado.errors.push(`${row.id}: ${msg}`)
      whatsappBillingLog.warn("requeue.failed", { messageId: row.id, message: msg })
    }
  }

  whatsappBillingLog.info("requeue.done", {
    total: resultado.total,
    enqueued: resultado.enqueued,
    skipped: resultado.skipped,
    dryRun,
  })

  return resultado
}
