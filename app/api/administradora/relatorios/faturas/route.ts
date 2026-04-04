import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { FinanceirasService } from "@/services/financeiras-service"
import { faturaCombinaFiltroFinanceira, faturaPertenceAFinanceira } from "@/lib/fatura-filtro-financeira"

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
  boleto_url?: string | null
  asaas_boleto_url?: string | null
  asaas_invoice_url?: string | null
  asaas_payment_link?: string | null
  gateway_nome?: string | null
  financeira_id?: string | null
}

const FATURAS_BASE_COLS =
  "id, cliente_administradora_id, cliente_nome, cliente_id, cliente_telefone, numero_fatura, valor, status, vencimento, boleto_url, asaas_boleto_url, asaas_invoice_url, asaas_payment_link"
const FATURAS_SELECT_SEM_GATEWAY = FATURAS_BASE_COLS
const FATURAS_SELECT_COM_GATEWAY = `${FATURAS_BASE_COLS}, gateway_nome`
const FATURAS_SELECT_COM_GATEWAY_FIN = `${FATURAS_SELECT_COM_GATEWAY}, financeira_id`

function linkBoletoFatura(f: FaturaRow): string | null {
  const u =
    f.boleto_url ||
    f.asaas_boleto_url ||
    f.asaas_invoice_url ||
    f.asaas_payment_link
  if (u == null || String(u).trim() === "") return null
  return String(u).trim()
}

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

/** Primeiro número útil em `telefones` (JSONB) ou chaves de contato em `dados_adicionais`. */
function primeiroTelefoneDeVida(row: Record<string, unknown>): string | null {
  let arr: unknown = row.telefones
  if (typeof arr === "string" && arr.trim()) {
    try {
      arr = JSON.parse(arr) as unknown
    } catch {
      return arr.trim()
    }
  }
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (typeof item === "string") {
        const s = item.trim()
        if (s) return s
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>
        const ddd = String(o.ddd || o.codigo_area || "").replace(/\D/g, "")
        const raw = o.numero ?? o.telefone ?? o.phone ?? o.celular ?? o.whatsapp
        const num = raw != null ? String(raw).trim() : ""
        if (num) return ddd && !num.startsWith(ddd) ? `${ddd}${num}` : num
      }
    }
  }

  const dados = row.dados_adicionais
  if (dados && typeof dados === "object" && !Array.isArray(dados)) {
    for (const [key, val] of Object.entries(dados as Record<string, unknown>)) {
      if (!/telefone|celular|whatsapp|fone/i.test(key)) continue
      const s = val != null ? String(val).trim() : ""
      if (s) return s
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const ano = request.nextUrl.searchParams.get("ano")
    const mes = request.nextUrl.searchParams.get("mes")
    const grupoId = request.nextUrl.searchParams.get("grupo_id")
    const corretorId = request.nextUrl.searchParams.get("corretor_id")
    const statusParam = request.nextUrl.searchParams.get("status")
    const financeiraIdParam = request.nextUrl.searchParams.get("financeira_id")?.trim() || ""

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

    let financeiraFiltro = ""
    /** Nome da financeira quando o filtro vem por `financeira_id` (match por id + legado por gateway). */
    let nomeFinanceiraPorId = ""
    if (financeiraIdParam) {
      const fin = await FinanceirasService.buscarPorId(financeiraIdParam, administradoraId)
      if (!fin) {
        return NextResponse.json(
          { error: "Financeira não encontrada para esta administradora." },
          { status: 404 }
        )
      }
      nomeFinanceiraPorId = String(fin.nome).trim() || "Financeira"
      financeiraFiltro = nomeFinanceiraPorId.toLowerCase()
    } else {
      financeiraFiltro = String(request.nextUrl.searchParams.get("financeira") || "").trim().toLowerCase()
    }

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
        q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
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
    const r0 = await montarQueryFaturas(FATURAS_SELECT_COM_GATEWAY_FIN)
    if (!r0.error) {
      faturasRaw = r0.data as FaturaRow[] | null
    } else {
      console.warn("Relatório faturas: select com financeira_id falhou, tentando só gateway_nome:", r0.error)
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
      {
        cpf: string | null
        grupo_id: string | null
        corretor_id: string | null
        telefone: string | null
      }
    >()

    if (clienteIds.length > 0) {
      let queryVidas = supabaseAdmin
        .from("vidas_importadas")
        .select("cliente_administradora_id, cpf, grupo_id, corretor_id, telefones, dados_adicionais")
        .eq("administradora_id", administradoraId)
        .in("cliente_administradora_id", clienteIds)

      if (tenantId) {
        queryVidas = queryVidas.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      }

      const { data: vidas, error: vidasError } = await queryVidas
      if (!vidasError) {
        for (const vida of vidas || []) {
          const key = String((vida as any).cliente_administradora_id || "").trim()
          if (!key) continue
          const tel = primeiroTelefoneDeVida(vida as Record<string, unknown>)
          const row = {
            cpf: (vida as any).cpf || null,
            grupo_id: (vida as any).grupo_id || null,
            corretor_id: (vida as any).corretor_id || null,
            telefone: tel,
          }
          const prev = mapaVida.get(key)
          if (!prev) {
            mapaVida.set(key, row)
          } else {
            mapaVida.set(key, {
              cpf: prev.cpf || row.cpf,
              grupo_id: prev.grupo_id || row.grupo_id,
              corretor_id: prev.corretor_id || row.corretor_id,
              telefone: prev.telefone || row.telefone,
            })
          }
        }
      }
    }

    const linhas = faturasFiltradasStatus
      .filter((f) => {
        const clienteId = String(f.cliente_administradora_id || "").trim()
        const vida = clienteId ? mapaVida.get(clienteId) : undefined
        const grupoVida = vida?.grupo_id || null
        const corretorVida = vida?.corretor_id || null
        if (grupoId && grupoId !== "todos" && grupoVida !== grupoId) return false
        if (corretorId && corretorId !== "todos" && corretorVida !== corretorId) return false
        if (financeiraIdParam) {
          if (
            !faturaPertenceAFinanceira(
              f.financeira_id,
              f.gateway_nome,
              financeiraIdParam,
              nomeFinanceiraPorId
            )
          )
            return false
        } else if (financeiraFiltro && !faturaCombinaFiltroFinanceira(f.gateway_nome, financeiraFiltro)) {
          return false
        }
        return true
      })
      .map((f) => {
        const clienteId = String(f.cliente_administradora_id || "").trim()
        const vida = clienteId ? mapaVida.get(clienteId) : undefined
        const grupoVida = vida?.grupo_id || null
        const corretorVida = vida?.corretor_id || null

        const telFatura = String(f.cliente_telefone || "").trim()
        const telVida = String(vida?.telefone || "").trim()
        return {
          id: f.id,
          cliente_nome: f.cliente_nome || "Cliente",
          cpf: vida?.cpf || f.cliente_id || null,
          telefone: telFatura || telVida || null,
          valor_fatura: Number(f.valor || 0),
          status: normalizarStatus(String(f.status || "")),
          vencimento: f.vencimento || null,
          numero_fatura: f.numero_fatura || null,
          boleto_url: linkBoletoFatura(f),
          grupo_id: grupoVida,
          corretor_id: corretorVida,
        }
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
