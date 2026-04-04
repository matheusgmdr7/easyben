import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { FinanceirasService } from "@/services/financeiras-service"
import { faturaPertenceAFinanceira, gatewayAsaasComoNoBanco } from "@/lib/fatura-filtro-financeira"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  valor: number | null
  status: string | null
  vencimento: string | null
  pagamento_data: string | null
  boleto_url?: string | null
  asaas_boleto_url?: string | null
  asaas_invoice_url?: string | null
  asaas_payment_link?: string | null
  gateway_nome?: string | null
  financeira_id?: string | null
}

const FATURAS_SELECT_SEM_GATEWAY =
  "id, cliente_administradora_id, cliente_nome, valor, status, vencimento, pagamento_data, boleto_url, asaas_boleto_url, asaas_invoice_url, asaas_payment_link"
const FATURAS_SELECT_COM_GATEWAY = `${FATURAS_SELECT_SEM_GATEWAY}, gateway_nome`
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

/** Mesmo padrão de `lib/gerar-boleto-administradora.ts` ao gravar a fatura. */
function gatewayNomePorFinanceira(nomeFinanceira: string | null | undefined): string {
  return `Asaas - ${String(nomeFinanceira || "Financeira")}`
}

type VidaMap = {
  grupo_id: string | null
  corretor_id: string | null
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

function normalizarStatus(status: string | null | undefined): string {
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

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const anoParam = request.nextUrl.searchParams.get("ano")
    const mesParam = request.nextUrl.searchParams.get("mes")
    const financeiraIdParam = request.nextUrl.searchParams.get("financeira_id")?.trim() || ""
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantId = adm?.tenant_id || (await getCurrentTenantId())

    const hoje = new Date()
    const ano = anoParam ? Number(anoParam) : hoje.getFullYear()
    const mes = mesParam ? Number(mesParam) : hoje.getMonth() + 1
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Período inválido. Informe ano/mes válidos." }, { status: 400 })
    }

    const inicioPeriodo = `${ano}-${String(mes).padStart(2, "0")}-01`
    const fimPeriodo = new Date(Date.UTC(ano, mes, 0))
    const fimPeriodoIso = `${ano}-${String(mes).padStart(2, "0")}-${String(fimPeriodo.getUTCDate()).padStart(2, "0")}`
    const periodoRef = `${ano}-${String(mes).padStart(2, "0")}`

    let gatewayNomeFiltro: string | null = null
    /** Valor truncado como gravado em `faturas.gateway_nome` (para `.eq` no PostgREST). */
    let gatewayNomeEqFiltro: string | null = null
    let financeiraFiltroNome: string | null = null
    if (financeiraIdParam) {
      const fin = await FinanceirasService.buscarPorId(financeiraIdParam, administradoraId)
      if (!fin) {
        return NextResponse.json({ error: "Financeira não encontrada para esta administradora." }, { status: 404 })
      }
      financeiraFiltroNome = String(fin.nome || "").trim() || "Financeira"
      gatewayNomeFiltro = gatewayNomePorFinanceira(financeiraFiltroNome)
      gatewayNomeEqFiltro = gatewayAsaasComoNoBanco(financeiraFiltroNome)
    }

    const prevMonthNum = mes > 1 ? mes - 1 : 12
    const prevYearNum = mes > 1 ? ano : ano - 1
    const fimMesAnterior = new Date(Date.UTC(prevYearNum, prevMonthNum, 0, 23, 59, 59, 999))
    const fimMesAnteriorIso = fimMesAnterior.toISOString()

    const [{ count: vidasCount }, { count: vinculosCount }, { count: vidasAteMesAnterior }, { count: vinculosAteMesAnterior }, { data: grupos }, { data: corretores }] = await Promise.all([
      supabaseAdmin
        .from("vidas_importadas")
        .select("id", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("clientes_grupos")
        .select("id", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("vidas_importadas")
        .select("id", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .lte("created_at", fimMesAnteriorIso),
      supabaseAdmin
        .from("clientes_grupos")
        .select("id", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .lte("created_at", fimMesAnteriorIso),
      supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("corretores_administradora")
        .select("id, nome")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
    ])

    const PAGE_SIZE = 1000

    async function buscarFaturasPaginado(colunas: string, aplicarExtra?: (q: any) => any): Promise<FaturaRow[]> {
      const acumulado: FaturaRow[] = []
      let from = 0
      while (true) {
        let qFat = supabaseAdmin
          .from("faturas")
          .select(colunas)
          .eq("administradora_id", administradoraId)
          .gte("vencimento", inicioPeriodo)
          .lte("vencimento", fimPeriodoIso)
        const tidFat = String(tenantId || "").trim()
        if (tidFat) {
          qFat = qFat.or(`tenant_id.eq.${tidFat},tenant_id.is.null`)
        } else {
          qFat = qFat.is("tenant_id", null)
        }
        if (aplicarExtra) qFat = aplicarExtra(qFat)
        const { data: chunk, error } = await qFat
          .order("vencimento", { ascending: false })
          .range(from, from + PAGE_SIZE - 1)

        if (error) throw error
        const lista = (chunk || []) as FaturaRow[]
        acumulado.push(...lista)
        if (lista.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
      return acumulado
    }

    async function buscarPorFinanceiraComposta(): Promise<FaturaRow[]> {
      const porId = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY_FIN, (q) =>
        q.eq("financeira_id", financeiraIdParam)
      )
      const porGw = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY_FIN, (q) =>
        q.is("financeira_id", null).eq("gateway_nome", gatewayNomeEqFiltro!)
      )
      const map = new Map<string, FaturaRow>()
      for (const f of porId) map.set(f.id, f)
      for (const f of porGw) map.set(f.id, f)
      return Array.from(map.values())
    }

    let filtroFinanceiraIndisponivel = false
    let faturas: FaturaRow[] = []

    async function filtrarFaturasPorFinanceiraEmMemoria(todas: FaturaRow[]): Promise<FaturaRow[]> {
      const fins = await FinanceirasService.listar(administradoraId)
      const unicaFinanceiraAtiva = fins.filter((x) => x.ativo).length === 1
      return todas.filter((f) =>
        faturaPertenceAFinanceira(
          f.financeira_id,
          f.gateway_nome,
          financeiraIdParam,
          financeiraFiltroNome!,
          { tratarGatewayVazioComoMatch: unicaFinanceiraAtiva }
        )
      )
    }

    if (gatewayNomeFiltro && financeiraFiltroNome && financeiraIdParam) {
      try {
        faturas = await buscarPorFinanceiraComposta()
        if (faturas.length === 0) {
          let todas: FaturaRow[] = []
          try {
            todas = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY_FIN)
          } catch {
            todas = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY)
          }
          faturas = await filtrarFaturasPorFinanceiraEmMemoria(todas)
        }
      } catch (compostoErr) {
        console.warn(
          "dashboard: filtro financeira_id composto falhou; tentando só gateway_nome.eq",
          compostoErr
        )
        try {
          faturas = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY, (q) =>
            q.eq("gateway_nome", gatewayNomeEqFiltro!)
          )
          if (faturas.length === 0) {
            const todas = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY)
            faturas = await filtrarFaturasPorFinanceiraEmMemoria(todas)
          }
        } catch (eqErr) {
          console.warn("dashboard: filtro gateway_nome via eq falhou; aplicando filtro em memória", eqErr)
          try {
            const todas = await buscarFaturasPaginado(FATURAS_SELECT_COM_GATEWAY)
            faturas = await filtrarFaturasPorFinanceiraEmMemoria(todas)
          } catch (memErr) {
            console.warn(
              "dashboard: select com coluna gateway_nome falhou; buscando faturas sem gateway_nome (filtro por financeira desativado)",
              memErr
            )
            faturas = await buscarFaturasPaginado(FATURAS_SELECT_SEM_GATEWAY)
            filtroFinanceiraIndisponivel = true
          }
        }
      }
    } else {
      faturas = await buscarFaturasPaginado(FATURAS_SELECT_SEM_GATEWAY)
    }

    const clientesAtivos = (vidasCount || 0) > 0 ? Number(vidasCount || 0) : Number(vinculosCount || 0)
    const clientesBaseMesAnterior =
      (vidasCount || 0) > 0 ? Number(vidasAteMesAnterior || 0) : Number(vinculosAteMesAnterior || 0)
    const clientesVariacaoAbs = clientesAtivos - clientesBaseMesAnterior
    const clientesVariacaoPercent: number | null =
      clientesBaseMesAnterior > 0
        ? Number(((clientesVariacaoAbs / clientesBaseMesAnterior) * 100).toFixed(1))
        : null

    const grupoNomeById = new Map<string, string>()
    for (const g of grupos || []) {
      grupoNomeById.set(String((g as any).id), String((g as any).nome || "—"))
    }

    const corretorNomeById = new Map<string, string>()
    for (const c of corretores || []) {
      corretorNomeById.set(String((c as any).id), String((c as any).nome || "—"))
    }

    const clienteAdmIds = Array.from(
      new Set(faturas.map((f) => String(f.cliente_administradora_id || "").trim()).filter(Boolean))
    )
    const vidaByClienteAdmId = new Map<string, VidaMap>()
    if (clienteAdmIds.length > 0) {
      for (let i = 0; i < clienteAdmIds.length; i += 500) {
        const lote = clienteAdmIds.slice(i, i + 500)
        const { data: vidasLote } = await supabaseAdmin
          .from("vidas_importadas")
          .select("cliente_administradora_id, grupo_id, corretor_id, tipo")
          .eq("administradora_id", administradoraId)
          .eq("tenant_id", tenantId)
          .in("cliente_administradora_id", lote)

        for (const v of vidasLote || []) {
          const clienteAdmId = String((v as any)?.cliente_administradora_id || "").trim()
          if (!clienteAdmId) continue
          const tipo = String((v as any)?.tipo || "").toLowerCase()
          const atual = vidaByClienteAdmId.get(clienteAdmId)
          if (!atual || tipo === "titular") {
            vidaByClienteAdmId.set(clienteAdmId, {
              grupo_id: (v as any)?.grupo_id || null,
              corretor_id: (v as any)?.corretor_id || null,
            })
          }
        }
      }
    }

    let faturasPendentes = 0
    /** Soma de faturas não pagas no período (igual ao comportamento anterior do card). */
    let valorEmAberto = 0
    let recebidoMes = 0

    const pendenciasFaturas: Array<{
      fatura_id: string
      cliente_nome: string
      vencimento: string
      status: string
      corretora: string
      link_boleto: string | null
    }> = []

    for (const f of faturas) {
      const status = normalizarStatus(f.status)
      const valor = Number(f.valor || 0)

      const isPaga = status === "paga"
      const isPendente = status === "pendente"
      const isAtrasada = status === "atrasada"
      const isVencida = status === "vencida"

      if (isPendente || isAtrasada || isVencida) {
        faturasPendentes += 1
      }

      if (!isPaga) {
        valorEmAberto += valor
      }

      if (isPaga) {
        const dataPagamento = String(f.pagamento_data || "")
        if (dataPagamento.slice(0, 7) === periodoRef) {
          recebidoMes += valor
        }
      }

      if (isPendente || isAtrasada || isVencida) {
        const clienteAdmId = String(f.cliente_administradora_id || "").trim()
        const vidaCtx = clienteAdmId ? vidaByClienteAdmId.get(clienteAdmId) : undefined
        const corretora = vidaCtx?.corretor_id ? corretorNomeById.get(vidaCtx.corretor_id) || "—" : "—"
        pendenciasFaturas.push({
          fatura_id: String(f.id),
          cliente_nome: String(f.cliente_nome || "Cliente"),
          vencimento: String(f.vencimento || "").slice(0, 10),
          status,
          corretora,
          link_boleto: linkBoletoFatura(f),
        })
      }
    }

    pendenciasFaturas.sort((a, b) => {
      const cmp = a.vencimento.localeCompare(b.vencimento)
      if (cmp !== 0) return cmp
      return a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR")
    })

    const totalPendenciasPeriodo = pendenciasFaturas.length
    const pendenciasFaturasLista = pendenciasFaturas.slice(0, 100)

    return NextResponse.json({
      periodo: {
        ano,
        mes,
        inicio: inicioPeriodo,
        fim: fimPeriodoIso,
      },
      financeira: financeiraIdParam
        ? { id: financeiraIdParam, nome: financeiraFiltroNome, gateway_nome: gatewayNomeFiltro }
        : null,
      ...(filtroFinanceiraIndisponivel
        ? {
            alerta: {
              tipo: "gateway_nome_indisponivel",
            },
          }
        : {}),
      cards: {
        clientes_ativos: clientesAtivos,
        clientes_base_mes_anterior: clientesBaseMesAnterior,
        clientes_variacao_abs: clientesVariacaoAbs,
        clientes_variacao_percent: clientesVariacaoPercent,
        mes_referencia_variacao: { mes: prevMonthNum, ano: prevYearNum },
        faturas_pendentes: faturasPendentes,
        valor_em_aberto: Number(valorEmAberto.toFixed(2)),
        valor_recebido_mes: Number(recebidoMes.toFixed(2)),
      },
      pendencias_faturas: pendenciasFaturasLista,
      pendencias_total: totalPendenciasPeriodo,
    })
  } catch (e: unknown) {
    console.error("Erro dashboard administradora:", e)
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Erro ao montar dashboard"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

