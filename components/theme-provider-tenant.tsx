'use client'

import { useTenant } from '@/lib/tenant-context'
import { useEffect } from 'react'

/**
 * Provider de tema que aplica as personalizações do tenant
 * (cores, logo, favicon, nome da marca)
 */
export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useTenant()
  
  useEffect(() => {
    if (loading || !tenant) return
    
    const root = document.documentElement
    
    // Aplicar cores do tenant via CSS variables
    if (tenant.cor_primaria) {
      root.style.setProperty('--primary', tenant.cor_primaria)
      root.style.setProperty('--primary-foreground', '#ffffff')
    }
    
    if (tenant.cor_secundaria) {
      root.style.setProperty('--secondary', tenant.cor_secundaria)
      root.style.setProperty('--secondary-foreground', '#ffffff')
    }
    
    // Aplicar logo (armazenar em localStorage para uso em componentes)
    if (tenant.logo_url) {
      localStorage.setItem('tenant_logo', tenant.logo_url)
      // Disparar evento customizado para componentes que precisam atualizar
      window.dispatchEvent(new CustomEvent('tenant-logo-updated', { 
        detail: { logoUrl: tenant.logo_url } 
      }))
    }
    
    // Aplicar favicon
    if (tenant.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = tenant.favicon_url
    }
    
    // Aplicar nome da marca no título
    if (tenant.nome_marca) {
      document.title = tenant.nome_marca
    } else if (tenant.nome) {
      document.title = tenant.nome
    }
    
    // Aplicar meta description se houver
    if (tenant.configuracoes?.meta_description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', tenant.configuracoes.meta_description)
    }
    
  }, [tenant, loading])
  
  return <>{children}</>
}

