"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatarCEP, formatarTelefone } from "@/utils/formatters"
import * as XLSX from "xlsx"
import { AlertTriangle, Info } from "lucide-react"

const CAMPOS_ALVO = [
  { id: "nome", label: "Nome", obrigatorio: true },
  { id: "cpf", label: "CPF", obrigatorio: true },
  { id: "nome_mae", label: "Nome da mãe", obrigatorio: false },
  { id: "nome_pai", label: "Nome do pai", obrigatorio: false },
  { id: "tipo", label: "Tipo (Titular/Dependente)", obrigatorio: true },
  { id: "data_nascimento", label: "Data de nascimento", obrigatorio: false },
  { id: "idade", label: "Idade", obrigatorio: false },
  { id: "sexo", label: "Sexo", obrigatorio: false },
  { id: "estado_civil", label: "Estado civil", obrigatorio: false },
  { id: "parentesco", label: "Grau de parentesco", obrigatorio: false },
  { id: "cpf_titular", label: "CPF do titular", obrigatorio: false },
  { id: "identidade", label: "RG (Identidade)", obrigatorio: false },
  { id: "cns", label: "CNS", obrigatorio: false },
  { id: "acomodacao", label: "Acomodação (Enfermaria/Apartamento)", obrigatorio: false },
  { id: "cep", label: "CEP", obrigatorio: false },
  { id: "logradouro", label: "Logradouro", obrigatorio: false },
  { id: "numero", label: "Número", obrigatorio: false },
  { id: "complemento", label: "Complemento", obrigatorio: false },
  { id: "bairro", label: "Bairro", obrigatorio: false },
  { id: "cidade", label: "Cidade", obrigatorio: false },
  { id: "estado", label: "Estado (UF)", obrigatorio: false },
  { id: "telefone", label: "Telefone", obrigatorio: false },
  { id: "email", label: "E-mail", obrigatorio: false },
  { id: "observacoes", label: "Observações", obrigatorio: false },
] as const

const TIPO_NORMALIZE: Record<string, string> = {
  titular: "titular", Titular: "titular", T: "titular", t: "titular",
  dependente: "dependente", Dependente: "dependente", D: "dependente", Dep: "dependente",
}

const ACOMODACAO_NORMALIZE: Record<string, string> = {
  enfermaria: "Enfermaria", Enfermaria: "Enfermaria", E: "Enfermaria", enf: "Enfermaria",
  apartamento: "Apartamento", Apartamento: "Apartamento", A: "Apartamento", apt: "Apartamento",
}

const SEXO_OPCOES = [
  { value: "Masculino", label: "Masculino" },
  { value: "Feminino", label: "Feminino" },
]

const ESTADO_CIVIL_OPCOES = [
  { value: "Solteiro(a)", label: "Solteiro(a)" },
  { value: "Casado(a)", label: "Casado(a)" },
  { value: "Divorciado(a)", label: "Divorciado(a)" },
  { value: "Viúvo(a)", label: "Viúvo(a)" },
  { value: "União estável", label: "União estável" },
  { value: "Separado(a)", label: "Separado(a)" },
]

/**
 * Normaliza data de nascimento para yyyy-MM-dd.
 * - Excel serial (número ou string "44927"): converte pela época Excel.
 * - dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy: aceita barras, hífens e pontos (e variantes Unicode).
 * - yyyy-MM-dd: devolve como está.
 * - Barras/hífens alternativos (\\, U+2044, U+2215, etc.) são normalizados para / e -.
 */
