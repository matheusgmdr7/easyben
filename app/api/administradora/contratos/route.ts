import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/contratos?administradora_id=xxx
 * Lista contratos da administradora (contratos_administradora) criados em contrato/novo.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const administradoraId = searchParams.get("administradora_id")

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    // Priorizar tenant da administradora para evitar mismatch de contexto.
    let tenantId: string
    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()
    if (adm?.tenant_id) {
      tenantId = adm.tenant_id
    } else {
      tenantId = await getCurrentTenantId()
    }

    let { data: contratos, error } = await supabaseAdmin
      .from("contratos_administradora")
      .select(`
        id,
        numero,
        descricao,
        razao_social,
        nome_fantasia,
        logo,
        observacao,
        created_at
      `)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (!error && (!contratos || contratos.length === 0)) {
      // Fallback para dados legados sem tenant_id preenchido
      const fallback = await supabaseAdmin
        .from("contratos_administradora")
        .select(`
          id,
          numero,
          descricao,
          razao_social,
          nome_fantasia,
          logo,
          observacao,
          created_at
        `)
        .eq("administradora_id", administradoraId)
        .order("created_at", { ascending: false })

      contratos = fallback.data || []
      error = fallback.error as any
    }

    if (error) {
      console.error("Erro ao buscar contratos:", error)
      return NextResponse.json(
        { error: "Erro ao buscar contratos. Execute scripts/criar-tabelas-contratos-administradora.sql no Supabase." },
        { status: 500 }
      )
    }

    // Buscar quantidade de produtos por contrato
    const ids = (contratos || []).map((c) => c.id)
    let produtosCount: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: counts } = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("contrato_id")
        .in("contrato_id", ids)

      if (counts) {
        counts.forEach((r) => {
          const cid = r.contrato_id
          produtosCount[cid] = (produtosCount[cid] || 0) + 1
        })
      }
    }

    const result = (contratos || []).map((c) => ({
      ...c,
      operadora_nome: c.nome_fantasia || c.razao_social || "-",
      produtos_count: produtosCount[c.id] || 0,
    }))

    return NextResponse.json(result)
  } catch (e: unknown) {
    console.error("Erro listar contratos:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar contratos" },
      { status: 500 }
    )
  }
}
