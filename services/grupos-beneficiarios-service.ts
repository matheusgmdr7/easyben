import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface ContaCedente {
  id: string
  administradora_id: string
  nome: string
  banco: string
  agencia: string
  conta: string
  tipo_conta: "corrente" | "poupanca"
  cpf_cnpj?: string
  nome_titular: string
  codigo_cedente?: string
  carteira?: string
  convenio?: string
  ativo: boolean
  tenant_id?: string
  created_at?: string
  updated_at?: string
}

export interface ConfiguracaoFaturamento {
  id: string
  nome: string
  tipo_faturamento: "asaas" | "banco" | "manual"
  asaas_api_key?: string
  asaas_ambiente?: "producao" | "sandbox"
  conta_cedente_id?: string
  banco_codigo?: string
  banco_nome?: string
  dias_vencimento: number
  instrucoes_boleto?: string
  ativo: boolean
  tenant_id?: string
  created_at?: string
  updated_at?: string
  conta_cedente?: ContaCedente
}

export interface GrupoBeneficiarios {
  id: string
  administradora_id: string
  nome: string
  descricao?: string
  configuracao_faturamento_id?: string
  ativo: boolean
  tenant_id?: string
  created_at?: string
  updated_at?: string
  created_by?: string
  configuracao_faturamento?: ConfiguracaoFaturamento
  total_clientes?: number
}

export interface CriarGrupoData {
  nome: string
  descricao?: string
  configuracao_faturamento_id?: string
}

export interface CriarContaCedenteData {
  nome: string
  banco: string
  agencia: string
  conta: string
  tipo_conta: "corrente" | "poupanca"
  cpf_cnpj?: string
  nome_titular: string
  codigo_cedente?: string
  carteira?: string
  convenio?: string
}

export interface CriarConfiguracaoFaturamentoData {
  nome: string
  tipo_faturamento: "asaas" | "banco" | "manual"
  asaas_api_key?: string
  asaas_ambiente?: "producao" | "sandbox"
  conta_cedente_id?: string
  banco_codigo?: string
  banco_nome?: string
  dias_vencimento?: number
  instrucoes_boleto?: string
}

/**
 * Service para gerenciar grupos de beneficiários
 */
