import { supabaseAdmin } from "@/lib/supabase-admin"

/** PostgREST falha com `.in()` muito grande (UUIDs); 400 costuma quebrar o fetch. */
const CHUNK_IN = 100

export function normalizarCorretorIdVinculo(corretorId: unknown): string | null {
  if (corretorId === "" || corretorId === undefined || corretorId === null) return null
  const s = String(corretorId).trim()
  return s || null
}

export type SincronizarCorretorParams = {
  administradoraId: string
  tenantId?: string | null
  corretorId: string | null
  clienteAdministradoraIds?: string[]
  vidaIds?: string[]
  grupoId?: string
  registrarHistoricoVidas?: boolean
}

/**
 * Grava o mesmo `corretor_id` (UUID de `corretores_administradora`) em
 * `clientes_administradoras` e em todas as `vidas_importadas` ligadas ao cliente.
 */
export async function sincronizarCorretorClienteEVidas(
  params: SincronizarCorretorParams
): Promise<{ clientesAtualizados: number; vidasAtualizadas: number }> {
  const corretorIdFinal = normalizarCorretorIdVinculo(params.corretorId)
  const administradoraId = String(params.administradoraId || "").trim()
  const tenantId = params.tenantId ? String(params.tenantId).trim() : null

  if (!administradoraId) {
    return { clientesAtualizados: 0, vidasAtualizadas: 0 }
  }

  const clienteIds = new Set(
    (params.clienteAdministradoraIds || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  )
  const vidaIds = new Set(
    (params.vidaIds || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  )

  if (params.grupoId) {
    let qGrupo = supabaseAdmin
      .from("vidas_importadas")
      .select("id, cliente_administradora_id")
      .eq("administradora_id", administradoraId)
      .eq("grupo_id", params.grupoId)
    if (tenantId) qGrupo = qGrupo.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data: vidasGrupo } = await qGrupo
    for (const v of vidasGrupo || []) {
      if (v.id) vidaIds.add(String(v.id))
      const ca = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      if (ca) clienteIds.add(ca)
    }
  }

  if (vidaIds.size > 0) {
    const idsArr = Array.from(vidaIds)
    for (let i = 0; i < idsArr.length; i += CHUNK_IN) {
      const chunk = idsArr.slice(i, i + CHUNK_IN)
      let q = supabaseAdmin
        .from("vidas_importadas")
        .select("id, cliente_administradora_id")
        .eq("administradora_id", administradoraId)
        .in("id", chunk)
      if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      const { data: vidas } = await q
      for (const v of vidas || []) {
        const ca = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
        if (ca) clienteIds.add(ca)
      }
    }
  }

  let clientesAtualizados = 0
  let vidasAtualizadas = 0

  const clienteIdsArr = Array.from(clienteIds)
  for (let i = 0; i < clienteIdsArr.length; i += CHUNK_IN) {
    const chunk = clienteIdsArr.slice(i, i + CHUNK_IN)
    let qUp = supabaseAdmin
      .from("clientes_administradoras")
      .update({ corretor_id: corretorIdFinal })
      .eq("administradora_id", administradoraId)
      .in("id", chunk)
    if (tenantId) qUp = qUp.eq("tenant_id", tenantId)
    const { data } = await qUp.select("id")
    clientesAtualizados += (data || []).length
  }

  const vidasParaAtualizar = new Set<string>(vidaIds)
  for (const clienteId of clienteIds) {
    let qV = supabaseAdmin
      .from("vidas_importadas")
      .select("id, corretor_id")
      .eq("administradora_id", administradoraId)
      .eq("cliente_administradora_id", clienteId)
    if (tenantId) qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data: vidasCliente } = await qV
    for (const v of vidasCliente || []) {
      if (v.id) vidasParaAtualizar.add(String(v.id))
    }
  }

  const vidasArr = Array.from(vidasParaAtualizar)
  for (let i = 0; i < vidasArr.length; i += CHUNK_IN) {
    const chunk = vidasArr.slice(i, i + CHUNK_IN)

    let vidasAntes: Array<{ id: string; corretor_id: string | null }> = []
    if (params.registrarHistoricoVidas && tenantId) {
      let qAntes = supabaseAdmin
        .from("vidas_importadas")
        .select("id, corretor_id")
        .eq("administradora_id", administradoraId)
        .in("id", chunk)
      if (tenantId) qAntes = qAntes.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      const { data } = await qAntes
      vidasAntes = (data || []) as Array<{ id: string; corretor_id: string | null }>
    }

    let qUpV = supabaseAdmin
      .from("vidas_importadas")
      .update({ corretor_id: corretorIdFinal })
      .eq("administradora_id", administradoraId)
      .in("id", chunk)
    if (tenantId) qUpV = qUpV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data: atualizadas } = await qUpV.select("id")
    vidasAtualizadas += (atualizadas || []).length

    if (params.registrarHistoricoVidas && tenantId && vidasAntes.length > 0) {
      const historicoPayload = vidasAntes
        .filter((v) => (v.corretor_id || null) !== corretorIdFinal)
        .map((vida) => ({
          vida_id: vida.id,
          tenant_id: tenantId,
          alteracoes: {
            corretor_id: {
              antes: vida.corretor_id ?? null,
              depois: corretorIdFinal,
            },
          },
        }))
      if (historicoPayload.length > 0) {
        try {
          await supabaseAdmin.from("vidas_importadas_historico").insert(historicoPayload)
        } catch {
          // Histórico complementar; não bloqueia o vínculo.
        }
      }
    }
  }

  return { clientesAtualizados, vidasAtualizadas }
}

