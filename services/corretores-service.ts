import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import type { Corretor } from "@/types/corretores"

export async function buscarCorretores(): Promise<Corretor[]> {
  try {
    const tenantId = await getCurrentTenantId()
    
    const { data, error } = await supabase
      .from("corretores")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar corretores:", error)
      throw new Error(`Erro ao buscar corretores: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Erro ao buscar corretores:", error)
    throw error
  }
}

export async function buscarTodosCorretores(): Promise<Corretor[]> {
  try {
    const tenantId = await getCurrentTenantId()
    
    const { data, error } = await supabase
      .from("corretores")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar corretores:", error)
      throw new Error(`Erro ao buscar corretores: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Erro ao buscar corretores:", error)
    throw error
  }
}

export async function buscarCorretorPorEmail(email: string): Promise<Corretor | null> {
  try {
    const tenantId = await getCurrentTenantId()
    
    const { data, error } = await supabase
      .from("corretores")
      .select("*")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Corretor não encontrado
        return null
      }
      console.error("Erro ao buscar corretor por email:", error)
      throw new Error(`Erro ao buscar corretor por email: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Erro ao buscar corretor por email:", error)
    throw error
  }
}

export async function criarCorretor(corretor: Omit<Corretor, "id" | "created_at">): Promise<Corretor> {
  try {
    console.log("Criando corretor com dados:", JSON.stringify(corretor, null, 2))

    // Primeiro, verificar se o corretor já existe
    const corretorExistente = await buscarCorretorPorEmail(corretor.email)
    if (corretorExistente) {
      console.log("Corretor já existe, retornando dados existentes")
      return corretorExistente
    }

    // Obter tenant_id atual
    const tenantId = await getCurrentTenantId()
    
    // Criar registro na tabela corretores
    const { data, error } = await supabase
      .from("corretores")
      .insert([
        {
          nome: corretor.nome,
          email: corretor.email,
          whatsapp: corretor.whatsapp,
          estado: corretor.estado,
          cidade: corretor.cidade,
          cpf: corretor.cpf,
          data_nascimento: corretor.data_nascimento,
          // Campos financeiros
          cnpj: corretor.cnpj || null,
          chave_pix: corretor.chave_pix || null,
          tipo_chave_pix: corretor.tipo_chave_pix || null,
          banco: corretor.banco || null,
          agencia: corretor.agencia || null,
          conta: corretor.conta || null,
          tipo_conta: corretor.tipo_conta || null,
          nome_titular_conta: corretor.nome_titular_conta || null,
          cpf_cnpj_titular_conta: corretor.cpf_cnpj_titular_conta || null,
          // Campos de gestão
          status: corretor.status || "pendente",
          is_gestor: corretor.is_gestor || false,
          tenant_id: tenantId, // Adicionar tenant_id automaticamente
          gestor_id: (corretor as any).gestor_id || null, // Adicionar gestor_id se fornecido
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar corretor:", error)
      throw new Error(`Erro ao criar corretor: ${error.message}`)
    }

    if (!data) {
      throw new Error("Erro ao criar corretor: Dados não retornados")
    }

    console.log("Corretor criado com sucesso:", data)
    return data
  } catch (error) {
    console.error("Erro ao criar corretor:", error)
    throw error
  }
}

export async function atualizarCorretor(id: string, corretor: Partial<Corretor>): Promise<Corretor> {
  try {
    const tenantId = await getCurrentTenantId()
    
    // Remover tenant_id dos dados de atualização (não deve ser alterado)
    const { tenant_id, ...dadosAtualizacao } = corretor
    
    const { data, error } = await supabase
      .from("corretores")
      .update(dadosAtualizacao)
      .eq("id", id)
      .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar corretor:", error)
      throw new Error(`Erro ao atualizar corretor: ${error.message}`)
    }

    if (!data) {
      throw new Error("Erro ao atualizar corretor: Dados não retornados")
    }

    return data
  } catch (error) {
    console.error("Erro ao atualizar corretor:", error)
    throw error
  }
}

export async function deletarCorretor(id: string): Promise<void> {
  try {
    const tenantId = await getCurrentTenantId()
    
    const { error } = await supabase
      .from("corretores")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId) // Garantir que só deleta do tenant correto

    if (error) {
      console.error("Erro ao deletar corretor:", error)
      throw new Error(`Erro ao deletar corretor: ${error.message}`)
    }
  } catch (error) {
    console.error("Erro ao deletar corretor:", error)
    throw error
  }
}

export async function verificarStatusCorretor(email: string): Promise<string> {
  try {
    const corretor = await buscarCorretorPorEmail(email)

    if (!corretor) {
      throw new Error("Corretor não encontrado")
    }

    return corretor.status || "pendente"
  } catch (error) {
    console.error("Erro ao verificar status do corretor:", error)
    throw error
  }
}
