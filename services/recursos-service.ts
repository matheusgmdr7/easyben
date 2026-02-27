/**
 * Serviço para gerenciamento de recursos (páginas/módulos) do sistema
 * Controla quais recursos cada tenant pode acessar
 */

import type { Tenant } from '@/lib/tenant-utils'

// Verificar se está no servidor ou cliente
const isServer = typeof window === 'undefined'

export interface RecursoDisponivel {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  categoria: string
  rota_base: string
  icone: string | null
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface TenantRecurso {
  id: string
  tenant_id: string
  recurso_id: string
  habilitado: boolean
  configuracoes: Record<string, any>
  created_at: string
  updated_at: string
  recurso?: RecursoDisponivel
}

export interface RecursoComStatus extends RecursoDisponivel {
  habilitado: boolean
  tenant_recurso_id?: string
}

/**
 * Lista todos os recursos disponíveis no sistema
 */
export async function listarRecursosDisponiveis(): Promise<RecursoDisponivel[]> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { data, error } = await supabaseAdmin
        .from('recursos_disponiveis')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('categoria', { ascending: true })
        .order('nome', { ascending: true })
      
      if (error) {
        throw new Error(`Erro ao listar recursos: ${error.message}`)
      }
      
      return (data || []) as RecursoDisponivel[]
    } else {
      const response = await fetch('/api/admin/recursos')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao listar recursos')
      }
      
      const result = await response.json()
      return result.data || []
    }
  } catch (error: any) {
    console.error('Erro ao listar recursos:', error)
    throw error
  }
}

/**
 * Lista recursos de um tenant específico com status de habilitação
 */
export async function listarRecursosDoTenant(tenantId: string): Promise<RecursoComStatus[]> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      // Buscar todos os recursos disponíveis
      const { data: recursos, error: recursosError } = await supabaseAdmin
        .from('recursos_disponiveis')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('categoria', { ascending: true })
      
      if (recursosError) {
        throw new Error(`Erro ao buscar recursos: ${recursosError.message}`)
      }
      
      // Buscar recursos habilitados para este tenant
      const { data: tenantRecursos, error: tenantError } = await supabaseAdmin
        .from('tenant_recursos')
        .select('*, recurso:recursos_disponiveis(*)')
        .eq('tenant_id', tenantId)
      
      if (tenantError) {
        throw new Error(`Erro ao buscar recursos do tenant: ${tenantError.message}`)
      }
      
      // Criar mapa de recursos habilitados
      const recursosHabilitadosMap = new Map<string, TenantRecurso>()
      tenantRecursos?.forEach((tr: any) => {
        if (tr.recurso) {
          recursosHabilitadosMap.set(tr.recurso.id, tr)
        }
      })
      
      // Combinar recursos com status de habilitação
      const recursosComStatus: RecursoComStatus[] = (recursos || []).map((recurso: RecursoDisponivel) => {
        const tenantRecurso = recursosHabilitadosMap.get(recurso.id)
        return {
          ...recurso,
          habilitado: tenantRecurso?.habilitado ?? false,
          tenant_recurso_id: tenantRecurso?.id,
        }
      })
      
      return recursosComStatus
    } else {
      const response = await fetch(`/api/admin/recursos/tenant/${tenantId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao listar recursos do tenant')
      }
      
      const result = await response.json()
      return result.data || []
    }
  } catch (error: any) {
    console.error('Erro ao listar recursos do tenant:', error)
    throw error
  }
}

/**
 * Verifica se um tenant tem acesso a um recurso específico
 */
export async function tenantTemAcesso(tenantId: string, codigoRecurso: string): Promise<boolean> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      // Buscar recurso pelo código
      const { data: recurso, error: recursoError } = await supabaseAdmin
        .from('recursos_disponiveis')
        .select('id')
        .eq('codigo', codigoRecurso)
        .eq('ativo', true)
        .single()
      
      if (recursoError || !recurso) {
        return false
      }
      
      // Verificar se está habilitado para o tenant
      const { data: tenantRecurso, error: tenantError } = await supabaseAdmin
        .from('tenant_recursos')
        .select('habilitado')
        .eq('tenant_id', tenantId)
        .eq('recurso_id', recurso.id)
        .single()
      
      if (tenantError || !tenantRecurso) {
        return false
      }
      
      return tenantRecurso.habilitado === true
    } else {
      const response = await fetch(`/api/admin/recursos/verificar-acesso?tenantId=${tenantId}&codigo=${codigoRecurso}`)
      
      if (!response.ok) {
        return false
      }
      
      const result = await response.json()
      return result.habilitado === true
    }
  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return false
  }
}

/**
 * Atualiza recursos habilitados para um tenant
 */
export async function atualizarRecursosTenant(
  tenantId: string,
  recursosHabilitados: { recurso_id: string; habilitado: boolean }[]
): Promise<void> {
  try {
    if (isServer) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      
      // Deletar recursos existentes do tenant
      await supabaseAdmin
        .from('tenant_recursos')
        .delete()
        .eq('tenant_id', tenantId)
      
      // Inserir novos recursos habilitados
      const recursosParaInserir = recursosHabilitados
        .filter(r => r.habilitado)
        .map(r => ({
          tenant_id: tenantId,
          recurso_id: r.recurso_id,
          habilitado: true,
        }))
      
      if (recursosParaInserir.length > 0) {
        const { error } = await supabaseAdmin
          .from('tenant_recursos')
          .insert(recursosParaInserir)
        
        if (error) {
          throw new Error(`Erro ao atualizar recursos: ${error.message}`)
        }
      }
    } else {
      const response = await fetch(`/api/admin/recursos/tenant/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recursos: recursosHabilitados,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar recursos')
      }
    }
  } catch (error: any) {
    console.error('Erro ao atualizar recursos do tenant:', error)
    throw error
  }
}

/**
 * Obtém recursos agrupados por categoria
 */
export function agruparRecursosPorCategoria(recursos: RecursoComStatus[]): Record<string, RecursoComStatus[]> {
  return recursos.reduce((acc, recurso) => {
    const categoria = recurso.categoria || 'outros'
    if (!acc[categoria]) {
      acc[categoria] = []
    }
    acc[categoria].push(recurso)
    return acc
  }, {} as Record<string, RecursoComStatus[]>)
}


