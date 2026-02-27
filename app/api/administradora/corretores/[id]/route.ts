import { NextRequest, NextResponse } from "next/server"
import { CorretoresAdministradoraService } from "@/services/corretores-administradora-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const item = await CorretoresAdministradoraService.buscarPorId(id, administradoraId)
    if (!item) {
      return NextResponse.json({ error: "Corretor não encontrado" }, { status: 404 })
    }
    return NextResponse.json(item)
  } catch (e: unknown) {
    console.error("Erro ao buscar corretor:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar corretor" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { administradora_id, ...rest } = body
    if (!administradora_id) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const updated = await CorretoresAdministradoraService.atualizar(id, administradora_id, rest)
    return NextResponse.json(updated)
  } catch (e: unknown) {
    console.error("Erro ao atualizar corretor:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar corretor" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    await CorretoresAdministradoraService.excluir(id, administradoraId)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Erro ao excluir corretor:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao excluir corretor" },
      { status: 500 }
    )
  }
}
