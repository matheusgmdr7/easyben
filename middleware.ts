import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Ignorar arquivos estáticos, API routes internas e assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/internal') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }
  
  // Detectar tenant pelo domínio/subdomínio
  let tenantSlug: string = 'contratando-planos' // Fallback padrão
  
  try {
    // 1. Verificar domínio personalizado
    const { data: tenantByDomain, error: domainError } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('dominio_personalizado', hostname)
      .eq('status', 'ativo')
      .single()
    
    if (!domainError && tenantByDomain) {
      tenantSlug = tenantByDomain.slug
    } else {
      // 2. Verificar subdomínio
      const subdomain = hostname.split('.')[0]
      
      // Ignorar subdomínios comuns (www, app, etc)
      const ignoredSubdomains = ['www', 'app', 'api', 'admin']
      if (!ignoredSubdomains.includes(subdomain.toLowerCase())) {
        const { data: tenantBySubdomain, error: subdomainError } = await supabaseAdmin
          .from('tenants')
          .select('slug')
          .eq('subdominio', subdomain)
          .eq('status', 'ativo')
          .single()
        
        if (!subdomainError && tenantBySubdomain) {
          tenantSlug = tenantBySubdomain.slug
        }
      }
    }
  } catch (error) {
    console.error('Erro ao detectar tenant:', error)
    // Em caso de erro, usar tenant padrão
    tenantSlug = 'contratando-planos'
  }

  // 3. Rota /[slug]/corretores/equipe/[token]: usar o primeiro segmento da URL como tenant
  const matchEquipe = pathname.match(/^\/([^/]+)\/corretores\/equipe\/[^/]+$/)
  if (matchEquipe) {
    tenantSlug = matchEquipe[1]
  }

  // Adicionar tenant_slug ao header da requisição
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)
  
  // Criar resposta com header
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Adicionar cookie para persistência (válido por 7 dias)
  response.cookies.set('tenant_slug', tenantSlug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    httpOnly: false, // Permitir acesso via JavaScript
    sameSite: 'lax',
  })
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - mas vamos processar algumas)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - arquivos estáticos (imagens, CSS, JS, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)).*)',
  ],
}

