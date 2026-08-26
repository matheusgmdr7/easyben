import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"
import { carregarTelefoneAtualClienteCobranca } from "@/lib/telefone-cliente-cobranca"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import {
  montarVariaveisInternas,
  mapearParaContentVariablesTwilio,
  type DadosEnvioWhatsApp,
} from "./content-variables"
import {
  montarIdempotencyKey,
  referenceDateAmanha,
  referenceDateHoje,
} from "./idempotency"
import { PRIMEIRO_BOLETO_MENSAGEM_DELAY_MS } from "./event-types"
import { calcularDelayEscalonadoSaudacao } from "./rate-limit-policy"
import { carregarContextoSaudacaoWhatsApp } from "./saudacao-context"
import { enfileirarNotificacaoOutbound } from "./queues"
import { whatsappBillingLog } from "./logger"
import type { WhatsAppBillingEventType } from "./event-types"

type BillingSettings = {
  whatsapp_automatico_ativo: boolean
  horario_envio: string
  eventos_ativos: Record<string, boolean>
  telefone_suporte_whatsapp: string | null
  url_portal_cliente: string | null
}

export type DispararNotificacaoParams = {
  eventType: WhatsAppBillingEventType
  administradoraId: string
  clienteAdministradoraId: string
  telefone: string
  dados: DadosEnvioWhatsApp
  faturaId?: string | null
  referenceDate?: string
  /** Atraso BullMQ antes do envio (ex.: primeiro boleto 24h após saudação). */
  delayMs?: number
}

async function carregarSettings(administradoraId: string): Promise<BillingSettings | null> {
  const { data } = await supabaseAdmin
    .from("billing_notification_settings")
    .select(
      "whatsapp_automatico_ativo, horario_envio, eventos_ativos, telefone_suporte_whatsapp, url_portal_cliente"
    )
    .eq("administradora_id", administradoraId)
    .maybeSingle()
  return data as BillingSettings | null
}

function eventoAtivo(settings: BillingSettings | null, eventType: WhatsAppBillingEventType): boolean {
  if (!settings?.whatsapp_automatico_ativo) return false
  const eventos = settings.eventos_ativos || {}
  return eventos[eventType] !== false
}

async function carregarVariaveisMap(eventType: WhatsAppBillingEventType) {
  const { data } = await supabaseAdmin
    .from("billing_templates")
    .select("variaveis_map")
    .eq("event_type", eventType)
    .eq("ativo", true)
    .maybeSingle()
  return (data?.variaveis_map || null) as Record<string, string> | null
}

const STATUS_SUCESSO_ENVIO = new Set(["queued", "sent", "delivered", "read"])

export async function dispararNotificacaoWhatsApp(
  params: DispararNotificacaoParams,
  options?: {
    ignorarAutomatico?: boolean
    idempotencySuffix?: string
    /** Na janela da tarde: só reenvia se a manhã falhou ou não registrou envio. */
    somenteRetentativa?: boolean
  }
): Promise<{ enqueued: boolean; reason?: string; jobId?: string }> {
  const telefoneDigits = normalizarTelefoneWhatsApp(params.telefone)
  if (!telefoneDigits) {
    return { enqueued: false, reason: "telefone_invalido" }
  }

  const settings = await carregarSettings(params.administradoraId)
  if (!options?.ignorarAutomatico && !eventoAtivo(settings, params.eventType)) {
    return { enqueued: false, reason: "evento_desativado" }
  }

  const variaveisMap = await carregarVariaveisMap(params.eventType)
  if (!variaveisMap || Object.keys(variaveisMap).length === 0) {
    return { enqueued: false, reason: "template_indisponivel" }
  }

  const referenceDate = params.referenceDate || referenceDateHoje()
  const idempotencyKeyBase = montarIdempotencyKey({
    eventType: params.eventType,
    clienteId: params.clienteAdministradoraId,
    referenceDate,
    faturaId: params.faturaId,
  })

  if (options?.somenteRetentativa) {
    const { data: existente } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("status")
      .eq("idempotency_key", idempotencyKeyBase)
      .maybeSingle()

    if (existente && STATUS_SUCESSO_ENVIO.has(String(existente.status))) {
      return { enqueued: false, reason: "ja_enviado" }
    }
  }

  const variaveisInternas = montarVariaveisInternas({
    ...params.dados,
    telefoneSuporte: params.dados.telefoneSuporte ?? settings?.telefone_suporte_whatsapp,
    urlPortalCliente: params.dados.urlPortalCliente ?? settings?.url_portal_cliente,
  })
  const variaveis = mapearParaContentVariablesTwilio(variaveisInternas, variaveisMap)

  const suffix =
    options?.idempotencySuffix ||
    (options?.somenteRetentativa ? "tarde" : undefined)
  const jobId = idempotencyKeyBase + (suffix ? `:${suffix}` : "")

  try {
    await enfileirarNotificacaoOutbound(
      {
        clienteId: params.clienteAdministradoraId,
        administradoraId: params.administradoraId,
        telefone: telefoneDigits,
        eventType: params.eventType,
        faturaId: params.faturaId ?? null,
        referenceDate,
        variaveis,
      },
      jobId,
      { delayMs: params.delayMs }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("Redis não configurado") || message.includes("max requests")) {
      return { enqueued: false, reason: "fila_indisponivel" }
    }
    throw err
  }

  whatsappBillingLog.info("dispatch.enqueued", {
    eventType: params.eventType,
    jobId,
    administradoraId: params.administradoraId,
    delayMs: params.delayMs ?? 0,
  })

  return { enqueued: true, jobId }
}

