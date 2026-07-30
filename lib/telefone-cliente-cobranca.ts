import { supabaseAdmin } from "@/lib/supabase-admin"

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

/** Ordem: vida importada → proposta/cadastro → snapshot da fatura. */
export function resolverTelefoneClienteCobranca(
  ...fontes: Array<string | null | undefined>
): string | null {
  for (const fonte of fontes) {
    const tel = String(fonte || "").trim()
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
