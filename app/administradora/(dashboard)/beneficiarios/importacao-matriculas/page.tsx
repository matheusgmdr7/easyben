"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatarCPF } from "@/utils/formatters"

type LinhaArquivo = Record<string, unknown>
/** Chunks menores evitam timeout da função serverless (muitas atualizações por requisição). */
const TAMANHO_CHUNK_IMPORTACAO = 80

function normalizarHeader(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

function parseArquivo(file: File): Promise<{ headers: string[]; rows: LinhaArquivo[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const isCsv = /\.csv$/i.test(file.name)
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) return reject(new Error("Falha ao ler o arquivo"))
        let wb: XLSX.WorkBook
        if (isCsv) {
          const text = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data as ArrayBuffer)
          wb = XLSX.read(text, { type: "string", raw: true })
        } else {
          wb = XLSX.read(data as ArrayBuffer, { type: "array" })
        }
        const sh = wb.SheetNames[0]
        if (!sh) return reject(new Error("Nenhuma planilha encontrada"))
        const ws = wb.Sheets[sh]
        // raw:false preserva o valor formatado exibido na planilha (inclui zeros à esquerda quando formatados).
        const arr: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false })
        if (!arr.length) return resolve({ headers: [], rows: [] })
        const headers = (arr[0] as unknown[]).map((h) => String(h ?? "").trim()).filter((h) => h !== "")
        const rows = arr.slice(1).map((row) => {
          const r = Array.isArray(row) ? row : Object.values(row as object)
          const obj: LinhaArquivo = {}
          headers.forEach((h, i) => {
            obj[h] = r[i] != null ? r[i] : ""
          })
          return obj
        })
        resolve({ headers, rows })
      } catch (err) {
        reject(err)
      }
    }
    if (isCsv) reader.readAsText(file, "UTF-8")
    else reader.readAsArrayBuffer(file)
  })
}

/**
 * Escolhe a coluna do arquivo cujo cabeçalho casa com algum alias (substring ou igual).
 */
function resolverColuna(headers: string[], aliases: string[]): string | null {
  const normHeaders = headers.map((h) => normalizarHeader(h))
  for (const al of aliases) {
    const na = normalizarHeader(al)
    const idx = normHeaders.findIndex(
      (h) => h === na || h.includes(na) || na.includes(h) || (na.length >= 4 && h.replace(/\s/g, "").includes(na.replace(/\s/g, "")))
    )
    if (idx >= 0) return headers[idx]
  }
  return null
}

function valorCelula(row: LinhaArquivo, col: string | null): string {
  if (!col) return ""
  const v = row[col]
  if (v == null) return ""
  return String(v).trim()
}

function normalizarCpfVal(v: unknown): string {
  const dig = String(v ?? "").replace(/\D/g, "")
  if (!dig) return ""
  return dig.slice(-11).padStart(11, "0")
}

type LinhaPreview = { nome: string; cpf: string; matricula: string }

type ResultadoApi = {
  linha: number
  cpf: string
  nome_planilha?: string
  status: string
  mensagem?: string
  destino?: string
  beneficiario_nome?: string
}

