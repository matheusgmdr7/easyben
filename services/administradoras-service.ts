import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface Administradora {
  id: string
  nome: string
  cnpj: string
  email?: string
  telefone?: string
  observacoes?: string
  status: "ativa" | "inativa"
  tenant_id?: string
  created_at?: string
  updated_at?: string
}

export interface CriarAdministradoraData {
  nome: string
  cnpj: string
  email?: string
  telefone?: string
  observacoes?: string
}

export interface AtualizarAdministradoraData extends Partial<CriarAdministradoraData> {}

export interface ConfiguracaoFinanceira {
  id?: string
  administradora_id: string
  taxa_administracao?: number
  dias_vencimento?: number
  forma_pagamento?: string
  observacoes?: string
  created_at?: string
  updated_at?: string
}

/**
 * Service para gerenciar administradoras
 */
export class AdministradorasService {
  /**
   * Buscar todas as administradoras do tenant
   */
  static async buscarTodas(filtros?: { status?: string }): Promise<Administradora[]> {
    try {
      const tenantId = await getCurrentTenantId()
      
      let query = supabase
        .from("administradoras")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true })

      if (filtros?.status) {
        query = query.eq("status", filtros.status)
      }

      const { data, error } = await query

      if (error) {
        console.error("❌ Erro ao buscar administradoras:", error)
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("❌ Erro ao buscar administradoras:", error)
      throw error
    }
  }

  /**
   * Buscar administradora por ID
   */
  static async buscarPorId(id: string): Promise<Administradora> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("administradoras")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single()

      if (error) {
        console.error("❌ Erro ao buscar administradora:", error)
        throw error
      }

      if (!data) {
        throw new Error("Administradora não encontrada")
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao buscar administradora:", error)
      throw error
    }
  }

  /**
   * Criar nova administradora
   */
  static async criar(dados: CriarAdministradoraData): Promise<Administradora> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("administradoras")
        .insert({
          ...dados,
          tenant_id: tenantId,
          status: "ativa",
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar administradora:", error)
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao criar administradora:", error)
      throw error
    }
  }

  /**
   * Atualizar administradora
   */
  static async atualizar(id: string, dados: AtualizarAdministradoraData): Promise<Administradora> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("administradoras")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao atualizar administradora:", error)
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao atualizar administradora:", error)
      throw error
    }
  }

  /**
   * Alterar status da administradora
   */
  static async alterarStatus(id: string, status: "ativa" | "inativa"): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("administradoras")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("❌ Erro ao alterar status:", error)
        throw error
      }
    } catch (error: any) {
      console.error("❌ Erro ao alterar status:", error)
      throw error
    }
  }

  /**
   * Deletar administradora
   */
  static async deletar(id: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("administradoras")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("❌ Erro ao deletar administradora:", error)
        throw error
      }
    } catch (error: any) {
      console.error("❌ Erro ao deletar administradora:", error)
      throw error
    }
  }

  /**
   * Configurar login da administradora
   */
  static async configurarLogin(administradoraId: string, email: string, senha: string): Promise<void> {
    try {
      // Esta função pode ser implementada conforme necessário
      // Por enquanto, apenas um placeholder
      console.log("Configurar login para administradora:", administradoraId)
    } catch (error: any) {
      console.error("❌ Erro ao configurar login:", error)
      throw error
    }
  }

  /**
   * Buscar configuração financeira da administradora
   */
  static async buscarConfiguracaoFinanceira(administradoraId: string): Promise<ConfiguracaoFinanceira | null> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("configuracoes_financeiras")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar configuração financeira:", error)
        throw error
      }

      return data || null
    } catch (error: any) {
      console.error("❌ Erro ao buscar configuração financeira:", error)
      throw error
    }
  }

  /**
   * Salvar configuração financeira da administradora
   */
  static async salvarConfiguracaoFinanceira(
    administradoraId: string,
    config: Partial<ConfiguracaoFinanceira>
  ): Promise<ConfiguracaoFinanceira> {
    try {
      const tenantId = await getCurrentTenantId()
      
      // Verificar se já existe configuração
      const existente = await this.buscarConfiguracaoFinanceira(administradoraId)

      if (existente) {
        // Atualizar
        const { data, error } = await supabase
          .from("configuracoes_financeiras")
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existente.id)
          .eq("tenant_id", tenantId)
          .select()
          .single()

        if (error) {
          console.error("❌ Erro ao atualizar configuração financeira:", error)
          throw error
        }

        return data
      } else {
        // Criar
        const { data, error } = await supabase
          .from("configuracoes_financeiras")
          .insert({
            administradora_id: administradoraId,
            tenant_id: tenantId,
            ...config,
          })
          .select()
          .single()

        if (error) {
          console.error("❌ Erro ao criar configuração financeira:", error)
          throw error
        }

        return data
      }
    } catch (error: any) {
      console.error("❌ Erro ao salvar configuração financeira:", error)
      throw error
    }
  }
}







