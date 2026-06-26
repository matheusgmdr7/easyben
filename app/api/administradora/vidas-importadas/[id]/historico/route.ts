import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"

/**
 * GET /api/administradora/vidas-importadas/[id]/historico
 * Lista o histórico de edições de uma vida importada.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim() || ""
    const tenantId = administradoraId
      ? await resolveTenantIdForAdministradora(administradoraId)
      : await getCurrentTenantId()

    let query = supabaseAdmin
      .from("vidas_importadas_historico")
      .select("id, alteracoes, created_at")
      .eq("vida_id", id)
    if (tenantId) query = query.eq("tenant_id", tenantId)

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Erro ao buscar histórico:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])
  } catch (e: unknown) {
    console.error("Erro historico:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    )
  }
}
