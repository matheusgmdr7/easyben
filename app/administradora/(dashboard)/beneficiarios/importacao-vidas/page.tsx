"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import * as XLSX from "xlsx"

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
  { id: "corretor", label: "Corretor(a)", obrigatorio: false },
] as const

const TIPO_NORMALIZE: Record<string, string> = {
  titular: "titular", Titular: "titular", T: "titular", t: "titular",
  dependente: "dependente", Dependente: "dependente", D: "dependente", Dep: "dependente",
}

const ACOMODACAO_NORMALIZE: Record<string, string> = {
  enfermaria: "Enfermaria", Enfermaria: "Enfermaria", E: "Enfermaria", enf: "Enfermaria",
  apartamento: "Apartamento", Apartamento: "Apartamento", A: "Apartamento", apt: "Apartamento",
}

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
  corretor: string
}

const CAMPOS_TABELA: (keyof LinhaPreview)[] = [
  "nome", "cpf", "nome_mae", "nome_pai", "tipo", "data_nascimento", "idade", "sexo", "estado_civil",
  "parentesco", "cpf_titular", "identidade", "cns", "acomodacao",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado", "telefone", "email", "observacoes", "corretor"
]

const LABEL_CAMPO: Record<keyof LinhaPreview, string> = {
  nome: "Nome", cpf: "CPF", nome_mae: "Nome mãe", nome_pai: "Nome pai", tipo: "Tipo", data_nascimento: "Dt. nasc.", idade: "Idade",
  sexo: "Sexo", estado_civil: "Est. civil", parentesco: "Parentesco", cpf_titular: "CPF Tit.", identidade: "RG", cns: "CNS", acomodacao: "Acomod.",
  cep: "CEP", logradouro: "Logradouro", numero: "Nº", complemento: "Compl.", bairro: "Bairro", cidade: "Cidade", estado: "UF",
  telefone: "Telefone", email: "E-mail", observacoes: "Obs.", corretor: "Corretor(a)",
}

export default function ImportacaoVidasPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [produtos, setProdutos] = useState<{ id: string; nome?: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [mapCol, setMapCol] = useState<Record<string, string>>({})
  const [grupoId, setGrupoId] = useState("")
  const [produtoId, setProdutoId] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [drag, setDrag] = useState(false)
  /** Ajustes manuais: chave "linha:campo" (ex. "2:nome") → valor editado. Limpo ao trocar arquivo. */
  const [editedOverrides, setEditedOverrides] = useState<Record<string, string | number | null>>({})
  const [editingCell, setEditingCell] = useState<{ i: number; field: keyof LinhaPreview } | null>(null)
  /** Campos adicionais: mapeiam colunas do arquivo para chaves salvas em dados_adicionais (JSONB) */
  const [camposAdicionais, setCamposAdicionais] = useState<{ id: string; label: string; coluna: string }[]>([])

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    GruposBeneficiariosService.buscarTodos(adm.id).then(setGrupos).catch(() => toast.error("Erro ao carregar grupos"))
  }, [router])

  // Produtos dos contratos da administradora (só quando temos administradora e vamos usar)
  useEffect(() => {
    if (!administradoraId) return
    fetch(`/api/administradora/produtos-contrato?administradora_id=${encodeURIComponent(administradoraId)}`)
      .then((r) => r.json())
      .then((d) => setProdutos(Array.isArray(d) ? d : []))
      .catch(() => {
        toast.error("Erro ao carregar produtos dos contratos")
        setProdutos([])
      })
  }, [administradoraId])

  const onFile = useCallback((f: File | null) => {
    setEditedOverrides({})
    setEditingCell(null)
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
            if (c.id === "corretor" && (x.includes("corretor") || x.includes("corretora"))) return true
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
        cpf: (getVal(row, "cpf", mapCol) || "").replace(/\D/g, ""),
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
        cpf_titular: tipo === "dependente" ? (getVal(row, "cpf_titular", mapCol) || "").replace(/\D/g, "") : "",
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
        corretor: getVal(row, "corretor", mapCol),
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
          out[f] = String(ov ?? "").replace(/\D/g, "")
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

  const podemImportar = administradoraId && grupoId && produtoId && linhasParaImportar.length > 0 && linhasParaImportar.some((l) => (l.nome || "").trim().length > 0)

  const handleImport = async () => {
    if (!podemImportar || !administradoraId) return
    setImporting(true)
    try {
      const linhasComAdicionais = linhasParaImportar.map((l, i) => {
        const dados_adicionais: Record<string, string> = {}
        camposAdicionais.forEach((c) => {
          if (c.label.trim() && c.coluna) {
            const v = String(rows[i]?.[c.coluna] ?? "").trim()
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
          produto_id: produtoId || null,
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
      setGrupoId("")
      setProdutoId("")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (typeof e === "string" ? e : "Erro ao importar")
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Importação de vidas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Envie um arquivo Excel ou CSV, mapeie as colunas, confira a prévia e selecione grupo e produto para cadastrar as vidas.
        </p>
      </div>

      <div className="p-6 space-y-6">
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
                        </tr>
                      </thead>
                      <tbody>
                        {linhasParaImportar.map((l, i) => (
                          <tr key={i} className="border-t border-gray-200 hover:bg-gray-50/50">
                            {CAMPOS_TABELA.map((field) => {
                              const isEditing = editingCell?.i === i && editingCell?.field === field
                              const displayVal = field === "idade" ? (l.idade != null ? String(l.idade) : "-") : (l[field] || "-")
                              const editVal = field === "idade" ? (l.idade != null ? String(l.idade) : "") : (l[field] || "")
                              return (
                                <td key={field} className="px-3 py-1.5 align-top">
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
                                      className="block min-h-[1.25rem] cursor-text rounded px-0.5 -mx-0.5 hover:bg-gray-100"
                                      title="Duplo-clique para editar"
                                      onDoubleClick={() => setEditingCell({ i, field })}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingCell({ i, field }) } }}
                                    >
                                      {displayVal}
                                    </span>
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
                <p className="text-xs text-gray-500 mb-4">O produto lista apenas planos já utilizados nos contratos desta administradora (sessão Contrato / Clientes).</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
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
                    {produtos.length === 0 && (
                      <p className="text-xs text-amber-700 mt-1.5">Nenhum produto nos contratos desta administradora. Ao vincular clientes em Clientes, os planos passam a aparecer aqui.</p>
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
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
