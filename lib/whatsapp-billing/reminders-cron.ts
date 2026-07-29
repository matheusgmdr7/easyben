import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  dispararLembreteFatura,
  type FaturaLembreteRow,
} from "./dispatch"
import {
  REGRAS_LEMBRETE_COBRANCA,
  faturaElegivelLembrete,
  horarioEnvioPermitido,
  vencimentoAlvoParaEvento,
} from "./reminder-rules"
import { referenceDateHoje } from "./idempotency"
import { whatsappBillingLog } from "./logger"
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
}

export type ResultadoCronLembretes = {
  data_referencia: string
  administradoras_processadas: number
  total_enfileirados: number
  total_ignorados: number
  total_erros: number
  por_evento: ResumoEvento[]
  por_administradora: ResumoAdministradora[]
}

function eventoAtivo(settings: { eventos_ativos?: Record<string, boolean> } | null, eventType: string) {
  const eventos = settings?.eventos_ativos || {}
  return eventos[eventType] !== false
}

export async function executarCronLembretesWhatsApp(options?: {
  hoje?: string
  ignorarHorario?: boolean
}): Promise<ResultadoCronLembretes> {
  const hoje = options?.hoje || referenceDateHoje()
  const porEvento: ResumoEvento[] = []
  const porAdministradora = new Map<string, ResumoAdministradora>()

  let totalEnfileirados = 0
  let totalIgnorados = 0
  let totalErros = 0

  const { data: settingsRows, error: settingsErr } = await supabaseAdmin
    .from("billing_notification_settings")
    .select("administradora_id, whatsapp_automatico_ativo, horario_envio, eventos_ativos")
    .eq("whatsapp_automatico_ativo", true)

  if (settingsErr) {
    throw new Error(`Erro ao carregar settings: ${settingsErr.message}`)
  }

  const administradorasAtivas = settingsRows || []

  for (const regra of REGRAS_LEMBRETE_COBRANCA) {
    const vencimentoAlvo = vencimentoAlvoParaEvento(regra.dayOffset, hoje)
    const resumoEvento: ResumoEvento = {
      eventType: regra.eventType,
      vencimento_alvo: vencimentoAlvo,
      enfileirados: 0,
      ignorados: 0,
    }

    for (const settings of administradorasAtivas) {
      const admId = String(settings.administradora_id)

      if (!eventoAtivo(settings, regra.eventType)) {
        resumoEvento.ignorados++
        totalIgnorados++
        continue
      }

      if (!options?.ignorarHorario && !horarioEnvioPermitido(settings.horario_envio)) {
        resumoEvento.ignorados++
        totalIgnorados++
        continue
      }

      const { data: faturas, error: fatErr } = await supabaseAdmin
        .from("faturas")
        .select(FATURA_SELECT)
        .eq("administradora_id", admId)
        .eq("vencimento", vencimentoAlvo)
        .in("status", ["pendente", "atrasada"])

      if (fatErr) {
        whatsappBillingLog.error("cron.lembretes.query_error", {
          administradoraId: admId,
          eventType: regra.eventType,
          message: fatErr.message,
        })
        totalErros++
        continue
      }

      for (const row of faturas || []) {
        if (!faturaElegivelLembrete(row.status)) {
          resumoEvento.ignorados++
          totalIgnorados++
          continue
        }

        try {
          const result = await dispararLembreteFatura(row as FaturaLembreteRow, regra.eventType)
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
            resumoEvento.ignorados++
            totalIgnorados++
            admResumo.ignorados++
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
    administradoras_processadas: administradorasAtivas.length,
    total_enfileirados: totalEnfileirados,
    total_ignorados: totalIgnorados,
    total_erros: totalErros,
    por_evento: porEvento,
    por_administradora: Array.from(porAdministradora.values()),
  }
}