/**
 * Corretor do cliente: contrato → proposta → vida importada (primeiro preenchido).
 * Usado em comissão, devedores e demais relatórios.
 */
export async function montarMapaCorretorPorCliente(
  clienteIds: string[],
  administradoraId: string,
  tenantId?: string | null
): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>()
  for (const id of clienteIds) mapa.set(id, null)
  if (clienteIds.length === 0) return mapa

  const propostaPorCliente = new Map<string, string>()

  for (let i = 0; i < clienteIds.length; i += CHUNK_IN) {
    const chunk = clienteIds.slice(i, i + CHUNK_IN)
    const { data: cas } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id, corretor_id, proposta_id")
      .eq("administradora_id", administradoraId)
      .in("id", chunk)

    for (const row of cas || []) {
      const cid = String((row as { id?: string }).id || "").trim()
      if (!cid) continue
      const corretorContrato = (row as { corretor_id?: string | null }).corretor_id
      if (corretorContrato) {
        mapa.set(cid, String(corretorContrato))
        continue
      }
      const propostaId = String((row as { proposta_id?: string }).proposta_id || "").trim()
      if (propostaId) propostaPorCliente.set(cid, propostaId)
    }
  }

  const propostaIds = Array.from(new Set(propostaPorCliente.values()))
  const corretorPorProposta = new Map<string, string>()
  for (let i = 0; i < propostaIds.length; i += CHUNK_IN) {
    const chunk = propostaIds.slice(i, i + CHUNK_IN)
    const { data: propostas } = await supabaseAdmin
      .from("propostas")
      .select("id, corretor_id")
      .in("id", chunk)
    for (const p of propostas || []) {
      const pid = String((p as { id?: string }).id || "").trim()
      const cor = (p as { corretor_id?: string | number | null }).corretor_id
      if (pid && cor != null && String(cor).trim() !== "") {
        corretorPorProposta.set(pid, String(cor).trim())
      }
    }
  }

  for (const [cid, propostaId] of propostaPorCliente) {
    if (mapa.get(cid)) continue
    const cor = corretorPorProposta.get(propostaId)
    if (cor) mapa.set(cid, cor)
  }

  const pendentesVida = clienteIds.filter((id) => !mapa.get(id))
  for (let i = 0; i < pendentesVida.length; i += CHUNK_IN) {
    const chunk = pendentesVida.slice(i, i + CHUNK_IN)
    let qV = supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, corretor_id")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", chunk)

    if (tenantId) {
      qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    }

    const { data: vidas } = await qV
    for (const v of vidas || []) {
      const cid = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      const vidaCor = (v as { corretor_id?: string | null }).corretor_id
      if (cid && vidaCor && !mapa.get(cid)) {
        mapa.set(cid, String(vidaCor))
      }
    }
  }

  return mapa
}

export function normalizarNomeCorretor(nome: string): string {
  return String(nome || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

/** UUID em `corretores_administradora` ou ID legado em `propostas`/`corretores`. */
export function corretorCombinaComFiltro(
  corretorClienteId: string | null,
  corretorFiltro: { id: string; nome: string },
  nomePorCorretorId: Map<string, string>
): boolean {
  if (!corretorClienteId) return false
  if (String(corretorClienteId) === corretorFiltro.id) return true
  const nomeCliente = nomePorCorretorId.get(String(corretorClienteId)) || ""
  if (!nomeCliente) return false
  return normalizarNomeCorretor(nomeCliente) === normalizarNomeCorretor(corretorFiltro.nome)
}

export async function carregarNomesCorretoresLegado(ids: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  const numericos = Array.from(
    new Set(
      ids
        .map((id) => Number(String(id).trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  )
  if (numericos.length === 0) return mapa

  for (let i = 0; i < numericos.length; i += CHUNK_IN) {
    const chunk = numericos.slice(i, i + CHUNK_IN)
    const { data } = await supabaseAdmin.from("corretores").select("id, nome").in("id", chunk)
    for (const row of data || []) {
      const id = String((row as { id?: number }).id ?? "")
      const nome = String((row as { nome?: string }).nome || "").trim()
      if (id && nome) mapa.set(id, nome)
    }
  }
  return mapa
}
