import { supabaseAdmin } from "@/lib/supabase-admin"
import { criarLembreteDispatchCache } from "./dispatch"
import { whatsappBillingLog } from "./logger"
import { WHATSAPP_CATCHUP_FATURAS_POR_LOTE } from "./rate-limit-policy"
import { REGRAS_LEMBRETE_COBRANCA, vencimentoAlvoParaEvento } from "./reminder-rules"
import { referenceDateHoje } from "./idempotency"
import { processarLembretesPendentes } from "./reminders-pending"
import type { WhatsAppBillingEventType } from "./event-types"

const PRIORIDADE_CATCHUP: Partial<Record<WhatsAppBillingEventType, number>> = {
  aviso_d0: 0,
  aviso_d1: 1,
  lembrete_d5: 2,
  cobranca_d3: 3,
  cobranca_d7: 4,
  cobranca_d15: 5,
  cobranca_d25: 6,
}

export type ResultadoCatchupLembretes = {
  data_referencia: string
  total_enfileirados: number
  total_ignorados: number
  total_pendentes_estimado: number
  por_evento: Array<{
    eventType: WhatsAppBillingEventType
    vencimento_alvo: string
    enfileirados: number
    ignorados: number
    pendentes_apos_run: number
    motivos_ignorados: Record<string, number>
  }>
}

function eventoAtivo(settings: { eventos_ativos?: Record<string, boolean> } | null, eventType: string) {
  const eventos = settings?.eventos_ativos || {}
  return eventos[eventType] !== false
}

function regrasCatchupOrdenadas() {
  return [...REGRAS_LEMBRETE_COBRANCA].sort(
    (a, b) => (PRIORIDADE_CATCHUP[a.eventType] ?? 9) - (PRIORIDADE_CATCHUP[b.eventType] ?? 9)
  )
}

/**
 * Catch-up: enfileira lembretes sem envio bem-sucedido no dia (todos os eventos D-5…D+25).
 * Roda a cada 15 min (08h–18h45 BRT) para cobrir backlog além do cron matinal.
 */
export async function executarCronCatchupLembretesVencimento(options?: {
  hoje?: string
  maxPorEvento?: number
}): Promise<ResultadoCatchupLembretes> {
  const hoje = options?.hoje || referenceDateHoje()
  const maxPorEvento = options?.maxPorEvento ?? WHATSAPP_CATCHUP_FATURAS_POR_LOTE
  const ctx = criarLembreteDispatchCache()

  let totalEnfileirados = 0
  let totalIgnorados = 0
  let totalPendentesEstimado = 0
  const porEvento: ResultadoCatchupLembretes["por_evento"] = []

  const { data: settingsRows } = await supabaseAdmin
    .from("billing_notification_settings")
    .select("administradora_id, whatsapp_automatico_ativo, eventos_ativos")
    .eq("whatsapp_automatico_ativo", true)

  for (const regra of regrasCatchupOrdenadas()) {
    const vencimentoAlvo = vencimentoAlvoParaEvento(regra.dayOffset, hoje)
    let enfileiradosEvento = 0
    let ignoradosEvento = 0
    let pendentesEvento = 0
    const motivosEvento: Record<string, number> = {}

    for (const settings of settingsRows || []) {
      if (enfileiradosEvento >= maxPorEvento) break

      const admId = String(settings.administradora_id)
      if (!eventoAtivo(settings, regra.eventType)) continue

      const restante = maxPorEvento - enfileiradosEvento
      const resultado = await processarLembretesPendentes({
        administradoraId: admId,
        eventType: regra.eventType,
        vencimentoAlvo,
        referenceDate: hoje,
        maxEnfileirar: restante,
        ctx,
      })

      enfileiradosEvento += resultado.enfileirados
      ignoradosEvento += resultado.ignorados
      pendentesEvento += resultado.pendentes_restantes

      for (const [k, v] of Object.entries(resultado.motivos_ignorados)) {
        motivosEvento[k] = (motivosEvento[k] || 0) + v
      }
    }

    totalEnfileirados += enfileiradosEvento
    totalIgnorados += ignoradosEvento
    totalPendentesEstimado += pendentesEvento

    porEvento.push({
      eventType: regra.eventType,
      vencimento_alvo: vencimentoAlvo,
      enfileirados: enfileiradosEvento,
      ignorados: ignoradosEvento,
      pendentes_apos_run: pendentesEvento,
      motivos_ignorados: motivosEvento,
    })
  }

  whatsappBillingLog.info("cron.catchup.done", {
    totalEnfileirados,
    totalIgnorados,
    totalPendentesEstimado,
  })

  return {
    data_referencia: hoje,
    total_enfileirados: totalEnfileirados,
    total_ignorados: totalIgnorados,
    total_pendentes_estimado: totalPendentesEstimado,
    por_evento: porEvento,
  }
}
