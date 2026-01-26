# 📋 Plano de Reorganização - White-Label Platform

## 🎯 Objetivo

Transformar o sistema atual em uma plataforma white-label onde:
- A página inicial atual (`app/page.tsx`) se torna um **template reutilizável** de "Página de Cotação"
- Cada tenant (cliente) terá sua própria versão personalizada desta página
- A nova página inicial será a apresentação da plataforma white-label em si

---

## 📊 Estrutura Atual vs. Nova Estrutura

### **Estrutura Atual:**
```
app/
├── page.tsx                    # Página inicial "Contratando Planos"
├── cotacao/page.tsx            # Página de cotação
├── sobre/page.tsx              # Sobre nós
├── contato/page.tsx           # Contato
└── components/
    ├── header.tsx              # Header fixo com branding "Contratando Planos"
    └── footer.tsx              # Footer fixo com branding "Contratando Planos"
```

### **Nova Estrutura (Proposta):**
```
app/
├── page.tsx                    # NOVA: Página inicial da plataforma white-label
├── [tenant-slug]/              # Rotas dinâmicas por tenant
│   ├── page.tsx                # Template de cotação personalizado
│   ├── sobre/page.tsx          # Sobre nós personalizado
│   └── contato/page.tsx        # Contato personalizado
├── templates/                  # Templates reutilizáveis
│   └── cotacao-template.tsx    # Template base de cotação
└── components/
    ├── tenant/                 # Componentes personalizáveis por tenant
    │   ├── tenant-header.tsx   # Header com branding do tenant
    │   ├── tenant-footer.tsx   # Footer com branding do tenant
    │   └── tenant-theme.tsx    # Provider de tema do tenant
    └── platform/               # Componentes da plataforma
        ├── platform-header.tsx # Header da plataforma
        └── platform-footer.tsx # Footer da plataforma
```

---

## 🔧 Fases de Implementação

### **FASE 1: Sistema de Branding e Tema por Tenant**

#### 1.1 Criar Context Provider de Tenant Theme
- **Arquivo**: `components/tenant/tenant-theme-provider.tsx`
- **Função**: Fornecer cores, logos, textos e configurações do tenant atual
- **Dados do Tenant** (já existem na tabela `tenants`):
  - `logo_url`
  - `favicon_url`
  - `cor_primaria`
  - `cor_secundaria`
  - `nome_marca`
  - `email_remetente`
  - `nome_remetente`
  - `configuracoes` (JSONB para configurações extras)

#### 1.2 Criar Hook `useTenantTheme`
- **Arquivo**: `hooks/use-tenant-theme.tsx`
- **Função**: Hook para acessar tema do tenant atual
- **Retorna**:
  ```typescript
  {
    colors: { primary, secondary },
    branding: { logo, favicon, nomeMarca },
    contact: { email, nome },
    config: { ...configuracoes }
  }
  ```

---

### **FASE 2: Componentes Personalizáveis**

#### 2.1 Transformar Header em Componente Tenant
- **Arquivo**: `components/tenant/tenant-header.tsx`
- **Baseado em**: `components/header.tsx`
- **Personalizações**:
  - Logo do tenant (ou texto se não houver logo)
  - Cores do header (usar `cor_primaria` do tenant)
  - Links de navegação (configuráveis via `configuracoes`)
  - Menu de corretores (se habilitado)

#### 2.2 Transformar Footer em Componente Tenant
- **Arquivo**: `components/tenant/tenant-footer.tsx`
- **Baseado em**: `components/footer.tsx`
- **Personalizações**:
  - Email de contato do tenant
  - Redes sociais (se configuradas)
  - Texto de copyright com nome do tenant

#### 2.3 Criar Template de Página de Cotação
- **Arquivo**: `app/templates/cotacao-template.tsx`
- **Baseado em**: `app/page.tsx` atual
- **Características**:
  - Usa `TenantHeader` e `TenantFooter`
  - Cores e textos personalizáveis
  - Seções configuráveis (Hero, Planos, CTA, etc.)

---

### **FASE 3: Roteamento Dinâmico por Tenant**

#### 3.1 Criar Rota Dinâmica `[tenant-slug]`
- **Arquivo**: `app/[tenant-slug]/page.tsx`
- **Função**: Renderizar template de cotação personalizado
- **Lógica**:
  1. Detectar tenant pelo slug na URL
  2. Buscar dados do tenant no banco
  3. Renderizar template com dados do tenant
  4. Fallback para tenant padrão se não encontrado

#### 3.2 Criar Rotas de Páginas Secundárias
- `app/[tenant-slug]/sobre/page.tsx` - Sobre nós personalizado
- `app/[tenant-slug]/contato/page.tsx` - Contato personalizado
- `app/[tenant-slug]/cotacao/page.tsx` - Página de cotação (se diferente da home)

#### 3.3 Atualizar Middleware
- **Arquivo**: `middleware.ts` (já existe)
- **Ajustes**: Garantir que detecta tenant corretamente para rotas `[tenant-slug]`

---

### **FASE 4: Nova Página Inicial da Plataforma**

#### 4.1 Criar Página Inicial da Plataforma
- **Arquivo**: `app/page.tsx` (substituir atual)
- **Conteúdo**: Apresentação da plataforma white-label
- **Seções**:
  - Hero: "Plataforma White-Label de Venda e Gestão de Benefícios"
  - Funcionalidades da plataforma
  - Como funciona
  - Depoimentos/Clientes
  - CTA: "Solicite uma demonstração"

