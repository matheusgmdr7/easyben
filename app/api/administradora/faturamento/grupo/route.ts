import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { obterValorProdutoPorIdade, calcularIdadeAteData } from "@/lib/calcular-valor-produto"

export interface LinhaFaturamento {
  id: string
  cpf: string
  tipo: "titular" | "dependente"
  nome: string
  idade: number
  valor: number
  acomodacao: string
  mudanca_faixa: boolean
}

/**
 * GET /api/administradora/faturamento/grupo?grupo_id=xxx&referencia=YYYY-MM&produto_id=xxx (opcional)
 * Gera dados de faturamento para um grupo na referência (mês/ano).
 * - Beneficiários: sempre todos os ativos do grupo (não filtra por produto).
 * - Se produto_id for informado: o valor de cada linha é calculado pela TABELA DE PREÇOS do produto selecionado (idade + acomodação da vida).
 * - Se produto_id não for informado: o valor usa o produto vinculado à vida (produto_id) ou valor_mensal.
 * Retorna: linhas com CPF, Tipo, Nome, Idade, Valor, Acomodação, mudanca_faixa e total.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grupoId = searchParams.get("grupo_id")
    const referencia = searchParams.get("referencia")
    const produtoIdFiltro = searchParams.get("produto_id")?.trim() || null

    if (!grupoId) {
      return NextResponse.json({ error: "grupo_id é obrigatório" }, { status: 400 })
    }
    if (!referencia || !/^\d{4}-\d{2}$/.test(referencia)) {
      return NextResponse.json({ error: "referencia inválida. Use YYYY-MM (ex: 2025-01)" }, { status: 400 })
    }

    const [refAno, refMes] = referencia.split("-").map(Number)
    const tenantId = await getCurrentTenantId()

    const { data: grupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome, administradora_id")
      .eq("id", grupoId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Buscar todas as vidas em lotes (Supabase/PostgREST limitam a 1000 por request)
    const PAGE_SIZE = 1000
    const allVidas: any[] = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data: chunk } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, nome, cpf, tipo, data_nascimento, idade, produto_id, valor_mensal, acomodacao, ativo")
        .eq("grupo_id", grupoId)
        .eq("tenant_id", tenantId)
        .order("tipo", { ascending: true })
        .order("nome", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      const list = chunk || []
      allVidas.push(...list)
      hasMore = list.length === PAGE_SIZE
      from += PAGE_SIZE
    }

    const vidasAtivas = allVidas.filter((v) => (v as any).ativo !== false)
    if (vidasAtivas.length === 0) {
      return NextResponse.json({
        grupo_id: grupoId,
        grupo_nome: grupo.nome,
        referencia,
        linhas: [],
        total: 0,
      })
    }

    const usarTabelaProdutoSelecionado = Boolean(produtoIdFiltro)
    const produtoIdsParaPreco = usarTabelaProdutoSelecionado
      ? [produtoIdFiltro!]
      : [...new Set(vidasAtivas.map((v) => v.produto_id).filter(Boolean))] as string[]

    const { data: produtos } = await supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, acomodacao")
      .in("id", produtoIdsParaPreco)
      .eq("tenant_id", tenantId)

    const mapaProduto = new Map((produtos || []).map((p) => [p.id, (p.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria") as "Enfermaria" | "Apartamento" ]))

    const linhas: LinhaFaturamento[] = []
    for (const v of vidasAtivas) {
      const idadeRef = calcularIdadeAteData(v.data_nascimento, { ano: refAno, mes: refMes }) ??
        (typeof v.idade === "number" && !isNaN(v.idade) ? v.idade : null)

      if (idadeRef == null) continue

      const mesAnt = refMes === 1 ? 12 : refMes - 1
      const anoAnt = refMes === 1 ? refAno - 1 : refAno
      const idadeAnt = calcularIdadeAteData(v.data_nascimento, { ano: anoAnt, mes: mesAnt })

      let valor = 0
      let mudanca_faixa = false

      const acomodacaoVida = (v as { acomodacao?: string }).acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria"
      const produtoParaPreco = usarTabelaProdutoSelecionado ? produtoIdFiltro! : (v.produto_id ? String(v.produto_id) : null)

      if (produtoParaPreco) {
        const valorRef = await obterValorProdutoPorIdade(produtoParaPreco, idadeRef, tenantId, acomodacaoVida)
        valor = valorRef ?? (v.valor_mensal ? Number(v.valor_mensal) : 0)

        if (idadeAnt != null && idadeAnt !== idadeRef) {
          const valorAnt = await obterValorProdutoPorIdade(produtoParaPreco, idadeAnt, tenantId, acomodacaoVida)
          if (valorAnt != null && Math.abs((valorAnt ?? 0) - valor) > 0.001) {
            mudanca_faixa = true
          }
        }
      } else if (v.valor_mensal) {
        valor = Number(v.valor_mensal)
      }

      const acomodacao = produtoParaPreco ? acomodacaoVida : "-"

      const cpfStr = v.cpf ? String(v.cpf).replace(/\D/g, "") : ""
      const cpfFormatado = cpfStr.length === 11 ? cpfStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (v.cpf ? String(v.cpf) : "-")
      linhas.push({
        id: v.id,
        cpf: cpfFormatado,
        tipo: (v.tipo === "dependente" ? "dependente" : "titular") as "titular" | "dependente",
        nome: v.nome || "-",
        idade: idadeRef,
        valor,
        acomodacao,
        mudanca_faixa,
      })
    }

    const total = linhas.reduce((s, l) => s + l.valor, 0)

    return NextResponse.json({
      grupo_id: grupoId,
      grupo_nome: grupo.nome,
      referencia,
      linhas,
      total,
    })
  } catch (e: unknown) {
    console.error("Erro faturamento grupo:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar faturamento" },
      { status: 500 }
    )
  }
}
