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

    const buildQuery = () => {
      let q = supabaseAdmin
        .from("cancelamentos_beneficiarios")
        .select(`
        *,
        vida:vidas_importadas(id, nome, cpf, tipo, ativo, grupo_id, corretor_id, valor_mensal, dados_adicionais),
        grupo_origem:grupos_beneficiarios!cancelamentos_beneficiarios_grupo_origem_id_fkey(id, nome),
        grupo_destino:grupos_beneficiarios!cancelamentos_beneficiarios_grupo_destino_reativacao_id_fkey(id, nome)
      `)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .order("data_solicitacao", { ascending: false })

      if (status && ["solicitado", "processado_operadora", "reativado"].includes(status)) {
        q = q.eq("status_fluxo", status)
      }
      if (grupoId) {
        q = q.eq("grupo_origem_id", grupoId)
      }
      if (inicioSolicitacao) q = q.gte("data_solicitacao", `${inicioSolicitacao}T00:00:00.000Z`)
      if (fimSolicitacao) q = q.lte("data_solicitacao", `${fimSolicitacao}T23:59:59.999Z`)
      if (inicioProcessamento) q = q.gte("data_cancelamento_operadora", inicioProcessamento)
      if (fimProcessamento) q = q.lte("data_cancelamento_operadora", fimProcessamento)
      return q
    }

    const PAGE_SIZE = 1000
    const allData: unknown[] = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data: chunk, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      const list = chunk || []
      allData.push(...list)
      hasMore = list.length === PAGE_SIZE
      from += PAGE_SIZE
    }

    let lista = allData
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
