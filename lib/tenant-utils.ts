/**
 * Utilitários para gerenciamento de tenants
 * Funções client-side (podem ser usadas em Client Components)
 */

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

/**
 * Obtém o slug do tenant atual (client-side)
 * Pode ser usado em Client Components
 */
export function getTenantSlugClient(): string {
  if (typeof window === 'undefined') {
    return 'contratando-planos'
  }
  
  // Tentar obter do cookie
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('tenant_slug='))
  
  if (cookie) {
    return cookie.split('=')[1]
  }
  
  // Tentar obter do subdomínio
  const hostname = window.location.hostname
  const subdomain = hostname.split('.')[0]
  
  // Ignorar subdomínios comuns
  const ignoredSubdomains = ['www', 'app', 'api', 'admin', 'localhost']
  if (!ignoredSubdomains.includes(subdomain.toLowerCase())) {
    return subdomain
  }
  
  // Fallback: tenant padrão
  return 'contratando-planos'
}

/**
 * Obtém o ID do tenant padrão (fixo)
 */
export function getDefaultTenantId(): string {
  return '00000000-0000-0000-0000-000000000001'
}

