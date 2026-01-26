# 🔧 Solução Completa: Admin Sidebar e API 404

Este documento explica o problema do admin sidebar não aparecer completo e a solução para o erro 404 da API route.

---

## 🔍 Problema Identificado

1. **API Route `/api/admin/auth/user` retorna 404**: A rota não está sendo encontrada, impedindo que o `localStorage` seja preenchido com os dados do usuário.
2. **Policy de UPDATE usa `tenant_id`**: A policy `usuarios_admin_update_authenticated` ainda usa `tenant_id` de forma restritiva, o que pode bloquear atualizações.
3. **`localStorage 'admin_usuario'` vazio**: Sem os dados do usuário no `localStorage`, o `usePermissions` hook não consegue carregar as permissões, resultando em um sidebar incompleto.

---

## ✅ Soluções Implementadas

### 1. Script SQL: Corrigir Policy de UPDATE

Execute o script `scripts/WHITELABEL-10-corrigir-update-policy-usuarios-admin.sql` no Supabase SQL Editor.

Este script:
- Remove a policy de UPDATE existente que usa `tenant_id` de forma restritiva
- Cria uma nova policy permissiva que permite atualizações baseadas em `auth_user_id` ou `ativo = true`
- **Não usa `tenant_id`** porque `usuarios_admin` não deve ser isolado por tenant

### 2. Fallback Implementado

O código já possui fallback implementado em:
- `lib/supabase-auth.ts` (função `signInAdmin`)
- `hooks/use-permissions.tsx` (hook `usePermissions`)
- `components/admin/auth-guard.tsx` (componente `AuthGuard`)

Se a API route retornar 404, o sistema tentará buscar os dados diretamente do Supabase usando o cliente autenticado.

### 3. Verificação da API Route

A API route está localizada em:
- `app/api/admin/auth/user/route.ts`

Ela deve estar acessível em:
- `POST /api/admin/auth/user` (com body `{ email: "..." }`)
- `GET /api/admin/auth/user?email=...` (para debug)

---

## 🚀 Passos para Resolver

### Passo 1: Executar Script SQL

Execute o script `scripts/WHITELABEL-10-corrigir-update-policy-usuarios-admin.sql` no Supabase SQL Editor.

**Verificação após execução:**
```sql
SELECT 
    policyname,
    cmd AS operacao,
    qual AS using_clause,
    with_check AS with_check_clause
FROM pg_policies
WHERE tablename = 'usuarios_admin'
  AND policyname = 'usuarios_admin_update_authenticated';
```

**Resultado esperado:**
- `using_clause` deve conter `auth_user_id = auth.uid()` OU `ativo = true`
- `with_check_clause` deve conter `auth_user_id = auth.uid()` OU `ativo = true`
- **NÃO deve conter verificação de `tenant_id`**

### Passo 2: Verificar se a API Route está Acessível

No console do navegador (após fazer login), execute:

```javascript
fetch("/api/admin/auth/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "seu-email@exemplo.com" })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Resultado esperado:**
- Se a API funcionar: `{ success: true, usuario: { ... } }`
- Se retornar 404: O fallback deve ser acionado automaticamente

### Passo 3: Verificar Logs do Servidor

No terminal onde você executa `npm run dev` (ou nos logs de produção), verifique se há mensagens como:

```
🚀 API Route /api/admin/auth/user - POST recebido
📍 URL completa: http://...
🔍 API Route - Buscando usuário admin por email: ...
```

**Se não aparecer nenhuma mensagem:**
- A requisição não está chegando à API route
- Pode ser um problema de roteamento ou middleware

### Passo 4: Verificar Fallback

Se a API retornar 404, o fallback deve ser acionado. No console do navegador, você deve ver:

```
⚠️ API route não encontrada (404) - Isso é esperado se a rota não foi deployada
🔄 FALLBACK: Tentando buscar usuário diretamente do Supabase...
📧 Email buscado: ...
🔍 Executando query no Supabase...
📊 Resultado do fallback Supabase: { usuarioEncontrado: true, ... }
✅ Usuário encontrado via fallback!
✅ Usuário admin salvo no localStorage (via fallback Supabase)
```

**Se o fallback também falhar:**
- Verifique se o RLS está configurado corretamente (policy `usuarios_admin_select_authenticated` deve ter `USING (true)`)
- Verifique se o usuário está autenticado no Supabase Auth

### Passo 5: Verificar localStorage

Após o login, no console do navegador, execute:

```javascript
const usuario = JSON.parse(localStorage.getItem("admin_usuario") || "null")
console.log("Usuário:", usuario)
console.log("Permissões:", usuario?.permissoes)
```

**Resultado esperado:**
- `Usuário:` deve mostrar um objeto com `id`, `nome`, `email`, `perfil`, `permissoes` (array de strings)
- `Permissões:` deve mostrar um array de strings com as permissões

**Se `usuario` for `null`:**
- O fallback não funcionou
- Verifique os logs do console para identificar o erro

---

## 🔧 Possíveis Causas do 404

1. **Problema de Deploy/Build**: A API route não foi construída ou servida corretamente no ambiente de produção.
   - **Solução**: Verifique os logs de build/deploy na sua plataforma (Vercel, Netlify, etc.)
   - **Solução**: Tente fazer um rebuild completo

2. **Conflito de Rotas**: Outra rota pode estar interceptando `/api/admin/auth/user`.
   - **Solução**: Verifique o arquivo `middleware.ts` para regras de `matcher` que possam estar excluindo ou redirecionando essa rota
   - **Solução**: Verifique se há outras pastas ou arquivos que possam estar criando rotas conflitantes

3. **Erro de Servidor Silencioso**: A rota está sendo acessada, mas um erro no servidor está impedindo-a de responder corretamente.
   - **Solução**: Verifique os logs do servidor Next.js (terminal onde você executa `npm run dev` ou logs do ambiente de produção)
   - **Solução**: Adicione mais `console.log` no início da função `POST` em `app/api/admin/auth/user/route.ts` para ver se a requisição chega lá

---

## 📋 Checklist Final

- [ ] Script SQL `WHITELABEL-10-corrigir-update-policy-usuarios-admin.sql` executado
- [ ] Policy de UPDATE verificada (não usa `tenant_id` de forma restritiva)
- [ ] API route `/api/admin/auth/user` testada (POST e GET)
- [ ] Logs do servidor verificados (mensagens da API route aparecem)
- [ ] Fallback testado (se API retornar 404, fallback deve funcionar)
- [ ] `localStorage 'admin_usuario'` preenchido após login
- [ ] Permissões carregadas corretamente (array de strings)
- [ ] Admin sidebar aparece completo com todos os itens de menu

---

## 🆘 Se o Problema Persistir

1. **Compartilhe os logs completos** do console do navegador e do servidor
2. **Compartilhe o resultado** da verificação da policy de UPDATE (SQL)
3. **Compartilhe o resultado** do teste da API route (fetch no console)
4. **Compartilhe o resultado** da verificação do `localStorage`

Com essas informações, poderemos identificar a causa raiz do problema.

---

## 📝 Notas Importantes

- O fallback está implementado e deve funcionar mesmo se a API route retornar 404
- A policy de UPDATE não deve usar `tenant_id` porque `usuarios_admin` não é isolado por tenant
- O `localStorage` deve ser preenchido após o login para que o `usePermissions` hook funcione corretamente
- Se o fallback falhar, verifique se o RLS está configurado corretamente (policy `usuarios_admin_select_authenticated` com `USING (true)`)

