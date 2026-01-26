/**
 * Serviço para gerenciamento de tenants
 * Usa API routes quando está no cliente, supabaseAdmin quando está no servidor
 */

import type { Tenant } from '@/lib/tenant-utils'

// Verificar se está no servidor ou cliente
const isServer = typeof window === 'undefined'

export interface CriarTenantData {
  slug: string
  nome: string
  dominio_principal?: string
  subdominio?: string
  status?: 'ativo' | 'inativo' | 'suspenso'
  logo_url?: string
  favicon_url?: string
  cor_primaria?: string
  cor_secundaria?: string
  nome_marca?: string
  email_remetente?: string
  nome_remetente?: string
  dominio_personalizado?: string
  configuracoes?: Record<string, any>
}

export interface EditarTenantData extends Partial<CriarTenantData> {
  id: string
}

/**
 * Lista todos os tenants
 */
export async function listarTenants(): Promise<Tenant[]> {
  try {
    if (isServer) {
      // No servidor, usar supabaseAdmin diretamente
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Erro ao listar tenants: ${error.message}`)
      }
      
      return (data || []) as Tenant[]
    } else {
      // No cliente, usar API route
      const response = await fetch('/api/admin/plataformas')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao listar tenants')
      }
      
      const result = await response.json()
      return result.data || []
    }
  } catch (error: any) {
    console.error('Erro no serviço de tenants:', error)
    throw error
  }
}

/**
 * Busca um tenant por ID
 */
export async function buscarTenantPorId(id: string): Promise<Tenant | null> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Erro ao buscar tenant: ${error.message}`)
      }
      
      return data as Tenant
    } else {
      const response = await fetch(`/api/admin/plataformas?action=get&id=${id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar tenant')
      }
      
      const result = await response.json()
      return result.data
    }
  } catch (error: any) {
    console.error('Erro ao buscar tenant:', error)
    throw error
  }
}

/**
 * Busca um tenant por slug
 */
export async function buscarTenantPorSlug(slug: string): Promise<Tenant | null> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Erro ao buscar tenant: ${error.message}`)
      }
      
      return data as Tenant
    } else {
      const response = await fetch(`/api/admin/plataformas?action=get-by-slug&slug=${slug}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar tenant')
      }
      
      const result = await response.json()
      return result.data
    }
  } catch (error: any) {
    console.error('Erro ao buscar tenant por slug:', error)
    throw error
  }
}

/**
 * Cria um novo tenant
 */
export async function criarTenant(dados: CriarTenantData): Promise<Tenant> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      if (!dados.slug || !dados.nome) {
        throw new Error('Slug e nome são obrigatórios')
      }
      
      const tenantExistente = await buscarTenantPorSlug(dados.slug)
      if (tenantExistente) {
        throw new Error('Já existe um tenant com este slug')
      }
      
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .insert([{
          ...dados,
          status: dados.status || 'ativo',
        }])
        .select()
        .single()
      
      if (error) {
        throw new Error(`Erro ao criar tenant: ${error.message}`)
      }
      
      return data as Tenant
    } else {
      const response = await fetch('/api/admin/plataformas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar tenant')
      }
      
      const result = await response.json()
      return result.data
    }
  } catch (error: any) {
    console.error('Erro ao criar tenant:', error)
    throw error
  }
}

/**
 * Atualiza um tenant existente
 */
export async function atualizarTenant(dados: EditarTenantData): Promise<Tenant> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { id, ...dadosAtualizacao } = dados
      
      if (!id) {
        throw new Error('ID do tenant é obrigatório')
      }
      
      if (dadosAtualizacao.slug) {
        const tenantExistente = await buscarTenantPorSlug(dadosAtualizacao.slug)
        if (tenantExistente && tenantExistente.id !== id) {
          throw new Error('Já existe outro tenant com este slug')
        }
      }
      
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .update(dadosAtualizacao)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Erro ao atualizar tenant: ${error.message}`)
      }
      
      return data as Tenant
    } else {
      const response = await fetch('/api/admin/plataformas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar tenant')
      }
      
      const result = await response.json()
      return result.data
    }
  } catch (error: any) {
    console.error('Erro ao atualizar tenant:', error)
    throw error
  }
}

/**
 * Deleta um tenant (soft delete - muda status para inativo)
 */
export async function deletarTenant(id: string): Promise<void> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ status: 'inativo' })
        .eq('id', id)
      
      if (error) {
        throw new Error(`Erro ao deletar tenant: ${error.message}`)
      }
    } else {
      const response = await fetch(`/api/admin/plataformas?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar tenant')
      }
    }
  } catch (error: any) {
    console.error('Erro ao deletar tenant:', error)
    throw error
  }
}

/**
 * Ativa um tenant
 */
export async function ativarTenant(id: string): Promise<void> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ status: 'ativo' })
        .eq('id', id)
      
      if (error) {
        throw new Error(`Erro ao ativar tenant: ${error.message}`)
      }
    } else {
      const response = await fetch(`/api/admin/plataformas?id=${id}&action=activate`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao ativar tenant')
      }
    }
  } catch (error: any) {
    console.error('Erro ao ativar tenant:', error)
    throw error
  }
}

/**
 * Obtém estatísticas de um tenant
 */
export async function obterEstatisticasTenant(tenantId: string): Promise<{
  totalPropostas: number
  totalCorretores: number
  totalClientes: number
  totalFaturas: number
}> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      const [propostas, corretores, clientes, faturas] = await Promise.all([
        supabaseAdmin
          .from('propostas')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabaseAdmin
          .from('corretores')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabaseAdmin
          .from('clientes_administradoras')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .catch(() => ({ count: 0 })),
        supabaseAdmin
          .from('faturas')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .catch(() => ({ count: 0 })),
      ])
      
      return {
        totalPropostas: propostas.count || 0,
        totalCorretores: corretores.count || 0,
        totalClientes: (clientes as any).count || 0,
        totalFaturas: (faturas as any).count || 0,
      }
    } else {
      const response = await fetch(`/api/admin/plataformas/stats?tenantId=${tenantId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao obter estatísticas')
      }
      
      const result = await response.json()
      return result.data
    }
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return {
      totalPropostas: 0,
      totalCorretores: 0,
      totalClientes: 0,
      totalFaturas: 0,
    }
  }
}

