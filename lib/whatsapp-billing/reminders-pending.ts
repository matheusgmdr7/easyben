import { supabaseAdmin } from "@/lib/supabase-admin"
import { carregarTelefonesCobrancaEmLote } from "@/lib/telefone-cliente-cobranca"
import {
  criarLembreteDispatchCache,
  dispararLembreteFatura,
  type FaturaLembreteRow,
  type LembreteDispatchCache,
} from "./dispatch"
import { montarIdempotencyKey } from "./idempotency"
import { dataComOffset, REGRAS_LEMBRETE_COBRANCA, vencimentoAlvoParaEvento } from "./reminder-rules"
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
  /** Continua a leitura depois deste id de fatura. */
  aposId?: string
  /** Disparo pelo painel: cobre falha e quem nunca entrou na fila. */
  envioOperador?: boolean
}

export type ProcessarPendentesResultado = {
  enfileirados: number
  ignorados: number
  pendentes_restantes: number
  motivos_ignorados: Record<string, number>
  ultimo_id: string | null
  concluiu_coorte: boolean
  proximo_stagger: number
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
  let ultimoId = params.aposId || null
  let parouNoPrazo = false
  let parouNoLimite = false

  const fimVencimento = dataComOffset(params.vencimentoAlvo, 1)
  const PAGE = 200

  for (;;) {
    if (params.deadlineMs && Date.now() >= params.deadlineMs) {
      parouNoPrazo = true
      break
    }
    if (enfileirados >= params.maxEnfileirar) {
      parouNoLimite = true
      break
    }

    let consulta = supabaseAdmin
      .from("faturas")
      .select(FATURA_SELECT)
      .eq("administradora_id", params.administradoraId)
      .gte("vencimento", params.vencimentoAlvo)
      .lt("vencimento", fimVencimento)
      .in("status", ["pendente", "atrasada", "vencida"])
      .order("id", { ascending: true })
      .limit(PAGE)
    if (ultimoId) consulta = consulta.gt("id", ultimoId)

    const { data: faturas, error } = await consulta

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

    let interrompeu = false
    for (const row of leva) {
      if (params.deadlineMs && Date.now() >= params.deadlineMs) {
        parouNoPrazo = true
        pendentesRestantes++
        interrompeu = true
        break
      }
      try {
        const delayMs = stagger * WHATSAPP_LEMBRETE_STAGGER_MS
        stagger++
        const result = await dispararLembreteFatura(row, params.eventType, {
          delayMs,
          somenteRetentativa: params.somenteRetentativa,
          referenceDate: params.referenceDate,
          envioOperador: params.envioOperador,
          ctx,
          telefoneResolvido: telefones.get(row.cliente_administradora_id) || "",
        })
        if (result.enqueued) enfileirados++
        else {
          ignorados++
          registrarMotivo(motivos, result.reason)
        }
        ultimoId = String(row.id)
      } catch {
        ignorados++
        registrarMotivo(motivos, "erro_dispatch")
        ultimoId = String(row.id)
      }
    }

    if (interrompeu || candidatos.length > leva.length) {
      if (!interrompeu) parouNoLimite = true
      break
    }

    if (lista.length) ultimoId = String(lista[lista.length - 1].id)
    if (lista.length < PAGE) break
  }

  if (parouNoPrazo || parouNoLimite) pendentesRestantes = Math.max(pendentesRestantes, 1)

  return {
    enfileirados,
    ignorados,
    pendentes_restantes: pendentesRestantes,
    motivos_ignorados: motivos,
    ultimo_id: ultimoId,
    concluiu_coorte: !parouNoPrazo && !parouNoLimite,
    proximo_stagger: stagger,
  }
}

export type CursorCobertura = {
  reference_date: string
  event_type: WhatsAppBillingEventType
  apos_id: string
}

