import { NextRequest, NextResponse } from "next/server"
import { montarRelatorioCoberturaWhatsApp } from "@/lib/whatsapp-billing/relatorio-cobertura"

/**
 * GET /api/administradora/whatsapp/cobertura?administradora_id=&de=&ate=
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

    const relatorio = await montarRelatorioCoberturaWhatsApp({
      administradoraId,
      de,
      ate,
    })

    return NextResponse.json(relatorio)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar relatório de cobertura" },
      { status: 500 }
    )
  }
}
