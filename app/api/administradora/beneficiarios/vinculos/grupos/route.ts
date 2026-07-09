import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"

/**
 * GET /api/administradora/beneficiarios/vinculos/grupos?administradora_id=
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim()
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const tenantId = await resolveTenantIdForAdministradora(administradoraId)

    let query = supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome, status")
      .eq("administradora_id", administradoraId)
      .order("nome", { ascending: true })

    if (tenantId) query = query.eq("tenant_id", tenantId)

    const { data, error } = await query
    if (error) {
      console.error("Erro ao listar grupos para vínculos:", error)
      return NextResponse.json({ error: "Erro ao listar grupos" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e: unknown) {
    console.error("Erro GET vínculos/grupos:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar grupos" },
      { status: 500 }
    )
  }
}