function diasDoPeriodo(de: string, ate: string): string[] {
  const dias: string[] = []
  const inicio = new Date(`${de}T12:00:00.000Z`)
  const fim = new Date(`${ate}T12:00:00.000Z`)
  for (let dia = new Date(inicio); dia <= fim; dia.setUTCDate(dia.getUTCDate() + 1)) {
    dias.push(dia.toISOString().slice(0, 10))
  }
  return dias
}

/** Coloca na fila as falhas e as faturas do período que ainda não tiveram tentativa. */
export async function enfileirarFaltantesCobertura(params: {
  administradoraId: string
  de: string
  ate: string
  eventType?: WhatsAppBillingEventType
  limite: number
  staggerInicial?: number
  cursor?: CursorCobertura | null
  deadlineMs?: number
}): Promise<{
  enfileirados: number
  ignorados: number
  motivos_ignorados: Record<string, number>
  concluido: boolean
  cursor: CursorCobertura | null
  proximo_stagger: number
}> {
  const de = String(params.de).slice(0, 10)
  const ate = String(params.ate).slice(0, 10)
  const regras = params.eventType
    ? REGRAS_LEMBRETE_COBRANCA.filter((regra) => regra.eventType === params.eventType)
    : REGRAS_LEMBRETE_COBRANCA
  const slots = diasDoPeriodo(de, ate).flatMap((dia) => regras.map((regra) => ({ dia, regra })))
  const ctx = criarLembreteDispatchCache()
  const motivos: Record<string, number> = {}
  let enfileirados = 0
  let ignorados = 0
  let stagger = params.staggerInicial ?? 0
  let inicio = 0
  if (params.cursor) {
    const achou = slots.findIndex(
      (slot) =>
        slot.dia === params.cursor?.reference_date && slot.regra.eventType === params.cursor?.event_type
    )
    if (achou >= 0) inicio = achou
  }

  for (let i = inicio; i < slots.length; i++) {
    if (params.deadlineMs && Date.now() >= params.deadlineMs) {
      const slot = slots[i]
      return {
        enfileirados,
        ignorados,
        motivos_ignorados: motivos,
        concluido: false,
        cursor: {
          reference_date: slot.dia,
          event_type: slot.regra.eventType,
          apos_id: i === inicio ? params.cursor?.apos_id || "" : "",
        },
        proximo_stagger: stagger,
      }
    }

    const slot = slots[i]
    const aposId = i === inicio ? params.cursor?.apos_id || undefined : undefined
    const resultado = await processarLembretesPendentes({
      administradoraId: params.administradoraId,
      eventType: slot.regra.eventType,
      vencimentoAlvo: vencimentoAlvoParaEvento(slot.regra.dayOffset, slot.dia),
      referenceDate: slot.dia,
      maxEnfileirar: Math.max(1, params.limite - enfileirados),
      ctx,
      envioOperador: true,
      staggerInicial: stagger,
      deadlineMs: params.deadlineMs,
      aposId,
    })

    enfileirados += resultado.enfileirados
    ignorados += resultado.ignorados
    stagger = resultado.proximo_stagger
    for (const [chave, qtd] of Object.entries(resultado.motivos_ignorados)) {
      motivos[chave] = (motivos[chave] || 0) + qtd
    }

    if (!resultado.concluiu_coorte) {
      return {
        enfileirados,
        ignorados,
        motivos_ignorados: motivos,
        concluido: false,
        cursor: {
          reference_date: slot.dia,
          event_type: slot.regra.eventType,
          apos_id: resultado.ultimo_id || aposId || "",
        },
        proximo_stagger: stagger,
      }
    }

    if (enfileirados >= params.limite) {
      const proximo = slots[i + 1]
      return {
        enfileirados,
        ignorados,
        motivos_ignorados: motivos,
        concluido: !proximo,
        cursor: proximo
          ? { reference_date: proximo.dia, event_type: proximo.regra.eventType, apos_id: "" }
          : null,
        proximo_stagger: stagger,
      }
    }
  }

  return {
    enfileirados,
    ignorados,
    motivos_ignorados: motivos,
    concluido: true,
    cursor: null,
    proximo_stagger: stagger,
  }
}
