import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface CorretorAdministradora {
  id: string
  administradora_id: string
  tenant_id: string | null
  nome: string
  email: string | null
  telefone: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export interface CriarCorretorData {
  administradora_id: string
  nome: string
  email?: string
  telefone?: string
}

export interface AtualizarCorretorData {
  nome?: string
  email?: string
  telefone?: string
  ativo?: boolean
}

export class CorretoresAdministradoraService {
  static async listar(administradoraId: string): Promise<CorretorAdministradora[]> {
    const tenantId = await getCurrentTenantId()
    const { data, error } = await supabaseAdmin
      .from("corretores_administradora")
      .select("*")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true })

    if (error) throw error
    return (data || []) as CorretorAdministradora[]
  }

  static async buscarPorId(
    id: string,
    administradoraId: string
  ): Promise<CorretorAdministradora | null> {
    const tenantId = await getCurrentTenantId()
    const { data, error } = await supabaseAdmin
      .from("corretores_administradora")
      .select("*")
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (error) throw error
    return data as CorretorAdministradora | null
  }

  static async criar(payload: CriarCorretorData): Promise<CorretorAdministradora> {
    const tenantId = await getCurrentTenantId()
    const { data, error } = await supabaseAdmin
      .from("corretores_administradora")
      .insert({
        administradora_id: payload.administradora_id,
        tenant_id: tenantId,
        nome: payload.nome.trim(),
        email: payload.email?.trim() || null,
        telefone: payload.telefone?.trim() || null,
        ativo: true,
      })
      .select()
      .single()

    if (error) throw error
    return data as CorretorAdministradora
  }

  static async atualizar(
    id: string,
    administradoraId: string,
    payload: AtualizarCorretorData
  ): Promise<CorretorAdministradora> {
    const tenantId = await getCurrentTenantId()
    const { data, error } = await supabaseAdmin
      .from("corretores_administradora")
      .update({
        ...payload,
        nome: payload.nome !== undefined ? payload.nome.trim() : undefined,
        email: payload.email !== undefined ? (payload.email?.trim() || null) : undefined,
        telefone: payload.telefone !== undefined ? (payload.telefone?.trim() || null) : undefined,
      })
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) throw error
    return data as CorretorAdministradora
  }

  static async excluir(id: string, administradoraId: string): Promise<void> {
    const tenantId = await getCurrentTenantId()
    const { error } = await supabaseAdmin
      .from("corretores_administradora")
      .delete()
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    if (error) throw error
  }

  /** Lista clientes vinculados a um corretor (clientes_administradoras com corretor_id = id) */
  static async listarClientesDoCorretor(
    corretorId: string,
    administradoraId: string
  ): Promise<{ id: string; cliente_nome: string; cliente_cpf: string | null; cliente_email: string | null; valor_mensal: number; status: string }[]> {
    const { data: raw, error } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id, valor_mensal, status, propostas(nome, cpf, email)")
      .eq("corretor_id", corretorId)
      .eq("administradora_id", administradoraId)
      .order("data_vinculacao", { ascending: false })

    if (error) throw error
    return (raw || []).map((r: { id: string; valor_mensal: number; status: string; propostas: { nome?: string; cpf?: string; email?: string } | null }) => ({
      id: r.id,
      cliente_nome: (r.propostas as { nome?: string })?.nome ?? "",
      cliente_cpf: (r.propostas as { cpf?: string })?.cpf ?? null,
      cliente_email: (r.propostas as { email?: string })?.email ?? null,
      valor_mensal: Number(r.valor_mensal),
      status: r.status,
    }))
  }
}
