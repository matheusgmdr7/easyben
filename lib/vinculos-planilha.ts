/** Parse e mapeamento de planilha para geração de fichas de vínculo (sem cadastro no sistema). */

import {
  formatarDataFichaAdmissao,
  type DadosAutomaticosFichaAdmissao,
  type DadosOpcionaisFichaAdmissao,
} from "@/lib/vinculos-beneficiario-dados"
import { listarCamposFaltandoFicha } from "@/lib/vinculos-dados-sinteticos"

export type LinhaPlanilhaVinculos = Record<string, unknown>

export type LinhaPlanilhaNormalizada = {
  linha: number
  cpf: string
  nome: string
}

export type LinhaFichaPlanilha = {
  /** Identificador estável para seleção e localStorage (planilha:NUMERO_LINHA) */
  id: string
  linha: number
  automaticos: DadosAutomaticosFichaAdmissao
  opcionais: DadosOpcionaisFichaAdmissao
  faltando: string[]
}

export type EntradaPlanilhaLote = {
  linha: number
  automaticos: DadosAutomaticosFichaAdmissao
  opcionais?: DadosOpcionaisFichaAdmissao
}

export type CampoFichaVinculos = {
  id: string
  label: string
  /** Coluna obrigatória no mapeamento para incluir a linha na geração */
  obrigatorio: boolean
  /** Campo exigido para gerar o PDF */
  obrigatorioPdf?: boolean
  /** Texto curto sobre uso no PDF */
  descricao?: string
  aliases?: string[]
}

/**
 * Campos mapeáveis da planilha — fonte dos dados do PDF quando o beneficiário não está no sistema.
 */
export const CAMPOS_FICHA_VINCULOS: CampoFichaVinculos[] = [
  {
    id: "cpf",
    label: "CPF",
    obrigatorio: true,
    obrigatorioPdf: true,
    descricao: "Obrigatório para gerar a ficha",
    aliases: ["cpf", "cpf beneficiario", "cpf beneficiário", "documento", "cpf_cnpj"],
  },
  {
    id: "nome",
    label: "Nome",
    obrigatorio: true,
    obrigatorioPdf: true,
    descricao: "Nome completo do beneficiário na ficha",
    aliases: ["nome", "name", "beneficiario", "beneficiário", "nome completo", "nome_beneficiario"],
  },
  {
    id: "data_nascimento",
    label: "Data de nascimento",
    obrigatorio: false,
    descricao: "Campo automático no PDF",
    aliases: ["data_nascimento", "data nascimento", "nascimento", "dt nascimento", "dt_nascimento"],
  },
  {
    id: "local_nascimento",
    label: "Naturalidade (cidade)",
    obrigatorio: false,
    descricao: "Local de nascimento no PDF",
    aliases: ["naturalidade", "local_nascimento", "cidade nascimento", "cidade_nascimento"],
  },
  {
    id: "uf_nascimento",
    label: "UF de nascimento",
    obrigatorio: false,
    descricao: "UF de nascimento no PDF",
    aliases: ["uf_nascimento", "uf nascimento", "estado nascimento", "uf_nasc"],
  },
  {
    id: "identidade",
    label: "RG (Identidade)",
    obrigatorio: false,
    descricao: "Documento de identidade no PDF",
    aliases: ["identidade", "rg", "documento identidade", "numero rg"],
  },
  {
    id: "orgao_emissor",
    label: "Órgão emissor (RG)",
    obrigatorio: false,
    descricao: "Órgão expedidor do RG no PDF",
    aliases: ["orgao_emissor", "orgao emissor", "orgao expedidor", "orgão emissor", "ssp"],
  },
  {
    id: "cep",
    label: "CEP",
    obrigatorio: false,
    descricao: "Parte do endereço completo no PDF",
    aliases: ["cep", "codigo postal"],
  },
  {
    id: "logradouro",
    label: "Logradouro",
    obrigatorio: false,
    descricao: "Parte do endereço completo no PDF",
    aliases: ["logradouro", "endereco", "endereço", "rua", "avenida"],
  },
  {
    id: "numero",
    label: "Número",
    obrigatorio: false,
    descricao: "Parte do endereço completo no PDF",
    aliases: ["numero", "número", "num", "nro"],
  },
  {
    id: "complemento",
    label: "Complemento",
    obrigatorio: false,
    aliases: ["complemento", "compl", "apto", "apartamento"],
  },
  {
    id: "bairro",
    label: "Bairro",
    obrigatorio: false,
    aliases: ["bairro"],
  },
  {
    id: "cidade",
    label: "Cidade",
    obrigatorio: false,
    aliases: ["cidade", "municipio", "município"],
  },
  {
    id: "estado",
    label: "Estado (UF)",
    obrigatorio: false,
    aliases: ["estado", "uf"],
  },
  {
    id: "estado_civil",
    label: "Estado civil",
    obrigatorio: false,
    descricao: "Opcional no PDF; pode ser preenchido para todo o lote abaixo",
    aliases: ["estado_civil", "estado civil"],
  },
  {
    id: "grau_instrucao",
    label: "Grau de instrução",
    obrigatorio: false,
    descricao: "Opcional no PDF; pode ser preenchido para todo o lote abaixo",
    aliases: ["grau_instrucao", "grau instrução", "escolaridade", "grau de instrucao"],
  },
]

