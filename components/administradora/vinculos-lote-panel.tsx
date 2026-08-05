"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  detectarColunasPlanilhaVinculos,
  normalizarLinhasPlanilhaVinculos,
  VINCULOS_FONTE_PLANILHA_ID,
  type LinhaPlanilhaVinculos,
} from "@/lib/vinculos-planilha"
import { VINCULOS_LOTE_MAX_PDFS } from "@/lib/vinculos-constants"
import {
  limparGeradosVinculosLocal,
  listarGeradosVinculosLocal,
  marcarGeradosVinculosLocal,
} from "@/lib/vinculos-gerados-local"
import { VinculosGeracaoProgresso } from "@/components/administradora/vinculos-geracao-progresso"
import { VinculosPreenchimentoForm } from "@/components/administradora/vinculos-preenchimento-form"
import type { ConfigPreenchimentoSintetico } from "@/lib/vinculos-dados-sinteticos"

type GrupoItem = { id: string; nome: string; ativo?: boolean | null }

type VidaGrupoItem = {
  id: string
  nome: string
  cpf: string | null
  tipo: string | null
  ativo: boolean
  faltando: string[]
}

type OpcionaisLote = {
  data_admissao: string
  funcao: string
  salario: string
  horario_trabalho: string
  horas_almoco: string
  estado_civil: string
  grau_instrucao: string
  contrato_experiencia: "" | "sim" | "nao"
}

type Props = {
  administradoraId: string
  opcionais: OpcionaisLote
  onOpcionaisChange: (opcionais: OpcionaisLote) => void
  onAlterarSalario: (e: React.ChangeEvent<HTMLInputElement>) => void
  preenchimentoSintetico: ConfigPreenchimentoSintetico
  onPreenchimentoSinteticoChange: (value: ConfigPreenchimentoSintetico) => void
}

function formatarCpf(cpf: string | null | undefined) {
  const d = String(cpf || "").replace(/\D/g, "")
  if (d.length !== 11) return cpf || "—"
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

function extrairMensagemErroLote(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (typeof p.error === "string" && p.error.trim()) return p.error
  if (typeof p.errorMessage === "string" && p.errorMessage.trim()) return p.errorMessage
  if (typeof p.message === "string" && p.message.trim()) return p.message
  return null
}

function aplicarPosGeracaoLote(params: {
  gerados: number
  geradosIds: string[]
  falhas: Array<{ nome: string; motivo: string }>
  fonteId: string
  administradoraId: string
  vidas: VidaGrupoItem[]
  setGeradosLocal: (s: Set<string>) => void
  setSelecionados: (s: Set<string>) => void
  setUltimoRelatorio: (r: { gerados: number; falhas: Array<{ nome: string; motivo: string }> }) => void
}) {
  params.setUltimoRelatorio({ gerados: params.gerados, falhas: params.falhas })

  if (params.geradosIds.length > 0 && params.fonteId) {
    const atualizado = marcarGeradosVinculosLocal(params.administradoraId, params.fonteId, params.geradosIds)
    params.setGeradosLocal(atualizado)
    const restantes = params.vidas.filter((v) => !atualizado.has(v.id))
    const proximos = restantes.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v) => v.id)
    params.setSelecionados(new Set(proximos))
    if (restantes.length > 0) {
      toast.info(
        `${params.geradosIds.length} ficha(s) marcada(s) como geradas. ${proximos.length} pendente(s) pré-selecionado(s) para o próximo lote.`
      )
    }
  }

  if (params.falhas.length > 0) {
    toast.warning(
      `ZIP gerado com ${params.gerados} PDF(s). ${params.falhas.length} beneficiário(s) não incluído(s).`
    )
  } else {
    toast.success(`${params.gerados} PDF(s) gerados e baixados em ZIP`)
  }
}

