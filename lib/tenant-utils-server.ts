/**
 * Utilitários para gerenciamento de tenants (SERVER-SIDE ONLY)
 * ⚠️ Este arquivo só pode ser usado em Server Components ou API Routes
 */

import { cookies } from 'next/headers'
import { headers } from 'next/headers'

/**
 * Obtém o slug do tenant atual (server-side)
 * Tenta obter do header primeiro, depois do cookie
 * ⚠️ Só pode ser usado em Server Components ou API Routes
 */
export async function getTenantSlug(): Promise<string> {
  try {
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
    console.error('Erro ao obter tenant slug:', error)
  }
  
  // Fallback final: tenant padrão
  return 'contratando-planos'
}

