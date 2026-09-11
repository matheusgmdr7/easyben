import { supabaseAdmin } from "@/lib/supabase-admin"
import { criarLembreteDispatchCache } from "./dispatch"
import {
  REGRAS_LEMBRETE_COBRANCA,
  calcularDelayAteHorarioEnvio,
  vencimentoAlvoParaEvento,
} from "./reminder-rules"
import { horarioParaJanela, type JanelaEnvioWhatsApp } from "./horarios-envio"
import { referenceDateHoje } from "./idempotency"
import { whatsappBillingLog } from "./logger"
import {
  WHATSAPP_CATCHUP_FATURAS_POR_LOTE,
  WHATSAPP_CRON_TIME_BUDGET_MS,
} from "./rate-limit-policy"
import { processarLembretesPendentes } from "./reminders-pending"
import type { WhatsAppBillingEventType } from "./event-types"

type ResumoAdministradora = {
  administradora_id: string
  enfileirados: number
  ignorados: number
  erros: number
}

type ResumoEvento = {
  eventType: WhatsAppBillingEventType
  vencimento_alvo: string
  enfileirados: number
  ignorados: number
  pendentes_restantes: number
  motivos_ignorados: Record<string, number>
}

export type ResultadoCronLembretes = {
  data_referencia: string
  janela: JanelaEnvioWhatsApp
  administradoras_processadas: number
  total_enfileirados: number
  total_ignorados: number
  total_erros: number
  motivos_ignorados: Record<string, number>
  por_evento: ResumoEvento[]
  por_administradora: ResumoAdministradora[]
  faturas_restantes_estimado: number
  tempo_ms: number
}

function registrarIgnorado(motivos: Record<string, number>, reason: string | undefined): void {
  const key = reason || "desconhecido"
  motivos[key] = (motivos[key] || 0) + 1
}

function eventoAtivo(settings: { eventos_ativos?: Record<string, boolean> } | null, eventType: string) {
  const eventos = settings?.eventos_ativos || {}
  return eventos[eventType] !== false
}

const PRIORIDADE_REGRA: Partial<Record<WhatsAppBillingEventType, number>> = {
  aviso_d0: 0,
  aviso_d1: 1,
  lembrete_d5: 2,
  cobranca_d3: 3,
  cobranca_d7: 4,
  cobranca_d15: 5,
  cobranca_d25: 6,
}

function regrasOrdenadasPorPrioridade() {
  return [...REGRAS_LEMBRETE_COBRANCA].sort(
    (a, b) => (PRIORIDADE_REGRA[a.eventType] ?? 9) - (PRIORIDADE_REGRA[b.eventType] ?? 9)
  )
}

