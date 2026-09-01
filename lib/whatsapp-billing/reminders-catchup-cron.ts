import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  criarLembreteDispatchCache,
  dispararLembreteFatura,
  type FaturaLembreteRow,
} from "./dispatch"
import { montarIdempotencyKey, referenceDateHoje } from "./idempotency"
import { whatsappBillingLog } from "./logger"
import {
  WHATSAPP_CATCHUP_FATURAS_POR_LOTE,
  WHATSAPP_LEMBRETE_STAGGER_MS,
} from "./rate-limit-policy"
import { vencimentoAlvoParaEvento } from "./reminder-rules"
import type { WhatsAppBillingEventType } from "./event-types"

const FATURA_SELECT =
  "id, cliente_administradora_id, administradora_id, cliente_nome, cliente_telefone, valor, vencimento, numero_fatura, status, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id"

const EVENTOS_CATCHUP: WhatsAppBillingEventType[] = ["aviso_d0", "aviso_d1"]

const STATUS_SUCESSO = new Set(["queued", "sent", "delivered", "read"])

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
  }>
}

function eventoAtivo(settings: { eventos_ativos?: Record<string, boolean> } | null, eventType: string) {
  const eventos = settings?.eventos_ativos || {}
  return eventos[eventType] !== false
}

async function faturasComEnvioSucesso(
  eventType: WhatsAppBillingEventType,
  referenceDate: string,
  faturaIds: string[]
): Promise<Set<string>> {
  const ok = new Set<string>()
  if (!faturaIds.length) return ok

  const CHUNK = 200
  for (let i = 0; i < faturaIds.length; i += CHUNK) {
    const chunk = faturaIds.slice(i, i + CHUNK)
    const { data } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("fatura_id, status")
      .eq("event_type", eventType)
      .eq("reference_date", referenceDate)
      .in("fatura_id", chunk)
      .in("status", [...STATUS_SUCESSO])

    for (const row of data || []) {
      if (row.fatura_id) ok.add(String(row.fatura_id))
    }
  }
  return ok
}

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

  for (const eventType of EVENTOS_CATCHUP) {
    const dayOffset = eventType === "aviso_d0" ? 0 : 1
    const vencimentoAlvo = vencimentoAlvoParaEvento(dayOffset, hoje)
    let enfileirados = 0
    let ignorados = 0
    let pendentesAposRun = 0
    let staggerGlobal = 0

    for (const settings of settingsRows || []) {
      if (enfileirados >= maxPorEvento) break

      const admId = String(settings.administradora_id)
      if (!eventoAtivo(settings, eventType)) continue

      const { data: faturas, error } = await supabaseAdmin
        .from("faturas")
        .select(FATURA_SELECT)
        .eq("administradora_id", admId)
        .eq("vencimento", vencimentoAlvo)
        .in("status", ["pendente", "atrasada", "vencida"])
        .order("id", { ascending: true })
        .limit(600)

      if (error) {
        whatsappBillingLog.error("cron.catchup.query_error", {
          administradoraId: admId,
          eventType,
          message: error.message,
        })
        continue
      }

      const lista = (faturas || []) as FaturaLembreteRow[]
      const ids = lista.map((f) => String(f.id))
      const jaEnviadas = await faturasComEnvioSucesso(eventType, hoje, ids)

      for (const row of lista) {
        if (enfileirados >= maxPorEvento) {
          if (!jaEnviadas.has(String(row.id))) pendentesAposRun++
          continue
        }

        if (!row.cliente_administradora_id) {
          ignorados++
          continue
        }

        if (jaEnviadas.has(String(row.id))) {
          ignorados++
          continue
        }

        const idempotencyKey = montarIdempotencyKey({
          eventType,
          clienteId: row.cliente_administradora_id,
          referenceDate: hoje,
          faturaId: row.id,
        })

        const { data: existente } = await supabaseAdmin
          .from("whatsapp_messages")
          .select("status")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle()

        if (existente && STATUS_SUCESSO.has(String(existente.status))) {
          ignorados++
          continue
        }

        try {
          const delayMs = staggerGlobal * WHATSAPP_LEMBRETE_STAGGER_MS
          staggerGlobal++

          const result = await dispararLembreteFatura(row, eventType, {
            delayMs,
            ctx,
          })

          if (result.enqueued) {
            enfileirados++
            totalEnfileirados++
          } else {
            ignorados++
            totalIgnorados++
          }
        } catch (err: unknown) {
          ignorados++
          totalIgnorados++
          whatsappBillingLog.error("cron.catchup.dispatch_error", {
            faturaId: row.id,
            eventType,
            message: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    totalPendentesEstimado += pendentesAposRun
    porEvento.push({
      eventType,
      vencimento_alvo: vencimentoAlvo,
      enfileirados,
      ignorados,
      pendentes_apos_run: pendentesAposRun,
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
