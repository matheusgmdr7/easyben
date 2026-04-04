"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileDown, FileSpreadsheet, Search, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"

interface LinhaFaturamento {
  id: string
  cpf: string
  tipo: "titular" | "dependente"
  nome: string
  idade: number
  valor: number
  acomodacao: string
  mudanca_faixa: boolean
  mudanca_faixa_idade_anterior?: number | null
  mudanca_faixa_idade_nova?: number | null
  mudanca_faixa_aniversario?: string | null
}

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

export default function FaturamentoPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [grupoId, setGrupoId] = useState("")
  const [mesRef, setMesRef] = useState("")
  const [anoRef, setAnoRef] = useState("")
  const [produtoId, setProdutoId] = useState<string>("__todos__")
  const [produtos, setProdutos] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [linhas, setLinhas] = useState<LinhaFaturamento[]>([])
  const [total, setTotal] = useState(0)
  const [grupoNome, setGrupoNome] = useState("")
  const [referencia, setReferencia] = useState("")
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    GruposBeneficiariosService.buscarTodos(adm.id).then(setGrupos).catch(() => toast.error("Erro ao carregar grupos"))
  }, [router])

  useEffect(() => {
    if (!administradoraId) return
    fetch(`/api/administradora/produtos-contrato?administradora_id=${encodeURIComponent(administradoraId)}`)
      .then((r) => r.json())
      .then((d) => setProdutos(Array.isArray(d) ? d : []))
      .catch(() => setProdutos([]))
  }, [administradoraId])

  useEffect(() => {
    const ano = new Date().getFullYear()
    setAnoRef(String(ano))
    const m = new Date().getMonth() + 1
    setMesRef(String(m).padStart(2, "0"))
  }, [])

  async function gerarFaturamento() {
    if (!grupoId || !mesRef || !anoRef) {
      toast.error("Selecione o grupo e a referência (mês/ano)")
      return
    }
    try {
      setLoading(true)
      const ref = `${anoRef}-${mesRef}`
      const url = new URL("/api/administradora/faturamento/grupo", window.location.origin)
      url.searchParams.set("grupo_id", grupoId)
      url.searchParams.set("referencia", ref)
      if (produtoId && produtoId !== "__todos__" && produtoId.trim()) url.searchParams.set("produto_id", produtoId.trim())
      const res = await fetch(url.toString())
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar faturamento")
      setLinhas(data.linhas || [])
      setTotal(data.total ?? 0)
      setGrupoNome(data.grupo_nome || "")
      setReferencia(ref)
      if ((data.linhas || []).length === 0) {
        toast.info("Nenhum beneficiário ativo encontrado para este grupo na referência.")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar faturamento")
    } finally {
      setLoading(false)
    }
  }

  async function exportarPDF() {
    if (linhas.length === 0) {
      toast.error("Gere o faturamento antes de exportar")
      return
    }
    try {
      setExportandoPDF(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 10
      let y = 15
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text(`FATURA - ${grupoNome || "GRUPO DE BENEFICIÁRIOS"}`, margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      doc.text(`Grupo: ${grupoNome} | Referência: ${referencia.replace("-", "/")}`, margin, y)
      y += 6
      doc.text(`Total de beneficiários: ${linhas.length}`, margin, y)
      y += 8
      const headers = ["Nº", "CPF", "Tipo", "Nome", "Idade", "Valor", "Acomodação", "Faixa etária"]
      const colWidths = [11, 32, 22, 48, 14, 24, 28, 62]
      doc.setFont(undefined, "bold")
      let x = margin
      headers.forEach((h, i) => {
        doc.text(h, x, y)
        x += colWidths[i]
      })
      y += 5
      doc.setFont(undefined, "normal")
      const totalWidth = colWidths.reduce((a, b) => a + b, 0)
      const rowHeight = 6
      linhas.forEach((l, index) => {
        if (y > 185) {
          doc.addPage("landscape", "a4")
          y = 15
        }
        if (index % 2 === 1) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, y - 4, totalWidth, rowHeight, "F")
        }
        x = margin
        doc.text(String(index + 1), x, y)
        x += colWidths[0]
        doc.text(l.cpf, x, y)
        x += colWidths[1]
        doc.text(l.tipo === "titular" ? "Titular" : "Dependente", x, y)
        x += colWidths[2]
        doc.text(doc.splitTextToSize(l.nome, colWidths[3] - 2)[0] || l.nome.slice(0, 25), x, y)
        x += colWidths[3]
        doc.text(String(l.idade), x, y)
        x += colWidths[4]
        doc.text(formatarMoeda(l.valor), x, y)
        x += colWidths[5]
        doc.text(l.acomodacao, x, y)
        x += colWidths[6]
        const faixaPdf =
          l.mudanca_faixa &&
          l.mudanca_faixa_idade_anterior != null &&
          l.mudanca_faixa_idade_nova != null
            ? `de ${l.mudanca_faixa_idade_anterior} para ${l.mudanca_faixa_idade_nova} anos${
                l.mudanca_faixa_aniversario ? `, aniv. ${formatarData(l.mudanca_faixa_aniversario)}` : ""
              }`
            : l.mudanca_faixa
              ? "Mudou"
              : "-"
        doc.text(doc.splitTextToSize(String(faixaPdf), colWidths[7] - 2)[0] || String(faixaPdf), x, y)
        y += rowHeight
      })
      y += 4
      doc.setFont(undefined, "bold")
      doc.text(`Total de beneficiários: ${linhas.length}`, margin, y)
      y += 5
      doc.text(`TOTAL: ${formatarMoeda(total)}`, margin, y)
      doc.save(`fatura-${grupoNome.replace(/\s+/g, "-")}-${referencia}.pdf`)
      toast.success("PDF exportado com sucesso")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF")
    } finally {
      setExportandoPDF(false)
    }
  }

  function exportarExcel() {
    if (linhas.length === 0) {
      toast.error("Gere o faturamento antes de exportar")
      return
    }
    try {
      setExportandoExcel(true)
      const wsData = [
        [
          "Nº",
          "CPF",
          "Tipo",
          "Nome",
          "Idade",
          "Valor",
          "Acomodação",
          "Mudança faixa",
          "Idade anterior",
          "Idade referência",
          "Data aniversário",
        ],
        ...linhas.map((l, i) => [
          i + 1,
          l.cpf,
          l.tipo === "titular" ? "Titular" : "Dependente",
          l.nome,
          l.idade,
          l.valor,
          l.acomodacao,
          l.mudanca_faixa ? "Sim" : "Não",
          l.mudanca_faixa_idade_anterior ?? "",
          l.mudanca_faixa_idade_nova ?? "",
          l.mudanca_faixa_aniversario ? formatarData(l.mudanca_faixa_aniversario) : "",
        ]),
        [],
        ["Total de beneficiários", linhas.length, "", "", "", "", "", "", "", "", ""],
        ["TOTAL (R$)", "", "", "", "", total, "", "", "", "", ""],
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Fatura")
      XLSX.writeFile(wb, `fatura-${grupoNome.replace(/\s+/g, "-")}-${referencia}.xlsx`)
      toast.success("Excel exportado com sucesso")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcel(false)
    }
  }

  const temMudancaFaixa = linhas.some((l) => l.mudanca_faixa)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Relatório de faturamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gere o relatório de faturamento de um grupo por mês/ano</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo de Beneficiários</label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Ano</label>
            <Input
              type="number"
              value={anoRef}
              onChange={(e) => setAnoRef(e.target.value)}
              placeholder="2025"
              className="h-10 border border-gray-300 rounded-md"
              min={2020}
              max={2030}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto</label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos os produtos</SelectItem>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 invisible">Ação</label>
            <Button
              onClick={gerarFaturamento}
              disabled={loading}
              className="h-10 w-full md:w-auto bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-4 py-2 shadow-lg rounded"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Gerando…" : "Gerar Faturamento"}
            </Button>
          </div>
        </div>
      </div>

      {linhas.length > 0 && (
        <>
          {temMudancaFaixa && (
            <div className="mt-4 w-full min-w-0 max-w-full box-border px-6">
              <Alert variant="warning" className="w-full min-w-0 max-w-full">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <AlertDescription className="text-sm break-words [&_strong]:font-semibold sm:pr-2">
                  <strong>Mudança de faixa etária:</strong> Alguns beneficiários completaram idade que mudou a faixa de
                  preço. Na coluna &quot;Faixa etária&quot; aparecem a idade no mês anterior e na referência (ex.: de 32
                  para 33 anos) e a data do aniversário no ano da referência.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="px-6 py-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Total de beneficiários: {linhas.length}</span>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm font-medium text-gray-700">Total: {formatarMoeda(total)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarPDF}
              disabled={exportandoPDF}
              className="border-gray-300"
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              {exportandoPDF ? "Exportando…" : "Exportar PDF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarExcel}
              disabled={exportandoExcel}
              className="border-gray-300"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              {exportandoExcel ? "Exportando…" : "Exportar Excel"}
            </Button>
          </div>

          <div className="px-6 pb-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold w-14">Nº</TableHead>
                      <TableHead className="font-semibold">CPF</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold">Idade</TableHead>
                      <TableHead className="font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Acomodação</TableHead>
                      <TableHead className="font-semibold min-w-[9rem]">Faixa etária</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l, i) => (
                      <TableRow
                        key={l.id}
                        className={cn(
                          l.mudanca_faixa && "bg-amber-50",
                          i % 2 === 0 && !l.mudanca_faixa && "bg-white",
                          i % 2 === 1 && !l.mudanca_faixa && "bg-gray-50/50"
                        )}
                      >
                        <TableCell className="font-medium text-gray-600">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{l.cpf}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {l.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{l.nome}</TableCell>
                        <TableCell>{l.idade}</TableCell>
                        <TableCell className="font-medium">{formatarMoeda(l.valor)}</TableCell>
                        <TableCell>{l.acomodacao}</TableCell>
                        <TableCell>
                          {l.mudanca_faixa ? (
                            <div className="space-y-1">
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300">Mudou</Badge>
                              {l.mudanca_faixa_idade_anterior != null && l.mudanca_faixa_idade_nova != null ? (
                                <p className="text-xs text-amber-950 font-medium tabular-nums">
                                  de {l.mudanca_faixa_idade_anterior} para {l.mudanca_faixa_idade_nova} anos
                                </p>
                              ) : null}
                              {l.mudanca_faixa_aniversario ? (
                                <p className="text-xs text-gray-600">
                                  Aniversário: {formatarData(l.mudanca_faixa_aniversario)}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-gray-200 bg-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-gray-700">Total de beneficiários: <strong>{linhas.length}</strong></span>
                <span className="font-bold text-gray-800">TOTAL: {formatarMoeda(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {linhas.length === 0 && !loading && administradoraId && (
        <div className="px-6 py-12 text-center text-gray-500">
          <p className="text-sm">Selecione um grupo e a referência (mês/ano) e clique em &quot;Gerar Faturamento&quot;.</p>
        </div>
      )}
    </div>
  )
}
