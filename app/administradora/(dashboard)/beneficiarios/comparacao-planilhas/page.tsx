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
import { Input } from "@/components/ui/input"
import { FileSpreadsheet, GitCompare, Loader2, Plus, Trash2, Download, FileText, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type LinhaPlanilha = Record<string, unknown>

type ParChave = { colBase: string; colConsulta: string }

/** Duplicata: mesma chave em mais de uma linha da planilha. */
type DetalheDuplicata = {
  chaveLegivel: string
  ocorrencias: number
  linhasPlanilha: number[]
}

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

function chaveLegivelBase(row: LinhaPlanilha, pares: ParChave[]): string {
  return pares.map((p) => `${p.colBase}=${String(row[p.colBase] ?? "").trim()}`).join(" | ")
}

function chaveLegivelConsulta(row: LinhaPlanilha, pares: ParChave[]): string {
  return pares.map((p) => `${p.colConsulta}=${String(row[p.colConsulta] ?? "").trim()}`).join(" | ")
}

function montarDetalhesDuplicata(
  rows: LinhaPlanilha[],
  colunas: string[],
  pares: ParChave[],
  opts: { minusculas: boolean; somenteDigitosCpf: boolean },
  plano: "base" | "consulta"
): DetalheDuplicata[] {
  const linhasPorChave = new Map<string, number[]>()
  rows.forEach((row, idx) => {
    const k = montarChave(row, colunas, opts)
    const linhaPlan = idx + 2
    const arr = linhasPorChave.get(k) ?? []
    arr.push(linhaPlan)
    linhasPorChave.set(k, arr)
  })
  const out: DetalheDuplicata[] = []
  for (const [k, linhas] of linhasPorChave) {
    if (linhas.length <= 1) continue
    const firstIdx = rows.findIndex((row) => montarChave(row, colunas, opts) === k)
    const row = firstIdx >= 0 ? rows[firstIdx] : {}
    const chaveLegivel =
      plano === "base" ? chaveLegivelBase(row, pares) : chaveLegivelConsulta(row, pares)
    out.push({
      chaveLegivel,
      ocorrencias: linhas.length,
      linhasPlanilha: [...linhas].sort((a, b) => a - b),
    })
  }
  out.sort((a, b) => a.chaveLegivel.localeCompare(b.chaveLegivel, "pt-BR", { sensitivity: "base" }))
  return out
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
  detalheDupBase: DetalheDuplicata[]
  detalheDupConsulta: DetalheDuplicata[]
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

  const detalheDupBase = montarDetalhesDuplicata(rowsBase, colsB, pares, opts, "base")
  const detalheDupConsulta = montarDetalhesDuplicata(rowsConsulta, colsC, pares, opts, "consulta")

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
    detalheDupBase,
    detalheDupConsulta,
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
  const [detalheDupBase, setDetalheDupBase] = useState<DetalheDuplicata[]>([])
  const [detalheDupConsulta, setDetalheDupConsulta] = useState<DetalheDuplicata[]>([])
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
      setDetalheDupBase([])
      setDetalheDupConsulta([])
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
      setDetalheDupBase([])
      setDetalheDupConsulta([])
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
    const {
      resultados: res,
      chavesDuplicadasNaBase,
      chavesDuplicadasNaConsulta,
      detalheDupBase: dBase,
      detalheDupConsulta: dCons,
    } = executarComparacao(rowsBase, rowsConsulta, pares, opts)
    setResultados(res)
    setDetalheDupBase(dBase)
    setDetalheDupConsulta(dCons)
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

  function textoSituacaoRelatorio(s: LinhaResultado["situacao"]): string {
    if (s === "encontrado") return "Encontrado na base"
    if (s === "nao_encontrado") return "Não encontrado na base"
    return "Múltiplo na base"
  }

  function exportarRelatorioExcel() {
    if (!resultados || !stats) {
      toast.info("Execute uma comparação antes de exportar.")
      return
    }
    const pares = paresChave.filter((p) => p.colBase && p.colConsulta)
    const rows = resultados.map((r) => ({
      linha_planilha_consulta: r.linhaConsulta,
      chave: r.chaveExibicao,
      ocorrencias_na_base: r.ocorrenciasNaBase,
      situacao: textoSituacaoRelatorio(r.situacao),
      ocorrencias_na_consulta: r.ocorrenciasNaConsulta,
      duplicata_na_consulta: r.ocorrenciasNaConsulta > 1 ? "Sim" : "Não",
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Resultado_linha_a_linha")

    const metaRows: { campo: string; valor: string | number }[] = [
      { campo: "Emitido em", valor: new Date().toLocaleString("pt-BR") },
      { campo: "Arquivo base", valor: baseNomeArquivo || "—" },
      { campo: "Aba base", valor: abaBase || "—" },
      { campo: "Linhas de dados (base)", valor: rowsBase.length },
      { campo: "Arquivo consulta", valor: consultaNomeArquivo || "—" },
      { campo: "Aba consulta", valor: abaConsulta || "—" },
      { campo: "Linhas de dados (consulta)", valor: rowsConsulta.length },
      { campo: "Ignorar maiúsculas/minúsculas", valor: ignorarMaiusculas ? "Sim" : "Não" },
      { campo: "Normalizar como CPF", valor: normalizarCpf ? "Sim" : "Não" },
      { campo: "---", valor: "---" },
      { campo: "Pares de colunas (base → consulta)", valor: pares.map((p) => `${p.colBase} → ${p.colConsulta}`).join(" | ") },
      { campo: "---", valor: "---" },
      { campo: "Encontrados (linhas da consulta)", valor: stats.encontrados },
      { campo: "Não encontrados", valor: stats.naoEncontrados },
      { campo: "Linhas com múltiplo na base", valor: stats.multiplosBase },
      { campo: "Chaves distintas duplicadas na base", valor: stats.dupBase },
      { campo: "Chaves distintas duplicadas na consulta", valor: stats.dupConsulta },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaRows), "Resumo_e_fontes")

    const dupB = detalheDupBase.map((d) => ({
      chave: d.chaveLegivel,
      quantidade_de_linhas: d.ocorrencias,
      linhas_no_arquivo: d.linhasPlanilha.join(", "),
    }))
    XLSX.utils.book_append_sheet(
      wb,
      dupB.length ? XLSX.utils.json_to_sheet(dupB) : XLSX.utils.json_to_sheet([{ mensagem: "Nenhuma chave duplicada na base" }]),
      "Duplicatas_na_base"
    )

    const dupC = detalheDupConsulta.map((d) => ({
      chave: d.chaveLegivel,
      quantidade_de_linhas: d.ocorrencias,
      linhas_no_arquivo: d.linhasPlanilha.join(", "),
    }))
    XLSX.utils.book_append_sheet(
      wb,
      dupC.length ? XLSX.utils.json_to_sheet(dupC) : XLSX.utils.json_to_sheet([{ mensagem: "Nenhuma chave duplicada na consulta" }]),
      "Duplicatas_na_consulta"
    )

    XLSX.writeFile(wb, `comparacao-planilhas-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Relatório Excel exportado.")
  }

  async function exportarRelatorioPdf() {
    if (!resultados || !stats) {
      toast.info("Execute uma comparação antes de exportar.")
      return
    }
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margem = 8
      const W = 297 - margem * 2
      let y = 12
      const rowH = 5.5
      const pares = paresChave.filter((p) => p.colBase && p.colConsulta)

      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text("Relatório — Comparação de planilhas", margem, y)
      y += 7
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, margem, y)
      y += 5

      doc.setTextColor(30, 41, 59)
      doc.setFontSize(9)
      doc.text("Fontes utilizadas", margem, y)
      y += 4
      doc.setFontSize(8)
      const fontes = [
        `Base: ${baseNomeArquivo || "—"} | Aba: ${abaBase || "—"} | Linhas: ${rowsBase.length}`,
        `Consulta: ${consultaNomeArquivo || "—"} | Aba: ${abaConsulta || "—"} | Linhas: ${rowsConsulta.length}`,
        `Chave: ${pares.map((p) => `${p.colBase}→${p.colConsulta}`).join(" · ")}`,
        `Opções: ${ignorarMaiusculas ? "ignorar maiúsculas" : "diferenciar maiúsculas"}; ${normalizarCpf ? "CPF normalizado" : "sem normalização de CPF"}`,
      ]
      fontes.forEach((ln) => {
        doc.text(ln.replace(/\s+/g, " ").slice(0, 120), margem, y)
        y += 3.5
      })
      y += 2

      doc.setFontSize(9)
      doc.text("Resumo", margem, y)
      y += 4
      doc.setFontSize(8)
      ;[
        `Encontrados: ${stats.encontrados} | Não encontrados: ${stats.naoEncontrados} | Múltiplo na base (linhas): ${stats.multiplosBase}`,
        `Chaves duplicadas na base: ${stats.dupBase} | Chaves duplicadas na consulta: ${stats.dupConsulta}`,
      ].forEach((ln) => {
        doc.text(ln, margem, y)
        y += 3.5
      })
      y += 4

      function drawTableHeader(cols: string[], colW: number[]) {
        doc.setFillColor(30, 41, 59)
        doc.rect(margem, y, W, rowH, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        let x = margem
        cols.forEach((h, i) => {
          doc.text(h, x + 1.2, y + 3.8)
          x += colW[i]
        })
        y += rowH
        doc.setTextColor(30, 41, 59)
      }

      function tabelaDuplicatas(titulo: string, itens: DetalheDuplicata[]) {
        if (y > 175) {
          doc.addPage()
          y = 10
        }
        doc.setFontSize(10)
        doc.setTextColor(15, 23, 42)
        doc.text(titulo, margem, y)
        y += 5
        if (itens.length === 0) {
          doc.setFontSize(8)
          doc.setTextColor(100, 116, 139)
          doc.text("Nenhuma duplicata nesta planilha.", margem, y)
          y += 8
          return
        }
        const colW = [115, 22, W - 115 - 22]
        drawTableHeader(["Chave", "Qtd linhas", "Nº linhas no arquivo"], colW)
        itens.forEach((d, idx) => {
          if (y > 188) {
            doc.addPage()
            y = 10
            drawTableHeader(["Chave", "Qtd linhas", "Nº linhas no arquivo"], colW)
          }
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252)
            doc.rect(margem, y, W, rowH, "F")
          }
          doc.setFontSize(7)
          let x = margem
          const linhasTxt = d.linhasPlanilha.join(", ")
          doc.text(String(d.chaveLegivel).slice(0, 78), x + 1.2, y + 3.8)
          x += colW[0]
          doc.text(String(d.ocorrencias), x + 1.2, y + 3.8)
          x += colW[1]
          doc.text(linhasTxt.slice(0, 55) + (linhasTxt.length > 55 ? "…" : ""), x + 1.2, y + 3.8)
          y += rowH
        })
        y += 4
      }

      tabelaDuplicatas("Detalhamento — chaves duplicadas na BASE", detalheDupBase)
      tabelaDuplicatas("Detalhamento — chaves duplicadas na CONSULTA", detalheDupConsulta)

      if (y > 150) {
        doc.addPage()
        y = 10
      }
      doc.setFontSize(10)
      doc.text("Resultado linha a linha (planilha de consulta)", margem, y)
      y += 5
      const colW2 = [18, 135, 26, 50, 52]
      drawTableHeader(["Linha", "Chave", "Na base", "Situação", "Dup cons."], colW2)
      resultados.forEach((r, idx) => {
        if (y > 188) {
          doc.addPage()
          y = 10
          drawTableHeader(["Linha", "Chave", "Na base", "Situação", "Dup cons."], colW2)
        }
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margem, y, W, rowH, "F")
        }
        doc.setFontSize(6.5)
        let x = margem
        doc.text(String(r.linhaConsulta), x + 1.2, y + 3.8)
        x += colW2[0]
        doc.text(String(r.chaveExibicao).replace(/\s+/g, " ").slice(0, 62), x + 1.2, y + 3.8)
        x += colW2[1]
        doc.text(String(r.ocorrenciasNaBase), x + 1.2, y + 3.8)
        x += colW2[2]
        doc.text(textoSituacaoRelatorio(r.situacao).slice(0, 22), x + 1.2, y + 3.8)
        x += colW2[3]
        doc.text(r.ocorrenciasNaConsulta > 1 ? `${r.ocorrenciasNaConsulta}×` : "—", x + 1.2, y + 3.8)
        y += rowH
      })

      doc.save(`comparacao-planilhas-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success("Relatório PDF exportado.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF")
    }
  }

  function badgeSituacao(s: LinhaResultado["situacao"]) {
    if (s === "encontrado")
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-emerald-100 text-emerald-900 border-emerald-200">
          Encontrado
        </span>
      )
    if (s === "nao_encontrado")
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-amber-100 text-amber-900 border-amber-200">
          Não encontrado
        </span>
      )
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-violet-100 text-violet-900 border-violet-200">
        Múltiplo na base
      </span>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex items-start gap-3">
          <GitCompare className="h-8 w-8 text-gray-800 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Comparação de planilhas</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base max-w-3xl font-medium">
              Cruze duas planilhas com uma <strong>planilha base</strong> (referência) e uma <strong>planilha de consulta</strong>{" "}
              (o que você quer validar). Monte uma <strong>chave composta</strong> com uma ou mais colunas — equivalente a
              um PROCV com várias colunas. Os relatórios incluem duplicidades internas em cada arquivo e o cruzamento
              linha a linha.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <FileSpreadsheet className="h-5 w-5 text-[#0F172A]" />
              Planilha base
            </CardTitle>
            <CardDescription className="text-gray-600">
              Tabela de referência: aqui o sistema conta quantas vezes cada chave aparece.
            </CardDescription>
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
                    setDetalheDupBase([])
                    setDetalheDupConsulta([])
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

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <FileSpreadsheet className="h-5 w-5 text-[#0F172A]" />
              Planilha de consulta
            </CardTitle>
            <CardDescription className="text-gray-600">
              Cada linha é verificada contra a base: encontrada, ausente ou com várias correspondências na base.
            </CardDescription>
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
                    setDetalheDupBase([])
                    setDetalheDupConsulta([])
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

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Chave de correspondência</CardTitle>
          <CardDescription className="text-gray-600">
            Cada par une uma coluna da <strong>base</strong> à coluna da <strong>consulta</strong>. Os valores são
            normalizados e concatenados (várias colunas = chave composta, estilo PROCV avançado).
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

          <Button type="button" className="bg-[#0F172A] hover:bg-[#1E293B] text-white" onClick={comparar}>
            <GitCompare className="h-4 w-4 mr-2" />
            Comparar planilhas
          </Button>
        </CardContent>
      </Card>

      {stats && resultados && (
        <>
          <Alert variant="warning" className="border-gray-200 bg-white shadow-sm">
            <Info className="h-4 w-4 text-[#0F172A]" />
            <AlertTitle className="text-gray-900">O que cada indicador significa</AlertTitle>
            <AlertDescription className="text-sm text-gray-700 space-y-2 mt-2">
              <p>
                <strong className="text-violet-800">Múltiplo na base</strong> (por linha da consulta): a chave desta
                linha aparece <strong>mais de uma vez na planilha base</strong> — como um PROCV que retornaria várias
                linhas. Use o detalhamento abaixo para ver os números de linha na base.
              </p>
              <p>
                <strong className="text-slate-800">Chaves dup. base</strong>: quantidade de{" "}
                <strong>chaves diferentes</strong> que estão repetidas na base (cada CPF/chave repetido conta uma vez,
                não uma vez por linha extra).
              </p>
              <p>
                <strong className="text-slate-800">Chaves dup. consulta</strong>: o mesmo critério, mas na planilha de
                consulta — útil para achar duplicatas antes do cruzamento.
              </p>
              <p>
                A coluna <strong>Dup. consulta</strong> na tabela mostra quantas vezes a mesma chave aparece na consulta
                (ex.: <code className="text-xs bg-gray-100 px-1 rounded">2×</code>).
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-emerald-900 text-base font-semibold">Encontrados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-900">{stats.encontrados}</p>
                <p className="text-xs text-emerald-800/80 mt-1">Chave única na base</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-amber-900 text-base font-semibold">Não encontrados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-900">{stats.naoEncontrados}</p>
                <p className="text-xs text-amber-800/80 mt-1">Ausente na base</p>
              </CardContent>
            </Card>
            <Card className="border-violet-200 bg-violet-50/40 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-violet-900 text-base font-semibold">Múltiplo na base</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-violet-900">{stats.multiplosBase}</p>
                <p className="text-xs text-violet-800/80 mt-1">Linhas da consulta</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-slate-800 text-base font-semibold">Chaves dup. base</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.dupBase}</p>
                <p className="text-xs text-slate-600 mt-1">Chaves repetidas na base</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-slate-800 text-base font-semibold">Chaves dup. consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.dupConsulta}</p>
                <p className="text-xs text-slate-600 mt-1">Chaves repetidas na consulta</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-gray-900 text-base font-semibold">Linhas consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{resultados.length}</p>
                <p className="text-xs text-gray-600 mt-1">Total analisado</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base">Duplicatas na base</CardTitle>
                <CardDescription className="text-gray-600">
                  Chaves que aparecem em mais de uma linha; coluna “Linhas” = número da linha no Excel (linha 1 = cabeçalho).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detalheDupBase.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Nenhuma chave duplicada na base.</p>
                ) : (
                  <div className="rounded-md border border-gray-100 max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead>Chave</TableHead>
                          <TableHead className="w-20 text-center">Qtd</TableHead>
                          <TableHead className="w-36">Linhas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalheDupBase.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm max-w-[200px] whitespace-normal break-words">{d.chaveLegivel}</TableCell>
                            <TableCell className="text-center font-medium">{d.ocorrencias}</TableCell>
                            <TableCell className="text-xs font-mono text-gray-700">{d.linhasPlanilha.join(", ")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base">Duplicatas na consulta</CardTitle>
                <CardDescription className="text-gray-600">
                  Mesmo critério na planilha de consulta — identifica inconsistências no segundo arquivo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detalheDupConsulta.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Nenhuma chave duplicada na consulta.</p>
                ) : (
                  <div className="rounded-md border border-gray-100 max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead>Chave</TableHead>
                          <TableHead className="w-20 text-center">Qtd</TableHead>
                          <TableHead className="w-36">Linhas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalheDupConsulta.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm max-w-[200px] whitespace-normal break-words">{d.chaveLegivel}</TableCell>
                            <TableCell className="text-center font-medium">{d.ocorrencias}</TableCell>
                            <TableCell className="text-xs font-mono text-gray-700">{d.linhasPlanilha.join(", ")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-gray-900">Resultado por linha (consulta)</CardTitle>
                <CardDescription className="text-gray-600">
                  Relatórios em Excel incluem abas: resultado, resumo/fontes, duplicatas na base e na consulta. O PDF traz o mesmo detalhamento em formato para impressão.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-gray-300" onClick={exportarRelatorioExcel}>
                  <Download className="h-4 w-4 mr-1" />
                  Relatório Excel
                </Button>
                <Button variant="outline" size="sm" className="border-gray-300" onClick={() => void exportarRelatorioPdf()}>
                  <FileText className="h-4 w-4 mr-1" />
                  Relatório PDF
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

              <div className="rounded-md border border-gray-100 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
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
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border border-rose-200 bg-rose-50 text-rose-900">
                                {r.ocorrenciasNaConsulta}×
                              </span>
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
