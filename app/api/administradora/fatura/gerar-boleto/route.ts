import { NextRequest, NextResponse } from "next/server"
import { gerarBoletoAdministradora } from "@/lib/gerar-boleto-administradora"

export const maxDuration = 30

/**
 * POST /api/administradora/fatura/gerar-boleto
 * Body: { administradora_id, financeira_id, cliente_administradora_id, valor, vencimento, descricao }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    return await gerarBoletoAdministradora(body)
  } catch (e: unknown) {
    console.error("[gerar-boleto] JSON inválido:", e)
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 })
  }
}
