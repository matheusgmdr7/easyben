# 🛠️ Como Aplicar Verificação de Recursos nas Rotas

## 📋 Códigos dos Recursos Disponíveis

| Código | Nome | Rota Base |
|--------|------|-----------|
| `portal_corretor` | Portal do Corretor | `/corretor` |
| `portal_gestor` | Portal do Gestor | `/gestor` |
| `portal_administradora` | Portal da Administradora | `/administradora` |
| `portal_admin` | Portal do Administrador | `/admin` |
| `portal_analista` | Portal do Analista | `/analista` |

---

## ✅ Componentes Criados

### 1. Hook `useTenantRecurso`
**Arquivo**: `hooks/use-tenant-recurso.tsx`

Verifica se o tenant atual tem acesso a um recurso específico.

**Uso**:
```typescript
const { hasAccess, loading, error } = useTenantRecurso('portal_corretor')
```

### 2. Componente `RecursoGuard`
**Arquivo**: `components/tenant/recurso-guard.tsx`

Protege rotas baseado em recursos habilitados.

**Uso**:
```typescript
<RecursoGuard codigoRecurso="portal_corretor">
  {children}
</RecursoGuard>
```

---

## 🔧 Como Aplicar nos Layouts

### Exemplo: Layout do Corretor

**Arquivo**: `app/corretor/(dashboard)/layout.tsx`

```typescript
import { RecursoGuard } from '@/components/tenant/recurso-guard'

export default function CorretorDashboardLayout({ children }) {
  return (
    <RecursoGuard 
      codigoRecurso="portal_corretor"
      redirectTo="/"
      showError={true}
    >
      {/* Layout existente */}
      {children}
    </RecursoGuard>
  )
}
```

### Exemplo: Layout do Gestor

**Arquivo**: `app/gestor/(dashboard)/layout.tsx`

```typescript
import { RecursoGuard } from '@/components/tenant/recurso-guard'

export default function GestorDashboardLayout({ children }) {
  return (
    <RecursoGuard 
      codigoRecurso="portal_gestor"
      redirectTo="/corretor/dashboard"
    >
      {/* Layout existente */}
      {children}
    </RecursoGuard>
  )
}
```

---

## 📝 Resumo do Estado Atual

### ✅ O que está funcionando:
1. **Interface de seleção** - Modal permite habilitar/desabilitar recursos
2. **Salvamento** - Recursos são salvos na tabela `tenant_recursos`
3. **Função de verificação** - `tenantTemAcesso()` funciona corretamente
4. **Hook e componente** - `useTenantRecurso` e `RecursoGuard` criados

### ❌ O que falta:
1. **Aplicar nos layouts** - Adicionar `RecursoGuard` nos layouts das rotas protegidas
2. **Testar** - Verificar se o bloqueio funciona na prática

---

## 🎯 Próximos Passos

1. Aplicar `RecursoGuard` em cada layout protegido
2. Testar habilitando/desabilitando recursos
3. Verificar se o acesso é bloqueado corretamente
