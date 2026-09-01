import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  dispararLembreteFatura,
  criarLembreteDispatchCache,
  type FaturaLembreteRow,
} from "./dispatch"
import {
  REGRAS_LEMBRETE_COBRANCA,
  STATUS_FATURA_LEMBRETE,
  calcularDelayAteHorarioEnvio,
  faturaElegivelLembrete,
  vencimentoAlvoParaEvento,
} from "./reminder-rules"
import { horarioParaJanela, type JanelaEnvioWhatsApp } from "./horarios-envio"
import { referenceDateHoje } from "./idempotency"
import { whatsappBillingLog } from "./logger"
import {
  WHATSAPP_CRON_FATURAS_POR_LOTE,
  WHATSAPP_LEMBRETE_STAGGER_MS,
} from "./rate-limit-policy"
import type { WhatsAppBillingEventType } from "./event-types"

const FATURA_SELECT =
  "id, cliente_administradora_id, administradora_id, cliente_nome, cliente_telefone, valor, vencimento, numero_fatura, status, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id"

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
  /** Faturas não enfileiradas neste run (catch-up completará). */
  faturas_restantes_estimado: number
}

function registrarIgnorado(
  motivos: Record<string, number>,
  reason: string | undefined
): void {
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
}): Promise<ResultadoCronLembretes> {
  const janela: JanelaEnvioWhatsApp = options?.janela || "manha"
  const hoje = options?.hoje || referenceDateHoje()
  const ctx = criarLembreteDispatchCache()
  const porEvento: ResumoEvento[] = []
  const porAdministradora = new Map<string, ResumoAdministradora>()
  const motivosIgnoradosGlobal: Record<string, number> = {}
  let faturasRestantesEstimado = 0

  let totalEnfileirados = 0
  let totalIgnorados = 0
  let totalErros = 0
  let staggerGlobal = 0

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

  for (const regra of regrasOrdenadasPorPrioridade()) {
    const vencimentoAlvo = vencimentoAlvoParaEvento(regra.dayOffset, hoje)
    const resumoEvento: ResumoEvento = {
      eventType: regra.eventType,
      vencimento_alvo: vencimentoAlvo,
      enfileirados: 0,
      ignorados: 0,
      motivos_ignorados: {},
    }

    for (const settings of administradorasAtivas) {
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

      const delayMs = options?.ignorarHorario
        ? 0
        : calcularDelayAteHorarioEnvio(horarioJanela)

      const { data: faturas, error: fatErr } = await supabaseAdmin
        .from("faturas")
        .select(FATURA_SELECT)
        .eq("administradora_id", admId)
        .eq("vencimento", vencimentoAlvo)
        .in("status", [...STATUS_FATURA_LEMBRETE])
        .order("id", { ascending: true })
        .limit(WHATSAPP_CRON_FATURAS_POR_LOTE)

      if (fatErr) {
        whatsappBillingLog.error("cron.lembretes.query_error", {
          administradoraId: admId,
          eventType: regra.eventType,
          message: fatErr.message,
        })
        totalErros++
        continue
      }

      const listaFaturas = faturas || []
      if (listaFaturas.length >= WHATSAPP_CRON_FATURAS_POR_LOTE) {
        faturasRestantesEstimado += WHATSAPP_CRON_FATURAS_POR_LOTE
      }

      for (const row of listaFaturas) {
        if (!faturaElegivelLembrete(row.status)) {
          registrarIgnorado(resumoEvento.motivos_ignorados, "status_nao_elegivel")
          registrarIgnorado(motivosIgnoradosGlobal, "status_nao_elegivel")
          resumoEvento.ignorados++
          totalIgnorados++
          continue
        }

        if (!row.cliente_administradora_id) {
          registrarIgnorado(resumoEvento.motivos_ignorados, "sem_cliente_vinculado")
          registrarIgnorado(motivosIgnoradosGlobal, "sem_cliente_vinculado")
          resumoEvento.ignorados++
          totalIgnorados++
          continue
        }

        try {
          const delayBase = options?.ignorarHorario ? 0 : delayMs
          const delayEscalonado = delayBase + staggerGlobal * WHATSAPP_LEMBRETE_STAGGER_MS
          staggerGlobal++

          const result = await dispararLembreteFatura(row as FaturaLembreteRow, regra.eventType, {
            delayMs: delayEscalonado,
            somenteRetentativa: janela === "tarde",
            ctx,
          })
          const admResumo = porAdministradora.get(admId) || {
            administradora_id: admId,
            enfileirados: 0,
            ignorados: 0,
            erros: 0,
          }

          if (result.enqueued) {
            resumoEvento.enfileirados++
            totalEnfileirados++
            admResumo.enfileirados++
          } else {
            registrarIgnorado(resumoEvento.motivos_ignorados, result.reason)
            registrarIgnorado(motivosIgnoradosGlobal, result.reason)
            resumoEvento.ignorados++
            totalIgnorados++
            admResumo.ignorados++
            whatsappBillingLog.info("cron.lembretes.ignorado", {
              faturaId: row.id,
              eventType: regra.eventType,
              reason: result.reason,
            })
          }

          porAdministradora.set(admId, admResumo)
        } catch (err: unknown) {
          totalErros++
          const admResumo = porAdministradora.get(admId) || {
            administradora_id: admId,
            enfileirados: 0,
            ignorados: 0,
            erros: 0,
          }
          admResumo.erros++
          porAdministradora.set(admId, admResumo)
          whatsappBillingLog.error("cron.lembretes.dispatch_error", {
            faturaId: row.id,
            eventType: regra.eventType,
            message: err instanceof Error ? err.message : String(err),
          })
        }
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
  }
}
