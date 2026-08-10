import { NextRequest, NextResponse } from "next/server"
import { executarCronLembretesWhatsApp } from "@/lib/whatsapp-billing/reminders-cron"

export const maxDuration = 300

function autorizadoCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

/**
 * Cron diário: lembretes D-5, D-1, D0, D+3, D+7, D+15, D+25.
 * Agende manhã (12:00 UTC = 09:00 BRT) e tarde (18:00 UTC = 15:00 BRT).
 * Query: janela=manha|tarde, ignorar_horario=1
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
    const ignorarHorario = request.nextUrl.searchParams.get("ignorar_horario") === "1"
    const janelaParam = request.nextUrl.searchParams.get("janela")?.trim()
    const janela = janelaParam === "tarde" ? "tarde" : "manha"
    const resultado = await executarCronLembretesWhatsApp({ ignorarHorario, janela })
    return NextResponse.json(resultado)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no cron de lembretes" },
      { status: 500 }
    )
  }
}