/** Dispara sem bloquear o fluxo principal (webhooks, cadastro, boleto). */
export function dispararNotificacaoWhatsAppSafe(params: DispararNotificacaoParams): void {
  dispararNotificacaoWhatsApp(params).catch((err: unknown) => {
    whatsappBillingLog.error("dispatch.error", {
      eventType: params.eventType,
      message: err instanceof Error ? err.message : String(err),
    })
  })
}

async function carregarNomeAdministradora(administradoraId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("administradoras")
    .select("nome, razao_social")
    .eq("id", administradoraId)
    .maybeSingle()
  return String(data?.nome || data?.razao_social || "Administradora").trim() || "Administradora"
}

export async function dispararSaudacaoBoasVindas(params: {
  administradoraId: string
  clienteAdministradoraId: string
  telefone?: string
  clienteNome?: string
  faturaId?: string
}): Promise<{ enqueued: boolean; reason?: string }> {
  const ctx = await carregarContextoSaudacaoWhatsApp({ ...params, exigirTelefone: true })
  if ("erro" in ctx) {
    return { enqueued: false, reason: ctx.erro }
  }
  if (!ctx.telefone?.trim()) {
    return { enqueued: false, reason: "telefone_invalido" }
  }

  const administradoraNome = await carregarNomeAdministradora(params.administradoraId)

  return dispararNotificacaoWhatsApp({
    eventType: "saudacao_boas_vindas",
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
    telefone: ctx.telefone,
    faturaId: params.faturaId ?? null,
    delayMs: calcularDelayEscalonadoSaudacao(params.clienteAdministradoraId),
    dados: {
      clienteNome: ctx.clienteNome,
      administradoraNome,
      financeiraNome: ctx.financeiraNome,
      planoDescricao: ctx.planoDescricao,
    },
  })
}

export async function dispararPrimeiroBoletoGerado(params: {
  faturaId: string
  clienteAdministradoraId: string
  administradoraId: string
  clienteNome: string
  telefone: string
  valor: number
  vencimento: string
  linkBoleto?: string | null
  numeroFatura?: string | null
}): Promise<{
  enqueued: boolean
  reason?: string
  saudacao?: { enqueued: boolean; reason?: string }
  primeiroBoleto?: { enqueued: boolean; reason?: string; jobId?: string }
}> {
  const { count } = await supabaseAdmin
    .from("faturas")
    .select("id", { count: "exact", head: true })
    .eq("cliente_administradora_id", params.clienteAdministradoraId)

  if ((count ?? 0) > 1) {
    return { enqueued: false, reason: "nao_e_primeiro_boleto" }
  }

  const administradoraNome = await carregarNomeAdministradora(params.administradoraId)

  const saudacao = await dispararSaudacaoBoasVindas({
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
    telefone: params.telefone,
    clienteNome: params.clienteNome,
    faturaId: params.faturaId,
  })

  const primeiroBoleto = await dispararNotificacaoWhatsApp({
    eventType: "primeiro_boleto_gerado",
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
    telefone: params.telefone,
    faturaId: params.faturaId,
    referenceDate: referenceDateAmanha(),
    delayMs: PRIMEIRO_BOLETO_MENSAGEM_DELAY_MS,
    dados: {
      clienteNome: params.clienteNome,
      administradoraNome,
      valorFatura: params.valor,
      dataVencimento: params.vencimento,
      linkBoleto: params.linkBoleto,
      numeroFatura: params.numeroFatura,
    },
  })

  whatsappBillingLog.info("dispatch.primeiro_boleto_fluxo", {
    faturaId: params.faturaId,
    saudacaoEnqueued: saudacao.enqueued,
    primeiroBoletoEnqueued: primeiroBoleto.enqueued,
    delayMs: PRIMEIRO_BOLETO_MENSAGEM_DELAY_MS,
  })

  const enqueued = saudacao.enqueued || primeiroBoleto.enqueued

  return {
    enqueued,
    reason: enqueued ? undefined : saudacao.reason || primeiroBoleto.reason,
    saudacao,
    primeiroBoleto,
  }
}

