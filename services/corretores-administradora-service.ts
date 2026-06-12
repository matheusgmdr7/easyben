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
  private static async resolverTenantId(administradoraId: string): Promise<string> {
    const { data: admRow } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    if (admRow?.tenant_id) return admRow.tenant_id
    return getCurrentTenantId()
  }

  static async listar(administradoraId: string): Promise<CorretorAdministradora[]> {
    const tenantId = await this.resolverTenantId(administradoraId)
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
    const tenantId = await this.resolverTenantId(administradoraId)
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
    const tenantId = await this.resolverTenantId(payload.administradora_id)
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
    const tenantId = await this.resolverTenantId(administradoraId)
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
    const tenantId = await this.resolverTenantId(administradoraId)
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
    const tenantId = await this.resolverTenantId(administradoraId)
    const { data: raw, error } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id, valor_mensal, status, propostas(nome, cpf, email)")
      .eq("corretor_id", corretorId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .order("data_vinculacao", { ascending: false })

    if (error) throw error
    const rows = (raw || []) as Array<{
      id: string
      valor_mensal: number
      status: string
      propostas: { nome?: string; cpf?: string; email?: string } | null
    }>

    const idsSemNomeProposta = rows
      .filter((r) => !String(r.propostas?.nome || "").trim())
      .map((r) => r.id)

    const vidaPorCliente = new Map<string, { nome: string; cpf: string | null; email: string | null }>()
    const CHUNK = 100

    for (let i = 0; i < idsSemNomeProposta.length; i += CHUNK) {
      const chunk = idsSemNomeProposta.slice(i, i + CHUNK)
      let qV = supabaseAdmin
        .from("vidas_importadas")
        .select("cliente_administradora_id, nome, cpf, emails, tipo")
        .eq("administradora_id", administradoraId)
        .in("cliente_administradora_id", chunk)
      if (tenantId) {
        qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      }
      const { data: vidas } = await qV
      for (const v of vidas || []) {
        const cid = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
        if (!cid) continue
        const emails = (v as { emails?: unknown }).emails
        const email =
          Array.isArray(emails) && emails[0] != null && String(emails[0]).trim()
            ? String(emails[0]).trim()
            : null
        const row = {
          nome: String((v as { nome?: string }).nome || "").trim(),
          cpf: (v as { cpf?: string }).cpf ? String((v as { cpf?: string }).cpf) : null,
          email,
        }
        const prev = vidaPorCliente.get(cid)
        const isTitular = String((v as { tipo?: string }).tipo || "").toLowerCase() !== "dependente"
        if (!prev || (isTitular && row.nome)) {
          vidaPorCliente.set(cid, row)
        }
      }
    }

    return rows.map((r) => {
      const prop = r.propostas
      const vida = vidaPorCliente.get(r.id)
      const nome = String(prop?.nome || "").trim() || vida?.nome || ""
      return {
        id: r.id,
        cliente_nome: nome || "Cliente",
        cliente_cpf: prop?.cpf ?? vida?.cpf ?? null,
        cliente_email: prop?.email ?? vida?.email ?? null,
        valor_mensal: Number(r.valor_mensal ?? 0),
        status: r.status,
      }
    })
  }
}
