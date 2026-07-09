import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { mapearVidaParaFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"

/**
 * GET /api/administradora/beneficiarios/vinculos/grupo-vidas?administradora_id=&grupo_id=
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim()
    const grupoId = request.nextUrl.searchParams.get("grupo_id")?.trim()
    if (!administradoraId || !grupoId) {
      return NextResponse.json({ error: "administradora_id e grupo_id são obrigatórios" }, { status: 400 })
    }

    const tenantId = await resolveTenantIdForAdministradora(administradoraId)
    const somenteAtivos = request.nextUrl.searchParams.get("somente_ativos") !== "0"

    let query = supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, cpf, tipo, ativo, data_nascimento, grupo_id")
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradoraId)
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true })

    if (tenantId) query = query.eq("tenant_id", tenantId)
    if (somenteAtivos) query = query.neq("ativo", false)

    const { data, error } = await query
    if (error) {
      console.error("Erro ao listar vidas do grupo:", error)
      return NextResponse.json({ error: "Erro ao listar beneficiários do grupo" }, { status: 500 })
    }

    const lista = (data || []).map((v) => {
      const auto = mapearVidaParaFichaAdmissao(v as Record<string, unknown>)
      const faltando: string[] = []
      if (!auto.endereco_completo) faltando.push("endereco")
      if (!auto.rg) faltando.push("rg")
      if (!auto.orgao_emissor) faltando.push("orgao_emissor")
      if (!auto.local_nascimento) faltando.push("local_nascimento")
      return {
        id: v.id,
        nome: v.nome,
        cpf: v.cpf,
        tipo: v.tipo,
        ativo: v.ativo !== false,
        faltando,
      }
    })

    return NextResponse.json(lista)
  } catch (e: unknown) {
    console.error("Erro GET vínculos/grupo-vidas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar beneficiários" },
      { status: 500 }
    )
  }
}
