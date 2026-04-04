"use client"

import { useEffect, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  ExternalLink,
  Minus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { adicionarAlertaSistema } from "@/services/administradora-alertas-service"

type PendenciaFatura = {
  fatura_id: string
  cliente_nome: string
  vencimento: string
  status: string
  corretora: string
  link_boleto: string | null
}

type UltimaSincronizacao = {
  executadoEm: string
  verificadas: number
  atualizadas: number
  alteradas: number
}

type FinanceiraOpcao = { id: string; nome: string }

export default function AdministradoraDashboard() {
  const agora = new Date()
  const [administradora, setAdministradora] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [mesRef, setMesRef] = useState<string>(String(agora.getMonth() + 1).padStart(2, "0"))
  const [anoRef, setAnoRef] = useState<string>(String(agora.getFullYear()))
  const [dashboardData, setDashboardData] = useState({
    clientes_ativos: 0,
    clientes_base_mes_anterior: 0,
    clientes_variacao_abs: 0,
    clientes_variacao_percent: 0 as number | null,
    mes_referencia_variacao: { mes: 0, ano: 0 },
    faturas_pendentes: 0,
    valor_em_aberto: 0,
    valor_recebido_mes: 0,
  })
  const [pendenciasFaturas, setPendenciasFaturas] = useState<PendenciaFatura[]>([])
  const [pendenciasTotalPeriodo, setPendenciasTotalPeriodo] = useState(0)
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<UltimaSincronizacao | null>(null)
  const [paginaPendencias, setPaginaPendencias] = useState(1)
  const [financeiras, setFinanceiras] = useState<FinanceiraOpcao[]>([])
  const [financeiraId, setFinanceiraId] = useState("")
  /** API indica que não foi possível ler filtrar por gateway (falta coluna gateway_nome, etc.). */
  const [alertaFiltroGateway, setAlertaFiltroGateway] = useState(false)

  async function carregarDashboard(administradoraId: string, ano: string, mes: string, financeiraIdParam?: string) {
    const fin = financeiraIdParam !== undefined ? financeiraIdParam : financeiraId
    const qs = new URLSearchParams({
      administradora_id: administradoraId,
      ano,
      mes,
    })
    if (fin && fin.trim()) qs.set("financeira_id", fin.trim())
    const res = await fetch(`/api/administradora/dashboard?${qs.toString()}`, { cache: "no-store" })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(payload?.error || "Erro ao buscar dashboard")
    const alerta = payload?.alerta as { tipo?: string } | undefined
    setAlertaFiltroGateway(alerta?.tipo === "gateway_nome_indisponivel")
    const c = payload?.cards || {}
    setDashboardData({
      clientes_ativos: Number(c.clientes_ativos ?? 0),
      clientes_base_mes_anterior: Number(c.clientes_base_mes_anterior ?? 0),
      clientes_variacao_abs: Number(c.clientes_variacao_abs ?? 0),
      clientes_variacao_percent:
        c.clientes_variacao_percent != null && c.clientes_variacao_percent !== ""
          ? Number(c.clientes_variacao_percent)
          : null,
      mes_referencia_variacao: c.mes_referencia_variacao || { mes: 0, ano: 0 },
      faturas_pendentes: Number(c.faturas_pendentes ?? 0),
      valor_em_aberto: Number(c.valor_em_aberto ?? 0),
      valor_recebido_mes: Number(c.valor_recebido_mes ?? 0),
    })
    setPendenciasFaturas(Array.isArray(payload?.pendencias_faturas) ? payload.pendencias_faturas : [])
    setPendenciasTotalPeriodo(
      typeof payload?.pendencias_total === "number" ? payload.pendencias_total : 0
    )
    setPaginaPendencias(1)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const administradoraLogada = getAdministradoraLogada()
        if (!administradoraLogada) return
        setAdministradora(administradoraLogada)
        const storageKey = `administradora_dashboard_ultima_sync_${administradoraLogada.id}`
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          try {
            setUltimaSincronizacao(JSON.parse(raw))
          } catch {
            setUltimaSincronizacao(null)
          }
        }
        const finRes = await fetch(
          `/api/administradora/financeiras?administradora_id=${encodeURIComponent(administradoraLogada.id)}`,
          { cache: "no-store" }
        )
        if (finRes.ok) {
          const lista = await finRes.json().catch(() => [])
          const arr = Array.isArray(lista) ? lista : []
          setFinanceiras(
            arr.map((f: { id?: string; nome?: string }) => ({
              id: String(f?.id || ""),
              nome: String(f?.nome || "Financeira"),
            })).filter((f: FinanceiraOpcao) => f.id)
          )
        }
        await carregarDashboard(administradoraLogada.id, String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"), "")
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function sincronizarStatusAgora() {
    if (!administradora?.id) return
    try {
      setSincronizando(true)
      const body: { administradora_id: string; financeira_id?: string } = {
        administradora_id: administradora.id,
      }
      if (financeiraId.trim()) body.financeira_id = financeiraId.trim()

      const res = await fetch("/api/sincronizar-status-asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || "Erro na sincronização")

      const verificadas = Number(payload?.faturas_verificadas || 0)
      const atualizadas = Number(payload?.faturas_atualizadas || 0)
      const alteracoes = Array.isArray(payload?.alteracoes_status) ? payload.alteracoes_status : []
      const alteradas = alteracoes.length

      const resumoSync: UltimaSincronizacao = {
        executadoEm: new Date().toISOString(),
        verificadas,
        atualizadas,
        alteradas,
      }
      setUltimaSincronizacao(resumoSync)
      localStorage.setItem(`administradora_dashboard_ultima_sync_${administradora.id}`, JSON.stringify(resumoSync))

      toast.success(
        `Sincronização concluída: ${atualizadas} atualizadas de ${verificadas} verificadas (${alteradas} com troca de status).`
      )

      if (Array.isArray(payload?.erros) && payload.erros.length > 0) {
        const primeira = String(payload.erros[0] || "")
        toast.info(`Sincronização concluída com avisos: ${primeira}`)
      }

      if (alteradas > 0) {
        const top = alteracoes.slice(0, 8)
        const linhas = top.map((a: any) => {
          const nome = String(a?.cliente_nome || a?.numero_fatura || a?.fatura_id || "Fatura")
          return `- ${nome}: ${String(a?.de || "-")} -> ${String(a?.para || "-")}`
        })
        const complemento = alteradas > top.length ? `\n... e mais ${alteradas - top.length} alteração(ões).` : ""
        adicionarAlertaSistema({
          titulo: "Relatório de sincronização do gateway",
          mensagem: `Faturas verificadas: ${verificadas}\nAtualizadas: ${atualizadas}\nStatus alterados: ${alteradas}\n\n${linhas.join("\n")}${complemento}`,
          tipo: "info",
        })
      }

      await carregarDashboard(administradora.id, anoRef, mesRef, financeiraId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao sincronizar status com o Asaas")
    } finally {
      setSincronizando(false)
    }
  }

  async function aplicarFiltroPeriodo() {
    if (!administradora?.id) return
    try {
      setLoading(true)
      await carregarDashboard(administradora.id, anoRef, mesRef, financeiraId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar filtro de período")
    } finally {
      setLoading(false)
    }
  }

  async function aoMudarFinanceira(novoId: string) {
    setFinanceiraId(novoId)
    if (!administradora?.id) return
    try {
      setLoading(true)
      await carregarDashboard(administradora.id, anoRef, mesRef, novoId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar financeira")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  const nomesMesCompleto = [
    "",
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ]

  const variacaoClientes = dashboardData.clientes_variacao_abs
  const pctVariacao = dashboardData.clientes_variacao_percent
  const refV = dashboardData.mes_referencia_variacao
  const refMesTituloCompleto =
    refV.mes >= 1 && refV.mes <= 12 ? `${nomesMesCompleto[refV.mes]} de ${refV.ano}` : "mês anterior"
  const baseAnterior = dashboardData.clientes_base_mes_anterior

  const badgeStatus = (status: string) => {
    const s = String(status || "").toLowerCase()
    if (s === "vencida") return "bg-red-100 text-red-700"
    if (s === "atrasada") return "bg-amber-100 text-amber-800"
    if (s === "pendente") return "bg-sky-100 text-sky-900"
    return "bg-gray-100 text-gray-700"
  }

  function rotuloStatus(status: string) {
    const s = String(status || "").toLowerCase()
    if (s === "pendente") return "Pendente"
    if (s === "atrasada") return "Atrasada"
    if (s === "vencida") return "Vencida"
    return status || "—"
  }

  const pendenciasFiltradas = pendenciasFaturas

  const itensPorPaginaPendencias = 10
  const totalPaginasPendencias = Math.max(1, Math.ceil(pendenciasFiltradas.length / itensPorPaginaPendencias))
  const paginaAtualPendencias = Math.min(paginaPendencias, totalPaginasPendencias)
  const pendenciasPaginadas = pendenciasFiltradas.slice(
    (paginaAtualPendencias - 1) * itensPorPaginaPendencias,
    paginaAtualPendencias * itensPorPaginaPendencias
  )

  const btnSquare = "rounded-sm"

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="relative overflow-hidden rounded-sm border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Visão geral</p>
              <h1 className="mt-1 text-2xl md:text-[1.65rem] font-bold tracking-tight text-slate-900">
                Dashboard executivo
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-600">
                {administradora?.nome_fantasia || administradora?.nome || "Administradora"}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 max-w-2xl">
                {ultimaSincronizacao
                  ? `Última sincronização: ${new Date(ultimaSincronizacao.executadoEm).toLocaleString("pt-BR")} · Verificadas: ${ultimaSincronizacao.verificadas} · Atualizadas: ${ultimaSincronizacao.atualizadas} · Status alterados: ${ultimaSincronizacao.alteradas}`
                  : "Última sincronização: ainda não executada neste navegador."}
              </p>
            </div>
            <div className="w-full min-w-0 lg:max-w-[min(100%,36rem)] xl:max-w-[min(100%,44rem)] lg:shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[200px] sm:max-w-[min(100%,16rem)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Período</span>
                    <div className="flex flex-wrap gap-2 items-end">
                      <select
                        value={mesRef}
                        onChange={(e) => setMesRef(e.target.value)}
                        aria-label="Mês"
                        className={`h-10 min-w-0 flex-1 sm:min-w-[9.5rem] sm:flex-initial ${btnSquare} border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]`}
                      >
                        <option value="01">Janeiro</option>
                        <option value="02">Fevereiro</option>
                        <option value="03">Março</option>
                        <option value="04">Abril</option>
                        <option value="05">Maio</option>
                        <option value="06">Junho</option>
                        <option value="07">Julho</option>
                        <option value="08">Agosto</option>
                        <option value="09">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                      </select>
                      <input
                        type="number"
                        value={anoRef}
                        onChange={(e) => setAnoRef(e.target.value)}
                        aria-label="Ano"
                        className={`h-10 w-[5.5rem] shrink-0 ${btnSquare} border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]`}
                        min={2000}
                        max={2100}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${btnSquare} h-10 w-full shrink-0 border-slate-300 sm:w-auto sm:min-w-[8.5rem]`}
                    onClick={aplicarFiltroPeriodo}
                    disabled={loading || sincronizando}
                  >
                    Aplicar período
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <label htmlFor="dashboard-financeira" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Financeira
                    </label>
                    <select
                      id="dashboard-financeira"
                      value={financeiraId}
                      onChange={(e) => void aoMudarFinanceira(e.target.value)}
                      className={`h-10 w-full min-w-0 ${btnSquare} border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]`}
                      disabled={loading || sincronizando}
                    >
                      <option value="">Todas as financeiras</option>
                      {financeiras.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    className={`${btnSquare} h-10 w-full shrink-0 sm:w-auto sm:min-w-[12rem]`}
                    disabled={sincronizando || loading}
                    onClick={sincronizarStatusAgora}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 shrink-0 ${sincronizando ? "animate-spin" : ""}`} />
                    {sincronizando ? "Sincronizando..." : "Sincronizar com gateway"}
                  </Button>
                </div>
                {alertaFiltroGateway && financeiraId.trim() ? (
                  <div className="w-full min-w-0 max-w-full px-0 pt-1">
                    <Alert
                      variant="warning"
                      className="w-full min-w-0 max-w-full border-amber-200 bg-amber-50/95 text-amber-950"
                    >
                      <AlertDescription className="text-xs leading-relaxed break-words sm:text-[13px] [&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:text-[11px]">
                        <strong className="font-semibold">Filtro por financeira não aplicado.</strong> A tabela{" "}
                        <code>faturas</code> precisa da coluna <code>gateway_nome</code> (preenchida ao gerar boletos).
                        No Supabase, execute o script{" "}
                        <code>scripts/adicionar-coluna-gateway-nome-faturas.sql</code> ou rode o{" "}
                        <code>scripts/adicionar-colunas-boleto-faturas.sql</code> atualizado. Até lá, os totais deste
                        mês incluem <strong>todas</strong> as faturas, não só a financeira escolhida.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 border-l-2 border-slate-300 pl-3">
        Faturas: <span className="font-medium text-slate-700">{mesRef}/{anoRef}</span> · Clientes: evolução vs fim de{" "}
        <span className="font-medium text-slate-700">{refMesTituloCompleto}</span>.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Clientes ativos + evolução */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Clientes ativos</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {dashboardData.clientes_ativos.toLocaleString("pt-BR")}
              </p>
              <p
                className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600"
                role="status"
                aria-label={`Fim de ${refMesTituloCompleto}: ${baseAnterior} cadastrados. Variação: ${variacaoClientes >= 0 ? "+" : ""}${variacaoClientes}`}
              >
                <span>
                  Fim de {refMesTituloCompleto}:{" "}
                  <span className="tabular-nums font-medium text-slate-800">
                    {baseAnterior.toLocaleString("pt-BR")}
                  </span>
                </span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold tabular-nums",
                    variacaoClientes > 0 && "text-emerald-800",
                    variacaoClientes < 0 && "text-rose-800",
                    variacaoClientes === 0 && "text-slate-600"
                  )}
                >
                  {variacaoClientes > 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  ) : variacaoClientes < 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  )}
                  {variacaoClientes > 0 ? "+" : ""}
                  {variacaoClientes.toLocaleString("pt-BR")}
                  {pctVariacao != null && baseAnterior > 0 ? (
                    <span className="font-medium text-slate-600">
                      {" "}
                      ({pctVariacao > 0 ? "+" : ""}
                      {pctVariacao.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%)
                    </span>
                  ) : baseAnterior === 0 && dashboardData.clientes_ativos > 0 ? (
                    <span className="font-normal text-slate-500"> (base era 0)</span>
                  ) : null}
                </span>
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Faturas pendentes */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Faturas pendentes</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {dashboardData.faturas_pendentes.toLocaleString("pt-BR")}
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <Clock className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 pt-3 border-t border-slate-100/90">
            Quantidade no período com status pendente, vencida ou atrasada (vencimento no mês selecionado).
          </p>
        </div>

        {/* Valor em aberto */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Valor em aberto</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {formatarMoeda(dashboardData.valor_em_aberto || 0)}
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <DollarSign className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 pt-3 border-t border-slate-100/90">
            Soma dos valores de todas as faturas não pagas no período (vencimento no mês selecionado).
          </p>
        </div>

        {/* Recebido este mês */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Recebido este mês</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {formatarMoeda(dashboardData.valor_recebido_mes || 0)}
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 pt-3 border-t border-slate-100/90">
            Total das faturas pagas com data de pagamento no mês do período.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
            Faturas atrasadas e pendentes
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
            Faturas com status pendente, vencida ou atrasada e <span className="font-medium text-slate-600">data de vencimento no período</span> selecionado (mês/ano). Corretora conforme vínculo na vida importada.
            {financeiraId ? (
              <span className="block mt-1">
                Filtro de financeira: apenas faturas geradas com a conta Asaas correspondente à opção selecionada no topo.
              </span>
            ) : null}
          </p>
          {pendenciasTotalPeriodo > pendenciasFiltradas.length && (
            <p className="text-[11px] text-amber-800 mt-2 rounded-sm bg-amber-50 border border-amber-100 px-2 py-1.5 inline-block">
              Total no período: {pendenciasTotalPeriodo} fatura(s). Abaixo, até {pendenciasFiltradas.length} na listagem.
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Vencimento</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Corretora</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Link do boleto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma fatura pendente ou atrasada neste período.
                  </td>
                </tr>
              ) : (
                pendenciasPaginadas.map((item, idx) => (
                  <tr
                    key={item.fatura_id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{item.cliente_nome}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">
                      {item.vencimento ? formatarData(item.vencimento) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-sm text-xs font-medium ${badgeStatus(item.status)}`}
                      >
                        {rotuloStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{item.corretora || "—"}</td>
                    <td className="px-4 py-2.5">
                      {item.link_boleto ? (
                        <a
                          href={item.link_boleto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          Abrir
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-500">
            Mostrando {pendenciasPaginadas.length} de {pendenciasFiltradas.length} na página
            {pendenciasTotalPeriodo > 0 ? (
              <>
                {" "}
                · Total no período: <span className="font-medium text-slate-700">{pendenciasTotalPeriodo}</span>
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={`${btnSquare} border-slate-300`}
              onClick={() => setPaginaPendencias((p) => Math.max(1, p - 1))}
              disabled={paginaAtualPendencias <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm tabular-nums text-slate-600 px-1">
              Página {paginaAtualPendencias} de {totalPaginasPendencias}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={`${btnSquare} border-slate-300`}
              onClick={() => setPaginaPendencias((p) => Math.min(totalPaginasPendencias, p + 1))}
              disabled={paginaAtualPendencias >= totalPaginasPendencias}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
