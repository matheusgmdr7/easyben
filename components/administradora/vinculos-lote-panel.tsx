"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { Progress } from "@/components/ui/progress"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  autoMapColunasFichaVinculos,
  CAMPOS_FICHA_VINCULOS,
  extrairLinhasFichaPlanilha,
  getValorPlanilhaMapeado,
  normalizarCpfPlanilha,
  VINCULOS_FONTE_PLANILHA_ID,
  type LinhaFichaPlanilha,
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
import { ID_MODELO_FICHA_CARTAO_APTI } from "@/lib/vinculos-modelos"

type GrupoItem = { id: string; nome: string; ativo?: boolean | null }

type VidaGrupoItem = {
  id: string
  nome: string
  cpf: string | null
  tipo: string | null
  ativo: boolean
  faltando: string[]
  tem_dependentes?: "sim" | "nao"
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
  modeloId: string
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

type ParteDownloadLote = { nome_arquivo: string; download_url: string }

function baixarArquivoLote(url: string, nome: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = nome
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function aguardar(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

function fatiarIds(ids: string[], tamanho: number): string[][] {
  const lotes: string[][] = []
  for (let indice = 0; indice < ids.length; indice += tamanho) {
    lotes.push(ids.slice(indice, indice + tamanho))
  }
  return lotes
}

type PastaArquivos = {
  getFileHandle: (
    nome: string,
    opcoes?: { create?: boolean }
  ) => Promise<{
    createWritable: () => Promise<{
      write: (dados: Blob) => Promise<void>
      close: () => Promise<void>
    }>
  }>
}

type FilaAutomatica = {
  status: "rodando" | "pausada" | "interrompida" | "concluida" | "erro"
  total: number
  concluidos: number
  loteAtual: number
  totalLotes: number
  mensagem: string
  pastaEscolhida: boolean
}

async function escolherPastaDownloads(): Promise<PastaArquivos | null> {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (opcoes?: { mode?: "readwrite"; id?: string }) => Promise<PastaArquivos>
    }
  ).showDirectoryPicker
  if (!picker) return null
  return picker({ mode: "readwrite", id: "vinculos-fichas" })
}

async function gravarArquivosLote(
  arquivos: Array<{ nome: string; blob: Blob }>,
  pasta: PastaArquivos | null
) {
  for (let indice = 0; indice < arquivos.length; indice++) {
    const arquivo = arquivos[indice]
    if (pasta) {
      const handle = await pasta.getFileHandle(arquivo.nome, { create: true })
      const gravador = await handle.createWritable()
      await gravador.write(arquivo.blob)
      await gravador.close()
      continue
    }
    const url = URL.createObjectURL(arquivo.blob)
    baixarArquivoLote(url, arquivo.nome)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
    if (indice < arquivos.length - 1) await aguardar(700)
  }
}

function aplicarPosGeracaoLote(params: {
  gerados: number
  geradosIds: string[]
  falhas: Array<{ nome: string; motivo: string }>
  partes?: ParteDownloadLote[]
  fonteId: string
  administradoraId: string
  vidas: VidaGrupoItem[]
  setGeradosLocal: (s: Set<string>) => void
  setSelecionados: (s: Set<string>) => void
  setUltimoRelatorio: (r: {
    gerados: number
    falhas: Array<{ nome: string; motivo: string }>
    partes?: ParteDownloadLote[]
  }) => void
  silencioso?: boolean
}) {
  params.setUltimoRelatorio({
    gerados: params.gerados,
    falhas: params.falhas,
    partes: params.partes,
  })

  if (params.geradosIds.length > 0 && params.fonteId) {
    const atualizado = marcarGeradosVinculosLocal(params.administradoraId, params.fonteId, params.geradosIds)
    params.setGeradosLocal(atualizado)
    const restantes = params.vidas.filter((v) => !atualizado.has(v.id))
    const proximos = restantes.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v) => v.id)
    params.setSelecionados(new Set(proximos))
    if (restantes.length > 0 && !params.silencioso) {
      toast.info(
        `${params.geradosIds.length} ficha(s) marcada(s) como geradas. ${proximos.length} pendente(s) pré-selecionado(s) para o próximo lote.`
      )
    }
  }

  if (params.silencioso) return

  if (params.falhas.length > 0) {
    toast.warning(
      `ZIP gerado com ${params.gerados} PDF(s). ${params.falhas.length} beneficiário(s) não incluído(s).`
    )
  } else {
    const partes = params.partes?.length ?? 1
    toast.success(
      partes > 1
        ? `${params.gerados} PDF(s) gerados em ${partes} arquivos ZIP`
        : `${params.gerados} PDF(s) gerados e baixados em ZIP`
    )
  }
}

