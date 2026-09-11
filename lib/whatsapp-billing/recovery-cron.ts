import { reenfileirarMensagensWhatsAppFalhas } from "./requeue-failed"
import { WHATSAPP_RECOVERY_MAX_MESSAGES } from "./rate-limit-policy"

const HORAS_JANELA_RECUPERACAO = 72

const EVENTOS_PRIORITARIOS = ["aviso_d0", "aviso_d1", "lembrete_d5"] as const

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

  return {
    prioritario,
    restante,
    total_enqueued: prioritario.enqueued + restante.enqueued,
    total_skipped: prioritario.skipped + restante.skipped,
  }
}
