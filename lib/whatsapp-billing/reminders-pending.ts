import { supabaseAdmin } from "@/lib/supabase-admin"
import { carregarTelefonesCobrancaEmLote } from "@/lib/telefone-cliente-cobranca"
import {
  criarLembreteDispatchCache,
  dispararLembreteFatura,
  type FaturaLembreteRow,
  type LembreteDispatchCache,
} from "./dispatch"
import { montarIdempotencyKey } from "./idempotency"
import { dataComOffset } from "./reminder-rules"
import { WHATSAPP_LEMBRETE_STAGGER_MS } from "./rate-limit-policy"
import type { WhatsAppBillingEventType } from "./event-types"

const FATURA_SELECT =
  "id, cliente_administradora_id, administradora_id, cliente_nome, cliente_telefone, valor, vencimento, numero_fatura, status, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id"

export const STATUS_SUCESSO_LEMBRETE = new Set(["queued", "sent", "delivered", "read"])

export async function faturasComEnvioSucesso(
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
      .in("status", [...STATUS_SUCESSO_LEMBRETE])

    for (const row of data || []) {
      if (row.fatura_id) ok.add(String(row.fatura_id))
    }
  }
  return ok
}

export type ProcessarPendentesParams = {
  administradoraId: string
  eventType: WhatsAppBillingEventType
  vencimentoAlvo: string
  referenceDate: string
  maxEnfileirar: number
  ctx?: LembreteDispatchCache
  /** Na janela da tarde: só reenvia quem já tentou e falhou (não quem nunca tentou). */
  somenteRetentativa?: boolean
  staggerInicial?: number
  /** Interrompe a leva quando o cron está no fim do orçamento de tempo. */
  deadlineMs?: number
}

export type ProcessarPendentesResultado = {
  enfileirados: number
  ignorados: number
  pendentes_restantes: number
  motivos_ignorados: Record<string, number>
}

function registrarMotivo(motivos: Record<string, number>, reason?: string) {
  const key = reason || "desconhecido"
  motivos[key] = (motivos[key] || 0) + 1
}

export async function processarLembretesPendentes(
  params: ProcessarPendentesParams
): Promise<ProcessarPendentesResultado> {
  const ctx = params.ctx ?? criarLembreteDispatchCache()
  const motivos: Record<string, number> = {}
  let enfileirados = 0
  let ignorados = 0
  let pendentesRestantes = 0
  let stagger = params.staggerInicial ?? 0

  const fimVencimento = dataComOffset(params.vencimentoAlvo, 1)
  const PAGE = 200
  let from = 0
  let parouNoPrazo = false

  for (;;) {
    if (params.deadlineMs && Date.now() >= params.deadlineMs) {
      parouNoPrazo = true
      break
    }
    if (enfileirados >= params.maxEnfileirar) break

    const { data: faturas, error } = await supabaseAdmin
      .from("faturas")
      .select(FATURA_SELECT)
      .eq("administradora_id", params.administradoraId)
      .gte("vencimento", params.vencimentoAlvo)
      .lt("vencimento", fimVencimento)
      .in("status", ["pendente", "atrasada", "vencida"])
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) {
      throw new Error(`Erro ao buscar faturas pendentes: ${error.message}`)
    }

    const lista = (faturas || []) as FaturaLembreteRow[]
    if (!lista.length) break

    const ids = lista.map((f) => String(f.id))
    const jaEnviadas = await faturasComEnvioSucesso(params.eventType, params.referenceDate, ids)
    const candidatos: FaturaLembreteRow[] = []

    for (const row of lista) {
      const faturaId = String(row.id)
      if (!row.cliente_administradora_id) {
        ignorados++
        registrarMotivo(motivos, "sem_cliente_vinculado")
        continue
      }
      if (jaEnviadas.has(faturaId)) {
        ignorados++
        registrarMotivo(motivos, "ja_enviado")
        continue
      }
      if (params.somenteRetentativa) {
        const idempotencyKey = montarIdempotencyKey({
          eventType: params.eventType,
          clienteId: row.cliente_administradora_id,
          referenceDate: params.referenceDate,
          faturaId: row.id,
        })
        const { data: tentativa } = await supabaseAdmin
          .from("whatsapp_messages")
          .select("status")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle()
        if (!tentativa) {
          ignorados++
          registrarMotivo(motivos, "nao_tentado_manha")
          continue
        }
        if (STATUS_SUCESSO_LEMBRETE.has(String(tentativa.status))) {
          ignorados++
          registrarMotivo(motivos, "ja_enviado")
          continue
        }
      }
      candidatos.push(row)
    }

    const vaga = params.maxEnfileirar - enfileirados
    const leva = candidatos.slice(0, vaga)
    if (candidatos.length > leva.length) pendentesRestantes += candidatos.length - leva.length

    let tenantId = ctx.tenantId.get(params.administradoraId)
    if (!tenantId) {
      const { resolveTenantIdForAdministradora } = await import("@/lib/resolve-tenant-administradora")
      tenantId = await resolveTenantIdForAdministradora(params.administradoraId)
      ctx.tenantId.set(params.administradoraId, tenantId)
    }
    const telefones = await carregarTelefonesCobrancaEmLote({
      administradoraId: params.administradoraId,
      tenantId,
      clientes: leva.map((row) => ({
        clienteAdministradoraId: row.cliente_administradora_id,
        telefoneFatura: row.cliente_telefone,
      })),
    })

    for (const row of leva) {
      if (params.deadlineMs && Date.now() >= params.deadlineMs) {
        parouNoPrazo = true
        pendentesRestantes++
        continue
      }
      try {
        const delayMs = stagger * WHATSAPP_LEMBRETE_STAGGER_MS
        stagger++
        const result = await dispararLembreteFatura(row, params.eventType, {
          delayMs,
          somenteRetentativa: params.somenteRetentativa,
          ctx,
          telefoneResolvido: telefones.get(row.cliente_administradora_id) || "",
        })
        if (result.enqueued) enfileirados++
        else {
          ignorados++
          registrarMotivo(motivos, result.reason)
        }
      } catch {
        ignorados++
        registrarMotivo(motivos, "erro_dispatch")
      }
    }

    if (parouNoPrazo || lista.length < PAGE) break
    from += PAGE
    if (from > 20_000) break
  }

  if (parouNoPrazo) pendentesRestantes = Math.max(pendentesRestantes, 1)

  return {
    enfileirados,
    ignorados,
    pendentes_restantes: pendentesRestantes,
    motivos_ignorados: motivos,
  }
}
