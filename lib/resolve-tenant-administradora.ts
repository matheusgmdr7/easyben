import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * Tenant usado nas queries da administradora: prioriza o cadastro da administradora
 * (igual à API de vidas-importadas e clientes-fatura). Evita depender só de cookie/header
 * em rotas /api/*, onde o middleware de tenant não roda.
 */
export async function resolveTenantIdForAdministradora(administradoraId: string): Promise<string> {
  const { data: adm } = await supabaseAdmin
    .from("administradoras")
    .select("tenant_id")
    .eq("id", administradoraId)
    .maybeSingle()
  if (adm?.tenant_id && String(adm.tenant_id).trim() !== "") {
    return String(adm.tenant_id).trim()
  }
  return getCurrentTenantId()
}
