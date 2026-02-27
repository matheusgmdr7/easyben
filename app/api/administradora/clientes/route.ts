import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/clientes?administradora_id=xxx
 * Lista clientes da administradora para uso em Fatura > Gerar.
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }
    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabaseAdmin
      .from("vw_clientes_administradoras_completo")
      .select("id, administradora_id, proposta_id, cliente_nome, cliente_email, cliente_cpf, valor_mensal, status, data_vencimento")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .eq("status", "ativo")
      .order("cliente_nome", { ascending: true })
      .limit(500)

    if (error) {
      console.error("Erro ao listar clientes:", error)
      return NextResponse.json({ error: "Erro ao listar clientes" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e: unknown) {
    console.error("Erro clientes:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar clientes" },
      { status: 500 }
    )
  }
}
