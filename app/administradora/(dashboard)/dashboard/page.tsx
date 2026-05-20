"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Minus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react"
import * as XLSX from "xlsx"
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
  boletos_atrasados_total?: number
  segmento_atraso?: "um_boleto" | "dois_ou_mais" | null
  cancelado_inadimplencia?: boolean
}

type ResumoAtrasadasDashboard = {
  no_periodo: {
    total_faturas_atrasadas: number
    uma_fatura: { faturas: number; clientes: number }
    duas_ou_mais: {
      faturas: number
      clientes: number
      faturas_clientes_cancelados_inadimplencia: number
      clientes_cancelados_inadimplencia: number
    }
  }
}

type UltimaSincronizacao = {
  executadoEm: string
  verificadas: number
  atualizadas: number
  alteradas: number
}

type FinanceiraOpcao = { id: string; nome: string }

type FiltroPendencias = "todos" | "um_boleto" | "dois_ou_mais" | "cancelados_quitacao"

function slugArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48)
}

function rotuloFiltroPendencias(f: FiltroPendencias) {
  if (f === "um_boleto") return "1 boleto em aberto"
  if (f === "dois_ou_mais") return "2 ou mais boletos"
  if (f === "cancelados_quitacao") return "Cancelados — quitação pendente"
  return "Todos do período"
}

function rotuloSegmentoAtraso(item: PendenciaFatura) {
  if (item.segmento_atraso === "dois_ou_mais") return "2+ boletos"
  if (item.segmento_atraso === "um_boleto") return "1 boleto"
  return "—"
}

