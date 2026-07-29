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
 * Agende 1x/dia (ex.: 12:00 UTC = 09:00 BRT) com Authorization: Bearer CRON_SECRET.
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
    const resultado = await executarCronLembretesWhatsApp({ ignorarHorario })
    return NextResponse.json(resultado)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no cron de lembretes" },
      { status: 500 }
    )
  }
}
