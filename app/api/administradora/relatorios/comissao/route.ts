import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { CorretoresAdministradoraService } from "@/services/corretores-administradora-service"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  valor: number | null
  status: string | null
  vencimento: string | null
  numero_fatura: string | null
}

const ASAAS_TO_INTERNO: Record<string, string> = {
  PENDING: "pendente",
  RECEIVED: "paga",
  CONFIRMED: "paga",
  RECEIVED_IN_CASH: "paga",
  OVERDUE: "atrasada",
  REFUNDED: "cancelada",
  REFUND_REQUESTED: "cancelada",
  CHARGEBACK_REQUESTED: "cancelada",
  CHARGEBACK_DISPUTE: "cancelada",
  AWAITING_CHARGEBACK_REVERSAL: "cancelada",
  DELETED: "cancelada",
  CANCELED: "cancelada",
  CANCELLED: "cancelada",
  AWAITING_RISK_ANALYSIS: "pendente",
}

function normalizarStatus(status: string): string {
  const bruto = String(status || "").trim()
  if (!bruto) return ""
  const upper = bruto.toUpperCase()
  if (ASAAS_TO_INTERNO[upper]) return ASAAS_TO_INTERNO[upper]
  const lower = bruto.toLowerCase()
  if (lower === "paid") return "paga"
  if (lower === "overdue") return "atrasada"
  if (lower === "cancelled" || lower === "canceled") return "cancelada"
  return lower
}

function primeiroDiaMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`
}

function ultimoDiaMes(ano: number, mes: number): string {
  const data = new Date(Date.UTC(ano, mes, 0))
  return `${ano}-${String(mes).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`
}

function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message?: unknown }).message)
  }
  return String(e)
}

/**
 * GET /api/administradora/relatorios/comissao
 * Faturas pagas no período (vencimento no mês/ano), clientes vinculados ao corretor informado.
 * Query: administradora_id, ano, mes, corretor_id, percentual (0–100, default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim() || ""
    const anoStr = request.nextUrl.searchParams.get("ano")?.trim() || ""
    const mesStr = request.nextUrl.searchParams.get("mes")?.trim() || ""
    const corretorId = request.nextUrl.searchParams.get("corretor_id")?.trim() || ""
    const pctRaw = request.nextUrl.searchParams.get("percentual")

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }
    if (!corretorId) {
      return NextResponse.json({ error: "corretor_id é obrigatório" }, { status: 400 })
    }

    const ano = Number(anoStr)
    const mes = Number(mesStr)
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Informe ano e mês válidos (mês 1–12)." }, { status: 400 })
    }

    let percentual = pctRaw != null && pctRaw !== "" ? Number(String(pctRaw).replace(",", ".")) : 10
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      return NextResponse.json({ error: "percentual deve ser um número entre 0 e 100." }, { status: 400 })
    }

    const { data: administradora } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantAtual = await getCurrentTenantId()
    const tenantId = administradora?.tenant_id || tenantAtual

    const corretor = await CorretoresAdministradoraService.buscarPorId(corretorId, administradoraId)
    if (!corretor) {
      return NextResponse.json({ error: "Corretor não encontrado para esta administradora." }, { status: 404 })
    }

    const inicio = primeiroDiaMes(ano, mes)
    const fim = ultimoDiaMes(ano, mes)

    let q = supabaseAdmin
      .from("faturas")
      .select("id, cliente_administradora_id, cliente_nome, valor, status, vencimento, numero_fatura")
      .eq("administradora_id", administradoraId)
      .gte("vencimento", inicio)
      .lte("vencimento", fim)
      .order("vencimento", { ascending: true })
      .limit(8000)

    if (tenantId) {
      q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    }

    const { data: faturasRaw, error: errFaturas } = await q
    if (errFaturas) {
      console.error("relatório comissão — faturas:", errFaturas)
      return NextResponse.json(
        { error: errFaturas.message || "Erro ao buscar faturas" },
        { status: 500 }
      )
    }

    const faturasPagas = (faturasRaw || []).filter((f) => normalizarStatus(String(f.status || "")) === "paga")
    const clienteIds = Array.from(
      new Set(
        faturasPagas
          .map((f) => String(f.cliente_administradora_id || "").trim())
          .filter(Boolean)
      )
    )

    const mapaCorretorCliente = new Map<string, string | null>()
    for (const id of clienteIds) {
      mapaCorretorCliente.set(id, null)
    }

    if (clienteIds.length > 0) {
      const { data: cas, error: errCa } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, corretor_id")
        .eq("administradora_id", administradoraId)
        .in("id", clienteIds)

      if (!errCa && cas) {
        for (const row of cas as { id: string; corretor_id: string | null }[]) {
          const cid = String(row.id || "").trim()
          if (!cid) continue
          mapaCorretorCliente.set(cid, row.corretor_id ? String(row.corretor_id) : null)
        }
      }

      let qV = supabaseAdmin
        .from("vidas_importadas")
        .select("cliente_administradora_id, corretor_id")
        .eq("administradora_id", administradoraId)
        .in("cliente_administradora_id", clienteIds)

      if (tenantId) {
        qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      }

      const { data: vidas, error: errV } = await qV
      if (!errV && vidas) {
        for (const v of vidas as { cliente_administradora_id: string | null; corretor_id: string | null }[]) {
          const cid = String(v.cliente_administradora_id || "").trim()
          if (!cid) continue
          const corretorContrato = mapaCorretorCliente.get(cid)
          const vidaCor = v.corretor_id ? String(v.corretor_id) : null
          if (corretorContrato) continue
          if (vidaCor) mapaCorretorCliente.set(cid, vidaCor)
        }
      }
    }

    const linhas: Array<{
      fatura_id: string
      cliente_administradora_id: string
      cliente_nome: string
      numero_fatura: string | null
      valor_fatura: number
      vencimento: string | null
      percentual_comissao: number
      valor_comissao: number
    }> = []

    for (const f of faturasPagas) {
      const cid = String(f.cliente_administradora_id || "").trim()
      if (!cid) continue
      const corretorCliente = mapaCorretorCliente.get(cid) ?? null
      if (String(corretorCliente || "") !== corretorId) continue

      const valor = Number(f.valor ?? 0)
      const valorComissao = Number(((valor * percentual) / 100).toFixed(2))
      linhas.push({
        fatura_id: f.id,
        cliente_administradora_id: cid,
        cliente_nome: String(f.cliente_nome || "Cliente"),
        numero_fatura: f.numero_fatura ?? null,
        valor_fatura: valor,
        vencimento: f.vencimento ?? null,
        percentual_comissao: percentual,
        valor_comissao: valorComissao,
      })
    }

    const totalFaturas = linhas.reduce((s, l) => s + l.valor_fatura, 0)
    const totalComissao = Number(
      linhas.reduce((s, l) => s + l.valor_comissao, 0).toFixed(2)
    )

    return NextResponse.json({
      corretor: { id: corretor.id, nome: corretor.nome },
      periodo: { ano, mes, inicio, fim },
      percentual,
      criterio:
        "Faturas com status paga, vencimento no mês/ano indicado e cliente vinculado ao corretor (contrato ou vida importada).",
      total_registros: linhas.length,
      total_valor_faturas: Number(totalFaturas.toFixed(2)),
      total_comissao: totalComissao,
      linhas,
    })
  } catch (e: unknown) {
    console.error("Erro relatório de comissão:", e)
    return NextResponse.json(
      { error: mensagemErro(e) || "Erro ao montar relatório de comissão" },
      { status: 500 }
    )
  }
}
