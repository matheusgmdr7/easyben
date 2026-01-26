# 🔧 Correção: Fallback Admin Sidebar

## 🔍 Problema Identificado nos Logs

Pelos logs fornecidos, identifiquei que:

1. ✅ **AuthGuard autentica com sucesso** mas não encontra usuário no `localStorage`
2. ❌ **API route `/api/admin/auth/user` retorna 404** (Not Found)
3. ❌ **Fallback não está sendo acionado ou não está funcionando**
4. ❌ **`localStorage 'admin_usuario'` permanece vazio**
5. ❌ **AdminSidebar mostra apenas Dashboard** (permissões não carregadas)

## ✅ Correções Implementadas

### 1. Melhorias no `AuthGuard` (`components/admin/auth-guard.tsx`)

- ✅ Adicionados logs detalhados para rastrear o fluxo do fallback
- ✅ Melhorado tratamento de erros quando a API retorna 404
- ✅ Fallback agora é explicitamente acionado quando `apiFuncionou = false` ou `usuarioData = null`
- ✅ Logs mais detalhados do resultado do fallback do Supabase

### 2. Melhorias no `usePermissions` (`hooks/use-permissions.tsx`)

- ✅ Correção para garantir que permissões sejam sempre um array antes de salvar no `localStorage`
- ✅ Permissões são processadas ANTES de salvar no `localStorage`
- ✅ Se permissões estiverem vazias, usa permissões padrão do perfil
- ✅ Logs mais detalhados do processo de salvamento

## 🚀 Próximos Passos

### 1. Execute o Script SQL

Execute o script `scripts/WHITELABEL-10-corrigir-update-policy-usuarios-admin.sql` no Supabase SQL Editor para corrigir a policy de UPDATE.

### 2. Reinicie o Servidor

Após as correções, reinicie o servidor Next.js:

```bash
# Parar o servidor (Ctrl+C)
# Reiniciar
npm run dev
```

### 3. Faça Logout e Login Novamente

1. Faça logout da página `/admin`
2. Faça login novamente
3. Observe os logs no console do navegador

### 4. Verifique os Logs Esperados

Após o login, você deve ver nos logs:

**AuthGuard:**
```
🔍 AuthGuard: Usuário não encontrado no localStorage, buscando do banco...
📧 AuthGuard: Buscando usuário por email: contato@contratandoplanos.com.br
🔄 AuthGuard: Tentando buscar usuário via API route...
📍 URL da API: /api/admin/auth/user
⚠️ AuthGuard: API retornou erro: 404 Not Found
⚠️ AuthGuard: API route não encontrada (404) - tentando fallback direto do Supabase
🔄 AuthGuard: FALLBACK - Buscando usuário diretamente do Supabase...
📧 Email buscado: contato@contratandoplanos.com.br
🔍 Executando query no Supabase...
📊 AuthGuard: Resultado do fallback Supabase: { usuarioEncontrado: true, ... }
✅ AuthGuard: Usuário encontrado via fallback Supabase
✅ AuthGuard: Usuário salvo no localStorage
```

**usePermissions:**
```
🔄 usePermissions: Iniciando carregamento de permissões...
📦 localStorage 'admin_usuario': EXISTE
📋 Usuário parseado do localStorage: { ... }
✅ Permissões encontradas como array: [...]
🔐 Permissões carregadas: { perfil: "...", permissoes: [...], totalPermissoes: X }
```

**AdminSidebar:**
```
🔍 AdminSidebar - Verificando permissões: {
  isMaster: true/false,
  podeVisualizarDashboard: true,
  podeVisualizarLeads: true,
  podeVisualizarCorretores: true,
  ...
}
```

### 5. Se o Problema Persistir

Se após essas correções o problema persistir, compartilhe:

1. **Logs completos do console** após fazer logout e login novamente
2. **Resultado do script SQL** `WHITELABEL-10-corrigir-update-policy-usuarios-admin.sql`
3. **Verificação do localStorage** (execute no console do navegador):
   ```javascript
   const usuario = JSON.parse(localStorage.getItem("admin_usuario") || "null")
   console.log("Usuário:", usuario)
   console.log("Permissões:", usuario?.permissoes)
   ```

## 📝 Notas Importantes

- O fallback está implementado e deve funcionar mesmo se a API route retornar 404
- As permissões são processadas e garantidas como array antes de salvar no `localStorage`
- Se as permissões estiverem vazias no banco, o sistema usa permissões padrão do perfil
- O `AuthGuard` e `usePermissions` agora têm logs mais detalhados para facilitar o diagnóstico

## 🔍 Diagnóstico Adicional

Se o fallback ainda não funcionar, pode ser um problema de:

1. **RLS bloqueando a query**: Verifique se a policy `usuarios_admin_select_authenticated` está com `USING (true)`
2. **Sessão do Supabase Auth inválida**: Verifique se o usuário está realmente autenticado no Supabase Auth
3. **Email não corresponde**: Verifique se o email na sessão do Supabase Auth corresponde ao email na tabela `usuarios_admin`

Para verificar a sessão do Supabase Auth, execute no console do navegador:

```javascript
import { supabase } from '@/lib/supabase-auth'
const { data: { session } } = await supabase.auth.getSession()
console.log("Sessão:", session)
console.log("Email:", session?.user?.email)
```

