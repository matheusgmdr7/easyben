import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

function mascararTelefone(telefone: string | null | undefined): string {
  return String(telefone || "").replace(/\d(?=\d{4})/g, "*")
}

/**
 * GET /api/administradora/whatsapp/inbound-messages
 * ?administradora_id=&page=1&limit=20
 * ?administradora_id=&message_id= — detalhe
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams
  const administradoraId = qs.get("administradora_id")?.trim()
  if (!administradoraId) {
    return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
  }

  const messageId = qs.get("message_id")?.trim()
  if (messageId) {
    const { data: msg, error } = await supabaseAdmin
      .from("whatsapp_inbound_messages")
      .select(
        "id, message_sid, telefone, body, cliente_administradora_id, administradora_id, processed_at, created_at, raw_payload"
      )
      .eq("id", messageId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!msg) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }
    if (msg.administradora_id && msg.administradora_id !== administradoraId) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }
    if (!msg.administradora_id && msg.cliente_administradora_id) {
      const { data: cli } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("administradora_id")
        .eq("id", msg.cliente_administradora_id)
        .maybeSingle()
      if (cli?.administradora_id !== administradoraId) {
        return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
      }
    } else if (!msg.administradora_id && !msg.cliente_administradora_id) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    let clienteNome: string | null = null
    if (msg.cliente_administradora_id) {
      const { data: row } = await supabaseAdmin
        .from("vw_clientes_administradoras_completo")
        .select("cliente_nome")
        .eq("id", msg.cliente_administradora_id)
        .eq("administradora_id", administradoraId)
        .maybeSingle()
      clienteNome = row?.cliente_nome ? String(row.cliente_nome) : null
    }

    return NextResponse.json({
      message: {
        ...msg,
        cliente_nome: clienteNome,
        telefone_mascara: mascararTelefone(msg.telefone),
      },
    })
  }

  const page = Math.max(1, Number(qs.get("page")) || 1)
  const limit = Math.min(100, Math.max(1, Number(qs.get("limit")) || 20))
  const offset = (page - 1) * limit

  const { data, error, count } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .select(
      "id, message_sid, telefone, body, cliente_administradora_id, administradora_id, processed_at, created_at",
      { count: "exact" }
    )
    .eq("administradora_id", administradoraId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const clienteIdsPage = Array.from(
    new Set((data || []).map((m) => m.cliente_administradora_id).filter(Boolean))
  ) as string[]

  let nomesClientes: Record<string, string> = {}
  if (clienteIdsPage.length > 0) {
    const { data: clientes } = await supabaseAdmin
      .from("vw_clientes_administradoras_completo")
      .select("id, cliente_nome")
      .eq("administradora_id", administradoraId)
      .in("id", clienteIdsPage)

    for (const row of clientes || []) {
      if (row.id && row.cliente_nome) {
        nomesClientes[String(row.id)] = String(row.cliente_nome)
      }
    }
  }

  const messages = (data || []).map((m) => ({
    ...m,
    cliente_nome: m.cliente_administradora_id
      ? nomesClientes[String(m.cliente_administradora_id)] || null
      : null,
    telefone_mascara: mascararTelefone(m.telefone),
    body_preview: String(m.body || "").trim().slice(0, 120) || null,
  }))

  return NextResponse.json({
    messages,
    page,
    limit,
    total: count ?? 0,
    total_pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  })
}
