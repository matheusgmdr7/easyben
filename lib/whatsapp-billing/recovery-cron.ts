import { supabaseAdmin } from "@/lib/supabase-admin"
import { referenceDateHoje } from "./idempotency"
import { reenfileirarMensagensWhatsAppFalhas, type ReenfileirarFalhasResultado } from "./requeue-failed"
import { WHATSAPP_RECOVERY_MAX_MESSAGES } from "./rate-limit-policy"

const HORAS_JANELA_RECUPERACAO = 24 * 7

const EVENTOS_PRIORITARIOS = ["aviso_d0", "aviso_d1", "lembrete_d5"] as const

const EVENTOS_CICLO = [
  "saudacao_boas_vindas",
  "primeiro_boleto_gerado",
  "aviso_d1",
  "aviso_d0",
  "cobranca_d3",
  "cobranca_d7",
  "cobranca_d15",
  "cobranca_d25",
] as const

const CODIGOS_REENVIO_CICLO = ["63017", "63018", "20429", "20003"]

/** Do dia 20 em diante o ciclo é o mês seguinte (boletos já gerados). Antes disso, o mês corrente. */
export function periodoCicloCobranca(hoje: string): { inicio: string; fim: string } {
  const [ys, ms, ds] = hoje.split("-")
  let ano = Number(ys)
  let mes = Number(ms)
  const dia = Number(ds)
  if (dia >= 20) {
    mes += 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
  }
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`
  let mesFim = mes + 1
  let anoFim = ano
  if (mesFim > 12) {
    mesFim = 1
    anoFim += 1
  }
  return { inicio, fim: `${anoFim}-${String(mesFim).padStart(2, "0")}-01` }
}

async function faturasDoCiclo(hoje: string): Promise<string[]> {
  const { inicio, fim } = periodoCicloCobranca(hoje)
  const ids: string[] = []
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("faturas")
      .select("id")
      .gte("vencimento", inicio)
      .lt("vencimento", fim)
      .order("id", { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    const chunk = data || []
    for (const row of chunk) ids.push(String(row.id))
    if (chunk.length < 1000) break
  }
  return ids
}

async function reenfileirarFalhasDoCiclo(params: {
  dryRun?: boolean
  maxMessages: number
  recoverySuffix: string
}): Promise<ReenfileirarFalhasResultado> {
  const vazio: ReenfileirarFalhasResultado = {
    total: 0,
    enqueued: 0,
    skipped: 0,
    dryRun: Boolean(params.dryRun),
    errors: [],
    amostra: [],
  }
  if (params.maxMessages <= 0) return vazio

  const faturaIds = await faturasDoCiclo(referenceDateHoje())
  const createdFrom = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  let enqueued = 0
  let skipped = 0
  let total = 0
  const errors: string[] = []

  for (let i = 0; i < faturaIds.length && enqueued < params.maxMessages; i += 80) {
    const lote = faturaIds.slice(i, i + 80)
    const resultado = await reenfileirarMensagensWhatsAppFalhas({
      faturaIds: lote,
      eventTypesPrioritarios: [...EVENTOS_CICLO],
      errorCodes: CODIGOS_REENVIO_CICLO,
      maxTentativas: 4,
      maxMessages: params.maxMessages - enqueued,
      dryRun: params.dryRun,
      recoverySuffix: `${params.recoverySuffix}:ciclo:${i}`,
      createdFrom,
    })
    enqueued += resultado.enqueued
    skipped += resultado.skipped
    total += resultado.total
    errors.push(...resultado.errors)
  }

  return { ...vazio, total, enqueued, skipped, errors: errors.slice(0, 20) }
}

export async function executarCronRecuperacaoWhatsApp(options?: {
  dryRun?: boolean
  maxMessages?: number
}) {
  const failedFrom = new Date(Date.now() - HORAS_JANELA_RECUPERACAO * 60 * 60 * 1000).toISOString()
  const maxTotal = options?.maxMessages ?? WHATSAPP_RECOVERY_MAX_MESSAGES
  const maxPrioritario = Math.min(400, Math.floor(maxTotal * 0.5))
  const maxRestante = maxTotal - maxPrioritario

  const recoverySuffix = `recovery:cron:${Date.now()}`

  const prioritario = await reenfileirarMensagensWhatsAppFalhas({
    failedFrom,
    dryRun: options?.dryRun,
    maxMessages: maxPrioritario,
    recoverySuffix: `${recoverySuffix}:prio`,
    eventTypesPrioritarios: [...EVENTOS_PRIORITARIOS],
  })

  const restante = await reenfileirarMensagensWhatsAppFalhas({
    failedFrom,
    dryRun: options?.dryRun,
    maxMessages: maxRestante,
    recoverySuffix: `${recoverySuffix}:geral`,
    excluirEventTypes: [...EVENTOS_PRIORITARIOS],
  })

  const ciclo = await reenfileirarFalhasDoCiclo({
    dryRun: options?.dryRun,
    maxMessages: Math.min(400, maxTotal),
    recoverySuffix,
  })

  return {
    prioritario,
    restante,
    ciclo,
    total_enqueued: prioritario.enqueued + restante.enqueued + ciclo.enqueued,
    total_skipped: prioritario.skipped + restante.skipped + ciclo.skipped,
  }
}
