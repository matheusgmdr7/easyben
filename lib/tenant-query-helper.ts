/**
 * Helper para adicionar filtro de tenant automaticamente em queries
 * Usa o tenant atual do contexto
 */

import { getTenantSlugClient } from './tenant-utils'
import { supabase } from './supabase'
import type { PostgrestQueryBuilder } from '@supabase/supabase-js'

/**
 * Obtém o tenant slug no servidor
 * Esta função só é executada no servidor e usa next/headers diretamente
 */
async function getTenantSlugServer(): Promise<string> {
  // Esta função só é chamada quando typeof window === 'undefined'
  // então podemos usar next/headers aqui sem problemas
  try {
    // Usar import dinâmico para next/headers para evitar análise estática
    const { headers, cookies } = await import('next/headers')
    
    // Tentar obter do header (definido pelo middleware)
    const headersList = await headers()
    const tenantSlug = headersList.get('x-tenant-slug')
    
    if (tenantSlug) {
      return tenantSlug
    }
    
    // Fallback: tentar obter do cookie
    const cookieStore = await cookies()
    const tenantCookie = cookieStore.get('tenant_slug')
    
    if (tenantCookie?.value) {
      return tenantCookie.value
    }
  } catch (error) {
    console.error('Erro ao obter tenant slug no servidor:', error)
  }
  
  // Fallback final: tenant padrão
  return 'contratando-planos'
}

/**
 * Obtém o tenant_id atual
 * Tenta obter do cookie, depois do contexto
 */
export async function getCurrentTenantId(): Promise<string> {
  // No servidor, obter tenant slug diretamente
  if (typeof window === 'undefined') {
    const slug = await getTenantSlugServer()
    
    // Buscar ID do tenant pelo slug
    const { supabaseAdmin } = await import('./supabase-admin')
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar tenant_id:', error)
    }
    
    return data?.id || '00000000-0000-0000-0000-000000000001' // Fallback para tenant padrão
  }
  
  // No cliente
  const slug = getTenantSlugClient()
  
  // Buscar ID do tenant pelo slug
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'ativo')
    .maybeSingle()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar tenant_id:', error)
  }
  
  return data?.id || '00000000-0000-0000-0000-000000000001' // Fallback para tenant padrão
}

/**
 * Adiciona filtro de tenant automaticamente em uma query
 * @param query - Query builder do Supabase
 * @param tenantId - ID do tenant (opcional, será obtido automaticamente se não fornecido)
 */
export async function withTenantFilter<T>(
  query: any,
  tenantId?: string
): Promise<any> {
  const finalTenantId = tenantId || await getCurrentTenantId()
  
  // Adicionar filtro de tenant
  return query.eq('tenant_id', finalTenantId)
}

/**
 * Cria uma query com filtro de tenant automaticamente
 * @param tableName - Nome da tabela
 * @param tenantId - ID do tenant (opcional)
 */
export async function createTenantQuery(
  tableName: string,
  tenantId?: string
) {
  const finalTenantId = tenantId || await getCurrentTenantId()
  
  return supabase
    .from(tableName)
    .select('*')
    .eq('tenant_id', finalTenantId)
}

/**
 * Insere dados com tenant_id automaticamente
 * @param tableName - Nome da tabela
 * @param data - Dados para inserir
 * @param tenantId - ID do tenant (opcional)
 */
export async function insertWithTenant(
  tableName: string,
  data: any,
  tenantId?: string
) {
  const finalTenantId = tenantId || await getCurrentTenantId()
  
  // Se data for array, adicionar tenant_id em cada item
  if (Array.isArray(data)) {
    data = data.map(item => ({
      ...item,
      tenant_id: finalTenantId,
    }))
  } else {
    data = {
      ...data,
      tenant_id: finalTenantId,
    }
  }
  
  return supabase
    .from(tableName)
    .insert(data)
}

/**
 * Atualiza dados garantindo que o tenant_id não seja alterado
 * @param tableName - Nome da tabela
 * @param id - ID do registro
 * @param data - Dados para atualizar
 * @param tenantId - ID do tenant (opcional)
 */
export async function updateWithTenant(
  tableName: string,
  id: string,
  data: any,
  tenantId?: string
) {
  const finalTenantId = tenantId || await getCurrentTenantId()
  
  // Remover tenant_id dos dados de atualização (não deve ser alterado)
  const { tenant_id, ...dadosAtualizacao } = data
  
  return supabase
    .from(tableName)
    .update(dadosAtualizacao)
    .eq('id', id)
    .eq('tenant_id', finalTenantId) // Garantir que só atualiza do tenant correto
}

