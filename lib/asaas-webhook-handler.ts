import { supabaseAdmin } from "@/lib/supabase-admin"
import { mapearStatusAsaas } from "@/lib/fatura-status"
import { dispararConfirmacaoPagamentoSafe } from "@/lib/whatsapp-billing/trigger-hooks"

export type AsaasWebhookPayload = {
  payment?: Record<string, unknown>
  data?: Record<string, unknown>
  [key: string]: unknown
}

function obterChargeIds(baseId: string): string[] {
  const limpo = String(baseId || "").trim()
  if (!limpo) return []
  const semPrefixo = limpo.replace(/^pay_/, "")
  const comPrefixo = semPrefixo ? `pay_${semPrefixo}` : ""
  return Array.from(new Set([limpo, semPrefixo, comPrefixo].filter(Boolean)))
}

function obterSlugCharge(baseId: string): string {
  return String(baseId || "").trim().replace(/^pay_/, "")
}

function normalizarStatusLocal(status: string | null | undefined): string {
  const s = String(status || "").trim().toLowerCase()
  if (s === "paid") return "paga"
  if (s === "overdue") return "atrasada"
  if (s === "cancelled" || s === "canceled") return "cancelada"
  return s
}

function deveBloquearRegressaoStatus(
  statusAtual: string | null | undefined,
  novoStatus: string
): boolean {
  const atual = normalizarStatusLocal(statusAtual)
  if (atual !== "paga") return false
  return novoStatus !== "paga" && novoStatus !== "cancelada"
}

function extrairPayment(body: AsaasWebhookPayload): Record<string, unknown> {
  return (body?.payment ?? body?.data ?? body) as Record<string, unknown>
}

let tokensAsaasCache: { tokens: Set<string>; expira: number } | null = null

async function tokensAsaasAtivos(): Promise<Set<string>> {
  const now = Date.now()
  if (tokensAsaasCache && tokensAsaasCache.expira > now) {
    return tokensAsaasCache.tokens
  }

  const { data: financeiras } = await supabaseAdmin
    .from("administradora_financeiras")
    .select("api_token, instituicao_financeira, ativo")
    .eq("ativo", true)
    .not("api_token", "is", null)

  const tokens = new Set<string>()
  for (const f of financeiras || []) {
    if (String(f.instituicao_financeira || "").toLowerCase() !== "asaas") continue
    const t = String(f.api_token || "").trim()
    if (t) tokens.add(t)
  }

  tokensAsaasCache = { tokens, expira: now + 5 * 60_000 }
  return tokens
}

export async function validarTokenWebhookAsaas(receivedToken: string): Promise<boolean> {
  const token = receivedToken.trim()
  if (!token) return false

  const expected = (process.env.ASAAS_WEBHOOK_TOKEN || "").trim()
  if (expected && token === expected) return true

  const tokens = await tokensAsaasAtivos()
  return tokens.has(token)
}

