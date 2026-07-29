import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { WHATSAPP_BILLING_EVENT_LABELS } from "@/lib/whatsapp-billing/event-types"

/**
 * GET /api/administradora/whatsapp/messages?administradora_id=&page=1&limit=20&fatura_id=&event_type=
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams
  const administradoraId = qs.get("administradora_id")?.trim()
  if (!administradoraId) {
    return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
  }

  const page = Math.max(1, Number(qs.get("page")) || 1)
  const limit = Math.min(100, Math.max(1, Number(qs.get("limit")) || 20))
  const offset = (page - 1) * limit
  const faturaId = qs.get("fatura_id")?.trim()
  const eventType = qs.get("event_type")?.trim()

  let query = supabaseAdmin
    .from("whatsapp_messages")
    .select(
      "id, fatura_id, cliente_administradora_id, event_type, telefone, status, message_sid, reference_date, created_at, sent_at, delivered_at, read_at, failed_at, error_message",
      { count: "exact" }
    )
    .eq("administradora_id", administradoraId)
    .order("created_at", { ascending: false })

  if (faturaId) query = query.eq("fatura_id", faturaId)
  if (eventType) query = query.eq("event_type", eventType)

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const clienteIds = Array.from(
    new Set((data || []).map((m) => m.cliente_administradora_id).filter(Boolean))
  )

  let nomesClientes: Record<string, string> = {}
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, cliente_nome")
      .in("cliente_administradora_id", clienteIds)
      .limit(500)

    for (const row of clientes || []) {
      if (row.cliente_administradora_id && row.cliente_nome) {
        nomesClientes[row.cliente_administradora_id] = row.cliente_nome
      }
    }
  }

  const messages = (data || []).map((m) => ({
    ...m,
    event_label: WHATSAPP_BILLING_EVENT_LABELS[m.event_type as keyof typeof WHATSAPP_BILLING_EVENT_LABELS] || m.event_type,
    cliente_nome: nomesClientes[m.cliente_administradora_id] || null,
    telefone_mascara: String(m.telefone || "").replace(/\d(?=\d{4})/g, "*"),
  }))

  return NextResponse.json({
    messages,
    page,
    limit,
    total: count ?? 0,
    total_pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  })
}

/**
 * GET último status por fatura (batch) — query param fatura_ids=id1,id2,...
 * Reutiliza mesma rota com fatura_ids para painel de pendências.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { administradora_id?: string; fatura_ids?: string[] }
    const administradoraId = String(body.administradora_id || "").trim()
    const faturaIds = (body.fatura_ids || []).filter(Boolean)

    if (!administradoraId || faturaIds.length === 0) {
      return NextResponse.json({ por_fatura: {} })
    }

    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("fatura_id, status, event_type, created_at, delivered_at, read_at")
      .eq("administradora_id", administradoraId)
      .in("fatura_id", faturaIds.slice(0, 200))
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const porFatura: Record<
      string,
      { status: string; event_type: string; created_at: string; delivered_at?: string | null; read_at?: string | null }
    > = {}

    for (const row of data || []) {
      if (!row.fatura_id || porFatura[row.fatura_id]) continue
      porFatura[row.fatura_id] = row
    }

    return NextResponse.json({ por_fatura: porFatura })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar status" },
      { status: 500 }
    )
  }
}
