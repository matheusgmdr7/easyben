import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/produtos-contrato?administradora_id=xxx
 * Lista APENAS produtos de contratos criados em /administradora/contrato/novo.
 * O portal da administradora é independente - não usa produtos de admin/corretores.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const administradoraId = searchParams.get("administradora_id")

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const tenantId = await getCurrentTenantId()
    const result: { id: string; nome: string }[] = []

    const { data: contratos } = await supabaseAdmin
      .from("contratos_administradora")
      .select("id")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    const contratoIds = (contratos || []).map((c) => c.id).filter(Boolean)
    if (contratoIds.length > 0) {
      const { data: prodsContrato } = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, nome")
        .in("contrato_id", contratoIds)
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true })

      ;(prodsContrato || []).forEach((p) => {
        result.push({ id: p.id, nome: p.nome || "-" })
      })
    }

    const unique = result.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))

    return NextResponse.json(unique)
  } catch (e: unknown) {
    console.error("Erro produtos-contrato:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar produtos" },
      { status: 500 }
    )
  }
}
