import type { SupabaseClient } from "@supabase/supabase-js"

/** PostgREST costuma falhar ou degradar com listas .in() muito grandes; usamos chunks seguros. */
export const CHUNK_IN_CLIENTE_IDS = 150

export async function buscarFaturasPorClienteIdsChunks(
  supabase: SupabaseClient,
  clienteIds: string[],
  administradoraId: string,
  select: string,
  limitTotal: number
): Promise<Array<Record<string, unknown>>> {
  const unique = [...new Set(clienteIds.map((id) => String(id || "").trim()).filter(Boolean))]
  if (unique.length === 0) return []

  const byId = new Map<string, Record<string, unknown>>()
  const chunkSize = CHUNK_IN_CLIENTE_IDS

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from("faturas")
      .select(select)
      .in("cliente_administradora_id", chunk)
      .eq("administradora_id", administradoraId)

    if (error) {
      console.error("[boletos-grupo] erro faturas chunk", { chunkIndex: i, message: error.message })
      throw error
    }
    for (const row of data || []) {
      const id = String((row as { id?: string }).id || "")
      if (id) byId.set(id, row as Record<string, unknown>)
    }
    if (byId.size >= limitTotal) break
  }

  return [...byId.values()]
}