export default function ImportacaoMatriculasPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<LinhaArquivo[]>([])
  const [colNome, setColNome] = useState<string | null>(null)
  const [colCpf, setColCpf] = useState<string | null>(null)
  const [colMatricula, setColMatricula] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [loadingArquivo, setLoadingArquivo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [progressoImportacao, setProgressoImportacao] = useState<{
    total: number
    processados: number
    atualizados: number
    erros: number
    etapa: number
    totalEtapas: number
  } | null>(null)
  const [resultados, setResultados] = useState<ResultadoApi[] | null>(null)
  const [resumo, setResumo] = useState<{ total: number; atualizados: number; erros: number } | null>(null)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      toast.error("Faça login como administradora.")
      return
    }
    setAdministradoraId(adm.id)
  }, [])

  const previewLinhas = useMemo((): LinhaPreview[] => {
    if (!colCpf || !colMatricula) return []
    const out: LinhaPreview[] = []
    for (const row of rows) {
      const cpf = normalizarCpfVal(valorCelula(row, colCpf))
      const matricula = valorCelula(row, colMatricula)
      const nome = colNome ? valorCelula(row, colNome) : ""
      if (!cpf && !matricula && !nome) continue
      out.push({ nome, cpf, matricula })
    }
    return out.slice(0, 500)
  }, [rows, colNome, colCpf, colMatricula])

  const linhasParaEnvio = useMemo(() => {
    if (!colCpf || !colMatricula) return []
    const out: { nome: string; cpf: string; matricula: string }[] = []
    for (const row of rows) {
      const cpf = normalizarCpfVal(valorCelula(row, colCpf))
      const matricula = valorCelula(row, colMatricula)
      const nome = colNome ? valorCelula(row, colNome) : ""
      if (!cpf && !matricula && !nome) continue
      out.push({ nome, cpf, matricula })
    }
    return out
  }, [rows, colNome, colCpf, colMatricula])

  async function onFileSelected(f: File | null) {
    if (!f) {
      setFile(null)
      setHeaders([])
      setRows([])
      setColNome(null)
      setColCpf(null)
      setColMatricula(null)
      setResultados(null)
      setResumo(null)
      return
    }
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }
    try {
      setLoadingArquivo(true)
      setResultados(null)
      setResumo(null)
      const { headers: h, rows: r } = await parseArquivo(f)
      if (!h.length) {
        toast.error("Planilha sem cabeçalhos.")
        return
      }
      setFile(f)
      setHeaders(h)
      setRows(r)

      const cCpf = resolverColuna(h, ["cpf", "documento", "cpf beneficiario", "cpf do beneficiario"])
      const cNome = resolverColuna(h, ["nome", "nome completo", "beneficiario", "beneficiário"])
      const cMat = resolverColuna(h, [
        "matricula",
        "matrícula",
        "carteirinha",
        "numero da carteirinha",
        "número da carteirinha",
        "numero carteirinha",
        "matricula beneficiario",
        "codigo",
        "código",
      ])

      setColCpf(cCpf)
      setColNome(cNome)
      setColMatricula(cMat)

      if (!cCpf || !cMat) {
        toast.warning(
          !cCpf && !cMat
            ? "Não detectamos colunas de CPF e matrícula. Selecione manualmente abaixo."
            : !cCpf
              ? "Não detectamos a coluna de CPF. Ajuste o mapeamento abaixo."
              : "Não detectamos a coluna de matrícula. Ajuste o mapeamento abaixo."
        )
      } else {
        toast.success(`Arquivo carregado: ${r.length} linha(s). Confira o mapeamento e a prévia.`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler arquivo")
    } finally {
      setLoadingArquivo(false)
    }
  }

  function baixarTemplate() {
    try {
      const linhas = [
        { Nome: "Maria Silva", CPF: "00000000000", Matricula: "123456" },
        { Nome: "João Souza", CPF: "11111111111", Matricula: "789012" },
      ]
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Matriculas")
      XLSX.writeFile(wb, "template-importacao-matriculas.xlsx")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar template")
    }
  }

  async function executarImportacao() {
    if (!administradoraId) {
      toast.error("Administradora não identificada.")
      return
    }
    if (!colCpf || !colMatricula) {
      toast.error("Defina as colunas de CPF e matrícula.")
      return
    }
    if (linhasParaEnvio.length === 0) {
      toast.error("Nenhuma linha com dados para importar.")
      return
    }
    try {
      setEnviando(true)
      const chunks: Array<{ nome: string; cpf: string; matricula: string }[]> = []
      for (let i = 0; i < linhasParaEnvio.length; i += TAMANHO_CHUNK_IMPORTACAO) {
        chunks.push(linhasParaEnvio.slice(i, i + TAMANHO_CHUNK_IMPORTACAO))
      }

      setProgressoImportacao({
        total: linhasParaEnvio.length,
        processados: 0,
        atualizados: 0,
        erros: 0,
        etapa: 1,
        totalEtapas: chunks.length,
      })

      const resultadosTotais: ResultadoApi[] = []
      let atualizadosTotais = 0
      let errosTotais = 0
      let processados = 0

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setProgressoImportacao((prev) =>
          prev
            ? { ...prev, etapa: i + 1 }
            : null
        )
        const res = await fetch("/api/administradora/importacao-matriculas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            administradora_id: administradoraId,
            linhas: chunk,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Falha na importação")

        const resultadosChunk = Array.isArray(data.resultados) ? (data.resultados as ResultadoApi[]) : []
        const baseLinha = i * TAMANHO_CHUNK_IMPORTACAO
        resultadosTotais.push(
          ...resultadosChunk.map((r) => ({
            ...r,
            linha: Number(r.linha || 0) + baseLinha,
          }))
        )
        const okChunk = Number(data?.resumo?.atualizados || 0)
        const errChunk = Number(data?.resumo?.erros || 0)
        atualizadosTotais += okChunk
        errosTotais += errChunk
        processados += chunk.length
        setProgressoImportacao((prev) =>
          prev
            ? {
                ...prev,
                processados,
                atualizados: atualizadosTotais,
                erros: errosTotais,
              }
            : null
        )
      }

      setResultados(resultadosTotais)
      setResumo({
        total: linhasParaEnvio.length,
        atualizados: atualizadosTotais,
        erros: errosTotais,
      })
      const ok = atualizadosTotais
      const err = errosTotais
      toast.success(`Importação concluída: ${ok} atualizado(s), ${err} erro(s).`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar")
    } finally {
      setEnviando(false)
      setProgressoImportacao(null)
    }
  }

  return (
    <div className="container max-w-5xl py-6 space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Importação de matrículas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Envie uma planilha com <strong>nome</strong>, <strong>CPF</strong> e <strong>matrícula</strong> (número da
          carteirinha). O sistema localiza titular ou dependente pelo CPF na sua administradora e atualiza o contrato,
          como na aba Contrato do beneficiário.
        </p>
      </div>

      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Arquivo Excel ou CSV</CardTitle>
          <CardDescription>
            Primeira linha = cabeçalhos. Colunas aceitas: Nome, CPF, Matricula / Matrícula / Carteirinha (detecção
            automática).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={baixarTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar modelo (.xlsx)
            </Button>
          </div>

          <div
            className={cn(
              "rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
              drag ? "border-sky-400 bg-sky-50/50" : "border-slate-200 bg-slate-50/40"
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              const f = e.dataTransfer.files?.[0]
              if (f) void onFileSelected(f)
            }}
          >
            <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              Arraste o arquivo ou clique para selecionar (.xlsx, .xls, .csv)
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="mt-4 max-w-xs mx-auto cursor-pointer"
              disabled={loadingArquivo || !administradoraId}
              onChange={(e) => void onFileSelected(e.target.files?.[0] || null)}
            />
            {loadingArquivo && (
              <p className="mt-2 text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Lendo arquivo…
              </p>
            )}
            {file && !loadingArquivo && (
              <p className="mt-2 text-xs font-medium text-slate-700">{file.name}</p>
            )}
          </div>

          {headers.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coluna CPF *</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colCpf || ""}
                  onChange={(e) => setColCpf(e.target.value || null)}
                >
                  <option value="">Selecione…</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coluna matrícula *</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colMatricula || ""}
                  onChange={(e) => setColMatricula(e.target.value || null)}
                >
                  <option value="">Selecione…</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coluna nome (opcional)</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colNome || ""}
                  onChange={(e) => setColNome(e.target.value || null)}
                >
                  <option value="">Nenhuma</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {previewLinhas.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-800 mb-2">
                Prévia ({previewLinhas.length}
                {linhasParaEnvio.length > previewLinhas.length
                  ? ` de ${linhasParaEnvio.length}`
                  : ""}{" "}
                linha{linhasParaEnvio.length !== 1 ? "s" : ""})
              </p>
              <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Matrícula</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewLinhas.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{l.nome || "—"}</TableCell>
                        <TableCell className="tabular-nums">{l.cpf ? formatarCPF(l.cpf) : "—"}</TableCell>
                        <TableCell className="font-medium">{l.matricula || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button
            className="w-full sm:w-auto"
            disabled={enviando || !administradoraId || !colCpf || !colMatricula || linhasParaEnvio.length === 0}
            onClick={() => void executarImportacao()}
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Aplicar matrículas ({linhasParaEnvio.length})
              </>
            )}
          </Button>
          {enviando && progressoImportacao && (
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>Etapa {progressoImportacao.etapa} de {progressoImportacao.totalEtapas}</span>
                <span className="tabular-nums">
                  {progressoImportacao.processados}/{progressoImportacao.total}
                </span>
              </div>
              <Progress
                value={
                  progressoImportacao.total > 0
                    ? Math.round((progressoImportacao.processados / progressoImportacao.total) * 100)
                    : 0
                }
                className={`h-2.5 bg-slate-200 [&>div]:bg-slate-800 ${progressoImportacao.processados === 0 ? "animate-pulse" : ""}`}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700">Atualizados: {progressoImportacao.atualizados}</span>
                <span className={cn(progressoImportacao.erros > 0 ? "text-red-700" : "text-slate-600")}>
                  Erros: {progressoImportacao.erros}
                </span>
              </div>
            </div>
          )}

          {resumo && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <strong>Resumo:</strong> {resumo.atualizados} atualizado(s), {resumo.erros} erro(s), total{" "}
              {resumo.total} linha(s).
            </div>
          )}

          {resultados && resultados.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-14">Linha</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.linha}</TableCell>
                      <TableCell className="tabular-nums">{r.cpf && r.cpf !== "—" ? formatarCPF(r.cpf) : r.cpf}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            r.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-900",
                            r.status === "erro" && "border-red-200 bg-red-50 text-red-900"
                          )}
                        >
                          {r.status === "ok" ? "OK" : "Erro"}
                        </Badge>
                        {r.destino ? (
                          <span className="ml-2 text-xs text-slate-500">
                            {r.destino === "vida_importada" ? "Vida importada" : "Cliente / proposta"}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {r.mensagem ||
                          (r.beneficiario_nome ? `Atualizado: ${r.beneficiario_nome}` : "Atualizado")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
