import { NextRequest, NextResponse } from "next/server"
import { listarRespostasRecentesWhatsApp } from "@/lib/whatsapp-billing/conversas"

/**
 * GET /api/administradora/whatsapp/conversas/recentes?administradora_id=&desde=
 * Mensagens recebidas a partir de um timestamp (polling da lista e do sino).
 */
export async function GET(request: NextRequest) {
  const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim()
  const desde = request.nextUrl.searchParams.get("desde")?.trim()
  const baseline = request.nextUrl.searchParams.get("baseline") === "1"
  if (!administradoraId || (!desde && !baseline)) {
    return NextResponse.json({ error: "administradora_id e desde são obrigatórios" }, { status: 400 })
  }
  if (baseline) {
    return NextResponse.json({ agora: new Date().toISOString(), mensagens: [] })
  }

  try {
    const lista = await listarRespostasRecentesWhatsApp({ administradoraId, desde: desde! })
    return NextResponse.json(lista)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar respostas recentes"
    const status = message === "desde inválido" ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
