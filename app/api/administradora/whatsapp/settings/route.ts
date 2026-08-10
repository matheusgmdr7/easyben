import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  WHATSAPP_BILLING_EVENT_TYPES,
  WHATSAPP_BILLING_EVENT_LABELS,
  type WhatsAppBillingEventType,
} from "@/lib/whatsapp-billing/event-types"

const DEFAULT_EVENTOS: Record<string, boolean> = Object.fromEntries(
  WHATSAPP_BILLING_EVENT_TYPES.map((e) => [e, true])
)

function normalizarSettings(row: Record<string, unknown> | null, administradoraId: string) {
  const eventos = (row?.eventos_ativos as Record<string, boolean>) || DEFAULT_EVENTOS
  const tardeRaw = row?.horario_envio_tarde
  const horarioTarde =
    tardeRaw == null || String(tardeRaw).trim() === ""
      ? null
      : String(tardeRaw).slice(0, 8)
  return {
    administradora_id: administradoraId,
    whatsapp_automatico_ativo: Boolean(row?.whatsapp_automatico_ativo),
    horario_envio: String(row?.horario_envio || "09:00:00").slice(0, 8),
    horario_envio_tarde: horarioTarde,
    eventos_ativos: { ...DEFAULT_EVENTOS, ...eventos },
    telefone_suporte_whatsapp: row?.telefone_suporte_whatsapp ?? null,
    url_portal_cliente: row?.url_portal_cliente ?? null,
  }
}

/**
 * GET /api/administradora/whatsapp/settings?administradora_id=
 */
export async function GET(request: NextRequest) {
  const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim()
  if (!administradoraId) {
    return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("billing_notification_settings")
    .select("*")
    .eq("administradora_id", administradoraId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    settings: normalizarSettings(data as Record<string, unknown> | null, administradoraId),
    event_labels: WHATSAPP_BILLING_EVENT_LABELS,
    event_types: WHATSAPP_BILLING_EVENT_TYPES,
  })
}

/**
 * PATCH /api/administradora/whatsapp/settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const administradoraId = String(body.administradora_id || "").trim()
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const payload: Record<string, unknown> = {
      administradora_id: administradoraId,
      updated_at: new Date().toISOString(),
    }

    if (body.whatsapp_automatico_ativo !== undefined) {
      payload.whatsapp_automatico_ativo = Boolean(body.whatsapp_automatico_ativo)
    }
    if (body.horario_envio !== undefined) {
      const h = String(body.horario_envio).trim()
      payload.horario_envio = h.length === 5 ? `${h}:00` : h
    }
    if (body.horario_envio_tarde !== undefined) {
      const raw = body.horario_envio_tarde
      if (raw == null || String(raw).trim() === "") {
        payload.horario_envio_tarde = null
      } else {
        const h = String(raw).trim()
        payload.horario_envio_tarde = h.length === 5 ? `${h}:00` : h
      }
    }
    if (body.eventos_ativos !== undefined && typeof body.eventos_ativos === "object") {
      payload.eventos_ativos = body.eventos_ativos
    }
    if (body.telefone_suporte_whatsapp !== undefined) {
      payload.telefone_suporte_whatsapp = body.telefone_suporte_whatsapp || null
    }
    if (body.url_portal_cliente !== undefined) {
      payload.url_portal_cliente = body.url_portal_cliente || null
    }

    const { data: existente } = await supabaseAdmin
      .from("billing_notification_settings")
      .select("administradora_id")
      .eq("administradora_id", administradoraId)
      .maybeSingle()

    let saved
    if (existente) {
      const { data, error } = await supabaseAdmin
        .from("billing_notification_settings")
        .update(payload)
        .eq("administradora_id", administradoraId)
        .select("*")
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saved = data
    } else {
      const { data, error } = await supabaseAdmin
        .from("billing_notification_settings")
        .insert({
          ...payload,
          whatsapp_automatico_ativo: payload.whatsapp_automatico_ativo ?? false,
          horario_envio: payload.horario_envio ?? "09:00:00",
          horario_envio_tarde: payload.horario_envio_tarde ?? "15:00:00",
          eventos_ativos: payload.eventos_ativos ?? DEFAULT_EVENTOS,
        })
        .select("*")
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saved = data
    }

    return NextResponse.json({
      settings: normalizarSettings(saved as Record<string, unknown>, administradoraId),
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar configurações" },
      { status: 500 }
    )
  }
}
