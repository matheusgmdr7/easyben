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

function obterSlugCharge(baseId: string): string {
  return String(baseId || "").trim().replace(/^pay_/, "")
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
      gateway_id: chargeId,
      asaas_charge_id: chargeId,
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

    // Fallback para legado: algumas faturas antigas ficaram sem asaas_charge_id/gateway_id,
    // porém com URLs de boleto/invoice já salvas.
    if (totalAtualizadas === 0) {
      const slug = obterSlugCharge(chargeId)

      const invoiceNumber = String(payment?.invoiceNumber || "").trim()
      if (invoiceNumber) {
        const { data: dataPorNumero, error: errorPorNumero } = await supabaseAdmin
          .from("faturas")
          .update(updateData)
          .eq("numero_fatura", invoiceNumber)
          .select("id")

        if (errorPorNumero) {
          console.error("[webhook-asaas] erro fallback por numero_fatura", { error: errorPorNumero.message })
        } else {
          totalAtualizadas += (dataPorNumero || []).length
        }
      }

      const externalReference = String(payment?.externalReference || "").trim()
      if (totalAtualizadas === 0 && externalReference) {
        const { data: dataPorRef, error: errorPorRef } = await supabaseAdmin
          .from("faturas")
          .update(updateData)
          .eq("cliente_administradora_id", externalReference)
          .select("id")

        if (errorPorRef) {
          console.error("[webhook-asaas] erro fallback por externalReference", { error: errorPorRef.message })
        } else {
          totalAtualizadas += (dataPorRef || []).length
        }
      }

      if (slug) {
        const slugBusca = `*${slug}*`
        // Compatibilidade com esquemas antigos: usamos boleto_url,
        // coluna historicamente presente para localizar faturas legadas.
        const filtros = [`boleto_url.ilike.${slugBusca}`]

        const { data: dataLegado, error: errorLegado } = await supabaseAdmin
          .from("faturas")
          .update(updateData)
          .or(filtros.join(","))
          .select("id")

        if (errorLegado) {
          console.error("[webhook-asaas] erro fallback legado por URL", { error: errorLegado.message })
        } else {
          totalAtualizadas += (dataLegado || []).length
        }
      }
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

