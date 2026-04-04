/**
 * Utilitário server-side para calcular o valor mensal de um produto com base na idade.
 * Usado na importação de vidas e no PUT de vidas importadas.
 * APENAS produtos_contrato_administradora - portal administradora é independente de admin/corretores.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

function parseValorMonetario(raw: unknown): number {
  if (raw == null) return 0
  if (typeof raw === "number" && !isNaN(raw)) return raw
  let s = String(raw).trim()
  if (!s) return 0
  s = s.replace(/[^\d,.-]/g, "")
  if (!s) return 0
  const temVirgula = s.includes(",")
  const temPonto = s.includes(".")
  if (temVirgula && temPonto) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (temVirgula) {
    s = s.replace(",", ".")
  }
  const n = parseFloat(s)
  return !isNaN(n) && n >= 0 ? n : 0
}

function extrairFaixaRegistro(item: Record<string, unknown>): string {
  return String(
    item?.faixa_etaria ??
      item?.faixa ??
      item?.faixaIdade ??
      item?.idade ??
      ""
  ).trim()
}

function parseFaixaEtaria(
  faixaRaw: unknown
): { tipo: "range"; min: number; max: number } | { tipo: "min"; min: number } | { tipo: "exact"; idade: number } | null {
  const faixa = String(faixaRaw ?? "").trim()
  if (!faixa) return null

  const normalizada = faixa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

  const nums = normalizada.match(/\d+/g)?.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n)) || []

  const rangeComHifen = normalizada.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (rangeComHifen) {
    const min = parseInt(rangeComHifen[1], 10)
    const max = parseInt(rangeComHifen[2], 10)
    if (!isNaN(min) && !isNaN(max)) return { tipo: "range", min, max }
  }

  if ((normalizada.includes(" a ") || normalizada.includes(" ate ") || normalizada.includes("até ")) && nums.length >= 2) {
    return { tipo: "range", min: nums[0], max: nums[1] }
  }

  if (
    normalizada.includes("+") ||
    normalizada.includes("ou mais") ||
    normalizada.includes("acima de") ||
    normalizada.includes("maior que") ||
    normalizada.includes(">=")
  ) {
    if (nums.length >= 1) return { tipo: "min", min: nums[0] }
  }

  if (nums.length === 1) return { tipo: "exact", idade: nums[0] }
  return null
}

function calcularValorPorFaixas(faixas: unknown[], idade: number): number {
  if (!Array.isArray(faixas)) return 0
  for (const f of faixas) {
    const item = (f as Record<string, unknown>) || {}
    const faixa = extrairFaixaRegistro(item)
    const rawValor = (f as Record<string, unknown>)?.valor
    const valor = parseValorMonetario(rawValor)
    if (!faixa) continue
    const parse = parseFaixaEtaria(faixa)
    if (!parse) continue
    if (parse.tipo === "range" && idade >= parse.min && idade <= parse.max) return valor
    if (parse.tipo === "min" && idade >= parse.min) return valor
    if (parse.tipo === "exact" && idade === parse.idade) return valor
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

function extrairFaixasArrayDoJson(raw: unknown, acomodacao: AcomodacaoFaixas): unknown[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  let faixas: unknown[] = []
  if (raw && typeof raw === "object" && "Enfermaria" in raw && "Apartamento" in raw) {
    const obj = raw as Record<string, unknown[]>
    faixas = Array.isArray(obj[acomodacao]) ? obj[acomodacao] : []
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const chaves = Object.keys(obj)
    const chaveAcomodacao = chaves.find((k) => k.toLowerCase() === acomodacao.toLowerCase())
    const chaveFallback =
      chaves.find((k) => k.toLowerCase().includes("enferm")) || chaves.find((k) => k.toLowerCase().includes("apart"))
    const arrAcomodacao = chaveAcomodacao ? obj[chaveAcomodacao] : chaveFallback ? obj[chaveFallback] : null
    if (Array.isArray(arrAcomodacao)) faixas = arrAcomodacao
  }
  if (faixas.length === 0 && raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const todosArrays = Object.values(obj).filter((v) => Array.isArray(v)) as unknown[][]
    faixas = todosArrays.flat()
  }
  return faixas
}

/**
 * Calcula valor mensal a partir do JSON `faixas` já carregado (sem consulta ao banco).
 * Mesma regra de `obterValorProdutoPorIdade`.
 */
export function calcularValorComFaixasJson(
  raw: unknown,
  idade: number,
  acomodacao: AcomodacaoFaixas = "Enfermaria"
): number | null {
  if (isNaN(idade) || idade < 0 || idade > 120) return null
  const faixas = extrairFaixasArrayDoJson(raw, acomodacao)
  const valor = calcularValorPorFaixas(faixas, idade)
  return valor > 0 ? valor : null
}

export type FaixasProdutoTenantEntry = { tenant: unknown | null; global: unknown | null }

/**
 * Carrega `faixas` de vários produtos em poucas requisições (evita N queries por beneficiário no faturamento).
 */
export async function carregarFaixasProdutosContratoPorIds(
  produtoIds: string[],
  tenantId: string
): Promise<Map<string, FaixasProdutoTenantEntry>> {
  const unique = [...new Set(produtoIds.map((id) => String(id).trim()).filter(Boolean))]
  const map = new Map<string, FaixasProdutoTenantEntry>()
  const CHUNK = 100
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK)
    const { data, error } = await supabaseAdmin
      .from("produtos_contrato_administradora")
      .select("id, faixas, tenant_id")
      .in("id", slice)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    if (error) {
      console.warn("carregarFaixasProdutosContratoPorIds:", error)
      continue
    }
    for (const row of data || []) {
      const id = String((row as { id: string }).id)
      const cur: FaixasProdutoTenantEntry = map.get(id) ?? { tenant: null, global: null }
      const tid = (row as { tenant_id?: string | null }).tenant_id
      const faixas = (row as { faixas?: unknown }).faixas
      if (tid === tenantId) cur.tenant = faixas ?? null
      else if (tid == null) cur.global = faixas ?? null
      map.set(id, cur)
    }
  }
  return map
}

/** Ordem igual à antiga `obterValorComFallback` do faturamento por grupo. */
export function valorProdutoComCacheFaixas(
  entry: FaixasProdutoTenantEntry | undefined,
  idade: number,
  acomodacaoVida: AcomodacaoFaixas
): number | null {
  if (!entry || isNaN(idade) || idade < 0 || idade > 120) return null
  const acomodacaoAlternativa: AcomodacaoFaixas = acomodacaoVida === "Apartamento" ? "Enfermaria" : "Apartamento"
  const tentativas: Array<{ raw: unknown | null; ac: AcomodacaoFaixas }> = [
    { raw: entry.tenant, ac: acomodacaoVida },
    { raw: entry.tenant, ac: acomodacaoAlternativa },
    { raw: entry.global, ac: acomodacaoVida },
    { raw: entry.global, ac: acomodacaoAlternativa },
  ]
  for (const { raw, ac } of tentativas) {
    if (raw == null) continue
    const v = calcularValorComFaixasJson(raw, idade, ac)
    if (v != null && v > 0) return v
  }
  return null
}

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
      return calcularValorComFaixasJson((pca as { faixas?: unknown }).faixas, idade, acomodacao)
    }

    return null
  } catch {
    return null
  }
}
