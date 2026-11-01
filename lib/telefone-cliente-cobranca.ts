import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"

/** Telefone atual do cliente para cobranças — prioriza cadastro sobre snapshot da fatura. */

/** Primeiro número útil em `telefones` (JSONB) ou chaves de contato em `dados_adicionais`. */
export function primeiroTelefoneDeVida(row: Record<string, unknown>): string | null {
  let arr: unknown = row.telefones
  if (typeof arr === "string" && arr.trim()) {
    try {
      arr = JSON.parse(arr) as unknown
    } catch {
      return arr.trim()
    }
  }
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (typeof item === "string") {
        const s = item.trim()
        if (s) return s
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>
        const ddd = String(o.ddd || o.codigo_area || "").replace(/\D/g, "")
        const raw = o.numero ?? o.telefone ?? o.phone ?? o.celular ?? o.whatsapp
        const num = raw != null ? String(raw).trim() : ""
        if (num) return ddd && !num.startsWith(ddd) ? `${ddd}${num}` : num
      }
    }
  }

  const dados = row.dados_adicionais
  if (dados && typeof dados === "object" && !Array.isArray(dados)) {
    for (const [key, val] of Object.entries(dados as Record<string, unknown>)) {
      if (!/telefone|celular|whatsapp|fone/i.test(key)) continue
      const s = val != null ? String(val).trim() : ""
      if (s) return s
    }
  }
  return null
}

/** Ordem: vida importada → proposta/cadastro → snapshot da fatura. Usa o primeiro número válido para WhatsApp. */
export function resolverTelefoneClienteCobranca(
  ...fontes: Array<string | null | undefined>
): string | null {
  for (const fonte of fontes) {
    const tel = normalizarTelefoneWhatsApp(fonte)
    if (tel) return tel
  }
  return null
}

/** Busca telefone atualizado (vidas → proposta → fatura). */
export async function carregarTelefoneAtualClienteCobranca(params: {
  administradoraId: string
  clienteAdministradoraId: string
  telefoneFatura?: string | null
  tenantId?: string | null
}): Promise<string | null> {
  const { administradoraId, clienteAdministradoraId, telefoneFatura, tenantId } = params

  let telVida: string | null = null
  let query = supabaseAdmin
    .from("vidas_importadas")
    .select("telefones, dados_adicionais, tipo")
    .eq("administradora_id", administradoraId)
    .eq("cliente_administradora_id", clienteAdministradoraId)

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  }

  const { data: vidas } = await query
  for (const vida of vidas || []) {
    const tel = primeiroTelefoneDeVida(vida as Record<string, unknown>)
    if (!tel) continue
    if (String((vida as { tipo?: string }).tipo || "").toLowerCase() === "titular") {
      telVida = tel
      break
    }
    telVida = telVida || tel
  }

  const { data: cliente } = await supabaseAdmin
    .from("vw_clientes_administradoras_completo")
    .select("cliente_telefone")
    .eq("id", clienteAdministradoraId)
    .eq("administradora_id", administradoraId)
    .maybeSingle()

  return resolverTelefoneClienteCobranca(
    telVida,
    cliente?.cliente_telefone,
    telefoneFatura
  )
}

/** Telefones de vários clientes numa leva — mesma ordem da busca individual. */
export async function carregarTelefonesCobrancaEmLote(params: {
  administradoraId: string
  tenantId?: string | null
  clientes: Array<{ clienteAdministradoraId: string; telefoneFatura?: string | null }>
}): Promise<Map<string, string>> {
  const porCliente = new Map<string, string | null>()
  for (const c of params.clientes) {
    const id = String(c.clienteAdministradoraId || "").trim()
    if (!id || porCliente.has(id)) continue
    porCliente.set(id, c.telefoneFatura ?? null)
  }
  const ids = Array.from(porCliente.keys())
  const telVida = new Map<string, string>()
  const telCadastro = new Map<string, string>()

  for (let i = 0; i < ids.length; i += 200) {
    const lote = ids.slice(i, i + 200)
    let query = supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, telefones, dados_adicionais, tipo")
      .eq("administradora_id", params.administradoraId)
      .in("cliente_administradora_id", lote)
    if (params.tenantId) {
      query = query.or(`tenant_id.eq.${params.tenantId},tenant_id.is.null`)
    }
    const { data: vidas } = await query
    const titular = new Set<string>()
    for (const vida of vidas || []) {
      const clienteId = String((vida as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      if (!clienteId || titular.has(clienteId)) continue
      const tel = primeiroTelefoneDeVida(vida as Record<string, unknown>)
      if (!tel) continue
      const ehTitular = String((vida as { tipo?: string }).tipo || "").toLowerCase() === "titular"
      if (ehTitular) {
        telVida.set(clienteId, tel)
        titular.add(clienteId)
      } else if (!telVida.has(clienteId)) {
        telVida.set(clienteId, tel)
      }
    }

    const { data: cadastros } = await supabaseAdmin
      .from("vw_clientes_administradoras_completo")
      .select("id, cliente_telefone")
      .eq("administradora_id", params.administradoraId)
      .in("id", lote)
    for (const row of cadastros || []) {
      const id = String((row as { id?: string }).id || "").trim()
      const tel = (row as { cliente_telefone?: string | null }).cliente_telefone
      if (id && tel) telCadastro.set(id, tel)
    }
  }

  const resolvidos = new Map<string, string>()
  for (const [id, telefoneFatura] of porCliente) {
    const tel = resolverTelefoneClienteCobranca(telVida.get(id), telCadastro.get(id), telefoneFatura)
    if (tel) resolvidos.set(id, tel)
  }
  return resolvidos
}
