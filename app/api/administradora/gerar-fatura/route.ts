import { NextRequest, NextResponse } from "next/server"
import { FaturamentoService, type DadosFatura } from "@/services/faturamento-service"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      grupo_id,
      cliente_id,
      cliente_tipo,
      valor,
      vencimento,
      descricao,
      referencia_externa,
    } = body

    // Validações
    if (!grupo_id || !cliente_id || !valor || !vencimento || !descricao) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      )
    }

    if (!["proposta", "cliente_administradora"].includes(cliente_tipo)) {
      return NextResponse.json(
        { error: "Tipo de cliente inválido" },
        { status: 400 }
      )
    }

    // Gerar fatura
    const resultado = await FaturamentoService.gerarFatura({
      grupo_id,
      cliente_id,
      cliente_tipo: cliente_tipo as "proposta" | "cliente_administradora",
      valor: parseFloat(valor),
      vencimento,
      descricao,
      referencia_externa,
    })

    if (!resultado.sucesso) {
      return NextResponse.json(
        { error: resultado.erro || "Erro ao gerar fatura" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error: any) {
    console.error("Erro ao gerar fatura:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao gerar fatura" },
      { status: 500 }
    )
  }
}







