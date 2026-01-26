# 🔍 Explicação Detalhada: Por Que o Admin Sidebar Parou de Funcionar

## 📋 Resumo Executivo

**Antes**: O admin sidebar funcionava perfeitamente, mostrando todos os itens do menu baseados nas permissões do usuário.

**Agora**: O admin sidebar não mostra os itens do menu porque o `usePermissions` hook não consegue carregar as permissões do usuário.

**Causa Raiz**: A implementação do white-label introduziu **Row Level Security (RLS)** que bloqueia o acesso à tabela `usuarios_admin`, impedindo que o sistema busque os dados do usuário e suas permissões.

---

## 🔄 Fluxo ANTES (Funcionando)

### 1. **Login do Usuário Admin**

```
Usuário faz login → signInAdmin() → Supabase Auth valida → Busca dados na tabela usuarios_admin
```

**Código original (simplificado)**:
```typescript
// lib/supabase-auth.ts (ANTES)
export async function signInAdmin(email: string, password: string) {
  // 1. Autenticar via Supabase Auth
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })
  
  // 2. Buscar dados completos do usuário na tabela usuarios_admin
  // ✅ FUNCIONAVA: Não havia RLS bloqueando
  const { data: usuario } = await supabaseClient
    .from("usuarios_admin")
    .select("*")
    .eq("email", email)
    .single()
  
  // 3. Salvar no localStorage
  localStorage.setItem("admin_usuario", JSON.stringify(usuario))
  
  return data
}
```

**Por que funcionava**:
- ✅ **Não havia RLS** na tabela `usuarios_admin`
- ✅ A query retornava os dados do usuário diretamente
- ✅ O `localStorage` era preenchido com sucesso
- ✅ As permissões estavam disponíveis imediatamente

### 2. **Carregamento do Admin Sidebar**

```
AdminSidebar renderiza → usePermissions() → Busca do localStorage → Permissões carregadas → Menu aparece
```

**Fluxo do hook `usePermissions` (ANTES)**:
```typescript
// hooks/use-permissions.tsx (ANTES - simplificado)
export function usePermissions() {
  useEffect(() => {
    // 1. Buscar do localStorage
    const usuarioSalvo = localStorage.getItem("admin_usuario")
    
    if (usuarioSalvo) {
      // ✅ FUNCIONAVA: localStorage sempre tinha os dados
      const usuarioData = JSON.parse(usuarioSalvo)
      
      // 2. Extrair permissões
      const permissoes = usuarioData.permissoes || []
      
      // 3. Definir estado
      setPermissoes(permissoes)
      setIsMaster(usuarioData.perfil === "master")
    }
  }, [])
  
  // 4. Função para verificar permissões
  const podeVisualizar = (recurso: string) => {
    if (isMaster) return true
    return permissoes.includes(recurso)
  }
  
  return { podeVisualizar, isMaster }
}
```

**Por que funcionava**:
- ✅ O `localStorage` sempre tinha os dados (salvos durante o login)
- ✅ Não precisava buscar do banco novamente
- ✅ As permissões estavam disponíveis imediatamente
- ✅ O sidebar renderizava todos os itens baseados nas permissões

### 3. **Renderização do Sidebar**

```typescript
// components/admin/admin-sidebar.tsx
const { podeVisualizar, isMaster } = usePermissions()

// ✅ FUNCIONAVA: podeVisualizar retornava true/false corretamente
{podeVisualizar("dashboard") && (
  <Link href="/admin">Dashboard</Link>
)}
{podeVisualizar("leads") && (
  <Link href="/admin/leads">Leads</Link>
)}
// ... todos os outros itens apareciam
```

---

## ❌ Fluxo AGORA (Quebrado)

### 1. **Login do Usuário Admin**

```
Usuário faz login → signInAdmin() → Supabase Auth valida → Tenta buscar dados → ❌ RLS BLOQUEIA
```

**Código atual**:
```typescript
// lib/supabase-auth.ts (AGORA)
export async function signInAdmin(email: string, password: string) {
  // 1. Autenticar via Supabase Auth
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })
  
  // 2. Tentar buscar via API route
  const response = await fetch("/api/admin/auth/user", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
  
  if (response.ok) {
    // ✅ Se API funcionar, salva no localStorage
    const { usuario } = await response.json()
    localStorage.setItem("admin_usuario", JSON.stringify(usuario))
  } else {
    // ❌ Se API falhar (404), tenta fallback direto do Supabase
    const { data: usuarioSupabase } = await supabaseClient
      .from("usuarios_admin")
      .select("*")
      .eq("email", email)
      .single()
    
    // ❌ PROBLEMA: RLS pode bloquear esta query!
    // Se RLS bloquear, usuarioSupabase será null
    // localStorage não será preenchido
  }
}
```

