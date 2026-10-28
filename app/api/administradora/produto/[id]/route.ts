import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { erroColunaNomePlano, lerNomePlanoProduto } from "@/lib/nome-plano-produto"

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

    const selecionar = async (comNomePlano: boolean, filtrarTenant: boolean) => {
      let query = supabaseAdmin
        .from("produtos_contrato_administradora")
        .select(comNomePlano ? "id, nome, nome_plano, segmentacao, acomodacao, faixas" : "id, nome, segmentacao, acomodacao, faixas")
        .eq("id", id)
      if (filtrarTenant) query = query.eq("tenant_id", tenantId)
      return query.maybeSingle()
    }

    let { data: pca, error } = await selecionar(true, true)
    if (erroColunaNomePlano(error)) {
      const retry = await selecionar(false, true)
      pca = retry.data
      error = retry.error
    }

    if (!pca) {
      let fallback = await selecionar(true, false)
      if (erroColunaNomePlano(fallback.error)) fallback = await selecionar(false, false)
      pca = fallback.data || null
    }

    if (pca) {
      return NextResponse.json({ ...pca, nome_plano: lerNomePlanoProduto(pca) })
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
