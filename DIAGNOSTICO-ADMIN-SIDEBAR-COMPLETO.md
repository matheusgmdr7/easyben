# 🔍 Diagnóstico Completo: Admin Sidebar Não Aparece

## 📋 Problema Reportado

O usuário reportou que:
1. O admin sidebar não está aparecendo completo (itens do menu faltando)
2. Os logs mostram: `localStorage 'admin_usuario': NÃO EXISTE`
3. A API route `/api/admin/auth/user` está retornando 404
4. Mensagem: "buscando em admin_usuario, mas a tabela correta é usuarios_admin"

## ✅ Verificações Realizadas

### 1. **Nome da Tabela**
- ✅ **CORRETO**: O código usa `usuarios_admin` em todos os lugares
- ✅ **CORRETO**: `admin_usuario` é apenas a chave do `localStorage`, não o nome da tabela
- ✅ **CORRETO**: A API route `/api/admin/auth/user/route.ts` usa `usuarios_admin`

### 2. **Estrutura da API Route**
- ✅ **CORRETO**: A rota está em `/app/api/admin/auth/user/route.ts`
- ✅ **CORRETO**: O middleware não bloqueia rotas `/api/*`
- ⚠️ **PROBLEMA**: A rota pode não estar sendo servida corretamente (404)

### 3. **RLS Policies**
- ⚠️ **VERIFICAR**: Execute o script `WHITELABEL-09-verificar-rls-usuarios-admin.sql`
- ⚠️ **VERIFICAR**: As policies devem permitir SELECT para usuários autenticados

## 🔧 Correções Aplicadas

### 1. **AuthGuard Melhorado**
- ✅ Agora tenta buscar o usuário do banco quando não está no `localStorage`
- ✅ Usa fallback direto do Supabase se a API falhar
- ✅ Garante que permissões sejam sempre um array

### 2. **Script de Verificação RLS**
- ✅ Criado `WHITELABEL-09-verificar-rls-usuarios-admin.sql` para diagnosticar RLS

## 📝 Próximos Passos

### 1. **Executar Script de Verificação RLS**
```sql
-- Execute no Supabase SQL Editor
-- scripts/WHITELABEL-09-verificar-rls-usuarios-admin.sql
```

**Resultado Esperado:**
- RLS deve estar HABILITADO
- Deve haver 2 policies:
  - `usuarios_admin_select_authenticated` (SELECT, USING: true)
  - `usuarios_admin_update_authenticated` (UPDATE, com condições)
- NÃO deve haver policies com "tenant_isolation" no nome

### 2. **Verificar Logs do Console**
Após fazer login, verifique os logs do console:

**Logs Esperados:**
```
✅ AuthGuard: Usuário autenticado com sucesso
🔍 AuthGuard: Usuário não encontrado no localStorage, buscando do banco...
📧 AuthGuard: Buscando usuário por email: [seu-email]
✅ AuthGuard: Usuário encontrado via API (ou via fallback Supabase)
✅ AuthGuard: Usuário salvo no localStorage
```

**Se aparecer erro:**
```
❌ AuthGuard: Erro ao buscar usuário do Supabase: [mensagem]
```

### 3. **Verificar localStorage**
No console do navegador, execute:
```javascript
const usuario = JSON.parse(localStorage.getItem("admin_usuario") || "null")
console.log("Usuário:", usuario)
console.log("Permissões:", usuario?.permissoes)
console.log("Perfil:", usuario?.perfil)
```

**Resultado Esperado:**
- `usuario` não deve ser `null`
- `permissoes` deve ser um array (não vazio)
- `perfil` deve estar definido

### 4. **Verificar API Route**
Teste a API route diretamente:
```bash
# No terminal ou Postman
curl -X POST http://localhost:3000/api/admin/auth/user \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@exemplo.com"}'
```

**Resultado Esperado:**
- Status 200 com JSON contendo `{ success: true, usuario: {...} }`

**Se retornar 404:**
- Verifique se o servidor Next.js está rodando
- Verifique se a rota está no local correto: `/app/api/admin/auth/user/route.ts`
- Reinicie o servidor Next.js

## 🐛 Possíveis Causas do 404

1. **Servidor Next.js não está rodando**
   - Solução: Execute `npm run dev` ou `yarn dev`

2. **Rota não foi deployada**
   - Solução: Verifique se o arquivo existe em produção

3. **Middleware bloqueando**
   - ✅ Verificado: O middleware não bloqueia rotas `/api/*`

4. **Problema de build**
   - Solução: Execute `npm run build` e verifique erros

## 🔄 Fluxo Correto Após Correções

1. **Login** → `signInAdmin()` → Supabase Auth valida
2. **Buscar Usuário** → Tenta API `/api/admin/auth/user`
3. **Fallback** → Se API falhar, busca diretamente do Supabase
4. **Salvar localStorage** → `localStorage.setItem("admin_usuario", ...)`
5. **AuthGuard** → Verifica `localStorage`, se não existir, busca do banco
6. **usePermissions** → Lê do `localStorage` ou busca do banco
7. **AdminSidebar** → Usa `usePermissions` para mostrar itens

## ✅ Checklist Final

- [ ] Script RLS executado e policies verificadas
- [ ] Logs do console verificados (sem erros)
- [ ] `localStorage.getItem("admin_usuario")` retorna dados
- [ ] API route `/api/admin/auth/user` retorna 200 (não 404)
- [ ] Admin sidebar mostra todos os itens baseados nas permissões
- [ ] Usuário master vê todos os itens

## 📞 Se o Problema Persistir

1. **Execute o script SQL de verificação RLS**
2. **Compartilhe os logs do console** (copie todos os logs após login)
3. **Compartilhe o resultado do script SQL**
4. **Verifique se o servidor Next.js está rodando corretamente**

