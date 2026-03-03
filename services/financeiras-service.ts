import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface AdministradoraFinanceira {
  id: string
  administradora_id: string
  tenant_id: string | null
  nome: string
  instituicao_financeira: string
  api_key: string | null
  api_token: string | null
  ambiente: string
  status_integracao: string
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export interface CriarFinanceiraData {
  administradora_id: string
  nome: string
  instituicao_financeira: string
  api_key?: string
  api_token?: string
  ambiente?: string
  status_integracao?: string
}

export interface AtualizarFinanceiraData {
  nome?: string
  instituicao_financeira?: string
  api_key?: string
  api_token?: string
  ambiente?: string
  status_integracao?: string
  ativo?: boolean
}

export class FinanceirasService {
  private static async resolverTenantId(administradoraId: string): Promise<string> {
    const { data: admRow } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    if (admRow?.tenant_id) return admRow.tenant_id
    return getCurrentTenantId()
  }

  static async listar(administradoraId: string): Promise<AdministradoraFinanceira[]> {
    const tenantId = await this.resolverTenantId(administradoraId)
    const { data, error } = await supabaseAdmin
      .from("administradora_financeiras")
      .select("*")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true })

    if (error) throw error
    return (data || []) as AdministradoraFinanceira[]
  }

  static async buscarPorId(
    id: string,
    administradoraId: string
  ): Promise<AdministradoraFinanceira | null> {
    const tenantId = await this.resolverTenantId(administradoraId)
    const { data, error } = await supabaseAdmin
      .from("administradora_financeiras")
      .select("*")
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (error) throw error
    return data as AdministradoraFinanceira | null
  }

  static async criar(
    payload: CriarFinanceiraData
  ): Promise<AdministradoraFinanceira> {
    const tenantId = await this.resolverTenantId(payload.administradora_id)
    const { data, error } = await supabaseAdmin
      .from("administradora_financeiras")
      .insert({
        administradora_id: payload.administradora_id,
        tenant_id: tenantId,
        nome: payload.nome,
        instituicao_financeira: payload.instituicao_financeira || "asaas",
        api_key: payload.api_key || null,
        api_token: payload.api_token || null,
        ambiente: payload.ambiente || "producao",
        status_integracao: payload.api_key ? "ativa" : "inativa",
        ativo: true,
      })
      .select()
      .single()

    if (error) throw error
    return data as AdministradoraFinanceira
  }

  static async atualizar(
    id: string,
    administradoraId: string,
    payload: AtualizarFinanceiraData
  ): Promise<AdministradoraFinanceira> {
    const tenantId = await this.resolverTenantId(administradoraId)
    const update: Record<string, unknown> = { ...payload }
    if (payload.api_key !== undefined) {
      update.status_integracao = payload.api_key ? "ativa" : "inativa"
    }

    const { data, error } = await supabaseAdmin
      .from("administradora_financeiras")
      .update(update)
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) throw error
    return data as AdministradoraFinanceira
  }

  static async excluir(id: string, administradoraId: string): Promise<void> {
    const tenantId = await this.resolverTenantId(administradoraId)
    const { error } = await supabaseAdmin
      .from("administradora_financeiras")
      .delete()
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    if (error) throw error
  }
}
