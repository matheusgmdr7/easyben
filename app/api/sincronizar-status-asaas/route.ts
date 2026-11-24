import { NextRequest, NextResponse } from "next/server"
import {
  LIMITE_FATURAS_POR_EXECUCAO,
  sincronizarStatusFaturasComAsaas,
  type ModoSincronizacaoAsaas,
  type PeriodoSyncAsaas,
} from "@/services/sincronizar-status-asaas-service"

export const maxDuration = 60

/**
 * Sincroniza status das faturas com o Asaas.
 * Prioriza faturas inconsistentes (ex.: pendente com pagamento_data) e em aberto.
 *
 * Body opcional para caso pontual (ex.: paga no banco, ainda pendente no sistema):
 *   { administradora_id, numero_fatura: "946680321" }
 *   { administradora_id, fatura_id: "<uuid>" }
 *
 * Período (vencimento):
 *   { ano: 2026, mes: 11 } — só o mês
 *   { todo_periodo: true } — todos os períodos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 })
    }
    const administradora_id = body?.administradora_id
    const financeira_id =
      body?.financeira_id != null && String(body.financeira_id).trim() !== ""
        ? String(body.financeira_id).trim()
        : null
    const modoRaw = String(body?.modo || "padrao").trim().toLowerCase()
    const modo: ModoSincronizacaoAsaas =
      modoRaw === "inconsistentes" ||
      modoRaw === "todos" ||
      modoRaw === "reconciliare"
        ? (modoRaw as ModoSincronizacaoAsaas)
        : "padrao"
    const offset = Math.max(0, Number(body?.offset || 0))
    const limite = Math.max(1, Math.min(40, Number(body?.limite || LIMITE_FATURAS_POR_EXECUCAO)))
    const numero_fatura =
      body?.numero_fatura != null && String(body.numero_fatura).trim() !== ""
        ? String(body.numero_fatura).trim()
        : null
    const fatura_id =
      body?.fatura_id != null && String(body.fatura_id).trim() !== ""
        ? String(body.fatura_id).trim()
        : null
    const todoPeriodo =
      body?.todo_periodo === true ||
      String(body?.todo_periodo || "").trim().toLowerCase() === "true"
    const anoNum = Number(body?.ano)
    const mesNum = Number(body?.mes)
    const periodo: PeriodoSyncAsaas | null = todoPeriodo
      ? null
      : Number.isFinite(anoNum) &&
          Number.isFinite(mesNum) &&
          mesNum >= 1 &&
          mesNum <= 12
        ? { ano: Math.trunc(anoNum), mes: Math.trunc(mesNum) }
        : null
    const validarChaves =
      body?.validar_chaves === undefined
        ? offset === 0
        : body?.validar_chaves !== false && String(body?.validar_chaves).trim() !== "false"

    if (!administradora_id) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const resultado = await sincronizarStatusFaturasComAsaas({
      administradoraId: String(administradora_id),
      financeiraId: financeira_id,
      modo,
      offset,
      limite,
      numeroFatura: numero_fatura,
      faturaId: fatura_id,
      periodo,
      validarChaves,
    })

    return NextResponse.json(resultado)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const status = msg.includes("não encontrada") || msg.includes("não encontrado") ? 404 : 500
    console.error("Erro na sincronização:", error)
    return NextResponse.json({ error: msg }, { status })
  }
}
