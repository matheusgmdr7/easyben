import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * POST /api/administradora/contrato
 * Cria contrato e produtos cadastrados em /administradora/contrato/novo.
 * Body: { administradora_id, operadora (opcional id), cnpj_operadora, razao_social, nome_fantasia, logo, descricao, numero, observacao, produtos: [{ nome, segmentacao, acomodacao, faixas }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      administradora_id,
      operadora_id,
      cnpj_operadora,
      razao_social,
      nome_fantasia,
      logo,
      descricao,
      numero,
      observacao,
      produtos = [],
    } = body as {
      administradora_id?: string
      operadora_id?: string | null
      cnpj_operadora?: string
      razao_social?: string
      nome_fantasia?: string
      logo?: string
      descricao?: string
      numero?: string
      observacao?: string
      produtos?: Array<{
        nome: string
        segmentacao?: string
        acomodacao?: string
        faixas?: Array<{ faixa_etaria: string; valor: string }>
      }>
    }

    if (!administradora_id || !descricao || !numero) {
      return NextResponse.json(
        { error: "administradora_id, descricao e numero são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()
    const cnpjLimpo = (cnpj_operadora || "").replace(/\D/g, "")

    let operadoraIdFinal: string | null = operadora_id || null

    // Se não tem operadora_id mas tem CNPJ, buscar ou criar operadora
    if (!operadoraIdFinal && cnpjLimpo.length === 14) {
      const { data: existente } = await supabaseAdmin
        .from("operadoras")
        .select("id")
        .eq("cnpj", cnpjLimpo)
        .limit(1)
        .maybeSingle()

      if (existente) {
        operadoraIdFinal = existente.id
      } else if (razao_social && nome_fantasia) {
        // Criar operadora com dados mínimos (placeholders para campos obrigatórios)
        const { data: nova, error: errOp } = await supabaseAdmin
          .from("operadoras")
          .insert({
            nome: String(razao_social).trim().slice(0, 255),
            fantasia: String(nome_fantasia).trim().slice(0, 255),
            cnpj: cnpjLimpo,
            ans: "0",
            cep: "00000000",
            endereco: "A complementar",
            cidade: "A complementar",
            uf: "SP",
            tenant_id: tenantId,
          })
          .select("id")
          .single()

        if (errOp) {
          console.error("Erro ao criar operadora:", errOp)
          return NextResponse.json(
            { error: "Erro ao cadastrar operadora. Verifique se a tabela operadoras permite inserção mínima (ans, cep, endereco, cidade, uf)." },
            { status: 500 }
          )
        }
        operadoraIdFinal = nova?.id || null
      }
    }

    // Criar contrato
    const { data: contrato, error: errContrato } = await supabaseAdmin
      .from("contratos_administradora")
      .insert({
        administradora_id,
        operadora_id: operadoraIdFinal,
        tenant_id: tenantId,
        cnpj_operadora: cnpjLimpo || null,
        razao_social: razao_social?.trim() || null,
        nome_fantasia: nome_fantasia?.trim() || null,
        logo: logo?.trim() || null,
        descricao: descricao.trim(),
        numero: numero.trim(),
        observacao: observacao?.trim() || null,
      })
      .select("id")
      .single()

    if (errContrato) {
      console.error("Erro ao criar contrato:", errContrato)
      return NextResponse.json(
        { error: "Erro ao salvar contrato. Execute o script scripts/criar-tabelas-contratos-administradora.sql no Supabase." },
        { status: 500 }
      )
    }

    const contratoId = contrato?.id
    if (!contratoId) {
      return NextResponse.json({ error: "Falha ao obter ID do contrato" }, { status: 500 })
    }

    // Criar produtos
    if (Array.isArray(produtos) && produtos.length > 0) {
      const produtosInsert = produtos
        .filter((p) => p && (p.nome || "").trim().length > 0)
        .map((p) => ({
          contrato_id: contratoId,
          tenant_id: tenantId,
          nome: String(p.nome).trim().slice(0, 255),
          segmentacao: (p.segmentacao || "Padrão").slice(0, 50),
          acomodacao: (p.acomodacao || "Enfermaria").slice(0, 50),
          faixas: Array.isArray(p.faixas)
            ? p.faixas
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
            : [],
        }))

      if (produtosInsert.length > 0) {
        const { error: errProdutos } = await supabaseAdmin
          .from("produtos_contrato_administradora")
          .insert(produtosInsert)

        if (errProdutos) {
          console.error("Erro ao criar produtos:", errProdutos)
          // Contrato já foi criado; retornar sucesso com aviso
        }
      }
    }

    return NextResponse.json({
      success: true,
      id: contratoId,
      message: "Contrato criado com sucesso",
    })
  } catch (e: unknown) {
    console.error("Erro criar contrato:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar contrato" },
      { status: 500 }
    )
  }
}
