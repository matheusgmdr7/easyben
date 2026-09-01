import { NextRequest, NextResponse } from "next/server"
import { buscarBeneficiariosParaChamado } from "@/lib/chamados-busca-beneficiarios"

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const q = request.nextUrl.searchParams.get("q") || undefined

    if (!q || q.trim().length < 2) {
      return NextResponse.json(
        { error: "Informe ao menos 2 caracteres na busca" },
        { status: 400 }
      )
    }

    const lista = await buscarBeneficiariosParaChamado({
      administradoraId,
      q,
    })
    return NextResponse.json(lista)
  } catch (e: unknown) {
    console.error("Erro ao buscar beneficiários para chamado:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar beneficiários" },
      { status: 500 }
    )
  }
}
