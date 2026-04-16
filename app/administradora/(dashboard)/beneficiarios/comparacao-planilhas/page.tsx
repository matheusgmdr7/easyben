"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileSpreadsheet, GitCompare, Loader2, Plus, Trash2, Download } from "lucide-react"

type LinhaPlanilha = Record<string, unknown>

type ParChave = { colBase: string; colConsulta: string }

type LinhaResultado = {
  linhaConsulta: number
  chaveExibicao: string
  ocorrenciasNaBase: number
  situacao: "encontrado" | "nao_encontrado" | "multiplo_na_base"
  /** Quantas vezes a mesma chave aparece na planilha de consulta (≥2 = duplicata interna). */
  ocorrenciasNaConsulta: number
}

const DELIM = "\u001f"
const ITENS_PAGINA = 25

function extrairPlanilha(wb: XLSX.WorkBook, nomeAba: string): { headers: string[]; rows: LinhaPlanilha[] } {
  const ws = wb.Sheets[nomeAba]
  if (!ws) return { headers: [], rows: [] }
  const arr: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false })
  if (!arr.length) return { headers: [], rows: [] }
  const headers = (arr[0] as unknown[]).map((h) => String(h ?? "").trim()).filter((h) => h !== "")
  const rows = arr.slice(1).map((row) => {
    const r = Array.isArray(row) ? row : Object.values(row as object)
    const obj: LinhaPlanilha = {}
    headers.forEach((h, i) => {
      obj[h] = r[i] != null ? r[i] : ""
    })
    return obj
  })
  return { headers, rows }
}

function normalizarCelula(
  v: unknown,
  opts: { minusculas: boolean; somenteDigitosCpf: boolean }
): string {
  let s = String(v ?? "").trim()
  if (opts.somenteDigitosCpf) {
    const d = s.replace(/\D/g, "")
    if (d.length >= 11) return d.slice(-11).padStart(11, "0")
    return d
  }
  if (opts.minusculas) s = s.toLowerCase()
  return s
}

function montarChave(
  row: LinhaPlanilha,
  colunas: string[],
  opts: { minusculas: boolean; somenteDigitosCpf: boolean }
): string {
  return colunas.map((c) => normalizarCelula(row[c], opts)).join(DELIM)
}

function executarComparacao(
  rowsBase: LinhaPlanilha[],
  rowsConsulta: LinhaPlanilha[],
  pares: ParChave[],
  opts: { minusculas: boolean; somenteDigitosCpf: boolean }
): {
  resultados: LinhaResultado[]
  chavesDuplicadasNaBase: number
  chavesDuplicadasNaConsulta: number
} {
  const colsB = pares.map((p) => p.colBase)
  const colsC = pares.map((p) => p.colConsulta)

  const contagemBase = new Map<string, number>()
  for (const row of rowsBase) {
    const k = montarChave(row, colsB, opts)
    contagemBase.set(k, (contagemBase.get(k) ?? 0) + 1)
  }

  const contagemConsulta = new Map<string, number>()
  for (const row of rowsConsulta) {
    const k = montarChave(row, colsC, opts)
    contagemConsulta.set(k, (contagemConsulta.get(k) ?? 0) + 1)
  }

  let chavesDupBase = 0
  for (const n of contagemBase.values()) {
    if (n > 1) chavesDupBase++
  }
  let chavesDupConsulta = 0
  for (const n of contagemConsulta.values()) {
    if (n > 1) chavesDupConsulta++
  }

  const resultados: LinhaResultado[] = []
  rowsConsulta.forEach((row, idx) => {
    const k = montarChave(row, colsC, opts)
    const partes = pares.map((p) => `${p.colConsulta}=${String(row[p.colConsulta] ?? "").trim()}`)
    const chaveExibicao = partes.join(" | ")
    const nBase = contagemBase.get(k) ?? 0
    const nCons = contagemConsulta.get(k) ?? 1
    let situacao: LinhaResultado["situacao"]
    if (nBase === 0) situacao = "nao_encontrado"
    else if (nBase > 1) situacao = "multiplo_na_base"
    else situacao = "encontrado"
    resultados.push({
      linhaConsulta: idx + 2,
      chaveExibicao,
      ocorrenciasNaBase: nBase,
      situacao,
      ocorrenciasNaConsulta: nCons,
    })
  })

  return {
    resultados,
    chavesDuplicadasNaBase: chavesDupBase,
    chavesDuplicadasNaConsulta: chavesDupConsulta,
  }
}