async function atualizarFaturaWebhook(params: {
  faturaId: string
  statusAnterior: string
  statusInterno: string
  updateData: Record<string, unknown>
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("faturas")
    .update(params.updateData)
    .eq("id", params.faturaId)
    .select("id")

  if (error) {
    console.error("[webhook-asaas] erro ao atualizar fatura", {
      id: params.faturaId,
      error: error.message,
    })
    return false
  }

  const ok = (data || []).length > 0
  if (ok && params.statusInterno === "paga" && params.statusAnterior !== "paga") {
    dispararConfirmacaoPagamentoSafe(params.faturaId)
  }
  return ok
}

async function processarFaturasCandidatas(
  candidatas: Array<{ id: string; status: string | null }>,
  statusInterno: string,
  updateData: Record<string, unknown>
): Promise<number> {
  let total = 0
  for (const fatura of candidatas) {
    if (deveBloquearRegressaoStatus(fatura.status, statusInterno)) continue
    const statusAnterior = normalizarStatusLocal(fatura.status)
    const ok = await atualizarFaturaWebhook({
      faturaId: String(fatura.id),
      statusAnterior,
      statusInterno,
      updateData,
    })
    if (ok) total++
  }
  return total
}

/** Processa webhook Asaas e retorna quantas faturas foram atualizadas. */
export async function processarWebhookAsaas(body: AsaasWebhookPayload): Promise<{
  chargeId: string
  statusAsaas: string | null
  statusInterno: string
  faturasAtualizadas: number
  ignored?: boolean
  reason?: string
}> {
  const payment = extrairPayment(body)
  const chargeId = String(payment?.id || "").trim()
  if (!chargeId) {
    return {
      chargeId: "",
      statusAsaas: null,
      statusInterno: "pendente",
      faturasAtualizadas: 0,
      ignored: true,
      reason: "Evento sem payment.id",
    }
  }

  const statusInterno = mapearStatusAsaas(String(payment?.status || ""))
  const updateData: Record<string, unknown> = {
    status: statusInterno,
    asaas_boleto_url: payment?.bankSlipUrl || null,
    asaas_invoice_url: payment?.invoiceUrl || null,
    asaas_payment_link: payment?.invoiceUrl || payment?.paymentLink || null,
    gateway_id: chargeId,
    asaas_charge_id: chargeId,
    boleto_codigo: payment?.nossoNumero || null,
    boleto_linha_digitavel: payment?.identificationField || null,
    updated_at: new Date().toISOString(),
  }

  if (statusInterno === "paga") {
    updateData.pagamento_data =
      payment?.paymentDate ||
      payment?.clientPaymentDate ||
      new Date().toISOString().slice(0, 10)
    if (payment?.value != null) updateData.pagamento_valor = Number(payment.value) || 0
  }

  if (payment?.dueDate) updateData.vencimento = String(payment.dueDate).slice(0, 10)
  if (payment?.value != null) updateData.valor = Number(payment.value) || 0

  const chargeIds = obterChargeIds(chargeId)
  const orFiltro = chargeIds.flatMap((id) => [`asaas_charge_id.eq.${id}`, `gateway_id.eq.${id}`]).join(",")

  let totalAtualizadas = 0

  const { data: candidatasPrimarias, error: erroPrimario } = await supabaseAdmin
    .from("faturas")
    .select("id, status")
    .or(orFiltro)

  if (erroPrimario) {
    console.error("[webhook-asaas] erro busca primária", erroPrimario.message)
  } else if (candidatasPrimarias?.length) {
    totalAtualizadas += await processarFaturasCandidatas(
      candidatasPrimarias as Array<{ id: string; status: string | null }>,
      statusInterno,
      updateData
    )
  }

  if (totalAtualizadas === 0) {
    const invoiceNumber = String(payment?.invoiceNumber || "").trim()
    if (invoiceNumber) {
      const { data: candNumero } = await supabaseAdmin
        .from("faturas")
        .select("id, status")
        .eq("numero_fatura", invoiceNumber)

      if (candNumero?.length) {
        totalAtualizadas += await processarFaturasCandidatas(
          candNumero as Array<{ id: string; status: string | null }>,
          statusInterno,
          updateData
        )
      }
    }
  }

  if (totalAtualizadas === 0) {
    const externalReference = String(payment?.externalReference || "").trim()
    if (externalReference) {
      const { data: candRef } = await supabaseAdmin
        .from("faturas")
        .select("id, status")
        .eq("cliente_administradora_id", externalReference)
        .in("status", ["pendente", "atrasada", "vencida"])

      if (candRef?.length) {
        totalAtualizadas += await processarFaturasCandidatas(
          candRef as Array<{ id: string; status: string | null }>,
          statusInterno,
          updateData
        )
      }
    }
  }

  if (totalAtualizadas === 0) {
    const slug = obterSlugCharge(chargeId)
    if (slug) {
      const { data: candLegado } = await supabaseAdmin
        .from("faturas")
        .select("id, status")
        .ilike("boleto_url", `%${slug}%`)
        .in("status", ["pendente", "atrasada", "vencida"])
        .limit(5)

      if (candLegado?.length) {
        totalAtualizadas += await processarFaturasCandidatas(
          candLegado as Array<{ id: string; status: string | null }>,
          statusInterno,
          updateData
        )
      }
    }
  }

  return {
    chargeId,
    statusAsaas: payment?.status != null ? String(payment.status) : null,
    statusInterno,
    faturasAtualizadas: totalAtualizadas,
  }
}
