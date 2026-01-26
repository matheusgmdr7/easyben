# 🏗️ Plano de Transformação em Plataforma White-Label

## 📋 Visão Geral

Transformar o sistema **Contratando Planos** em uma plataforma white-label multi-tenant, onde:
- **Contratando Planos** será o primeiro tenant (tenant padrão)
- Terceiros poderão usar o sistema com personalização completa
- Todos os dados e configurações existentes serão preservados
- Isolamento completo de dados entre tenants
- Personalização de branding, domínio, emails, etc.

---

## 🎯 Objetivos

1. ✅ Manter 100% dos dados e funcionalidades existentes
2. ✅ Criar sistema de multi-tenancy seguro
3. ✅ Permitir personalização por tenant
4. ✅ Suportar múltiplos domínios/subdomínios
5. ✅ Isolamento completo de dados
6. ✅ Sistema de configurações por tenant
7. ✅ Painel de gestão de tenants (super admin)

---

## 📊 Arquitetura Proposta

### Estratégia de Multi-Tenancy: **Shared Database, Tenant Isolation**

```
┌─────────────────────────────────────────┐
│         PLATAFORMA WHITE-LABEL           │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Tenant 1     │  │ Tenant 2     │    │
│  │ (Contratando │  │ (Cliente 2)  │    │
│  │  Planos)     │  │              │    │
│  └──────────────┘  └──────────────┘    │
│         │                  │             │
│         └────────┬─────────┘             │
│                  │                      │
│         ┌────────▼─────────┐           │
│         │  Banco de Dados   │           │
│         │  (Shared DB)      │           │
│         │  + tenant_id      │           │
│         └──────────────────┘           │
└─────────────────────────────────────────┘
```

---

## 🗄️ FASE 1: Estrutura de Banco de Dados

### 1.1 Criar Tabela de Tenants

```sql
-- Tabela principal de tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- identificador único (ex: 'contratando-planos')
    nome VARCHAR(255) NOT NULL,
    dominio_principal VARCHAR(255) UNIQUE, -- ex: 'contratandoplanos.com.br'
    subdominio VARCHAR(100) UNIQUE, -- ex: 'cliente2' para cliente2.plataforma.com
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    
    -- Configurações de branding
    logo_url TEXT,
    favicon_url TEXT,
    cor_primaria VARCHAR(7), -- hex color
    cor_secundaria VARCHAR(7),
    nome_marca VARCHAR(255),
    
    -- Configurações de email
    email_remetente VARCHAR(255),
    nome_remetente VARCHAR(255),
    
    -- Configurações de domínio
    dominio_personalizado VARCHAR(255), -- ex: 'app.cliente.com'
    ssl_enabled BOOLEAN DEFAULT false,
    
    -- Configurações de integração
    asaas_api_key TEXT, -- criptografado
    resend_api_key TEXT, -- criptografado
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Configurações adicionais (JSONB para flexibilidade)
    configuracoes JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_dominio ON tenants(dominio_principal);
CREATE INDEX idx_tenants_subdominio ON tenants(subdominio);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### 1.2 Migração de Dados Existentes

```sql
-- Script para criar tenant padrão (Contratando Planos)
-- Este script deve ser executado PRIMEIRO

BEGIN;

-- 1. Criar tenant padrão
INSERT INTO tenants (
    id,
    slug,
    nome,
    dominio_principal,
    subdominio,
    status,
    nome_marca,
    cor_primaria,
    cor_secundaria,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, -- ID fixo para tenant padrão
    'contratando-planos',
    'Contratando Planos',
    'contratandoplanos.com.br',
    'contratando-planos',
    'ativo',
    'Contratando Planos',
    '#168979', -- cor atual do sistema
    '#13786a',
    NOW()
) ON CONFLICT (slug) DO NOTHING;

COMMIT;
```

### 1.3 Adicionar tenant_id em Todas as Tabelas

**Estratégia**: Adicionar coluna `tenant_id` em todas as tabelas principais e criar migração para dados existentes.

#### Tabelas Principais que Precisam de tenant_id:

1. **propostas**
2. **corretores**
3. **produtos_corretores**
4. **tabelas_precos**
5. **tabelas_precos_faixas**
6. **administradoras**
7. **clientes_administradoras**
8. **faturas**
9. **comissoes**
10. **usuarios_admin**
11. **leads**
12. **contratos**
13. **questionario_respostas**
14. **dependentes**
15. **documentos**
16. **produto_tabela_relacao**
17. **administradoras_config_financeira**
18. **pagamentos**
19. **logs_integracao_financeira**

#### Script de Migração:

```sql
-- ============================================
-- MIGRAÇÃO: ADICIONAR tenant_id EM TODAS AS TABELAS
-- ============================================
-- Este script adiciona tenant_id e migra dados existentes
-- para o tenant padrão (Contratando Planos)

