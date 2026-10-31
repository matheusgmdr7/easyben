"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
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
type ModoVinculo = "arquivo" | "corretor"
const TAMANHO_CHUNK_IMPORTACAO = 150

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

function acharColuna(headers: string[], pred: (normalizado: string) => boolean): string | null {
  return headers.find((h) => pred(normalizarHeader(h))) || null
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

type LinhaEnvio = { nome: string; cpf: string; corretor: string }

type ResultadoApi = {
  linha: number
  cpf: string
  nome_planilha?: string
  beneficiario_nome?: string
  corretor_nome?: string
  corretor_id?: string | null
  grupos?: string
  status: string
  mensagem?: string
  vinculo_chaves?: string[]
}

export default function ImportacaoVinculosCorretorPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([])
  const [carregandoCorretores, setCarregandoCorretores] = useState(false)
  const [modo, setModo] = useState<ModoVinculo>("arquivo")
  const [corretorId, setCorretorId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<LinhaArquivo[]>([])
  const [colNome, setColNome] = useState<string | null>(null)
  const [colCpf, setColCpf] = useState<string | null>(null)
  const [colCorretor, setColCorretor] = useState<string | null>(null)
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
  const [resumo, setResumo] = useState<{ total: number; atualizados: number; erros: number; ignorados: number } | null>(null)
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
    setCarregandoCorretores(true)
    fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(adm.id)}`)
      .then((r) => r.json())
      .then((data) => {
        setCorretores(
          Array.isArray(data) ? data.map((c: { id?: string; nome?: string }) => ({ id: String(c.id), nome: String(c.nome || "") })) : []
        )
      })
      .catch(() => toast.error("Erro ao carregar corretores"))
      .finally(() => setCarregandoCorretores(false))
  }, [])

  const linhasParaEnvio = useMemo((): LinhaEnvio[] => {
    if (!colCpf) return []
    if (modo === "arquivo" && !colCorretor) return []
    const out: LinhaEnvio[] = []
    for (const row of rows) {
      const cpf = normalizarCpfVal(valorCelula(row, colCpf))
      const nome = colNome ? valorCelula(row, colNome) : ""
      const corretor = modo === "arquivo" && colCorretor ? valorCelula(row, colCorretor) : ""
      if (!cpf && !nome && !corretor) continue
      out.push({ nome, cpf, corretor })
    }
    return out
  }, [rows, colNome, colCpf, colCorretor, modo])

  const previewLinhas = linhasParaEnvio.slice(0, 500)
  const podeEnviar = Boolean(colCpf && (modo === "corretor" ? corretorId : colCorretor) && linhasParaEnvio.length > 0)

  function limparResultado() {
    setResultados(null)
    setResumo(null)
    setConflitosPendentes([])
    setDialogConflitosAberto(false)
  }

  async function onFileSelected(f: File | null) {
    if (!f) {
      setFile(null)
      setHeaders([])
      setRows([])
      setColNome(null)
      setColCpf(null)
      setColCorretor(null)
      limparResultado()
      return
    }
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }
    try {
      setLoadingArquivo(true)
      limparResultado()
      const { headers: h, rows: r } = await parseArquivo(f)
      if (!h.length) {
        toast.error("Planilha sem cabeçalhos.")
        return
      }
      setFile(f)
      setHeaders(h)
      setRows(r)
      const cCpf = acharColuna(h, (n) => n === "cpf" || n.includes("cpf"))
      const cCorretor = acharColuna(h, (n) => n.includes("corretor") || n === "vendedor" || n === "consultor")
      const cNome = acharColuna(
        h,
        (n) => !n.includes("corretor") && (n === "nome" || n.startsWith("nome ") || n.includes("beneficiario") || n === "cliente")
      )
      setColCpf(cCpf)
      setColNome(cNome)
      setColCorretor(cCorretor)
      if (!cCpf || (modo === "arquivo" && !cCorretor)) {
        toast.warning(
          !cCpf
            ? "Não detectamos a coluna de CPF. Ajuste o mapeamento abaixo."
            : "Não detectamos a coluna do corretor. Ajuste o mapeamento ou selecione um corretor acima."
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
        { Nome: "Maria Silva", CPF: "00000000000", Corretor: "Nome do corretor cadastrado" },
        { Nome: "João Souza", CPF: "11111111111", Corretor: "Nome do corretor cadastrado" },
      ]
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Vinculos")
      XLSX.writeFile(wb, "template-importacao-vinculos-corretor.xlsx")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar template")
    }
  }

  function conflitoEntreLinhas(lista: ResultadoApi[]): string | null {
    const dono = new Map<string, { corretor: string; linha: number }>()
    for (const item of lista) {
      if (item.status === "erro" || !item.corretor_id) continue
      for (const chave of item.vinculo_chaves || []) {
        const prev = dono.get(chave)
        if (prev && prev.corretor !== item.corretor_id) {
          return `A linha ${prev.linha} e a linha ${item.linha} apontam corretores diferentes para o mesmo cliente.`
        }
        if (!prev) dono.set(chave, { corretor: item.corretor_id, linha: item.linha })
      }
    }
    return null
  }

  async function percorrerLotes(
    modoApi: "validar" | "aplicar",
    tratarExistentes?: "sobrescrever" | "pular"
  ) {
    const chunks: LinhaEnvio[][] = []
    for (let i = 0; i < linhasParaEnvio.length; i += TAMANHO_CHUNK_IMPORTACAO) {
      chunks.push(linhasParaEnvio.slice(i, i + TAMANHO_CHUNK_IMPORTACAO))
    }
    setFaseImportacao(modoApi)
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
      const res = await fetch("/api/administradora/importacao-vinculos-corretor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          modo: modoApi,
          ...(modo === "corretor" && corretorId ? { corretor_id: corretorId } : {}),
          ...(tratarExistentes ? { tratar_existentes: tratarExistentes } : {}),
          linhas: chunk.map((l) => ({ nome: l.nome, cpf: l.cpf, corretor: l.corretor })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Falha na importação")
      const resultadosChunk = Array.isArray(data.resultados) ? (data.resultados as ResultadoApi[]) : []
      const baseLinha = i * TAMANHO_CHUNK_IMPORTACAO
      resultadosTotais.push(...resultadosChunk.map((r) => ({ ...r, linha: Number(r.linha || 0) + baseLinha })))
      atualizadosTotais += Number(data?.resumo?.atualizados || 0)
      errosTotais += Number(data?.resumo?.erros || 0)
      ignoradosTotais += Number(data?.resumo?.ignorados || 0)
      conflitosTotais += Number(data?.resumo?.conflitos || 0)
      processados += chunk.length
      setProgressoImportacao((prev) =>
        prev ? { ...prev, processados, atualizados: atualizadosTotais, erros: errosTotais } : null
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
    if (modo === "corretor" && !corretorId) {
      toast.error("Selecione o corretor para vincular os clientes.")
      return
    }
    if (!colCpf || (modo === "arquivo" && !colCorretor)) {
      toast.error("Defina a coluna de CPF e, se for o caso, a coluna do corretor.")
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
        const divergencia = conflitoEntreLinhas(validacao.resultados)
        if (divergencia) {
          setResultados(validacao.resultados)
          toast.error(divergencia)
          return
        }
        const conflitos = validacao.resultados.filter((r) => r.status === "conflito")
        if (conflitos.length > 0) {
          setConflitosPendentes(conflitos)
          setDialogConflitosAberto(true)
          return
        }
        const temOQueGravar = validacao.resultados.some((r) => r.status === "pronto")
        if (!temOQueGravar) {
          setResultados(validacao.resultados)
          setResumo({
            total: linhasParaEnvio.length,
            atualizados: 0,
            erros: validacao.erros,
            ignorados: validacao.ignorados,
          })
          toast.message("Nenhum vínculo novo para gravar. Veja o resultado de cada linha.")
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
        `Importação concluída: ${aplicado.atualizados} vinculado(s), ${aplicado.ignorados} pulado(s), ${aplicado.erros} erro(s).`
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Importação de vínculo de corretor</h1>
        <p className="mt-1 text-sm text-slate-600">
          Envie uma planilha com <strong>nome</strong>, <strong>CPF</strong> e <strong>nome do corretor</strong>. O
          sistema localiza o cliente pelo CPF e o corretor pelo nome já cadastrado. Se preferir, escolha um corretor
          antes e todos os clientes do arquivo serão vinculados a ele. Quem já tem outro corretor pede confirmação.
        </p>
      </div>

      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">1. Como vincular</CardTitle>
          <CardDescription>
            O corretor da planilha precisa existir no cadastro, com o mesmo nome. A importação não cria corretor novo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={modo}
            onValueChange={(valor: ModoVinculo) => {
              setModo(valor)
              limparResultado()
            }}
            disabled={enviando}
          >
            <SelectTrigger className="h-10 max-w-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arquivo">Usar o nome do corretor de cada linha</SelectItem>
              <SelectItem value="corretor">Escolher um corretor para todos os clientes</SelectItem>
            </SelectContent>
          </Select>

          {modo === "corretor" && (
            <div className="max-w-xl">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Corretor</label>
              <Select
                value={corretorId || undefined}
                onValueChange={(valor) => {
                  setCorretorId(valor)
                  limparResultado()
                }}
                disabled={!administradoraId || carregandoCorretores || enviando}
              >
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder={carregandoCorretores ? "Carregando corretores…" : "Selecione o corretor"} />
                </SelectTrigger>
                <SelectContent>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!carregandoCorretores && corretores.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">Nenhum corretor cadastrado.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">2. Arquivo Excel ou CSV</CardTitle>
          <CardDescription>
            Primeira linha = cabeçalhos. O vínculo vale para o contrato do cliente, titular e dependentes.
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
            <p className="mt-2 text-sm text-slate-600">Arraste o arquivo ou clique para selecionar (.xlsx, .xls, .csv)</p>
            <Input
              id="file-import-vinculos-corretor"
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
            {file && !loadingArquivo && <p className="mt-2 text-xs font-medium text-slate-700">{file.name}</p>}
          </div>

          {headers.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coluna nome</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colNome || ""}
                  onChange={(e) => setColNome(e.target.value || null)}
                >
                  <option value="">Nenhuma</option>
                  {headers.map((h) => (
                    <option key={`nome-${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Coluna do corretor {modo === "arquivo" ? "*" : "(opcional)"}
                </label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={colCorretor || ""}
                  onChange={(e) => setColCorretor(e.target.value || null)}
                  disabled={modo === "corretor"}
                >
                  <option value="">{modo === "corretor" ? "Usa o corretor selecionado" : "Selecione…"}</option>
                  {headers.map((h) => (
                    <option key={`corretor-${h}`} value={h}>
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
                {linhasParaEnvio.length > previewLinhas.length ? ` de ${linhasParaEnvio.length}` : ""} linha
                {linhasParaEnvio.length !== 1 ? "s" : ""})
              </p>
              <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Corretor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewLinhas.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[220px] truncate">{l.nome || "—"}</TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap">{l.cpf ? formatarCPF(l.cpf) : "—"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {modo === "corretor"
                            ? corretores.find((c) => c.id === corretorId)?.nome || "—"
                            : l.corretor || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button className="w-full sm:w-auto" disabled={enviando || !administradoraId || !podeEnviar} onClick={() => void executarImportacao()}>
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {faseImportacao === "validar" ? "Verificando vínculos…" : "Importando…"}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Vincular corretores ({linhasParaEnvio.length})
              </>
            )}
          </Button>

          {enviando && progressoImportacao && (
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  {faseImportacao === "validar" ? "Verificando vínculos atuais" : "Gravando vínculos"} · etapa{" "}
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
                <span className="text-emerald-700">Vinculados: {progressoImportacao.atualizados}</span>
                <span className={cn(progressoImportacao.erros > 0 ? "text-red-700" : "text-slate-600")}>
                  Erros: {progressoImportacao.erros}
                </span>
              </div>
            </div>
          )}

          {resumo && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <strong>Resumo:</strong> {resumo.atualizados} vinculado(s), {resumo.ignorados} pulado(s), {resumo.erros}{" "}
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
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {r.cpf && r.cpf !== "—" ? formatarCPF(r.cpf) : r.cpf}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            r.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-900",
                            (r.status === "ignorado" || r.status === "conflito") && "border-amber-200 bg-amber-50 text-amber-950",
                            r.status === "erro" && "border-red-200 bg-red-50 text-red-900",
                            r.status === "pronto" && "border-sky-200 bg-sky-50 text-sky-900"
                          )}
                        >
                          {r.status === "ok"
                            ? "Vinculado"
                            : r.status === "ignorado"
                              ? "Pulado"
                              : r.status === "conflito"
                                ? "Já vinculado"
                                : r.status === "pronto"
                                  ? "Pronto"
                                  : "Erro"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 min-w-[220px]">
                        {[r.mensagem, r.beneficiario_nome ? `Cliente: ${r.beneficiario_nome}` : ""].filter(Boolean).join(" · ")}
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
              Clientes que já têm corretor
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  {conflitosPendentes.length} cliente(s) já estão vinculados a outro corretor. Substituir grava o
                  corretor da planilha no contrato. Pular mantém o vínculo atual e segue com quem ainda não tem.
                </p>
                <ul className="max-h-48 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 space-y-1.5">
                  {conflitosPendentes.slice(0, 25).map((item) => (
                    <li key={`${item.linha}-${item.cpf}`}>
                      <span className="font-medium">
                        Linha {item.linha}
                        {item.beneficiario_nome || item.nome_planilha ? ` · ${item.beneficiario_nome || item.nome_planilha}` : ""}
                      </span>
                      {item.cpf ? ` · ${formatarCPF(item.cpf)}` : ""}
                      {item.mensagem ? <span className="block text-amber-900">{item.mensagem}</span> : null}
                    </li>
                  ))}
                  {conflitosPendentes.length > 25 && <li>e mais {conflitosPendentes.length - 25} cliente(s).</li>}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button type="button" disabled={enviando} onClick={() => void executarImportacao("sobrescrever")}>
              Substituir e continuar
            </Button>
            <Button type="button" variant="outline" disabled={enviando} onClick={() => void executarImportacao("pular")}>
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
