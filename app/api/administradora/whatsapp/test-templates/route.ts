import { NextRequest, NextResponse } from "next/server"
import {
  WHATSAPP_BILLING_EVENT_TYPES,
  isWhatsAppBillingEventType,
} from "@/lib/whatsapp-billing/event-types"
import {
  dispararTesteTemplateWhatsApp,
  dispararTodosTemplatesTeste,
  listarClientesParaTeste,
  listarTemplatesParaTeste,
  previewDadosTesteWhatsApp,
} from "@/lib/whatsapp-billing/test-templates"
import { montarPreviewMensagemWhatsApp } from "@/lib/whatsapp-billing/message-preview"

export const maxDuration = 60

/**
 * GET /api/administradora/whatsapp/test-templates
 * ?administradora_id= — templates + clientes iniciais
 * ?administradora_id=&q= — busca clientes (autocomplete)
 * ?administradora_id=&cliente_administradora_id= — prévia dos dados do cliente
 * ?administradora_id=&cliente_administradora_id=&event_type= — prévia da mensagem exata
 */
export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams
    const administradoraId = qs.get("administradora_id")?.trim()
    const clienteId = qs.get("cliente_administradora_id")?.trim()
    const eventType = qs.get("event_type")?.trim()
    const busca = qs.get("q")?.trim()

    if (administradoraId && eventType && isWhatsAppBillingEventType(eventType)) {
      const mensagem = await montarPreviewMensagemWhatsApp({
        administradoraId,
        eventType,
        clienteAdministradoraId: clienteId || undefined,
      })
      if ("erro" in mensagem) {
        return NextResponse.json({ error: mensagem.erro }, { status: 422 })
      }
      return NextResponse.json({ mensagem })
    }

    if (clienteId && administradoraId && !busca) {
      const preview = await previewDadosTesteWhatsApp({
        administradoraId,
        clienteAdministradoraId: clienteId,
      })
      if ("erro" in preview) {
        return NextResponse.json({ error: preview.erro }, { status: 422 })
      }
      return NextResponse.json({ preview })
    }

    if (administradoraId && qs.has("q")) {
      const clientes = await listarClientesParaTeste(administradoraId, busca)
      return NextResponse.json({ clientes })
    }

    const templates = await listarTemplatesParaTeste()
    const clientes = administradoraId ? await listarClientesParaTeste(administradoraId) : []

    return NextResponse.json({ templates, clientes })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao carregar dados de teste" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/administradora/whatsapp/test-templates
 * Body: { administradora_id, telefone, cliente_administradora_id?, event_type? | enviar_todos? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const administradoraId = String(body.administradora_id || "").trim()
    const telefone = String(body.telefone || "").trim()
    const clienteAdministradoraId = String(body.cliente_administradora_id || "").trim() || undefined
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
        clienteAdministradoraId,
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
      clienteAdministradoraId,
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
