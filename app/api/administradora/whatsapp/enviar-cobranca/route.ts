import { NextRequest, NextResponse } from "next/server"
import { dispararCobrancaManualFatura } from "@/lib/whatsapp-billing/dispatch"

export const maxDuration = 30

/**
 * POST /api/administradora/whatsapp/enviar-cobranca
 * Envio manual via Twilio (painel Cobranças).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const faturaId = String(body.fatura_id || "").trim()
    const administradoraId = String(body.administradora_id || "").trim()

    if (!faturaId || !administradoraId) {
      return NextResponse.json(
        { error: "fatura_id e administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    const result = await dispararCobrancaManualFatura(faturaId)

    if (!result.enqueued) {
      const msg =
        result.reason === "telefone_invalido"
          ? "Telefone do cliente inválido ou ausente"
          : result.reason === "fatura_nao_encontrada"
            ? "Fatura não encontrada"
            : result.reason === "template_indisponivel"
              ? "Template WhatsApp indisponível"
              : "Não foi possível enfileirar o envio"

      return NextResponse.json({ enqueued: false, reason: result.reason, error: msg }, { status: 422 })
    }

    return NextResponse.json({
      enqueued: true,
      event_type: result.eventType,
      message: "Cobrança enfileirada. O envio ocorre em instantes pelo worker WhatsApp.",
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao enviar cobrança" },
      { status: 500 }
    )
  }
}
