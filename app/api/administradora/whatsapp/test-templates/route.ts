import { NextRequest, NextResponse } from "next/server"
import {
  WHATSAPP_BILLING_EVENT_TYPES,
  isWhatsAppBillingEventType,
} from "@/lib/whatsapp-billing/event-types"
import {
  dispararTesteTemplateWhatsApp,
  dispararTodosTemplatesTeste,
  listarTemplatesParaTeste,
} from "@/lib/whatsapp-billing/test-templates"

export const maxDuration = 60

/**
 * GET /api/administradora/whatsapp/test-templates
 * Lista modelos disponíveis para envio de teste.
 */
export async function GET() {
  try {
    const templates = await listarTemplatesParaTeste()
    return NextResponse.json({ templates })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao listar templates" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/administradora/whatsapp/test-templates
 * Body: { administradora_id, telefone, event_type? | enviar_todos?: true }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const administradoraId = String(body.administradora_id || "").trim()
    const telefone = String(body.telefone || "").trim()
    const enviarTodos = body.enviar_todos === true

    if (!administradoraId || !telefone) {
      return NextResponse.json(
        { error: "administradora_id e telefone são obrigatórios" },
        { status: 400 }
      )
    }

    if (enviarTodos) {
      const eventTypesRaw = Array.isArray(body.event_types) ? body.event_types : undefined
      const eventTypes = eventTypesRaw
        ?.map((e) => String(e))
        .filter((e): e is (typeof WHATSAPP_BILLING_EVENT_TYPES)[number] =>
          isWhatsAppBillingEventType(e)
        )

      const result = await dispararTodosTemplatesTeste({
        administradoraId,
        telefone,
        eventTypes: eventTypes?.length ? eventTypes : undefined,
      })

      if (result.enfileirados === 0) {
        return NextResponse.json(
          {
            error: "Nenhum modelo enfileirado. Verifique templates ativos e telefone.",
            ...result,
          },
          { status: 422 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `${result.enfileirados} modelo(s) enfileirado(s) para teste.`,
        ...result,
      })
    }

    const eventType = String(body.event_type || "").trim()
    if (!isWhatsAppBillingEventType(eventType)) {
      return NextResponse.json({ error: "event_type inválido" }, { status: 400 })
    }

    const result = await dispararTesteTemplateWhatsApp({
      administradoraId,
      telefone,
      eventType,
    })

    if (!result.enqueued) {
      const msg =
        result.reason === "telefone_invalido"
          ? "Telefone inválido"
          : result.reason === "template_indisponivel"
            ? "Template não configurado ou inativo"
            : "Não foi possível enfileirar o teste"
      return NextResponse.json({ enqueued: false, reason: result.reason, error: msg }, { status: 422 })
    }

    return NextResponse.json({
      enqueued: true,
      event_type: eventType,
      jobId: result.jobId,
      message: "Modelo de teste enfileirado. O envio ocorre em instantes pelo worker WhatsApp.",
    })
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "Erro ao enviar teste"
    const error =
      raw.includes("max requests limit exceeded") || raw.includes("ERR max requests")
        ? "Serviço de fila temporariamente indisponível (Redis). Tente novamente mais tarde."
        : raw
    return NextResponse.json({ error }, { status: 503 })
  }
}
