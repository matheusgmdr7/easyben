import { NextRequest, NextResponse } from "next/server"
import { ChamadosAdministradoraService } from "@/services/chamados-administradora-service"

/**
 * GET /api/administradora/chamados/recentes?administradora_id=&desde=
 * Lista chamados abertos após um timestamp (polling de notificações).
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim()
    const desde = request.nextUrl.searchParams.get("desde")?.trim()

    if (!administradoraId || !desde) {
      return NextResponse.json(
        { error: "administradora_id e desde são obrigatórios" },
        { status: 400 }
      )
    }

    const list = await ChamadosAdministradoraService.listarRecentesParaNotificacao(
      administradoraId,
      desde
    )
    return NextResponse.json(list)
  } catch (e: unknown) {
    console.error("Erro ao listar chamados recentes:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar chamados recentes" },
      { status: 500 }
    )
  }
}
