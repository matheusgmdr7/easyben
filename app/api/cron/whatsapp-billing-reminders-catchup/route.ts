import { NextRequest, NextResponse } from "next/server"
import { executarCronCatchupLembretesVencimento } from "@/lib/whatsapp-billing/reminders-catchup-cron"

export const maxDuration = 300

function autorizadoCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

/**
 * Catch-up D0/D-1: enfileira faturas elegíveis sem envio bem-sucedido no dia.
 * Agende a cada 15 min entre 08h–12h BRT (11–15 UTC).
 */
export async function GET(request: NextRequest) {
  return executarJob(request)
}

export async function POST(request: NextRequest) {
  return executarJob(request)
}

async function executarJob(request: NextRequest) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const maxParam = request.nextUrl.searchParams.get("max")
    const maxPorEvento = maxParam ? Math.min(200, Math.max(1, Number(maxParam) || 80)) : undefined
    const resultado = await executarCronCatchupLembretesVencimento({ maxPorEvento })
    return NextResponse.json(resultado)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no catch-up de lembretes" },
      { status: 500 }
    )
  }
}