function CardResumoMinimal({
  titulo,
  valorPrincipal,
  detalhe,
}: {
  titulo: string
  valorPrincipal: React.ReactNode
  detalhe?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 max-w-full rounded-xl border border-slate-200/90",
        "bg-gradient-to-br from-slate-50 via-white to-slate-50/80 px-3.5 py-2.5",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{titulo}</p>
        <p className="mt-0.5 text-sm text-slate-800">{valorPrincipal}</p>
        {detalhe ? <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{detalhe}</p> : null}
      </div>
    </div>
  )
}

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
  const [resumoAtrasadas, setResumoAtrasadas] = useState<ResumoAtrasadasDashboard | null>(null)
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<UltimaSincronizacao | null>(null)
  const [paginaPendencias, setPaginaPendencias] = useState(1)
  const [filtroPendencias, setFiltroPendencias] = useState<FiltroPendencias>("todos")
  const [exportandoPdfPendencias, setExportandoPdfPendencias] = useState(false)
  const [exportandoExcelPendencias, setExportandoExcelPendencias] = useState(false)
  const [financeiras, setFinanceiras] = useState<FinanceiraOpcao[]>([])
  const [financeiraId, setFinanceiraId] = useState("")
  /** Período dos cards após o último carregamento com sucesso (evita usar mês/ano do select se o usuário não clicou em Aplicar). */
  const periodoDashboardRef = useRef({
    ano: String(agora.getFullYear()),
    mes: String(agora.getMonth() + 1).padStart(2, "0"),
  })
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
    setResumoAtrasadas(
      payload?.resumo_atrasadas?.no_periodo ? (payload.resumo_atrasadas as ResumoAtrasadasDashboard) : null
    )
    setPaginaPendencias(1)
    setFiltroPendencias("todos")
  }

  useEffect(() => {
    setPaginaPendencias(1)
  }, [filtroPendencias])

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
        const a0 = String(agora.getFullYear())
        const m0 = String(agora.getMonth() + 1).padStart(2, "0")
        await carregarDashboard(administradoraLogada.id, a0, m0, "")
        periodoDashboardRef.current = { ano: a0, mes: m0 }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const pendenciasFiltradas = useMemo(() => {
    if (filtroPendencias === "todos") return pendenciasFaturas
    return pendenciasFaturas.filter((item) => {
      if (item.status !== "atrasada") return false
      if (filtroPendencias === "um_boleto") return item.segmento_atraso === "um_boleto"
      if (filtroPendencias === "dois_ou_mais") return item.segmento_atraso === "dois_ou_mais"
      if (filtroPendencias === "cancelados_quitacao") return item.cancelado_inadimplencia === true
      return true
    })
  }, [pendenciasFaturas, filtroPendencias])

  const filtrosPendencias: { id: FiltroPendencias; label: string; count: number }[] = useMemo(() => {
    const atrasadas = pendenciasFaturas.filter((p) => p.status === "atrasada")
    return [
      { id: "todos" as const, label: "Todos do período", count: pendenciasFaturas.length },
      {
        id: "um_boleto" as const,
        label: "1 boleto em aberto",
        count: atrasadas.filter((p) => p.segmento_atraso === "um_boleto").length,
      },
      {
        id: "dois_ou_mais" as const,
        label: "2+ boletos em aberto",
        count: atrasadas.filter((p) => p.segmento_atraso === "dois_ou_mais").length,
      },
      {
        id: "cancelados_quitacao" as const,
        label: "Cancelados — quitação",
        count: atrasadas.filter((p) => p.cancelado_inadimplencia).length,
      },
    ]
  }, [pendenciasFaturas])

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

      const p = periodoDashboardRef.current
      await carregarDashboard(administradora.id, p.ano, p.mes, financeiraId)
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
      periodoDashboardRef.current = { ano: anoRef, mes: mesRef }
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
      const p = periodoDashboardRef.current
      await carregarDashboard(administradora.id, p.ano, p.mes, novoId)
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

  function rotuloStatus(status: string) {
    const s = String(status || "").toLowerCase()
    if (s === "pendente") return "Pendente"
    if (s === "atrasada") return "Atrasada"
    if (s === "vencida") return "Vencida"
    return status || "—"
  }

  function corPontoStatus(status: string) {
    const s = String(status || "").toLowerCase()
    if (s === "vencida") return "bg-rose-500"
    if (s === "atrasada") return "bg-amber-500"
    if (s === "pendente") return "bg-sky-500"
    return "bg-slate-400"
  }

  const periodoExportLabel = `${mesRef}/${anoRef}`

  function exportarExcelPendencias() {
    if (pendenciasFiltradas.length === 0) {
      toast.error("Não há registros no filtro atual para exportar")
      return
    }
    try {
      setExportandoExcelPendencias(true)
      const wsData: (string | number)[][] = [
        ["Período", periodoExportLabel],
        ["Filtro", rotuloFiltroPendencias(filtroPendencias)],
        ["Administradora", administradora?.nome_fantasia || administradora?.nome || ""],
        [],
        ["Nº", "Cliente", "Vencimento", "Status", "Boletos em aberto", "Segmento", "Cancelado inadimpl.", "Corretora", "Link boleto"],
        ...pendenciasFiltradas.map((item, i) => [
          i + 1,
          item.cliente_nome,
          item.vencimento ? formatarData(item.vencimento) : "",
          rotuloStatus(item.status),
          item.boletos_atrasados_total ?? "",
          item.status === "atrasada" ? rotuloSegmentoAtraso(item) : "",
          item.cancelado_inadimplencia ? "Sim" : "Não",
          item.corretora || "",
          item.link_boleto || "",
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Pendencias")
      XLSX.writeFile(wb, `dashboard-pendencias-${periodoExportLabel.replace("/", "-")}-${slugArquivo(rotuloFiltroPendencias(filtroPendencias))}.xlsx`)
      toast.success("Excel exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcelPendencias(false)
    }
  }

  async function exportarPdfPendencias() {
    if (pendenciasFiltradas.length === 0) {
      toast.error("Não há registros no filtro atual para exportar")
      return
    }
    try {
      setExportandoPdfPendencias(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      let y = 15
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Dashboard — faturas atrasadas e pendentes", margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      doc.text(`Período: ${periodoExportLabel} · Filtro: ${rotuloFiltroPendencias(filtroPendencias)}`, margin, y)
      y += 5
      doc.text(`Registros: ${pendenciasFiltradas.length}`, margin, y)
      y += 8
      const headers = ["Nº", "Cliente", "Venc.", "Status", "Boletos", "Segmento", "Canc. inad.", "Corretora"]
      const colWidths = [10, 58, 22, 22, 16, 22, 22, 38]
      doc.setFont(undefined, "bold")
      let x = margin
      headers.forEach((h, i) => {
        doc.text(h, x, y)
        x += colWidths[i]
      })
      y += 5
      doc.setFont(undefined, "normal")
      const rowHeight = 6
      const totalWidth = colWidths.reduce((a, b) => a + b, 0)
      pendenciasFiltradas.forEach((item, index) => {
        if (y > 185) {
          doc.addPage("landscape", "a4")
          y = 15
        }
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, y - 4, totalWidth, rowHeight, "F")
        }
        x = margin
        const cells = [
          String(index + 1),
          item.cliente_nome,
          item.vencimento ? formatarData(item.vencimento) : "—",
          rotuloStatus(item.status),
          item.boletos_atrasados_total != null ? String(item.boletos_atrasados_total) : "—",
          item.status === "atrasada" ? rotuloSegmentoAtraso(item) : "—",
          item.cancelado_inadimplencia ? "Sim" : "Não",
          item.corretora || "—",
        ]
        cells.forEach((cell, i) => {
          const w = colWidths[i] - 2
          doc.text(doc.splitTextToSize(cell, w)[0] || cell.slice(0, 30), x, y)
          x += colWidths[i]
        })
        y += rowHeight
      })
      doc.save(`dashboard-pendencias-${periodoExportLabel.replace("/", "-")}-${slugArquivo(rotuloFiltroPendencias(filtroPendencias))}.pdf`)
      toast.success("PDF exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF")
    } finally {
      setExportandoPdfPendencias(false)
    }
  }

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
          <div className="mt-4 flex flex-wrap items-stretch gap-2">
            {pendenciasTotalPeriodo > 0 && (
              <CardResumoMinimal
                titulo="Listagem do período"
                valorPrincipal={
                  <>
                    <span className="font-semibold tabular-nums">{pendenciasTotalPeriodo}</span>
                    <span className="text-slate-600">
                      {" "}
                      fatura{pendenciasTotalPeriodo !== 1 ? "s" : ""} pendente
                      {pendenciasTotalPeriodo !== 1 ? "s" : ""}, atrasada
                      {pendenciasTotalPeriodo !== 1 ? "s" : ""} ou vencida
                    </span>
                  </>
                }
              />
            )}
            {resumoAtrasadas && resumoAtrasadas.no_periodo.total_faturas_atrasadas > 0 && (
              <>
                <CardResumoMinimal
                  titulo="Atrasadas — 1 boleto"
                  valorPrincipal={
                    <>
                      <span className="font-semibold tabular-nums">{resumoAtrasadas.no_periodo.uma_fatura.faturas}</span>
                      <span className="text-slate-600">
                        {" "}
                        fatura{resumoAtrasadas.no_periodo.uma_fatura.faturas !== 1 ? "s" : ""} ·{" "}
                        <span className="font-semibold tabular-nums">{resumoAtrasadas.no_periodo.uma_fatura.clientes}</span>{" "}
                        cliente{resumoAtrasadas.no_periodo.uma_fatura.clientes !== 1 ? "s" : ""}
                      </span>
                    </>
                  }
                />
                <CardResumoMinimal
                  titulo="Atrasadas — 2+ boletos"
                  valorPrincipal={
                    <>
                      <span className="font-semibold tabular-nums">{resumoAtrasadas.no_periodo.duas_ou_mais.faturas}</span>
                      <span className="text-slate-600">
                        {" "}
                        faturas ·{" "}
                        <span className="font-semibold tabular-nums">{resumoAtrasadas.no_periodo.duas_ou_mais.clientes}</span>{" "}
                        clientes
                      </span>
                    </>
                  }
                  detalhe="Requer atenção: múltiplos vencimentos em aberto."
                />
                {(resumoAtrasadas.no_periodo.duas_ou_mais.faturas_clientes_cancelados_inadimplencia > 0 ||
                  resumoAtrasadas.no_periodo.duas_ou_mais.clientes_cancelados_inadimplencia > 0) && (
                  <CardResumoMinimal
                    titulo="Cancelados — quitação pendente"
                    valorPrincipal={
                      <>
                        <span className="font-semibold tabular-nums">
                          {resumoAtrasadas.no_periodo.duas_ou_mais.faturas_clientes_cancelados_inadimplencia}
                        </span>
                        <span className="text-slate-600">
                          {" "}
                          fatura
                          {resumoAtrasadas.no_periodo.duas_ou_mais.faturas_clientes_cancelados_inadimplencia !== 1
                            ? "s"
                            : ""}{" "}
                          ·{" "}
                          <span className="font-semibold tabular-nums">
                            {resumoAtrasadas.no_periodo.duas_ou_mais.clientes_cancelados_inadimplencia}
                          </span>{" "}
                          cliente
                          {resumoAtrasadas.no_periodo.duas_ou_mais.clientes_cancelados_inadimplencia !== 1 ? "s" : ""}
                        </span>
                      </>
                    }
                    detalhe="Cancelados por inadimplência com boleto ainda em aberto."
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="border-b border-slate-200 bg-white px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar listagem">
            {filtrosPendencias.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtroPendencias === f.id}
                onClick={() => setFiltroPendencias(f.id)}
                className={cn(
                  "h-8 rounded-sm border px-2.5 text-xs font-medium transition-colors",
                  filtroPendencias === f.id
                    ? "border-slate-800 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    filtroPendencias === f.id ? "text-slate-300" : "text-slate-400"
                  )}
                >
                  ({f.count})
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${btnSquare} h-8 border-slate-300 text-xs`}
              disabled={pendenciasFiltradas.length === 0 || exportandoPdfPendencias}
              onClick={() => void exportarPdfPendencias()}
            >
              <FileDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {exportandoPdfPendencias ? "Exportando…" : "PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${btnSquare} h-8 border-slate-300 text-xs`}
              disabled={pendenciasFiltradas.length === 0 || exportandoExcelPendencias}
              onClick={exportarExcelPendencias}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {exportandoExcelPendencias ? "Exportando…" : "Excel"}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Vencimento</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Atraso</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Corretora</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Link do boleto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    {filtroPendencias === "todos"
                      ? "Nenhuma fatura pendente ou atrasada neste período."
                      : `Nenhum registro para o filtro "${rotuloFiltroPendencias(filtroPendencias)}".`}
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
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", corPontoStatus(item.status))}
                          aria-hidden
                        />
                        {rotuloStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {item.status === "atrasada" && item.segmento_atraso ? (
                        <div className="space-y-0.5">
                          <span className="tabular-nums text-slate-700">
                            {item.segmento_atraso === "dois_ou_mais" ? "2+ boletos" : "1 boleto"}
                            {item.boletos_atrasados_total != null ? ` (${item.boletos_atrasados_total} total)` : ""}
                          </span>
                          {item.cancelado_inadimplencia && (
                            <span className="block text-[11px] text-amber-800">Quitação pendente</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
            Página <span className="font-medium text-slate-700">{paginaAtualPendencias}</span> de{" "}
            <span className="font-medium text-slate-700">{totalPaginasPendencias}</span>
            {" — "}
            <span className="tabular-nums">{pendenciasPaginadas.length}</span> de{" "}
            <span className="tabular-nums">{pendenciasFiltradas.length}</span> fatura
            {pendenciasFiltradas.length !== 1 ? "s" : ""} nesta tabela
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