BEGIN;

-- ID do tenant padrão (fixo)
DO $$
DECLARE
    tenant_padrao_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- 1. PROPOSTAS
    ALTER TABLE propostas 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE propostas 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    ALTER TABLE propostas 
    ALTER COLUMN tenant_id SET NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_propostas_tenant_id ON propostas(tenant_id);
    
    -- 2. CORRETORES
    ALTER TABLE corretores 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE corretores 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    ALTER TABLE corretores 
    ALTER COLUMN tenant_id SET NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_corretores_tenant_id ON corretores(tenant_id);
    
    -- 3. PRODUTOS_CORRETORES
    ALTER TABLE produtos_corretores 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE produtos_corretores 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    ALTER TABLE produtos_corretores 
    ALTER COLUMN tenant_id SET NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_produtos_corretores_tenant_id ON produtos_corretores(tenant_id);
    
    -- Repetir para todas as outras tabelas...
    -- (continuar com o mesmo padrão)
    
END $$;

COMMIT;
```

### 1.4 Atualizar RLS (Row Level Security)

```sql
-- Função helper para obter tenant_id do usuário atual
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Obter tenant_id da sessão (será implementado no middleware)
    RETURN current_setting('app.current_tenant_id', true)::UUID;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de política RLS para propostas
DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
CREATE POLICY "tenant_isolation_propostas"
ON propostas
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());
```

---

## 🔧 FASE 2: Middleware e Detecção de Tenant

### 2.1 Middleware Next.js para Detecção de Tenant

**Arquivo**: `middleware.ts` (raiz do projeto)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Ignorar arquivos estáticos e API routes internas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/internal') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next()
  }
  
  // Detectar tenant pelo domínio/subdomínio
  let tenantSlug: string | null = null
  
  // 1. Verificar domínio personalizado
  const { data: tenantByDomain } = await supabaseAdmin
    .from('tenants')
    .select('slug')
    .eq('dominio_personalizado', hostname)
    .eq('status', 'ativo')
    .single()
  
  if (tenantByDomain) {
    tenantSlug = tenantByDomain.slug
  } else {
    // 2. Verificar subdomínio
    const subdomain = hostname.split('.')[0]
    const { data: tenantBySubdomain } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('subdominio', subdomain)
      .eq('status', 'ativo')
      .single()
    
    if (tenantBySubdomain) {
      tenantSlug = tenantBySubdomain.slug
    } else {
      // 3. Fallback: tenant padrão (Contratando Planos)
      tenantSlug = 'contratando-planos'
    }
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
  
  // Adicionar cookie para persistência (opcional)
  response.cookies.set('tenant_slug', tenantSlug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  })
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### 2.2 Hook para Obter Tenant Atual

**Arquivo**: `lib/tenant-context.ts`

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Tenant {
  id: string
  slug: string
  nome: string
  dominio_principal: string
  logo_url?: string
  cor_primaria?: string
  cor_secundaria?: string
  nome_marca?: string
  configuracoes?: Record<string, any>
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  refresh: () => Promise<void>
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  refresh: async () => {},
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  
  const getTenantSlug = (): string => {
    if (typeof window === 'undefined') return 'contratando-planos'
    
    // 1. Tentar obter do cookie
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('tenant_slug='))
    
    if (cookie) {
      return cookie.split('=')[1]
    }
    
    // 2. Tentar obter do subdomínio
    const hostname = window.location.hostname
    const subdomain = hostname.split('.')[0]
    
    // 3. Fallback: tenant padrão
    return 'contratando-planos'
  }
  
  const loadTenant = async () => {
    try {
      setLoading(true)
      const slug = getTenantSlug()
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'ativo')
        .single()
      
      if (error) throw error
      
      setTenant(data as Tenant)
    } catch (error) {
      console.error('Erro ao carregar tenant:', error)
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
    <TenantContext.Provider value={{ tenant, loading, refresh: loadTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
```

### 2.3 Atualizar Supabase Client para Incluir tenant_id

