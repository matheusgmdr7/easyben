import { reenfileirarMensagensWhatsAppFalhas } from "./requeue-failed"

const HORAS_JANELA_RECUPERACAO = 72

export async function executarCronRecuperacaoWhatsApp(options?: {
  dryRun?: boolean
  maxMessages?: number
}) {
  const failedFrom = new Date(Date.now() - HORAS_JANELA_RECUPERACAO * 60 * 60 * 1000).toISOString()

  return reenfileirarMensagensWhatsAppFalhas({
    failedFrom,
    dryRun: options?.dryRun,
    maxMessages: options?.maxMessages ?? 200,
    recoverySuffix: `recovery:cron:${Date.now()}`,
  })
}
