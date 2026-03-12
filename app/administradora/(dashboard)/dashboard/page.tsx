"use client"

import { useEffect, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { AlertCircle, Clock, DollarSign, FileSpreadsheet, FileText, Receipt, RefreshCw, TrendingUp, Users } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { adicionarAlertaSistema } from "@/services/administradora-alertas-service"

type Inadimplente = {
  cliente_nome: string
  valor: number
  status: string
  grupo: string
  corretor: string
}

type UltimaSincronizacao = {
  executadoEm: string
  verificadas: number
  atualizadas: number
  alteradas: number
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
    clientes_inadimplentes: 0,
    faturas_pendentes: 0,
    valor_em_aberto: 0,
    valor_recebido_mes: 0,
    faturas_atrasadas_valor: 0,
    valor_atrasado: 0,
  })
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([])
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<UltimaSincronizacao | null>(null)
  const [paginaInadimplentes, setPaginaInadimplentes] = useState(1)
  const [exportandoPdf, setExportandoPdf] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  async function carregarDashboard(administradoraId: string, ano: string, mes: string) {
    const res = await fetch(
      `/api/administradora/dashboard?administradora_id=${encodeURIComponent(administradoraId)}&ano=${encodeURIComponent(ano)}&mes=${encodeURIComponent(mes)}`,
      { cache: "no-store" }
    )
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(payload?.error || "Erro ao buscar dashboard")
    setDashboardData(payload?.cards || {})
    setInadimplentes(Array.isArray(payload?.inadimplentes) ? payload.inadimplentes : [])
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
        await carregarDashboard(administradoraLogada.id, String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"))
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
      const res = await fetch("/api/sincronizar-status-asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ administradora_id: administradora.id }),
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

      await carregarDashboard(administradora.id, anoRef, mesRef)
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
      await carregarDashboard(administradora.id, anoRef, mesRef)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar filtro de período")
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

  const cards = [
    {
      titulo: "Clientes Ativos",
      valor: String(dashboardData.clientes_ativos || 0),
      descricao: "Total de beneficiários de todos os grupos",
      icon: Users,
    },
    {
      titulo: "Faturas Pendentes",
      valor: String(dashboardData.faturas_pendentes || 0),
      descricao: "Pendentes + atrasadas",
      icon: Clock,
    },
    {
      titulo: "Valor em Aberto",
      valor: formatarMoeda(dashboardData.valor_em_aberto || 0),
      descricao: "Faturas não pagas",
      icon: DollarSign,
    },
    {
      titulo: "Recebido este Mês",
      valor: formatarMoeda(dashboardData.valor_recebido_mes || 0),
      descricao: "Faturas marcadas como pagas",
      icon: TrendingUp,
    },
    {
      titulo: "Clientes com Fatura Cancelada",
      valor: String(dashboardData.clientes_inadimplentes || 0),
      descricao: "Com status cancelada no período",
      icon: AlertCircle,
    },
    {
      titulo: "Faturas Atrasadas",
      valor: formatarMoeda(dashboardData.faturas_atrasadas_valor || 0),
      descricao: "Valor total com status atrasada",
      icon: Receipt,
    },
    {
      titulo: "Valor Atrasado",
      valor: formatarMoeda(dashboardData.valor_atrasado || 0),
      descricao: "Soma de vencida + atrasada",
      icon: AlertCircle,
    },
  ]

  const badgeStatus = (status: string) => {
    const s = String(status || "").toLowerCase()
    if (s === "vencida") return "bg-red-100 text-red-700"
    if (s === "atrasada") return "bg-amber-100 text-amber-800"
    return "bg-gray-100 text-gray-700"
  }

  const inadimplentesFiltrados = inadimplentes

  const itensPorPaginaInadimplentes = 10
  const totalPaginasInadimplentes = Math.max(1, Math.ceil(inadimplentesFiltrados.length / itensPorPaginaInadimplentes))
  const paginaAtualInadimplentes = Math.min(paginaInadimplentes, totalPaginasInadimplentes)
  const inadimplentesPaginados = inadimplentesFiltrados.slice(
    (paginaAtualInadimplentes - 1) * itensPorPaginaInadimplentes,
    paginaAtualInadimplentes * itensPorPaginaInadimplentes
  )

  async function exportarInadimplentesExcel() {
    if (inadimplentesFiltrados.length === 0) {
      toast.info("Não há inadimplentes para exportar.")
      return
    }
    try {
      setExportandoExcel(true)
      const XLSX = await import("xlsx")
      const rows = inadimplentesFiltrados.map((i) => ({
        Cliente: i.cliente_nome || "-",
        Valor: i.valor || 0,
        Status: i.status || "-",
        Grupo: i.grupo || "-",
        Corretor: i.corretor || "-",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Inadimplentes")
      XLSX.writeFile(wb, `inadimplentes-${anoRef}-${mesRef}.xlsx`)
      toast.success("Relatório em Excel exportado com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao exportar Excel.")
    } finally {
      setExportandoExcel(false)
    }
  }

  async function exportarInadimplentesPdf() {
    if (inadimplentesFiltrados.length === 0) {
      toast.info("Não há inadimplentes para exportar.")
      return
    }
    try {
      setExportandoPdf(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      const headers = ["Cliente", "Valor", "Status", "Grupo", "Corretor"]
      const widths = [70, 30, 26, 80, 70]
      let x = margin
      let y = 12

      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text(`Relatório de Inadimplentes (${mesRef}/${anoRef})`, margin, y)
      y += 8
      doc.setFontSize(8.5)
      headers.forEach((h, idx) => {
        doc.text(h, x, y)
        x += widths[idx]
      })
      y += 4
      doc.setFont(undefined, "normal")

      inadimplentesFiltrados.forEach((item) => {
        if (y > 190) {
          doc.addPage("landscape", "a4")
          y = 12
        }
        const row = [
          String(item.cliente_nome || "-"),
          formatarMoeda(item.valor || 0),
          String(item.status || "-"),
          String(item.grupo || "-"),
          String(item.corretor || "-"),
        ]
        x = margin
        row.forEach((col, idx) => {
          const texto = doc.splitTextToSize(col, widths[idx] - 2)[0] || "-"
          doc.text(texto, x, y)
          x += widths[idx]
        })
        y += 6
      })

      doc.save(`inadimplentes-${anoRef}-${mesRef}.pdf`)
      toast.success("Relatório em PDF exportado com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao exportar PDF.")
    } finally {
      setExportandoPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
              Dashboard Executivo
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              {administradora?.nome_fantasia || administradora?.nome || "Administradora"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {ultimaSincronizacao
                ? `Última sincronização: ${new Date(ultimaSincronizacao.executadoEm).toLocaleString("pt-BR")} | Verificadas: ${ultimaSincronizacao.verificadas} | Atualizadas: ${ultimaSincronizacao.atualizadas} | Status alterados: ${ultimaSincronizacao.alteradas}`
                : "Última sincronização: ainda não executada neste navegador."}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <select
              value={mesRef}
              onChange={(e) => setMesRef(e.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
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
              className="h-10 w-full md:w-28 rounded-md border border-gray-300 bg-white px-3 text-sm"
              min={2000}
              max={2100}
            />
            <Button type="button" variant="outline" onClick={aplicarFiltroPeriodo} disabled={loading || sincronizando}>
              Aplicar período
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full md:w-auto"
              disabled={sincronizando || loading}
              onClick={sincronizarStatusAgora}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${sincronizando ? "animate-spin" : ""}`} />
              {sincronizando ? "Sincronizando..." : "Sincronizar com gateway"}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Período em análise dos cards financeiros: {mesRef}/{anoRef}. Clientes Ativos considera a base total atual de beneficiários.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.titulo} className="bg-white border border-gray-200 shadow-sm rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{card.titulo}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{card.valor}</p>
                </div>
                <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-slate-700" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">{card.descricao}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
            Clientes com Fatura Cancelada
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Nome, valor, status, grupo de beneficiários e corretor (filtrados apenas pelo período do dashboard).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
            <Button
              variant="outline"
              className="h-9"
              onClick={exportarInadimplentesPdf}
              disabled={exportandoPdf || inadimplentesFiltrados.length === 0}
            >
              <FileText className="h-4 w-4 mr-1" />
              {exportandoPdf ? "Exportando..." : "Exportar PDF"}
            </Button>
            <Button
              variant="outline"
              className="h-9"
              onClick={exportarInadimplentesExcel}
              disabled={exportandoExcel || inadimplentesFiltrados.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              {exportandoExcel ? "Exportando..." : "Exportar Excel"}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Grupo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Corretor</th>
              </tr>
            </thead>
            <tbody>
              {inadimplentesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum cliente inadimplente encontrado.
                  </td>
                </tr>
              ) : (
                inadimplentesPaginados.map((item, idx) => (
                  <tr key={`${item.cliente_nome}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                    <td className="px-4 py-2 text-sm text-gray-800">{item.cliente_nome}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800">{formatarMoeda(item.valor || 0)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${badgeStatus(item.status)}`}>
                        {item.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{item.grupo || "—"}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{item.corretor || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {inadimplentesPaginados.length} de {inadimplentesFiltrados.length} registro(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPaginaInadimplentes((p) => Math.max(1, p - 1))}
              disabled={paginaAtualInadimplentes <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {paginaAtualInadimplentes} de {totalPaginasInadimplentes}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPaginaInadimplentes((p) => Math.min(totalPaginasInadimplentes, p + 1))}
              disabled={paginaAtualInadimplentes >= totalPaginasInadimplentes}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
