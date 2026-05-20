import { supabaseAdmin } from "@/lib/supabase-admin"
import { CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"

export type FaturaAtrasadaRow = {
  cliente_administradora_id: string
  vencimento: string
}

/** Conta faturas atrasadas por cliente (todas, sem filtro de período). */
export async function contarFaturasAtrasadasPorCliente(
  clienteIds: string[],
  administradoraId: string,
  tenantId: string
): Promise<Map<string, { quantidade: number; vencimentos: string[] }>> {
  const counts = new Map<string, { quantidade: number; vencimentos: string[] }>()

  if (clienteIds.length === 0) return counts

  for (let i = 0; i < clienteIds.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = clienteIds.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data, error } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, vencimento")
      .in("cliente_administradora_id", chunk)
      .eq("administradora_id", administradoraId)
      .eq("status", "atrasada")

    if (error) {
      const fb = await supabaseAdmin
        .from("faturas")
        .select("cliente_administradora_id, vencimento")
        .in("cliente_administradora_id", chunk)
        .eq("administradora_id", administradoraId)
        .eq("status", "atrasada")
      data = fb.data
      error = fb.error as typeof error
    }
    if (error) throw error

    for (const row of data || []) {
      const ca = String((row as FaturaAtrasadaRow).cliente_administradora_id || "").trim()
      const ven = String((row as FaturaAtrasadaRow).vencimento || "").slice(0, 10)
      if (!ca) continue
      const atual = counts.get(ca) || { quantidade: 0, vencimentos: [] }
      atual.quantidade += 1
      if (ven && /^\d{4}-\d{2}-\d{2}$/.test(ven)) atual.vencimentos.push(ven)
      counts.set(ca, atual)
    }
  }

  for (const [id, info] of counts) {
    info.vencimentos.sort()
    counts.set(id, info)
  }

  return counts
}

/**
 * Titulares elegíveis: status ativo em clientes_administradoras e, se tiver vida no grupo,
 * ao menos uma vida importada ativa vinculada ao mesmo cliente.
 */
export async function filtrarTitularesAtivosParaInadimplencia(
  clienteIds: string[],
  grupoId: string,
  administradoraId: string,
  tenantId: string
): Promise<string[]> {
  if (clienteIds.length === 0) return []

  const ativosCA = await filtrarClientesAdministradoraAtivos(clienteIds, administradoraId, tenantId)

  const caComVidaNoGrupo = new Set<string>()
  const caComVidaAtivaNoGrupo = new Set<string>()
  let from = 0
  const PAGE = 1000
  let hasMore = true
  while (hasMore) {
    let q = supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, ativo")
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradoraId)
      .not("cliente_administradora_id", "is", null)
      .range(from, from + PAGE - 1)
    if (tenantId) q = q.eq("tenant_id", tenantId)
    let { data: chunk, error } = await q

    if ((error || !chunk?.length) && tenantId) {
      const res = await supabaseAdmin
        .from("vidas_importadas")
        .select("cliente_administradora_id, ativo")
        .eq("grupo_id", grupoId)
        .eq("administradora_id", administradoraId)
        .not("cliente_administradora_id", "is", null)
        .range(from, from + PAGE - 1)
      chunk = res.data
      error = res.error as typeof error
    }
    if (error) throw error

    const list = chunk || []
    for (const row of list) {
      const caId = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      if (!caId) continue
      caComVidaNoGrupo.add(caId)
      if ((row as { ativo?: boolean }).ativo !== false) caComVidaAtivaNoGrupo.add(caId)
    }
    hasMore = list.length === PAGE
    from += PAGE
  }

  return clienteIds.filter((id) => {
    if (!ativosCA.has(id)) return false
    if (caComVidaNoGrupo.has(id)) return caComVidaAtivaNoGrupo.has(id)
    return true
  })
}

export async function filtrarClientesAdministradoraAtivos(
  candidatoIds: string[],
  administradoraId: string,
  tenantId: string
): Promise<Set<string>> {
  const ativos = new Set<string>()
  if (candidatoIds.length === 0) return ativos

  for (let i = 0; i < candidatoIds.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = candidatoIds.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data, error } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id, status")
      .in("id", chunk)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    if (error) {
      const fb = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, status")
        .in("id", chunk)
        .eq("administradora_id", administradoraId)
      data = fb.data
      error = fb.error as typeof error
    }
    if (error) throw error

    for (const row of data || []) {
      const id = String((row as { id?: string }).id || "").trim()
      const st = String((row as { status?: string }).status || "").toLowerCase()
      if (id && st === "ativo") ativos.add(id)
    }
  }

  return ativos
}

export function percentual(numerador: number, denominador: number): number {
  if (denominador <= 0) return 0
  return Math.round((numerador / denominador) * 10000) / 100
}