#### 4.2 Criar Componentes da Plataforma
- `components/platform/platform-header.tsx`
- `components/platform/platform-footer.tsx`
- `components/platform/platform-hero.tsx`

---

### **FASE 5: Migração e Compatibilidade**

#### 5.1 Manter Compatibilidade com Rotas Antigas
- **Estratégia**: Redirecionar rotas antigas para tenant padrão
- Exemplo: `/cotacao` → `/[tenant-slug]/cotacao` (tenant padrão)

#### 5.2 Migrar Dados Existentes
- Garantir que tenant padrão "Contratando Planos" tenha todas as configurações
- Migrar conteúdo da página atual para configuração do tenant

---

## 🗂️ Estrutura de Arquivos Detalhada

```
app/
├── page.tsx                              # NOVA: Plataforma white-label
├── [tenant-slug]/                        # Rotas dinâmicas por tenant
│   ├── page.tsx                          # Home/Cotação do tenant
│   ├── sobre/
│   │   └── page.tsx                      # Sobre nós do tenant
│   ├── contato/
│   │   └── page.tsx                      # Contato do tenant
│   └── cotacao/
│       └── page.tsx                      # Cotação detalhada (se necessário)
├── templates/                            # Templates reutilizáveis
│   ├── cotacao-template.tsx             # Template base de cotação
│   ├── sobre-template.tsx                # Template base "sobre nós"
│   └── contato-template.tsx              # Template base "contato"
└── ...

components/
├── tenant/                               # Componentes personalizáveis
│   ├── tenant-theme-provider.tsx         # Provider de tema
│   ├── tenant-header.tsx                 # Header personalizado
│   ├── tenant-footer.tsx                # Footer personalizado
│   └── tenant-layout.tsx                # Layout wrapper do tenant
├── platform/                             # Componentes da plataforma
│   ├── platform-header.tsx               # Header da plataforma
│   ├── platform-footer.tsx              # Footer da plataforma
│   └── platform-hero.tsx                # Hero da plataforma
└── ...

hooks/
├── use-tenant-theme.tsx                  # Hook para tema do tenant
└── use-tenant-config.tsx                 # Hook para configurações do tenant

lib/
├── tenant-theme.ts                       # Utilitários de tema
└── tenant-config.ts                      # Utilitários de configuração
```

---

## 🎨 Sistema de Personalização

### **Configurações do Tenant (tabela `tenants`):**

```typescript
interface TenantConfig {
  // Branding Visual
  logo_url?: string
  favicon_url?: string
  cor_primaria: string        // Ex: "#168979"
  cor_secundaria?: string     // Ex: "#13786a"
  nome_marca: string          // Ex: "Contratando Planos"
  
  // Contato
  email_remetente?: string
  nome_remetente?: string
  
  // Configurações Extras (JSONB)
  configuracoes?: {
    // Navegação
    menuItems?: Array<{
      label: string
      href: string
      visible: boolean
    }>
    
    // Seções da Página
    secoes?: {
      hero?: {
        titulo?: string
        subtitulo?: string
        imagem?: string
        ctaTexto?: string
      }
      planos?: {
        titulo?: string
        descricao?: string
        mostrarOperadoras?: boolean
      }
      sobre?: {
        titulo?: string
        conteudo?: string
        imagem?: string
      }
    }
    
    // Funcionalidades
    funcionalidades?: {
      mostrarCorretores?: boolean
      mostrarCotacao?: boolean
      mostrarSobre?: boolean
      mostrarContato?: boolean
    }
    
    // Redes Sociais
    redesSociais?: {
      instagram?: string
      facebook?: string
      linkedin?: string
    }
  }
}
```

---

## 🔄 Fluxo de Renderização

### **Para Rotas de Tenant (`/[tenant-slug]/*`):**

1. **Middleware** detecta tenant pelo slug
2. **Layout do Tenant** (`tenant-layout.tsx`):
   - Busca dados do tenant
   - Aplica tema (cores, CSS variables)
   - Renderiza `TenantHeader` e `TenantFooter`
3. **Página** renderiza template com dados do tenant
4. **Componentes** usam `useTenantTheme()` para personalização

### **Para Rota da Plataforma (`/`):**

1. Renderiza página inicial da plataforma
2. Usa `PlatformHeader` e `PlatformFooter`
3. Conteúdo fixo sobre a plataforma white-label

---

## 📝 Próximos Passos

1. ✅ Criar estrutura de pastas
2. ✅ Implementar `TenantThemeProvider`
3. ✅ Criar `useTenantTheme` hook
4. ✅ Transformar Header em componente tenant
5. ✅ Transformar Footer em componente tenant
6. ✅ Criar template de cotação
7. ✅ Implementar roteamento dinâmico `[tenant-slug]`
8. ✅ Criar nova página inicial da plataforma
9. ✅ Testar com tenant padrão
10. ✅ Migrar conteúdo existente

---

## ⚠️ Considerações Importantes

1. **Compatibilidade**: Manter rotas antigas funcionando durante transição
2. **Performance**: Cache de dados do tenant (usar React Query ou SWR)
3. **SEO**: Meta tags personalizadas por tenant
4. **Segurança**: Validar que tenant existe e está ativo antes de renderizar
5. **Fallback**: Sempre ter fallback para tenant padrão se tenant não encontrado

---

## 🎯 Resultado Final

- ✅ Cada tenant terá sua própria página de cotação personalizada
- ✅ Branding completo (cores, logos, textos) por tenant
- ✅ Funcionalidades existentes reutilizáveis
- ✅ Nova página inicial para apresentação da plataforma
- ✅ Sistema escalável para novos tenants

