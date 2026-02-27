import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/vidas-importadas?grupo_id=xxx
 * Lista vidas importadas para o grupo (usado na página de detalhes do grupo).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grupoId = searchParams.get("grupo_id")

    if (!grupoId) {
      return NextResponse.json({ error: "grupo_id é obrigatório" }, { status: 400 })
    }

    const tenantId = await getCurrentTenantId()

    // Buscar todas as vidas em lotes (Supabase/PostgREST limitam a 1000 por request)
    const PAGE_SIZE = 1000
    const allData: any[] = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data: chunk, error } = await supabaseAdmin
        .from("vidas_importadas")
        .select("*")
        .eq("grupo_id", grupoId)
        .eq("tenant_id", tenantId)
        .order("tipo", { ascending: true })
        .order("nome", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

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
