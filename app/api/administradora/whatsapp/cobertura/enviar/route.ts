import { NextRequest, NextResponse } from "next/server"
import { isWhatsAppBillingEventType } from "@/lib/whatsapp-billing/event-types"
import { enfileirarFaltantesCobertura, type CursorCobertura } from "@/lib/whatsapp-billing/reminders-pending"

export const maxDuration = 60

const LIMITE = 40
const ORCAMENTO_MS = 20_000

/**
 * POST /api/administradora/whatsapp/cobertura/enviar
 * Enfileira falhas e faturas que deveriam receber o aviso e ainda não entraram na fila.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const administradoraId = String(body.administradora_id || "").trim()
    const de = String(body.de || "").slice(0, 10)
    const ate = String(body.ate || "").slice(0, 10)
    const eventTypeRaw = String(body.event_type || "").trim()
    const staggerInicial = Number(body.stagger_inicial) || 0

    if (!administradoraId || !/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
      return NextResponse.json({ error: "administradora_id, de e ate são obrigatórios" }, { status: 400 })
    }
    if (de > ate) {
      return NextResponse.json({ error: "O período começa depois do fim" }, { status: 400 })
    }

    const inicio = new Date(`${de}T12:00:00.000Z`).getTime()
    const fim = new Date(`${ate}T12:00:00.000Z`).getTime()
    const dias = Math.round((fim - inicio) / 86_400_000) + 1
    if (dias > 62) {
      return NextResponse.json({ error: "Selecione no máximo 62 dias para este envio" }, { status: 400 })
    }

    let eventType: CursorCobertura["event_type"] | undefined
    if (eventTypeRaw) {
      if (!isWhatsAppBillingEventType(eventTypeRaw)) {
        return NextResponse.json({ error: "Evento inválido" }, { status: 400 })
      }
      eventType = eventTypeRaw
    }

    const cursorBruto = body.cursor as Partial<CursorCobertura> | null | undefined
    const cursor =
      cursorBruto && cursorBruto.reference_date && cursorBruto.event_type && isWhatsAppBillingEventType(cursorBruto.event_type)
        ? {
            reference_date: String(cursorBruto.reference_date).slice(0, 10),
            event_type: cursorBruto.event_type,
            apos_id: String(cursorBruto.apos_id || ""),
          }
        : null

    const resultado = await enfileirarFaltantesCobertura({
      administradoraId,
      de,
      ate,
      eventType,
      limite: LIMITE,
      staggerInicial,
      cursor,
      deadlineMs: Date.now() + ORCAMENTO_MS,
    })

    return NextResponse.json(resultado)
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "Erro ao enfileirar os avisos"
    const error =
      raw.includes("max requests limit exceeded") || raw.includes("ERR max requests")
        ? "Serviço de fila temporariamente indisponível: limite mensal do Redis (Upstash) esgotado."
        : raw
    return NextResponse.json({ error }, { status: 500 })
  }
}
