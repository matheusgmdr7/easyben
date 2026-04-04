import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  cliente_id: string | null
  cliente_telefone: string | null
  numero_fatura: string | null
  valor: number | null
  status: string | null
  vencimento: string | null
  gateway_nome?: string | null
}

const FATURAS_SELECT_SEM_GATEWAY =
  "id, cliente_administradora_id, cliente_nome, cliente_id, cliente_telefone, numero_fatura, valor, status, vencimento"
const FATURAS_SELECT_COM_GATEWAY = `${FATURAS_SELECT_SEM_GATEWAY}, gateway_nome`

function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message?: unknown }).message)
  }
  return String(e)
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

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const ano = request.nextUrl.searchParams.get("ano")
    const mes = request.nextUrl.searchParams.get("mes")
    const grupoId = request.nextUrl.searchParams.get("grupo_id")
    const corretorId = request.nextUrl.searchParams.get("corretor_id")
    const statusParam = request.nextUrl.searchParams.get("status")
    const financeiraFiltro = String(request.nextUrl.searchParams.get("financeira") || "").trim().toLowerCase()

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const { data: administradora } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantAtual = await getCurrentTenantId()
    const tenantId = administradora?.tenant_id || tenantAtual

    if (ano && mes) {
      const anoNum = Number(ano)
      const mesNum = Number(mes)
      if (!Number.isFinite(anoNum) || !Number.isFinite(mesNum) || mesNum < 1 || mesNum > 12) {
        return NextResponse.json({ error: "Período inválido. Informe ano e mes válidos." }, { status: 400 })
      }
    }

    const montarQueryFaturas = (selectCols: string) => {
      let q = supabaseAdmin
        .from("faturas")
        .select(selectCols)
        .eq("administradora_id", administradoraId)
        .order("vencimento", { ascending: false })
        .limit(5000)
      if (tenantId) {
        q = q.eq("tenant_id", tenantId)
      }
      if (ano && mes) {
        const anoNum = Number(ano)
        const mesNum = Number(mes)
        q = q
          .gte("vencimento", primeiroDiaMes(anoNum, mesNum))
          .lte("vencimento", ultimoDiaMes(anoNum, mesNum))
      }
      return q
    }

    let faturasRaw: FaturaRow[] | null = null
    const r1 = await montarQueryFaturas(FATURAS_SELECT_COM_GATEWAY)
    if (!r1.error) {
      faturasRaw = r1.data as FaturaRow[] | null
    } else {
      console.warn("Relatório faturas: select com gateway_nome falhou, tentando sem coluna:", r1.error)
      const r2 = await montarQueryFaturas(FATURAS_SELECT_SEM_GATEWAY)
      if (r2.error) {
        console.error("Erro ao buscar faturas do relatório:", r2.error)
        return NextResponse.json(
          { error: `Erro ao buscar faturas: ${mensagemErro(r2.error)}` },
          { status: 500 }
        )
      }
      faturasRaw = r2.data as FaturaRow[] | null
    }

    const faturas = (faturasRaw || []) as FaturaRow[]

    // Padrão alinhado ao relatório de devedores: faturas em aberto (pendente/vencida/atrasada).
    const statusSolicitados = (statusParam || "pendente,vencida,atrasada")
      .split(",")
      .map((s) => normalizarStatus(s))
      .filter(Boolean)

    const statusSet = new Set(statusSolicitados)
    const faturasFiltradasStatus =
      statusSet.size === 0
        ? faturas
        : faturas.filter((f) => statusSet.has(normalizarStatus(String(f.status || ""))))

    const clienteIds = Array.from(
      new Set(
        faturasFiltradasStatus
          .map((f) => String(f.cliente_administradora_id || "").trim())
          .filter(Boolean)
      )
    )

    let mapaVida = new Map<
      string,
      { cpf: string | null; grupo_id: string | null; corretor_id: string | null }
    >()

    if (clienteIds.length > 0) {
      let queryVidas = supabaseAdmin
        .from("vidas_importadas")
        .select("cliente_administradora_id, cpf, grupo_id, corretor_id")
        .eq("administradora_id", administradoraId)
        .in("cliente_administradora_id", clienteIds)

      if (tenantId) {
        queryVidas = queryVidas.eq("tenant_id", tenantId)
      }

      const { data: vidas, error: vidasError } = await queryVidas
      if (!vidasError) {
        for (const vida of vidas || []) {
          const key = String((vida as any).cliente_administradora_id || "").trim()
          if (!key || mapaVida.has(key)) continue
          mapaVida.set(key, {
            cpf: (vida as any).cpf || null,
            grupo_id: (vida as any).grupo_id || null,
            corretor_id: (vida as any).corretor_id || null,
          })
        }
      }
    }

    const linhas = faturasFiltradasStatus
      .map((f) => {
        const clienteId = String(f.cliente_administradora_id || "").trim()
        const vida = clienteId ? mapaVida.get(clienteId) : undefined
        const grupoVida = vida?.grupo_id || null
        const corretorVida = vida?.corretor_id || null

        return {
          id: f.id,
          cliente_nome: f.cliente_nome || "Cliente",
          cpf: vida?.cpf || f.cliente_id || null,
          telefone: f.cliente_telefone || null,
          valor_fatura: Number(f.valor || 0),
          status: normalizarStatus(String(f.status || "")),
          vencimento: f.vencimento || null,
          numero_fatura: f.numero_fatura || null,
          financeira_nome: f.gateway_nome || null,
          grupo_id: grupoVida,
          corretor_id: corretorVida,
        }
      })
      .filter((item) => {
        if (grupoId && grupoId !== "todos" && item.grupo_id !== grupoId) return false
        if (corretorId && corretorId !== "todos" && item.corretor_id !== corretorId) return false
        if (financeiraFiltro) {
          const nome = String(item.financeira_nome || "").toLowerCase()
          if (!nome.includes(financeiraFiltro)) return false
        }
        return true
      })

    const total = linhas.reduce((acc, item) => acc + Number(item.valor_fatura || 0), 0)

    return NextResponse.json({
      total_registros: linhas.length,
      total_valor: Number(total.toFixed(2)),
      linhas,
    })
  } catch (e: unknown) {
    console.error("Erro relatório de faturas:", e)
    return NextResponse.json(
      { error: mensagemErro(e) || "Erro ao montar relatório de faturas" },
      { status: 500 }
    )
  }
}
