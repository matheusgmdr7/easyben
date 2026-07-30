import { NextRequest, NextResponse } from "next/server"
import {
  processarWebhookAsaas,
  validarTokenWebhookAsaas,
  type AsaasWebhookPayload,
} from "@/lib/asaas-webhook-handler"

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const expectedToken = (process.env.ASAAS_WEBHOOK_TOKEN || "").trim()
    const receivedToken =
      request.headers.get("asaas-access-token") ||
      request.headers.get("x-asaas-token") ||
      request.headers.get("access_token") ||
      request.nextUrl.searchParams.get("token") ||
      ""

    if (expectedToken || receivedToken) {
      const autorizado =
        !!receivedToken &&
        (receivedToken === expectedToken || (await validarTokenWebhookAsaas(receivedToken)))

      if (!autorizado) {
        return NextResponse.json({ error: "Token do webhook inválido" }, { status: 401 })
      }
    }

    const body = (await request.json().catch(() => ({}))) as AsaasWebhookPayload
    const resultado = await processarWebhookAsaas(body)

    if (resultado.ignored) {
      return NextResponse.json({ ok: true, ignored: true, reason: resultado.reason })
    }

    return NextResponse.json({
      ok: true,
      charge_id: resultado.chargeId,
      status_asaas: resultado.statusAsaas,
      status_interno: resultado.statusInterno,
      faturas_atualizadas: resultado.faturasAtualizadas,
    })
  } catch (e: unknown) {
    console.error("[webhook-asaas] erro", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no webhook Asaas" },
      { status: 500 }
    )
  }
}
