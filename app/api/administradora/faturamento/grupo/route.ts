import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import {
  calcularIdadeAteData,
  carregarFaixasProdutosContratoPorIds,
  dataAniversarioNoAno,
  valorProdutoComCacheFaixas,
} from "@/lib/calcular-valor-produto"

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

function limparDigitos(valor: string | null | undefined): string {
  return String(valor || "").replace(/\D/g, "")
}

function normalizarCpf(valor: string | null | undefined): string {
  const dig = limparDigitos(valor)
  if (!dig) return ""
  return dig.slice(-11).padStart(11, "0")
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
    // Priorizar tenant da administradora dona do grupo para evitar contexto incorreto.
    let tenantId: string
    const { data: grupoAdmin } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("administradora_id")
      .eq("id", grupoId)
      .maybeSingle()

    if (grupoAdmin?.administradora_id) {
      const { data: adm } = await supabaseAdmin
        .from("administradoras")
        .select("tenant_id")
        .eq("id", grupoAdmin.administradora_id)
        .maybeSingle()
      if (adm?.tenant_id) {
        tenantId = adm.tenant_id
      } else {
        tenantId = await getCurrentTenantId()
      }
    } else {
      tenantId = await getCurrentTenantId()
    }

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
        .select("id, nome, cpf, cpf_titular, tipo, data_nascimento, idade, produto_id, valor_mensal, acomodacao, ativo")
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

    const idsProdutosParaPreco = usarTabelaProdutoSelecionado
      ? [produtoIdFiltro!]
      : [
          ...new Set(
            vidasAtivas
              .map((v) => (v as { produto_id?: string | null }).produto_id)
              .filter(Boolean)
              .map((id) => String(id))
          ),
        ]

    const cacheFaixasProduto =
      idsProdutosParaPreco.length > 0
        ? await carregarFaixasProdutosContratoPorIds(idsProdutosParaPreco, tenantId)
        : new Map()

    const linhasComVinculo: Array<LinhaFaturamento & { cpf_norm: string; cpf_titular_norm: string }> = []
    for (const v of vidasAtivas) {
      const idadeBase =
        typeof v.idade === "number"
          ? v.idade
          : (v.idade != null && !isNaN(Number(v.idade)) ? Number(v.idade) : null)
      const idadeRefCalculada = calcularIdadeAteData(v.data_nascimento, { ano: refAno, mes: refMes })
      const idadeRef = idadeRefCalculada ?? idadeBase

      const mesAnt = refMes === 1 ? 12 : refMes - 1
      const anoAnt = refMes === 1 ? refAno - 1 : refAno
      const idadeAnt = calcularIdadeAteData(v.data_nascimento, { ano: anoAnt, mes: mesAnt }) ?? idadeBase

      let valor = 0
      let mudanca_faixa = false
      let mudanca_faixa_idade_anterior: number | null = null
      let mudanca_faixa_idade_nova: number | null = null
      let mudanca_faixa_aniversario: string | null = null

      const acomodacaoVida = (v as { acomodacao?: string }).acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria"
      const produtoParaPreco = usarTabelaProdutoSelecionado ? produtoIdFiltro! : (v.produto_id ? String(v.produto_id) : null)

      const obterValorComFallback = (produtoId: string, idade: number): number | null => {
        const entry = cacheFaixasProduto.get(produtoId)
        return valorProdutoComCacheFaixas(entry, idade, acomodacaoVida)
      }

      if (produtoParaPreco && idadeRef != null) {
        const valorRef = obterValorComFallback(produtoParaPreco, idadeRef)
        valor = valorRef ?? (v.valor_mensal ? Number(v.valor_mensal) : 0)

        if (idadeAnt != null && idadeAnt !== idadeRef) {
          const valorAnt = obterValorComFallback(produtoParaPreco, idadeAnt)
          if (valorAnt != null && Math.abs(valorAnt - valor) > 0.001) {
            mudanca_faixa = true
            mudanca_faixa_idade_anterior = idadeAnt
            mudanca_faixa_idade_nova = idadeRef
            mudanca_faixa_aniversario = dataAniversarioNoAno(v.data_nascimento, refAno)
          }
        }
      } else {
        valor = v.valor_mensal ? Number(v.valor_mensal) : 0
      }

      const acomodacao = produtoParaPreco ? acomodacaoVida : "-"

      const cpfStr = normalizarCpf(v.cpf ? String(v.cpf) : "")
      const cpfFormatado = cpfStr.length === 11 ? cpfStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (v.cpf ? String(v.cpf) : "-")
      linhasComVinculo.push({
        id: v.id,
        cpf: cpfFormatado,
        tipo: (v.tipo === "dependente" ? "dependente" : "titular") as "titular" | "dependente",
        nome: v.nome || "-",
        idade: idadeRef ?? 0,
        valor,
        acomodacao,
        mudanca_faixa,
        mudanca_faixa_idade_anterior,
        mudanca_faixa_idade_nova,
        mudanca_faixa_aniversario,
        cpf_norm: cpfStr,
        cpf_titular_norm: normalizarCpf((v as { cpf_titular?: string | null }).cpf_titular || ""),
      })
    }

    const ordenarPorNome = (a: { nome: string }, b: { nome: string }) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" })

    const titulares = linhasComVinculo.filter((l) => l.tipo === "titular").sort(ordenarPorNome)
    const dependentes = linhasComVinculo.filter((l) => l.tipo === "dependente").sort(ordenarPorNome)
    const titularesPorCpf = new Map(titulares.map((t) => [t.cpf_norm, t]))
    const dependentesPorTitular = new Map<string, Array<LinhaFaturamento & { cpf_norm: string; cpf_titular_norm: string }>>()

    dependentes.forEach((dep) => {
      const cpfTit = dep.cpf_titular_norm
      if (!cpfTit || !titularesPorCpf.has(cpfTit)) return
      const lista = dependentesPorTitular.get(cpfTit) || []
      lista.push(dep)
      dependentesPorTitular.set(cpfTit, lista)
    })

    const linhasOrdenadasComVinculo: Array<LinhaFaturamento & { cpf_norm: string; cpf_titular_norm: string }> = []
    titulares.forEach((titular) => {
      linhasOrdenadasComVinculo.push(titular)
      const deps = dependentesPorTitular.get(titular.cpf_norm) || []
      linhasOrdenadasComVinculo.push(...deps.sort(ordenarPorNome))
    })

    const dependentesOrfaos = dependentes.filter((dep) => !dep.cpf_titular_norm || !titularesPorCpf.has(dep.cpf_titular_norm))
    linhasOrdenadasComVinculo.push(...dependentesOrfaos)

    const linhas: LinhaFaturamento[] = linhasOrdenadasComVinculo.map(
      ({ cpf_norm: _cpfNorm, cpf_titular_norm: _cpfTitularNorm, ...linha }) => linha
    )

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
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Erro ao gerar faturamento"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
