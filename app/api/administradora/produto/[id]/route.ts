import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/produto/[id]
 * Busca produto APENAS em produtos_contrato_administradora (contratos do portal administradora).
 * Não usa produtos de admin/corretores.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const tenantId = await getCurrentTenantId()

    let { data: pca } = await supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, nome, segmentacao, acomodacao, faixas")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!pca) {
      const fallback = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, nome, segmentacao, acomodacao, faixas")
        .eq("id", id)
        .maybeSingle()
      pca = fallback.data || null
    }

    if (pca) {
      return NextResponse.json(pca)
    }

    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
  } catch (e: unknown) {
    console.error("Erro produto:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    )
  }
}
