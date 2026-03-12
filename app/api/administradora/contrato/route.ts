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
      opcoes_dia_vencimento = [],
      opcoes_data_vigencia = [],
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
      opcoes_dia_vencimento?: Array<string | number>
      opcoes_data_vigencia?: string[]
      produtos?: Array<{
        nome: string
        segmentacao?: string
        acomodacao?: string
        faixas?: Array<{ faixa_etaria: string; valor: string }>
      }>
    }

    if (!administradora_id || !descricao) {
      return NextResponse.json(
        { error: "administradora_id e descricao são obrigatórios" },
        { status: 400 }
      )
    }

    let tenantId = ""
    const { data: administradoraRow } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradora_id)
      .maybeSingle()
    if (administradoraRow?.tenant_id) {
      tenantId = administradoraRow.tenant_id
    } else {
      tenantId = await getCurrentTenantId()
    }
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

    const normalizarDiaVencimento = (v: unknown): string | null => {
      const dig = String(v ?? "").replace(/\D/g, "").padStart(2, "0").slice(-2)
      if (!dig) return null
      const n = Number(dig)
      if (!Number.isFinite(n) || n < 1 || n > 31) return null
      return dig
    }
    const normalizarOpcaoVigencia = (v: unknown): string | null => {
      const t = String(v ?? "").trim()
      if (!t) return null
      return t.slice(0, 50)
    }
    const opcoesDias = Array.from(
      new Set((Array.isArray(opcoes_dia_vencimento) ? opcoes_dia_vencimento : []).map(normalizarDiaVencimento).filter(Boolean) as string[])
    ).sort((a, b) => Number(a) - Number(b))
    const opcoesVigencias = Array.from(
      new Set((Array.isArray(opcoes_data_vigencia) ? opcoes_data_vigencia : []).map(normalizarOpcaoVigencia).filter(Boolean) as string[])
    )

    const obterProximoNumero = async () => {
      const { data: contratosExistentes } = await supabaseAdmin
        .from("contratos_administradora")
        .select("numero")
        .eq("administradora_id", administradora_id)
      let maior = 0
      let largura = 4
      for (const c of contratosExistentes || []) {
        const txt = String(c.numero || "").trim()
        const m = txt.match(/(\d+)(?!.*\d)/)
        if (!m) continue
        const n = Number(m[1])
        if (!Number.isFinite(n)) continue
        if (n > maior) maior = n
        if (m[1].length > largura) largura = m[1].length
      }
      return String(maior + 1).padStart(largura, "0")
    }
    const incrementarNumero = (num: string) => {
      const m = num.match(/(\d+)(?!.*\d)/)
      if (!m) return String(Number(num || "0") + 1)
      const base = m[1]
      const prox = String(Number(base) + 1).padStart(base.length, "0")
      return num.slice(0, m.index || 0) + prox + num.slice((m.index || 0) + base.length)
    }

    const numeroInformado = String(numero || "").trim()
    let numeroContrato = numeroInformado || (await obterProximoNumero())
    let contratoId: string | null = null
    for (let tentativa = 0; tentativa < 6; tentativa++) {
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
          numero: numeroContrato.trim(),
          observacao: observacao?.trim() || null,
        })
        .select("id")
        .single()

      if (!errContrato && contrato?.id) {
        contratoId = contrato.id
        break
      }

      const isUniqueViolation = String((errContrato as any)?.code || "") === "23505"
      if (isUniqueViolation && !numeroInformado) {
        numeroContrato = incrementarNumero(numeroContrato)
        continue
      }
      if (isUniqueViolation && numeroInformado) {
        return NextResponse.json(
          { error: "Número de contrato já existe para esta administradora." },
          { status: 409 }
        )
      }

      console.error("Erro ao criar contrato:", errContrato)
      return NextResponse.json(
        { error: "Erro ao salvar contrato. Execute os scripts de contratos no Supabase." },
        { status: 500 }
      )
    }

    if (!contratoId) {
      return NextResponse.json({ error: "Falha ao obter ID do contrato" }, { status: 500 })
    }

    try {
      await supabaseAdmin
        .from("contratos_opcoes_administradora")
        .upsert(
          {
            contrato_id: contratoId,
            tenant_id: tenantId,
            opcoes_dia_vencimento: opcoesDias,
            opcoes_data_vigencia: opcoesVigencias,
          },
          { onConflict: "contrato_id" }
        )
    } catch (e) {
      console.warn("Tabela contratos_opcoes_administradora indisponível:", e)
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
      numero: numeroContrato,
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
