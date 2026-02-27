"use client"

import { useState, useEffect } from 'react'
import { tenantTemAcesso } from '@/services/recursos-service'
import { getTenantSlugClient } from '@/lib/tenant-utils'
import { supabase } from '@/lib/supabase-auth'

interface UseTenantRecursoResult {
  hasAccess: boolean
  loading: boolean
  error: string | null
}

/**
 * Hook para verificar se o tenant atual tem acesso a um recurso específico
 * 
 * @param codigoRecurso - Código do recurso (ex: 'portal_corretor', 'portal_gestor')
 * @returns { hasAccess, loading, error }
 */
export function useTenantRecurso(codigoRecurso: string): UseTenantRecursoResult {
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verificarAcesso = async () => {
      try {
        setLoading(true)
        setError(null)

        // Obter tenant slug atual
        const tenantSlug = getTenantSlugClient()
        
        if (!tenantSlug) {
          setError('Tenant não identificado')
          setHasAccess(false)
          setLoading(false)
          return
        }

        // Buscar tenant por slug para obter o ID
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .eq('status', 'ativo')
          .single()

        if (tenantError || !tenant) {
          console.warn('Tenant não encontrado ou inativo:', tenantSlug)
          // Se não encontrar tenant, permitir acesso por padrão (fallback para desenvolvimento)
          // Em produção, você pode querer bloquear o acesso
          setHasAccess(true) // Permitir acesso por padrão se tenant não for encontrado
          setLoading(false)
          return
        }

        // Verificar se o tenant tem acesso ao recurso
        const temAcesso = await tenantTemAcesso(tenant.id, codigoRecurso)
        setHasAccess(temAcesso)
      } catch (err: any) {
        console.error('Erro ao verificar acesso ao recurso:', err)
        setError(err.message || 'Erro ao verificar acesso')
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    if (codigoRecurso) {
      verificarAcesso()
    } else {
      setLoading(false)
    }
  }, [codigoRecurso])

  // Garantir que sempre retornamos valores válidos
  return { 
    hasAccess: hasAccess ?? false, 
    loading: loading ?? true, 
    error: error ?? null 
  }
}
