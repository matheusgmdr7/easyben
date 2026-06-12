import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import {
  normalizarCorretorIdVinculo,
  sincronizarCorretorClienteEVidas,
} from "@/lib/corretor-cliente-vinculo"

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

    const corretorIdFinal = normalizarCorretorIdVinculo(corretor_id)

    const sync = await sincronizarCorretorClienteEVidas({
      administradoraId: administradora_id,
      tenantId,
      corretorId: corretorIdFinal,
      grupoId,
      registrarHistoricoVidas: true,
    })

    return NextResponse.json({
      success: true,
      atualizadas: sync.vidasAtualizadas,
      clientes_sincronizados: sync.clientesAtualizados,
    })
  } catch (e: unknown) {
    console.error("Erro PUT corretor-vidas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar" },
      { status: 500 }
    )
  }
}
