import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

const STATUS_CANCELAMENTO_ABERTO = ["solicitado", "processado_operadora"] as const
const CHUNK = 80

export async function resolverTenantIdAdministradora(administradoraId: string): Promise<string> {
  const { data: adm } = await supabaseAdmin
    .from("administradoras")
    .select("tenant_id")
    .eq("id", administradoraId)
    .maybeSingle()
  if (adm?.tenant_id) return adm.tenant_id
  return getCurrentTenantId()
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

type VidaRow = {
  id: string
  ativo: boolean | null
  observacoes: string | null
}

/**
 * Marca vida como inativa com fallbacks (tenant legado / update só por id).
 */
export async function inativarVidaImportada(params: {
  vidaId: string
  administradoraId: string
  tenantId: string
  notaObservacao?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { vidaId, administradoraId, tenantId, notaObservacao } = params

  let vida: VidaRow | null = null
  const selectVida = () =>
    supabaseAdmin
      .from("vidas_importadas")
      .select("id, ativo, observacoes")
      .eq("id", vidaId)
      .eq("administradora_id", administradoraId)

  if (tenantId) {
    const { data } = await selectVida().eq("tenant_id", tenantId).maybeSingle()
    if (data) vida = data as VidaRow
  }
  if (!vida) {
    const { data } = await selectVida().maybeSingle()
    if (data) vida = data as VidaRow
  }
  if (!vida) {
    const { data } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, ativo, observacoes")
      .eq("id", vidaId)
      .maybeSingle()
    if (data) vida = data as VidaRow
  }
  if (!vida) return { ok: false, error: "Vida não encontrada" }

  if (vida.ativo === false) return { ok: true }

  const obsAtual = String(vida.observacoes || "").trim()
  const observacoes =
    notaObservacao && notaObservacao.length > 0
      ? obsAtual
        ? `${obsAtual}\n${notaObservacao}`
        : notaObservacao
      : obsAtual || null

  const payload = { ativo: false, observacoes }

  const tentativas = [
    () =>
      supabaseAdmin
        .from("vidas_importadas")
        .update(payload)
        .eq("id", vidaId)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .select("id"),
    () =>
      supabaseAdmin
        .from("vidas_importadas")
        .update(payload)
        .eq("id", vidaId)
        .eq("administradora_id", administradoraId)
        .select("id"),
    () => supabaseAdmin.from("vidas_importadas").update(payload).eq("id", vidaId).select("id"),
  ]

  for (const run of tentativas) {
    if (!tenantId && run === tentativas[0]) continue
    const { data, error } = await run()
    if (error) continue
    if (data && data.length > 0) {
      if (notaObservacao) {
        await supabaseAdmin.from("vidas_importadas_historico").insert({
          vida_id: vidaId,
          ...(tenantId ? { tenant_id: tenantId } : {}),
          alteracoes: {
            ativo: { antes: vida.ativo ?? true, depois: false },
            observacoes: { antes: vida.observacoes ?? null, depois: observacoes },
          },
        })
      }
      return { ok: true }
    }
  }

  return { ok: false, error: "Não foi possível marcar a vida como inativa" }
}

/**
 * Corrige vidas que têm cancelamento aberto mas ainda constam ativas no cadastro.
 */
export async function sincronizarVidasInativasPorCancelamentos(params: {
  administradoraId: string
  tenantId?: string
  grupoId?: string
}): Promise<{ atualizadas: number; verificadas: number; erros: string[] }> {
  const tenantId = params.tenantId || (await resolverTenantIdAdministradora(params.administradoraId))
  const nota = `Sincronização automática: inativa por cancelamento em ${new Date().toLocaleString("pt-BR")}.`

  const vidaIds = new Set<string>()
  let from = 0
  const PAGE = 1000
  let hasMore = true

  while (hasMore) {
    let q = supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("vida_id, grupo_origem_id")
      .eq("administradora_id", params.administradoraId)
      .in("status_fluxo", [...STATUS_CANCELAMENTO_ABERTO])
      .order("data_solicitacao", { ascending: false })
      .range(from, from + PAGE - 1)

    if (tenantId) q = q.eq("tenant_id", tenantId)

    const { data: chunk, error } = await q
    if (error) throw error
    const list = chunk || []
    for (const row of list) {
      if (params.grupoId && String(row.grupo_origem_id || "") !== params.grupoId) continue
      const vid = String(row.vida_id || "")
      if (vid) vidaIds.add(vid)
    }
    hasMore = list.length === PAGE
    from += PAGE
  }

  const ids = Array.from(vidaIds)
  let atualizadas = 0
  const erros: string[] = []

  for (const idsChunk of chunkArray(ids, CHUNK)) {
    let qVidas = supabaseAdmin
      .from("vidas_importadas")
      .select("id, ativo, observacoes")
      .in("id", idsChunk)
      .eq("administradora_id", params.administradoraId)
      .or("ativo.eq.true,ativo.is.null")

    if (tenantId) qVidas = qVidas.eq("tenant_id", tenantId)

    let { data: vidasAtivas, error: errVidas } = await qVidas
    if (errVidas) throw errVidas

    if ((!vidasAtivas || vidasAtivas.length === 0) && tenantId) {
      const legado = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, ativo, observacoes")
        .in("id", idsChunk)
        .eq("administradora_id", params.administradoraId)
        .or("ativo.eq.true,ativo.is.null")
      vidasAtivas = legado.data
      errVidas = legado.error
      if (errVidas) throw errVidas
    }

    for (const v of (vidasAtivas || []) as VidaRow[]) {
      const res = await inativarVidaImportada({
        vidaId: v.id,
        administradoraId: params.administradoraId,
        tenantId,
        notaObservacao: nota,
      })
      if (res.ok) atualizadas += 1
      else if (res.error) erros.push(`${v.id}: ${res.error}`)
    }
  }

  return { atualizadas, verificadas: ids.length, erros: erros.slice(0, 20) }
}

export async function listarVidaIdsComCancelamentoAberto(params: {
  administradoraId: string
  tenantId?: string
  grupoId?: string
}): Promise<Set<string>> {
  const tenantId = params.tenantId || (await resolverTenantIdAdministradora(params.administradoraId))
  const ids = new Set<string>()
  let from = 0
  const PAGE = 1000
  let hasMore = true

  while (hasMore) {
    let q = supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("vida_id, grupo_origem_id")
      .eq("administradora_id", params.administradoraId)
      .in("status_fluxo", [...STATUS_CANCELAMENTO_ABERTO])
      .range(from, from + PAGE - 1)

    if (tenantId) q = q.eq("tenant_id", tenantId)
    if (params.grupoId) q = q.eq("grupo_origem_id", params.grupoId)

    const { data: chunk, error } = await q
    if (error) throw error
    const list = chunk || []
    for (const row of list) {
      const vid = String(row.vida_id || "")
      if (vid) ids.add(vid)
    }
    hasMore = list.length === PAGE
    from += PAGE
  }

  return ids
}
