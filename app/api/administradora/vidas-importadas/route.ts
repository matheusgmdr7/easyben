import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/vidas-importadas?grupo_id=xxx
 * GET /api/administradora/vidas-importadas?grupo_ids=id1,id2,id3
 * Lista vidas importadas para um grupo ou multiplos grupos.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grupoId = searchParams.get("grupo_id")
    const grupoIdsRaw = searchParams.get("grupo_ids")
    const grupoIds = (grupoIdsRaw || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
    const administradoraId = searchParams.get("administradora_id")
    const somenteAtivos = ["1", "true", "sim"].includes(
      String(searchParams.get("somente_ativos") || "").toLowerCase()
    )

    if (!grupoId && grupoIds.length === 0 && !administradoraId) {
      return NextResponse.json({ error: "grupo_id, grupo_ids ou administradora_id é obrigatório" }, { status: 400 })
    }

    let tenantId = await getCurrentTenantId()

    // Em ambiente local, pode não haver tenant_slug no header/cookie.
    // Quando administradora_id for informado, priorizamos o tenant vinculado à administradora.
    if (administradoraId) {
      const { data: admRow } = await supabaseAdmin
        .from("administradoras")
        .select("tenant_id")
        .eq("id", administradoraId)
        .maybeSingle()
      if (admRow?.tenant_id) tenantId = admRow.tenant_id
    }

    // Buscar todas as vidas em lotes (Supabase/PostgREST limitam a 1000 por request)
    const PAGE_SIZE = 1000
    const allData: any[] = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      let query = supabaseAdmin
        .from("vidas_importadas")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("tipo", { ascending: true })
        .order("nome", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (grupoIds.length > 0) {
        query = query.in("grupo_id", grupoIds)
      } else if (grupoId) {
        query = query.eq("grupo_id", grupoId)
      }
      if (administradoraId) {
        query = query.eq("administradora_id", administradoraId)
      }
      if (somenteAtivos) {
        query = query.neq("ativo", false)
      }
      const { data: chunk, error } = await query

      if (error) {
        console.error("Erro ao buscar vidas importadas:", error)
        return NextResponse.json({ error: "Erro ao buscar vidas importadas" }, { status: 500 })
      }

      const list = chunk || []
      allData.push(...list)
      hasMore = list.length === PAGE_SIZE
      from += PAGE_SIZE
    }

    return NextResponse.json(allData)
  } catch (e: unknown) {
    console.error("Erro vidas-importadas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar vidas" },
      { status: 500 }
    )
  }
}
