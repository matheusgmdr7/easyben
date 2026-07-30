import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { gerarRelatorioImplantacao } from "@/lib/relatorio-implantacao"

export const maxDuration = 60

/**
 * GET /api/administradora/relatorios/implantacao
 * Clientes com boleto pago no período (foco em primeiro boleto → implantação).
 */
export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams
    const administradoraId = qs.get("administradora_id")?.trim()
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const ano = Number(qs.get("ano"))
    const mes = Number(qs.get("mes"))
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "ano e mes são obrigatórios" }, { status: 400 })
    }

    const diaRaw = qs.get("dia")?.trim()
    const dia = diaRaw ? Number(diaRaw) : null
    if (dia != null && (!Number.isFinite(dia) || dia < 1 || dia > 31)) {
      return NextResponse.json({ error: "dia inválido" }, { status: 400 })
    }

    const dataInicio = qs.get("data_inicio")?.trim() || null
    const dataFim = qs.get("data_fim")?.trim() || null
    const isoData = /^\d{4}-\d{2}-\d{2}$/
    if (dataInicio && !isoData.test(dataInicio)) {
      return NextResponse.json({ error: "data_inicio inválida" }, { status: 400 })
    }
    if (dataFim && !isoData.test(dataFim)) {
      return NextResponse.json({ error: "data_fim inválida" }, { status: 400 })
    }
    if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
      return NextResponse.json(
        { error: "data_inicio e data_fim devem ser informadas juntas" },
        { status: 400 }
      )
    }

    const { data: administradora } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantAtual = await getCurrentTenantId()
    const tenantId = administradora?.tenant_id || tenantAtual
    const grupoId = qs.get("grupo_id")?.trim() || null
    const corretorId = qs.get("corretor_id")?.trim() || null
    const somentePrimeiro = qs.get("somente_primeiro_boleto") !== "0"
    const implantadoRaw = qs.get("implantado")?.trim() || "todos"
    const implantado =
      implantadoRaw === "sim" || implantadoRaw === "nao"
        ? (implantadoRaw as "sim" | "nao")
        : "todos"

    const resultado = await gerarRelatorioImplantacao({
      administradoraId,
      tenantId,
      ano,
      mes,
      dia,
      dataInicio,
      dataFim,
      grupoId,
      corretorId: corretorId && corretorId !== "todos" ? corretorId : null,
      somentePrimeiroBoleto: somentePrimeiro,
      implantado,
    })

    return NextResponse.json(resultado)
  } catch (err: unknown) {
    console.error("[relatorio-implantacao]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar relatório" },
      { status: 500 }
    )
  }
}
