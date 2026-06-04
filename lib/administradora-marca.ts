import { supabase } from "@/lib/supabase-auth"
import { getTenantSlugClient } from "@/lib/tenant-utils"

export type AdministradoraMarcaLike = {
  id?: string
  nome?: string | null
  nome_fantasia?: string | null
  tenant_id?: string | null
}

function normalizarChaveNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Nomes incorretos no cadastro legado → marca exibida em cobranças e comunicações.
 * Preferir sempre `tenants.nome_marca`; isto é rede de segurança.
 */
const NOMES_MARCA_CORRIGIDOS: Record<string, string> = {
  "alfa seguros": "Benefit Cobranças",
  "alfa-seguros": "Benefit Cobranças",
}

const MARCA_POR_TENANT_SLUG: Record<string, string> = {
  benefit: "Benefit Cobranças",
}

export function aplicarCorrecoesNomeMarcaConhecidas(nome: string): string {
  const bruto = String(nome || "").trim()
  if (!bruto) return bruto
  const corrigido = NOMES_MARCA_CORRIGIDOS[normalizarChaveNome(bruto)]
  return corrigido || bruto
}

export function nomeMarcaFallbackLocal(administradora: AdministradoraMarcaLike | null | undefined): string {
  const local = String(administradora?.nome_fantasia || administradora?.nome || "").trim()
  return aplicarCorrecoesNomeMarcaConhecidas(local) || "Administradora"
}

/** Nome da marca para exibição e mensagens (tenant.nome_marca tem prioridade sobre razão social da administradora). */
export async function carregarNomeMarcaExibicao(
  administradora: AdministradoraMarcaLike | null | undefined
): Promise<string> {
  const fallback = nomeMarcaFallbackLocal(administradora)
  const tenantId = String(administradora?.tenant_id || "").trim()

  let marca = fallback

  if (tenantId) {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("nome_marca, nome, slug")
        .eq("id", tenantId)
        .maybeSingle()

      const doTenant = String(data?.nome_marca || data?.nome || "").trim()
      if (doTenant) marca = doTenant

      const slug = String(data?.slug || "").trim().toLowerCase()
      if (slug && MARCA_POR_TENANT_SLUG[slug]) {
        marca = MARCA_POR_TENANT_SLUG[slug]
      }
    } catch {
      // mantém fallback
    }
  }

  if (typeof window !== "undefined") {
    const slugPath = getTenantSlugClient()
    if (slugPath && MARCA_POR_TENANT_SLUG[slugPath]) {
      marca = MARCA_POR_TENANT_SLUG[slugPath]
    }
  }

  return aplicarCorrecoesNomeMarcaConhecidas(marca) || fallback
}
