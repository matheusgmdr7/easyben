/**
 * Utilitário server-side para calcular o valor mensal de um produto com base na idade.
 * Usado na importação de vidas e no PUT de vidas importadas.
 * APENAS produtos_contrato_administradora - portal administradora é independente de admin/corretores.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

function calcularValorPorFaixas(faixas: unknown[], idade: number): number {
  if (!Array.isArray(faixas)) return 0
  for (const f of faixas) {
    const faixa = String((f as Record<string, unknown>)?.faixa_etaria ?? "").trim()
    const rawValor = (f as Record<string, unknown>)?.valor
    const valor = typeof rawValor === "number" ? rawValor : Number(String(rawValor ?? "").replace(",", ".")) || 0
    if (!faixa) continue
    if (faixa.includes("-")) {
      const parts = faixa.split("-")
      const min = parseInt(parts[0]?.trim() ?? "", 10)
      const max = parseInt(parts[1]?.trim() ?? "", 10)
      if (!isNaN(min) && !isNaN(max) && idade >= min && idade <= max) return valor
    } else if (faixa.endsWith("+")) {
      const min = parseInt(faixa.replace("+", "").trim(), 10)
      if (!isNaN(min) && idade >= min) return valor
    } else {
      const exata = parseInt(faixa, 10)
      if (!isNaN(exata) && idade === exata) return valor
    }
  }
  return 0
}

/**
 * Calcula idade em uma data específica (útil para referência mês/ano).
 * @param dataNascimento - Data de nascimento
 * @param ateData - Objeto { ano, mes } (mês 1-12) - considera o último dia do mês
 */
export function calcularIdadeAteData(
  dataNascimento: string | Date | null | undefined,
  ateData: { ano: number; mes: number }
): number | null {
  if (!dataNascimento || !ateData?.ano || !ateData?.mes) return null
  const str = typeof dataNascimento === "string" ? dataNascimento.slice(0, 10) : dataNascimento.toISOString().slice(0, 10)
  const partes = str.split("-")
  if (partes.length !== 3) return null
  const ano = parseInt(partes[0], 10)
  const mes = parseInt(partes[1], 10)
  const dia = parseInt(partes[2], 10)
  if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null
  const ultimoDia = new Date(ateData.ano, ateData.mes, 0).getDate()
  const dataRef = new Date(ateData.ano, ateData.mes - 1, Math.min(dia, ultimoDia))
  let idade = dataRef.getFullYear() - ano
  const mRef = dataRef.getMonth() + 1
  const dRef = dataRef.getDate()
  if (mRef < mes || (mRef === mes && dRef < dia)) idade--
  return idade >= 0 && idade <= 120 ? idade : null
}

/**
 * Calcula idade a partir de data de nascimento (yyyy-MM-dd ou Date) - usa data atual.
 */
export function calcularIdade(dataNascimento: string | Date | null | undefined): number | null {
  if (!dataNascimento) return null
  const str = typeof dataNascimento === "string" ? dataNascimento.slice(0, 10) : dataNascimento.toISOString().slice(0, 10)
  const partes = str.split("-")
  if (partes.length !== 3) return null
  const ano = parseInt(partes[0], 10)
  const mes = parseInt(partes[1], 10)
  const dia = parseInt(partes[2], 10)
  if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
  return idade >= 0 && idade <= 120 ? idade : null
}

type AcomodacaoFaixas = "Enfermaria" | "Apartamento"

/**
 * Obtém o valor do produto por idade.
 * APENAS produtos_contrato_administradora (faixas JSONB no próprio produto).
 * Suporta faixas por acomodação: { Enfermaria: [...], Apartamento: [...] } ou array legado.
 * @param acomodacao - "Enfermaria" ou "Apartamento"; quando faixas é objeto, usa essa chave; default "Enfermaria"
 */
export async function obterValorProdutoPorIdade(
  produtoId: string,
  idade: number,
  tenantId?: string | null,
  acomodacao: AcomodacaoFaixas = "Enfermaria"
): Promise<number | null> {
  if (!produtoId || isNaN(idade) || idade < 0 || idade > 120) return null

  try {
    const baseQuery = supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, faixas")
      .eq("id", produtoId)
    const q = tenantId ? baseQuery.eq("tenant_id", tenantId) : baseQuery
    const { data: pca } = await q.maybeSingle()

    if (pca) {
      const raw = (pca.faixas as unknown) ?? []
      let faixas: unknown[] = []
      if (Array.isArray(raw)) {
        faixas = raw
      } else if (raw && typeof raw === "object" && "Enfermaria" in raw && "Apartamento" in raw) {
        const obj = raw as Record<string, unknown[]>
        faixas = Array.isArray(obj[acomodacao]) ? obj[acomodacao] : []
      }
      const valor = calcularValorPorFaixas(faixas, idade)
      return valor > 0 ? valor : null
    }

    return null
  } catch {
    return null
  }
}
