/** Nome comercial do plano, separado do nome técnico do produto. */

export function lerNomePlanoProduto(produto: {
  nome_plano?: unknown
  faixas?: unknown
} | null | undefined): string {
  const coluna = String(produto?.nome_plano || "").trim()
  if (coluna) return coluna.slice(0, 255)
  let faixas = produto?.faixas
  if (typeof faixas === "string") {
    try {
      faixas = JSON.parse(faixas)
    } catch {
      faixas = null
    }
  }
  if (faixas && typeof faixas === "object" && !Array.isArray(faixas)) {
    return String((faixas as Record<string, unknown>).nome_plano || "").trim().slice(0, 255)
  }
  return ""
}

export function faixasComNomePlano<T extends Record<string, unknown>>(
  faixas: T,
  nomePlano: string | null | undefined
): T {
  const nome = String(nomePlano || "").trim().slice(0, 255)
  const { nome_plano: _removido, ...resto } = faixas
  if (!nome) return resto as T
  return { ...resto, nome_plano: nome } as T
}

export function erroColunaNomePlano(error: { message?: string } | null | undefined): boolean {
  const msg = String(error?.message || "")
  return msg.includes("nome_plano")
}
