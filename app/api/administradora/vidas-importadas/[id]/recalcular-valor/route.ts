import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { obterValorProdutoPorIdade, calcularIdade } from "@/lib/calcular-valor-produto"

/**
 * POST /api/administradora/vidas-importadas/[id]/recalcular-valor
 * Recalcula e salva o valor_mensal com base na idade atual e na tabela do produto.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const tenantId = await getCurrentTenantId()

    const { data: vida, error: errFetch } = await supabaseAdmin
      .from("vidas_importadas")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (errFetch || !vida) {
      return NextResponse.json({ error: "Vida não encontrada" }, { status: 404 })
    }

    const dataNasc = vida.data_nascimento
    const idadeInput = vida.idade
    const idade = typeof idadeInput === "number" && !isNaN(idadeInput)
      ? idadeInput
      : idadeInput != null && String(idadeInput).trim() !== ""
        ? parseInt(String(idadeInput), 10)
        : calcularIdade(dataNasc)

    const acomodacao = (vida as { acomodacao?: string }).acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria"
    let valor_mensal: number | null = null
    if (vida.produto_id && idade != null && !isNaN(idade)) {
      valor_mensal = await obterValorProdutoPorIdade(String(vida.produto_id), idade, tenantId, acomodacao)
    }

    const { data, error } = await supabaseAdmin
      .from("vidas_importadas")
      .update({ valor_mensal })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .maybeSingle()

    if (error) {
      console.error("Erro ao atualizar valor_mensal:", error)
      return NextResponse.json({ error: "Erro ao atualizar valor" }, { status: 500 })
    }

    return NextResponse.json({ ...data, valor_recalculado: valor_mensal })
  } catch (e: unknown) {
    console.error("Erro recalcular valor:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    )
  }
}
