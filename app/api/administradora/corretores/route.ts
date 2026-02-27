import { NextRequest, NextResponse } from "next/server"
import { CorretoresAdministradoraService } from "@/services/corretores-administradora-service"

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const list = await CorretoresAdministradoraService.listar(administradoraId)
    return NextResponse.json(list)
  } catch (e: unknown) {
    console.error("Erro ao listar corretores:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar corretores" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { administradora_id, nome, email, telefone } = body

    if (!administradora_id || !nome?.trim()) {
      return NextResponse.json(
        { error: "administradora_id e nome são obrigatórios" },
        { status: 400 }
      )
    }

    const created = await CorretoresAdministradoraService.criar({
      administradora_id,
      nome: nome.trim(),
      email: email?.trim(),
      telefone: telefone?.trim(),
    })
    return NextResponse.json(created)
  } catch (e: unknown) {
    console.error("Erro ao criar corretor:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar corretor" },
      { status: 500 }
    )
  }
}
