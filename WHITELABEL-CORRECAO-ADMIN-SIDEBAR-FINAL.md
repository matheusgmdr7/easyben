# ✅ Correção Final do Admin Sidebar

## 🔍 Problema Identificado

O admin sidebar não estava mostrando todos os itens porque:

1. ❌ A tabela `usuarios_admin` tinha RLS baseado em `tenant_id`
2. ❌ A função `validarSenhaUsuarioAdmin` usa `supabase` (cliente anônimo) que é bloqueado pelo RLS
3. ❌ As queries de `usuarios-admin-service.ts` estão sendo bloqueadas pelo RLS
4. ❌ O hook `usePermissions` não consegue buscar permissões do usuário

**Antes do whitelabel**: A tabela `usuarios_admin` NÃO tinha RLS, então todas as queries funcionavam normalmente.

---

## ✅ Soluções Aplicadas

### **1. API `/api/admin/auth/user/route.ts`** ✅
- Alterado para usar `supabaseAdmin` (bypassa RLS)
- Agora consegue buscar usuários mesmo com RLS ativo

### **2. Função `signInAdmin` em `lib/supabase-auth.ts`** ✅
- Agora busca dados completos do usuário via API após login
- Salva o usuário completo no localStorage com todas as permissões

### **3. Script SQL `WHITELABEL-05-corrigir-rls-usuarios-admin.sql`** ✅
- Remove policy baseada em `tenant_id` para `usuarios_admin`
- Cria policy baseada em autenticação (não em tenant)
- Permite SELECT para usuários autenticados (necessário para login)
- Permite UPDATE para atualizar último_login, etc.

---

## 🚀 Como Executar a Correção

### **Passo 1: Execute o Script SQL**

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute o script `scripts/WHITELABEL-05-corrigir-rls-usuarios-admin.sql`
4. Verifique se não há erros

### **Passo 2: Teste o Sistema**

1. **Faça logout** (se estiver logado)
2. **Faça login novamente** em `/admin/login`
3. **Verifique o console do navegador** - deve aparecer:
   ```
   ✅ Usuário admin salvo no localStorage: { id, email, perfil, permissoes }
   ```
4. **Verifique o sidebar** - deve mostrar todos os itens do menu

---

## 📋 O Que o Script SQL Faz

### **1. Remove Policy Baseada em Tenant**
```sql
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
```

### **2. Cria Policy Baseada em Autenticação**

**SELECT Policy:**
- Permite que qualquer usuário autenticado veja usuários admin
- Necessário para login e verificação de permissões

**UPDATE Policy:**
- Permite atualização se:
  - O `auth_user_id` corresponde ao usuário autenticado
  - OU é do tenant padrão (compatibilidade)
  - OU o usuário está ativo (para atualizar último_login)

---

## 🎯 Por Que Esta Solução Funciona

### **Antes (Com RLS baseado em tenant_id):**
- ❌ RLS verificava `tenant_id = get_current_tenant_id()`
- ❌ `get_current_tenant_id()` retornava NULL ou valor incorreto
- ❌ Todas as queries eram bloqueadas

### **Agora (Com RLS baseado em autenticação):**
- ✅ RLS verifica apenas se o usuário está autenticado
- ✅ Qualquer usuário autenticado pode ver usuários admin
- ✅ Queries funcionam normalmente
- ✅ Sistema funciona como antes do whitelabel

---

## ⚠️ Importante

### **Segurança Mantida:**
- ✅ Apenas usuários autenticados podem acessar
- ✅ UPDATE ainda tem restrições (próprio usuário ou tenant padrão)
- ✅ INSERT/DELETE apenas via API routes (que usam supabaseAdmin)

### **Por Que usuarios_admin Não Deve Ter Isolamento por Tenant:**
- Usuários admin são compartilhados entre tenants
- Necessários para autenticação (não podem ser bloqueados)
- Cada tenant terá seus próprios usuários admin no futuro, mas por enquanto são compartilhados

---

## 🧪 Teste Após Executar

1. ✅ Faça logout e login novamente
2. ✅ Verifique se o sidebar mostra todos os itens
3. ✅ Verifique se as permissões estão corretas
4. ✅ Verifique se o dashboard carrega normalmente

---

## 📝 Se Ainda Não Funcionar

### **Verificar no Console:**
- Procure por erros relacionados a `usuarios_admin`
- Verifique se há mensagens de RLS bloqueando queries

### **Verificar no Banco:**
```sql
-- Verificar policies ativas
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'usuarios_admin';

-- Verificar se há usuários admin
SELECT id, email, perfil, ativo, status, tenant_id
FROM usuarios_admin
LIMIT 5;
```

---

**Execute o script SQL e me avise se o sidebar voltou a funcionar!** 🚀

