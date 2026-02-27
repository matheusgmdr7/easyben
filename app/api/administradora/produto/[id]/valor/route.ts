import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

function parseValor(raw: unknown): number {
  if (raw == null) return 0
  if (typeof raw === "number" && !isNaN(raw)) return raw
  const s = String(raw).trim().replace(",", ".")
  const n = parseFloat(s)
  return !isNaN(n) && n >= 0 ? n : 0
}

function calcularValorPorFaixas(faixas: unknown[], idade: number): number {
  if (!Array.isArray(faixas)) return 0
  for (const f of faixas) {
    const faixa = String((f as any)?.faixa_etaria ?? "").trim()
    const valor = parseValor((f as any)?.valor)
    if (!faixa) continue
    if (faixa.includes("-")) {
      const parts = faixa.split("-")
      const min = parseInt(parts[0]?.trim() ?? "", 10)
      const max = parseInt(parts[1]?.trim() ?? "", 10)
      if (!isNaN(min) && !isNaN(max) && idade >= min && idade <= max) return valor
    } else if (faixa.endsWith("+")) {
      const min = parseInt(faixa.replace("+", "").trim(), 10)
      if (!isNaN(min) && idade >= min) return valor
    } else {
      const exata = parseInt(faixa, 10)
      if (!isNaN(exata) && idade === exata) return valor
    }
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
    const idade = idadeParam != null ? parseInt(idadeParam, 10) : NaN
    const acomodacao = acomodacaoParam === "Apartamento" ? "Apartamento" : "Enfermaria"

    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    if (isNaN(idade) || idade < 0 || idade > 120) {
      return NextResponse.json({ valor: null, error: "Idade inválida ou não informada" })
    }

    const tenantId = await getCurrentTenantId()

    const { data: pca } = await supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, faixas")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (pca) {
      const raw = (pca.faixas as unknown) ?? []
      let faixas: unknown[] = []
      if (Array.isArray(raw)) {
        faixas = raw
      } else if (raw && typeof raw === "object" && "Enfermaria" in raw && "Apartamento" in raw) {
        const obj = raw as Record<string, unknown[]>
        faixas = Array.isArray(obj[acomodacao]) ? obj[acomodacao] : []
      }
      const valor = calcularValorPorFaixas(faixas, idade)
      return NextResponse.json({ valor: valor > 0 ? valor : null })
    }

    return NextResponse.json({ valor: null })
  } catch (e: unknown) {
    console.error("Erro valor produto:", e)
    return NextResponse.json(
      { valor: null, error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    )
  }
}