**Arquivo**: `lib/supabase-tenant.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { useTenant } from './tenant-context'

// Cliente Supabase com filtro automático por tenant
export function createTenantSupabaseClient(tenantId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Interceptar queries para adicionar filtro de tenant
  const originalFrom = supabase.from.bind(supabase)
  
  supabase.from = function(table: string) {
    const query = originalFrom(table)
    
    // Adicionar filtro de tenant automaticamente
    const originalSelect = query.select.bind(query)
    query.select = function(columns?: string) {
      return originalSelect(columns).eq('tenant_id', tenantId)
    }
    
    const originalInsert = query.insert.bind(query)
    query.insert = function(values: any) {
      // Adicionar tenant_id automaticamente
      const valuesWithTenant = Array.isArray(values)
        ? values.map(v => ({ ...v, tenant_id: tenantId }))
        : { ...values, tenant_id: tenantId }
      
      return originalInsert(valuesWithTenant)
    }
    
    return query
  }
  
  return supabase
}
```

---

## 🎨 FASE 3: Sistema de Personalização

### 3.1 Componente de Theme Provider por Tenant

**Arquivo**: `components/theme-provider-tenant.tsx`

```typescript
'use client'

import { useTenant } from '@/lib/tenant-context'
import { useEffect } from 'react'

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant()
  
  useEffect(() => {
    if (!tenant) return
    
    // Aplicar cores do tenant via CSS variables
    const root = document.documentElement
    
    if (tenant.cor_primaria) {
      root.style.setProperty('--primary', tenant.cor_primaria)
    }
    
    if (tenant.cor_secundaria) {
      root.style.setProperty('--secondary', tenant.cor_secundaria)
    }
    
    // Aplicar logo
    if (tenant.logo_url) {
      // Armazenar em contexto ou localStorage
      localStorage.setItem('tenant_logo', tenant.logo_url)
    }
    
    // Aplicar favicon
    if (tenant.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (link) {
        link.href = tenant.favicon_url
      }
    }
    
    // Aplicar nome da marca
    if (tenant.nome_marca) {
      document.title = tenant.nome_marca
    }
  }, [tenant])
  
  return <>{children}</>
}
```

### 3.2 Componente de Header Personalizado

**Arquivo**: `components/header-tenant.tsx`

```typescript
'use client'

import { useTenant } from '@/lib/tenant-context'
import Image from 'next/image'

export function HeaderTenant() {
  const { tenant } = useTenant()
  
  if (!tenant) return null
  
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {tenant.logo_url ? (
          <Image
            src={tenant.logo_url}
            alt={tenant.nome_marca || tenant.nome}
            width={150}
            height={50}
            className="h-12 w-auto"
          />
        ) : (
          <h1 className="text-2xl font-bold" style={{ color: tenant.cor_primaria }}>
            {tenant.nome_marca || tenant.nome}
          </h1>
        )}
        {/* Resto do header */}
      </div>
    </header>
  )
}
```

---

## 🔐 FASE 4: Segurança e Isolamento

### 4.1 Atualizar Todas as Queries para Incluir tenant_id

**Estratégia**: Criar wrapper functions que automaticamente filtram por tenant

**Arquivo**: `lib/tenant-query-wrapper.ts`

```typescript
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/lib/tenant-context'

// Wrapper para queries que automaticamente filtra por tenant
export function withTenantFilter<T>(
  queryBuilder: (tenantId: string) => Promise<T>
): Promise<T> {
  // Obter tenant_id do contexto ou cookie
  const tenantId = getCurrentTenantId()
  
  if (!tenantId) {
    throw new Error('Tenant ID não encontrado')
  }
  
  return queryBuilder(tenantId)
}

function getCurrentTenantId(): string | null {
  if (typeof window === 'undefined') {
    // Server-side: obter do header
    // Será implementado via middleware
    return null
  }
  
  // Client-side: obter do cookie ou contexto
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('tenant_id='))
  
  return cookie ? cookie.split('=')[1] : null
}
```

### 4.2 Atualizar Serviços para Incluir tenant_id

**Exemplo**: `services/propostas-service-tenant.ts`

