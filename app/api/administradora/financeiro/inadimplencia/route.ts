import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  breakdownPorGrupo,
  calcularResumoMes,
  carregarFaturasPorVencimento,
  filtrarFaturasPorFinanceira,
  limiteMesYm,
  mapearClientesParaGrupos,
  mesesHistoricoInclusive,
  statusEmAbertoInadimplencia,
  type FaturaInadimplenciaRow,
} from "@/lib/inadimplencia-financeira"

export const maxDuration = 60

/**
 * GET ?administradora_id=&mes=YYYY-MM&financeira_id=&grupo_id=&historico_meses=6
 *
 * Índice de inadimplência por financeira e mês de vencimento:
 * faturas em aberto (pendente/atrasada) ÷ faturas geradas no mês (exceto canceladas).
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const administradoraId = url.searchParams.get("administradora_id")?.trim() || ""
    const mes = url.searchParams.get("mes")?.trim() || ""
    const financeiraId = url.searchParams.get("financeira_id")?.trim() || ""
    const grupoIdFiltro = url.searchParams.get("grupo_id")?.trim() || ""
    const historicoMeses = Math.min(
      12,
      Math.max(1, Number(url.searchParams.get("historico_meses") || 6) || 6)
    )

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json({ error: "mes deve estar no formato YYYY-MM" }, { status: 400 })
    }

    const mesesHist = mesesHistoricoInclusive(mes, historicoMeses)
    const mesMaisAntigo = mesesHist[0]
    const limIni = limiteMesYm(mesMaisAntigo)
    const limFim = limiteMesYm(mes)
    if (!limIni || !limFim) {
      return NextResponse.json({ error: "Mês inválido" }, { status: 400 })
    }

    let financeiraNome = ""
    if (financeiraId) {
      const { data: fin } = await supabaseAdmin
        .from("administradora_financeiras")
        .select("id, nome")
        .eq("id", financeiraId)
        .eq("administradora_id", administradoraId)
        .maybeSingle()
      if (!fin) {
        return NextResponse.json({ error: "Financeira não encontrada" }, { status: 404 })
      }
      financeiraNome = String((fin as { nome?: string }).nome || "").trim()
    }

    const faturasRange = await carregarFaturasPorVencimento(
      administradoraId,
      limIni.inicio,
      limFim.fimExclusivo
    )
    const faturasFiltradas = filtrarFaturasPorFinanceira(
      faturasRange,
      financeiraId || null,
      financeiraNome
    )

    const historico = mesesHist.map((ym) => calcularResumoMes(faturasFiltradas, ym))
    const resumo = historico.find((h) => h.mes === mes) || calcularResumoMes(faturasFiltradas, mes)

    const faturasDoMes = faturasFiltradas.filter((f) =>
      String(f.vencimento || "").slice(0, 10).startsWith(mes)
    )
    const emAbertoDoMes = faturasDoMes.filter((f) => statusEmAbertoInadimplencia(f.status))

    const clienteIds = [
      ...new Set(
        emAbertoDoMes
          .map((f) => String(f.cliente_administradora_id || "").trim())
          .filter(Boolean)
      ),
    ]
    const mapaGrupos = await mapearClientesParaGrupos(administradoraId, clienteIds)
    // Breakdown sempre sobre toda a inadimplência da financeira no mês.
    const porGrupo = breakdownPorGrupo(emAbertoDoMes, mapaGrupos, null)

    const faturasAbertasDetalhe: Array<{
      fatura_id: string
      cliente_nome: string
      valor: number
      status: string
      vencimento: string
      grupo_id: string | null
      grupo_nome: string
    }> = emAbertoDoMes
      .filter((f) => {
        if (!grupoIdFiltro) return true
        const ca = String(f.cliente_administradora_id || "").trim()
        return mapaGrupos.get(ca)?.grupo_id === grupoIdFiltro
      })
      .map((f: FaturaInadimplenciaRow) => {
        const ca = String(f.cliente_administradora_id || "").trim()
        const g = mapaGrupos.get(ca)
        return {
          fatura_id: String(f.id),
          cliente_nome: String(f.cliente_nome || "Cliente").trim() || "Cliente",
          valor: Number(f.valor || 0),
          status: String(f.status || ""),
          vencimento: String(f.vencimento || "").slice(0, 10),
          grupo_id: g?.grupo_id || null,
          grupo_nome: g?.grupo_nome || "Sem grupo",
        }
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 500)

    return NextResponse.json({
      mes,
      financeira: financeiraId
        ? { id: financeiraId, nome: financeiraNome }
        : { id: null, nome: "Todas as financeiras" },
      grupo_filtro: grupoIdFiltro || null,
      criterio:
        "Índice = faturas com vencimento no mês ainda em aberto (pendente/atrasada) ÷ faturas geradas no mês (exceto canceladas). " +
        "O valor em aberto ÷ valor gerado no mês forma o índice financeiro. " +
        "O breakdown por grupo mostra a participação de cada grupo dentro das faturas em aberto da financeira.",
      resumo,
      historico,
      por_grupo: porGrupo,
      faturas_em_aberto: faturasAbertasDetalhe,
    })
  } catch (e: unknown) {
    console.error("inadimplencia:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no relatório de inadimplência" },
      { status: 500 }
    )
  }
}
