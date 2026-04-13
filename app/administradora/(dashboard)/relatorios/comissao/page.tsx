"use client"

import { useEffect, useMemo, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileDown, FileSpreadsheet, Search } from "lucide-react"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { cn } from "@/lib/utils"

type LinhaComissao = {
  fatura_id: string
  cliente_administradora_id: string
  cliente_nome: string
  corretor_id: string | null
  corretor_nome: string
  numero_fatura: string | null
  valor_fatura: number
  vencimento: string | null
  percentual_comissao: number
  valor_comissao: number
}

type Corretor = { id: string; nome: string }

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
const CORRETOR_TODAS = "todas"

export default function RelatorioComissaoPage() {
  const [linhas, setLinhas] = useState<LinhaComissao[]>([])
  const [totalFaturas, setTotalFaturas] = useState(0)
  const [totalComissao, setTotalComissao] = useState(0)
  const [totalClientesDistintos, setTotalClientesDistintos] = useState(0)
  const [corretorNome, setCorretorNome] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  const [mesRef, setMesRef] = useState("")
  const [anoRef, setAnoRef] = useState("")
  const [corretorId, setCorretorId] = useState<string>(CORRETOR_TODAS)
  const [percentualStr, setPercentualStr] = useState("10")

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      void carregarCorretores(administradora.id)
    }
    const agora = new Date()
    setMesRef(String(agora.getMonth() + 1).padStart(2, "0"))
    setAnoRef(String(agora.getFullYear()))
  }, [])

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(linhas.length / ITENS_POR_PAGINA))
    setPaginaAtual((p) => Math.min(Math.max(1, p), tp))
  }, [linhas])

  async function carregarCorretores(admId: string) {
    try {
      const res = await fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(admId)}`)
      if (res.ok) {
        const data = await res.json()
        setCorretores(Array.isArray(data) ? data : [])
      } else {
        setCorretores([])
      }
    } catch {
      setCorretores([])
    }
  }

  async function carregarRelatorio() {
    if (!administradoraId) return
    if (!corretorId) {
      toast.error("Selecione um corretor ou \"Todas as corretoras\".")
      return
    }
    const pct = Number(String(percentualStr).replace(",", "."))
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Informe um percentual de comissão entre 0 e 100.")
      return
    }

    try {
      setLoading(true)
      const url = new URL("/api/administradora/relatorios/comissao", window.location.origin)
      url.searchParams.set("administradora_id", administradoraId)
      url.searchParams.set("mes", mesRef)
      url.searchParams.set("ano", anoRef)
      url.searchParams.set("corretor_id", corretorId)
      url.searchParams.set("percentual", String(pct))

      const res = await fetch(url.toString(), { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao buscar relatório")
      }

      setLinhas(Array.isArray(data?.linhas) ? data.linhas : [])
      setTotalFaturas(Number(data?.total_valor_faturas ?? 0))
      setTotalComissao(Number(data?.total_comissao ?? 0))
      setTotalClientesDistintos(Number(data?.total_clientes_distintos ?? 0))
      setCorretorNome(String(data?.corretor?.nome || ""))
      setPaginaAtual(1)
      if (!data?.linhas?.length) {
        toast.info("Nenhuma fatura paga encontrada para os filtros selecionados.")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar relatório")
      setLinhas([])
      setTotalFaturas(0)
      setTotalComissao(0)
      setTotalClientesDistintos(0)
      setCorretorNome("")
    } finally {
      setLoading(false)
    }
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
      const headers = ["Qtd", "Corretora", "Cliente", "Nº fatura", "Vencimento", "Valor", "%", "Comissão"]
      const colWidths = [9, 36, 54, 32, 22, 26, 14, 30]
      const headerRowH = 6
      const maxY = 196
      const pct = Number(String(percentualStr).replace(",", ".")) || 0

      let y = 12
      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.setFont(undefined, "bold")
      doc.text("Relatório de comissão", margem, y)
      y += 5
      doc.setFont(undefined, "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Corretor(es): ${corretorNome || "—"}`, margem, y)
      doc.text(`Referência: ${mesRef}/${anoRef}`, margem + 88, y)
      doc.text(`Percentual: ${pct}%`, margem + 148, y)
      doc.text(`${linhas.length} fatura(s) · ${totalClientesDistintos} cliente(s)`, margem + 198, y)
      y += 6

      const drawTableHeader = () => {
        let x = margem
        doc.setFillColor(30, 41, 59)
        doc.rect(margem, y, larguraUtil, headerRowH, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, "bold")
        doc.setFontSize(6.5)
        headers.forEach((h, i) => {
          doc.text(h, x + 1.2, y + 4.1)
          x += colWidths[i]
        })
        doc.setFont(undefined, "normal")
        y += headerRowH
      }

      drawTableHeader()
      const baselinePad = 4.1
      const rowMinMm = 6

      linhas.forEach((item, index) => {
        const rowH = rowMinMm
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
        doc.setFontSize(6.5)
        let x = margem
        const nomeCorCurto =
          doc.splitTextToSize(item.corretor_nome || "—", colWidths[1] - 2)[0] || "—"
        const nomeClienteCurto =
          doc.splitTextToSize(item.cliente_nome || "—", colWidths[2] - 2)[0] || "—"
        const celulas = [
          String(index + 1),
          nomeCorCurto,
          nomeClienteCurto,
          item.numero_fatura || "—",
          item.vencimento ? formatarData(item.vencimento) : "—",
          formatarMoeda(item.valor_fatura),
          `${item.percentual_comissao}%`,
          formatarMoeda(item.valor_comissao),
        ]
        celulas.forEach((texto, i) => {
          doc.text(String(texto), x + 1.2, y + baselinePad)
          x += colWidths[i]
        })
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
      doc.setFont(undefined, "bold")
      doc.setFontSize(9)
      doc.text(`Total faturas: ${formatarMoeda(totalFaturas)}`, margem, y)
      doc.text(`Total comissão (${pct}%): ${formatarMoeda(totalComissao)}`, margem + 88, y)
      doc.setFont(undefined, "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`${linhas.length} linha(s) · ${totalClientesDistintos} cliente(s)`, margem + 188, y)

      doc.save(`relatorio-comissao-${anoRef}-${mesRef}.pdf`)
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
      const pct = Number(String(percentualStr).replace(",", ".")) || 0
      const rows = linhas.map((item, idx) => ({
        Qtd: idx + 1,
        Corretora: item.corretor_nome || "-",
        Cliente: item.cliente_nome || "-",
        NumeroFatura: item.numero_fatura || "-",
        Vencimento: item.vencimento ? formatarData(item.vencimento) : "-",
        ValorFatura: item.valor_fatura,
        PercentualComissao: item.percentual_comissao,
        ValorComissao: item.valor_comissao,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Comissao")
      const meta = XLSX.utils.json_to_sheet([
        { Campo: "Corretor (filtro)", Valor: corretorNome || "—" },
        { Campo: "Período (vencimento)", Valor: `${mesRef}/${anoRef}` },
        { Campo: "Percentual", Valor: `${pct}%` },
        { Campo: "Total faturas (linhas)", Valor: linhas.length },
        { Campo: "Total clientes distintos", Valor: totalClientesDistintos },
        { Campo: "Soma valores faturas", Valor: totalFaturas },
        { Campo: "Total comissão", Valor: totalComissao },
      ])
      XLSX.utils.book_append_sheet(wb, meta, "Resumo")
      XLSX.writeFile(wb, `relatorio-comissao-${anoRef}-${mesRef}.xlsx`)
      toast.success("Excel exportado com sucesso")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcel(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / ITENS_POR_PAGINA))
  const paginaSegura = Math.min(paginaAtual, totalPaginas)
  const linhasPaginadas = useMemo(() => {
    const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA
    return linhas.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [linhas, paginaSegura])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Relatório de comissão</h1>
        <p className="text-sm text-gray-500 mt-0.5 max-w-3xl">
          Faturas <strong>pagas</strong> com <strong>vencimento</strong> no mês de referência, para clientes com corretor
          vinculado (contrato ou beneficiário). Use <strong>Todas as corretoras</strong> para consolidar. A comissão de
          cada linha é o percentual sobre o valor da fatura.
        </p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mês de referência</label>
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
            <label className="block text-xs text-gray-600 mb-1">Corretor</label>
            <Select value={corretorId} onValueChange={setCorretorId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CORRETOR_TODAS}>Todas as corretoras</SelectItem>
                {corretores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Comissão (%)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={percentualStr}
              onChange={(e) => setPercentualStr(e.target.value)}
              placeholder="10"
              className="h-10 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button className="h-10" onClick={() => void carregarRelatorio()} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Carregando…" : "Gerar relatório"}
            </Button>
          </div>
        </div>

        {linhas.length > 0 && (
          <>
            <p className="text-sm text-slate-600 mb-3">
              <span className="font-semibold text-slate-800">{linhas.length}</span> fatura
              {linhas.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-slate-800">{totalClientesDistintos}</span> cliente
              {totalClientesDistintos !== 1 ? "s" : ""} distinto{totalClientesDistintos !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => void exportarPDF()} disabled={exportandoPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                {exportandoPDF ? "PDF…" : "Exportar PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void exportarExcel()} disabled={exportandoExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exportandoExcel ? "Excel…" : "Exportar Excel"}
              </Button>
            </div>
          </>
        )}

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="text-center px-2 py-2 font-semibold w-10">Qtd</th>
                  <th className="text-left px-3 py-2 font-semibold">Corretora</th>
                  <th className="text-left px-3 py-2 font-semibold">Cliente</th>
                  <th className="text-left px-3 py-2 font-semibold">Nº fatura</th>
                  <th className="text-left px-3 py-2 font-semibold">Vencimento</th>
                  <th className="text-right px-3 py-2 font-semibold">Valor</th>
                  <th className="text-right px-3 py-2 font-semibold">% comissão</th>
                  <th className="text-right px-3 py-2 font-semibold">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {linhasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      {loading ? "Carregando…" : "Nenhum dado. Ajuste os filtros e clique em Gerar relatório."}
                    </td>
                  </tr>
                ) : (
                  linhasPaginadas.map((row, i) => {
                    const numGlobal = (paginaSegura - 1) * ITENS_POR_PAGINA + i + 1
                    return (
                      <tr
                        key={row.fatura_id}
                        className={cn(i % 2 === 0 ? "bg-white" : "bg-slate-50/80", "border-t border-gray-100")}
                      >
                        <td className="px-2 py-2 text-center tabular-nums text-gray-600">{numGlobal}</td>
                        <td className="px-3 py-2 text-gray-800">{row.corretor_nome}</td>
                        <td className="px-3 py-2 text-gray-900">{row.cliente_nome}</td>
                        <td className="px-3 py-2 text-gray-700 tabular-nums">{row.numero_fatura || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.vencimento ? formatarData(row.vencimento) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(row.valor_fatura)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.percentual_comissao}%</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {formatarMoeda(row.valor_comissao)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {linhas.length > 0 && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right font-semibold text-gray-800">
                      Totais ({linhas.length} fatura{linhas.length !== 1 ? "s" : ""} · {totalClientesDistintos} cliente
                      {totalClientesDistintos !== 1 ? "s" : ""})
                    </td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatarMoeda(totalFaturas)}</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right font-bold text-emerald-800 tabular-nums">
                      {formatarMoeda(totalComissao)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {linhas.length > ITENS_POR_PAGINA && (
          <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
            <span>
              Página {paginaSegura} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={paginaSegura <= 1}
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
