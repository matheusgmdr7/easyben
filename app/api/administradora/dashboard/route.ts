import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { FinanceirasService } from "@/services/financeiras-service"
import { faturaPertenceAFinanceira, gatewayAsaasComoNoBanco } from "@/lib/fatura-filtro-financeira"
import {
  classificarUmBoletoAtraso,
  contarFaturasAtrasadasTotaisPorCliente,
  contarHistoricoFaturasPorCliente,
  identificarClientesCanceladosPorInadimplencia,
  montarResumoAtrasadasNoPeriodo,
  type SegmentoAtraso,
} from "@/lib/dashboard-pendencias-atrasadas"
import { faturaEstaPaga, normalizarStatusFatura } from "@/lib/fatura-status"
import {
  primeiroTelefoneDeVida,
  resolverTelefoneClienteCobranca,
} from "@/lib/telefone-cliente-cobranca"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  cliente_telefone?: string | null
  numero_fatura?: string | null
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
  pagamento_valor?: number | null
  asaas_charge_id?: string | null
}

const FATURAS_SELECT_SEM_GATEWAY =
  "id, cliente_administradora_id, cliente_nome, cliente_telefone, numero_fatura, valor, status, vencimento, pagamento_data, boleto_url, asaas_boleto_url, asaas_invoice_url, asaas_payment_link, asaas_charge_id"
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

function resolverFinanceiraDaFatura(
  f: FaturaRow,
  financeiras: Awaited<ReturnType<typeof FinanceirasService.listar>>
): { financeira_id: string | null; financeira_nome: string | null } {
  const nomePorId = new Map(
    financeiras.map((fin) => [fin.id, String(fin.nome || "Financeira").trim() || "Financeira"])
  )
  const fid = String(f.financeira_id || "").trim()
  if (fid && nomePorId.has(fid)) {
    return { financeira_id: fid, financeira_nome: nomePorId.get(fid)! }
  }

  const gw = String(f.gateway_nome || "").trim()
  const extraido = gw.replace(/^Asaas\s*-\s*/i, "").trim()
  if (extraido && extraido.toLowerCase() !== "asaas") {
    const el = extraido.toLowerCase()
    for (const fin of financeiras) {
      const nome = String(fin.nome || "").trim()
      if (!nome) continue
      const nl = nome.toLowerCase()
      if (el === nl || el.startsWith(nl) || nl.startsWith(el)) {
        return { financeira_id: fin.id, financeira_nome: nome }
      }
    }
    return { financeira_id: fid || null, financeira_nome: extraido }
  }

  const ativas = financeiras.filter((x) => x.ativo)
  if (ativas.length === 1) {
    return {
      financeira_id: ativas[0].id,
      financeira_nome: String(ativas[0].nome || "Financeira").trim() || "Financeira",
    }
  }

  return {
    financeira_id: fid || null,
    financeira_nome: fid ? nomePorId.get(fid) || null : null,
  }
}

type VidaMap = {
  grupo_id: string | null
  corretor_id: string | null
}

function normalizarStatus(status: string | null | undefined): string {
  return normalizarStatusFatura(status)
}

