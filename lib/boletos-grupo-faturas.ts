import type { SupabaseClient } from "@supabase/supabase-js"

/** PostgREST costuma falhar ou degradar com listas .in() muito grandes; usamos chunks seguros. */
export const CHUNK_IN_CLIENTE_IDS = 150

export type BuscarFaturasGrupoOpts = {
  /** Limite global de faturas únicas; omitir para carregar todos os chunks. */
  limitTotal?: number
  /** Filtro opcional: vencimento >= YYYY-MM-DD (inclusivo). */
  vencimentoGte?: string
  /** Filtro opcional: vencimento < YYYY-MM-DD (exclusivo). */
  vencimentoLt?: string
}

export async function buscarFaturasPorClienteIdsChunks(
  supabase: SupabaseClient,
  clienteIds: string[],
  administradoraId: string,
  select: string,
  opts?: number | BuscarFaturasGrupoOpts
): Promise<Array<Record<string, unknown>>> {
  const options: BuscarFaturasGrupoOpts =
    typeof opts === "number" ? { limitTotal: opts } : opts ?? {}

  const unique = [...new Set(clienteIds.map((id) => String(id || "").trim()).filter(Boolean))]
  if (unique.length === 0) return []

  const byId = new Map<string, Record<string, unknown>>()
  const chunkSize = CHUNK_IN_CLIENTE_IDS
  const limitTotal = options.limitTotal

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    let query = supabase
      .from("faturas")
      .select(select)
      .in("cliente_administradora_id", chunk)
      .eq("administradora_id", administradoraId)

    if (options.vencimentoGte) query = query.gte("vencimento", options.vencimentoGte)
    if (options.vencimentoLt) query = query.lt("vencimento", options.vencimentoLt)

    const { data, error } = await query

    if (error) {
      console.error("[boletos-grupo] erro faturas chunk", { chunkIndex: i, message: error.message })
      throw error
    }
    for (const row of data || []) {
      const id = String((row as { id?: string }).id || "")
      if (id) byId.set(id, row as Record<string, unknown>)
    }
    if (limitTotal != null && byId.size >= limitTotal) break
  }

  return [...byId.values()]
}

/** Intervalo [YYYY-MM-01, primeiro dia do mês seguinte) para filtro de vencimento. */
export function limiteMesVencimento(mes: string): { inicio: string; fimExclusivo: string } | null {
  const [y, m] = mes.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const inicio = `${mes}-01`
  const fimExclusivo = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
  return { inicio, fimExclusivo }
}
