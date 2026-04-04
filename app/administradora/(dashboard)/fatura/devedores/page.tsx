"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileDown, FileSpreadsheet, Search, X } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { cn } from "@/lib/utils"

type LinhaRelatorio = {
  id: string
  cliente_nome: string
  cpf: string | null
  telefone: string | null
  valor_fatura: number
  status: string
  vencimento: string | null
  financeira_nome?: string | null
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

export default function DevedoresPage() {
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([])
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
      if (lista.length === 0) {
        toast.info("Nenhum resultado encontrado com os filtros selecionados.")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar relatório")
      setLinhas([])
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
  }

  function getStatusBadge(status: string) {
    const baseClass = "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border"
    const statusMap: Record<string, { label: string; className: string }> = {
      atrasada: { label: "Atrasada", className: "bg-gray-100 text-gray-600 border-gray-300" },
      pendente: { label: "Pendente", className: "bg-amber-50 text-amber-800 border-amber-200" },
      paga: { label: "Paga", className: "bg-green-50 text-green-700 border-green-200" },
      cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-gray-300" },
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

  async function exportarPDF() {
    if (linhas.length === 0) {
      toast.error("Não há dados para exportar")
      return
    }
    try {
      setExportandoPDF(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      let y = 14
      doc.setFontSize(13)
      doc.setFont(undefined, "bold")
      doc.text("RELATORIO DE FATURAS", margin, y)
      y += 6
      doc.setFontSize(9)
      doc.setFont(undefined, "normal")
      doc.text(`Referencia: ${mesRef}/${anoRef} | Registros: ${linhas.length}`, margin, y)
      y += 6

      const headers = ["Nome", "CPF", "Telefone", "Financeira", "Valor", "Status"]
      const widths = [80, 38, 40, 48, 28, 30]
      let x = margin
      doc.setFont(undefined, "bold")
      headers.forEach((h, i) => {
        doc.text(h, x, y)
        x += widths[i]
      })
      y += 5
      doc.setFont(undefined, "normal")
      const rowHeight = 6
      linhas.forEach((item, index) => {
        if (y > 185) {
          doc.addPage("landscape", "a4")
          y = 14
        }
        if (index % 2 === 1) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, y - 4, widths.reduce((a, b) => a + b, 0), rowHeight, "F")
        }
        x = margin
        doc.text(doc.splitTextToSize(item.cliente_nome || "-", widths[0] - 2)[0] || "-", x, y)
        x += widths[0]
        doc.text(String(formatarCpf(item.cpf)), x, y)
        x += widths[1]
        doc.text(String(formatarTelefone(item.telefone)), x, y)
        x += widths[2]
        doc.text(doc.splitTextToSize(String(item.financeira_nome || "-"), widths[3] - 2)[0] || "-", x, y)
        x += widths[3]
        doc.text(formatarMoeda(item.valor_fatura), x, y)
        x += widths[4]
        doc.text(String(item.status || "-"), x, y)
        y += rowHeight
      })
      y += 4
      doc.setFont(undefined, "bold")
      doc.text(`TOTAL: ${formatarMoeda(totalValor)}`, margin, y)
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
        Financeira: item.financeira_nome || "-",
        Valor: item.valor_fatura,
        Status: item.status || "-",
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
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-600">Total de Registros: </span>
            <span className="font-semibold text-gray-800">{linhas.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor Total: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(totalValor)}</span>
          </div>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Financeira</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor da Fatura</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : linhas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum resultado encontrado
                    </td>
                  </tr>
                ) : (
                  linhas.map((linha, index) => (
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
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{linha.financeira_nome || "-"}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800 border-r border-gray-200">{formatarMoeda(linha.valor_fatura)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{getStatusBadge(linha.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