function valorNumerico(valor: unknown): number {
  const n = Number(valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Valor que entrou no caixa: o pago quando existe, senão o valor da fatura. */
function valorRecebidoDaFatura(f: FaturaRow): number {
  const pago = valorNumerico(f.pagamento_valor)
  if (pago > 0) return pago
  return valorNumerico(f.valor)
}

/** A mesma cobrança do gateway às vezes está em duas linhas. Conta só a primeira. */
function cobrancasUnicas(rows: FaturaRow[]): FaturaRow[] {
  const vistas = new Set<string>()
  const unicas: FaturaRow[] = []
  for (const f of rows) {
    const charge = String(f.asaas_charge_id || "").trim()
    const chave = charge || `id:${String(f.id || "")}`
    if (!chave || vistas.has(chave)) continue
    vistas.add(chave)
    unicas.push(f)
  }
  return unicas
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

    const financeirasCadastro = await FinanceirasService.listar(administradoraId)

    const prevMonthNum = mes > 1 ? mes - 1 : 12
    const prevYearNum = mes > 1 ? ano : ano - 1
    const fimMesAnterior = new Date(Date.UTC(prevYearNum, prevMonthNum, 0, 23, 59, 59, 999))
    const fimMesAnteriorIso = fimMesAnterior.toISOString()

    const { data: gruposInativos, error: erroGruposInativos } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .eq("ativo", false)
    if (erroGruposInativos) throw erroGruposInativos
    const idsGruposInativos = (gruposInativos || []).map((g) => String(g.id)).filter(Boolean)

    const [{ count: vidasCount }, { count: vidasAteMesAnterior }, { data: grupos }, { data: corretores }] = await Promise.all([
      (() => {
        let q = supabaseAdmin
          .from("vidas_importadas")
          .select("id", { count: "exact", head: true })
          .eq("administradora_id", administradoraId)
          .eq("tenant_id", tenantId)
          .neq("ativo", false)
          .not("grupo_id", "is", null)
        if (idsGruposInativos.length > 0) q = q.not("grupo_id", "in", `(${idsGruposInativos.join(",")})`)
        return q
      })(),
      (() => {
        let q = supabaseAdmin
          .from("vidas_importadas")
          .select("id", { count: "exact", head: true })
          .eq("administradora_id", administradoraId)
          .eq("tenant_id", tenantId)
          .neq("ativo", false)
          .not("grupo_id", "is", null)
          .lte("created_at", fimMesAnteriorIso)
        if (idsGruposInativos.length > 0) q = q.not("grupo_id", "in", `(${idsGruposInativos.join(",")})`)
        return q
      })(),
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
    const anoProximo = mes === 12 ? ano + 1 : ano
    const mesProximo = mes === 12 ? 1 : mes + 1
    const inicioProximoMes = `${anoProximo}-${String(mesProximo).padStart(2, "0")}-01`
    const inicioMesAnterior = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}-01`
    const fimMesAnteriorData = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}-${String(
      new Date(Date.UTC(prevYearNum, prevMonthNum, 0)).getUTCDate()
    ).padStart(2, "0")}`

    async function buscarFaturasPaginado(
      colunas: string,
      filtro: "vencimento" | "pagamento",
      intervalo?: { inicio: string; fim: string }
    ): Promise<FaturaRow[]> {
      const acumulado: FaturaRow[] = []
      let from = 0
      while (true) {
        let qFat = supabaseAdmin.from("faturas").select(colunas).eq("administradora_id", administradoraId)
        if (filtro === "vencimento") {
          qFat = qFat
            .gte("vencimento", intervalo?.inicio || inicioPeriodo)
            .lte("vencimento", intervalo?.fim || fimPeriodoIso)
        } else {
          qFat = qFat.gte("pagamento_data", inicioPeriodo).lt("pagamento_data", inicioProximoMes)
        }
        const tidFat = String(tenantId || "").trim()
        if (tidFat) {
          qFat = qFat.or(`tenant_id.eq.${tidFat},tenant_id.is.null`)
        } else {
          qFat = qFat.is("tenant_id", null)
        }
        const { data: chunk, error } = await qFat.order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1)

        if (error) throw error
        const lista = (chunk || []) as unknown as FaturaRow[]
        acumulado.push(...lista)
        if (lista.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
      return acumulado
    }

    async function listarFaturas(
      filtro: "vencimento" | "pagamento",
      intervalo?: { inicio: string; fim: string }
    ): Promise<FaturaRow[]> {
      const comFinanceira = Boolean(financeiraIdParam && financeiraFiltroNome)
      const tentativas = comFinanceira
        ? filtro === "pagamento"
          ? [
              `${FATURAS_SELECT_COM_GATEWAY_FIN}, pagamento_valor`,
              `${FATURAS_SELECT_COM_GATEWAY}, pagamento_valor`,
              FATURAS_SELECT_COM_GATEWAY_FIN,
              FATURAS_SELECT_COM_GATEWAY,
            ]
          : [FATURAS_SELECT_COM_GATEWAY_FIN, FATURAS_SELECT_COM_GATEWAY, FATURAS_SELECT_SEM_GATEWAY]
        : filtro === "pagamento"
          ? [`${FATURAS_SELECT_SEM_GATEWAY}, pagamento_valor`, FATURAS_SELECT_SEM_GATEWAY]
          : [FATURAS_SELECT_SEM_GATEWAY]

      let ultimoErro: unknown = null
      for (const colunas of tentativas) {
        try {
          const rows = await buscarFaturasPaginado(colunas, filtro, intervalo)
          if (comFinanceira) return filtrarFaturasPorFinanceiraEmMemoria(rows)
          return rows
        } catch (e) {
          ultimoErro = e
          const msg = e instanceof Error ? e.message : String(e)
          if (!/column/i.test(msg)) throw e
        }
      }
      throw ultimoErro instanceof Error ? ultimoErro : new Error("Erro ao listar faturas")
    }

    let filtroFinanceiraIndisponivel = false

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

    /**
     * Pendentes e valor em aberto: só faturas com vencimento no mês que ainda não foram pagas.
     * Recebido: pagamentos cuja data cai no mês, mesmo com vencimento em outro mês.
     * O filtro de financeira roda em memória para não perder boleto legado com gateway truncado.
     */
    let faturas: FaturaRow[] = []
    let faturasRecebidas: FaturaRow[] = []
    let boletosMesAnterior = 0
    let atrasadasTotaisPorCliente = new Map<string, number>()
    let historicoPorCliente = new Map<string, { total: number; pagas: number }>()
    const intervaloMesAnterior = { inicio: inicioMesAnterior, fim: fimMesAnteriorData }

    try {
      const [mesRows, recebidoRows, anteriorRows, atrasadasMap, historicoMap] = await Promise.all([
        listarFaturas("vencimento"),
        listarFaturas("pagamento"),
        financeiraIdParam
          ? listarFaturas("vencimento", intervaloMesAnterior)
          : buscarFaturasPaginado("id, asaas_charge_id", "vencimento", intervaloMesAnterior),
        contarFaturasAtrasadasTotaisPorCliente(administradoraId, tenantId),
        contarHistoricoFaturasPorCliente(administradoraId, tenantId),
      ])
      faturas = cobrancasUnicas(mesRows)
      faturasRecebidas = cobrancasUnicas(recebidoRows)
      boletosMesAnterior = cobrancasUnicas(anteriorRows).length
      atrasadasTotaisPorCliente = atrasadasMap
      historicoPorCliente = historicoMap
    } catch (e) {
      if (financeiraIdParam) {
        console.warn(
          "dashboard: não foi possível listar faturas com gateway_nome/financeira_id; filtro por financeira desativado",
          e
        )
        filtroFinanceiraIndisponivel = true
        const [mesRows, recebidoRows, anteriorRows, atrasadasMap, historicoMap] = await Promise.all([
          buscarFaturasPaginado(FATURAS_SELECT_SEM_GATEWAY, "vencimento"),
          buscarFaturasPaginado(FATURAS_SELECT_SEM_GATEWAY, "pagamento"),
          buscarFaturasPaginado("id, asaas_charge_id", "vencimento", intervaloMesAnterior),
          contarFaturasAtrasadasTotaisPorCliente(administradoraId, tenantId),
          contarHistoricoFaturasPorCliente(administradoraId, tenantId),
        ])
        faturas = cobrancasUnicas(mesRows)
        faturasRecebidas = cobrancasUnicas(recebidoRows)
        boletosMesAnterior = cobrancasUnicas(anteriorRows).length
        atrasadasTotaisPorCliente = atrasadasMap
        historicoPorCliente = historicoMap
      } else {
        throw e
      }
    }

    const boletosGerados = faturas.length
    const boletosVariacaoAbs = boletosGerados - boletosMesAnterior
    const boletosVariacaoPercent: number | null =
      boletosMesAnterior > 0 ? Number(((boletosVariacaoAbs / boletosMesAnterior) * 100).toFixed(1)) : null

    const clientesAtivos = Number(vidasCount || 0)
    const clientesBaseMesAnterior = Number(vidasAteMesAnterior || 0)
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
      new Set(
        faturas
          .filter((f) => {
            if (faturaEstaPaga(f.status, f.pagamento_data)) return false
            const status = normalizarStatus(f.status)
            return status === "pendente" || status === "atrasada" || status === "vencida"
          })
          .map((f) => String(f.cliente_administradora_id || "").trim())
          .filter(Boolean)
      )
    )
    const vidaByClienteAdmId = new Map<string, VidaMap>()
    const telefoneVidaPorClienteAdm = new Map<string, string>()
    const telefoneCadastroPorClienteAdm = new Map<string, string>()
    if (clienteAdmIds.length > 0) {
      const lotes = []
      for (let i = 0; i < clienteAdmIds.length; i += 500) lotes.push(clienteAdmIds.slice(i, i + 500))
      const vidasPorLote = await Promise.all(
        lotes.map((lote) =>
          supabaseAdmin
            .from("vidas_importadas")
            .select("cliente_administradora_id, grupo_id, corretor_id, tipo, telefones, dados_adicionais")
            .eq("administradora_id", administradoraId)
            .eq("tenant_id", tenantId)
            .in("cliente_administradora_id", lote)
        )
      )
      for (const { data: vidasLote } of vidasPorLote) {
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

          const telVida = primeiroTelefoneDeVida(v as Record<string, unknown>)
          if (telVida) {
            const telAtual = telefoneVidaPorClienteAdm.get(clienteAdmId)
            if (!telAtual || tipo === "titular") {
              telefoneVidaPorClienteAdm.set(clienteAdmId, telVida)
            }
          }
        }
      }
    }

    if (clienteAdmIds.length > 0) {
      for (let i = 0; i < clienteAdmIds.length; i += 500) {
        const lote = clienteAdmIds.slice(i, i + 500)
        const { data: clientesLote } = await supabaseAdmin
          .from("vw_clientes_administradoras_completo")
          .select("id, cliente_telefone")
          .eq("administradora_id", administradoraId)
          .in("id", lote)

        for (const c of clientesLote || []) {
          const id = String((c as { id?: string }).id || "").trim()
          const tel = String((c as { cliente_telefone?: string }).cliente_telefone || "").trim()
          if (id && tel) telefoneCadastroPorClienteAdm.set(id, tel)
        }
      }
    }

    let faturasPendentes = 0
    let valorEmAberto = 0
    let recebidoMes = 0
    for (const f of faturasRecebidas) {
      if (!faturaEstaPaga(f.status, f.pagamento_data)) continue
      const pagoEm = String(f.pagamento_data || "").slice(0, 7)
      if (pagoEm !== periodoRef) continue
      recebidoMes += valorRecebidoDaFatura(f)
    }

    const pendenciasFaturas: Array<{
      fatura_id: string
      cliente_administradora_id: string | null
      cliente_nome: string
      cliente_telefone: string | null
      numero_fatura: string | null
      valor: number | null
      vencimento: string
      status: string
      corretora: string
      corretor_id?: string | null
      link_boleto: string | null
      financeira_id: string | null
      financeira_nome: string | null
      boletos_atrasados_total?: number
      segmento_atraso?: SegmentoAtraso
      cancelado_inadimplencia?: boolean
    }> = []

    const faturasAtrasadasPeriodo: Array<{ cliente_administradora_id: string | null }> = []

    for (const f of faturas) {
      const status = normalizarStatus(f.status)
      const valor = valorNumerico(f.valor)
      const isPaga = faturaEstaPaga(f.status, f.pagamento_data)
      const isPendente = status === "pendente"
      const isAtrasada = status === "atrasada"
      const isVencida = status === "vencida"

      if (!isPaga && (isPendente || isAtrasada || isVencida)) {
        faturasPendentes += 1
        valorEmAberto += valor
        const clienteAdmId = String(f.cliente_administradora_id || "").trim()
        const vidaCtx = clienteAdmId ? vidaByClienteAdmId.get(clienteAdmId) : undefined
        const corretora = vidaCtx?.corretor_id ? corretorNomeById.get(vidaCtx.corretor_id) || "—" : "—"
        if (isAtrasada) {
          faturasAtrasadasPeriodo.push({ cliente_administradora_id: clienteAdmId || null })
        }
        const telFatura = String(f.cliente_telefone || "").trim()
        const telVida = clienteAdmId ? telefoneVidaPorClienteAdm.get(clienteAdmId) || "" : ""
        const telCadastro = clienteAdmId ? telefoneCadastroPorClienteAdm.get(clienteAdmId) || "" : ""
        const finInfo = resolverFinanceiraDaFatura(f, financeirasCadastro)
        pendenciasFaturas.push({
          fatura_id: String(f.id),
          cliente_administradora_id: clienteAdmId || null,
          cliente_nome: String(f.cliente_nome || "Cliente"),
          cliente_telefone: resolverTelefoneClienteCobranca(telVida, telCadastro, telFatura),
          numero_fatura: f.numero_fatura ? String(f.numero_fatura) : null,
          valor: Number.isFinite(valor) ? valor : null,
          vencimento: String(f.vencimento || "").slice(0, 10),
          status,
          corretora,
          corretor_id: vidaCtx?.corretor_id || null,
          link_boleto: linkBoletoFatura(f),
          financeira_id: finInfo.financeira_id,
          financeira_nome: finInfo.financeira_nome,
        })
      }
    }

    const clientesComDuasOuMaisAtrasadas = Array.from(atrasadasTotaisPorCliente.entries())
      .filter(([, n]) => n >= 2)
      .map(([id]) => id)

    const canceladosInadimplencia = await identificarClientesCanceladosPorInadimplencia(
      clientesComDuasOuMaisAtrasadas,
      administradoraId,
      tenantId
    )

    for (const item of pendenciasFaturas) {
      if (item.status !== "atrasada") continue
      const caId = String(item.cliente_administradora_id || "").trim()
      if (!caId) continue
      const total = atrasadasTotaisPorCliente.get(caId) || 1
      item.boletos_atrasados_total = total
      if (total >= 2) {
        item.segmento_atraso = "dois_ou_mais"
      } else {
        item.segmento_atraso = classificarUmBoletoAtraso(historicoPorCliente.get(caId))
      }
      item.cancelado_inadimplencia =
        total >= 2 && canceladosInadimplencia.has(caId)
    }

    const resumoAtrasadas = montarResumoAtrasadasNoPeriodo(
      faturasAtrasadasPeriodo,
      atrasadasTotaisPorCliente,
      canceladosInadimplencia,
      historicoPorCliente
    )

    pendenciasFaturas.sort((a, b) => {
      const cmpFin = (a.financeira_nome || "").localeCompare(b.financeira_nome || "", "pt-BR")
      if (cmpFin !== 0) return cmpFin
      const cmp = a.vencimento.localeCompare(b.vencimento)
      if (cmp !== 0) return cmp
      return a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR")
    })

    const totalPendenciasPeriodo = pendenciasFaturas.length

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
        boletos_gerados: boletosGerados,
        boletos_gerados_mes_anterior: boletosMesAnterior,
        boletos_variacao_abs: boletosVariacaoAbs,
        boletos_variacao_percent: boletosVariacaoPercent,
      },
      pendencias_faturas: pendenciasFaturas,
      pendencias_total: totalPendenciasPeriodo,
      resumo_atrasadas: resumoAtrasadas,
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

