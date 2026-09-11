import { NextResponse } from "next/server"
import { obterPainelLimitesWhatsApp } from "@/lib/whatsapp-billing/sender-limits"

export const maxDuration = 30

/**
 * GET /api/administradora/whatsapp/limites
 * Limite Meta/Twilio do sender + uso (destinatários únicos nas últimas 24h).
 */
export async function GET() {
  try {
    const painel = await obterPainelLimitesWhatsApp()
    return NextResponse.json(painel)
  } catch (err: unknown) {
    console.error("[whatsapp/limites]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao consultar limites WhatsApp" },
      { status: 500 }
    )
  }
}
