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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const administradoraId = searchParams.get("administradora_id")
    const status = String(searchParams.get("status") || "").trim().toLowerCase()
    const grupoId = String(searchParams.get("grupo_id") || "").trim()
    const corretorId = String(searchParams.get("corretor_id") || "").trim()
    const inicioSolicitacao = String(searchParams.get("inicio_solicitacao") || "").trim()
    const fimSolicitacao = String(searchParams.get("fim_solicitacao") || "").trim()
    const inicioProcessamento = String(searchParams.get("inicio_processamento") || "").trim()
    const fimProcessamento = String(searchParams.get("fim_processamento") || "").trim()

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const tenantId = await resolverTenantDaAdministradora(administradoraId)

    let query = supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select(`
        *,
        vida:vidas_importadas(id, nome, cpf, tipo, ativo, grupo_id, corretor_id, valor_mensal),
        grupo_origem:grupos_beneficiarios!cancelamentos_beneficiarios_grupo_origem_id_fkey(id, nome),
        grupo_destino:grupos_beneficiarios!cancelamentos_beneficiarios_grupo_destino_reativacao_id_fkey(id, nome)
      `)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .order("data_solicitacao", { ascending: false })

    if (status && ["solicitado", "processado_operadora", "reativado"].includes(status)) {
      query = query.eq("status_fluxo", status)
    }
    if (grupoId) {
      query = query.eq("grupo_origem_id", grupoId)
    }

    if (inicioSolicitacao) query = query.gte("data_solicitacao", `${inicioSolicitacao}T00:00:00.000Z`)
    if (fimSolicitacao) query = query.lte("data_solicitacao", `${fimSolicitacao}T23:59:59.999Z`)
    if (inicioProcessamento) query = query.gte("data_cancelamento_operadora", inicioProcessamento)
    if (fimProcessamento) query = query.lte("data_cancelamento_operadora", fimProcessamento)

    const { data, error } = await query
    if (error) throw error

    let lista = Array.isArray(data) ? data : []
    if (corretorId) {
      lista = lista.filter((item: any) => String(item?.vida?.corretor_id || "") === corretorId)
    }

    return NextResponse.json(lista)
  } catch (e: unknown) {
    console.error("Erro ao listar cancelamentos:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar cancelamentos" },
      { status: 500 }
    )
  }
}