```typescript
import { supabase } from '@/lib/supabase'
import { getCurrentTenantId } from '@/lib/tenant-utils'

export async function criarProposta(dados: any) {
  const tenantId = getCurrentTenantId()
  
  if (!tenantId) {
    throw new Error('Tenant ID não encontrado')
  }
  
  const { data, error } = await supabase
    .from('propostas')
    .insert({
      ...dados,
      tenant_id: tenantId, // Adicionar tenant_id automaticamente
    })
    .select()
    .single()
  
  if (error) throw error
  
  return data
}

export async function buscarPropostas() {
  const tenantId = getCurrentTenantId()
  
  const { data, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('tenant_id', tenantId) // Filtrar por tenant
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return data
}
```

---

## 🛠️ FASE 5: Painel Super Admin

### 5.1 Página de Gestão de Tenants

**Arquivo**: `app/super-admin/tenants/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModalCriarTenant } from '@/components/super-admin/modal-criar-tenant'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  useEffect(() => {
    loadTenants()
  }, [])
  
  const loadTenants = async () => {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao carregar tenants:', error)
      return
    }
    
    setTenants(data || [])
    setLoading(false)
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestão de Tenants</h1>
        <Button onClick={() => setShowModal(true)}>
          Criar Novo Tenant
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardHeader>
              <CardTitle>{tenant.nome}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Slug:</strong> {tenant.slug}</p>
              <p><strong>Domínio:</strong> {tenant.dominio_principal}</p>
              <p><strong>Status:</strong> {tenant.status}</p>
              {/* Mais informações */}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {showModal && (
        <ModalCriarTenant
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={loadTenants}
        />
      )}
    </div>
  )
}
```

### 5.2 Modal de Criação de Tenant

**Arquivo**: `components/super-admin/modal-criar-tenant.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { toast } from 'sonner'

export function ModalCriarTenant({ isOpen, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    nome: '',
    slug: '',
    dominio_principal: '',
    subdominio: '',
    cor_primaria: '#168979',
    cor_secundaria: '#13786a',
    email_remetente: '',
    nome_remetente: '',
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .insert([formData])
        .select()
        .single()
      
      if (error) throw error
      
      toast.success('Tenant criado com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(`Erro ao criar tenant: ${error.message}`)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <Input
            label="Slug (identificador único)"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
          <Input
            label="Domínio Principal"
            value={formData.dominio_principal}
            onChange={(e) => setFormData({ ...formData, dominio_principal: e.target.value })}
          />
          <Input
            label="Subdomínio"
            value={formData.subdominio}
            onChange={(e) => setFormData({ ...formData, subdominio: e.target.value })}
          />
          {/* Mais campos */}
          <Button type="submit">Criar Tenant</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 📧 FASE 6: Personalização de Emails

### 6.1 Templates de Email por Tenant

**Arquivo**: `services/email-service-tenant.ts`

```typescript
import { useTenant } from '@/lib/tenant-context'

