'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getTenantSlugClient } from './tenant-utils'

export interface Tenant {
  id: string
  slug: string
  nome: string
  dominio_principal?: string
  subdominio?: string
  logo_url?: string
  favicon_url?: string
  cor_primaria?: string
  cor_secundaria?: string
  nome_marca?: string
  email_remetente?: string
  nome_remetente?: string
  configuracoes?: Record<string, any>
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const loadTenant = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const slug = getTenantSlugClient()
      
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'ativo')
        .single()
      
      if (fetchError) {
        // Se não encontrar, usar tenant padrão
        console.warn('Tenant não encontrado, usando padrão:', fetchError)
        
        // Tentar carregar tenant padrão
        const { data: defaultTenant, error: defaultError } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', 'contratando-planos')
          .eq('status', 'ativo')
          .single()
        
        if (defaultError || !defaultTenant) {
          // Se nem o padrão existir, criar objeto mínimo
          setTenant({
            id: '00000000-0000-0000-0000-000000000001',
            slug: 'contratando-planos',
            nome: 'Contratando Planos',
            dominio_principal: 'contratandoplanos.com.br',
          })
        } else {
          setTenant(defaultTenant as Tenant)
        }
      } else {
        setTenant(data as Tenant)
      }
    } catch (err: any) {
      console.error('Erro ao carregar tenant:', err)
      setError(err.message || 'Erro ao carregar tenant')
      
      // Fallback para tenant padrão
      setTenant({
        id: '00000000-0000-0000-0000-000000000001',
        slug: 'contratando-planos',
        nome: 'Contratando Planos',
        dominio_principal: 'contratandoplanos.com.br',
      })
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadTenant()
  }, [])
  
  return (
    <TenantContext.Provider value={{ tenant, loading, error, refresh: loadTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de TenantProvider')
  }
  
  return context
}

