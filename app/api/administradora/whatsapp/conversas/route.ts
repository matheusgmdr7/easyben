import { NextRequest, NextResponse } from "next/server"
import {
  carregarHistoricoConversa,
  listarConversasWhatsApp,
  responderConversaWhatsApp,
} from "@/lib/whatsapp-billing/conversas"

/**
 * GET /api/administradora/whatsapp/conversas
 * ?administradora_id=&page=1
 * ?administradora_id=&conversa_id=
 *
 * POST { administradora_id, conversa_id, texto }
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams
  const administradoraId = qs.get("administradora_id")?.trim()
  if (!administradoraId) {
    return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
  }

  try {
    const conversaId = qs.get("conversa_id")?.trim()
    if (conversaId) {
      const historico = await carregarHistoricoConversa({ administradoraId, conversaId })
      return NextResponse.json(historico)
    }
    const lista = await listarConversasWhatsApp({
      administradoraId,
      page: Number(qs.get("page")) || 1,
      limit: Number(qs.get("limit")) || 20,
    })
    return NextResponse.json(lista)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar conversas"
    const status = message === "Conversa não encontrada" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const administradoraId = String(body.administradora_id || "").trim()
    const conversaId = String(body.conversa_id || "").trim()
    const texto = String(body.texto || "")
    if (!administradoraId || !conversaId) {
      return NextResponse.json({ error: "administradora_id e conversa_id são obrigatórios" }, { status: 400 })
    }
    const resultado = await responderConversaWhatsApp({ administradoraId, conversaId, texto })
    return NextResponse.json(resultado)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao responder"
    const status = message === "Conversa não encontrada" ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
