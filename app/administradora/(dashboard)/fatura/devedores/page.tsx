"use client"

import { useState, useEffect, useMemo } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, FileDown, FileSpreadsheet, Search, X } from "lucide-react"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { cn } from "@/lib/utils"

type LinhaRelatorio = {
  id: string
  cliente_nome: string
  cpf: string | null
  telefone: string | null
  valor_fatura: number
  status: string
  vencimento: string | null
  boleto_url: string | null
}

type Corretor = { id: string; nome: string }
type Financeira = { id: string; nome: string; instituicao_financeira?: string }

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
]

const ITENS_POR_PAGINA = 15

export default function DevedoresPage() {
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [financeiras, setFinanceiras] = useState<Financeira[]>([])
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  const [mesRef, setMesRef] = useState<string>("")
  const [anoRef, setAnoRef] = useState<string>("")
  const [grupoId, setGrupoId] = useState<string>("todos")
  const [corretorId, setCorretorId] = useState<string>("todos")
  const [statusFiltro, setStatusFiltro] = useState<string>("principais")
  const [financeiraFiltro, setFinanceiraFiltro] = useState<string>("todos")
  const [nomeFiltro, setNomeFiltro] = useState<string>("")

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      carregarFiltros(administradora.id)
    }
    const agora = new Date()
    setMesRef(String(agora.getMonth() + 1).padStart(2, "0"))
    setAnoRef(String(agora.getFullYear()))
  }, [])

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(linhas.length / ITENS_POR_PAGINA))
    setPaginaAtual((p) => Math.min(Math.max(1, p), tp))
  }, [linhas])

  async function carregarFiltros(admId: string) {
    try {
      const [gruposData, corretoresRes, financeirasRes] = await Promise.all([
        GruposBeneficiariosService.buscarTodos(admId),
        fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(admId)}`),
        fetch(`/api/administradora/financeiras?administradora_id=${encodeURIComponent(admId)}`),
      ])
      setGrupos(gruposData || [])
      if (corretoresRes.ok) {
        const corretoresData = await corretoresRes.json()
        setCorretores(Array.isArray(corretoresData) ? corretoresData : [])
      }
      if (financeirasRes.ok) {
        const financeirasData = await financeirasRes.json()
        setFinanceiras(Array.isArray(financeirasData) ? financeirasData : [])
      }
    } catch {
      setGrupos([])
      setCorretores([])
      setFinanceiras([])
    }
  }

  function obterStatusParaBusca() {
    // Em aberto / atraso: a maioria das faturas “a receber” vem como pendente ou vencida; só atrasada+cancelada+paga excluía tudo.
    if (statusFiltro === "principais") return "pendente,vencida,atrasada"
    if (statusFiltro === "historico") return "atrasada,cancelada,paga"
    if (statusFiltro === "asaas") return "PENDING,RECEIVED,CONFIRMED,OVERDUE,REFUNDED,CANCELED"
    if (statusFiltro === "todos") return ""
    return statusFiltro
  }

  async function carregarRelatorio() {
    if (!administradoraId) return

    try {
      setLoading(true)
      const url = new URL("/api/administradora/relatorios/faturas", window.location.origin)
      url.searchParams.set("administradora_id", administradoraId)
      if (mesRef && anoRef) {
        url.searchParams.set("mes", mesRef)
        url.searchParams.set("ano", anoRef)
      }
      if (grupoId && grupoId !== "todos") url.searchParams.set("grupo_id", grupoId)
      if (corretorId && corretorId !== "todos") url.searchParams.set("corretor_id", corretorId)
      const status = obterStatusParaBusca()
      if (status) url.searchParams.set("status", status)
      if (financeiraFiltro && financeiraFiltro !== "todos") {
        url.searchParams.set("financeira_id", financeiraFiltro)
      }

      const res = await fetch(url.toString(), { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao buscar relatório")
      }

      let lista = Array.isArray(data?.linhas) ? (data.linhas as LinhaRelatorio[]) : []
      if (nomeFiltro.trim()) {
        const termo = nomeFiltro.trim().toLowerCase()
        lista = lista.filter((l) => String(l.cliente_nome || "").toLowerCase().includes(termo))
      }

      setLinhas(lista)
      setPaginaAtual(1)
      if (lista.length === 0) {
        toast.info("Nenhum resultado encontrado com os filtros selecionados.")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar relatório")
      setLinhas([])
      setPaginaAtual(1)
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    const agora = new Date()
    setMesRef(String(agora.getMonth() + 1).padStart(2, "0"))
    setAnoRef(String(agora.getFullYear()))
    setGrupoId("todos")
    setCorretorId("todos")
    setStatusFiltro("principais")
    setFinanceiraFiltro("todos")
    setNomeFiltro("")
    setLinhas([])
    setPaginaAtual(1)
  }

  function getStatusBadge(status: string) {
    const baseClass = "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border"
    const statusMap: Record<string, { label: string; className: string }> = {
      atrasada: { label: "Atrasada", className: "bg-gray-100 text-gray-600 border-gray-300" },
      pendente: { label: "Pendente", className: "bg-amber-50 text-amber-800 border-amber-200" },
      paga: { label: "Paga", className: "bg-green-50 text-green-700 border-green-200" },
      cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-gray-300" },
      vencida: { label: "Vencida", className: "bg-red-50 text-red-800 border-red-200" },
    }
    const statusInfo = statusMap[(status || "").toLowerCase()] || { label: status, className: "bg-gray-100 text-gray-600 border-gray-300" }
    return <span className={cn(baseClass, statusInfo.className)}>{statusInfo.label}</span>
  }

  function formatarCpf(cpf: string | null | undefined) {
    const digitos = String(cpf || "").replace(/\D/g, "")
    if (digitos.length !== 11) return cpf || "-"
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  function formatarTelefone(telefone: string | null | undefined) {
    const bruto = String(telefone || "").trim()
    if (!bruto) return "-"

    let digitos = bruto.replace(/\D/g, "")
    if (digitos.length === 13 && digitos.startsWith("55")) {
      digitos = digitos.slice(2)
    }
    if (digitos.length === 12 && digitos.startsWith("55")) {
      digitos = digitos.slice(2)
    }

    if (digitos.length === 11) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    if (digitos.length === 10) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    return bruto
  }

  /** Mesmos rótulos da coluna Status na tela (PDF). */
  function rotuloStatusPdf(status: string) {
    const m: Record<string, string> = {
      atrasada: "Atrasada",
      pendente: "Pendente",
      paga: "Paga",
      cancelada: "Cancelada",
      vencida: "Vencida",
    }
    const k = (status || "").toLowerCase()
    return m[k] || status || "—"
  }

  async function exportarPDF() {
    if (linhas.length === 0) {
      toast.error("Não há dados para exportar")
      return
    }
    try {
      setExportandoPDF(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margem = 8
      const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2
      const headers = ["Nome", "CPF", "Telefone", "Vencimento", "Valor", "Status", "Link do boleto"]
      const colWidths = [52, 28, 30, 22, 22, 20, 107]
      const headerRowH = 6
      const maxY = 196
      const fontCorpo = 7
      const fontUrl = 6.5
      const rowMinMm = 6
      const baselinePad = 4.1

      let y = 12
      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.setFont(undefined, "bold")
      doc.text("Relatório de faturas", margem, y)
      y += 5
      doc.setFont(undefined, "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, margem, y)
      doc.text(`Referência: ${mesRef}/${anoRef}`, margem + 78, y)
      doc.text(`Registros: ${linhas.length}`, margem + 128, y)
      doc.text(`Total: ${formatarMoeda(totalValor)}`, margem + 178, y)
      y += 6

      const drawTableHeader = () => {
        let x = margem
        doc.setFillColor(30, 41, 59)
        doc.rect(margem, y, larguraUtil, headerRowH, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, "bold")
        doc.setFontSize(7)
        headers.forEach((h, i) => {
          doc.text(h, x + 1.5, y + baselinePad)
          x += colWidths[i]
        })
        doc.setFont(undefined, "normal")
        y += headerRowH
      }

      drawTableHeader()

      linhas.forEach((item, index) => {
        const linkBoleto = String(item.boleto_url || "").trim()
        doc.setFontSize(fontUrl)
        const urlLines = linkBoleto ? doc.splitTextToSize(linkBoleto, colWidths[6] - 3) : ["—"]
        doc.setFontSize(fontCorpo)
        const lineHeightUrlMm = (fontUrl * doc.getLineHeightFactor() * 25.4) / 72
        const rowH = Math.max(rowMinMm, 3 + urlLines.length * lineHeightUrlMm)

        if (y + rowH > maxY) {
          doc.addPage("landscape", "a4")
          y = 10
          drawTableHeader()
        }

        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margem, y, larguraUtil, rowH, "F")
        }

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(fontCorpo)
        let x = margem
        const nomeCurto = doc.splitTextToSize(item.cliente_nome || "—", colWidths[0] - 3)[0] || "—"
        const celulas = [
          nomeCurto,
          formatarCpf(item.cpf),
          formatarTelefone(item.telefone),
          item.vencimento ? formatarData(item.vencimento) : "—",
          formatarMoeda(item.valor_fatura),
          rotuloStatusPdf(item.status),
        ]
        celulas.forEach((texto, i) => {
          doc.text(String(texto), x + 1.5, y + baselinePad)
          x += colWidths[i]
        })
        doc.setFontSize(fontUrl)
        doc.setTextColor(51, 65, 85)
        doc.text(urlLines, x + 1.5, y + baselinePad)
        doc.setFontSize(fontCorpo)
        doc.setTextColor(30, 41, 59)
        y += rowH
      })

      if (y > 188) {
        doc.addPage("landscape", "a4")
        y = 12
      } else {
        y += 3
      }
      doc.setDrawColor(203, 213, 225)
      doc.line(margem, y, margem + larguraUtil, y)
      y += 5
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(9)
      doc.setFont(undefined, "bold")
      doc.text(`Total geral: ${formatarMoeda(totalValor)}`, margem, y)
      doc.setFont(undefined, "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`${linhas.length} fatura(s) na exportação`, margem + 72, y)

      doc.save(`relatorio-faturas-${anoRef}-${mesRef}.pdf`)
      toast.success("PDF exportado com sucesso")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF")
    } finally {
      setExportandoPDF(false)
    }
  }

  async function exportarExcel() {
    if (linhas.length === 0) {
      toast.error("Não há dados para exportar")
      return
    }
    try {
      setExportandoExcel(true)
      const XLSX = await import("xlsx")
      const rows = linhas.map((item) => ({
        Nome: item.cliente_nome || "-",
        CPF: formatarCpf(item.cpf),
        Telefone: formatarTelefone(item.telefone),
        Vencimento: item.vencimento ? formatarData(item.vencimento) : "-",
        Valor: item.valor_fatura,
        Status: item.status || "-",
        Boleto: String(item.boleto_url || "").trim() || "-",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "RelatorioFaturas")
      XLSX.writeFile(wb, `relatorio-faturas-${anoRef}-${mesRef}.xlsx`)
      toast.success("Excel exportado com sucesso")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcel(false)
    }
  }

  const totalValor = linhas.reduce((sum, item) => sum + Number(item.valor_fatura || 0), 0)

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / ITENS_POR_PAGINA))
  const paginaSegura = Math.min(paginaAtual, totalPaginas)

  const linhasPaginadas = useMemo(() => {
    const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA
    return linhas.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [linhas, paginaSegura])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Relatório de faturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Consulte faturas por status e período, com filtros opcionais de grupo e corretor.
        </p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mês</label>
            <Select value={mesRef} onValueChange={setMesRef}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Ano</label>
            <Input
              type="number"
              value={anoRef}
              onChange={(e) => setAnoRef(e.target.value)}
              placeholder="2026"
              className="h-10 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo (opcional)</label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Corretor (opcional)</label>
            <Select value={corretorId} onValueChange={setCorretorId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Todos os corretores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os corretores</SelectItem>
                {corretores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Status</label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principais">Pendente, vencida e atrasada (em aberto)</SelectItem>
                <SelectItem value="historico">Atrasada, cancelada e paga</SelectItem>
                <SelectItem value="asaas">Padrão Asaas</SelectItem>
                <SelectItem value="atrasada">Somente atrasada</SelectItem>
                <SelectItem value="cancelada">Somente cancelada</SelectItem>
                <SelectItem value="paga">Somente paga</SelectItem>
                <SelectItem value="pendente">Somente pendente</SelectItem>
                <SelectItem value="todos">Todos os status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Financeira</label>
            <Select value={financeiraFiltro} onValueChange={setFinanceiraFiltro}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Todas as financeiras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as financeiras</SelectItem>
                {financeiras.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome do cliente</label>
            <Input
              value={nomeFiltro}
              onChange={(e) => setNomeFiltro(e.target.value)}
              placeholder="Filtro por nome"
              className="h-10 text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={carregarRelatorio}
            disabled={loading}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button
            onClick={limparFiltros}
            variant="outline"
            className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarPDF}
            disabled={exportandoPDF || linhas.length === 0}
            className="border-gray-300"
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {exportandoPDF ? "Exportando PDF..." : "Exportar PDF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExcel}
            disabled={exportandoExcel || linhas.length === 0}
            className="border-gray-300"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            {exportandoExcel ? "Exportando Excel..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-gray-600">Total de Registros: </span>
            <span className="font-semibold text-gray-800">{linhas.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor Total: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(totalValor)}</span>
          </div>
          {linhas.length > ITENS_POR_PAGINA ? (
            <div className="text-gray-500 text-xs">
              Exibindo {linhasPaginadas.length} na página {paginaSegura} de {totalPaginas}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Nome do Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">CPF</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Telefone</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Vencimento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor da Fatura</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Boleto</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : linhas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum resultado encontrado
                    </td>
                  </tr>
                ) : (
                  linhasPaginadas.map((linha, index) => (
                    <tr
                      key={linha.id}
                      className={cn(
                        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{linha.cliente_nome || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarCpf(linha.cpf)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarTelefone(linha.telefone)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200 tabular-nums whitespace-nowrap">
                        {linha.vencimento ? formatarData(linha.vencimento) : "—"}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800 border-r border-gray-200">{formatarMoeda(linha.valor_fatura)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{getStatusBadge(linha.status)}</td>
                      <td className="px-4 py-2 text-sm">
                        {linha.boleto_url ? (
                          <a
                            href={linha.boleto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Abrir boleto
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && linhas.length > ITENS_POR_PAGINA ? (
            <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-600">
                Página <span className="font-medium text-gray-800">{paginaSegura}</span> de{" "}
                <span className="font-medium text-gray-800">{totalPaginas}</span> · {ITENS_POR_PAGINA} por página
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-gray-300 text-xs"
                  disabled={paginaSegura <= 1}
                  onClick={() => setPaginaAtual(paginaSegura - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-gray-300 text-xs"
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() => setPaginaAtual(paginaSegura + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
