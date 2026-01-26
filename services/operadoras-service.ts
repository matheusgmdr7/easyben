import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface Operadora {
  id: string
  nome: string
  fantasia: string
  cnpj: string
  ans: string
  email?: string
  telefone?: string
  cep: string
  endereco: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade: string
  uf: string
  tenant_id?: string
  created_at?: string
  updated_at?: string
}

export interface CriarOperadoraData {
  nome: string
  fantasia: string
  cnpj: string
  ans: string
  email?: string
  telefone?: string
  cep: string
  endereco: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade: string
  uf: string
}

export interface AtualizarOperadoraData extends Partial<CriarOperadoraData> {}

/**
 * Service para gerenciar operadoras
 */
export class OperadorasService {
  /**
   * Buscar todas as operadoras do tenant
   */
  static async buscarTodas(): Promise<Operadora[]> {
    try {
      const tenantId = await getCurrentTenantId()

      const { data, error } = await supabase
        .from("operadoras")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true })

      if (error) {
        console.error("❌ Erro ao buscar operadoras:", error)
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("❌ Erro ao buscar operadoras:", error)
      throw new Error(error.message || "Erro ao buscar operadoras")
    }
  }

  /**
   * Buscar operadora por ID
   */
  static async buscarPorId(id: string): Promise<Operadora | null> {
    try {
      const tenantId = await getCurrentTenantId()

      const { data, error } = await supabase
        .from("operadoras")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao buscar operadora:", error)
      throw new Error(error.message || "Erro ao buscar operadora")
    }
  }

  /**
   * Criar nova operadora
   */
  static async criar(dados: CriarOperadoraData): Promise<Operadora> {
    try {
      const tenantId = await getCurrentTenantId()

      // Verificar se já existe operadora com mesmo CNPJ
      const { data: existente } = await supabase
        .from("operadoras")
        .select("id")
        .eq("cnpj", dados.cnpj.replace(/\D/g, ""))
        .eq("tenant_id", tenantId)
        .single()

      if (existente) {
        throw new Error("Já existe uma operadora cadastrada com este CNPJ")
      }

      const { data, error } = await supabase
        .from("operadoras")
        .insert({
          ...dados,
          cnpj: dados.cnpj.replace(/\D/g, ""), // Remove formatação
          cep: dados.cep.replace(/\D/g, ""), // Remove formatação
          telefone: dados.telefone?.replace(/\D/g, ""), // Remove formatação
          tenant_id: tenantId,
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar operadora:", error)
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao criar operadora:", error)
      throw new Error(error.message || "Erro ao criar operadora")
    }
  }

  /**
   * Atualizar operadora
   */
  static async atualizar(id: string, dados: AtualizarOperadoraData): Promise<Operadora> {
    try {
      const tenantId = await getCurrentTenantId()

      // Se CNPJ foi alterado, verificar se não existe outro com mesmo CNPJ
      if (dados.cnpj) {
        const { data: existente } = await supabase
          .from("operadoras")
          .select("id")
          .eq("cnpj", dados.cnpj.replace(/\D/g, ""))
          .eq("tenant_id", tenantId)
          .neq("id", id)
          .single()

        if (existente) {
          throw new Error("Já existe outra operadora cadastrada com este CNPJ")
        }
      }

      const dadosAtualizados: any = { ...dados }
      
      // Remover formatação de campos se fornecidos
      if (dadosAtualizados.cnpj) {
        dadosAtualizados.cnpj = dadosAtualizados.cnpj.replace(/\D/g, "")
      }
      if (dadosAtualizados.cep) {
        dadosAtualizados.cep = dadosAtualizados.cep.replace(/\D/g, "")
      }
      if (dadosAtualizados.telefone) {
        dadosAtualizados.telefone = dadosAtualizados.telefone.replace(/\D/g, "")
      }

      const { data, error } = await supabase
        .from("operadoras")
        .update(dadosAtualizados)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao atualizar operadora:", error)
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao atualizar operadora:", error)
      throw new Error(error.message || "Erro ao atualizar operadora")
    }
  }

  /**
   * Deletar operadora
   */
  static async deletar(id: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()

      const { error } = await supabase
        .from("operadoras")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("❌ Erro ao deletar operadora:", error)
        throw error
      }
    } catch (error: any) {
      console.error("❌ Erro ao deletar operadora:", error)
      throw new Error(error.message || "Erro ao deletar operadora")
    }
  }
}