**Por que não funciona**:
- ❌ **RLS foi habilitado** na tabela `usuarios_admin` (script `WHITELABEL-03-criar-rls-policies.sql`)
- ❌ A query direta do Supabase pode ser bloqueada pelo RLS
- ❌ A API route `/api/admin/auth/user` pode não existir em produção (404)
- ❌ O fallback pode falhar se o RLS bloquear
- ❌ O `localStorage` pode não ser preenchido

### 2. **Carregamento do Admin Sidebar**

```
AdminSidebar renderiza → usePermissions() → localStorage vazio → Tenta buscar do banco → ❌ RLS BLOQUEIA → Permissões vazias → Menu não aparece
```

**Fluxo do hook `usePermissions` (AGORA)**:
```typescript
// hooks/use-permissions.tsx (AGORA)
export function usePermissions() {
  useEffect(() => {
    // 1. Buscar do localStorage
    const usuarioSalvo = localStorage.getItem("admin_usuario")
    
    if (usuarioSalvo) {
      // ✅ Se tiver no localStorage, funciona
      const usuarioData = JSON.parse(usuarioSalvo)
      setPermissoes(usuarioData.permissoes || [])
    } else {
      // ❌ PROBLEMA: Se não tiver no localStorage, tenta buscar do banco
      
      // 2. Tentar buscar via API
      const response = await fetch("/api/admin/auth/user", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      
      if (!response.ok) {
        // ❌ Se API falhar (404), tenta fallback direto
        const { data: usuarioSupabase } = await supabase
          .from("usuarios_admin")
          .select("*")
          .eq("email", email)
          .single()
        
        // ❌ PROBLEMA: RLS pode bloquear esta query!
        // Se RLS bloquear, usuarioSupabase será null
        // Permissões ficam vazias
      }
    }
  }, [])
  
  // 3. Função para verificar permissões
  const podeVisualizar = (recurso: string) => {
    if (isMaster) return true
    // ❌ PROBLEMA: Se permissoes estiver vazio, retorna false
    return permissoes.includes(recurso)
  }
  
  return { podeVisualizar, isMaster }
}
```

**Por que não funciona**:
- ❌ O `localStorage` pode estar vazio (se o login falhou ao buscar dados)
- ❌ A API route pode retornar 404 (não existe em produção)
- ❌ O fallback direto do Supabase pode ser bloqueado pelo RLS
- ❌ As permissões ficam vazias (`[]`)
- ❌ O `podeVisualizar()` retorna `false` para tudo
- ❌ O sidebar não renderiza nenhum item

### 3. **Renderização do Sidebar**

```typescript
// components/admin/admin-sidebar.tsx
const { podeVisualizar, isMaster } = usePermissions()

// ❌ PROBLEMA: podeVisualizar retorna false para tudo
{podeVisualizar("dashboard") && (
  <Link href="/admin">Dashboard</Link>
)}
// ❌ Não aparece porque podeVisualizar("dashboard") retorna false

{podeVisualizar("leads") && (
  <Link href="/admin/leads">Leads</Link>
)}
// ❌ Não aparece porque podeVisualizar("leads") retorna false

// ... nenhum item aparece porque todas as permissões retornam false
```

---

## 🔴 O Que Mudou (Causa Raiz)

### 1. **Row Level Security (RLS) Foi Habilitado**

**Script executado**: `WHITELABEL-03-criar-rls-policies.sql`

```sql
-- ANTES: Não havia RLS
-- A tabela usuarios_admin era acessível sem restrições

-- AGORA: RLS foi habilitado
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

-- Policy criada (depois corrigida em WHITELABEL-05)
CREATE POLICY "tenant_isolation_usuarios_admin"
ON usuarios_admin
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());
```

**Problema**:
- ❌ A policy original exigia que `tenant_id = get_current_tenant_id()`
- ❌ Mas `get_current_tenant_id()` pode retornar `NULL` se o contexto não estiver definido
- ❌ Isso bloqueia TODAS as queries à tabela `usuarios_admin`
- ❌ Mesmo usuários autenticados não conseguem acessar seus próprios dados

### 2. **API Route Não Existe em Produção**

**Código criado**: `app/api/admin/auth/user/route.ts`

**Problema**:
- ❌ Esta API route foi criada durante a implementação do white-label
- ❌ Ela não existe no código em produção
- ❌ Quando o `signInAdmin` tenta chamar `/api/admin/auth/user`, retorna **404**
- ❌ O fallback tenta buscar diretamente do Supabase, mas pode ser bloqueado pelo RLS

### 3. **Dependência do localStorage**

**Problema**:
- ❌ O sistema depende do `localStorage` estar preenchido
- ❌ Se o login não conseguir buscar os dados do usuário, o `localStorage` fica vazio
- ❌ O `usePermissions` tenta buscar do banco, mas pode ser bloqueado pelo RLS
- ❌ Resultado: permissões vazias, sidebar vazio

---

## 🔧 Correções Aplicadas (Mas Ainda Não Funcionam Completamente)

### 1. **Script WHITELABEL-05: Corrigir RLS para usuarios_admin**