const ALIAS_NOME = ["nome", "name", "beneficiario", "beneficiário", "nome completo", "nome_beneficiario"]
const ALIAS_CPF = ["cpf", "cpf beneficiario", "cpf beneficiário", "documento", "cpf_cnpj"]

export function normalizarHeaderPlanilha(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

export function normalizarCpfPlanilha(valor: unknown): string {
  const dig = String(valor ?? "").replace(/\D/g, "")
  if (!dig) return ""
  return dig.slice(-11).padStart(11, "0")
}

export function resolverColunaPlanilha(headers: string[], aliases: string[]): string | null {
  const normHeaders = headers.map((h) => normalizarHeaderPlanilha(h))
  for (const al of aliases) {
    const na = normalizarHeaderPlanilha(al)
    const idx = normHeaders.findIndex(
      (h) =>
        h === na ||
        h.includes(na) ||
        na.includes(h) ||
        (na.length >= 3 && h.replace(/\s/g, "").includes(na.replace(/\s/g, "")))
    )
    if (idx >= 0) return headers[idx]
  }
  return null
}

/** @deprecated Use autoMapColunasFichaVinculos */
export function detectarColunasPlanilhaVinculos(headers: string[]) {
  return {
    colNome: resolverColunaPlanilha(headers, ALIAS_NOME),
    colCpf: resolverColunaPlanilha(headers, ALIAS_CPF),
  }
}

export function autoMapColunasFichaVinculos(headers: string[]): Record<string, string> {
  const auto: Record<string, string> = {}
  const low = headers.map((x) => normalizarHeaderPlanilha(x))

  for (const campo of CAMPOS_FICHA_VINCULOS) {
    const aliases = campo.aliases || [campo.id]
    let idx = -1

    for (const al of aliases) {
      const na = normalizarHeaderPlanilha(al)
      idx = low.findIndex((h) => {
        if (h === na || h.includes(na)) return true
        if (campo.id === "nome" && (h.includes("nome") && !h.includes("mae") && !h.includes("mãe") && !h.includes("pai"))) return true
        if (campo.id === "estado" && (h === "uf" || h === "estado")) return true
        if (campo.id === "identidade" && (h === "rg" || h.includes("identidade"))) return true
        if (campo.id === "local_nascimento" && (h.includes("naturalidade") || h.includes("nascimento") && h.includes("cidade"))) return true
        return false
      })
      if (idx >= 0) break
    }

    if (idx < 0) {
      idx = low.findIndex((h) => h.includes(campo.id.replace(/_/g, " ")) || h.includes(campo.id))
    }

    if (idx >= 0) auto[campo.id] = headers[idx]
  }

  return auto
}

export function getValorPlanilhaMapeado(
  row: LinhaPlanilhaVinculos,
  campoId: string,
  mapCol: Record<string, string>
): string {
  let col = mapCol[campoId]
  if (!col || col === "__nenhum__") return ""
  if (col.startsWith("__vazio_")) col = ""
  const v = row[col]
  if (v == null) return ""
  return String(v).trim()
}

function valorCelula(row: LinhaPlanilhaVinculos, col: string | null): string {
  if (!col) return ""
  const v = row[col]
  if (v == null) return ""
  return String(v).trim()
}

export function normalizarLinhasPlanilhaVinculos(
  rows: LinhaPlanilhaVinculos[],
  colNome: string | null,
  colCpf: string | null
): LinhaPlanilhaNormalizada[] {
  const mapCol = {
    cpf: colCpf || "",
    nome: colNome || "",
  }
  return normalizarLinhasPlanilhaComMapeamento(rows, mapCol)
}

export function normalizarLinhasPlanilhaComMapeamento(
  rows: LinhaPlanilhaVinculos[],
  mapCol: Record<string, string>
): LinhaPlanilhaNormalizada[] {
  const out: LinhaPlanilhaNormalizada[] = []

  rows.forEach((row, idx) => {
    const cpf = normalizarCpfPlanilha(getValorPlanilhaMapeado(row, "cpf", mapCol))
    if (!cpf || cpf.length !== 11) return
    out.push({
      linha: idx + 2,
      cpf,
      nome: getValorPlanilhaMapeado(row, "nome", mapCol),
    })
  })

  return out
}

export function camposObrigatoriosPdfVinculos(): CampoFichaVinculos[] {
  return CAMPOS_FICHA_VINCULOS.filter((c) => c.obrigatorioPdf)
}

function formatarCpfPlanilha(cpf: string): string {
  const d = cpf.replace(/\D/g, "")
  if (d.length !== 11) return cpf.trim()
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

/** Normaliza data de nascimento da planilha para yyyy-MM-dd (compatível com formatarDataFichaAdmissao). */
export function normalizarDataNascimentoPlanilha(val: string | number | null | undefined): string {
  if (val == null || val === "") return ""
  let t = (typeof val === "string" ? val : String(val)).trim()
  const space = t.indexOf(" ")
  if (space > 0) t = t.slice(0, space)
  if (!t) return ""
  const t2 = t.replace(/[\u2044\u2215\\]/g, "/").replace(/[\u2013\u2014\u2212]/g, "-")
  const serialMatch = /^(\d{4,6})(\.\d+)?$/.exec(t2)
  const n =
    typeof val === "number"
      ? Math.floor(Number(val))
      : serialMatch
        ? parseInt(serialMatch[1], 10)
        : NaN
  if (!isNaN(n) && n >= 1 && n <= 50000) {
    const d = new Date((n - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const m1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t2)
  if (m1) {
    const d = new Date(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const m2 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t2)
  if (m2) {
    const d = new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t2)) return t2
  return t
}

function montarEnderecoPlanilha(partes: {
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}): string {
  const endereco = [
    partes.logradouro,
    partes.numero,
    partes.complemento,
    partes.bairro,
    [partes.cidade, partes.estado].filter(Boolean).join("/"),
    partes.cep ? `CEP ${partes.cep}` : "",
  ].filter(Boolean)
  return endereco.join(" - ")
}

function mesclarOpcionais(
  lote: DadosOpcionaisFichaAdmissao | undefined,
  linha: DadosOpcionaisFichaAdmissao
): DadosOpcionaisFichaAdmissao {
  const out: DadosOpcionaisFichaAdmissao = { ...(lote || {}) }
  for (const [k, v] of Object.entries(linha)) {
    if (v != null && String(v).trim()) {
      ;(out as Record<string, string>)[k] = String(v).trim()
    }
  }
  return out
}

export function idLinhaPlanilha(linha: number): string {
  return `planilha:${linha}`
}

export function mapearLinhaPlanilhaParaFicha(
  row: LinhaPlanilhaVinculos,
  mapCol: Record<string, string>,
  linhaNum: number,
  opcionaisLote?: DadosOpcionaisFichaAdmissao
): LinhaFichaPlanilha | null {
  const cpfDig = normalizarCpfPlanilha(getValorPlanilhaMapeado(row, "cpf", mapCol))
  const nome = getValorPlanilhaMapeado(row, "nome", mapCol).trim()
  if (!cpfDig || cpfDig.length !== 11 || !nome) return null

  const cpfFmt = formatarCpfPlanilha(cpfDig)
  const dataIso = normalizarDataNascimentoPlanilha(getValorPlanilhaMapeado(row, "data_nascimento", mapCol))

  const automaticos: DadosAutomaticosFichaAdmissao = {
    nome: nome.toUpperCase(),
    data_nascimento: formatarDataFichaAdmissao(dataIso),
    local_nascimento: getValorPlanilhaMapeado(row, "local_nascimento", mapCol).toUpperCase(),
    uf_nascimento: getValorPlanilhaMapeado(row, "uf_nascimento", mapCol).toUpperCase().slice(0, 2),
    cpf: cpfFmt,
    rg: getValorPlanilhaMapeado(row, "identidade", mapCol),
    orgao_emissor: getValorPlanilhaMapeado(row, "orgao_emissor", mapCol).toUpperCase(),
    endereco_completo: montarEnderecoPlanilha({
      logradouro: getValorPlanilhaMapeado(row, "logradouro", mapCol),
      numero: getValorPlanilhaMapeado(row, "numero", mapCol),
      complemento: getValorPlanilhaMapeado(row, "complemento", mapCol),
      bairro: getValorPlanilhaMapeado(row, "bairro", mapCol),
      cidade: getValorPlanilhaMapeado(row, "cidade", mapCol),
      estado: getValorPlanilhaMapeado(row, "estado", mapCol).slice(0, 2).toUpperCase(),
      cep: getValorPlanilhaMapeado(row, "cep", mapCol).replace(/\D/g, ""),
    }).toUpperCase(),
    carteira_trabalho_digital: cpfFmt,
  }

  const opcionaisLinha: DadosOpcionaisFichaAdmissao = {
    estado_civil: getValorPlanilhaMapeado(row, "estado_civil", mapCol),
    grau_instrucao: getValorPlanilhaMapeado(row, "grau_instrucao", mapCol),
  }
  const opcionais = mesclarOpcionais(opcionaisLote, opcionaisLinha)

  return {
    id: idLinhaPlanilha(linhaNum),
    linha: linhaNum,
    automaticos,
    opcionais,
    faltando: listarCamposFaltandoFicha(automaticos, opcionais),
  }
}

export function extrairLinhasFichaPlanilha(
  rows: LinhaPlanilhaVinculos[],
  mapCol: Record<string, string>,
  opcionaisLote?: DadosOpcionaisFichaAdmissao
): { linhas: LinhaFichaPlanilha[]; ignoradas: number } {
  const linhas: LinhaFichaPlanilha[] = []
  let ignoradas = 0

  rows.forEach((row, idx) => {
    const linhaNum = idx + 2
    const item = mapearLinhaPlanilhaParaFicha(row, mapCol, linhaNum, opcionaisLote)
    if (!item) {
      ignoradas += 1
      return
    }
    linhas.push(item)
  })

  return { linhas, ignoradas }
}

/** ID fixo para rastrear fichas geradas via planilha no localStorage. */
export const VINCULOS_FONTE_PLANILHA_ID = "__planilha_vinculos__"
