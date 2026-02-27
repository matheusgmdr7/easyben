import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * PUT /api/administradora/grupos/[id]/corretor-vidas
 * Define o corretor para todas as vidas importadas do grupo.
 * Body: { administradora_id: string, corretor_id: string | null }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: grupoId } = await params
    const body = await request.json()
    const { administradora_id, corretor_id } = body

    if (!administradora_id || !grupoId) {
      return NextResponse.json(
        { error: "administradora_id e grupo_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()

    const { data: grupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id")
      .eq("id", grupoId)
      .eq("administradora_id", administradora_id)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from("vidas_importadas")
      .update({
        corretor_id: corretor_id === "" || corretor_id === undefined ? null : corretor_id,
      })
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradora_id)
      .select("id")

    if (error) {
      console.error("Erro ao atualizar corretor das vidas:", error)
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      atualizadas: (data || []).length,
    })
  } catch (e: unknown) {
    console.error("Erro PUT corretor-vidas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar" },
      { status: 500 }
    )
  }
}
