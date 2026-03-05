import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const hostnameSemPorta = hostname.split(':')[0].toLowerCase()
  const pathname = request.nextUrl.pathname
  const search = request.nextUrl.search
  const pathSegments = pathname.split('/').filter(Boolean)
  const primeiroSegmento = pathSegments[0] || ''
  const segundoSegmento = pathSegments[1] || ''
  const primeiroSegmentoLower = primeiroSegmento.toLowerCase()
  const segundoSegmentoLower = segundoSegmento.toLowerCase()

  // Rotas de portal que hoje existem sem prefixo de tenant.
  // Suportamos URL com tenant no domínio nativo, ex.: /alfa-seguros/admin/login
  const tenantPrefixedPortalRoots = new Set(['admin', 'administradora', 'analista', 'corretor', 'gestor'])
  const dominiosNativosEasyben = new Set(['easyben.com.br', 'www.easyben.com.br'])
  
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
  let tenantResolvidoPorHost = false
  let tenantSlugDoCaminho: string | null = null
  
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
      tenantResolvidoPorHost = true
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
          tenantResolvidoPorHost = true
        }
      }
    }
  } catch (error) {
    console.error('Erro ao detectar tenant:', error)
    // Em caso de erro, usar tenant padrão
    tenantSlug = 'contratando-planos'
  }

  // 3. Fallback por slug no caminho para domínio nativo EasyBen:
  //    ex.: /alfa-seguros ou /alfa-seguros/corretores/equipe/:token
  if (!tenantResolvidoPorHost) {
    const rotasReservadas = new Set([
      'admin',
      'easyben-admin',
      'easyben',
      'administradora',
      'analista',
      'api',
      '_next',
      'favicon.ico',
    ])

    if (primeiroSegmento && !rotasReservadas.has(primeiroSegmentoLower)) {
      const slugBruto = primeiroSegmentoLower.trim()
      const slugSemHifen = slugBruto.replace(/-/g, '')
      const slugComHifenNormalizado = slugBruto
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      const slugsCandidatos = Array.from(new Set([slugBruto, slugSemHifen, slugComHifenNormalizado].filter(Boolean)))

      const { data: tenantByPath } = await supabaseAdmin
        .from('tenants')
        .select('slug')
        .in('slug', slugsCandidatos)
        .eq('status', 'ativo')
        .maybeSingle()

      if (tenantByPath?.slug) {
        tenantSlug = tenantByPath.slug
        tenantSlugDoCaminho = tenantByPath.slug
      } else {
        // Fallback por aliases de slug (configuracoes.slug_aliases)
        for (const slugCandidato of slugsCandidatos) {
          const { data: tenantByAlias } = await supabaseAdmin
            .from('tenants')
            .select('slug, configuracoes')
            .contains('configuracoes', { slug_aliases: [slugCandidato] })
            .eq('status', 'ativo')
            .limit(1)
            .maybeSingle()

          if (tenantByAlias?.slug) {
            tenantSlug = tenantByAlias.slug
            tenantSlugDoCaminho = tenantByAlias.slug
            break
          }
        }
      }
    }
  }

  // Em produção no domínio nativo, evita cair no tenant padrão ao acessar
  // portais sem slug de plataforma (ex.: /admin/login).
  // Exige identificação explícita da plataforma via /{tenant}/...
  const acessandoPortalSemSlug =
    !tenantResolvidoPorHost &&
    !tenantSlugDoCaminho &&
    tenantPrefixedPortalRoots.has(primeiroSegmentoLower)

  if (dominiosNativosEasyben.has(hostnameSemPorta) && acessandoPortalSemSlug) {
    const tenantSlugCookie = (request.cookies.get('tenant_slug')?.value || '').toLowerCase().trim()
    if (tenantSlugCookie) {
      const { data: tenantByCookie } = await supabaseAdmin
        .from('tenants')
        .select('slug')
        .eq('slug', tenantSlugCookie)
        .eq('status', 'ativo')
        .maybeSingle()

      if (tenantByCookie?.slug) {
        tenantSlug = tenantByCookie.slug
      } else {
        const url = request.nextUrl.clone()
        url.pathname = '/404'
        url.search = ''
        return NextResponse.rewrite(url)
      }
    } else {
      const url = request.nextUrl.clone()
      url.pathname = '/404'
      url.search = ''
      return NextResponse.rewrite(url)
    }
  }

  // Se a URL veio com tenant no caminho e rota de portal na sequência,
  // reescreve internamente para a rota sem slug mantendo o contexto do tenant.
  // Mantém robustez mesmo quando o lookup do tenant por slug falhar temporariamente.
  const pathTemPrefixoTenantPortal =
    !!primeiroSegmento &&
    !!segundoSegmento &&
    !tenantPrefixedPortalRoots.has(primeiroSegmentoLower) &&
    segundoSegmentoLower !== 'api' &&
    segundoSegmentoLower !== '_next' &&
    tenantPrefixedPortalRoots.has(segundoSegmentoLower)

  const tenantSlugHeader = tenantSlugDoCaminho || (pathTemPrefixoTenantPortal ? primeiroSegmentoLower : tenantSlug)

  // Adicionar tenant_slug ao header da requisição
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlugHeader)

  const deveReescreverPortalPrefixed = pathTemPrefixoTenantPortal

  const deveReescreverSlugAntigoParaAtual =
    !!tenantSlugDoCaminho &&
    primeiroSegmento &&
    primeiroSegmento.toLowerCase() !== String(tenantSlugDoCaminho).toLowerCase() &&
    !tenantPrefixedPortalRoots.has(segundoSegmentoLower)

  const response = (() => {
    if (deveReescreverPortalPrefixed) {
      const rewriteUrl = new URL(`/${pathSegments.slice(1).join('/')}${search}`, request.url)
      // Evita reaproveitamento indevido de cache por caminho interno compartilhado.
      rewriteUrl.searchParams.set('__tenant', tenantSlugHeader)
      return NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      })
    }

    if (deveReescreverSlugAntigoParaAtual) {
      const rewriteUrl = new URL(`/${tenantSlugDoCaminho}/${pathSegments.slice(1).join('/')}${search}`, request.url)
      rewriteUrl.searchParams.set('__tenant', tenantSlugHeader)
      return NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      })
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  })()
  
  // Evita cache de HTML do portal da administradora no edge/CDN.
  // Isso previne mismatch de assets (_next/static/css hash antigo) após deploy.
  const ehPortalAdministradora =
    primeiroSegmentoLower === 'administradora' || segundoSegmentoLower === 'administradora'
  if (ehPortalAdministradora) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Netlify-CDN-Cache-Control', 'no-store')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    const varyAtual = response.headers.get('Vary')
    const varyLogin = 'x-tenant-slug'
    if (!varyAtual) {
      response.headers.set('Vary', varyLogin)
    } else if (!varyAtual.toLowerCase().includes(varyLogin)) {
      response.headers.set('Vary', `${varyAtual}, ${varyLogin}`)
    }
  }

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

