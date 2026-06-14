import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import type { BeneficiarioChamadoBusca } from "@/services/chamados-administradora-service"

const STATUS_PROPOSTA_ATIVA = ["aprovada", "assinada", "finalizada"] as const
const LIMITE_PADRAO = 40

const SELECTS_VIDAS_IMPORTADAS = [
  "id, grupo_id, nome, cpf, tipo, ativo, emails, telefones, dados_adicionais, cliente_administradora_id",
  "id, grupo_id, nome, cpf, tipo, ativo, emails, dados_adicionais, cliente_administradora_id",
  "id, grupo_id, nome, cpf, tipo, ativo, dados_adicionais, cliente_administradora_id",
] as const

type Registro = Record<string, unknown>

async function buscarPorIdsEmLotes<T extends Registro>(
  tabela: string,
  coluna: string,
  ids: string[],
  aplicarFiltro?: (q: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>
): Promise<T[]> {
  if (!ids.length) return []
  const CHUNK = 200
  const out: T[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    let q = supabaseAdmin.from(tabela).select("*").in(coluna, chunk)
    if (aplicarFiltro) q = aplicarFiltro(q) as typeof q
    const { data, error } = await q
    if (error) throw error
    out.push(...((data || []) as T[]))
  }
  return out
}

function extrairContatoVida(v: Registro): { email: string | null; telefone: string | null } {
  const emails = v.emails
  let email: string | null = null
  if (Array.isArray(emails) && emails[0]) email = String(emails[0]).trim() || null
  else if (v.email) email = String(v.email).trim() || null

  const telefones = v.telefones
  let telefone: string | null = null
  if (Array.isArray(telefones) && telefones.length > 0) {
    const t0 = telefones[0]
    telefone =
      typeof t0 === "object" && t0 && "numero" in t0
        ? String((t0 as { numero?: unknown }).numero || "").trim() || null
        : String(t0 || "").trim() || null
  } else if (v.telefone) {
    telefone = String(v.telefone).trim() || null
  }

  const adic =
    v.dados_adicionais && typeof v.dados_adicionais === "object"
      ? (v.dados_adicionais as Registro)
      : null
  if (!email && adic?.email) email = String(adic.email).trim() || null
  if (!telefone && adic?.telefone) telefone = String(adic.telefone).trim() || null

  return { email, telefone }
}

function cpfDigitos(cpf: unknown): string {
  return String(cpf || "").replace(/\D/g, "")
}

async function listarGruposAdministradora(
  administradoraId: string,
  tenantId: string,
  grupoId?: string
): Promise<Array<{ id: string; nome: string | null }>> {
  async function consultar(comTenant: boolean) {
    let query = supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .eq("administradora_id", administradoraId)
    if (comTenant && tenantId) query = query.eq("tenant_id", tenantId)
    if (grupoId) query = query.eq("id", grupoId)
    return query
  }

  let { data, error } = await consultar(true)
  if (error) throw error
  if (!data?.length && tenantId) {
    const fb = await consultar(false)
    if (fb.error) throw fb.error
    data = fb.data
  }
  return data || []
}

async function buscarVidasImportadasAtivas(params: {
  administradoraId: string
  gruposIds: string[]
  grupoId?: string
  q: string
  limite: number
}): Promise<Array<Registro>> {
  const { administradoraId, gruposIds, grupoId, q, limite } = params
  if (!gruposIds.length) return []

  let ultimoErro: unknown = null

  for (const cols of SELECTS_VIDAS_IMPORTADAS) {
    let query = supabaseAdmin
      .from("vidas_importadas")
      .select(cols)
      .eq("administradora_id", administradoraId)
      .neq("ativo", false)

    if (grupoId) query = query.eq("grupo_id", grupoId)
    else query = query.in("grupo_id", gruposIds)

    if (q.length >= 2) {
      const cpfQ = q.replace(/\D/g, "")
      if (cpfQ.length >= 3) query = query.ilike("cpf", `%${cpfQ}%`)
      else query = query.ilike("nome", `%${q}%`)
    }

    const { data, error } = await query.order("nome", { ascending: true }).limit(limite)
    if (!error) return (data || []) as Array<Registro>
    ultimoErro = error
  }

  if (ultimoErro) throw ultimoErro
  return []
}

async function listarVinculosGrupos(
  gruposIds: string[],
  tenantId: string
): Promise<Array<{ id: string; grupo_id: string; cliente_id: string; cliente_tipo: string }>> {
  if (!gruposIds.length) return []

  async function consultar(comTenant: boolean) {
    let query = supabaseAdmin
      .from("clientes_grupos")
      .select("id, grupo_id, cliente_id, cliente_tipo")
      .in("grupo_id", gruposIds)
    if (comTenant && tenantId) query = query.eq("tenant_id", tenantId)
    return query
  }

  let { data, error } = await consultar(true)
  if (error) throw error
  if (!data?.length && tenantId) {
    const fb = await consultar(false)
    if (fb.error) throw fb.error
    data = fb.data
  }
  return (data || []) as Array<{
    id: string
    grupo_id: string
    cliente_id: string
    cliente_tipo: string
  }>
}

export async function buscarBeneficiariosAtivosParaChamado(params: {
  administradoraId: string
  grupoId?: string
  q?: string
  limite?: number
}): Promise<BeneficiarioChamadoBusca[]> {
  const { administradoraId, grupoId } = params
  const q = String(params.q || "").trim()
  const limite = params.limite ?? LIMITE_PADRAO

  if (q.length < 2 && !grupoId) {
    return []
  }

  const tenantId = await resolveTenantIdForAdministradora(administradoraId)

  const grupos = await listarGruposAdministradora(administradoraId, tenantId, grupoId)
  if (!grupos.length) return []

  const gruposMap = new Map(grupos.map((g) => [String(g.id), String(g.nome || "Grupo")]))
  const gruposIds = [...gruposMap.keys()]
  const resultados = new Map<string, BeneficiarioChamadoBusca>()

  function registrar(item: BeneficiarioChamadoBusca) {
    const cpf = cpfDigitos(item.cpf)
    const dedupe = `${item.grupo_id}:${cpf || item.nome.toLowerCase()}:${item.origem}`
    const existente = resultados.get(dedupe)
    if (!existente) {
      resultados.set(dedupe, item)
      return
    }
    if (existente.origem === "cliente_administradora" && item.origem === "vida_importada") {
      resultados.set(dedupe, item)
    }
  }

  const vidas = await buscarVidasImportadasAtivas({
    administradoraId,
    gruposIds,
    grupoId,
    q,
    limite,
  })

  for (const v of vidas) {
    const grupo_id = String(v.grupo_id || "")
    if (!gruposMap.has(grupo_id)) continue
    const contato = extrairContatoVida(v as Registro)
    registrar({
      chave: `vida:${v.id}`,
      origem: "vida_importada",
      vida_importada_id: String(v.id),
      cliente_administradora_id: v.cliente_administradora_id
        ? String(v.cliente_administradora_id)
        : null,
      grupo_id,
      grupo_nome: gruposMap.get(grupo_id) || "Grupo",
      nome: String(v.nome || "").trim() || "Beneficiário",
      cpf: String(v.cpf || ""),
      email: contato.email,
      telefone: contato.telefone,
      tipo: v.tipo ? String(v.tipo) : null,
    })
  }

  if (resultados.size < limite) {
    const vinculos = await listarVinculosGrupos(gruposIds, tenantId)

    const vinculosRelevantes = vinculos.filter(
      (v) => v.cliente_tipo === "cliente_administradora" || v.cliente_tipo === "proposta"
    )

    const idsCa = vinculosRelevantes
      .filter((v) => v.cliente_tipo === "cliente_administradora")
      .map((v) => String(v.cliente_id))
    const idsProposta = vinculosRelevantes
      .filter((v) => v.cliente_tipo === "proposta")
      .map((v) => String(v.cliente_id))

    const clientesAdm = await buscarPorIdsEmLotes<Registro>(
      "clientes_administradoras",
      "id",
      idsCa,
      (qb) => qb.eq("administradora_id", administradoraId).eq("status", "ativo")
    )
    const propostasDiretas = await buscarPorIdsEmLotes<Registro>("propostas", "id", idsProposta, (qb) =>
      qb.in("status", [...STATUS_PROPOSTA_ATIVA])
    )

    const propostaIdsExtras = clientesAdm
      .map((c) => (c.proposta_id ? String(c.proposta_id) : ""))
      .filter(Boolean)
    const propostasCa = await buscarPorIdsEmLotes<Registro>("propostas", "id", propostaIdsExtras)
    const propostasMap = new Map<string, Registro>()
    for (const p of [...propostasDiretas, ...propostasCa]) {
      propostasMap.set(String(p.id), p)
    }
    const clientesAdmMap = new Map(clientesAdm.map((c) => [String(c.id), c]))

    const casPorProposta = await buscarPorIdsEmLotes<Registro>(
      "clientes_administradoras",
      "proposta_id",
      [...new Set([...idsProposta, ...propostaIdsExtras])],
      (qb) => qb.eq("administradora_id", administradoraId).eq("status", "ativo")
    )
    const caIdPorPropostaId = new Map<string, string>()
    for (const ca of [...clientesAdm, ...casPorProposta]) {
      if (ca.proposta_id) caIdPorPropostaId.set(String(ca.proposta_id), String(ca.id))
    }

    const qLower = q.toLowerCase()
    const cpfQ = q.replace(/\D/g, "")

    for (const v of vinculosRelevantes) {
      if (resultados.size >= limite) break
      const grupo_id = String(v.grupo_id || "")
      if (!gruposMap.has(grupo_id)) continue

      if (v.cliente_tipo === "proposta") {
        const p = propostasMap.get(String(v.cliente_id))
        if (!p) continue
        const caId = caIdPorPropostaId.get(String(v.cliente_id))
        if (!caId) continue
        const nome = String(p.nome || "").trim() || "Beneficiário"
        const cpf = String(p.cpf || "")
        if (q.length >= 2) {
          if (cpfQ.length >= 3 && !cpfDigitos(cpf).includes(cpfQ)) continue
          if (cpfQ.length < 3 && !nome.toLowerCase().includes(qLower)) continue
        }
        registrar({
          chave: `proposta:${v.id}`,
          origem: "cliente_administradora",
          vida_importada_id: null,
          cliente_administradora_id: caId,
          grupo_id,
          grupo_nome: gruposMap.get(grupo_id) || "Grupo",
          nome,
          cpf,
          email: p.email ? String(p.email).trim() : null,
          telefone: p.telefone ? String(p.telefone).trim() : null,
          tipo: "titular",
        })
        continue
      }

      const ca = clientesAdmMap.get(String(v.cliente_id))
      if (!ca) continue
      const p = ca.proposta_id ? propostasMap.get(String(ca.proposta_id)) : undefined
      const nome =
        String(p?.nome || "").trim() ||
        `Cliente ${String(ca.numero_contrato || "").trim()}`.trim() ||
        "Beneficiário"
      const cpf = String(p?.cpf || "")
      if (q.length >= 2) {
        if (cpfQ.length >= 3 && !cpfDigitos(cpf).includes(cpfQ)) continue
        if (cpfQ.length < 3 && !nome.toLowerCase().includes(qLower)) continue
      }
      registrar({
        chave: `ca:${ca.id}`,
        origem: "cliente_administradora",
        vida_importada_id: null,
        cliente_administradora_id: String(ca.id),
        grupo_id,
        grupo_nome: gruposMap.get(grupo_id) || "Grupo",
        nome,
        cpf,
        email: p?.email ? String(p.email).trim() : null,
        telefone: p?.telefone ? String(p.telefone).trim() : null,
        tipo: "titular",
      })
    }
  }

  return [...resultados.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite)
}
