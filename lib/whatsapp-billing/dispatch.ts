import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"
import {
  montarVariaveisInternas,
  mapearParaContentVariablesTwilio,
  type DadosEnvioWhatsApp,
} from "./content-variables"
import { montarIdempotencyKey, referenceDateHoje } from "./idempotency"
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

export async function dispararNotificacaoWhatsApp(
  params: DispararNotificacaoParams,
  options?: { ignorarAutomatico?: boolean }
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
  const variaveisInternas = montarVariaveisInternas({
    ...params.dados,
    telefoneSuporte: params.dados.telefoneSuporte ?? settings?.telefone_suporte_whatsapp,
    urlPortalCliente: params.dados.urlPortalCliente ?? settings?.url_portal_cliente,
  })
  const variaveis = mapearParaContentVariablesTwilio(variaveisInternas, variaveisMap)

  const jobId = montarIdempotencyKey({
    eventType: params.eventType,
    clienteId: params.clienteAdministradoraId,
    referenceDate,
    faturaId: params.faturaId,
  })

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
    jobId
  )

  whatsappBillingLog.info("dispatch.enqueued", {
    eventType: params.eventType,
    jobId,
    administradoraId: params.administradoraId,
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
}): Promise<{ enqueued: boolean; reason?: string }> {
  const { data: cliente } = await supabaseAdmin
    .from("clientes_administradoras")
    .select("proposta_id")
    .eq("id", params.clienteAdministradoraId)
    .maybeSingle()

  if (!cliente?.proposta_id) {
    return { enqueued: false, reason: "proposta_nao_encontrada" }
  }

  const { data: proposta } = await supabaseAdmin
    .from("propostas")
    .select("nome, telefone")
    .eq("id", cliente.proposta_id)
    .maybeSingle()

  const administradoraNome = await carregarNomeAdministradora(params.administradoraId)

  return dispararNotificacaoWhatsApp({
    eventType: "saudacao_boas_vindas",
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
    telefone: String(proposta?.telefone || ""),
    dados: {
      clienteNome: String(proposta?.nome || "Cliente"),
      administradoraNome,
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
}): Promise<{ enqueued: boolean; reason?: string }> {
  const { count } = await supabaseAdmin
    .from("faturas")
    .select("id", { count: "exact", head: true })
    .eq("cliente_administradora_id", params.clienteAdministradoraId)

  if ((count ?? 0) > 1) {
    return { enqueued: false, reason: "nao_e_primeiro_boleto" }
  }

  const administradoraNome = await carregarNomeAdministradora(params.administradoraId)

  return dispararNotificacaoWhatsApp({
    eventType: "primeiro_boleto_gerado",
    administradoraId: params.administradoraId,
    clienteAdministradoraId: params.clienteAdministradoraId,
    telefone: params.telefone,
    faturaId: params.faturaId,
    dados: {
      clienteNome: params.clienteNome,
      administradoraNome,
      valorFatura: params.valor,
      dataVencimento: params.vencimento,
      linkBoleto: params.linkBoleto,
      numeroFatura: params.numeroFatura,
    },
  })
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

  return dispararNotificacaoWhatsApp({
    eventType: "confirmacao_pagamento",
    administradoraId: fatura.administradora_id,
    clienteAdministradoraId: fatura.cliente_administradora_id,
    telefone: String(fatura.cliente_telefone || ""),
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
  options?: { ignorarAutomatico?: boolean }
): Promise<{ enqueued: boolean; reason?: string }> {
  const administradoraNome = await carregarNomeAdministradora(fatura.administradora_id)
  const linkBoleto = getBoletoLinkFromFatura(fatura)

  return dispararNotificacaoWhatsApp(
    {
      eventType,
      administradoraId: fatura.administradora_id,
      clienteAdministradoraId: fatura.cliente_administradora_id,
      telefone: String(fatura.cliente_telefone || ""),
      faturaId: fatura.id,
      dados: {
        clienteNome: String(fatura.cliente_nome || "Cliente"),
        administradoraNome,
        valorFatura: fatura.valor != null ? Number(fatura.valor) : null,
        dataVencimento: fatura.vencimento,
        linkBoleto,
        numeroFatura: fatura.numero_fatura,
      },
    },
    options
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
