# 🔍 Debug do Erro 404 na API `/api/admin/auth/user`

## 📋 Resumo da Análise

Analisei o fluxo completo de busca de dados do usuário admin e adicionei logs detalhados para identificar a causa do erro 404.

## 🔍 Onde os Dados são Buscados

### **Tabela**: `usuarios_admin`

Esta é a tabela principal que armazena todos os dados dos usuários administrativos:
- **Coluna de busca**: `email` (normalizado para lowercase)
- **Filtro adicional**: `ativo = true`
- **Cliente usado**: `supabaseAdmin` (bypassa RLS)

### **API Route**: `/api/admin/auth/user`

**Localização**: `app/api/admin/auth/user/route.ts`

**Query executada**:
```typescript
const { data: usuario, error } = await supabaseAdmin
  .from("usuarios_admin")
  .select("*")
  .eq("email", email.toLowerCase())  // Busca por email (lowercase)
  .eq("ativo", true)                 // Apenas usuários ativos
  .single()                          // Retorna um único registro
```

## ✅ Melhorias Implementadas

1. **Logs detalhados adicionados**:
   - URL completa da requisição
   - Headers recebidos
   - Body parseado
   - Resultado completo da query no Supabase
   - Verificação de usuários similares quando não encontra

2. **Tratamento de erros melhorado**:
   - Verificação se `supabaseAdmin` está disponível
   - Logs detalhados de erros do Supabase (code, message, details, hint)
   - Busca de usuários similares para debug

3. **Import otimizado**:
   - `PERFIS_PERMISSOES` agora é importado diretamente (não mais via dynamic import)

## 🛠️ Como Diagnosticar o Problema

### 1. **Verificar Logs do Servidor**

Quando você fizer login, os logs devem aparecer no terminal do servidor Next.js. Procure por:

```
🚀 API Route /api/admin/auth/user - POST recebido
📍 URL completa: ...
📍 Method: POST
📍 Headers: ...
📦 Body recebido (text): ...
🔍 API Route - Buscando usuário admin por email: ...
📊 Resultado da query: ...
```

### 2. **Testar a Rota Diretamente**

Abra no navegador ou use curl:

```bash
# GET (mais fácil para testar)
curl "http://localhost:3000/api/admin/auth/user?email=seu@email.com"

# Ou no navegador:
http://localhost:3000/api/admin/auth/user?email=seu@email.com
```

### 3. **Verificar Dados na Tabela**

Execute no Supabase SQL Editor:

```sql
-- Verificar se o usuário existe e está ativo
SELECT 
  id,
  nome,
  email,
  LOWER(email) as email_lowercase,
  ativo,
  perfil,
  permissoes
FROM usuarios_admin
WHERE LOWER(email) = LOWER('seu@email.com');

-- Verificar todos os usuários ativos
SELECT id, nome, email, ativo, perfil
FROM usuarios_admin
WHERE ativo = true
ORDER BY email;
```

### 4. **Verificar Variáveis de Ambiente**

Confirme que `SUPABASE_SERVICE_ROLE_KEY` está definida no `.env.local`:

```bash
# Verificar se a variável está definida
echo $SUPABASE_SERVICE_ROLE_KEY
```

## 🔴 Possíveis Causas do 404

### **Causa 1: Rota Não Encontrada (Problema de Roteamento)**

**Sintomas**:
- 404 imediatamente, sem logs da API route no servidor
- A rota não está sendo compilada/registrada

**Solução**:
- Verificar se `app/api/admin/auth/user/route.ts` existe
- Reiniciar o servidor Next.js
- Verificar se há erros de compilação

### **Causa 2: Usuário Não Encontrado na Tabela**

**Sintomas**:
- 404 retornado pela API route
- Logs mostram: `"❌ Usuário não encontrado para email: ..."`

**Possíveis Causas**:
- Email não existe na tabela `usuarios_admin`
- Email está em formato diferente (case-sensitive, espaços, etc.)
- Usuário está com `ativo = false`
- Email usado no login não corresponde ao email na tabela

**Solução**:
- Verificar se o email na tabela corresponde exatamente ao email usado no login
- Verificar se `ativo = true` para o usuário
- Usar a query SQL acima para verificar

### **Causa 3: Problema com `supabaseAdmin`**

**Sintomas**:
- Erro 500 ou timeout na API route
- Logs mostram erro do Supabase

**Solução**:
- Verificar se `SUPABASE_SERVICE_ROLE_KEY` está definida
- Verificar se `supabaseAdmin` está sendo inicializado corretamente em `lib/supabase-admin.ts`

## 📝 Próximos Passos

1. **Reinicie o servidor Next.js** para aplicar as mudanças
2. **Faça login novamente** e observe os logs no terminal do servidor
3. **Teste a rota diretamente** usando GET com o email
4. **Verifique os dados na tabela** usando a query SQL acima
5. **Compartilhe os logs** se o problema persistir

## 🔗 Arquivos Modificados

- ✅ `app/api/admin/auth/user/route.ts` - Logs detalhados adicionados
- ✅ `ANALISE-FLUXO-BUSCA-USUARIO.md` - Documentação completa do fluxo

## 📊 Estrutura do Fluxo

```
Login (signInAdmin)
    ↓
Supabase Auth (autenticação)
    ↓
POST /api/admin/auth/user
    ↓
Query: usuarios_admin WHERE email = ? AND ativo = true
    ↓
Retorna dados do usuário (com permissões)
    ↓
Salva no localStorage como "admin_usuario"
    ↓
usePermissions hook usa os dados
    ↓
AdminSidebar renderiza baseado nas permissões
```

## ⚠️ Importante

- A API route usa `supabaseAdmin` que **bypassa RLS**, então não deve haver problemas de permissão
- O email é normalizado para **lowercase** antes da busca
- Apenas usuários com `ativo = true` são retornados
- Se `permissoes` estiver vazio, usa permissões padrão do perfil

