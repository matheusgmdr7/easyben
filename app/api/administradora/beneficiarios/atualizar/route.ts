import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body?.administradora_id || "")
    const propostaId = String(body?.proposta_id || "")
    const dadosBasicos = (body?.dados_basicos || {}) as Record<string, unknown>
    const contato = (body?.contato || {}) as Record<string, unknown>

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório." }, { status: 400 })
    }
    if (!propostaId) {
      return NextResponse.json({ error: "proposta_id é obrigatório." }, { status: 400 })
    }

    const tenantId = await getCurrentTenantId()

    const payload: Record<string, unknown> = {}

    if ("nome" in dadosBasicos) payload.nome = String(dadosBasicos.nome || "").trim()
    if ("cpf" in dadosBasicos) payload.cpf = String(dadosBasicos.cpf || "").replace(/\D/g, "")
    if ("data_nascimento" in dadosBasicos) payload.data_nascimento = dadosBasicos.data_nascimento || null

    if ("email" in contato) payload.email = String(contato.email || "").trim()
    if ("telefone" in contato) payload.telefone = String(contato.telefone || "").trim()
    if ("cep" in contato) payload.cep = String(contato.cep || "").replace(/\D/g, "")
    if ("cidade" in contato) payload.cidade = String(contato.cidade || "").trim()
    if ("estado" in contato) payload.estado = String(contato.estado || "").trim().toUpperCase()
    if ("bairro" in contato) payload.bairro = String(contato.bairro || "").trim()
    if ("logradouro" in contato) payload.endereco = String(contato.logradouro || "").trim()
    if ("numero" in contato) payload.numero = String(contato.numero || "").trim()
    if ("complemento" in contato) payload.complemento = String(contato.complemento || "").trim()

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 })
    }

    const { error: errCliente } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id")
      .eq("proposta_id", propostaId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (errCliente) {
      console.error("Erro ao validar cliente_administradora da proposta:", errCliente)
      return NextResponse.json({ error: "Erro ao validar vínculo da administradora." }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from("propostas")
      .update(payload)
      .eq("id", propostaId)
      .eq("tenant_id", tenantId)
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("Erro ao atualizar proposta do beneficiário:", error)
      return NextResponse.json({ error: error.message || "Erro ao atualizar beneficiário." }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Beneficiário não encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Erro ao atualizar beneficiário:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar beneficiário." },
      { status: 500 }
    )
  }
}
