import { NextRequest, NextResponse } from "next/server"
import { ChamadosAdministradoraService } from "@/services/chamados-administradora-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const item = await ChamadosAdministradoraService.buscarPorId(id, administradoraId, true)
    if (!item) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 })
    }
    return NextResponse.json(item)
  } catch (e: unknown) {
    console.error("Erro ao buscar chamado:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar chamado" },
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
    const { administradora_id, status, resolucao, observacao, usuario_id, usuario_nome } = body

    if (!administradora_id) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const updated = await ChamadosAdministradoraService.atualizar(id, administradora_id, {
      status,
      resolucao,
      observacao,
      usuario_id,
      usuario_nome,
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    console.error("Erro ao atualizar chamado:", e)
    const msg = e instanceof Error ? e.message : "Erro ao atualizar chamado"
    const status = msg.includes("não encontrado") ? 404 : msg.includes("não podem") ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { administradora_id, resolucao, usuario_id, usuario_nome } = body

    if (!administradora_id || !resolucao?.trim()) {
      return NextResponse.json(
        { error: "administradora_id e resolucao são obrigatórios" },
        { status: 400 }
      )
    }

    const updated = await ChamadosAdministradoraService.fechar(id, administradora_id, {
      resolucao: resolucao.trim(),
      usuario_id,
      usuario_nome,
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    console.error("Erro ao fechar chamado:", e)
    const msg = e instanceof Error ? e.message : "Erro ao fechar chamado"
    const status = msg.includes("não encontrado") ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
