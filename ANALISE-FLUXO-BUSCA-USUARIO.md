# Análise do Fluxo de Busca de Dados do Usuário Admin

## 📋 Resumo do Problema

O erro 404 na rota `/api/admin/auth/user` está impedindo que os dados do usuário sejam salvos no `localStorage`, resultando em um sidebar incompleto.

## 🔍 Fluxo Completo de Busca de Dados

### 1. **Tabela de Dados**: `usuarios_admin`

A tabela `usuarios_admin` armazena todos os dados dos usuários administrativos, incluindo:
- `id`: UUID do usuário
- `nome`: Nome completo
- `email`: Email (usado para busca)
- `senha_hash`: Hash da senha (bcrypt)
- `perfil`: Perfil do usuário (master, admin, financeiro, etc.)
- `permissoes`: Array JSONB com as permissões do usuário
- `ativo`: Boolean indicando se o usuário está ativo
- `auth_user_id`: ID do usuário no Supabase Auth (opcional)

### 2. **API Route**: `/api/admin/auth/user`

**Localização**: `app/api/admin/auth/user/route.ts`

**Métodos**:
- `POST`: Recebe `{ email }` no body e retorna os dados do usuário
- `GET`: Recebe `email` como query parameter (para debug)

**Query na Tabela**:
```typescript
const { data: usuario, error } = await supabaseAdmin
  .from("usuarios_admin")
  .select("*")
  .eq("email", email.toLowerCase())  // Busca por email (lowercase)
  .eq("ativo", true)                 // Apenas usuários ativos
  .single()                          // Retorna um único registro
```

**Cliente Supabase**: Usa `supabaseAdmin` (bypassa RLS) para garantir acesso mesmo sem contexto de tenant.

### 3. **Fluxo de Login**: `signInAdmin`

**Localização**: `lib/supabase-auth.ts`

**Passos**:
1. Autentica com Supabase Auth usando `email` e `password`
2. Após autenticação bem-sucedida, tenta buscar dados completos via API:
   ```typescript
   const response = await fetch("/api/admin/auth/user", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ email }),
   })
   ```
3. Se a API retornar OK (`response.ok === true`):
   - Faz parse do JSON
   - Garante que `permissoes` seja um array
   - Se `permissoes` estiver vazio, usa permissões padrão do perfil
   - Salva no `localStorage` como `admin_usuario`
4. Se a API retornar erro (404, 500, etc.):
   - Loga o erro
   - Não salva no `localStorage`
   - O hook `usePermissions` tentará buscar depois

### 4. **Hook de Permissões**: `usePermissions`

**Localização**: `hooks/use-permissions.tsx`

**Fluxo**:
1. Verifica `localStorage` para `admin_usuario`
2. Se não encontrar:
   - Obtém sessão do Supabase Auth
   - Chama `/api/admin/auth/user` com o email da sessão
   - Salva no `localStorage` se encontrar
3. Usa os dados para determinar permissões e renderizar o sidebar

## 🔴 Possíveis Causas do 404

### 1. **Rota Não Encontrada (Problema de Roteamento)**

**Sintomas**:
- 404 imediatamente, sem logs da API route
- A rota não está sendo compilada/registrada

**Verificação**:
- Confirmar que `app/api/admin/auth/user/route.ts` existe
- Verificar se há erros de compilação no servidor
- Testar a rota diretamente: `GET /api/admin/auth/user?email=seu@email.com`

### 2. **Usuário Não Encontrado na Tabela**

**Sintomas**:
- 404 retornado pela API route (linha 60-63)
- Logs mostram: `"❌ Usuário não encontrado para email: ..."`

**Possíveis Causas**:
- Email não existe na tabela `usuarios_admin`
- Email está em formato diferente (case-sensitive, espaços, etc.)
- Usuário está com `ativo = false`
- Problema com RLS (mesmo usando `supabaseAdmin`)

**Verificação SQL**:
```sql
SELECT id, nome, email, ativo, perfil
FROM usuarios_admin
WHERE LOWER(email) = LOWER('seu@email.com');
```

### 3. **Problema com `supabaseAdmin`**

**Sintomas**:
- Erro 500 ou timeout na API route
- Logs mostram erro do Supabase

**Verificação**:
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` está definida
- Verificar se `supabaseAdmin` está sendo inicializado corretamente

## 🛠️ Soluções e Debug

### 1. **Testar a Rota Diretamente**

Acesse no navegador ou use curl:
```bash
# GET (mais fácil para testar)
curl "http://localhost:3000/api/admin/auth/user?email=seu@email.com"

# POST
curl -X POST http://localhost:3000/api/admin/auth/user \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com"}'
```

### 2. **Verificar Logs do Servidor**

Os logs da API route devem aparecer no terminal do servidor Next.js:
- `🚀 API Route /api/admin/auth/user - POST recebido`
- `🔍 API Route - Buscando usuário admin por email: ...`
- `✅ API Route - Usuário encontrado:` ou `❌ Usuário não encontrado`

### 3. **Verificar Dados na Tabela**

Execute no Supabase SQL Editor:
```sql
-- Verificar se o usuário existe
SELECT 
  id,
  nome,
  email,
  LOWER(email) as email_lowercase,
  ativo,
  perfil,
  permissoes,
  auth_user_id
FROM usuarios_admin
WHERE LOWER(email) = LOWER('seu@email.com');

-- Verificar todos os usuários ativos
SELECT id, nome, email, ativo, perfil
FROM usuarios_admin
WHERE ativo = true
ORDER BY email;
```

### 4. **Verificar RLS na Tabela**

Mesmo usando `supabaseAdmin`, verifique se há políticas que possam interferir:
```sql
-- Ver políticas RLS na tabela usuarios_admin
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'usuarios_admin';
```

## 📝 Próximos Passos

1. **Verificar logs do servidor** quando o login é feito
2. **Testar a rota diretamente** com GET/POST
3. **Verificar se o usuário existe** na tabela `usuarios_admin`
4. **Confirmar que o email** usado no login corresponde ao email na tabela
5. **Verificar se `ativo = true`** para o usuário

## 🔗 Arquivos Relacionados

- `app/api/admin/auth/user/route.ts` - API route que busca o usuário
- `lib/supabase-auth.ts` - Função de login que chama a API
- `hooks/use-permissions.tsx` - Hook que usa os dados do usuário
- `services/usuarios-admin-service.ts` - Serviço com lógica de negócio
- `lib/supabase-admin.ts` - Cliente Supabase com service_role (bypassa RLS)

