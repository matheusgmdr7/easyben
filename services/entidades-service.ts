import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface Entidade {
  id: string
  sigla: string
  nome: string
  tenant_id?: string
  created_at?: string
  updated_at?: string
}

export interface CriarEntidadeData {
  sigla: string
  nome: string
}

export interface AtualizarEntidadeData extends Partial<CriarEntidadeData> {}

/**
 * Service para gerenciar entidades
 */
export class EntidadesService {
  /**
   * Buscar todas as entidades do tenant
   */
  static async buscarTodas(): Promise<Entidade[]> {
    try {
      const tenantId = await getCurrentTenantId()

      const { data, error } = await supabase
        .from("entidades")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true })

      if (error) {
        console.error("❌ Erro ao buscar entidades:", error)
        throw error
      }

      return data || []
    } catch (error: any) {
      console.error("❌ Erro ao buscar entidades:", error)
      throw new Error(error.message || "Erro ao buscar entidades")
    }
  }

  /**
   * Buscar entidade por ID
   */
  static async buscarPorId(id: string): Promise<Entidade | null> {
    try {
      const tenantId = await getCurrentTenantId()

      const { data, error } = await supabase
        .from("entidades")
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
      console.error("❌ Erro ao buscar entidade:", error)
      throw new Error(error.message || "Erro ao buscar entidade")
    }
  }

  /**
   * Criar nova entidade
   */
  static async criar(dados: CriarEntidadeData): Promise<Entidade> {
    try {
      const tenantId = await getCurrentTenantId()

      // Verificar se já existe entidade com mesma sigla
      const { data: existente } = await supabase
        .from("entidades")
        .select("id")
        .eq("sigla", dados.sigla.toUpperCase())
        .eq("tenant_id", tenantId)
        .single()

      if (existente) {
        throw new Error("Já existe uma entidade cadastrada com esta sigla")
      }

      const { data, error } = await supabase
        .from("entidades")
        .insert({
          sigla: dados.sigla.toUpperCase(),
          nome: dados.nome,
          tenant_id: tenantId,
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar entidade:", error)
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao criar entidade:", error)
      throw new Error(error.message || "Erro ao criar entidade")
    }
  }

  /**
   * Atualizar entidade
   */
  static async atualizar(id: string, dados: AtualizarEntidadeData): Promise<Entidade> {
    try {
      const tenantId = await getCurrentTenantId()

      // Se sigla foi alterada, verificar se não existe outra com mesma sigla
      if (dados.sigla) {
        const { data: existente } = await supabase
          .from("entidades")
          .select("id")
          .eq("sigla", dados.sigla.toUpperCase())
          .eq("tenant_id", tenantId)
          .neq("id", id)
          .single()

        if (existente) {
          throw new Error("Já existe outra entidade cadastrada com esta sigla")
        }
      }

      const dadosAtualizados: any = { ...dados }
      
      // Converter sigla para maiúscula se fornecida
      if (dadosAtualizados.sigla) {
        dadosAtualizados.sigla = dadosAtualizados.sigla.toUpperCase()
      }

      const { data, error } = await supabase
        .from("entidades")
        .update(dadosAtualizados)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao atualizar entidade:", error)
        throw error
      }

      return data
    } catch (error: any) {
      console.error("❌ Erro ao atualizar entidade:", error)
      throw new Error(error.message || "Erro ao atualizar entidade")
    }
  }

  /**
   * Deletar entidade
   */
  static async deletar(id: string): Promise<void> {
    try {
      const tenantId = await getCurrentTenantId()

      const { error } = await supabase
        .from("entidades")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("❌ Erro ao deletar entidade:", error)
        throw error
      }
    } catch (error: any) {
      console.error("❌ Erro ao deletar entidade:", error)
      throw new Error(error.message || "Erro ao deletar entidade")
    }
  }
}








