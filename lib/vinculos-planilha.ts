/** Parse e mapeamento de planilha para seleção de beneficiários (fichas de vínculo). */

export type LinhaPlanilhaVinculos = Record<string, unknown>

export type LinhaPlanilhaNormalizada = {
  linha: number
  cpf: string
  nome: string
}

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

export function detectarColunasPlanilhaVinculos(headers: string[]) {
  return {
    colNome: resolverColunaPlanilha(headers, ALIAS_NOME),
    colCpf: resolverColunaPlanilha(headers, ALIAS_CPF),
  }
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
  const out: LinhaPlanilhaNormalizada[] = []
  rows.forEach((row, idx) => {
    const cpf = normalizarCpfPlanilha(valorCelula(row, colCpf))
    if (!cpf || cpf.length !== 11) return
    out.push({
      linha: idx + 2,
      cpf,
      nome: valorCelula(row, colNome),
    })
  })
  return out
}

/** ID fixo para rastrear fichas geradas via planilha no localStorage. */
export const VINCULOS_FONTE_PLANILHA_ID = "__planilha_vinculos__"