export default function ComparacaoPlanilhasPage() {
  const baseWbRef = useRef<XLSX.WorkBook | null>(null)
  const consultaWbRef = useRef<XLSX.WorkBook | null>(null)

  const [baseNomeArquivo, setBaseNomeArquivo] = useState<string>("")
  const [consultaNomeArquivo, setConsultaNomeArquivo] = useState<string>("")
  const [baseAbas, setBaseAbas] = useState<string[]>([])
  const [consultaAbas, setConsultaAbas] = useState<string[]>([])
  const [abaBase, setAbaBase] = useState("")
  const [abaConsulta, setAbaConsulta] = useState("")
  const [headersBase, setHeadersBase] = useState<string[]>([])
  const [headersConsulta, setHeadersConsulta] = useState<string[]>([])
  const [rowsBase, setRowsBase] = useState<LinhaPlanilha[]>([])
  const [rowsConsulta, setRowsConsulta] = useState<LinhaPlanilha[]>([])
  const [carregandoBase, setCarregandoBase] = useState(false)
  const [carregandoConsulta, setCarregandoConsulta] = useState(false)

  const [paresChave, setParesChave] = useState<ParChave[]>([{ colBase: "", colConsulta: "" }])
  const [ignorarMaiusculas, setIgnorarMaiusculas] = useState(true)
  const [normalizarCpf, setNormalizarCpf] = useState(true)

  const [resultados, setResultados] = useState<LinhaResultado[] | null>(null)
  const [stats, setStats] = useState<{
    dupBase: number
    dupConsulta: number
    encontrados: number
    naoEncontrados: number
    multiplosBase: number
  } | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState<"todas" | LinhaResultado["situacao"]>("todas")
  const [busca, setBusca] = useState("")
  const [pagina, setPagina] = useState(1)

  const recarregarBase = useCallback((nomeAba: string) => {
    const wb = baseWbRef.current
    if (!wb || !nomeAba) return
    const { headers, rows } = extrairPlanilha(wb, nomeAba)
    setHeadersBase(headers)
    setRowsBase(rows)
  }, [])

  const recarregarConsulta = useCallback((nomeAba: string) => {
    const wb = consultaWbRef.current
    if (!wb || !nomeAba) return
    const { headers, rows } = extrairPlanilha(wb, nomeAba)
    setHeadersConsulta(headers)
    setRowsConsulta(rows)
  }, [])

  async function onArquivoBase(file: File | null) {
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }
    setCarregandoBase(true)
    try {
      const isCsv = /\.csv$/i.test(file.name)
      let wb: XLSX.WorkBook
      if (isCsv) {
        const text = await file.text()
        wb = XLSX.read(text, { type: "string", raw: true })
      } else {
        const ab = await file.arrayBuffer()
        wb = XLSX.read(ab, { type: "array" })
      }
      baseWbRef.current = wb
      setBaseNomeArquivo(file.name)
      const names = wb.SheetNames
      setBaseAbas(names)
      const primeira = names[0] || ""
      setAbaBase(primeira)
      if (primeira) {
        const { headers, rows } = extrairPlanilha(wb, primeira)
        setHeadersBase(headers)
        setRowsBase(rows)
      } else {
        setHeadersBase([])
        setRowsBase([])
      }
      setResultados(null)
      setStats(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler planilha base")
      baseWbRef.current = null
      setBaseNomeArquivo("")
      setBaseAbas([])
      setRowsBase([])
    } finally {
      setCarregandoBase(false)
    }
  }

  async function onArquivoConsulta(file: File | null) {
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }
    setCarregandoConsulta(true)
    try {
      const isCsv = /\.csv$/i.test(file.name)
      let wb: XLSX.WorkBook
      if (isCsv) {
        const text = await file.text()
        wb = XLSX.read(text, { type: "string", raw: true })
      } else {
        const ab = await file.arrayBuffer()
        wb = XLSX.read(ab, { type: "array" })
      }
      consultaWbRef.current = wb
      setConsultaNomeArquivo(file.name)
      const names = wb.SheetNames
      setConsultaAbas(names)
      const primeira = names[0] || ""
      setAbaConsulta(primeira)
      if (primeira) {
        const { headers, rows } = extrairPlanilha(wb, primeira)
        setHeadersConsulta(headers)
        setRowsConsulta(rows)
      } else {
        setHeadersConsulta([])
        setRowsConsulta([])
      }
      setResultados(null)
      setStats(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler planilha de consulta")
      consultaWbRef.current = null
      setConsultaNomeArquivo("")
      setConsultaAbas([])
      setRowsConsulta([])
    } finally {
      setCarregandoConsulta(false)
    }
  }

  function adicionarPar() {
    setParesChave((p) => [...p, { colBase: "", colConsulta: "" }])
  }

  function removerPar(i: number) {
    setParesChave((p) => (p.length <= 1 ? p : p.filter((_, j) => j !== i)))
  }

  function atualizarPar(i: number, campo: keyof ParChave, valor: string) {
    setParesChave((p) => p.map((row, j) => (j === i ? { ...row, [campo]: valor } : row)))
  }

  function comparar() {
    const pares = paresChave.filter((p) => p.colBase && p.colConsulta)
    if (pares.length === 0) {
      toast.error("Defina ao menos um par de colunas (base × consulta).")
      return
    }
    if (rowsBase.length === 0 || rowsConsulta.length === 0) {
      toast.error("Carregue as duas planilhas com dados.")
      return
    }
    const opts = { minusculas: ignorarMaiusculas, somenteDigitosCpf: normalizarCpf }
    const { resultados: res, chavesDuplicadasNaBase, chavesDuplicadasNaConsulta } = executarComparacao(
      rowsBase,
      rowsConsulta,
      pares,
      opts
    )
    setResultados(res)
    const encontrados = res.filter((r) => r.situacao === "encontrado").length
    const naoEncontrados = res.filter((r) => r.situacao === "nao_encontrado").length
    const multiplosBase = res.filter((r) => r.situacao === "multiplo_na_base").length
    setStats({
      dupBase: chavesDuplicadasNaBase,
      dupConsulta: chavesDuplicadasNaConsulta,
      encontrados,
      naoEncontrados,
      multiplosBase,
    })
    setPagina(1)
    setFiltroSituacao("todas")
    toast.success("Comparação concluída.")
  }

  const resultadosFiltrados = useMemo(() => {
    if (!resultados) return []
    const t = busca.trim().toLowerCase()
    return resultados.filter((r) => {
      if (filtroSituacao !== "todas" && r.situacao !== filtroSituacao) return false
      if (!t) return true
      return (
        r.chaveExibicao.toLowerCase().includes(t) ||
        String(r.linhaConsulta).includes(t) ||
        r.situacao.toLowerCase().includes(t)
      )
    })
  }, [resultados, filtroSituacao, busca])

  const totalPaginas = Math.max(1, Math.ceil(resultadosFiltrados.length / ITENS_PAGINA))
  const paginaAjustada = Math.min(pagina, totalPaginas)
  const slice = resultadosFiltrados.slice((paginaAjustada - 1) * ITENS_PAGINA, paginaAjustada * ITENS_PAGINA)

  function exportarResultado() {
    if (!resultados || !stats) {
      toast.info("Execute uma comparação antes de exportar.")
      return
    }
    const rows = resultados.map((r) => ({
      linha_planilha_consulta: r.linhaConsulta,
      chave: r.chaveExibicao,
      ocorrencias_na_base: r.ocorrenciasNaBase,
      situacao:
        r.situacao === "encontrado"
          ? "Encontrado na base"
          : r.situacao === "nao_encontrado"
            ? "Não encontrado na base"
            : "Múltiplas ocorrências na base",
      ocorrencias_na_consulta: r.ocorrenciasNaConsulta,
      duplicata_na_consulta: r.ocorrenciasNaConsulta > 1 ? "Sim" : "Não",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Resultado")
    const meta = XLSX.utils.json_to_sheet([
      { campo: "Arquivo base", valor: baseNomeArquivo },
      { campo: "Aba base", valor: abaBase },
      { campo: "Arquivo consulta", valor: consultaNomeArquivo },
      { campo: "Aba consulta", valor: abaConsulta },
      { campo: "Linhas base", valor: rowsBase.length },
      { campo: "Linhas consulta", valor: rowsConsulta.length },
      { campo: "Chaves com duplicata na base", valor: stats.dupBase },
      { campo: "Chaves com duplicata na consulta", valor: stats.dupConsulta },
      { campo: "Encontrados (linhas consulta)", valor: stats.encontrados },
      { campo: "Não encontrados", valor: stats.naoEncontrados },
      { campo: "Múltiplo na base", valor: stats.multiplosBase },
    ])
    XLSX.utils.book_append_sheet(wb, meta, "Resumo")
    XLSX.writeFile(wb, `comparacao-planilhas-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Arquivo exportado.")
  }

  function badgeSituacao(s: LinhaResultado["situacao"]) {
    if (s === "encontrado")
      return (
        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-100">
          Encontrado
        </Badge>
      )
    if (s === "nao_encontrado")
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
          Não encontrado
        </Badge>
      )
    return (
      <Badge className="bg-violet-100 text-violet-900 border-violet-200 hover:bg-violet-100">
        Múltiplo na base
      </Badge>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 md:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <GitCompare className="h-8 w-8 text-slate-700 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Comparação de planilhas</h1>
            <p className="text-slate-600 mt-1 text-sm md:text-base max-w-3xl">
              Use uma planilha como <strong>base</strong> e outra como <strong>consulta</strong>. Escolha uma ou mais
              colunas para formar a chave (como um PROCV composto). O sistema indica o que existe na base, o que não
              existe, duplicidades na base e na consulta, e linhas da consulta cuja chave aparece mais de uma vez na
              base.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Planilha base
            </CardTitle>
            <CardDescription>Referência para a comparação (equivalente à tabela do PROCV).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => onArquivoBase(e.target.files?.[0] ?? null)}
              disabled={carregandoBase}
            />
            {carregandoBase && (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Lendo…
              </p>
            )}
            {baseNomeArquivo && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">{baseNomeArquivo}</span> — {rowsBase.length} linha(s) de dados
              </p>
            )}
            {baseAbas.length > 1 && (
              <div>
                <Label>Aba</Label>
                <Select
                  value={abaBase}
                  onValueChange={(v) => {
                    setAbaBase(v)
                    recarregarBase(v)
                    setResultados(null)
                    setStats(null)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {baseAbas.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Planilha de consulta
            </CardTitle>
            <CardDescription>Linhas que você quer cruzar com a base (valores “procurados”).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => onArquivoConsulta(e.target.files?.[0] ?? null)}
              disabled={carregandoConsulta}
            />
            {carregandoConsulta && (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Lendo…
              </p>
            )}
            {consultaNomeArquivo && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">{consultaNomeArquivo}</span> — {rowsConsulta.length} linha(s) de dados
              </p>
            )}
            {consultaAbas.length > 1 && (
              <div>
                <Label>Aba</Label>
                <Select
                  value={abaConsulta}
                  onValueChange={(v) => {
                    setAbaConsulta(v)
                    recarregarConsulta(v)
                    setResultados(null)
                    setStats(null)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {consultaAbas.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chave de correspondência</CardTitle>
          <CardDescription>
            Cada par une uma coluna da <strong>base</strong> à coluna correspondente na <strong>consulta</strong>. A
            chave final é a concatenação dos valores normalizados (várias colunas = chave composta).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="minusculas"
                checked={ignorarMaiusculas}
                onCheckedChange={(c) => setIgnorarMaiusculas(c === true)}
              />
              <Label htmlFor="minusculas" className="font-normal cursor-pointer">
                Ignorar maiúsculas/minúsculas
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cpf"
                checked={normalizarCpf}
                onCheckedChange={(c) => setNormalizarCpf(c === true)}
              />
              <Label htmlFor="cpf" className="font-normal cursor-pointer">
                Normalizar como CPF (somente dígitos, 11 posições)
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            {paresChave.map((par, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Coluna na base</Label>
                  <Select value={par.colBase || "__vazio__"} onValueChange={(v) => atualizarPar(i, "colBase", v === "__vazio__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__vazio__">—</SelectItem>
                      {headersBase.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Coluna na consulta</Label>
                  <Select
                    value={par.colConsulta || "__vazio__"}
                    onValueChange={(v) => atualizarPar(i, "colConsulta", v === "__vazio__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__vazio__">—</SelectItem>
                      {headersConsulta.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => removerPar(i)} disabled={paresChave.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={adicionarPar}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar coluna à chave
            </Button>
          </div>

          <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={comparar}>
            <GitCompare className="h-4 w-4 mr-2" />
            Comparar planilhas
          </Button>
        </CardContent>
      </Card>

      {stats && resultados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase font-medium">Encontrados</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.encontrados}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase font-medium">Não encontrados</p>
                <p className="text-2xl font-bold text-amber-700">{stats.naoEncontrados}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase font-medium">Múltiplo na base</p>
                <p className="text-2xl font-bold text-violet-700">{stats.multiplosBase}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase font-medium">Chaves dup. base</p>
                <p className="text-2xl font-bold text-slate-800">{stats.dupBase}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase font-medium">Chaves dup. consulta</p>
                <p className="text-2xl font-bold text-slate-800">{stats.dupConsulta}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase font-medium">Linhas consulta</p>
                <p className="text-2xl font-bold text-slate-800">{resultados.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Resultado por linha (consulta)</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportarResultado}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Buscar na chave ou linha…"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setPagina(1)
                  }}
                  className="max-w-md"
                />
                <Select
                  value={filtroSituacao}
                  onValueChange={(v) => {
                    setFiltroSituacao(v as typeof filtroSituacao)
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as situações</SelectItem>
                    <SelectItem value="encontrado">Encontrado</SelectItem>
                    <SelectItem value="nao_encontrado">Não encontrado</SelectItem>
                    <SelectItem value="multiplo_na_base">Múltiplo na base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-24">Linha</TableHead>
                      <TableHead>Chave (consulta)</TableHead>
                      <TableHead className="w-28 text-center">Na base</TableHead>
                      <TableHead className="w-36">Situação</TableHead>
                      <TableHead className="w-28 text-center">Dup. consulta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                          Nenhuma linha com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      slice.map((r, idx) => (
                        <TableRow key={`${r.linhaConsulta}-${idx}`}>
                          <TableCell className="font-mono text-sm">{r.linhaConsulta}</TableCell>
                          <TableCell className="text-sm max-w-md whitespace-normal break-words">{r.chaveExibicao}</TableCell>
                          <TableCell className="text-center font-medium">{r.ocorrenciasNaBase}</TableCell>
                          <TableCell>{badgeSituacao(r.situacao)}</TableCell>
                          <TableCell className="text-center">
                            {r.ocorrenciasNaConsulta > 1 ? (
                              <Badge variant="outline" className="border-rose-200 text-rose-800">
                                {r.ocorrenciasNaConsulta}×
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  Mostrando {(paginaAjustada - 1) * ITENS_PAGINA + 1}–
                  {Math.min(paginaAjustada * ITENS_PAGINA, resultadosFiltrados.length)} de {resultadosFiltrados.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paginaAjustada <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="py-2">
                    {paginaAjustada} / {totalPaginas}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paginaAjustada >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
