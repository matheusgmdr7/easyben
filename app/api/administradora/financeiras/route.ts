import { NextRequest, NextResponse } from "next/server"
import { FinanceirasService } from "@/services/financeiras-service"

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const list = await FinanceirasService.listar(administradoraId)
    return NextResponse.json(list)
  } catch (e: unknown) {
    console.error("Erro ao listar financeiras:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar financeiras" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      administradora_id,
      nome,
      instituicao_financeira,
      api_key,
      api_token,
      ambiente,
    } = body

    if (!administradora_id || !nome) {
      return NextResponse.json(
        { error: "administradora_id e nome são obrigatórios" },
        { status: 400 }
      )
    }

    const created = await FinanceirasService.criar({
      administradora_id,
      nome,
      instituicao_financeira: instituicao_financeira || "asaas",
      api_key,
      api_token,
      ambiente: ambiente || "producao",
    })
    return NextResponse.json(created)
  } catch (e: unknown) {
    console.error("Erro ao criar financeira:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar financeira" },
      { status: 500 }
    )
  }
}
