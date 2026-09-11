import { NextRequest, NextResponse } from "next/server"
import { dispararCobrancaManualFaturasLote } from "@/lib/whatsapp-billing/dispatch"

export const maxDuration = 60

const MAX_LOTE = 50

/**
 * POST /api/administradora/whatsapp/enviar-cobranca-lote
 * Envio manual em lote via Twilio (painel Faturas pendentes).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const administradoraId = String(body.administradora_id || "").trim()
    const faturaIdsRaw = body.fatura_ids

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    if (!Array.isArray(faturaIdsRaw) || faturaIdsRaw.length === 0) {
      return NextResponse.json({ error: "fatura_ids deve ser um array não vazio" }, { status: 400 })
    }

    const faturaIds = faturaIdsRaw.map((id) => String(id || "").trim()).filter(Boolean)
    if (faturaIds.length > MAX_LOTE) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_LOTE} faturas por lote` },
        { status: 400 }
      )
    }

    const resultado = await dispararCobrancaManualFaturasLote({
      faturaIds,
      administradoraId,
    })

    return NextResponse.json({
      ...resultado,
      message:
        resultado.enfileirados > 0
          ? `${resultado.enfileirados} cobrança(s) enfileirada(s). Os envios ocorrem em sequência pelo worker.`
          : "Nenhuma cobrança foi enfileirada.",
    })
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "Erro ao enviar cobranças em lote"
    const error =
      raw.includes("max requests limit exceeded") || raw.includes("ERR max requests")
        ? "Serviço de fila temporariamente indisponível: limite mensal do Redis (Upstash) esgotado."
        : raw
    return NextResponse.json({ error }, { status: 503 })
  }
}