export function VinculosLotePanel({
  administradoraId,
  opcionais,
  onOpcionaisChange,
  onAlterarSalario,
  preenchimentoSintetico,
  onPreenchimentoSinteticoChange,
}: Props) {
  const [grupos, setGrupos] = useState<GrupoItem[]>([])
  const [grupoId, setGrupoId] = useState("")
  const [vidas, setVidas] = useState<VidaGrupoItem[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [carregandoGrupos, setCarregandoGrupos] = useState(true)
  const [carregandoVidas, setCarregandoVidas] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [geradosLocal, setGeradosLocal] = useState<Set<string>>(new Set())
  const [somentePendentes, setSomentePendentes] = useState(false)
  const [ultimoRelatorio, setUltimoRelatorio] = useState<{
    gerados: number
    falhas: Array<{ nome: string; motivo: string }>
  } | null>(null)
  const [modoSelecao, setModoSelecao] = useState<"grupo" | "planilha">("grupo")
  const [planilhaProcessando, setPlanilhaProcessando] = useState(false)
  const [naoEncontradosPlanilha, setNaoEncontradosPlanilha] = useState<
    Array<{ linha: number; cpf: string; nome: string }>
  >([])

  const fonteId = modoSelecao === "grupo" ? grupoId : VINCULOS_FONTE_PLANILHA_ID

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        setCarregandoGrupos(true)
        const res = await fetch(
          `/api/administradora/beneficiarios/vinculos/grupos?administradora_id=${encodeURIComponent(administradoraId)}`
        )
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar grupos")
        if (ativo) setGrupos(Array.isArray(data) ? data : [])
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar grupos")
      } finally {
        if (ativo) setCarregandoGrupos(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [administradoraId])

  const carregarVidasGrupo = useCallback(
    async (idGrupo: string) => {
      if (!idGrupo) {
        setVidas([])
        setSelecionados(new Set())
        return
      }
      try {
        setCarregandoVidas(true)
        setUltimoRelatorio(null)
        const params = new URLSearchParams({
          administradora_id: administradoraId,
          grupo_id: idGrupo,
        })
        const res = await fetch(`/api/administradora/beneficiarios/vinculos/grupo-vidas?${params}`)
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar beneficiários")
        const lista = Array.isArray(data) ? data : []
        const gerados = listarGeradosVinculosLocal(administradoraId, idGrupo)
        setGeradosLocal(gerados)
        setVidas(lista)

        const pendentes = lista.filter((v: VidaGrupoItem) => !gerados.has(v.id))
        const autoSelect = pendentes.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v: VidaGrupoItem) => v.id)
        setSelecionados(new Set(autoSelect))

        if (lista.length > VINCULOS_LOTE_MAX_PDFS) {
          toast.info(
            `Grupo com ${lista.length} beneficiários. Selecionados ${autoSelect.length} pendentes (máx. ${VINCULOS_LOTE_MAX_PDFS} por lote).`
          )
        } else if (gerados.size > 0 && autoSelect.length < pendentes.length) {
          toast.info(`${gerados.size} ficha(s) já gerada(s) neste navegador foram ignoradas na seleção.`)
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar beneficiários do grupo")
        setVidas([])
        setSelecionados(new Set())
      } finally {
        setCarregandoVidas(false)
      }
    },
    [administradoraId]
  )

  useEffect(() => {
    if (modoSelecao === "grupo" && grupoId) void carregarVidasGrupo(grupoId)
  }, [grupoId, carregarVidasGrupo, modoSelecao])

  function parseArquivoPlanilha(file: File): Promise<{ headers: string[]; rows: LinhaPlanilhaVinculos[] }> {
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
            const obj: LinhaPlanilhaVinculos = {}
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
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo"))
      if (isCsv) reader.readAsText(file, "UTF-8")
      else reader.readAsArrayBuffer(file)
    })
  }

  async function processarPlanilha(file: File) {
    try {
      setPlanilhaProcessando(true)
      setUltimoRelatorio(null)
      setNaoEncontradosPlanilha([])

      const { headers, rows } = await parseArquivoPlanilha(file)
      if (!headers.length || !rows.length) {
        toast.error("Planilha vazia ou sem cabeçalho")
        return
      }

      const { colNome, colCpf } = detectarColunasPlanilhaVinculos(headers)
      if (!colCpf) {
        toast.error('Coluna "CPF" não encontrada. Use o modelo ou cabeçalhos como CPF / Nome.')
        return
      }

      const linhas = normalizarLinhasPlanilhaVinculos(rows, colNome, colCpf)
      if (linhas.length === 0) {
        toast.error("Nenhuma linha com CPF válido na planilha")
        return
      }

      const res = await fetch("/api/administradora/beneficiarios/vinculos/planilha-vidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ administradora_id: administradoraId, linhas }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao cruzar planilha com cadastro")

      const lista = Array.isArray(data.vidas) ? data.vidas : []
      const naoEnc = Array.isArray(data.nao_encontrados) ? data.nao_encontrados : []
      setNaoEncontradosPlanilha(naoEnc)

      const gerados = listarGeradosVinculosLocal(administradoraId, VINCULOS_FONTE_PLANILHA_ID)
      setGeradosLocal(gerados)
      setVidas(lista)

      const pendentes = lista.filter((v: VidaGrupoItem) => !gerados.has(v.id))
      const autoSelect = pendentes.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v: VidaGrupoItem) => v.id)
      setSelecionados(new Set(autoSelect))

      if (naoEnc.length > 0) {
        toast.warning(
          `${lista.length} encontrado(s) no cadastro, ${naoEnc.length} CPF(s) não localizado(s) em vidas importadas.`
        )
      } else {
        toast.success(`${lista.length} beneficiário(s) identificado(s) na planilha`)
      }

      if (lista.length > VINCULOS_LOTE_MAX_PDFS) {
        toast.info(`Selecionados ${autoSelect.length} para o primeiro lote (máx. ${VINCULOS_LOTE_MAX_PDFS}).`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar planilha")
      setVidas([])
      setSelecionados(new Set())
    } finally {
      setPlanilhaProcessando(false)
    }
  }

  function baixarModeloPlanilha() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "CPF"],
      ["MARIA DA SILVA", "12345678901"],
      ["JOAO SANTOS", "98765432100"],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Beneficiarios")
    XLSX.writeFile(wb, "modelo-vinculos-fichas.xlsx")
  }

  function aoMudarModoSelecao(modo: "grupo" | "planilha") {
    setModoSelecao(modo)
    setVidas([])
    setSelecionados(new Set())
    setUltimoRelatorio(null)
    setNaoEncontradosPlanilha([])
    if (modo === "grupo") {
      setGeradosLocal(grupoId ? listarGeradosVinculosLocal(administradoraId, grupoId) : new Set())
    } else {
      setGeradosLocal(listarGeradosVinculosLocal(administradoraId, VINCULOS_FONTE_PLANILHA_ID))
    }
  }

  const vidasVisiveis = useMemo(() => {
    if (!somentePendentes) return vidas
    return vidas.filter((v) => !geradosLocal.has(v.id))
  }, [vidas, somentePendentes, geradosLocal])

  const pendentes = useMemo(
    () => vidas.filter((v) => !geradosLocal.has(v.id)),
    [vidas, geradosLocal]
  )

  const todosSelecionados =
    vidasVisiveis.length > 0 && vidasVisiveis.every((v) => selecionados.has(v.id))
  const algunsSelecionados = selecionados.size > 0 && !todosSelecionados

  function selecionarIds(ids: string[], aviso?: string) {
    setSelecionados(new Set(ids.slice(0, VINCULOS_LOTE_MAX_PDFS)))
    if (aviso) toast.info(aviso)
  }

  function selecionarPendentes(limite = VINCULOS_LOTE_MAX_PDFS, aviso?: string) {
    const ids = pendentes.slice(0, limite).map((v) => v.id)
    selecionarIds(ids, aviso)
  }

  function alternarTodos(checked: boolean) {
    if (checked) {
      const fonte = somentePendentes ? vidasVisiveis : pendentes.length > 0 ? pendentes : vidas
      const ids = fonte.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v) => v.id)
      selecionarIds(
        ids,
        fonte.length > VINCULOS_LOTE_MAX_PDFS
          ? `Selecionados ${ids.length} (limite por lote)`
          : undefined
      )
    } else {
      setSelecionados(new Set())
    }
  }

  function alternarUm(id: string, checked: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (checked) {
        if (next.size >= VINCULOS_LOTE_MAX_PDFS) {
          toast.error(`Máximo de ${VINCULOS_LOTE_MAX_PDFS} beneficiários por lote`)
          return prev
        }
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const comDadosFaltando = useMemo(
    () => vidas.filter((v) => selecionados.has(v.id) && v.faltando.length > 0),
    [vidas, selecionados]
  )

  function limparMarcacaoGerados() {
    if (!fonteId) return
    limparGeradosVinculosLocal(administradoraId, fonteId)
    setGeradosLocal(new Set())
    toast.success(
      modoSelecao === "grupo"
        ? "Marcação de fichas geradas limpa para este grupo"
        : "Marcação de fichas geradas limpa para esta planilha"
    )
  }

  async function gerarLote() {
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos um beneficiário")
      return
    }

    if (preenchimentoSintetico.ativo) {
      const precisaEndereco = comDadosFaltando.some(
        (v) => v.faltando.includes("endereco") || v.faltando.includes("local_nascimento")
      )
      if (
        precisaEndereco &&
        (!preenchimentoSintetico.endereco_cidade?.trim() || !preenchimentoSintetico.endereco_uf?.trim())
      ) {
        toast.error("Informe cidade e UF para o preenchimento automático de endereço")
        return
      }
    }

    try {
      setGerando(true)
      setUltimoRelatorio(null)
      const res = await fetch("/api/administradora/beneficiarios/vinculos/gerar-pdf-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          vida_importada_ids: Array.from(selecionados),
          ...opcionais,
          preenchimento_sintetico: preenchimentoSintetico,
        }),
      })

      const contentType = res.headers.get("content-type") || ""

      if (!res.ok) {
        let mensagem = "Erro ao gerar lote"
        if (contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({}))
          mensagem = extrairMensagemErroLote(err) || mensagem
        } else {
          const texto = await res.text().catch(() => "")
          try {
            const parsed = texto ? JSON.parse(texto) : null
            mensagem = extrairMensagemErroLote(parsed) || texto.slice(0, 300) || mensagem
          } catch {
            if (texto) mensagem = texto.slice(0, 300)
          }
        }
        throw new Error(mensagem)
      }

      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}))
        if (!data.download_url) {
          throw new Error(extrairMensagemErroLote(data) || "Link de download não retornado")
        }

        const a = document.createElement("a")
        a.href = data.download_url
        a.download = data.nome_arquivo || "fichas-admissao-lote.zip"
        a.target = "_blank"
        a.rel = "noopener noreferrer"
        a.click()

        const geradosIds = Array.isArray(data.gerados_ids) ? data.gerados_ids : []
        const falhas = Array.isArray(data.falhas)
          ? data.falhas.map((f: { nome: string; motivo: string }) => ({
              nome: f.nome,
              motivo: f.motivo,
            }))
          : []

        aplicarPosGeracaoLote({
          gerados: data.gerados ?? 0,
          geradosIds,
          falhas,
          fonteId,
          administradoraId,
          vidas,
          setGeradosLocal,
          setSelecionados,
          setUltimoRelatorio,
        })
        return
      }

      if (!contentType.includes("application/zip")) {
        const data = await res.json().catch(() => ({}))
        throw new Error(extrairMensagemErroLote(data) || "Resposta inesperada ao gerar lote")
      }

      const gerados = Number(res.headers.get("X-Vinculos-Gerados") || 0)
      const nomeArquivo = res.headers.get("X-Vinculos-Nome-Arquivo") || "fichas-admissao-lote.zip"
      const geradosIds = JSON.parse(res.headers.get("X-Vinculos-Gerados-Ids") || "[]") as string[]
      const falhas = JSON.parse(res.headers.get("X-Vinculos-Falhas") || "[]") as Array<{
        vida_importada_id: string
        nome: string
        motivo: string
      }>

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = nomeArquivo
      a.click()
      URL.revokeObjectURL(url)

      aplicarPosGeracaoLote({
        gerados,
        geradosIds,
        falhas: falhas.map((f) => ({ nome: f.nome, motivo: f.motivo })),
        fonteId,
        administradoraId,
        vidas,
        setGeradosLocal,
        setSelecionados,
        setUltimoRelatorio,
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar lote")
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50/80">
        <AlertDescription className="text-sm text-blue-900 space-y-1">
          <p>
            Gere até <strong>{VINCULOS_LOTE_MAX_PDFS} fichas por lote</strong>. Grupos maiores exigem vários
            lotes — o sistema marca no navegador quem já foi gerado e pré-seleciona os próximos pendentes.
          </p>
          <p className="text-xs text-blue-800">
            Lotes com ZIP grande (&gt;3,5 MB) são salvos no Storage com link de download. A seleção respeita o
            limite de {VINCULOS_LOTE_MAX_PDFS} por vez.
          </p>
        </AlertDescription>
      </Alert>

      <Tabs value={modoSelecao} onValueChange={(v) => aoMudarModoSelecao(v as "grupo" | "planilha")}>
        <TabsList className="grid w-full grid-cols-2 max-w-lg">
          <TabsTrigger value="grupo">Por grupo</TabsTrigger>
          <TabsTrigger value="planilha">Por planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="grupo" className="mt-4 space-y-4">
          <div>
            <Label>Grupo de beneficiários</Label>
            <Select
              value={grupoId || "__vazio__"}
              onValueChange={(v) => setGrupoId(v === "__vazio__" ? "" : v)}
              disabled={carregandoGrupos}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={carregandoGrupos ? "Carregando grupos..." : "Selecione o grupo"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__vazio__">Selecione o grupo</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="planilha" className="mt-4 space-y-4">
          <Alert className="border-slate-200 bg-slate-50/80">
            <AlertDescription className="text-sm text-slate-700 space-y-1">
              <p>
                Envie uma planilha Excel ou CSV com colunas <strong>Nome</strong> e <strong>CPF</strong>. Os CPFs
                serão cruzados com beneficiários já importados (<code>vidas importadas</code>) para gerar as fichas.
              </p>
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[12rem]">
              <Label htmlFor="vinculos-planilha">Planilha (.xlsx, .xls, .csv)</Label>
              <Input
                id="vinculos-planilha"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="mt-1"
                disabled={planilhaProcessando}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void processarPlanilha(f)
                  e.target.value = ""
                }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={baixarModeloPlanilha}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Baixar modelo
            </Button>
          </div>
          {planilhaProcessando && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando planilha e cruzando CPFs...
            </p>
          )}
          {naoEncontradosPlanilha.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50/80">
              <AlertDescription className="text-sm text-amber-900">
                <p className="font-medium mb-1">
                  {naoEncontradosPlanilha.length} CPF(s) não encontrado(s) no cadastro importado:
                </p>
                <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto">
                  {naoEncontradosPlanilha.slice(0, 8).map((n) => (
                    <li key={`${n.linha}-${n.cpf}`}>
                      Linha {n.linha}: {n.nome || "—"} — CPF {formatarCpf(n.cpf)}
                    </li>
                  ))}
                  {naoEncontradosPlanilha.length > 8 && (
                    <li>… e mais {naoEncontradosPlanilha.length - 8}</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {fonteId && (modoSelecao === "planilha" || grupoId) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex flex-col gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sel-todos"
                checked={todosSelecionados || (algunsSelecionados ? "indeterminate" : false)}
                onCheckedChange={(c) => alternarTodos(c === true)}
              />
              <label htmlFor="sel-todos" className="text-sm font-medium text-gray-800 cursor-pointer">
                Selecionar até {VINCULOS_LOTE_MAX_PDFS} visíveis ({vidasVisiveis.length})
              </label>
            </div>
            <span className="text-xs text-gray-600">
              {selecionados.size} / {VINCULOS_LOTE_MAX_PDFS} no lote · {pendentes.length} pendentes ·{" "}
              {geradosLocal.size} geradas · {vidas.length} total
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <Checkbox
                id="somente-pendentes"
                checked={somentePendentes}
                onCheckedChange={(c) => setSomentePendentes(c === true)}
              />
              <label htmlFor="somente-pendentes" className="text-xs text-gray-700 cursor-pointer">
                Mostrar só pendentes
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => selecionarPendentes()}
              disabled={pendentes.length === 0}
            >
              Selecionar {Math.min(pendentes.length, VINCULOS_LOTE_MAX_PDFS)} pendentes
            </Button>
            {geradosLocal.size > 0 && (
              <button
                type="button"
                onClick={limparMarcacaoGerados}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Limpar marcação de geradas
              </button>
            )}
          </div>

          {carregandoVidas ? (
            <p className="p-4 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando beneficiários...
            </p>
          ) : vidas.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">
              {modoSelecao === "planilha"
                ? "Envie uma planilha com CPFs para listar os beneficiários."
                : "Nenhum beneficiário ativo neste grupo."}
            </p>
          ) : vidasVisiveis.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Todos os beneficiários visíveis já têm ficha gerada neste navegador.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {vidasVisiveis.map((v) => {
                const jaGerada = geradosLocal.has(v.id)
                return (
                <li key={v.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50/80">
                  <Checkbox
                    checked={selecionados.has(v.id)}
                    onCheckedChange={(c) => alternarUm(v.id, c === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.nome}</p>
                      {jaGerada && (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                          Gerada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {formatarCpf(v.cpf)}
                      {v.tipo ? ` · ${v.tipo}` : ""}
                    </p>
                    {v.faltando.length > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Faltando no cadastro: {v.faltando.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              )})}
            </ul>
          )}
        </div>
      )}

      {comDadosFaltando.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80">
          <AlertDescription className="text-sm text-amber-900">
            {comDadosFaltando.length} selecionado(s) têm dados incompletos no cadastro.
            {preenchimentoSintetico.ativo
              ? " O preenchimento automático tentará completar endereço, órgão emissor e opcionais vazios."
              : " O PDF será gerado com os campos disponíveis; ative o preenchimento automático abaixo se necessário."}{" "}
            Beneficiários sem nome ou CPF válido serão ignorados no ZIP.
          </AlertDescription>
        </Alert>
      )}

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <p className="text-sm font-medium text-gray-900 mb-3">Preenchimento automático (todo o lote)</p>
        <VinculosPreenchimentoForm
          value={preenchimentoSintetico}
          onChange={onPreenchimentoSinteticoChange}
          compact
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Data de admissão (todos)</Label>
          <Input
            type="date"
            value={opcionais.data_admissao}
            onChange={(e) => onOpcionaisChange({ ...opcionais, data_admissao: e.target.value })}
          />
        </div>
        <div>
          <Label>Função (todos)</Label>
          <Input
            value={opcionais.funcao}
            onChange={(e) => onOpcionaisChange({ ...opcionais, funcao: e.target.value })}
          />
        </div>
        <div>
          <Label>Salário (todos)</Label>
          <Input
            inputMode="numeric"
            placeholder="0,00"
            value={opcionais.salario}
            onChange={onAlterarSalario}
          />
        </div>
        <div>
          <Label>Horário de trabalho (todos)</Label>
          <Input
            value={opcionais.horario_trabalho}
            onChange={(e) => onOpcionaisChange({ ...opcionais, horario_trabalho: e.target.value })}
          />
        </div>
        <div>
          <Label>Horas de almoço (todos)</Label>
          <Input
            value={opcionais.horas_almoco}
            onChange={(e) => onOpcionaisChange({ ...opcionais, horas_almoco: e.target.value })}
          />
        </div>
        <div>
          <Label>Estado civil (todos)</Label>
          <Input
            value={opcionais.estado_civil}
            onChange={(e) => onOpcionaisChange({ ...opcionais, estado_civil: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Grau de instrução (todos)</Label>
          <Input
            value={opcionais.grau_instrucao}
            onChange={(e) => onOpcionaisChange({ ...opcionais, grau_instrucao: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Contrato de experiência (todos)</Label>
          <Select
            value={opcionais.contrato_experiencia || "__vazio__"}
            onValueChange={(v) =>
              onOpcionaisChange({
                ...opcionais,
                contrato_experiencia: v === "__vazio__" ? "" : (v as "sim" | "nao"),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Não marcar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__vazio__">Não marcar</SelectItem>
              <SelectItem value="sim">SIM</SelectItem>
              <SelectItem value="nao">NÃO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {ultimoRelatorio && (
        <Alert className="border-gray-200">
          <AlertDescription className="text-sm space-y-1">
            <p>
              <strong>{ultimoRelatorio.gerados}</strong> PDF(s) no ZIP.
              {ultimoRelatorio.falhas.length > 0 && (
                <> <strong>{ultimoRelatorio.falhas.length}</strong> não gerado(s):</>
              )}
            </p>
            {ultimoRelatorio.falhas.slice(0, 5).map((f, i) => (
              <p key={i} className="text-xs text-gray-600">
                {f.nome}: {f.motivo}
              </p>
            ))}
            {ultimoRelatorio.falhas.length > 5 && (
              <p className="text-xs text-gray-500">… e mais {ultimoRelatorio.falhas.length - 5}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={gerarLote}
        disabled={
          !fonteId ||
          (modoSelecao === "grupo" && !grupoId) ||
          selecionados.size === 0 ||
          gerando ||
          carregandoVidas ||
          planilhaProcessando
        }
        className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
      >
        {gerando ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando {selecionados.size} PDF(s)…
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Gerar {selecionados.size || ""} PDF(s) em ZIP
          </>
        )}
      </Button>

      {gerando && <VinculosGeracaoProgresso modo="lote" total={selecionados.size} />}
    </div>
  )
}
