import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
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

    const { data: contratos, error } = await supabaseAdmin
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

    try {
      const idsContratos = result.map((r) => r.id).filter(Boolean)
      if (idsContratos.length > 0) {
        const { data: opcoes } = await supabaseAdmin
          .from("contratos_opcoes_administradora")
          .select("contrato_id, opcoes_dia_vencimento, opcoes_data_vigencia")
          .in("contrato_id", idsContratos)
        const mapOpcoes = new Map(
          (opcoes || []).map((o: any) => [
            String(o.contrato_id),
            {
              opcoes_dia_vencimento: Array.isArray(o.opcoes_dia_vencimento) ? o.opcoes_dia_vencimento : [],
              opcoes_data_vigencia: Array.isArray(o.opcoes_data_vigencia) ? o.opcoes_data_vigencia : [],
            },
          ])
        )
        return NextResponse.json(
          result.map((r) => ({
            ...r,
            ...(mapOpcoes.get(r.id) || { opcoes_dia_vencimento: [], opcoes_data_vigencia: [] }),
          }))
        )
      }
    } catch {
      // tabela opcional
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    console.error("Erro listar contratos:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar contratos" },
      { status: 500 }
    )
  }
}