export class GruposBeneficiariosService {
  /**
   * Buscar todos os grupos de uma administradora
   */
  static async buscarTodos(administradoraId: string): Promise<GrupoBeneficiarios[]> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: gruposData, error } = await supabase
        .from("grupos_beneficiarios")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Buscar configurações de faturamento para cada grupo
      const gruposComConfig = await Promise.all(
        (gruposData || []).map(async (grupo) => {
          let configuracaoFaturamento = null
          if (grupo.configuracao_faturamento_id) {
            const { data: configData } = await supabase
              .from("configuracao_faturamento")
              .select(`
                *,
                conta_cedente:contas_cedentes(*)
              `)
              .eq("id", grupo.configuracao_faturamento_id)
              .single()
            
            configuracaoFaturamento = configData
          }
          return { ...grupo, configuracao_faturamento: configuracaoFaturamento }
        })
      )

      const data = gruposComConfig

      if (error) throw error

      // Buscar total de beneficiários: clientes/propostas vinculados (clientes_grupos) + vidas importadas
      const gruposComClientes = await Promise.all(
        (data || []).map(async (grupo) => {
          const { count: countVinculos } = await supabase
            .from("clientes_grupos")
            .select("*", { count: "exact", head: true })
            .eq("grupo_id", grupo.id)
            .eq("tenant_id", tenantId)

          const { count: countVidas } = await supabase
            .from("vidas_importadas")
            .select("*", { count: "exact", head: true })
            .eq("grupo_id", grupo.id)
            .eq("tenant_id", tenantId)

          // Evita dupla contagem:
          // quando há vidas_importadas no grupo, elas já representam o universo de beneficiários.
          // clientes_grupos é usado como vínculo operacional e pode repetir titulares já presentes em vidas.
          const totalBeneficiarios = (countVidas || 0) > 0 ? (countVidas || 0) : (countVinculos || 0)

          return {
            ...grupo,
            total_clientes: totalBeneficiarios,
          }
        })
      )

      return gruposComClientes
    } catch (error) {
      console.error("Erro ao buscar grupos:", error)
      throw error
    }
  }

  /**
   * Buscar grupo por ID
   */
  static async buscarPorId(grupoId: string): Promise<GrupoBeneficiarios | null> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: grupoData, error } = await supabase
        .from("grupos_beneficiarios")
        .select("*")
        .eq("id", grupoId)
        .eq("tenant_id", tenantId)
        .single()

      if (error) throw error

      // Buscar configuração de faturamento se houver
      let configuracaoFaturamento = null
      if (grupoData?.configuracao_faturamento_id) {
        const { data: configData } = await supabase
          .from("configuracao_faturamento")
          .select(`
            *,
            conta_cedente:contas_cedentes(*)
          `)
          .eq("id", grupoData.configuracao_faturamento_id)
          .single()
        
        configuracaoFaturamento = configData
      }

      return { ...grupoData, configuracao_faturamento: configuracaoFaturamento }
    } catch (error) {
      console.error("Erro ao buscar grupo:", error)
      return null
    }
  }

  /**
   * Criar novo grupo
   */
  static async criar(
    administradoraId: string,
    dados: CriarGrupoData
  ): Promise<GrupoBeneficiarios> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("grupos_beneficiarios")
        .insert({
          administradora_id: administradoraId,
          nome: dados.nome,
          descricao: dados.descricao,
          configuracao_faturamento_id: dados.configuracao_faturamento_id,
          tenant_id: tenantId,
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Erro ao criar grupo:", error)
      throw error
    }
  }

  /**
   * Atualizar grupo
   */
  static async atualizar(
    grupoId: string,
    dados: Partial<CriarGrupoData>
  ): Promise<GrupoBeneficiarios> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("grupos_beneficiarios")
        .update({
          nome: dados.nome,
          descricao: dados.descricao,
          configuracao_faturamento_id: dados.configuracao_faturamento_id,
        })
        .eq("id", grupoId)
        .eq("tenant_id", tenantId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error)
      throw error
    }
  }

  /**
   * Deletar grupo
   */
  static async deletar(grupoId: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("grupos_beneficiarios")
        .delete()
        .eq("id", grupoId)
        .eq("tenant_id", tenantId)

      if (error) throw error
    } catch (error) {
      console.error("Erro ao deletar grupo:", error)
      throw error
    }
  }

  /**
   * Alternar status ativo/inativo
   */
  static async alterarStatus(grupoId: string, ativo: boolean): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("grupos_beneficiarios")
        .update({ ativo })
        .eq("id", grupoId)
        .eq("tenant_id", tenantId)

      if (error) throw error
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      throw error
    }
  }
}

/**
 * Service para gerenciar contas cedentes
 */
export class ContasCedentesService {
  /**
   * Buscar todas as contas cedentes de uma administradora
   */
  static async buscarTodas(administradoraId: string): Promise<ContaCedente[]> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("contas_cedentes")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Erro ao buscar contas cedentes:", error)
      throw error
    }
  }

  /**
   * Criar conta cedente
   */
  static async criar(
    administradoraId: string,
    dados: CriarContaCedenteData
  ): Promise<ContaCedente> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("contas_cedentes")
        .insert({
          administradora_id: administradoraId,
          ...dados,
          tenant_id: tenantId,
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Erro ao criar conta cedente:", error)
      throw error
    }
  }

  /**
   * Atualizar conta cedente
   */
  static async atualizar(
    contaId: string,
    dados: Partial<CriarContaCedenteData>
  ): Promise<ContaCedente> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("contas_cedentes")
        .update(dados)
        .eq("id", contaId)
        .eq("tenant_id", tenantId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Erro ao atualizar conta cedente:", error)
      throw error
    }
  }

  /**
   * Deletar conta cedente
   */
  static async deletar(contaId: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("contas_cedentes")
        .delete()
        .eq("id", contaId)
        .eq("tenant_id", tenantId)

      if (error) throw error
    } catch (error) {
      console.error("Erro ao deletar conta cedente:", error)
      throw error
    }
  }
}

/**
 * Service para gerenciar configurações de faturamento
 */