```sql
-- Remover policy baseada em tenant_id
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;

-- Criar policy baseada em autenticação
CREATE POLICY "usuarios_admin_select_authenticated"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);  -- Qualquer usuário autenticado pode ver
```

**Status**: ✅ Script criado, mas pode não ter sido executado em produção

### 2. **Fallback no signInAdmin**

```typescript
// Se API falhar, tentar buscar diretamente do Supabase
if (!usuarioSalvo) {
  const { data: usuarioSupabase } = await supabaseClient
    .from("usuarios_admin")
    .select("*")
    .eq("email", email)
    .single()
  
  if (usuarioSupabase) {
    localStorage.setItem("admin_usuario", JSON.stringify(usuarioSupabase))
  }
}
```

**Status**: ✅ Implementado, mas pode não funcionar se RLS bloquear

### 3. **Fallback no usePermissions**

```typescript
// Se localStorage vazio, tentar buscar do banco
if (!usuarioSalvo) {
  // Tentar API primeiro
  const response = await fetch("/api/admin/auth/user", ...)
  
  // Se API falhar, tentar Supabase direto
  if (!response.ok) {
    const { data: usuarioSupabase } = await supabase
      .from("usuarios_admin")
      .select("*")
      .eq("email", email)
      .single()
  }
}
```

**Status**: ✅ Implementado, mas pode não funcionar se RLS bloquear

---

## 📊 Comparação: Antes vs Agora

| Aspecto | ANTES ✅ | AGORA ❌ |
|---------|---------|---------|
| **RLS na tabela usuarios_admin** | Não havia | Habilitado (bloqueia acesso) |
| **Query direta do Supabase** | Funcionava | Pode ser bloqueada pelo RLS |
| **API route `/api/admin/auth/user`** | Não existia (não precisava) | Existe no código, mas não em produção |
| **localStorage preenchido** | Sempre | Pode ficar vazio |
| **Permissões carregadas** | Sempre | Podem ficar vazias |
| **Sidebar mostra itens** | Sim | Não (permissões vazias) |

---

## 🎯 Solução Completa

### 1. **Executar Script SQL em Produção**

```sql
-- Executar WHITELABEL-05-corrigir-rls-usuarios-admin.sql
-- Isso remove a policy baseada em tenant_id e cria uma policy permissiva
```

### 2. **Fazer Deploy da API Route**

```bash
# Fazer deploy do arquivo app/api/admin/auth/user/route.ts
# Isso garante que a API route existe em produção
```

### 3. **Verificar se Funciona**

```javascript
// Após login, verificar no console do navegador:
localStorage.getItem("admin_usuario")
// Deve retornar um objeto JSON com as permissões

// Verificar se o sidebar mostra os itens
// Deve aparecer Dashboard, Leads, Propostas, etc.
```

---

## 🔍 Diagnóstico: Como Verificar o Problema

### 1. **Verificar localStorage**

```javascript
// No console do navegador (F12)
localStorage.getItem("admin_usuario")
// Se retornar null, o problema é no login
// Se retornar um objeto, o problema pode ser nas permissões
```

### 2. **Verificar RLS Policies**

```sql
-- No Supabase SQL Editor
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'usuarios_admin';
```

**Resultado esperado**:
- `usuarios_admin_select_authenticated` (SELECT, USING: true)
- `usuarios_admin_update_authenticated` (UPDATE, com condições)

**Se aparecer**:
- `tenant_isolation_usuarios_admin` → ❌ **PROBLEMA**: Esta policy bloqueia acesso

### 3. **Verificar API Route**

```bash
# No terminal
curl -X POST http://localhost:3000/api/admin/auth/user \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@exemplo.com"}'
```

**Se retornar 404** → ❌ **PROBLEMA**: API route não existe

### 4. **Verificar Logs do Console**

```javascript
// No console do navegador, procurar por:
"🔄 usePermissions: Iniciando carregamento de permissões..."
"📦 localStorage 'admin_usuario': NÃO EXISTE"  // ❌ Problema
"⚠️ API retornou erro: 404"  // ❌ Problema
"❌ Erro ao buscar usuário do Supabase"  // ❌ Problema
```

---

## ✅ Conclusão

**O admin sidebar parou de funcionar porque**:

1. ❌ **RLS foi habilitado** na tabela `usuarios_admin`, bloqueando o acesso
2. ❌ **API route não existe** em produção, causando erro 404
3. ❌ **localStorage não é preenchido** durante o login
4. ❌ **Permissões ficam vazias**, fazendo o sidebar não renderizar nenhum item

**Para resolver**:

1. ✅ Executar script `WHITELABEL-05-corrigir-rls-usuarios-admin.sql` em produção
2. ✅ Fazer deploy da API route `/api/admin/auth/user`
3. ✅ Verificar se o localStorage é preenchido após login
4. ✅ Verificar se o sidebar mostra os itens