export function VinculosLotePanel({
  administradoraId,
  modeloId,
  opcionais,
  onOpcionaisChange,
  onAlterarSalario,
  preenchimentoSintetico,
  onPreenchimentoSinteticoChange,
}: Props) {
  const fichaCartao = modeloId === ID_MODELO_FICHA_CARTAO_APTI
  const [grupos, setGrupos] = useState<GrupoItem[]>([])
  const [grupoId, setGrupoId] = useState("")
  const [vidas, setVidas] = useState<VidaGrupoItem[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [carregandoGrupos, setCarregandoGrupos] = useState(true)
  const [carregandoVidas, setCarregandoVidas] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [fila, setFila] = useState<FilaAutomatica | null>(null)
  const filaParar = useRef(false)
  const filaPausar = useRef(false)
  const [geradosLocal, setGeradosLocal] = useState<Set<string>>(new Set())
  const [somentePendentes, setSomentePendentes] = useState(false)
  const [ultimoRelatorio, setUltimoRelatorio] = useState<{
    gerados: number
    falhas: Array<{ nome: string; motivo: string }>
    partes?: ParteDownloadLote[]
  } | null>(null)
  const [modoSelecao, setModoSelecao] = useState<"grupo" | "planilha">("grupo")
  const [planilhaFile, setPlanilhaFile] = useState<File | null>(null)
  const [planilhaHeaders, setPlanilhaHeaders] = useState<string[]>([])
  const [planilhaRows, setPlanilhaRows] = useState<LinhaPlanilhaVinculos[]>([])
  const [mapColPlanilha, setMapColPlanilha] = useState<Record<string, string>>({})
  const [linhasFichaPlanilha, setLinhasFichaPlanilha] = useState<LinhaFichaPlanilha[]>([])
  const [planilhaCarregandoArquivo, setPlanilhaCarregandoArquivo] = useState(false)
  const [planilhaProcessando, setPlanilhaProcessando] = useState(false)

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

  useEffect(() => {
    if (!gerando) return
    const avisarSaida = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
      evento.returnValue = ""
    }
    window.addEventListener("beforeunload", avisarSaida)
    return () => window.removeEventListener("beforeunload", avisarSaida)
  }, [gerando])

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

  function limparPlanilhaCarregada() {
    setPlanilhaFile(null)
    setPlanilhaHeaders([])
    setPlanilhaRows([])
    setMapColPlanilha({})
    setLinhasFichaPlanilha([])
    setVidas([])
    setSelecionados(new Set())
  }

  async function carregarArquivoPlanilha(file: File | null) {
    if (!file) {
      limparPlanilhaCarregada()
      return
    }
    const ok = /\.(xlsx|xls|csv)$/i.test(file.name)
    if (!ok) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }

    try {
      setPlanilhaCarregandoArquivo(true)
      setUltimoRelatorio(null)
      setLinhasFichaPlanilha([])
      setVidas([])
      setSelecionados(new Set())

      const { headers, rows } = await parseArquivoPlanilha(file)
      if (!headers.length || !rows.length) {
        toast.error("Planilha vazia ou sem cabeçalho")
        limparPlanilhaCarregada()
        return
      }

      setPlanilhaFile(file)
      setPlanilhaHeaders(headers)
      setPlanilhaRows(rows)
      setMapColPlanilha(autoMapColunasFichaVinculos(headers))
      toast.success(`${rows.length} linha(s) e ${headers.length} coluna(s) detectadas`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler planilha")
      limparPlanilhaCarregada()
    } finally {
      setPlanilhaCarregandoArquivo(false)
    }
  }

  const previewPlanilha = useMemo(() => {
    return planilhaRows.slice(0, 8).map((row, idx) => {
      const cpf = normalizarCpfPlanilha(getValorPlanilhaMapeado(row, "cpf", mapColPlanilha))
      const entrada: Record<string, string> = {
        linha: String(idx + 2),
        cpf: cpf ? formatarCpf(cpf) : getValorPlanilhaMapeado(row, "cpf", mapColPlanilha) || "—",
      }
      for (const campo of CAMPOS_FICHA_VINCULOS) {
        if (campo.id === "cpf") continue
        entrada[campo.id] = getValorPlanilhaMapeado(row, campo.id, mapColPlanilha) || "—"
      }
      return entrada
    })
  }, [planilhaRows, mapColPlanilha])

  const cpfMapeado = Boolean(mapColPlanilha.cpf?.trim())
  const nomeMapeado = Boolean(mapColPlanilha.nome?.trim())
  const mapeamentoPlanilhaOk = cpfMapeado && nomeMapeado

  function linhasFichaParaVidas(lista: LinhaFichaPlanilha[]): VidaGrupoItem[] {
    return lista.map((item) => ({
      id: item.id,
      nome: item.automaticos.nome,
      cpf: item.automaticos.cpf.replace(/\D/g, ""),
      tipo: null,
      ativo: true,
      faltando: item.faltando,
      tem_dependentes: item.opcionais.possui_dependentes === "sim" ? "sim" : "nao",
    }))
  }

  async function processarPlanilha() {
    if (!planilhaRows.length) {
      toast.error("Carregue uma planilha antes de processar")
      return
    }
    if (!mapeamentoPlanilhaOk) {
      toast.error('Associe as colunas "Nome" e "CPF" para montar as fichas')
      return
    }

    try {
      setPlanilhaProcessando(true)
      setUltimoRelatorio(null)

      const opcionaisLote = {
        data_admissao: opcionais.data_admissao,
        funcao: opcionais.funcao,
        salario: opcionais.salario,
        horario_trabalho: opcionais.horario_trabalho,
        horas_almoco: opcionais.horas_almoco,
        estado_civil: opcionais.estado_civil,
        grau_instrucao: opcionais.grau_instrucao,
        contrato_experiencia: opcionais.contrato_experiencia || undefined,
      }

      const { linhas, ignoradas } = extrairLinhasFichaPlanilha(
        planilhaRows,
        mapColPlanilha,
        opcionaisLote
      )

      if (linhas.length === 0) {
        toast.error("Nenhuma linha válida (nome e CPF obrigatórios em cada linha)")
        return
      }

      setLinhasFichaPlanilha(linhas)
      const lista = linhasFichaParaVidas(linhas)

      const gerados = listarGeradosVinculosLocal(administradoraId, VINCULOS_FONTE_PLANILHA_ID)
      setGeradosLocal(gerados)
      setVidas(lista)

      const pendentes = lista.filter((v) => !gerados.has(v.id))
      const autoSelect = pendentes.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v) => v.id)
      setSelecionados(new Set(autoSelect))

      if (ignoradas > 0) {
        toast.warning(`${linhas.length} linha(s) pronta(s). ${ignoradas} ignorada(s) por nome ou CPF ausente.`)
      } else {
        toast.success(`${linhas.length} beneficiário(s) carregado(s) da planilha`)
      }

      if (lista.length > VINCULOS_LOTE_MAX_PDFS) {
        toast.info(`Selecionados ${autoSelect.length} para o primeiro lote (máx. ${VINCULOS_LOTE_MAX_PDFS}).`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar planilha")
      setLinhasFichaPlanilha([])
      setVidas([])
      setSelecionados(new Set())
    } finally {
      setPlanilhaProcessando(false)
    }
  }

  function baixarModeloPlanilha() {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Nome",
        "CPF",
        "Data de nascimento",
        "Naturalidade",
        "UF nascimento",
        "RG",
        "Órgão emissor",
        "CEP",
        "Logradouro",
        "Número",
        "Bairro",
        "Cidade",
        "UF",
        "Telefone",
        "E-mail",
        "Profissão",
        "Tem dependentes",
      ],
      [
        "MARIA DA SILVA",
        "12345678901",
        "01/01/1990",
        "São Paulo",
        "SP",
        "123456789",
        "SSP/SP",
        "01310100",
        "Av Paulista",
        "1000",
        "Bela Vista",
        "São Paulo",
        "SP",
        "11988887777",
        "maria@exemplo.com",
        "ANALISTA",
        "Sim",
      ],
      ["JOAO SANTOS", "98765432100", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Não"],
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
    limparPlanilhaCarregada()
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

  function validarPreenchimentoAntesDeGerar(ids: string[]): string | null {
    if (!preenchimentoSintetico.ativo || fichaCartao) return null
    const precisaEndereco = vidas.some(
      (v) =>
        ids.includes(v.id) &&
        (v.faltando.includes("endereco") || v.faltando.includes("local_nascimento"))
    )
    if (
      precisaEndereco &&
      (!preenchimentoSintetico.endereco_cidade?.trim() || !preenchimentoSintetico.endereco_uf?.trim())
    ) {
      return "Informe cidade e UF para o preenchimento automático de endereço"
    }
    return null
  }

  async function executarLote(ids: string[]): Promise<{
    gerados: number
    geradosIds: string[]
    falhas: Array<{ nome: string; motivo: string }>
    partes: ParteDownloadLote[]
    arquivos: Array<{ nome: string; blob: Blob }>
  }> {
    const bodyPlanilha =
      modoSelecao === "planilha"
        ? {
            linhas_planilha: linhasFichaPlanilha
              .filter((l) => ids.includes(l.id))
              .map((l) => ({
                linha: l.linha,
                automaticos: l.automaticos,
                opcionais: l.opcionais,
                partesEndereco: l.partesEndereco,
              })),
          }
        : { vida_importada_ids: ids }

    const res = await fetch("/api/administradora/beneficiarios/vinculos/gerar-pdf-lote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        administradora_id: administradoraId,
        modelo_id: modeloId,
        ...bodyPlanilha,
        ...(fichaCartao ? {} : opcionais),
        preenchimento_sintetico: fichaCartao
          ? { ...preenchimentoSintetico, ativo: false }
          : preenchimentoSintetico,
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

      const partes: ParteDownloadLote[] = Array.isArray(data.downloads)
        ? data.downloads.flatMap((item: { download_url?: string; nome_arquivo?: string }) =>
            item?.download_url && item?.nome_arquivo
              ? [{ download_url: item.download_url, nome_arquivo: item.nome_arquivo }]
              : []
          )
        : [{ download_url: data.download_url, nome_arquivo: data.nome_arquivo || "fichas-admissao-lote.zip" }]

      const arquivos: Array<{ nome: string; blob: Blob }> = []
      for (const parte of partes) {
        const resposta = await fetch(parte.download_url)
        if (!resposta.ok) throw new Error(`Não foi possível baixar ${parte.nome_arquivo}`)
        arquivos.push({ nome: parte.nome_arquivo, blob: await resposta.blob() })
      }

      const geradosIds = Array.isArray(data.gerados_ids) ? data.gerados_ids : []
      const falhas = Array.isArray(data.falhas)
        ? data.falhas.map((f: { nome: string; motivo: string }) => ({
            nome: f.nome,
            motivo: f.motivo,
          }))
        : []

      return { gerados: data.gerados ?? geradosIds.length, geradosIds, falhas, partes, arquivos }
    }

    if (!contentType.includes("application/zip")) {
      const data = await res.json().catch(() => ({}))
      throw new Error(extrairMensagemErroLote(data) || "Resposta inesperada ao gerar lote")
    }

    const gerados = Number(res.headers.get("X-Vinculos-Gerados") || 0)
    const nomeArquivo = res.headers.get("X-Vinculos-Nome-Arquivo") || "fichas-admissao-lote.zip"
    const geradosIds = JSON.parse(res.headers.get("X-Vinculos-Gerados-Ids") || "[]") as string[]
    const falhas = JSON.parse(res.headers.get("X-Vinculos-Falhas") || "[]") as Array<{
      nome: string
      motivo: string
    }>
    const blob = await res.blob()
    return {
      gerados,
      geradosIds,
      falhas,
      partes: [],
      arquivos: [{ nome: nomeArquivo, blob }],
    }
  }

  function registrarLoteGerado(params: {
    gerados: number
    geradosIds: string[]
    falhas: Array<{ nome: string; motivo: string }>
    partes?: ParteDownloadLote[]
    silencioso?: boolean
  }) {
    aplicarPosGeracaoLote({
      ...params,
      fonteId,
      administradoraId,
      vidas,
      setGeradosLocal,
      setSelecionados,
      setUltimoRelatorio,
    })
  }

  async function gerarLote() {
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos um beneficiário")
      return
    }
    const erroPreenchimento = validarPreenchimentoAntesDeGerar(Array.from(selecionados))
    if (erroPreenchimento) {
      toast.error(erroPreenchimento)
      return
    }

    try {
      setGerando(true)
      setFila(null)
      setUltimoRelatorio(null)
      const resultado = await executarLote(Array.from(selecionados))
      await gravarArquivosLote(resultado.arquivos, null)
      registrarLoteGerado(resultado)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar lote")
    } finally {
      setGerando(false)
    }
  }

  async function gerarTodosPendentes() {
    const idsPendentes = vidas.filter((v) => !geradosLocal.has(v.id)).map((v) => v.id)
    if (idsPendentes.length === 0) {
      toast.info("Não há fichas pendentes neste grupo ou planilha")
      return
    }
    const erroPreenchimento = validarPreenchimentoAntesDeGerar(idsPendentes)
    if (erroPreenchimento) {
      toast.error(erroPreenchimento)
      return
    }

    let pasta: PastaArquivos | null = null
    try {
      pasta = await escolherPastaDownloads()
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return
      pasta = null
    }
    if (!pasta) {
      toast.info(
        "Sem pasta escolhida, os ZIPs vão para Downloads. Se o navegador pedir, permita vários downloads."
      )
    }

    const lotes = fatiarIds(idsPendentes, VINCULOS_LOTE_MAX_PDFS)
    filaParar.current = false
    filaPausar.current = false
    setGerando(true)
    setUltimoRelatorio(null)
    setFila({
      status: "rodando",
      total: idsPendentes.length,
      concluidos: 0,
      loteAtual: 0,
      totalLotes: lotes.length,
      mensagem: pasta
        ? "Os ZIPs serão gravados na pasta escolhida."
        : "Os ZIPs serão baixados pelo navegador.",
      pastaEscolhida: Boolean(pasta),
    })

    let concluidos = 0
    try {
      for (let indice = 0; indice < lotes.length; indice++) {
        while (filaPausar.current && !filaParar.current) {
          await aguardar(300)
        }
        if (filaParar.current) {
          setFila((atual) =>
            atual
              ? {
                  ...atual,
                  status: "interrompida",
                  concluidos,
                  mensagem: "Interrompido. As fichas já salvas continuam marcadas. Gere de novo para seguir os pendentes.",
                }
              : atual
          )
          toast.info("Fila interrompida. O que já foi salvo permanece marcado como gerado.")
          return
        }

        const idsLote = lotes[indice]
        setFila((atual) =>
          atual
            ? {
                ...atual,
                status: "rodando",
                loteAtual: indice + 1,
                concluidos,
                mensagem: `Gerando lote ${indice + 1} de ${lotes.length} (${idsLote.length} fichas)...`,
              }
            : atual
        )

        const resultado = await executarLote(idsLote)
        const arquivosNumerados = resultado.arquivos.map((arquivo) => ({
          ...arquivo,
          nome: `lote-${String(indice + 1).padStart(3, "0")}-${arquivo.nome}`,
        }))
        try {
          await gravarArquivosLote(arquivosNumerados, pasta)
        } catch (erro) {
          setUltimoRelatorio({
            gerados: resultado.gerados,
            falhas: resultado.falhas,
            partes: resultado.partes,
          })
          throw erro
        }
        registrarLoteGerado({
          gerados: resultado.gerados,
          geradosIds: resultado.geradosIds,
          falhas: resultado.falhas,
          partes: resultado.partes,
          silencioso: true,
        })
        concluidos += resultado.geradosIds.length
        setFila((atual) =>
          atual
            ? {
                ...atual,
                concluidos,
                mensagem: filaPausar.current
                  ? `Lote ${indice + 1} salvo. Fila pausada.`
                  : `Lote ${indice + 1} de ${lotes.length} salvo.`,
              }
            : atual
        )
      }

      setFila((atual) =>
        atual
          ? {
              ...atual,
              status: "concluida",
              concluidos,
              loteAtual: lotes.length,
              mensagem: "Todos os pendentes foram processados.",
            }
          : atual
      )
      toast.success(`${concluidos} ficha(s) geradas em ${lotes.length} lote(s)`)
    } catch (e: unknown) {
      const mensagem = e instanceof Error ? e.message : "Erro ao gerar a fila"
      setFila((atual) =>
        atual
          ? {
              ...atual,
              status: "erro",
              concluidos,
              mensagem: `${mensagem} As fichas já salvas continuam marcadas. Clique de novo para continuar pelos pendentes.`,
            }
          : atual
      )
      toast.error(mensagem)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50/80">
        <AlertDescription className="text-sm text-blue-900 space-y-1">
          <p>
            Cada lote gera até <strong>{VINCULOS_LOTE_MAX_PDFS} fichas</strong>. Em listas grandes, use{" "}
            <strong>Gerar todos os pendentes</strong>: a fila segue sozinha, grava os ZIPs e marca quem já foi
            feito. Se parar ou a página for atualizada, o próximo clique continua só pelos que faltam.
          </p>
          <p className="text-xs text-blue-800">
            Lotes grandes são salvos no Storage. Se o ZIP passar de 40 MB, o download vem em mais de um arquivo.
            A seleção respeita o limite de {VINCULOS_LOTE_MAX_PDFS} por vez.
          </p>
        </AlertDescription>
      </Alert>

      <Tabs
        value={modoSelecao}
        onValueChange={(v) => {
          if (gerando) return
          aoMudarModoSelecao(v as "grupo" | "planilha")
        }}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-lg">
          <TabsTrigger value="grupo">Por grupo</TabsTrigger>
          <TabsTrigger value="planilha">Por planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="grupo" className="mt-4 space-y-4">
          <Alert className="border-blue-200 bg-blue-50/80">
            <AlertDescription className="text-sm text-blue-900">
              Use esta opção quando os beneficiários já estão importados no sistema. Selecione o grupo e gere as
              fichas com os dados do cadastro.
            </AlertDescription>
          </Alert>
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
            <AlertDescription className="text-sm text-slate-700 space-y-2">
              <p>
                Use esta opção para gerar fichas de beneficiários que <strong>não estão no sistema</strong>. Os dados
                vêm diretamente da planilha — não há consulta ao banco de dados.
              </p>
              <p className="text-xs text-slate-600">
                Mapeie pelo menos <strong>Nome</strong> e <strong>CPF</strong> por linha. Demais campos (endereço, RG,
                naturalidade etc.) alimentam o PDF; o preenchimento automático abaixo completa o que faltar.
              </p>
            </AlertDescription>
          </Alert>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-white text-xs font-medium mr-2">
                1
              </span>
              <span className="text-sm font-semibold text-gray-800">Carregar planilha</span>
            </div>
            <div className="p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[12rem]">
                <Label htmlFor="vinculos-planilha">Arquivo (.xlsx, .xls, .csv)</Label>
                <Input
                  id="vinculos-planilha"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="mt-1"
                  disabled={planilhaCarregandoArquivo || planilhaProcessando}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    void carregarArquivoPlanilha(f)
                    e.target.value = ""
                  }}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={baixarModeloPlanilha}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar modelo
              </Button>
              {planilhaFile && (
                <Button type="button" variant="ghost" size="sm" onClick={() => limparPlanilhaCarregada()}>
                  Remover arquivo
                </Button>
              )}
            </div>
            {planilhaCarregandoArquivo && (
              <p className="px-4 pb-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lendo planilha...
              </p>
            )}
            {planilhaFile && !planilhaCarregandoArquivo && (
              <p className="px-4 pb-4 text-xs text-gray-600">
                {planilhaFile.name} — {planilhaRows.length} linha(s), {planilhaHeaders.length} coluna(s)
              </p>
            )}
          </div>

          {planilhaHeaders.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-white text-xs font-medium mr-2">
                  2
                </span>
                <span className="text-sm font-semibold text-gray-800">Mapear colunas</span>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-gray-500">
                  Associe cada coluna do arquivo ao campo correspondente da ficha. Campos com{" "}
                  <span className="text-red-500">*</span> são necessários para processar ou gerar o PDF.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {CAMPOS_FICHA_VINCULOS.map((campo) => (
                    <div key={campo.id} className="border border-gray-200 rounded-md p-3 bg-white">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {campo.label}{" "}
                        {(campo.obrigatorio || campo.obrigatorioPdf) && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      {campo.descricao && (
                        <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">{campo.descricao}</p>
                      )}
                      <Select
                        value={mapColPlanilha[campo.id] || "__nenhum__"}
                        onValueChange={(v) =>
                          setMapColPlanilha((p) => ({ ...p, [campo.id]: v === "__nenhum__" ? "" : v }))
                        }
                      >
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue placeholder="— Não usar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__nenhum__">— Não usar</SelectItem>
                          {planilhaHeaders.map((h, i) => {
                            const val = h === "" || h == null ? `__vazio_${i}` : String(h)
                            return (
                              <SelectItem key={`col-${i}-${val}`} value={val}>
                                {h || "(vazio)"}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {!mapeamentoPlanilhaOk && (
                  <Alert className="border-red-200 bg-red-50/80">
                    <AlertDescription className="text-sm text-red-900">
                      Selecione as colunas <strong>Nome</strong> e <strong>CPF</strong> para continuar.
                    </AlertDescription>
                  </Alert>
                )}

                {previewPlanilha.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Prévia (primeiras linhas)</p>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600">Linha</th>
                            {CAMPOS_FICHA_VINCULOS.filter((c) => mapColPlanilha[c.id]).map((c) => (
                              <th key={c.id} className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {previewPlanilha.map((row) => (
                            <tr key={row.linha}>
                              <td className="px-2 py-1.5 text-gray-500">{row.linha}</td>
                              {CAMPOS_FICHA_VINCULOS.filter((c) => mapColPlanilha[c.id]).map((c) => (
                                <td key={c.id} className="px-2 py-1.5 text-gray-800 max-w-[10rem] truncate">
                                  {row[c.id]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => void processarPlanilha()}
                  disabled={!mapeamentoPlanilhaOk || planilhaProcessando || planilhaCarregandoArquivo}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                >
                  {planilhaProcessando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Montando lista da planilha...
                    </>
                  ) : (
                    "Processar planilha"
                  )}
                </Button>
              </div>
            </div>
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
                ? "Processe a planilha para listar os beneficiários a gerar."
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
                      {fichaCartao ? ` · Tem dependentes: ${v.tem_dependentes === "sim" ? "Sim" : "Não"}` : ""}
                    </p>
                    {v.faltando.length > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Faltando na ficha: {v.faltando.join(", ")}
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
            {comDadosFaltando.length} selecionado(s) têm dados incompletos
            {modoSelecao === "grupo" ? " no cadastro" : " na planilha"}.
            {fichaCartao
              ? " O PDF usa os dados do cadastro ou da planilha."
              : preenchimentoSintetico.ativo
                ? " O preenchimento automático tentará completar endereço, órgão emissor e opcionais vazios."
                : " O PDF será gerado com os campos disponíveis; ative o preenchimento automático abaixo se necessário."}{" "}
            Beneficiários sem nome ou CPF válido serão ignorados no ZIP.
          </AlertDescription>
        </Alert>
      )}

      {!fichaCartao && (
        <>
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
        </>
      )}

      {ultimoRelatorio && (
        <Alert className="border-gray-200">
          <AlertDescription className="text-sm space-y-1">
            <p>
              <strong>{ultimoRelatorio.gerados}</strong> PDF(s)
              {ultimoRelatorio.partes && ultimoRelatorio.partes.length > 1
                ? ` em ${ultimoRelatorio.partes.length} arquivos ZIP.`
                : " no ZIP."}
              {ultimoRelatorio.falhas.length > 0 && (
                <> <strong>{ultimoRelatorio.falhas.length}</strong> não gerado(s):</>
              )}
            </p>
            {ultimoRelatorio.partes && ultimoRelatorio.partes.length > 1 && (
              <div className="space-y-1">
                {ultimoRelatorio.partes.map((parte) => (
                  <p key={parte.nome_arquivo}>
                    <a
                      href={parte.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-700 underline"
                    >
                      {parte.nome_arquivo}
                    </a>
                  </p>
                ))}
              </div>
            )}
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

      <div className="flex flex-wrap gap-2">
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
          {gerando && !fila ? (
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
        <Button
          type="button"
          variant="outline"
          onClick={() => void gerarTodosPendentes()}
          disabled={
            !fonteId ||
            (modoSelecao === "grupo" && !grupoId) ||
            pendentes.length === 0 ||
            gerando ||
            carregandoVidas ||
            planilhaProcessando
          }
        >
          {gerando && fila ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fila em andamento
            </>
          ) : (
            `Gerar todos os pendentes (${pendentes.length})`
          )}
        </Button>
        {fila?.status === "rodando" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                filaPausar.current = true
                setFila((atual) =>
                  atual ? { ...atual, status: "pausada", mensagem: "Pausada depois do lote em andamento." } : atual
                )
              }}
            >
              Pausar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                filaParar.current = true
                filaPausar.current = false
              }}
            >
              Parar
            </Button>
          </>
        )}
        {fila?.status === "pausada" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              filaParar.current = true
              filaPausar.current = false
            }}
          >
            Parar
          </Button>
        )}
        {fila?.status === "pausada" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              filaPausar.current = false
              setFila((atual) => (atual ? { ...atual, status: "rodando", mensagem: "Retomando a fila..." } : atual))
            }}
          >
            Continuar
          </Button>
        )}
      </div>

      {fila && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 space-y-2">
          <p className="text-sm font-medium text-blue-950">
            Lote {fila.loteAtual} de {fila.totalLotes} · {fila.concluidos} de {fila.total} fichas salvas
          </p>
          <Progress value={fila.total > 0 ? Math.round((fila.concluidos / fila.total) * 100) : 0} className="h-2" />
          <p className="text-xs text-blue-800">{fila.mensagem}</p>
          <p className="text-xs text-blue-700">
            {fila.pastaEscolhida
              ? "Mantenha esta página aberta. Cada ZIP entra na pasta escolhida ao fim do lote."
              : "Mantenha esta página aberta. Se o navegador pedir, permita vários downloads."}
            {modoSelecao === "planilha"
              ? " Não troque a planilha até a fila acabar: a marcação usa o número da linha."
              : ""}
          </p>
        </div>
      )}

      {gerando && !fila && <VinculosGeracaoProgresso modo="lote" total={selecionados.size} />}
    </div>
  )
}