export async function executarCronLembretesWhatsApp(options?: {
  hoje?: string
  ignorarHorario?: boolean
  janela?: JanelaEnvioWhatsApp
  timeBudgetMs?: number
}): Promise<ResultadoCronLembretes> {
  const inicioMs = Date.now()
  const janela: JanelaEnvioWhatsApp = options?.janela || "manha"
  const hoje = options?.hoje || referenceDateHoje()
  const timeBudgetMs = options?.timeBudgetMs ?? WHATSAPP_CRON_TIME_BUDGET_MS
  const ctx = criarLembreteDispatchCache()
  const porEvento: ResumoEvento[] = []
  const porAdministradora = new Map<string, ResumoAdministradora>()
  const motivosIgnoradosGlobal: Record<string, number> = {}
  let faturasRestantesEstimado = 0

  let totalEnfileirados = 0
  let totalIgnorados = 0
  const totalErros = 0

  const { data: settingsRows, error: settingsErr } = await supabaseAdmin
    .from("billing_notification_settings")
    .select(
      "administradora_id, whatsapp_automatico_ativo, horario_envio, horario_envio_tarde, eventos_ativos"
    )
    .eq("whatsapp_automatico_ativo", true)

  if (settingsErr) {
    throw new Error(`Erro ao carregar settings: ${settingsErr.message}`)
  }

  const administradorasAtivas = settingsRows || []
  const maxPorEventoAdmin =
    janela === "tarde" ? WHATSAPP_CATCHUP_FATURAS_POR_LOTE : WHATSAPP_CATCHUP_FATURAS_POR_LOTE

  for (const regra of regrasOrdenadasPorPrioridade()) {
    if (Date.now() - inicioMs >= timeBudgetMs) {
      whatsappBillingLog.warn("cron.lembretes.time_budget", {
        eventType: regra.eventType,
        elapsedMs: Date.now() - inicioMs,
      })
      break
    }

    const vencimentoAlvo = vencimentoAlvoParaEvento(regra.dayOffset, hoje)
    const resumoEvento: ResumoEvento = {
      eventType: regra.eventType,
      vencimento_alvo: vencimentoAlvo,
      enfileirados: 0,
      ignorados: 0,
      pendentes_restantes: 0,
      motivos_ignorados: {},
    }

    for (const settings of administradorasAtivas) {
      if (Date.now() - inicioMs >= timeBudgetMs) break

      const admId = String(settings.administradora_id)

      if (!eventoAtivo(settings, regra.eventType)) {
        registrarIgnorado(resumoEvento.motivos_ignorados, "evento_desativado")
        registrarIgnorado(motivosIgnoradosGlobal, "evento_desativado")
        resumoEvento.ignorados++
        totalIgnorados++
        continue
      }

      const horarioJanela = horarioParaJanela(settings, janela)
      if (!horarioJanela) {
        registrarIgnorado(resumoEvento.motivos_ignorados, "janela_tarde_desativada")
        registrarIgnorado(motivosIgnoradosGlobal, "janela_tarde_desativada")
        resumoEvento.ignorados++
        totalIgnorados++
        continue
      }

      const delayBase = options?.ignorarHorario ? 0 : calcularDelayAteHorarioEnvio(horarioJanela)

      try {
        const resultado = await processarLembretesPendentes({
          administradoraId: admId,
          eventType: regra.eventType,
          vencimentoAlvo,
          referenceDate: hoje,
          maxEnfileirar: maxPorEventoAdmin,
          ctx,
          /** Tarde e manhã enfileiram pendentes; retentativas de falha ficam a cargo do catch-up/recovery. */
          somenteRetentativa: false,
          staggerInicial: Math.floor(delayBase / 3000),
        })

        resumoEvento.enfileirados += resultado.enfileirados
        resumoEvento.ignorados += resultado.ignorados
        resumoEvento.pendentes_restantes += resultado.pendentes_restantes
        faturasRestantesEstimado += resultado.pendentes_restantes
        totalEnfileirados += resultado.enfileirados
        totalIgnorados += resultado.ignorados

        for (const [k, v] of Object.entries(resultado.motivos_ignorados)) {
          registrarIgnorado(resumoEvento.motivos_ignorados, k)
          motivosIgnoradosGlobal[k] = (motivosIgnoradosGlobal[k] || 0) + v
        }

        const admResumo = porAdministradora.get(admId) || {
          administradora_id: admId,
          enfileirados: 0,
          ignorados: 0,
          erros: 0,
        }
        admResumo.enfileirados += resultado.enfileirados
        admResumo.ignorados += resultado.ignorados
        porAdministradora.set(admId, admResumo)
      } catch (err: unknown) {
        const admResumo = porAdministradora.get(admId) || {
          administradora_id: admId,
          enfileirados: 0,
          ignorados: 0,
          erros: 0,
        }
        admResumo.erros++
        porAdministradora.set(admId, admResumo)
        whatsappBillingLog.error("cron.lembretes.dispatch_error", {
          administradoraId: admId,
          eventType: regra.eventType,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }

    porEvento.push(resumoEvento)
  }

  return {
    data_referencia: hoje,
    janela,
    administradoras_processadas: administradorasAtivas.length,
    total_enfileirados: totalEnfileirados,
    total_ignorados: totalIgnorados,
    total_erros: totalErros,
    motivos_ignorados: motivosIgnoradosGlobal,
    por_evento: porEvento,
    por_administradora: Array.from(porAdministradora.values()),
    faturas_restantes_estimado: faturasRestantesEstimado,
    tempo_ms: Date.now() - inicioMs,
  }
}
