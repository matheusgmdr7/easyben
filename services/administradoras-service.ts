import { supabase } from "@/lib/supabase"

export interface Administradora {
  id: string
  nome: string
  cnpj: string
  email?: string
  telefone?: string
  status: "ativa" | "inativa" | "suspensa"
  observacoes?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface CriarAdministradoraData {
  nome: string
  cnpj: string
  email?: string
  telefone?: string
  observacoes?: string
}

export interface ConfiguracaoFinanceira {
  id: string
  administradora_id: string
  instituicao_financeira?: string
  api_key?: string
  api_token?: string
  ambiente: "sandbox" | "producao"
  status_integracao: "ativa" | "inativa" | "erro" | "configurando"
  ultima_sincronizacao?: string
  mensagem_erro?: string
  configuracoes_adicionais?: any
  created_at?: string
  updated_at?: string
}

/**
 * Service para gerenciar administradoras
 */
export class AdministradorasService {
  /**
   * Buscar todas as administradoras
   */
  static async buscarTodas(filtros?: {
    status?: string
    nome?: string
  }): Promise<Administradora[]> {
    try {
      let query = supabase
        .from("administradoras")
        .select("*")
        .order("nome", { ascending: true })

      if (filtros?.status) {
        query = query.eq("status", filtros.status)
      }

      if (filtros?.nome) {
        query = query.ilike("nome", `%${filtros.nome}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error("❌ Erro ao buscar administradoras:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("❌ Erro ao buscar administradoras:", error)
      throw error
    }
  }

  /**
   * Buscar administradora por ID
   */
  static async buscarPorId(id: string): Promise<Administradora | null> {
    try {
      const { data, error } = await supabase
        .from("administradoras")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error("❌ Erro ao buscar administradora:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao buscar administradora:", error)
      throw error
    }
  }

  /**
   * Criar nova administradora
   */
  static async criar(dados: CriarAdministradoraData): Promise<Administradora> {
    try {
      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from("administradoras")
        .insert([
          {
            ...dados,
            status: "ativa",
            created_by: userData?.user?.id,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar administradora:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao criar administradora:", error)
      throw error
    }
  }

  /**
   * Atualizar administradora
   */
  static async atualizar(
    id: string,
    dados: Partial<CriarAdministradoraData>
  ): Promise<Administradora> {
    try {
      const { data, error } = await supabase
        .from("administradoras")
        .update(dados)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao atualizar administradora:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao atualizar administradora:", error)
      throw error
    }
  }

  /**
   * Alterar status da administradora
   */
  static async alterarStatus(
    id: string,
    status: "ativa" | "inativa" | "suspensa"
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("administradoras")
        .update({ status })
        .eq("id", id)

      if (error) {
        console.error("❌ Erro ao alterar status:", error)
        throw error
      }
    } catch (error) {
      console.error("❌ Erro ao alterar status:", error)
      throw error
    }
  }

  /**
   * Deletar administradora (soft delete - apenas inativa)
   */
  static async deletar(id: string): Promise<void> {
    try {
      await this.alterarStatus(id, "inativa")
    } catch (error) {
      console.error("❌ Erro ao deletar administradora:", error)
      throw error
    }
  }

  /**
   * Buscar configuração financeira da administradora
   */
  static async buscarConfiguracaoFinanceira(
    administradoraId: string
  ): Promise<ConfiguracaoFinanceira | null> {
    try {
      const { data, error } = await supabase
        .from("administradoras_config_financeira")
        .select("*")
        .eq("administradora_id", administradoraId)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = não encontrado
        console.error("❌ Erro ao buscar configuração financeira:", error)
        throw error
      }

      return data || null
    } catch (error) {
      console.error("❌ Erro ao buscar configuração financeira:", error)
      throw error
    }
  }

  /**
   * Salvar configuração financeira
   */
  static async salvarConfiguracaoFinanceira(
    administradoraId: string,
    config: {
      instituicao_financeira?: string
      api_key?: string
      api_token?: string
      ambiente?: "sandbox" | "producao"
      status_integracao?: "ativa" | "inativa" | "erro" | "configurando"
      configuracoes_adicionais?: any
    }
  ): Promise<ConfiguracaoFinanceira> {
    try {
      // Verificar se já existe configuração
      const configExistente = await this.buscarConfiguracaoFinanceira(
        administradoraId
      )

      if (configExistente) {
        // Atualizar
        const { data, error } = await supabase
          .from("administradoras_config_financeira")
          .update(config)
          .eq("administradora_id", administradoraId)
          .select()
          .single()

        if (error) {
          console.error("❌ Erro ao atualizar configuração:", error)
          throw error
        }

        return data
      } else {
        // Criar nova
        const { data, error } = await supabase
          .from("administradoras_config_financeira")
          .insert([
            {
              administradora_id: administradoraId,
              ...config,
            },
          ])
          .select()
          .single()

        if (error) {
          console.error("❌ Erro ao criar configuração:", error)
          throw error
        }

        return data
      }
    } catch (error) {
      console.error("❌ Erro ao salvar configuração financeira:", error)
      throw error
    }
  }

  /**
   * Contar clientes ativos por administradora
   */
  static async contarClientesAtivos(administradoraId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("clientes_administradoras")
        .select("*", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("status", "ativo")

      if (error) {
        console.error("❌ Erro ao contar clientes:", error)
        throw error
      }

      return count || 0
    } catch (error) {
      console.error("❌ Erro ao contar clientes:", error)
      throw error
    }
  }

  /**
   * Buscar dashboard da administradora
   */
  static async buscarDashboard(administradoraId: string): Promise<{
    clientes_ativos: number
    clientes_inadimplentes: number
    faturas_pendentes: number
    faturas_atrasadas: number
    faturas_pagas: number
    valor_em_aberto: number
    valor_recebido_mes: number
    valor_atrasado: number
  }> {
    try {
      const { data, error } = await supabase
        .from("vw_dashboard_financeiro")
        .select("*")
        .eq("administradora_id", administradoraId)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar dashboard:", error)
        throw error
      }

      return (
        data || {
          clientes_ativos: 0,
          clientes_inadimplentes: 0,
          faturas_pendentes: 0,
          faturas_atrasadas: 0,
          faturas_pagas: 0,
          valor_em_aberto: 0,
          valor_recebido_mes: 0,
          valor_atrasado: 0,
        }
      )
    } catch (error) {
      console.error("❌ Erro ao buscar dashboard:", error)
      throw error
    }
  }
}
