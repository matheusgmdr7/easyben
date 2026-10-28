"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

type LinhaPreview = { nome: string; cpf: string; matricula_saude: string; matricula_odonto: string }

type LinhaEnvio = { nome: string; cpf: string; matricula_saude: string; matricula_odonto: string }

type ResultadoApi = {
  linha: number
  cpf: string
  nome_planilha?: string
  status: string
  mensagem?: string
  destino?: string
  beneficiario_nome?: string
  ja_tinha_saude?: boolean
  ja_tinha_odonto?: boolean
}

export default function ImportacaoMatriculasPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<LinhaArquivo[]>([])
  const [colNome, setColNome] = useState<string | null>(null)
  const [colCpf, setColCpf] = useState<string | null>(null)
  /** Carteirinha saúde (plano médico). */
  const [colMatricula, setColMatricula] = useState<string | null>(null)
  /** Carteirinha odonto — opcional; importação seletiva. */
  const [colMatriculaOdonto, setColMatriculaOdonto] = useState<string | null>(null)
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
  const [resumo, setResumo] = useState<{
    total: number
    atualizados: number
    erros: number
    ignorados: number
  } | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [grupoId, setGrupoId] = useState("")
  const [carregandoGrupos, setCarregandoGrupos] = useState(false)
  const [dialogConflitosAberto, setDialogConflitosAberto] = useState(false)
  const [conflitosPendentes, setConflitosPendentes] = useState<ResultadoApi[]>([])
  const [faseImportacao, setFaseImportacao] = useState<"validar" | "aplicar" | null>(null)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      toast.error("Faça login como administradora.")
      return
    }
    setAdministradoraId(adm.id)
    setCarregandoGrupos(true)
    GruposBeneficiariosService.buscarTodos(adm.id)
      .then(setGrupos)
      .catch(() => toast.error("Erro ao carregar grupos de beneficiários"))
      .finally(() => setCarregandoGrupos(false))
  }, [])

  const previewLinhas = useMemo((): LinhaPreview[] => {
    if (!colCpf || (!colMatricula && !colMatriculaOdonto)) return []
    const out: LinhaPreview[] = []
    for (const row of rows) {
      const cpf = normalizarCpfVal(valorCelula(row, colCpf))
      const matricula_saude = colMatricula ? valorCelula(row, colMatricula) : ""
      const matricula_odonto = colMatriculaOdonto ? valorCelula(row, colMatriculaOdonto) : ""
      const nome = colNome ? valorCelula(row, colNome) : ""
      if (!cpf && !matricula_saude && !matricula_odonto && !nome) continue
      out.push({ nome, cpf, matricula_saude, matricula_odonto })
    }
    return out.slice(0, 500)
  }, [rows, colNome, colCpf, colMatricula, colMatriculaOdonto])

  const linhasParaEnvio = useMemo((): LinhaEnvio[] => {
    if (!colCpf || (!colMatricula && !colMatriculaOdonto)) return []
    const out: LinhaEnvio[] = []
    for (const row of rows) {
      const cpf = normalizarCpfVal(valorCelula(row, colCpf))
      const matricula_saude = colMatricula ? valorCelula(row, colMatricula) : ""
      const matricula_odonto = colMatriculaOdonto ? valorCelula(row, colMatriculaOdonto) : ""
      const nome = colNome ? valorCelula(row, colNome) : ""
      if (!cpf && !matricula_saude && !matricula_odonto && !nome) continue
      out.push({ nome, cpf, matricula_saude, matricula_odonto })
    }
    return out
  }, [rows, colNome, colCpf, colMatricula, colMatriculaOdonto])

  async function onFileSelected(f: File | null) {
    if (!f) {
      setFile(null)
      setHeaders([])
      setRows([])
      setColNome(null)
      setColCpf(null)
      setColMatricula(null)
      setColMatriculaOdonto(null)
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
        "matricula saude",
        "matrícula saúde",
        "carteirinha saude",
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
      const cMatOd = resolverColuna(h, [
        "matricula odonto",
        "matrícula odonto",
        "carteirinha odonto",
        "odonto",
        "matricula odontologica",
      ])

      setColCpf(cCpf)
      setColNome(cNome)
      setColMatricula(cMat)
      setColMatriculaOdonto(cMatOd)

      if (!cCpf || (!cMat && !cMatOd)) {
        toast.warning(
          !cCpf && !cMat && !cMatOd
            ? "Não detectamos colunas de CPF nem de matrícula (saúde/odonto). Selecione manualmente abaixo."
            : !cCpf
              ? "Não detectamos a coluna de CPF. Ajuste o mapeamento abaixo."
              : "Não detectamos coluna de matrícula saúde nem odonto. Mapeie ao menos uma."
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
        { Nome: "Maria Silva", CPF: "00000000000", Matricula_saude: "123456", Matricula_odonto: "OD-001" },
        { Nome: "João Souza", CPF: "11111111111", Matricula_saude: "789012", Matricula_odonto: "" },
      ]
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Matriculas")
      XLSX.writeFile(wb, "template-importacao-matriculas.xlsx")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar template")
    }
  }

  async function percorrerLotes(
    modo: "validar" | "aplicar",
    tratarExistentes?: "sobrescrever" | "pular"
  ): Promise<{
    resultados: ResultadoApi[]
    atualizados: number
    erros: number
    ignorados: number
    conflitos: number
  }> {
    const chunks: LinhaEnvio[][] = []
    for (let i = 0; i < linhasParaEnvio.length; i += TAMANHO_CHUNK_IMPORTACAO) {
      chunks.push(linhasParaEnvio.slice(i, i + TAMANHO_CHUNK_IMPORTACAO))
    }

    setFaseImportacao(modo)
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
    let ignoradosTotais = 0
    let conflitosTotais = 0
    let processados = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      setProgressoImportacao((prev) => (prev ? { ...prev, etapa: i + 1 } : null))
      const res = await fetch("/api/administradora/importacao-matriculas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          grupo_id: grupoId,
          modo,
          ...(tratarExistentes ? { tratar_existentes: tratarExistentes } : {}),
          linhas: chunk.map((l) => ({
            nome: l.nome,
            cpf: l.cpf,
            matricula_saude: l.matricula_saude || undefined,
            matricula_odonto: l.matricula_odonto || undefined,
            ...(l.matricula_saude ? { matricula: l.matricula_saude } : {}),
          })),
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
      atualizadosTotais += Number(data?.resumo?.atualizados || 0)
      errosTotais += Number(data?.resumo?.erros || 0)
      ignoradosTotais += Number(data?.resumo?.ignorados || 0)
      conflitosTotais += Number(data?.resumo?.conflitos || 0)
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

    return {
      resultados: resultadosTotais,
      atualizados: atualizadosTotais,
      erros: errosTotais,
      ignorados: ignoradosTotais,
      conflitos: conflitosTotais,
    }
  }

  async function executarImportacao(tratarExistentes?: "sobrescrever" | "pular") {
    if (!administradoraId) {
      toast.error("Administradora não identificada.")
      return
    }
    if (!grupoId) {
      toast.error("Selecione o grupo de beneficiários antes de importar.")
      return
    }
    if (!colCpf || (!colMatricula && !colMatriculaOdonto)) {
      toast.error("Defina a coluna de CPF e ao menos uma coluna de matrícula (saúde e/ou odonto).")
      return
    }
    if (linhasParaEnvio.length === 0) {
      toast.error("Nenhuma linha com dados para importar.")
      return
    }
    try {
      setEnviando(true)
      setDialogConflitosAberto(false)
      setResultados(null)
      setResumo(null)

      if (!tratarExistentes) {
        const validacao = await percorrerLotes("validar")
        const conflitos = validacao.resultados.filter((r) => r.status === "conflito")
        if (conflitos.length > 0) {
          setConflitosPendentes(conflitos)
          setDialogConflitosAberto(true)
          return
        }
      }

      const aplicado = await percorrerLotes("aplicar", tratarExistentes || "sobrescrever")
      setResultados(aplicado.resultados)
      setResumo({
        total: linhasParaEnvio.length,
        atualizados: aplicado.atualizados,
        erros: aplicado.erros,
        ignorados: aplicado.ignorados,
      })
      toast.success(
        `Importação concluída: ${aplicado.atualizados} atualizado(s), ${aplicado.ignorados} pulado(s), ${aplicado.erros} erro(s).`
      )
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar")
    } finally {
      setEnviando(false)
      setFaseImportacao(null)
      setProgressoImportacao(null)
    }
  }

  return (
    <div className="container max-w-5xl py-6 space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Importação de matrículas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Escolha o grupo, depois envie a planilha com <strong>CPF</strong> e, conforme necessário, colunas de{" "}
          <strong>carteirinha saúde</strong> e/ou <strong>carteirinha odonto</strong>. A busca fica só nas vidas desse
          grupo. Quem já tem matrícula no campo importado pede confirmação antes de substituir.
        </p>
      </div>

      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">1. Grupo de beneficiários</CardTitle>
          <CardDescription>
            As matrículas são localizadas e gravadas apenas nas vidas deste grupo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={grupoId || undefined}
            onValueChange={(valor) => {
              setGrupoId(valor)
              setResultados(null)
              setResumo(null)
              setConflitosPendentes([])
              setDialogConflitosAberto(false)
            }}
            disabled={!administradoraId || carregandoGrupos || enviando}
          >
            <SelectTrigger className="h-10 max-w-xl">
              <SelectValue placeholder={carregandoGrupos ? "Carregando grupos…" : "Selecione o grupo"} />
            </SelectTrigger>
            <SelectContent>
              {grupos.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!carregandoGrupos && grupos.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">Nenhum grupo ativo encontrado.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">2. Arquivo Excel ou CSV</CardTitle>
          <CardDescription>
            Primeira linha = cabeçalhos. Detecção automática para CPF, matrícula saúde e matrícula odonto (opcional).
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
              !grupoId && "opacity-60",
              drag && grupoId ? "border-sky-400 bg-sky-50/50" : "border-slate-200 bg-slate-50/40"
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              if (!grupoId) {
                toast.error("Selecione o grupo de beneficiários antes de enviar o arquivo.")
                return
              }
              const f = e.dataTransfer.files?.[0]
              if (f) void onFileSelected(f)
            }}
          >
            <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              {grupoId
                ? "Arraste o arquivo ou clique para selecionar (.xlsx, .xls, .csv)"
                : "Selecione o grupo acima para enviar o arquivo."}
            </p>
            <Input
              id="file-import-matriculas"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="mt-4 max-w-xs mx-auto cursor-pointer"
              disabled={loadingArquivo || !administradoraId || !grupoId}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Matrícula saúde *
                </label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colMatricula || ""}
                  onChange={(e) => setColMatricula(e.target.value || null)}
                >
                  <option value="">Nenhuma</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Matrícula odonto (opcional)
                </label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colMatriculaOdonto || ""}
                  onChange={(e) => setColMatriculaOdonto(e.target.value || null)}
                >
                  <option value="">Nenhuma</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
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
                      <TableHead>Saúde</TableHead>
                      <TableHead>Odonto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewLinhas.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{l.nome || "—"}</TableCell>
                        <TableCell className="tabular-nums">{l.cpf ? formatarCPF(l.cpf) : "—"}</TableCell>
                        <TableCell className="font-medium">{l.matricula_saude || "—"}</TableCell>
                        <TableCell className="font-medium">{l.matricula_odonto || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button
            className="w-full sm:w-auto"
            disabled={
              enviando ||
              !administradoraId ||
              !grupoId ||
              !colCpf ||
              (!colMatricula && !colMatriculaOdonto) ||
              linhasParaEnvio.length === 0
            }
            onClick={() => void executarImportacao()}
          >
                {enviando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {faseImportacao === "validar" ? "Verificando matrículas…" : "Importando…"}
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
                <span>
                  {faseImportacao === "validar" ? "Verificando quem já tem matrícula" : "Aplicando matrículas"} · etapa{" "}
                  {progressoImportacao.etapa} de {progressoImportacao.totalEtapas}
                </span>
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
              <strong>Resumo:</strong> {resumo.atualizados} atualizado(s), {resumo.ignorados} pulado(s), {resumo.erros}{" "}
              erro(s), total {resumo.total} linha(s).
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
                            r.status === "ignorado" && "border-amber-200 bg-amber-50 text-amber-950",
                            r.status === "erro" && "border-red-200 bg-red-50 text-red-900"
                          )}
                        >
                          {r.status === "ok" ? "OK" : r.status === "ignorado" ? "Pulado" : "Erro"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {[r.mensagem, r.beneficiario_nome ? `Beneficiário: ${r.beneficiario_nome}` : ""]
                          .filter(Boolean)
                          .join(" · ") || (r.status === "ok" ? "Atualizado" : "")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={dialogConflitosAberto} onOpenChange={setDialogConflitosAberto}>
        <AlertDialogContent className="border-slate-200 bg-white shadow-lg sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-slate-900">
              Beneficiários que já têm matrícula
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  {conflitosPendentes.length} beneficiário(s) deste grupo já possuem matrícula no campo que a planilha
                  vai preencher. Substituir grava o valor da planilha. Pular mantém a matrícula atual e segue para quem
                  ainda não tem.
                </p>
                <ul className="max-h-48 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 space-y-1.5">
                  {conflitosPendentes.slice(0, 25).map((item) => (
                    <li key={`${item.linha}-${item.cpf}`}>
                      <span className="font-medium">
                        Linha {item.linha}
                        {item.beneficiario_nome || item.nome_planilha
                          ? ` · ${item.beneficiario_nome || item.nome_planilha}`
                          : ""}
                      </span>
                      {item.cpf ? ` · ${formatarCPF(item.cpf)}` : ""}
                      {item.mensagem ? <span className="block text-amber-900">{item.mensagem}</span> : null}
                    </li>
                  ))}
                  {conflitosPendentes.length > 25 && (
                    <li>e mais {conflitosPendentes.length - 25} beneficiário(s).</li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button type="button" disabled={enviando} onClick={() => void executarImportacao("sobrescrever")}>
              Substituir e continuar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={enviando}
              onClick={() => void executarImportacao("pular")}
            >
              Pular estes e importar os demais
            </Button>
            <Button type="button" variant="ghost" disabled={enviando} onClick={() => setDialogConflitosAberto(false)}>
              Cancelar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
