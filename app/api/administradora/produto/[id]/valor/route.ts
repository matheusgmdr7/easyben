import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

function parseValor(raw: unknown): number {
  if (raw == null) return 0
  if (typeof raw === "number" && !isNaN(raw)) return raw
  let s = String(raw).trim()
  s = s.replace(/[^\d,.-]/g, "")
  const temVirgula = s.includes(",")
  const temPonto = s.includes(".")
  if (temVirgula && temPonto) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (temVirgula) {
    s = s.replace(",", ".")
  }
  const n = parseFloat(s)
  return !isNaN(n) && n >= 0 ? n : 0
}

function extrairFaixaRegistro(item: Record<string, unknown>): string {
  return String(
    item?.faixa_etaria ??
      item?.faixa ??
      item?.faixaIdade ??
      item?.idade ??
      ""
  ).trim()
}

function parseFaixaEtaria(
  faixaRaw: unknown
): { tipo: "range"; min: number; max: number } | { tipo: "min"; min: number } | { tipo: "exact"; idade: number } | null {
  const faixa = String(faixaRaw ?? "").trim()
  if (!faixa) return null

  const normalizada = faixa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

  const nums = normalizada.match(/\d+/g)?.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n)) || []

  const rangeComHifen = normalizada.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (rangeComHifen) {
    const min = parseInt(rangeComHifen[1], 10)
    const max = parseInt(rangeComHifen[2], 10)
    if (!isNaN(min) && !isNaN(max)) return { tipo: "range", min, max }
  }

  const rangeComBarra = normalizada.match(/(\d+)\s*\/\s*(\d+)/)
  if (rangeComBarra) {
    const min = parseInt(rangeComBarra[1], 10)
    const max = parseInt(rangeComBarra[2], 10)
    if (!isNaN(min) && !isNaN(max)) return { tipo: "range", min, max }
  }

  if ((normalizada.includes(" a ") || normalizada.includes(" ate ") || normalizada.includes("até ")) && nums.length >= 2) {
    return { tipo: "range", min: nums[0], max: nums[1] }
  }

  if (
    normalizada.includes("+") ||
    normalizada.includes("ou mais") ||
    normalizada.includes("e mais") ||
    normalizada.includes("em diante") ||
    normalizada.includes("acima de") ||
    normalizada.includes("maior que") ||
    normalizada.includes(">=")
  ) {
    if (nums.length >= 1) return { tipo: "min", min: nums[0] }
  }

  if (nums.length === 1) return { tipo: "exact", idade: nums[0] }
  return null
}

function calcularValorPorFaixas(faixas: unknown[], idade: number): number {
  if (!Array.isArray(faixas)) return 0
  for (const f of faixas) {
    const item = (f as Record<string, unknown>) || {}
    const faixa = extrairFaixaRegistro(item)
    const valor = parseValor(item?.valor)
    if (!faixa) continue
    const parse = parseFaixaEtaria(faixa)
    if (!parse) continue
    if (parse.tipo === "range" && idade >= parse.min && idade <= parse.max) return valor
    if (parse.tipo === "min" && idade >= parse.min) return valor
    if (parse.tipo === "exact" && idade === parse.idade) return valor
  }
  return 0
}

/**
 * GET /api/administradora/produto/[id]/valor?idade=35&acomodacao=Enfermaria
 * Retorna o valor do produto calculado com base na idade e nas faixas do produto.
 * acomodacao: Enfermaria | Apartamento (quando o produto tem faixas por acomodação).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const idadeParam = searchParams.get("idade")
    const acomodacaoParam = searchParams.get("acomodacao")
    const administradoraId = String(searchParams.get("administradora_id") || "").trim()
    const idade = idadeParam != null ? parseInt(idadeParam, 10) : NaN
    const acomodacao = acomodacaoParam === "Apartamento" ? "Apartamento" : "Enfermaria"

    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    if (isNaN(idade) || idade < 0 || idade > 120) {
      return NextResponse.json({ valor: null, error: "Idade inválida ou não informada" })
    }

    let tenantId = await getCurrentTenantId()
    if (administradoraId) {
      const { data: adm } = await supabaseAdmin
        .from("administradoras")
        .select("tenant_id")
        .eq("id", administradoraId)
        .maybeSingle()
      if (adm?.tenant_id) tenantId = String(adm.tenant_id)
    }

    let { data: pca } = await supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, faixas")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!pca) {
      const fallback = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, faixas")
        .eq("id", id)
        .maybeSingle()
      pca = fallback.data || null
    }

    if (pca) {
      const raw = (pca.faixas as unknown) ?? []
      const acomodacaoAlternativa = acomodacao === "Apartamento" ? "Enfermaria" : "Apartamento"

      function extrairFaixasDoRaw(acomodacaoDesejada: "Enfermaria" | "Apartamento"): unknown[] {
        if (Array.isArray(raw)) return raw
        let faixas: unknown[] = []
        if (raw && typeof raw === "object" && "Enfermaria" in raw && "Apartamento" in raw) {
          const obj = raw as Record<string, unknown[]>
          faixas = Array.isArray(obj[acomodacaoDesejada]) ? obj[acomodacaoDesejada] : []
        } else if (raw && typeof raw === "object") {
          const obj = raw as Record<string, unknown>
          const chaves = Object.keys(obj)
          const chaveAcomodacao = chaves.find((k) => k.toLowerCase() === acomodacaoDesejada.toLowerCase())
          const chaveFallback = chaves.find((k) => k.toLowerCase().includes("enferm")) || chaves.find((k) => k.toLowerCase().includes("apart"))
          const arrAcomodacao = chaveAcomodacao ? obj[chaveAcomodacao] : chaveFallback ? obj[chaveFallback] : null
          if (Array.isArray(arrAcomodacao)) faixas = arrAcomodacao
        }
        if (faixas.length === 0 && raw && typeof raw === "object" && !Array.isArray(raw)) {
          const obj = raw as Record<string, unknown>
          const todosArrays = Object.values(obj).filter((v) => Array.isArray(v)) as unknown[][]
          faixas = todosArrays.flat()
        }
        return faixas
      }

      const faixasPrimarias = extrairFaixasDoRaw(acomodacao)
      const valorPrimario = calcularValorPorFaixas(faixasPrimarias, idade)
      if (valorPrimario > 0) return NextResponse.json({ valor: valorPrimario, acomodacao_aplicada: acomodacao })

      const faixasAlternativas = extrairFaixasDoRaw(acomodacaoAlternativa)
      const valorAlternativo = calcularValorPorFaixas(faixasAlternativas, idade)
      if (valorAlternativo > 0) {
        return NextResponse.json({
          valor: valorAlternativo,
          acomodacao_aplicada: acomodacaoAlternativa,
          acomodacao_solicitada: acomodacao,
        })
      }

      return NextResponse.json({
        valor: null,
        error: "Nenhuma faixa compatível para a idade informada",
        diagnostico: {
          idade,
          acomodacao_solicitada: acomodacao,
          total_faixas_primarias: Array.isArray(faixasPrimarias) ? faixasPrimarias.length : 0,
          total_faixas_alternativas: Array.isArray(faixasAlternativas) ? faixasAlternativas.length : 0,
        },
      })
    }

    return NextResponse.json({ valor: null, error: "Produto não encontrado para o tenant/contexto atual" })
  } catch (e: unknown) {
    console.error("Erro valor produto:", e)
    return NextResponse.json(
      { valor: null, error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    )
  }
}
