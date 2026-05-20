"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, ExternalLink, FileDown, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatarData } from "@/utils/formatters"
import * as XLSX from "xlsx"

function mesAtualYm() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`
}

function formatarMesAno(ym: string) {
  const [y, m] = ym.split("-").map((x) => Number(x))
  if (!y || !m || m < 1 || m > 12) return ym
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function formatarVencimentos(vencimentos: string[]) {
  if (!vencimentos?.length) return "—"
  return vencimentos.map((v) => formatarData(v)).join(", ")
}

type PorMes = { mes: string; titularesComFaturaAtrasada: number; percentual: number }

type ResultadoInadimplencia = {
  grupo: { id: string; nome: string }
  mes_inicio: string
  mes_fim: string
  criterio: string
  totais: {
    totalVidasAtivas: number
    totalTitularesComVinculoFaturamento: number
    basePercentualTitulares: number
  }
  resumoPeriodo: { titularesDistintosComAtrasada: number; percentual: number }
  porMes: PorMes[]
}

type ClienteAtraso = {
  cliente_administradora_id: string
  cliente_nome: string
  quantidadeFaturasAtrasadas: number
  vencimentos: string[]
}

type ResumoControle = {
  baseTitulares: number
  titularesComFaturaAtrasada: number
  percentualInadimplencia: number
  comUmBoleto: number
  comDoisOuMaisBoletos: number
  percentualUmBoleto: number
  percentualDoisOuMais: number
}

type ResultadoControle = {
  grupo: { id: string; nome: string }
  criterio: string
  resumo: ResumoControle
  clientesUmBoleto: ClienteAtraso[]
  clientesDoisOuMaisBoletos: ClienteAtraso[]
}

type AbaControle = "um" | "dois_ou_mais"

function rotuloAbaControle(aba: AbaControle) {
  return aba === "um" ? "1 boleto em atraso" : "2+ boletos em atraso"
}

function slugArquivo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function TabelaClientesAtraso({
  clientes,
  grupoId,
  vazio,
}: {
  clientes: ClienteAtraso[]
  grupoId: string
  vazio: string
}) {
  if (clientes.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">{vazio}</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold text-right">Boletos atrasados</TableHead>
            <TableHead className="font-semibold min-w-[160px]">Vencimentos</TableHead>
            <TableHead className="font-semibold w-[120px]">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => (
            <TableRow key={c.cliente_administradora_id}>
              <TableCell>
                <span className="font-medium text-gray-900">{c.cliente_nome}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-amber-900">
                {c.quantidadeFaturasAtrasadas}
              </TableCell>
              <TableCell className="text-sm text-gray-700">{formatarVencimentos(c.vencimentos)}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link
                    href={`/administradora/grupos-beneficiarios/${grupoId}?aba=financeiro&cliente=${encodeURIComponent(c.cliente_administradora_id)}`}
                    className="inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Financeiro
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function InadimplenciaPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [grupoId, setGrupoId] = useState("")
  const [mesInicio, setMesInicio] = useState(mesAtualYm())
  const [mesFim, setMesFim] = useState(mesAtualYm())
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoInadimplencia | null>(null)
  const [controle, setControle] = useState<ResultadoControle | null>(null)
  const [abaControle, setAbaControle] = useState<AbaControle>("um")
  const [exportandoPdfControle, setExportandoPdfControle] = useState(false)
  const [exportandoExcelControle, setExportandoExcelControle] = useState(false)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    ;(async () => {
      try {
        setLoadingGrupos(true)
        const data = await GruposBeneficiariosService.buscarTodos(adm.id)
        setGrupos(data || [])
      } catch {
        toast.error("Erro ao carregar grupos")
        setGrupos([])
      } finally {
        setLoadingGrupos(false)
      }
    })()
  }, [router])

  async function consultar() {
    if (!administradoraId || !grupoId) {
      toast.error("Selecione um grupo")
      return
    }
    if (!/^\d{4}-\d{2}$/.test(mesInicio) || !/^\d{4}-\d{2}$/.test(mesFim)) {
      toast.error("Informe mês inicial e final (AAAA-MM)")
      return
    }
    if (mesInicio > mesFim) {
      toast.error("Mês inicial não pode ser maior que o mês final")
      return
    }
    try {
      setLoading(true)
      setResultado(null)
      setControle(null)

      const qsPeriodo = new URLSearchParams({
        grupo_id: grupoId,
        administradora_id: administradoraId,
        mes_inicio: mesInicio,
        mes_fim: mesFim,
      })
      const qsControle = new URLSearchParams({
        grupo_id: grupoId,
        administradora_id: administradoraId,
      })

      const [resPeriodo, resControle] = await Promise.all([
        fetch(`/api/administradora/financeiro/inadimplencia-grupo?${qsPeriodo}`),
        fetch(`/api/administradora/financeiro/clientes-multi-atraso?${qsControle}`),
      ])

      const dataPeriodo = await resPeriodo.json().catch(() => ({}))
      const dataControle = await resControle.json().catch(() => ({}))

      if (!resPeriodo.ok) {
        throw new Error((dataPeriodo as { error?: string }).error || "Erro ao consultar indicadores por mês")
      }
      if (!resControle.ok) {
        throw new Error((dataControle as { error?: string }).error || "Erro ao consultar situação atual")
      }

      setResultado(dataPeriodo as ResultadoInadimplencia)
      setControle(dataControle as ResultadoControle)
      setAbaControle(
        (dataControle as ResultadoControle).clientesUmBoleto?.length > 0 ? "um" : "dois_ou_mais"
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na consulta")
    } finally {
      setLoading(false)
    }
  }

  const listaAbaControle =
    abaControle === "um" ? controle?.clientesUmBoleto ?? [] : controle?.clientesDoisOuMaisBoletos ?? []

  function exportarExcelControle() {
    if (!controle || listaAbaControle.length === 0) {
      toast.error("Não há registros na aba atual para exportar")
      return
    }
    try {
      setExportandoExcelControle(true)
      const abaLabel = rotuloAbaControle(abaControle)
      const wsData: (string | number)[][] = [
        ["Grupo", controle.grupo.nome],
        ["Situação", abaLabel],
        ["% inadimplência (atual)", `${controle.resumo.percentualInadimplencia}%`],
        ["Titulares com atraso", controle.resumo.titularesComFaturaAtrasada],
        ["Base titulares", controle.resumo.baseTitulares],
        [],
        ["Nº", "Cliente", "Boletos atrasados", "Vencimentos"],
        ...listaAbaControle.map((c, i) => [
          i + 1,
          c.cliente_nome,
          c.quantidadeFaturasAtrasadas,
          formatarVencimentos(c.vencimentos),
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, abaLabel.slice(0, 31))
      const nomeArquivo = `inadimplencia-${slugArquivo(controle.grupo.nome)}-${slugArquivo(abaLabel)}.xlsx`
      XLSX.writeFile(wb, nomeArquivo)
      toast.success("Excel exportado com sucesso")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcelControle(false)
    }
  }

  async function exportarPdfControle() {
    if (!controle || listaAbaControle.length === 0) {
      toast.error("Não há registros na aba atual para exportar")
      return
    }
    try {
      setExportandoPdfControle(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      let y = 15
      const abaLabel = rotuloAbaControle(abaControle)

      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Inadimplência — controle por boletos atrasados", margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      doc.text(`Grupo: ${controle.grupo.nome}`, margin, y)
      y += 5
      doc.text(`Situação: ${abaLabel}`, margin, y)
      y += 5
      doc.text(
        `% inadimplência: ${controle.resumo.percentualInadimplencia}% (${controle.resumo.titularesComFaturaAtrasada} de ${controle.resumo.baseTitulares} titulares)`,
        margin,
        y
      )
      y += 8

      const headers = ["Nº", "Cliente", "Boletos", "Vencimentos"]
      const colWidths = [12, 75, 22, 155]
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

      listaAbaControle.forEach((c, index) => {
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
        doc.text(doc.splitTextToSize(c.cliente_nome, colWidths[1] - 2)[0] || c.cliente_nome.slice(0, 40), x, y)
        x += colWidths[1]
        doc.text(String(c.quantidadeFaturasAtrasadas), x, y)
        x += colWidths[2]
        const venc = formatarVencimentos(c.vencimentos)
        doc.text(doc.splitTextToSize(venc, colWidths[3] - 2)[0] || venc, x, y)
        y += rowHeight
      })

      y += 4
      doc.setFont(undefined, "bold")
      doc.text(`Total na lista: ${listaAbaControle.length}`, margin, y)

      const nomeArquivo = `inadimplencia-${slugArquivo(controle.grupo.nome)}-${slugArquivo(abaLabel)}.pdf`
      doc.save(nomeArquivo)
      toast.success("PDF exportado com sucesso")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF")
    } finally {
      setExportandoPdfControle(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Inadimplência por grupo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Percentual de inadimplência, evolução por mês de vencimento e controle de titulares com 1 boleto ou 2+ boletos
          em atraso (situação atual).
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-6xl">
        <Card className="rounded-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-xs font-medium text-gray-600">Grupo de beneficiários</Label>
                <Select value={grupoId} onValueChange={setGrupoId} disabled={loadingGrupos}>
                  <SelectTrigger className="h-10 border-gray-200 bg-white">
                    <SelectValue placeholder={loadingGrupos ? "Carregando..." : "Selecione o grupo"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,320px)]">
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Mês inicial (série mensal)</Label>
                <Input type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Mês final (série mensal)</Label>
                <Input type="month" value={mesFim} onChange={(e) => setMesFim(e.target.value)} className="h-10" />
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void consultar()}
              disabled={loading || !grupoId}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando…
                </>
              ) : (
                "Consultar inadimplência"
              )}
            </Button>
          </CardContent>
        </Card>

        {controle && (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">{controle.criterio}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="rounded-md border border-slate-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-slate-500">% inadimplência (atual)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-3xl font-semibold text-amber-900 tabular-nums">
                    {controle.resumo.percentualInadimplencia}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {controle.resumo.titularesComFaturaAtrasada} de {controle.resumo.baseTitulares} titulares com ≥1
                    fatura atrasada
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-amber-100 bg-amber-50/40">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-amber-900">1 boleto em atraso</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-3xl font-semibold text-amber-900 tabular-nums">{controle.resumo.comUmBoleto}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {controle.resumo.percentualUmBoleto}% da base · ~1 mês de atraso
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-red-100 bg-red-50/30">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-red-900">2+ boletos em atraso</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-3xl font-semibold text-red-900 tabular-nums">
                    {controle.resumo.comDoisOuMaisBoletos}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {controle.resumo.percentualDoisOuMais}% da base · dois ou mais meses em aberto
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Controle por quantidade de boletos atrasados</CardTitle>
                <p className="text-sm text-gray-500">{controle.grupo.nome}</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={abaControle === "um" ? "default" : "outline"}
                      className={cn(abaControle === "um" && "bg-[#0F172A] hover:bg-[#1E293B] text-white")}
                      onClick={() => setAbaControle("um")}
                    >
                      1 boleto ({controle.clientesUmBoleto.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={abaControle === "dois_ou_mais" ? "default" : "outline"}
                      className={cn(
                        abaControle === "dois_ou_mais" && "bg-[#0F172A] hover:bg-[#1E293B] text-white"
                      )}
                      onClick={() => setAbaControle("dois_ou_mais")}
                    >
                      2+ boletos ({controle.clientesDoisOuMaisBoletos.length})
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                      disabled={exportandoPdfControle || listaAbaControle.length === 0}
                      onClick={() => void exportarPdfControle()}
                    >
                      {exportandoPdfControle ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4 mr-1.5" />
                      )}
                      Exportar PDF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                      disabled={exportandoExcelControle || listaAbaControle.length === 0}
                      onClick={exportarExcelControle}
                    >
                      {exportandoExcelControle ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                      )}
                      Exportar Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TabelaClientesAtraso
                  clientes={listaAbaControle}
                  grupoId={controle.grupo.id}
                  vazio={
                    abaControle === "um"
                      ? "Nenhum titular ativo com exatamente 1 fatura atrasada neste grupo."
                      : "Nenhum titular ativo com 2 ou mais faturas atrasadas neste grupo."
                  }
                />
              </CardContent>
            </Card>
          </>
        )}

        {resultado && (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">{resultado.criterio}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Vidas ativas (grupo)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.totais.totalVidasAtivas}</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Titulares (vínculo faturamento)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {resultado.totais.totalTitularesComVinculoFaturamento}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Base dos percentuais mensais.</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Inadimplentes no período</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-amber-900">
                    {resultado.resumoPeriodo.titularesDistintosComAtrasada}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Com ≥1 fatura atrasada no intervalo de vencimento.</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">% no período (vencimento)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-amber-900">{resultado.resumoPeriodo.percentual}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatarMesAno(resultado.mes_inicio)} — {formatarMesAno(resultado.mes_fim)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Indicador por mês (vencimento da fatura atrasada)</CardTitle>
                <p className="text-sm text-gray-500">{resultado.grupo.nome}</p>
              </CardHeader>
              <CardContent>
                {resultado.porMes.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">Nenhum mês no intervalo.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-gray-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Mês</TableHead>
                          <TableHead className="font-semibold text-right">Titulares com fatura atrasada</TableHead>
                          <TableHead className="font-semibold text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultado.porMes.map((row) => (
                          <TableRow key={row.mes}>
                            <TableCell className="font-medium">{formatarMesAno(row.mes)}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.titularesComFaturaAtrasada}</TableCell>
                            <TableCell className="text-right tabular-nums text-amber-900 font-medium">
                              {row.percentual}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
