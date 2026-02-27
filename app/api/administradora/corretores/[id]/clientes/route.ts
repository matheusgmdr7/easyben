import { NextRequest, NextResponse } from "next/server"
import { CorretoresAdministradoraService } from "@/services/corretores-administradora-service"

/**
 * GET /api/administradora/corretores/[id]/clientes?administradora_id=xxx
 * Lista clientes vinculados a este corretor.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: corretorId } = await params
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const clientes = await CorretoresAdministradoraService.listarClientesDoCorretor(
      corretorId,
      administradoraId
    )
    return NextResponse.json(clientes)
  } catch (e: unknown) {
    console.error("Erro ao listar clientes do corretor:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar clientes" },
      { status: 500 }
    )
  }
}
