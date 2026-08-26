import { NextRequest, NextResponse } from "next/server"
import { executarCronRecuperacaoWhatsApp } from "@/lib/whatsapp-billing/recovery-cron"

export const maxDuration = 300

function autorizadoCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

/**
 * Cron de recuperação: reenfileira mensagens failed/failed_permanent
 * com códigos retentáveis (63017, 63018, 20429) das últimas 72h.
 * Query: dry_run=1
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
    const dryRun = request.nextUrl.searchParams.get("dry_run") === "1"
    const resultado = await executarCronRecuperacaoWhatsApp({ dryRun })
    return NextResponse.json(resultado)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no cron de recuperação WhatsApp" },
      { status: 500 }
    )
  }
}
