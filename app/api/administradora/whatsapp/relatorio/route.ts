import { NextRequest, NextResponse } from "next/server"
import { montarRelatorioEnviosWhatsApp } from "@/lib/whatsapp-billing/relatorio-envios"
import { isWhatsAppBillingEventType } from "@/lib/whatsapp-billing/event-types"

/**
 * GET /api/administradora/whatsapp/relatorio?administradora_id=&de=&ate=&event_type=&status=&page=
 */
export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams
    const administradoraId = qs.get("administradora_id")?.trim()
    const de = qs.get("de")?.trim()
    const ate = qs.get("ate")?.trim()

    if (!administradoraId || !de || !ate) {
      return NextResponse.json(
        { error: "administradora_id, de e ate são obrigatórios (YYYY-MM-DD)" },
        { status: 400 }
      )
    }

    const eventTypeRaw = qs.get("event_type")?.trim()
    const eventType =
      eventTypeRaw && isWhatsAppBillingEventType(eventTypeRaw) ? eventTypeRaw : undefined

    const relatorio = await montarRelatorioEnviosWhatsApp({
      administradoraId,
      de,
      ate,
      eventType,
      status: qs.get("status")?.trim() || undefined,
      page: Number(qs.get("page")) || 1,
      limit: Number(qs.get("limit")) || 25,
    })

    return NextResponse.json(relatorio)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar relatório" },
      { status: 500 }
    )
  }
}
