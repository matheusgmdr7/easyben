import { NextRequest, NextResponse } from "next/server"
import {
  LIMITE_FATURAS_POR_EXECUCAO,
  sincronizarStatusFaturasComAsaas,
  type ModoSincronizacaoAsaas,
} from "@/services/sincronizar-status-asaas-service"

export const maxDuration = 60

/**
 * Sincroniza status das faturas com o Asaas.
 * Prioriza faturas inconsistentes (ex.: pendente com pagamento_data) e em aberto.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const administradora_id = body?.administradora_id
    const financeira_id =
      body?.financeira_id != null && String(body.financeira_id).trim() !== ""
        ? String(body.financeira_id).trim()
        : null
    const modoRaw = String(body?.modo || "padrao").trim().toLowerCase()
    const modo: ModoSincronizacaoAsaas =
      modoRaw === "inconsistentes" || modoRaw === "todos" ? modoRaw : "padrao"
    const offset = Math.max(0, Number(body?.offset || 0))
    const limite = Math.max(1, Number(body?.limite || LIMITE_FATURAS_POR_EXECUCAO))

    if (!administradora_id) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const resultado = await sincronizarStatusFaturasComAsaas({
      administradoraId: String(administradora_id),
      financeiraId: financeira_id,
      modo,
      offset,
      limite,
    })

    return NextResponse.json(resultado)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const status = msg.includes("não encontrada") || msg.includes("não encontrado") ? 404 : 500
    console.error("Erro na sincronização:", error)
    return NextResponse.json({ error: msg }, { status })
  }
}
