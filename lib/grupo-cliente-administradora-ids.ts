import { supabaseAdmin } from "@/lib/supabase-admin"
import { CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"

async function preencherNomesViewEmChunks(
  ids: string[],
  tenantId: string,
  destino: Record<string, string>
): Promise<void> {
  const falta = ids.filter((id) => id && !destino[id])
  if (falta.length === 0) return

  for (let i = 0; i < falta.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = falta.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data: rows } = await supabaseAdmin
      .from("vw_clientes_administradoras_completo")
      .select("id, cliente_nome")
      .in("id", chunk)
      .eq("tenant_id", tenantId)
    if (!rows?.length) {
      const fb = await supabaseAdmin
        .from("vw_clientes_administradoras_completo")
        .select("id, cliente_nome")
        .in("id", chunk)
      rows = fb.data
    }
    for (const row of rows || []) {
      const id = String((row as { id?: string }).id || "")
      const nome = String((row as { cliente_nome?: string }).cliente_nome || "").trim()
      if (id && nome) destino[id] = nome
    }
  }
}

/**
 * IDs de `clientes_administradoras` vinculados ao grupo (vínculos + vidas importadas), mesmo critério de boletos-grupo.
 */
export async function listarClienteAdministradoraIdsENomesDoGrupo(
  grupoId: string,
  administradoraId: string,
  tenantId: string
): Promise<{ ids: string[]; nomePorId: Record<string, string> }> {
  let { data: vinculos } = await supabaseAdmin
    .from("clientes_grupos")
    .select("id, cliente_id, cliente_tipo")
    .eq("grupo_id", grupoId)
    .eq("tenant_id", tenantId)

  if (!vinculos || vinculos.length === 0) {
    const fb = await supabaseAdmin
      .from("clientes_grupos")
      .select("id, cliente_id, cliente_tipo")
      .eq("grupo_id", grupoId)
    vinculos = fb.data || []
  }

  const clienteIdSet = new Set<string>()
  const nomePorId: Record<string, string> = {}

  const propostaIds = (vinculos || [])
    .filter((v) => v.cliente_tipo === "proposta" && v.cliente_id)
    .map((v) => String(v.cliente_id))

  const propostaIdUnicos = [...new Set(propostaIds)]
  const propostaToCaId = new Map<string, string>()
  if (propostaIdUnicos.length > 0) {
    for (let i = 0; i < propostaIdUnicos.length; i += CHUNK_IN_CLIENTE_IDS) {
      const chunk = propostaIdUnicos.slice(i, i + CHUNK_IN_CLIENTE_IDS)
      let { data: cas } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, proposta_id")
        .in("proposta_id", chunk)
        .eq("tenant_id", tenantId)
      if (!cas?.length) {
        const fb = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id")
          .in("proposta_id", chunk)
        cas = fb.data
      }
      for (const ca of cas || []) {
        const pid = String((ca as { proposta_id?: string }).proposta_id || "")
        const id = String((ca as { id?: string }).id || "")
        if (pid && id && !propostaToCaId.has(pid)) propostaToCaId.set(pid, id)
      }
    }
  }

  for (const v of vinculos || []) {
    if (v.cliente_tipo === "cliente_administradora" && v.cliente_id) {
      clienteIdSet.add(String(v.cliente_id))
      continue
    }
    if (v.cliente_tipo === "proposta" && v.cliente_id) {
      const caId = propostaToCaId.get(String(v.cliente_id))
      if (caId) clienteIdSet.add(caId)
    }
  }

  let { data: vidasComTenant } = await supabaseAdmin
    .from("vidas_importadas")
    .select("id, nome, tipo, cliente_administradora_id")
    .eq("grupo_id", grupoId)
    .eq("administradora_id", administradoraId)
    .eq("tenant_id", tenantId)

  if (!vidasComTenant?.length) {
    const { data: vidasSemTenant } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, tipo, cliente_administradora_id")
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradoraId)
    vidasComTenant = vidasSemTenant || []
  }

  for (const vida of vidasComTenant || []) {
    const caId = (vida as { cliente_administradora_id?: string | null }).cliente_administradora_id
    if (caId && String(caId).trim() !== "") {
      const id = String(caId).trim()
      clienteIdSet.add(id)
      const nm = String((vida as { nome?: string }).nome || "").trim()
      if (nm) nomePorId[id] = nm
    }
  }

  const clienteIds = [...clienteIdSet]
  const idsSemNome = clienteIds.filter((id) => !nomePorId[id])
  await preencherNomesViewEmChunks(idsSemNome, tenantId, nomePorId)

  return { ids: clienteIds, nomePorId }
}