export async function enviarEmailProposta(
  email: string,
  nome: string,
  linkProposta: string,
  tenantId: string
) {
  // Buscar configurações do tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()
  
  // Template de email personalizado
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #333;
          }
          .header {
            background-color: ${tenant.cor_primaria};
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
          }
          .button {
            background-color: ${tenant.cor_primaria};
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${tenant.nome_marca || tenant.nome}</h1>
        </div>
        <div class="content">
          <p>Olá ${nome},</p>
          <p>Sua proposta está pronta! Clique no link abaixo para acessar:</p>
          <a href="${linkProposta}" class="button">Acessar Proposta</a>
        </div>
      </body>
    </html>
  `
  
  // Enviar email usando API key do tenant ou padrão
  const apiKey = tenant.resend_api_key || process.env.RESEND_API_KEY
  
  // Enviar via Resend...
}
```

---

## 🗂️ FASE 7: Storage por Tenant

### 7.1 Buckets Separados por Tenant

**Estratégia**: Criar buckets separados ou usar prefixos no mesmo bucket

```typescript
// lib/storage-tenant.ts
export function getTenantBucket(tenantId: string, tipo: string): string {
  // Opção 1: Buckets separados
  return `tenant-${tenantId}-${tipo}`
  
  // Opção 2: Prefixos no mesmo bucket
  // return `documentos_propostas` (com prefixo no path)
}

export async function uploadFileTenant(
  file: File,
  tenantId: string,
  tipo: string
) {
  const bucket = getTenantBucket(tenantId, tipo)
  const path = `${tenantId}/${tipo}/${file.name}`
  
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(path, file)
  
  if (error) throw error
  
  return data
}
```

---

## 🚀 FASE 8: Deploy e Configuração de Domínios

### 8.1 Configuração de DNS

Para cada tenant:
1. **Subdomínio**: `cliente.plataforma.com` → CNAME para plataforma principal
2. **Domínio Personalizado**: `app.cliente.com` → CNAME para plataforma principal

### 8.2 Configuração no Vercel/Netlify

```javascript
// vercel.json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Tenant-Detection",
          "value": "enabled"
        }
      ]
    }
  ]
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Banco de Dados ✅
- [ ] Criar tabela `tenants`
- [ ] Criar tenant padrão (Contratando Planos)
- [ ] Adicionar `tenant_id` em todas as tabelas
- [ ] Migrar dados existentes para tenant padrão
- [ ] Criar índices para `tenant_id`
- [ ] Atualizar RLS policies

### Fase 2: Middleware ✅
- [ ] Criar middleware de detecção de tenant
- [ ] Implementar detecção por domínio
- [ ] Implementar detecção por subdomínio
- [ ] Criar hook `useTenant`
- [ ] Criar contexto de tenant

### Fase 3: Personalização ✅
- [ ] Criar `TenantThemeProvider`
- [ ] Atualizar componentes para usar cores do tenant
- [ ] Implementar logo personalizado
- [ ] Implementar favicon personalizado
- [ ] Atualizar nome da marca

### Fase 4: Segurança ✅
- [ ] Atualizar todas as queries para filtrar por tenant
- [ ] Criar wrappers de query
- [ ] Atualizar serviços existentes
- [ ] Testar isolamento de dados

### Fase 5: Super Admin ✅
- [ ] Criar página de gestão de tenants
- [ ] Criar modal de criação de tenant
- [ ] Criar modal de edição de tenant
- [ ] Implementar ativação/desativação

### Fase 6: Emails ✅
- [ ] Atualizar templates de email
- [ ] Implementar personalização por tenant
- [ ] Configurar API keys por tenant

### Fase 7: Storage ✅
- [ ] Criar buckets por tenant (ou prefixos)
- [ ] Atualizar upload de arquivos
- [ ] Atualizar download de arquivos

### Fase 8: Deploy ✅
- [ ] Configurar DNS
- [ ] Configurar SSL para domínios personalizados
- [ ] Testar em produção
- [ ] Documentar processo de onboarding

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. **Migração de Dados**
- ✅ Fazer backup completo antes de iniciar
- ✅ Testar migração em ambiente de desenvolvimento
- ✅ Executar migração em horário de baixo tráfego
- ✅ Validar dados após migração

### 2. **Performance**
- ✅ Criar índices em `tenant_id` em todas as tabelas
- ✅ Considerar particionamento de tabelas grandes
- ✅ Monitorar queries lentas

### 3. **Segurança**
- ✅ Validar tenant_id em todas as operações
- ✅ Nunca confiar apenas no client-side
- ✅ Implementar validação server-side
- ✅ Testar isolamento de dados

### 4. **Compatibilidade**
- ✅ Manter compatibilidade com código existente
- ✅ Criar funções de migração gradual
- ✅ Testar todas as funcionalidades após migração

---

## 📊 CRONOGRAMA SUGERIDO

### Semana 1-2: Fase 1 (Banco de Dados)
- Criar estrutura de tenants
- Migrar dados existentes
- Testar isolamento

### Semana 3: Fase 2 (Middleware)
- Implementar detecção de tenant
- Criar contexto e hooks

### Semana 4: Fase 3 (Personalização)
- Implementar temas
- Personalizar componentes

### Semana 5: Fase 4 (Segurança)
- Atualizar queries
- Testar isolamento

### Semana 6: Fase 5-6 (Super Admin e Emails)
- Criar painel de gestão
- Personalizar emails

### Semana 7: Fase 7-8 (Storage e Deploy)
- Configurar storage
- Deploy e testes finais

---

## 🎯 RESULTADO ESPERADO

Após a implementação completa:

1. ✅ **Contratando Planos** continua funcionando normalmente
2. ✅ Todos os dados existentes são preservados
3. ✅ Novos tenants podem ser criados via painel
4. ✅ Cada tenant tem isolamento completo de dados
5. ✅ Personalização completa (cores, logo, domínio, emails)
6. ✅ Sistema escalável para múltiplos clientes
7. ✅ Painel de gestão para super admin

---

**Próximos Passos**: Começar pela Fase 1 (Banco de Dados) e validar cada etapa antes de prosseguir.

