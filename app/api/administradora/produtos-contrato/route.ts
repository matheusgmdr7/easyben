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
    const contratoId = searchParams.get("contrato_id")

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    // Priorizar tenant da administradora para evitar mismatch de contexto em multi-tenant.
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
    const result: { id: string; nome: string; contrato_id: string }[] = []
    let contratoIds: string[] = []

    if (contratoId) {
      const { data: contratoUnico } = await supabaseAdmin
        .from("contratos_administradora")
        .select("id")
        .eq("id", contratoId)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (contratoUnico?.id) {
        contratoIds = [contratoUnico.id]
      } else {
        // Fallback para dados legados sem tenant_id preenchido
        const { data: contratoUnicoLegado } = await supabaseAdmin
          .from("contratos_administradora")
          .select("id")
          .eq("id", contratoId)
          .eq("administradora_id", administradoraId)
          .maybeSingle()
        if (contratoUnicoLegado?.id) contratoIds = [contratoUnicoLegado.id]
      }
    } else {
      const { data: contratos } = await supabaseAdmin
        .from("contratos_administradora")
        .select("id")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
      contratoIds = (contratos || []).map((c) => c.id).filter(Boolean)

      if (contratoIds.length === 0) {
        // Fallback para dados legados sem tenant_id preenchido
        const { data: contratosLegado } = await supabaseAdmin
          .from("contratos_administradora")
          .select("id")
          .eq("administradora_id", administradoraId)
        contratoIds = (contratosLegado || []).map((c) => c.id).filter(Boolean)
      }
    }

    if (contratoIds.length > 0) {
      let { data: prodsContrato } = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, nome, contrato_id")
        .in("contrato_id", contratoIds)
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true })

      if (!prodsContrato || prodsContrato.length === 0) {
        // Fallback para dados legados sem tenant_id preenchido
        const { data: prodsContratoLegado } = await supabaseAdmin
          .from("produtos_contrato_administradora")
          .select("id, nome, contrato_id")
          .in("contrato_id", contratoIds)
          .order("nome", { ascending: true })
        prodsContrato = prodsContratoLegado || []
      }

      ;(prodsContrato || []).forEach((p) => {
        result.push({ id: p.id, nome: p.nome || "-", contrato_id: p.contrato_id })
      })
    }

    // Fallback adicional: quando não houver produtos por contrato,
    // tentar produtos efetivamente usados em vidas importadas da administradora.
    if (result.length === 0) {
      let { data: vidasComProduto } = await supabaseAdmin
        .from("vidas_importadas")
        .select("produto_id")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .not("produto_id", "is", null)

      if (!vidasComProduto || vidasComProduto.length === 0) {
        // Fallback legado sem tenant_id
        const { data: vidasComProdutoLegado } = await supabaseAdmin
          .from("vidas_importadas")
          .select("produto_id")
          .eq("administradora_id", administradoraId)
          .not("produto_id", "is", null)
        vidasComProduto = vidasComProdutoLegado || []
      }

      const produtoIdsVidas = Array.from(
        new Set((vidasComProduto || []).map((v) => String(v.produto_id || "").trim()).filter(Boolean))
      )

      if (produtoIdsVidas.length > 0) {
        let { data: prodsPorVida } = await supabaseAdmin
          .from("produtos_contrato_administradora")
          .select("id, nome, contrato_id")
          .in("id", produtoIdsVidas)
          .eq("tenant_id", tenantId)
          .order("nome", { ascending: true })

        if (!prodsPorVida || prodsPorVida.length === 0) {
          const { data: prodsPorVidaLegado } = await supabaseAdmin
            .from("produtos_contrato_administradora")
            .select("id, nome, contrato_id")
            .in("id", produtoIdsVidas)
            .order("nome", { ascending: true })
          prodsPorVida = prodsPorVidaLegado || []
        }

        ;(prodsPorVida || []).forEach((p) => {
          result.push({ id: p.id, nome: p.nome || "-", contrato_id: p.contrato_id })
        })
      }
    }

    const unique = Array.from(
      new Map(result.map((item) => [item.id, item])).values()
    ).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))

    return NextResponse.json(unique)
  } catch (e: unknown) {
    console.error("Erro produtos-contrato:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar produtos" },
      { status: 500 }
    )
  }
}
