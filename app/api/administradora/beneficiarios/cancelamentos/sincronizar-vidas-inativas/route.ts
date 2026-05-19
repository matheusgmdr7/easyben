import { NextRequest, NextResponse } from "next/server"
import {
  resolverTenantIdAdministradora,
  sincronizarVidasInativasPorCancelamentos,
} from "@/lib/cancelamento-beneficiario-vida"

/**
 * POST — alinha vidas_importadas.ativo=false com cancelamentos abertos (solicitado / processado).
 * Body/query: administradora_id (obrigatório), grupo_id (opcional, escopo do grupo).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const administradoraId = String(
      body?.administradora_id || searchParams.get("administradora_id") || ""
    ).trim()
    const grupoId = String(body?.grupo_id || searchParams.get("grupo_id") || "").trim() || undefined

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const tenantId = await resolverTenantIdAdministradora(administradoraId)
    const resultado = await sincronizarVidasInativasPorCancelamentos({
      administradoraId,
      tenantId,
      grupoId,
    })

    return NextResponse.json({ success: true, ...resultado })
  } catch (e: unknown) {
    console.error("Erro sincronizar-vidas-inativas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao sincronizar vidas inativas" },
      { status: 500 }
    )
  }
}
