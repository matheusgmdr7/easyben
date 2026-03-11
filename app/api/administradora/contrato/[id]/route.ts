import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/contrato/[id]
 * Retorna detalhes do contrato com produtos.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "ID do contrato é obrigatório" }, { status: 400 })
    }

    // Primeiro tenta por tenant atual; se não encontrar, fallback por ID (dados legados sem tenant_id).
    const tenantIdAtual = await getCurrentTenantId()

    let { data: contrato, error: errContrato } = await supabaseAdmin
      .from("contratos_administradora")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantIdAtual)
      .single()

    if (errContrato || !contrato) {
      const fallbackContrato = await supabaseAdmin
        .from("contratos_administradora")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      contrato = fallbackContrato.data
      errContrato = fallbackContrato.error as any
    }

    if (errContrato || !contrato) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 })
    }

    const tenantContrato = (contrato as any)?.tenant_id ? String((contrato as any).tenant_id) : null

    let produtos: Array<Record<string, any>> = []
    let queryProdutos = supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, nome, segmentacao, acomodacao, faixas")
      .eq("contrato_id", id)
      .order("created_at", { ascending: true })
    if (tenantContrato) queryProdutos = queryProdutos.eq("tenant_id", tenantContrato)

    const produtosCompletos = await queryProdutos
    if (!produtosCompletos.error) {
      produtos = (produtosCompletos.data as Array<Record<string, any>>) || []
    } else {
      // Fallback para schema legado sem colunas novas (ex.: acomodacao/faixas).
      let queryProdutosLegado = supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, nome, segmentacao")
        .eq("contrato_id", id)
      if (tenantContrato) queryProdutosLegado = queryProdutosLegado.eq("tenant_id", tenantContrato)
      const legado = await queryProdutosLegado
      produtos = ((legado.data as Array<Record<string, any>>) || []).map((p) => ({
        ...p,
        acomodacao: null,
        faixas: [],
      }))
    }

    if (produtos.length === 0 && tenantContrato) {
      // Fallback legado sem tenant_id em produtos
      const produtosLegado = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, nome, segmentacao, acomodacao, faixas")
        .eq("contrato_id", id)
        .order("created_at", { ascending: true })

      if (!produtosLegado.error) {
        produtos = (produtosLegado.data as Array<Record<string, any>>) || []
      } else {
        const legadoMin = await supabaseAdmin
          .from("produtos_contrato_administradora")
          .select("id, nome, segmentacao")
          .eq("contrato_id", id)
        produtos = ((legadoMin.data as Array<Record<string, any>>) || []).map((p) => ({
          ...p,
          acomodacao: null,
          faixas: [],
        }))
      }
    }

    // Fallback final: produtos legados armazenados diretamente no registro do contrato.
    // Evita misturar produtos de outros contratos.
    if (produtos.length === 0) {
      const produtosContratoLegado = (contrato as any)?.produtos
      const arrLegado = Array.isArray(produtosContratoLegado) ? produtosContratoLegado : []
      produtos = arrLegado
        .map((p: any, idx: number) => ({
          id: String(p?.id || `legacy-${idx}`),
          nome: String(p?.nome || p?.descricao || "").trim() || `Produto ${idx + 1}`,
          segmentacao: String(p?.segmentacao || "Padrão"),
          acomodacao: p?.acomodacao ?? null,
          faixas: p?.faixas ?? p?.faixas_por_acomodacao ?? [],
        }))
        .filter((p: any) => String(p.nome || "").trim().length > 0)
    }

    type FaixasPorAcomodacao = { Enfermaria: Array<{ faixa_etaria: string; valor: string }>; Apartamento: Array<{ faixa_etaria: string; valor: string }> }
    const faixasParsed = (produtos || []).map((p) => {
      let faixas: unknown = p.faixas
      if (typeof p.faixas === "string") {
        try {
          faixas = JSON.parse(p.faixas || "[]")
        } catch {
          faixas = []
        }
      }
      if (Array.isArray(faixas)) {
        return { ...p, faixas: { Enfermaria: faixas, Apartamento: [] } as FaixasPorAcomodacao }
      }
      if (faixas && typeof faixas === "object" && "Enfermaria" in faixas && "Apartamento" in faixas) {
        return { ...p, faixas: faixas as FaixasPorAcomodacao }
      }
      return { ...p, faixas: { Enfermaria: [], Apartamento: [] } as FaixasPorAcomodacao }
    })

    return NextResponse.json({
      ...contrato,
      operadora_nome: contrato.nome_fantasia || contrato.razao_social || "-",
      produtos: faixasParsed,
    })
  } catch (e: unknown) {
    console.error("Erro buscar contrato:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar contrato" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/administradora/contrato/[id]
 * Atualiza contrato (dados básicos) e produtos.
 * Produtos: substitui todos pelos enviados (delete + insert).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "ID do contrato é obrigatório" }, { status: 400 })
    }

    const body = await request.json()
    const { descricao, numero, observacao, logo, produtos = [] } = body as {
      descricao?: string
      numero?: string
      observacao?: string
      logo?: string
      produtos?: Array<{
        id?: string
        nome: string
        segmentacao?: string
        acomodacao?: string
        faixas?: Array<{ faixa_etaria: string; valor: string }>
        faixas_por_acomodacao?: { Enfermaria: Array<{ faixa_etaria: string; valor: string }>; Apartamento: Array<{ faixa_etaria: string; valor: string }> }
      }>
    }

    const tenantIdAtual = await getCurrentTenantId()

    let { data: existente, error: errExist } = await supabaseAdmin
      .from("contratos_administradora")
      .select("id, tenant_id")
      .eq("id", id)
      .eq("tenant_id", tenantIdAtual)
      .single()

    if (errExist || !existente) {
      const fallbackExistente = await supabaseAdmin
        .from("contratos_administradora")
        .select("id, tenant_id")
        .eq("id", id)
        .maybeSingle()
      existente = fallbackExistente.data as any
      errExist = fallbackExistente.error as any
    }

    if (errExist || !existente) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 })
    }

    const tenantContrato = (existente as any)?.tenant_id ? String((existente as any).tenant_id) : null

    const atualizar: Record<string, unknown> = {}
    if (descricao !== undefined) atualizar.descricao = String(descricao).trim()
    if (numero !== undefined) atualizar.numero = String(numero).trim()
    if (observacao !== undefined) atualizar.observacao = observacao ? String(observacao).trim() : null
    if (logo !== undefined) atualizar.logo = logo ? String(logo).trim() : null

    if (Object.keys(atualizar).length > 0) {
      let queryAtualizarContrato = supabaseAdmin
        .from("contratos_administradora")
        .update(atualizar)
        .eq("id", id)
      if (tenantContrato) queryAtualizarContrato = queryAtualizarContrato.eq("tenant_id", tenantContrato)
      const { error: errUpd } = await queryAtualizarContrato

      if (errUpd) {
        console.error("Erro ao atualizar contrato:", errUpd)
        return NextResponse.json({ error: "Erro ao atualizar contrato" }, { status: 500 })
      }
    }

    if (Array.isArray(produtos)) {
      const normalizarFaixas = (arr: Array<{ faixa_etaria?: string; valor?: string }> | undefined) =>
        (Array.isArray(arr) ? arr : [])
          .filter((f) => {
            const faixa = String(f?.faixa_etaria ?? "").trim()
            const v = f?.valor
            const num = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."))
            return faixa && !isNaN(num) && num > 0
          })
          .map((f) => ({
            faixa_etaria: String(f?.faixa_etaria ?? "").trim(),
            valor: String(f?.valor ?? "").replace(",", "."),
          }))

      let queryProdutosExistentes = supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id")
        .eq("contrato_id", id)
      if (tenantContrato) queryProdutosExistentes = queryProdutosExistentes.eq("tenant_id", tenantContrato)
      const { data: produtosExistentes } = await queryProdutosExistentes

      const idsExistentes = new Set((produtosExistentes || []).map((r) => r.id))
      const payloadValidos = produtos.filter((p) => p && (p.nome || "").trim().length > 0)
      const idsMantidos: string[] = []

      for (const p of payloadValidos) {
        const nome = String(p.nome).trim().slice(0, 255)
        const segmentacao = (p.segmentacao || "Padrão").slice(0, 50)
        let faixasDb: { Enfermaria: Array<{ faixa_etaria: string; valor: string }>; Apartamento: Array<{ faixa_etaria: string; valor: string }> }
        if (p.faixas_por_acomodacao && typeof p.faixas_por_acomodacao === "object") {
          faixasDb = {
            Enfermaria: normalizarFaixas(p.faixas_por_acomodacao.Enfermaria),
            Apartamento: normalizarFaixas(p.faixas_por_acomodacao.Apartamento),
          }
        } else if (Array.isArray(p.faixas)) {
          faixasDb = { Enfermaria: normalizarFaixas(p.faixas), Apartamento: [] }
        } else {
          faixasDb = { Enfermaria: [], Apartamento: [] }
        }

        const produtoId = typeof p.id === "string" ? p.id.trim() : undefined
        const existeEValido = produtoId && idsExistentes.has(produtoId)

        if (existeEValido) {
          let queryAtualizarProduto = supabaseAdmin
            .from("produtos_contrato_administradora")
            .update({
              nome,
              segmentacao,
              acomodacao: "Enfermaria",
              faixas: faixasDb,
            })
            .eq("id", produtoId)
            .eq("contrato_id", id)
          if (tenantContrato) queryAtualizarProduto = queryAtualizarProduto.eq("tenant_id", tenantContrato)
          const { error: errUpd } = await queryAtualizarProduto

          if (errUpd) {
            console.error("Erro ao atualizar produto:", errUpd)
            return NextResponse.json({ error: "Erro ao atualizar produto do contrato" }, { status: 500 })
          }
          idsMantidos.push(produtoId)
        } else {
          const { data: inserted, error: errIns } = await supabaseAdmin
            .from("produtos_contrato_administradora")
            .insert({
              contrato_id: id,
              tenant_id: tenantContrato || tenantIdAtual,
              nome,
              segmentacao,
              acomodacao: "Enfermaria",
              faixas: faixasDb,
            })
            .select("id")
            .single()

          if (errIns) {
            console.error("Erro ao inserir produto:", errIns)
            return NextResponse.json({ error: "Erro ao salvar produto do contrato" }, { status: 500 })
          }
          if (inserted?.id) idsMantidos.push(inserted.id)
        }
      }

      const idsParaRemover = (produtosExistentes || []).map((r) => r.id).filter((idProd) => !idsMantidos.includes(idProd))
      if (idsParaRemover.length > 0) {
        let queryDelete = supabaseAdmin
          .from("produtos_contrato_administradora")
          .delete()
          .in("id", idsParaRemover)
        if (tenantContrato) queryDelete = queryDelete.eq("tenant_id", tenantContrato)
        const { error: errDel } = await queryDelete

        if (errDel) console.error("Erro ao remover produtos desvinculados:", errDel)
      }
    }

    return NextResponse.json({ success: true, message: "Contrato atualizado" })
  } catch (e: unknown) {
    console.error("Erro atualizar contrato:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar contrato" },
      { status: 500 }
    )
  }
}
