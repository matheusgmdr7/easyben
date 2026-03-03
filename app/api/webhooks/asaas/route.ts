import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const maxDuration = 30

function mapearStatusAsaas(status: string | null | undefined): string {
  const s = String(status || "").toUpperCase()
  const mapa: Record<string, string> = {
    PENDING: "pendente",
    RECEIVED: "paga",
    CONFIRMED: "paga",
    RECEIVED_IN_CASH: "paga",
    OVERDUE: "atrasada",
    REFUNDED: "cancelada",
    REFUND_REQUESTED: "cancelada",
    CHARGEBACK_REQUESTED: "cancelada",
    CHARGEBACK_DISPUTE: "cancelada",
    AWAITING_CHARGEBACK_REVERSAL: "cancelada",
    DELETED: "cancelada",
    CANCELED: "cancelada",
    CANCELLED: "cancelada",
    AWAITING_RISK_ANALYSIS: "pendente",
  }
  return mapa[s] || "pendente"
}

function obterChargeIds(baseId: string): string[] {
  const limpo = String(baseId || "").trim()
  if (!limpo) return []
  const semPrefixo = limpo.replace(/^pay_/, "")
  const comPrefixo = semPrefixo ? `pay_${semPrefixo}` : ""
  return Array.from(new Set([limpo, semPrefixo, comPrefixo].filter(Boolean)))
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = (process.env.ASAAS_WEBHOOK_TOKEN || "").trim()
    if (expectedToken) {
      const receivedToken =
        request.headers.get("asaas-access-token") ||
        request.headers.get("x-asaas-token") ||
        request.headers.get("access_token") ||
        request.nextUrl.searchParams.get("token") ||
        ""
      if (receivedToken !== expectedToken) {
        return NextResponse.json({ error: "Token do webhook inválido" }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => ({}))
    const payment = body?.payment ?? body?.data ?? body
    const chargeId = String(payment?.id || "").trim()
    if (!chargeId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "Evento sem payment.id" })
    }

    const statusInterno = mapearStatusAsaas(payment?.status)
    const updateData: Record<string, unknown> = {
      status: statusInterno,
      asaas_boleto_url: payment?.bankSlipUrl || null,
      asaas_invoice_url: payment?.invoiceUrl || null,
      asaas_payment_link: payment?.invoiceUrl || payment?.paymentLink || null,
      boleto_codigo: payment?.nossoNumero || null,
      boleto_linha_digitavel: payment?.identificationField || null,
      updated_at: new Date().toISOString(),
    }

    if (statusInterno === "paga") {
      updateData.pagamento_data = payment?.paymentDate || payment?.clientPaymentDate || new Date().toISOString().slice(0, 10)
      if (payment?.value != null) updateData.pagamento_valor = Number(payment.value) || 0
    }

    if (payment?.dueDate) updateData.vencimento = String(payment.dueDate).slice(0, 10)
    if (payment?.value != null) updateData.valor = Number(payment.value) || 0

    const chargeIds = obterChargeIds(chargeId)
    let totalAtualizadas = 0
    for (const id of chargeIds) {
      const { data, error } = await supabaseAdmin
        .from("faturas")
        .update(updateData)
        .or(`asaas_charge_id.eq.${id},gateway_id.eq.${id}`)
        .select("id")

      if (error) {
        console.error("[webhook-asaas] erro ao atualizar fatura", { id, error: error.message })
        continue
      }
      totalAtualizadas += (data || []).length
    }

    return NextResponse.json({
      ok: true,
      charge_id: chargeId,
      status_asaas: payment?.status || null,
      status_interno: statusInterno,
      faturas_atualizadas: totalAtualizadas,
    })
  } catch (e: unknown) {
    console.error("[webhook-asaas] erro", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no webhook Asaas" },
      { status: 500 }
    )
  }
}