export async function dispararConfirmacaoPagamento(faturaId: string): Promise<{ enqueued: boolean; reason?: string }> {
  const { data: fatura } = await supabaseAdmin
    .from("faturas")
    .select(
      "id, cliente_administradora_id, administradora_id, cliente_nome, cliente_telefone, valor, vencimento, numero_fatura, pagamento_data, status"
    )
    .eq("id", faturaId)
    .maybeSingle()

  if (!fatura?.cliente_administradora_id || !fatura.administradora_id) {
    return { enqueued: false, reason: "fatura_nao_encontrada" }
  }

  if (String(fatura.status || "").toLowerCase() !== "paga") {
    return { enqueued: false, reason: "fatura_nao_paga" }
  }

  const administradoraNome = await carregarNomeAdministradora(fatura.administradora_id)
  const pagamentoData =
    fatura.pagamento_data != null
      ? String(fatura.pagamento_data).slice(0, 10)
      : referenceDateHoje()

  const telefone =
    (await carregarTelefoneAtualClienteCobranca({
      administradoraId: fatura.administradora_id,
      clienteAdministradoraId: fatura.cliente_administradora_id,
      telefoneFatura: fatura.cliente_telefone,
    })) || ""

  return dispararNotificacaoWhatsApp({
    eventType: "confirmacao_pagamento",
    administradoraId: fatura.administradora_id,
    clienteAdministradoraId: fatura.cliente_administradora_id,
    telefone,
    faturaId: fatura.id,
    referenceDate: pagamentoData,
    dados: {
      clienteNome: String(fatura.cliente_nome || "Cliente"),
      administradoraNome,
      valorFatura: Number(fatura.valor) || null,
      dataPagamento: pagamentoData,
      numeroFatura: fatura.numero_fatura,
    },
  })
}

export type FaturaLembreteRow = {
  id: string
  cliente_administradora_id: string
  administradora_id: string
  cliente_nome: string | null
  cliente_telefone: string | null
  valor: number | null
  vencimento: string | null
  numero_fatura: string | null
  status: string | null
  asaas_boleto_url?: string | null
  boleto_url?: string | null
  gateway_id?: string | null
  asaas_charge_id?: string | null
}

export async function dispararLembreteFatura(
  fatura: FaturaLembreteRow,
  eventType: WhatsAppBillingEventType,
  options?: {
    ignorarAutomatico?: boolean
    delayMs?: number
    somenteRetentativa?: boolean
  }
): Promise<{ enqueued: boolean; reason?: string }> {
  const administradoraNome = await carregarNomeAdministradora(fatura.administradora_id)
  const linkBoleto = getBoletoLinkFromFatura(fatura)

  const tenantId = await resolveTenantIdForAdministradora(fatura.administradora_id)
  const telefone =
    (await carregarTelefoneAtualClienteCobranca({
      administradoraId: fatura.administradora_id,
      clienteAdministradoraId: fatura.cliente_administradora_id,
      telefoneFatura: fatura.cliente_telefone,
      tenantId,
    })) || ""

  return dispararNotificacaoWhatsApp(
    {
      eventType,
      administradoraId: fatura.administradora_id,
      clienteAdministradoraId: fatura.cliente_administradora_id,
      telefone,
      faturaId: fatura.id,
      delayMs: options?.delayMs,
      dados: {
        clienteNome: String(fatura.cliente_nome || "Cliente"),
        administradoraNome,
        valorFatura: fatura.valor != null ? Number(fatura.valor) : null,
        dataVencimento: fatura.vencimento,
        linkBoleto,
        numeroFatura: fatura.numero_fatura,
      },
    },
    {
      ...(options?.ignorarAutomatico ? { ignorarAutomatico: true } : {}),
      ...(options?.somenteRetentativa ? { somenteRetentativa: true } : {}),
    }
  )
}

export async function dispararCobrancaManualFatura(
  faturaId: string
): Promise<{ enqueued: boolean; reason?: string; eventType?: string }> {
  const { data: fatura } = await supabaseAdmin
    .from("faturas")
    .select(
      "id, cliente_administradora_id, administradora_id, cliente_nome, cliente_telefone, valor, vencimento, numero_fatura, status, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id"
    )
    .eq("id", faturaId)
    .maybeSingle()

  if (!fatura?.cliente_administradora_id || !fatura.administradora_id) {
    return { enqueued: false, reason: "fatura_nao_encontrada" }
  }

  const { inferirEventoCobrancaPorVencimento } = await import("./reminder-rules")
  const eventType = inferirEventoCobrancaPorVencimento(String(fatura.vencimento || ""))

  const result = await dispararLembreteFatura(fatura as FaturaLembreteRow, eventType, {
    ignorarAutomatico: true,
  })

  return { ...result, eventType }
}