function normalizeDataNascimento(val: string | number | null | undefined): string {
  if (val == null || val === "") return ""
  let t = (typeof val === "string" ? val : String(val)).trim()
  const space = t.indexOf(" ")
  if (space > 0) t = t.slice(0, space)
  if (!t) return ""
  const t2 = t.replace(/[\u2044\u2215\\]/g, "/").replace(/[\u2013\u2014\u2212]/g, "-")
  // Excel serial: número ou string de 4–6 dígitos (opcional .dec)
  const serialMatch = /^(\d{4,6})(\.\d+)?$/.exec(t2)
  const n = typeof val === "number" ? Math.floor(Number(val)) : (serialMatch ? parseInt(serialMatch[1], 10) : NaN)
  if (!isNaN(n) && n >= 1 && n <= 50000) {
    const d = new Date((n - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // dd/MM/yyyy
  const m1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t2)
  if (m1) {
    const d = new Date(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // dd-MM-yyyy
  const m2 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t2)
  if (m2) {
    const d = new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // dd.MM.yyyy
  const m3 = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t2)
  if (m3) {
    const d = new Date(parseInt(m3[3], 10), parseInt(m3[2], 10) - 1, parseInt(m3[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // yyyy-MM-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t2)) return t2
  return t
}

function parseArquivo(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const isCsv = /\.csv$/i.test(file.name)
    reader.onload = (e) => {
      try {
        let wb: XLSX.WorkBook
        const data = e.target?.result
        if (!data) {
          reject(new Error("Falha ao ler o arquivo"))
          return
        }
        if (isCsv) {
          const text = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data as ArrayBuffer)
          wb = XLSX.read(text, { type: "string", raw: true })
        } else {
          wb = XLSX.read(data as ArrayBuffer, { type: "array" })
        }
        const sh = wb.SheetNames[0]
        if (!sh) {
          reject(new Error("Nenhuma planilha encontrada"))
          return
        }
        const ws = wb.Sheets[sh]
        const arr: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
        if (!arr.length) {
          resolve({ headers: [], rows: [] })
          return
        }
        const rawHeaders = (arr[0] as unknown[]).map((h) => String(h ?? "").trim())
        const headers = rawHeaders.length ? rawHeaders : arr[0] ? Object.keys(arr[0] as object) : []
        const rows = arr.slice(1).map((row) => {
          const r = Array.isArray(row) ? row : Object.values(row as object)
          const obj: Record<string, unknown> = {}
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

function aplicarMascaraCepParcial(valor: string): string {
  const dig = String(valor || "").replace(/\D/g, "").slice(0, 8)
  if (dig.length <= 5) return dig
  return `${dig.slice(0, 5)}-${dig.slice(5)}`
}

function aplicarMascaraTelefoneParcial(valor: string): string {
  const dig = String(valor || "").replace(/\D/g, "").slice(0, 11)
  if (dig.length <= 2) return dig
  if (dig.length <= 6) return `(${dig.slice(0, 2)}) ${dig.slice(2)}`
  if (dig.length <= 10) return `(${dig.slice(0, 2)}) ${dig.slice(2, 6)}-${dig.slice(6)}`
  return `(${dig.slice(0, 2)}) ${dig.slice(2, 7)}-${dig.slice(7)}`
}

function aplicarMascaraCpfParcial(valor: string): string {
  const dig = String(valor || "").replace(/\D/g, "").slice(0, 11)
  if (dig.length <= 3) return dig
  if (dig.length <= 6) return `${dig.slice(0, 3)}.${dig.slice(3)}`
  if (dig.length <= 9) return `${dig.slice(0, 3)}.${dig.slice(3, 6)}.${dig.slice(6)}`
  return `${dig.slice(0, 3)}.${dig.slice(3, 6)}.${dig.slice(6, 9)}-${dig.slice(9)}`
}

function normalizarCpf(valor: string | number | null | undefined): string {
  const dig = String(valor ?? "").replace(/\D/g, "")
  if (!dig) return ""
  return dig.slice(-11).padStart(11, "0")
}

function formatarCpf(valor: string | number | null | undefined): string {
  const cpf = normalizarCpf(valor)
  if (!cpf) return ""
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
}

function cpfTemBaseValida(valor: string | null | undefined): boolean {
  const dig = String(valor || "").replace(/\D/g, "")
  return dig.length === 10 || dig.length === 11
}

function linhaPreviewEstaVazia(l: LinhaPreview): boolean {
  const valores = [
    l.nome,
    l.cpf,
    l.nome_mae,
    l.nome_pai,
    l.tipo,
    l.data_nascimento,
    l.idade == null ? "" : String(l.idade),
    l.sexo,
    l.estado_civil,
    l.parentesco,
    l.cpf_titular,
    l.identidade,
    l.cns,
    l.acomodacao,
    l.cep,
    l.logradouro,
    l.numero,
    l.complemento,
    l.bairro,
    l.cidade,
    l.estado,
    l.telefone,
    l.email,
    l.observacoes,
  ]
  return valores.every((v) => String(v ?? "").trim() === "")
}

type LinhaPreview = {
  nome: string
  cpf: string
  nome_mae: string
  nome_pai: string
  tipo: string
  data_nascimento: string
  idade: number | null
  sexo: string
  estado_civil: string
  parentesco: string
  cpf_titular: string
  identidade: string
  cns: string
  acomodacao: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  telefone: string
  email: string
  observacoes: string
}

type ContratoImportacao = {
  id: string
  numero?: string
  descricao?: string
  opcoes_dia_vencimento?: string[]
  opcoes_data_vigencia?: string[]
}

type ErrosLinhaPreview = {
  cpf?: string
  cpf_titular?: string
  nome?: string
  idade?: string
}

const CAMPOS_TABELA: (keyof LinhaPreview)[] = [
  "nome", "cpf", "nome_mae", "nome_pai", "tipo", "data_nascimento", "idade", "sexo", "estado_civil",
  "parentesco", "cpf_titular", "identidade", "cns", "acomodacao",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado", "telefone", "email", "observacoes"
]

const LABEL_CAMPO: Record<keyof LinhaPreview, string> = {
  nome: "Nome", cpf: "CPF", nome_mae: "Nome mãe", nome_pai: "Nome pai", tipo: "Tipo", data_nascimento: "Dt. nasc.", idade: "Idade",
  sexo: "Sexo", estado_civil: "Est. civil", parentesco: "Parentesco", cpf_titular: "CPF Tit.", identidade: "RG", cns: "CNS", acomodacao: "Acomod.",
  cep: "CEP", logradouro: "Logradouro", numero: "Nº", complemento: "Compl.", bairro: "Bairro", cidade: "Cidade", estado: "UF",
  telefone: "Telefone", email: "E-mail", observacoes: "Obs.",
}

export default function ImportacaoVidasPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [contratos, setContratos] = useState<ContratoImportacao[]>([])
  const [opcoesContratoSelecionado, setOpcoesContratoSelecionado] = useState<{ dias: string[]; vigencias: string[] }>({
    dias: [],
    vigencias: [],
  })
  const [produtos, setProdutos] = useState<{ id: string; nome?: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [mapCol, setMapCol] = useState<Record<string, string>>({})
  const [grupoId, setGrupoId] = useState("")
  const [contratoId, setContratoId] = useState("")
  const [produtoId, setProdutoId] = useState("")
  const [diaVencimento, setDiaVencimento] = useState("")
  const [dataVigencia, setDataVigencia] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [drag, setDrag] = useState(false)
  /** Ajustes manuais: chave "linha:campo" (ex. "2:nome") → valor editado. Limpo ao trocar arquivo. */
  const [editedOverrides, setEditedOverrides] = useState<Record<string, string | number | null>>({})
  const [editingCell, setEditingCell] = useState<{ i: number; field: keyof LinhaPreview } | null>(null)
  /** Campos adicionais: mapeiam colunas do arquivo para chaves salvas em dados_adicionais (JSONB) */
  const [camposAdicionais, setCamposAdicionais] = useState<{ id: string; label: string; coluna: string }[]>([])
  const [manualOpen, setManualOpen] = useState(false)
  const [incluindoManual, setIncluindoManual] = useState(false)
  const [consultandoCepManual, setConsultandoCepManual] = useState(false)
  const [cpfsAtivosSistema, setCpfsAtivosSistema] = useState<string[]>([])
  const [linhasExcluidasPreview, setLinhasExcluidasPreview] = useState<number[]>([])
  const [manualForm, setManualForm] = useState<Record<string, string>>({
    nome: "",
    cpf: "",
    nome_mae: "",
    nome_pai: "",
    tipo: "titular",
    data_nascimento: "",
    idade: "",
    sexo: "",
    estado_civil: "",
    parentesco: "",
    cpf_titular: "",
    identidade: "",
    orgao_emissor: "",
    cns: "",
    acomodacao: "Enfermaria",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    telefone: "",
    email: "",
    observacoes: "",
  })

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
    if (!administradoraId) {
      setCpfsAtivosSistema([])
      return
    }

    let ativo = true
    fetch(
      `/api/administradora/vidas-importadas?administradora_id=${encodeURIComponent(administradoraId)}&somente_ativos=true`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => {
        if (!ativo) return
        const lista = Array.isArray(data) ? data : []
        const cpfs = Array.from(
          new Set(
            lista
              .map((item: any) => normalizarCpf(item?.cpf))
              .filter((cpf) => cpf.length === 11)
          )
        )
        setCpfsAtivosSistema(cpfs)
      })
      .catch(() => {
        if (!ativo) return
        setCpfsAtivosSistema([])
      })

    return () => {
      ativo = false
    }
  }, [administradoraId])

  // Contratos da administradora (com opções de vencimento/vigência)
  useEffect(() => {
    if (!administradoraId) return
    fetch(`/api/administradora/contratos?administradora_id=${encodeURIComponent(administradoraId)}`)
      .then((r) => r.json())
      .then((d) => setContratos(Array.isArray(d) ? d : []))
      .catch(() => {
        toast.error("Erro ao carregar contratos")
        setContratos([])
      })
  }, [administradoraId])

  useEffect(() => {
    if (!administradoraId || !contratoId) {
      setProdutos([])
      setProdutoId("")
      setOpcoesContratoSelecionado({ dias: [], vigencias: [] })
      return
    }
    fetch(
      `/api/administradora/produtos-contrato?administradora_id=${encodeURIComponent(administradoraId)}&contrato_id=${encodeURIComponent(contratoId)}`
    )
      .then((r) => r.json())
      .then((d) => setProdutos(Array.isArray(d) ? d : []))
      .catch(() => {
        toast.error("Erro ao carregar produtos do contrato")
        setProdutos([])
      })
  }, [administradoraId, contratoId])

  useEffect(() => {
    if (!contratoId) {
      setOpcoesContratoSelecionado({ dias: [], vigencias: [] })
      return
    }

    fetch(`/api/administradora/contrato/${encodeURIComponent(contratoId)}`)
      .then((r) => r.json())
      .then((d) => {
        const dias = Array.isArray(d?.opcoes_dia_vencimento)
          ? d.opcoes_dia_vencimento
              .map((x: unknown) => String(x || "").replace(/\D/g, "").padStart(2, "0").slice(-2))
              .filter(Boolean)
          : []
        const vigencias = Array.isArray(d?.opcoes_data_vigencia)
          ? d.opcoes_data_vigencia.map((x: unknown) => String(x || "").trim()).filter(Boolean)
          : []
        setOpcoesContratoSelecionado({
          dias: Array.from(new Set(dias)).sort((a, b) => Number(a) - Number(b)),
          vigencias: Array.from(new Set(vigencias)),
        })
      })
      .catch(() => setOpcoesContratoSelecionado({ dias: [], vigencias: [] }))
  }, [contratoId])

  useEffect(() => {
    if (!produtoId) return
    const existe = produtos.some((p) => p.id === produtoId)
    if (!existe) setProdutoId("")
  }, [produtos, produtoId])

  useEffect(() => {
    const contrato = contratos.find((c) => c.id === contratoId)
    if (!contrato) {
      setDiaVencimento("")
      setDataVigencia("")
      return
    }
    const diasLista = Array.isArray(contrato.opcoes_dia_vencimento)
      ? contrato.opcoes_dia_vencimento
          .map((x) => String(x || "").replace(/\D/g, "").padStart(2, "0").slice(-2))
          .filter(Boolean)
      : []
    const vigsLista = Array.isArray(contrato.opcoes_data_vigencia)
      ? contrato.opcoes_data_vigencia.map((x) => String(x || "").trim()).filter(Boolean)
      : []

    const dias = Array.from(new Set([...diasLista, ...opcoesContratoSelecionado.dias]))
    const vigs = Array.from(new Set([...vigsLista, ...opcoesContratoSelecionado.vigencias]))
    const vigsComFallback = vigs.length > 0 ? vigs : ["A DEFINIR"]
    const diasComFallback = dias.length > 0 ? dias : ["01", "10"]

    setDiaVencimento((prev) => (prev && diasComFallback.includes(prev) ? prev : (diasComFallback[0] || "")))
    setDataVigencia((prev) => (prev && vigsComFallback.includes(prev) ? prev : (vigsComFallback[0] || "")))
  }, [contratoId, contratos, opcoesContratoSelecionado])

  const onFile = useCallback((f: File | null) => {
    setEditedOverrides({})
    setEditingCell(null)
    setLinhasExcluidasPreview([])
    if (!f) {
      setCamposAdicionais([])
      setFile(null)
      setHeaders([])
      setRows([])
      setMapCol({})
      return
    }
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name)
    if (!ok) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }
    setLoading(true)
    parseArquivo(f)
      .then(({ headers: h, rows: r }) => {
        setFile(f)
        setHeaders(h)
        setRows(r)
        const auto: Record<string, string> = {}
        const low = h.map((x) => x.toLowerCase())
        CAMPOS_ALVO.forEach((c) => {
          const i = low.findIndex((x) => {
            if (x.includes(c.id)) return true
            if (c.id === "nome_mae" && (x.includes("mae") || x.includes("mãe"))) return true
            if (c.id === "nome_pai" && (x.includes("pai"))) return true
            if (c.id === "cpf_titular" && x.includes("titular") && x.includes("cpf")) return true
            if (c.id === "estado" && (x === "uf" || x === "estado")) return true
            return false
          })
          if (i >= 0) auto[c.id] = h[i]
        })
        setMapCol((prev) => ({ ...auto, ...prev }))
        toast.success(`${r.length} linha(s) e ${h.length} coluna(s) detectadas`)
      })
      .catch((e) => {
        toast.error("Erro ao ler arquivo: " + (e?.message || "unknown"))
        setFile(null)
        setHeaders([])
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [])

  const getVal = useCallback((row: Record<string, unknown>, campoId: string, map: Record<string, string>): string => {
    let col = map[campoId]
    if (!col || col === "__nenhum__") return ""
    if (col.startsWith("__vazio_")) col = ""
    const v = row[col]
    if (v == null) return ""
    let s = String(v).trim()
    if (campoId === "tipo") s = TIPO_NORMALIZE[s] || s.toLowerCase()
    if (campoId === "acomodacao") s = ACOMODACAO_NORMALIZE[s] || (s.toLowerCase() === "apartamento" ? "Apartamento" : "Enfermaria")
    return s
  }, [])

  const linhasPreview = useMemo((): LinhaPreview[] => {
    return rows.map((row) => {
      const tipo = (getVal(row, "tipo", mapCol) || "titular").toLowerCase()
      const acomodacaoRaw = getVal(row, "acomodacao", mapCol)
      const acomodacao = ACOMODACAO_NORMALIZE[acomodacaoRaw] || (acomodacaoRaw.toLowerCase() === "apartamento" ? "Apartamento" : "Enfermaria")
      return {
        nome: getVal(row, "nome", mapCol),
        cpf: normalizarCpf(getVal(row, "cpf", mapCol)),
        nome_mae: getVal(row, "nome_mae", mapCol),
        nome_pai: getVal(row, "nome_pai", mapCol),
        tipo: tipo === "dependente" ? "dependente" : "titular",
        data_nascimento: normalizeDataNascimento(getVal(row, "data_nascimento", mapCol)),
        idade: (() => {
          const i = getVal(row, "idade", mapCol)
          if (!i) return null
          const n = parseInt(i, 10)
          return isNaN(n) ? null : n
        })(),
        sexo: getVal(row, "sexo", mapCol),
        estado_civil: getVal(row, "estado_civil", mapCol),
        parentesco: getVal(row, "parentesco", mapCol),
        cpf_titular: tipo === "dependente" ? normalizarCpf(getVal(row, "cpf_titular", mapCol)) : "",
        identidade: getVal(row, "identidade", mapCol),
        cns: getVal(row, "cns", mapCol),
        acomodacao: acomodacao || "Enfermaria",
        cep: (getVal(row, "cep", mapCol) || "").replace(/\D/g, "").slice(0, 9),
        logradouro: getVal(row, "logradouro", mapCol),
        numero: getVal(row, "numero", mapCol),
        complemento: getVal(row, "complemento", mapCol),
        bairro: getVal(row, "bairro", mapCol),
        cidade: getVal(row, "cidade", mapCol),
        estado: getVal(row, "estado", mapCol).slice(0, 2).toUpperCase(),
        telefone: getVal(row, "telefone", mapCol),
        email: getVal(row, "email", mapCol),
        observacoes: getVal(row, "observacoes", mapCol),
      }
    })
  }, [rows, mapCol, getVal])

  /** Dados finais para importar: mapeamento + ajustes manuais. Usado na prévia e no envio. */
  const linhasParaImportar = useMemo((): LinhaPreview[] => {
    return linhasPreview.map((base, i) => {
      const out = { ...base }
      CAMPOS_TABELA.forEach((f) => {
        const k = `${i}:${f}`
        const ov = editedOverrides[k]
        if (ov === undefined) return
        if (f === "idade") {
          out.idade = ov === null || ov === "" || (typeof ov === "string" && !ov.trim()) ? null : (typeof ov === "number" ? ov : parseInt(String(ov), 10))
          if (isNaN(out.idade as number)) out.idade = null
        } else if (f === "cpf" || f === "cpf_titular") {
          out[f] = normalizarCpf(String(ov ?? ""))
        } else if (f === "tipo") {
          const t = TIPO_NORMALIZE[String(ov).trim()] || String(ov).toLowerCase()
          out.tipo = t === "dependente" ? "dependente" : "titular"
        } else if (f === "acomodacao") {
          const a = ACOMODACAO_NORMALIZE[String(ov).trim()] || (String(ov).toLowerCase() === "apartamento" ? "Apartamento" : "Enfermaria")
          out.acomodacao = a || "Enfermaria"
        } else if (f === "data_nascimento") {
          out.data_nascimento = normalizeDataNascimento(String(ov ?? ""))
        } else if (f === "cep") {
          out.cep = String(ov ?? "").replace(/\D/g, "").slice(0, 9)
        } else if (f === "estado") {
          out.estado = String(ov ?? "").slice(0, 2).toUpperCase()
        } else {
          ;(out as Record<string, unknown>)[f] = String(ov ?? "")
        }
      })
      return out
    })
  }, [linhasPreview, editedOverrides])

  const obterValorBrutoComOverride = useCallback(
    (i: number, field: keyof LinhaPreview): string => {
      const k = `${i}:${field}`
      if (editedOverrides[k] !== undefined) return String(editedOverrides[k] ?? "")
      const row = rows[i] || {}
      if (field === "cpf" || field === "cpf_titular") return String(getVal(row, field, mapCol) || "")
      return String((linhasPreview[i]?.[field] as string | number | null | undefined) ?? "")
    },
    [editedOverrides, rows, getVal, mapCol, linhasPreview]
  )

  const obterCpfExibicaoPreview = useCallback(
    (i: number, field: "cpf" | "cpf_titular"): string => {
      const bruto = obterValorBrutoComOverride(i, field)
      const dig = String(bruto || "").replace(/\D/g, "")
      if (!dig) return "-"
      if (dig.length < 11) return aplicarMascaraCpfParcial(dig)
      return formatarCpf(dig)
    },
    [obterValorBrutoComOverride]
  )

  const validacaoPreview = useMemo(() => {
    const porLinha: Record<number, ErrosLinhaPreview> = {}
    const cpfsAtivosSet = new Set(cpfsAtivosSistema)
    const linhasExcluidasSet = new Set(linhasExcluidasPreview)

    const titularesPorCpf = new Map<string, number[]>()
    linhasParaImportar.forEach((l, i) => {
      if (linhasExcluidasSet.has(i)) return
      if (linhaPreviewEstaVazia(l)) return

      const tipo = String(l.tipo || "titular").toLowerCase()
      const cpfBruto = obterValorBrutoComOverride(i, "cpf")
      const cpfDig = String(cpfBruto || "").replace(/\D/g, "")

      if (!String(l.nome || "").trim()) {
        porLinha[i] = { ...(porLinha[i] || {}), nome: "Nome obrigatório" }
      }

      if (!(cpfDig.length === 10 || cpfDig.length === 11)) {
        porLinha[i] = {
          ...(porLinha[i] || {}),
          cpf: `CPF inválido (${cpfDig.length} dígitos). Informe 11 dígitos.`,
        }
      }

      const idadeValida = l.idade != null && Number.isFinite(Number(l.idade)) && Number(l.idade) >= 0 && Number(l.idade) <= 120
      const dataNascValida = /^\d{4}-\d{1,2}-\d{1,2}$/.test(String(l.data_nascimento || ""))
      if (!idadeValida && !dataNascValida) {
        porLinha[i] = {
          ...(porLinha[i] || {}),
          idade: "Informe idade válida ou data de nascimento válida para calcular idade.",
        }
      }

      if (tipo === "dependente") {
        const cpfTitBruto = obterValorBrutoComOverride(i, "cpf_titular")
        const cpfTitDig = String(cpfTitBruto || "").replace(/\D/g, "")
        if (!(cpfTitDig.length === 10 || cpfTitDig.length === 11)) {
          porLinha[i] = {
            ...(porLinha[i] || {}),
            cpf_titular: `CPF do titular inválido (${cpfTitDig.length} dígitos).`,
          }
        }
      }

      if (tipo === "titular" && cpfDig.length >= 10) {
        const cpfNorm = normalizarCpf(cpfDig)
        const lista = titularesPorCpf.get(cpfNorm) || []
        lista.push(i)
        titularesPorCpf.set(cpfNorm, lista)

        if (cpfsAtivosSet.has(cpfNorm)) {
          porLinha[i] = {
            ...(porLinha[i] || {}),
            cpf: "CPF de titular já cadastrado como ativo no sistema.",
          }
        }
      }
    })

    titularesPorCpf.forEach((linhasIdx) => {
      if (linhasIdx.length <= 1) return
      linhasIdx.forEach((idx) => {
        porLinha[idx] = {
          ...(porLinha[idx] || {}),
          cpf: "CPF duplicado entre titulares no arquivo.",
        }
      })
    })

    const linhasComErro = Object.keys(porLinha).length
    const totalErros = Object.values(porLinha).reduce((acc, e) => acc + Object.keys(e).length, 0)

    return { porLinha, linhasComErro, totalErros }
  }, [linhasParaImportar, obterValorBrutoComOverride, cpfsAtivosSistema, linhasExcluidasPreview])

  const linhasAtivasComIndice = useMemo(
    () =>
      linhasParaImportar
        .map((linha, idxOriginal) => ({ linha, idxOriginal }))
        .filter((x) => !linhasExcluidasPreview.includes(x.idxOriginal)),
    [linhasParaImportar, linhasExcluidasPreview]
  )

  const possuiErrosCriticosImportacao = validacaoPreview.linhasComErro > 0

  const saveOverride = useCallback((i: number, field: keyof LinhaPreview, raw: string) => {
    const k = `${i}:${field}`
    if (field === "idade") {
      const v = raw.trim() === "" ? null : (() => { const n = parseInt(raw, 10); return isNaN(n) ? null : n })()
      setEditedOverrides((p) => ({ ...p, [k]: v }))
    } else {
      setEditedOverrides((p) => ({ ...p, [k]: raw }))
    }
    setEditingCell(null)
  }, [])

  const podemImportar =
    administradoraId &&
    grupoId &&
    contratoId &&
    produtoId &&
    diaVencimento &&
    dataVigencia &&
    !possuiErrosCriticosImportacao &&
    linhasAtivasComIndice.length > 0 &&
    linhasAtivasComIndice.some(({ linha }) => (linha.nome || "").trim().length > 0)

  const handleImport = async () => {
    if (!podemImportar || !administradoraId) return
    setImporting(true)
    try {
      const linhasComAdicionais = linhasAtivasComIndice.map(({ linha: l, idxOriginal }) => {
        const dados_adicionais: Record<string, string> = {}
        camposAdicionais.forEach((c) => {
          if (c.label.trim() && c.coluna) {
            const v = String(rows[idxOriginal]?.[c.coluna] ?? "").trim()
            if (v) dados_adicionais[c.label.trim()] = v
          }
        })
        return { ...l, dados_adicionais }
      })
      const res = await fetch("/api/administradora/importacao-vidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          grupo_id: grupoId,
          contrato_id: contratoId,
          produto_id: produtoId || null,
          dia_vencimento: diaVencimento,
          data_vigencia: dataVigencia,
          linhas: linhasComAdicionais,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erro ao importar")
      const msg = json.ignoradas > 0
        ? `Importadas ${json.importadas} vidas (${json.ignoradas} ignoradas por nome vazio).`
        : `Importadas ${json.importadas} vidas.`
      toast.success(msg)
      setFile(null)
      setHeaders([])
      setRows([])
      setMapCol({})
      setEditedOverrides({})
      setEditingCell(null)
      setLinhasExcluidasPreview([])
      setGrupoId("")
      setContratoId("")
      setProdutoId("")
      setDiaVencimento("")
      setDataVigencia("")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (typeof e === "string" ? e : "Erro ao importar")
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const podeIncluirManual =
    !!administradoraId &&
    !!grupoId &&
    !!contratoId &&
    !!produtoId &&
    !!diaVencimento &&
    !!dataVigencia &&
    (manualForm.nome || "").trim().length > 0 &&
    cpfTemBaseValida(manualForm.cpf || "") &&
    ((manualForm.tipo || "titular") !== "dependente" || cpfTemBaseValida(manualForm.cpf_titular || ""))

  const buscarCepManual = async () => {
    const cepDig = (manualForm.cep || "").replace(/\D/g, "")
    if (cepDig.length !== 8) return
    try {
      setConsultandoCepManual(true)
      const res = await fetch(`https://viacep.com.br/ws/${cepDig}/json/`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.erro) throw new Error("CEP não encontrado")
      setManualForm((prev) => ({
        ...prev,
        cep: formatarCEP(cepDig),
        logradouro: data?.logradouro || prev.logradouro,
        bairro: data?.bairro || prev.bairro,
        cidade: data?.localidade || prev.cidade,
        estado: String(data?.uf || prev.estado || "").toUpperCase().slice(0, 2),
      }))
    } catch {
      toast.error("Não foi possível buscar o CEP informado.")
    } finally {
      setConsultandoCepManual(false)
    }
  }

  const handleIncluirManual = async () => {
    if (!administradoraId) {
      toast.error("Administradora não identificada.")
      return
    }
    if (!grupoId || !produtoId) {
      toast.error("Selecione grupo e produto para vincular o beneficiário.")
      return
    }
    const cpfDigitos = normalizarCpf(manualForm.cpf || "")
    if (!cpfTemBaseValida(manualForm.cpf || "") || !cpfDigitos) {
      toast.error("Informe um CPF válido para o beneficiário.")
      return
    }
    if ((manualForm.tipo || "titular") === "dependente") {
      const cpfTit = normalizarCpf(manualForm.cpf_titular || "")
      if (!cpfTemBaseValida(manualForm.cpf_titular || "") || !cpfTit) {
        toast.error("Para dependente, informe o CPF do titular.")
        return
      }
    }

    setIncluindoManual(true)
    try {
      const idadeNum = (manualForm.idade || "").trim() ? Number(manualForm.idade) : null
      const payloadLinha = {
        nome: (manualForm.nome || "").trim(),
        cpf: cpfDigitos,
        nome_mae: (manualForm.nome_mae || "").trim(),
        nome_pai: (manualForm.nome_pai || "").trim(),
        tipo: (manualForm.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular",
        data_nascimento: manualForm.data_nascimento || "",
        idade: idadeNum != null && !isNaN(idadeNum) ? idadeNum : null,
        sexo: (manualForm.sexo || "").trim(),
        estado_civil: (manualForm.estado_civil || "").trim(),
        parentesco: (manualForm.parentesco || "").trim(),
        cpf_titular: normalizarCpf(manualForm.cpf_titular || ""),
        identidade: (manualForm.identidade || "").trim(),
        cns: (manualForm.cns || "").trim(),
        acomodacao: manualForm.acomodacao || "Enfermaria",
        cep: (manualForm.cep || "").replace(/\D/g, "").slice(0, 9),
        logradouro: (manualForm.logradouro || "").trim(),
        numero: (manualForm.numero || "").trim(),
        complemento: (manualForm.complemento || "").trim(),
        bairro: (manualForm.bairro || "").trim(),
        cidade: (manualForm.cidade || "").trim(),
        estado: (manualForm.estado || "").trim().slice(0, 2).toUpperCase(),
        telefone: (manualForm.telefone || "").trim(),
        email: (manualForm.email || "").trim(),
        observacoes: (manualForm.observacoes || "").trim(),
        dados_adicionais: {
          ...(manualForm.orgao_emissor?.trim() ? { orgao_emissor: manualForm.orgao_emissor.trim() } : {}),
        },
      }

      const res = await fetch("/api/administradora/importacao-vidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          grupo_id: grupoId,
          contrato_id: contratoId,
          produto_id: produtoId,
          dia_vencimento: diaVencimento,
          data_vigencia: dataVigencia,
          linhas: [payloadLinha],
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Erro ao incluir beneficiário manualmente")

      toast.success("Beneficiário incluído com sucesso.")
      setManualForm({
        nome: "",
        cpf: "",
        nome_mae: "",
        nome_pai: "",
        tipo: "titular",
        data_nascimento: "",
        idade: "",
        sexo: "",
        estado_civil: "",
        parentesco: "",
        cpf_titular: "",
        identidade: "",
        orgao_emissor: "",
        cns: "",
        acomodacao: "Enfermaria",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        telefone: "",
        email: "",
        observacoes: "",
      })
      setManualOpen(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao incluir beneficiário manualmente"
      toast.error(msg)
    } finally {
      setIncluindoManual(false)
    }
  }

  function baixarTemplateImportacaoVidas() {
    try {
      const linhas = [
        {
          Nome: "NOME DO BENEFICIARIO",
          CPF: "00000000000",
          "Nome da mãe": "",
          "Nome do pai": "",
          "Tipo (Titular/Dependente)": "titular",
          "Data de nascimento": "1990-01-01",
          Idade: 34,
          Sexo: "Masculino",
          "Estado civil": "Solteiro(a)",
          "Grau de parentesco": "",
          "CPF do titular": "",
          "RG (Identidade)": "",
          CNS: "",
          "Acomodação (Enfermaria/Apartamento)": "Enfermaria",
          CEP: "",
          Logradouro: "",
          Número: "",
          Complemento: "",
          Bairro: "",
          Cidade: "",
          "Estado (UF)": "AM",
          Telefone: "",
          "E-mail": "",
          Observações: "",
        },
      ]
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "ImportacaoVidas")
      XLSX.writeFile(wb, "template-importacao-vidas.xlsx")
    } catch (e: any) {
      toast.error("Erro ao gerar template: " + (e?.message || "desconhecido"))
    }
  }

  const contratoSelecionado = contratos.find((c) => c.id === contratoId)
  const diasContratoTela = Array.from(
    new Set([
      ...((Array.isArray(contratoSelecionado?.opcoes_dia_vencimento)
        ? contratoSelecionado?.opcoes_dia_vencimento
            ?.map((x) => String(x || "").replace(/\D/g, "").padStart(2, "0").slice(-2))
            .filter(Boolean)
        : []) as string[]),
      ...(opcoesContratoSelecionado.dias || []),
    ])
  )
  const diasContrato = diasContratoTela.length > 0 ? diasContratoTela : ["01", "10"]
  const usandoFallbackDiaContrato = diasContratoTela.length === 0
  const vigenciasContrato = Array.from(
    new Set([
      ...((Array.isArray(contratoSelecionado?.opcoes_data_vigencia)
        ? contratoSelecionado?.opcoes_data_vigencia?.map((x) => String(x || "").trim()).filter(Boolean)
        : []) as string[]),
      ...(opcoesContratoSelecionado.vigencias || []),
    ])
  )
  const vigenciasContratoComFallback = vigenciasContrato.length > 0 ? vigenciasContrato : ["A DEFINIR"]
  const usandoFallbackVigenciaContrato = vigenciasContrato.length === 0
  const contratoComOpcoesCompletas = !usandoFallbackDiaContrato && !usandoFallbackVigenciaContrato

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Importação de vidas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Envie um arquivo Excel ou CSV, mapeie as colunas, confira a prévia e selecione grupo, produto e dia de vencimento para cadastrar as vidas.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={baixarTemplateImportacaoVidas}>
            Download template Excel
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Inclusão manual de beneficiário</h2>
              <p className="text-xs text-gray-500 mt-0.5">Preencha os mesmos campos da importação e vincule ao grupo/produto.</p>
            </div>
            <Button
              type="button"
              variant={manualOpen ? "outline" : "default"}
              className={manualOpen ? "h-9" : "h-9 bg-gray-700 hover:bg-gray-800 text-white"}
              onClick={() => setManualOpen((v) => !v)}
            >
              {manualOpen ? "Fechar inclusão manual" : "Inclusão manual"}
            </Button>
          </div>
          {manualOpen && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CAMPOS_ALVO.map((campo) => (
                  <div key={`manual-${campo.id}`} className={campo.id === "observacoes" ? "sm:col-span-2 lg:col-span-4" : ""}>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      {campo.label} {(campo.obrigatorio || (campo.id === "cpf_titular" && (manualForm.tipo || "titular") === "dependente")) && <span className="text-red-500">*</span>}
                    </label>
                    {campo.id === "tipo" ? (
                      <Select
                        value={manualForm[campo.id] || "titular"}
                        onValueChange={(v) => setManualForm((p) => ({ ...p, [campo.id]: v }))}
                      >
                        <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="titular">Titular</SelectItem>
                          <SelectItem value="dependente">Dependente</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : campo.id === "sexo" ? (
                      <Select
                        value={manualForm[campo.id] || ""}
                        onValueChange={(v) => setManualForm((p) => ({ ...p, [campo.id]: v }))}
                      >
                        <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEXO_OPCOES.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : campo.id === "estado_civil" ? (
                      <Select
                        value={manualForm[campo.id] || ""}
                        onValueChange={(v) => setManualForm((p) => ({ ...p, [campo.id]: v }))}
                      >
                        <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADO_CIVIL_OPCOES.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : campo.id === "acomodacao" ? (
                      <Select
                        value={manualForm[campo.id] || "Enfermaria"}
                        onValueChange={(v) => setManualForm((p) => ({ ...p, [campo.id]: v }))}
                      >
                        <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                          <SelectItem value="Apartamento">Apartamento</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={manualForm[campo.id] || ""}
                        onChange={(e) => {
                          let v = e.target.value
                          if (campo.id === "estado") v = v.toUpperCase()
                          if (campo.id === "cpf" || campo.id === "cpf_titular") v = aplicarMascaraCpfParcial(v)
                          if (campo.id === "cep") v = aplicarMascaraCepParcial(v)
                          if (campo.id === "telefone") v = aplicarMascaraTelefoneParcial(v)
                          setManualForm((p) => ({ ...p, [campo.id]: v }))
                        }}
                        onBlur={() => {
                          if (campo.id === "cpf" || campo.id === "cpf_titular") {
                            setManualForm((p) => {
                              const cpfNorm = normalizarCpf(p[campo.id] || "")
                              return { ...p, [campo.id]: cpfNorm ? formatarCpf(cpfNorm) : "" }
                            })
                          }
                          if (campo.id === "cep") {
                            buscarCepManual()
                            setManualForm((p) => ({ ...p, cep: formatarCEP(p.cep || "") || p.cep || "" }))
                          }
                          if (campo.id === "telefone") {
                            setManualForm((p) => ({ ...p, telefone: formatarTelefone(p.telefone || "") || p.telefone || "" }))
                          }
                        }}
                        placeholder={campo.id === "cpf_titular" && (manualForm.tipo || "titular") === "dependente" ? "Obrigatório para dependente" : undefined}
                        type={campo.id === "data_nascimento" ? "date" : campo.id === "idade" ? "number" : campo.id === "email" ? "email" : "text"}
                        className="h-10 text-sm border-gray-300 rounded-sm"
                        maxLength={campo.id === "estado" ? 2 : undefined}
                        required={campo.id === "cpf_titular" && (manualForm.tipo || "titular") === "dependente"}
                      />
                    )}
                    {campo.id === "cep" && consultandoCepManual && (
                      <p className="text-[11px] text-gray-500 mt-1">Buscando CEP...</p>
                    )}
                    {campo.id === "identidade" && (
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Órgão emissor</label>
                        <Input
                          value={manualForm.orgao_emissor || ""}
                          onChange={(e) => setManualForm((p) => ({ ...p, orgao_emissor: e.target.value }))}
                          className="h-10 text-sm border-gray-300 rounded-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Vinculação do beneficiário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grupo de clientes <span className="text-red-500">*</span></label>
                    <Select value={grupoId} onValueChange={setGrupoId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {grupos.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contrato <span className="text-red-500">*</span></label>
                    <Select value={contratoId} onValueChange={setContratoId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        {contratos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {(c.numero ? `#${c.numero} - ` : "") + (c.descricao || "Sem descrição")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Produto (planos dos contratos) <span className="text-red-500">*</span></label>
                    <Select value={produtoId} onValueChange={setProdutoId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nome || "-"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dia de vencimento <span className="text-red-500">*</span></label>
                    <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {diasContrato.map((dia) => (
                          <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-700 mt-1.5">
                      Opções conforme cadastro do contrato selecionado.
                    </p>
                    {usandoFallbackDiaContrato && (
                      <p className="text-xs text-orange-600 mt-1">
                        Este contrato ainda não tem dias de vencimento cadastrados; usando fallback 01 e 10.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vigência (referência) <span className="text-red-500">*</span></label>
                    <Select value={dataVigencia} onValueChange={setDataVigencia}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione a vigência" />
                      </SelectTrigger>
                      <SelectContent>
                        {vigenciasContratoComFallback.map((vig) => (
                          <SelectItem key={vig} value={vig}>{vig}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-700 mt-1.5">
                      Aqui é uma referência de vigência do contrato. A data formal é validada na ficha do beneficiário.
                    </p>
                    {usandoFallbackVigenciaContrato && (
                      <p className="text-xs text-orange-600 mt-1">
                        Este contrato ainda não tem vigências de referência cadastradas; usando fallback A DEFINIR.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleIncluirManual}
                  disabled={!podeIncluirManual || incluindoManual}
                  className="h-10 px-5 bg-gray-700 hover:bg-gray-800 text-white"
                >
                  {incluindoManual ? "Incluindo..." : "Salvar inclusão manual"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Step 1: Arquivo */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-white text-sm font-medium mr-2">1</span>
            <h2 className="text-sm font-semibold text-gray-800 inline">Arquivo (Excel ou CSV)</h2>
          </div>
          <div className="p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${drag ? "border-gray-500 bg-gray-50" : "border-gray-300"} ${loading ? "opacity-60 pointer-events-none" : ""}`}
            >
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" id="file-import" onChange={(e) => onFile(e.target.files?.[0] || null)} />
              <label htmlFor="file-import" className="cursor-pointer flex flex-col items-center gap-2">
                <span className="text-2xl text-gray-400" aria-hidden>📄</span>
                <span className="text-sm text-gray-600">Clique ou arraste .xlsx, .xls ou .csv</span>
              </label>
              {file && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button type="button" onClick={() => onFile(null)} className="text-red-500 hover:text-red-700" aria-label="Remover arquivo">×</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {headers.length > 0 && (
          <>
            {/* Step 2: Mapear colunas + Prévia (atualiza imediatamente ao mudar o select) */}
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-white text-sm font-medium mr-2">2</span>
                <h2 className="text-sm font-semibold text-gray-800 inline">Mapear colunas e prévia</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-xs text-gray-500 mb-3">Associe cada coluna do seu arquivo ao campo. A prévia abaixo atualiza em tempo real. Ajuste o mapeamento se precisar corrigir algum valor.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CAMPOS_ALVO.map((c) => (
                      <div key={c.id} className="border border-gray-200 rounded-md p-3 bg-white">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          {c.label} {c.obrigatorio && <span className="text-red-500">*</span>}
                        </label>
                        <Select value={mapCol[c.id] || "__nenhum__"} onValueChange={(v) => setMapCol((p) => ({ ...p, [c.id]: v === "__nenhum__" ? "" : v }))}>
                          <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                            <SelectValue placeholder="— Não usar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__nenhum__">— Não usar</SelectItem>
                            {headers.map((h, i) => {
                              const val = h === "" || h == null ? `__vazio_${i}` : String(h)
                              return <SelectItem key={`col-${i}-${val}`} value={val}>{h || "(vazio)"}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {camposAdicionais.map((campo) => (
                      <div key={campo.id} className="border border-gray-200 rounded-md p-3 bg-white border-dashed">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Campo adicional</label>
                        <Input
                          placeholder="Ex: Matrícula"
                          value={campo.label}
                          onChange={(e) =>
                            setCamposAdicionais((prev) =>
                              prev.map((x) => (x.id === campo.id ? { ...x, label: e.target.value } : x))
                            )
                          }
                          className="h-9 mb-2 text-sm"
                        />
                        <Select
                          value={campo.coluna || "__nenhum__"}
                          onValueChange={(v) =>
                            setCamposAdicionais((prev) =>
                              prev.map((x) => (x.id === campo.id ? { ...x, coluna: v === "__nenhum__" ? "" : v } : x))
                            )
                          }
                        >
                          <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                            <SelectValue placeholder="Coluna do arquivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__nenhum__">— Não usar</SelectItem>
                            {headers.map((h, i) => {
                              const val = h === "" || h == null ? `__vazio_${i}` : String(h)
                              return <SelectItem key={`add-${i}-${val}`} value={val}>{h || "(vazio)"}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1.5 h-8 text-red-600 hover:text-red-700 text-xs"
                          onClick={() => setCamposAdicionais((prev) => prev.filter((x) => x.id !== campo.id))}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    <div className="border border-dashed border-gray-300 rounded-md p-3 bg-gray-50/50 flex items-center justify-center min-h-[100px]">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10"
                        onClick={() =>
                          setCamposAdicionais((prev) => [
                            ...prev,
                            { id: crypto.randomUUID(), label: "", coluna: "" },
                          ])
                        }
                      >
                        + Adicionar campo
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-2">Prévia ({linhasParaImportar.length} linhas) — atualiza ao alterar o mapeamento. Duplo-clique para editar.</h3>
                  <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {validacaoPreview.linhasComErro > 0 ? (
                      <span className="text-red-700">
                        Foram encontrados {validacaoPreview.totalErros} erro(s) em {validacaoPreview.linhasComErro} linha(s). Corrija os campos destacados em vermelho antes de importar.
                      </span>
                    ) : (
                      <span className="text-emerald-700">Prévia validada: não há erros críticos de CPF/nome para importação.</span>
                    )}
                  </div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      Linhas ativas para importação: <strong>{linhasAtivasComIndice.length}</strong>
                      {linhasExcluidasPreview.length > 0 ? (
                        <span> | Excluídas na prévia: <strong>{linhasExcluidasPreview.length}</strong></span>
                      ) : null}
                    </p>
                    {linhasExcluidasPreview.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setLinhasExcluidasPreview([])}
                      >
                        Restaurar linhas excluídas
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto max-h-[340px] overflow-y-auto border border-gray-200 rounded-md">
                    <table className="w-full text-sm border-collapse min-w-[800px]">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                          {CAMPOS_TABELA.map((field) => (
                            <th key={field} className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap">{LABEL_CAMPO[field]}</th>
                          ))}
                          {camposAdicionais.map((c) => (
                            <th key={c.id} className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap border-l border-gray-200">
                              {c.label.trim() || "(campo adicional)"}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-left font-medium text-gray-700 whitespace-nowrap border-l border-gray-200">
                            Ação
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasAtivasComIndice.map(({ linha: l, idxOriginal: i }) => (
                          <tr key={i} className="border-t border-gray-200 hover:bg-gray-50/50">
                            {CAMPOS_TABELA.map((field) => {
                              const isEditing = editingCell?.i === i && editingCell?.field === field
                              const errosLinha = validacaoPreview.porLinha[i] || {}
                              const temErroNoCampo =
                                (field === "nome" && !!errosLinha.nome) ||
                                (field === "cpf" && !!errosLinha.cpf) ||
                                (field === "cpf_titular" && !!errosLinha.cpf_titular) ||
                                (field === "idade" && !!errosLinha.idade) ||
                                (field === "data_nascimento" && !!errosLinha.idade)
                              const displayVal =
                                field === "idade"
                                  ? (l.idade != null ? String(l.idade) : "-")
                                  : field === "cpf" || field === "cpf_titular"
                                    ? (() => {
                                        const bruto = obterValorBrutoComOverride(i, field)
                                        const dig = String(bruto || "").replace(/\D/g, "")
                                        if (!dig) return "-"
                                        if (dig.length === 10 || dig.length === 11) return formatarCpf(normalizarCpf(dig))
                                        return aplicarMascaraCpfParcial(dig)
                                      })()
                                    : (l[field] || "-")
                              const editVal = field === "idade" ? (l.idade != null ? String(l.idade) : "") : (l[field] || "")
                              return (
                                <td key={field} className={`px-3 py-1.5 align-top ${temErroNoCampo ? "bg-red-50" : ""}`}>
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      type={field === "idade" ? "number" : "text"}
                                      className="w-full min-w-[4rem] px-2 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
                                      defaultValue={editVal}
                                      onBlur={(e) => saveOverride(i, field, e.currentTarget.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                                        if (e.key === "Escape") setEditingCell(null)
                                      }}
                                    />
                                  ) : (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className={`block min-h-[1.25rem] cursor-text rounded px-0.5 -mx-0.5 ${
                                        temErroNoCampo ? "text-red-700 hover:bg-red-100" : "hover:bg-gray-100"
                                      }`}
                                      title="Duplo-clique para editar"
                                      onDoubleClick={() => setEditingCell({ i, field })}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingCell({ i, field }) } }}
                                    >
                                      {displayVal}
                                    </span>
                                  )}
                                  {field === "nome" && errosLinha.nome && (
                                    <p className="mt-1 text-[11px] text-red-700">{errosLinha.nome}</p>
                                  )}
                                  {field === "cpf" && errosLinha.cpf && (
                                    <p className="mt-1 text-[11px] text-red-700">{errosLinha.cpf}</p>
                                  )}
                                  {field === "cpf_titular" && errosLinha.cpf_titular && (
                                    <p className="mt-1 text-[11px] text-red-700">{errosLinha.cpf_titular}</p>
                                  )}
                                  {(field === "idade" || field === "data_nascimento") && errosLinha.idade && (
                                    <p className="mt-1 text-[11px] text-red-700">{errosLinha.idade}</p>
                                  )}
                                </td>
                              )
                            })}
                            {camposAdicionais.map((c) => {
                              const val = c.coluna ? String(rows[i]?.[c.coluna] ?? "").trim() : ""
                              return (
                                <td key={c.id} className="px-3 py-1.5 align-top text-gray-700 border-l border-gray-100">
                                  {val || "-"}
                                </td>
                              )
                            })}
                            <td className="px-3 py-1.5 align-top border-l border-gray-100">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
                                onClick={() =>
                                  setLinhasExcluidasPreview((prev) =>
                                    prev.includes(i) ? prev : [...prev, i]
                                  )
                                }
                              >
                                Excluir linha
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Grupo e Produto */}
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-white text-sm font-medium mr-2">3</span>
                <h2 className="text-sm font-semibold text-gray-800 inline">Grupo e produto para cadastro</h2>
              </div>
              <div className="p-6">
                <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="flex items-start gap-2 text-xs text-slate-700">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-500" />
                    O produto lista os planos vinculados ao contrato selecionado.
                    {contratoComOpcoesCompletas
                      ? " As opções de vencimento e vigência já estão configuradas para este contrato."
                      : " Se o contrato ainda não tiver opções configuradas, o sistema usa valores padrão temporários."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl">
                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grupo de clientes <span className="text-red-500">*</span></label>
                    <Select value={grupoId} onValueChange={setGrupoId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {grupos.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contrato <span className="text-red-500">*</span></label>
                    <Select value={contratoId} onValueChange={setContratoId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        {contratos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {(c.numero ? `#${c.numero} - ` : "") + (c.descricao || "Sem descrição")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Produto (planos dos contratos) <span className="text-red-500">*</span></label>
                    <Select value={produtoId} onValueChange={setProdutoId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nome || "-"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {contratoId && produtos.length === 0 && (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <p className="flex items-start gap-2 text-xs text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          Nenhum produto encontrado para o contrato selecionado.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dia de vencimento <span className="text-red-500">*</span></label>
                    <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {diasContrato.map((dia) => (
                          <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-2">Opções conforme cadastro do contrato selecionado.</p>
                    {usandoFallbackDiaContrato && (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <p className="flex items-start gap-2 text-xs text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          Este contrato ainda não tem dias de vencimento cadastrados. Usando fallback 01 e 10.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vigência (referência) <span className="text-red-500">*</span></label>
                    <Select value={dataVigencia} onValueChange={setDataVigencia}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                        <SelectValue placeholder="Selecione a vigência" />
                      </SelectTrigger>
                      <SelectContent>
                        {vigenciasContratoComFallback.map((vig) => (
                          <SelectItem key={vig} value={vig}>{vig}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-2">
                      Aqui é uma referência de vigência do contrato. A data formal é validada na ficha do beneficiário.
                    </p>
                    {usandoFallbackVigenciaContrato && (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <p className="flex items-start gap-2 text-xs text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          Este contrato ainda não tem vigências de referência cadastradas. Usando fallback A DEFINIR.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!podemImportar || importing}
                    className="h-10 px-5 bg-gray-700 hover:bg-gray-800 text-white rounded-md inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span aria-hidden>↑</span>
                    {importing ? "Importando..." : "Importar e salvar"}
                  </button>
                </div>
                {possuiErrosCriticosImportacao && (
                  <p className="mt-2 text-xs text-red-700 text-right">
                    Importação bloqueada até correção dos campos em vermelho na prévia.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
