import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

async function resolverTenantDaAdministradora(administradoraId: string): Promise<string> {
  const { data: adm } = await supabaseAdmin
    .from("administradoras")
    .select("tenant_id")
    .eq("id", administradoraId)
    .maybeSingle()
  if (adm?.tenant_id) return adm.tenant_id
  return getCurrentTenantId()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body?.administradora_id || "").trim()
    const cancelamentoId = String(body?.cancelamento_id || "").trim()
    const dataCancelamentoOperadora = String(body?.data_cancelamento_operadora || "").trim()
    const observacao = String(body?.observacao_processamento || "").trim()

    if (!administradoraId || !cancelamentoId || !dataCancelamentoOperadora) {
      return NextResponse.json(
        { error: "administradora_id, cancelamento_id e data_cancelamento_operadora são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await resolverTenantDaAdministradora(administradoraId)

    const { data: atual, error: errAtual } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("id, status_fluxo")
      .eq("id", cancelamentoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (errAtual) throw errAtual
    if (!atual) return NextResponse.json({ error: "Registro de cancelamento não encontrado" }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .update({
        status_fluxo: "processado_operadora",
        data_cancelamento_operadora: dataCancelamentoOperadora,
        observacao_processamento: observacao || null,
      })
      .eq("id", cancelamentoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .select("*")
      .maybeSingle()
    if (error) throw error

    return NextResponse.json({ success: true, registro: data })
  } catch (e: unknown) {
    console.error("Erro ao processar cancelamento:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao processar cancelamento" },
      { status: 500 }
    )
  }
}