export class ConfiguracaoFaturamentoService {
  /**
   * Buscar configuração por ID
   */
  static async buscarPorId(configId: string): Promise<ConfiguracaoFaturamento | null> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: configData, error } = await supabase
        .from("configuracao_faturamento")
        .select("*")
        .eq("id", configId)
        .eq("tenant_id", tenantId)
        .single()

      if (error) return null

      // Buscar conta cedente se houver
      let contaCedente = null
      if (configData?.conta_cedente_id) {
        const { data: contaData } = await supabase
          .from("contas_cedentes")
          .select("*")
          .eq("id", configData.conta_cedente_id)
          .single()
        
        contaCedente = contaData
      }

      return { ...configData, conta_cedente: contaCedente }
    } catch (error) {
      console.error("Erro ao buscar configuração:", error)
      return null
    }
  }

  /**
   * Buscar todas as configurações de faturamento
   */
  static async buscarTodas(): Promise<ConfiguracaoFaturamento[]> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: configsData, error } = await supabase
        .from("configuracao_faturamento")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome", { ascending: true })

      if (error) throw error

      // Buscar contas cedentes para cada configuração
      const configsComConta = await Promise.all(
        (configsData || []).map(async (config) => {
          let contaCedente = null
          if (config.conta_cedente_id) {
            const { data: contaData } = await supabase
              .from("contas_cedentes")
              .select("*")
              .eq("id", config.conta_cedente_id)
              .single()
            
            contaCedente = contaData
          }
          return { ...config, conta_cedente: contaCedente }
        })
      )

      return configsComConta

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Erro ao buscar configurações:", error)
      throw error
    }
  }

  /**
   * Criar configuração de faturamento
   */
  static async criar(
    dados: CriarConfiguracaoFaturamentoData
  ): Promise<ConfiguracaoFaturamento> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: configData, error } = await supabase
        .from("configuracao_faturamento")
        .insert({
          ...dados,
          dias_vencimento: dados.dias_vencimento || 30,
          tenant_id: tenantId,
          ativo: true,
        })
        .select("*")
        .single()

      if (error) throw error

      // Buscar conta cedente se houver
      let contaCedente = null
      if (configData?.conta_cedente_id) {
        const { data: contaData } = await supabase
          .from("contas_cedentes")
          .select("*")
          .eq("id", configData.conta_cedente_id)
          .single()
        
        contaCedente = contaData
      }

      const data = { ...configData, conta_cedente: contaCedente }

      if (error) throw error
      return data
    } catch (error) {
      console.error("Erro ao criar configuração:", error)
      throw error
    }
  }

  /**
   * Atualizar configuração de faturamento
   */
  static async atualizar(
    configId: string,
    dados: Partial<CriarConfiguracaoFaturamentoData>
  ): Promise<ConfiguracaoFaturamento> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: configData, error } = await supabase
        .from("configuracao_faturamento")
        .update(dados)
        .eq("id", configId)
        .eq("tenant_id", tenantId)
        .select("*")
        .single()

      if (error) throw error

      // Buscar conta cedente se houver
      let contaCedente = null
      if (configData?.conta_cedente_id) {
        const { data: contaData } = await supabase
          .from("contas_cedentes")
          .select("*")
          .eq("id", configData.conta_cedente_id)
          .single()
        
        contaCedente = contaData
      }

      const data = { ...configData, conta_cedente: contaCedente }

      if (error) throw error
      return data
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error)
      throw error
    }
  }

  /**
   * Deletar configuração de faturamento
   */
  static async deletar(configId: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("configuracao_faturamento")
        .delete()
        .eq("id", configId)
        .eq("tenant_id", tenantId)

      if (error) throw error
    } catch (error) {
      console.error("Erro ao deletar configuração:", error)
      throw error
    }
  }

  /**
   * Buscar configuração por ID
   */
  static async buscarPorId(configId: string): Promise<ConfiguracaoFaturamento | null> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data: configData, error } = await supabase
        .from("configuracao_faturamento")
        .select("*")
        .eq("id", configId)
        .eq("tenant_id", tenantId)
        .single()

      if (error) throw error

      // Buscar conta cedente se houver
      let contaCedente = null
      if (configData?.conta_cedente_id) {
        const { data: contaData } = await supabase
          .from("contas_cedentes")
          .select("*")
          .eq("id", configData.conta_cedente_id)
          .single()
        
        contaCedente = contaData
      }

      return { ...configData, conta_cedente: contaCedente }
    } catch (error) {
      console.error("Erro ao buscar configuração:", error)
      return null
    }
  }
}

