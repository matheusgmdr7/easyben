import { NextRequest, NextResponse } from "next/server"
import { FinanceirasService } from "@/services/financeiras-service"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const item = await FinanceirasService.buscarPorId(params.id, administradoraId)
    if (!item) {
      return NextResponse.json({ error: "Financeira não encontrada" }, { status: 404 })
    }
    return NextResponse.json(item)
  } catch (e: unknown) {
    console.error("Erro ao buscar financeira:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar financeira" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { administradora_id, ...rest } = body
    if (!administradora_id) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const updated = await FinanceirasService.atualizar(
      params.id,
      administradora_id,
      rest
    )
    return NextResponse.json(updated)
  } catch (e: unknown) {
    console.error("Erro ao atualizar financeira:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar financeira" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    await FinanceirasService.excluir(params.id, administradoraId)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Erro ao excluir financeira:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao excluir financeira" },
      { status: 500 }
    )
  }
}
