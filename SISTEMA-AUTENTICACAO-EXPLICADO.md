# Sistema de Autenticação de Usuários Admin - Explicação Completa

## 📋 Visão Geral

O sistema possui **dois níveis de autenticação**:

1. **Autenticação Supabase Auth** (Camada de segurança externa)
2. **Tabela Local `usuarios_admin`** (Controle de permissões e perfis)

---

## 🔐 Como Funciona o Fluxo de Autenticação

### 1. **Login (`/admin/login`)**

Quando o usuário acessa `/admin/login`:

```typescript
// app/admin/login/page.tsx
await signInAdmin(email, password)
```

**O que acontece:**
1. Usa `supabase.auth.signInWithPassword()` para autenticar no Supabase Auth
2. Verifica se o usuário tem `user_metadata.role === "admin"`
3. Se não tiver, faz logout e retorna erro
4. Se tiver, redireciona para `/admin`

### 2. **Proteção de Rotas (`AuthGuard`)**

Todas as rotas em `/admin/(auth)/*` são protegidas pelo `AuthGuard`:

```typescript
// components/admin/auth-guard.tsx
- Verifica se há sessão ativa no Supabase
- Se não houver sessão → redireciona para /admin/login
- Se houver sessão → renderiza o conteúdo
```

**Estrutura:**
```
app/admin/(auth)/
  └── layout.tsx  → Usa AuthGuard
      ├── page.tsx (dashboard)
      ├── usuarios/
      ├── propostas/
      └── ...
```

### 3. **Gerenciamento de Usuários (`/admin/usuarios`)**

A página `/admin/usuarios` gerencia usuários na tabela `usuarios_admin`:

**Criar Usuário:**
1. Cria usuário no **Supabase Auth** (usando `supabaseAdmin.auth.admin.createUser`)
   - Requer `SUPABASE_SERVICE_ROLE_KEY` configurada
   - Cria usuário com `user_metadata.role = "admin"`
2. Cria registro na tabela **`usuarios_admin`** (nossa tabela local)
   - Armazena perfil, permissões, status
   - Link com `auth_user_id`

**Permissões:**
- **Perfis**: master, super_admin, admin, financeiro, vendas, atendimento, readonly, assistente
- **Permissões**: Array de strings definindo o que o usuário pode fazer
- **Status**: ativo, inativo, bloqueado, pendente

---

## 🗄️ Estrutura de Dados

### Tabela `usuarios_admin` (Local)

```sql
- id (UUID)
- nome (text)
- email (text, único)
- senha_hash (text) - Hash da senha (backup)
- perfil (enum) - master, super_admin, admin, etc.
- permissoes (jsonb) - Array de permissões
- status (enum) - ativo, inativo, bloqueado, pendente
- ativo (boolean)
- auth_user_id (UUID) - Link com Supabase Auth
- created_at, updated_at, ultimo_acesso
```

### Supabase Auth (Externo)

```javascript
{
  id: "uuid",
  email: "usuario@email.com",
  user_metadata: {
    role: "admin",
    nome: "Nome do Usuário",
    perfil: "master"
  }
}
```

---

## 🔄 Fluxo Completo de Autenticação

```
┌─────────────────┐
│  Usuário vai    │
│  /admin/login   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ signInAdmin()           │
│ - Supabase Auth         │
│ - Verifica role="admin" │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │  OK?    │
    └────┬────┘
         │
    ┌────┴────┐
    │  SIM    │
    └────┬────┘
         │
         ▼
┌─────────────────────────┐
│ Redireciona para /admin │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AuthGuard verifica      │
│ sessão ativa            │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │  OK?    │
    └────┬────┘
         │
    ┌────┴────┐
    │  SIM    │
    └────┬────┘
         │
         ▼
┌─────────────────────────┐
│ Renderiza página        │
│ (usuarios, propostas...)│
└─────────────────────────┘
```

---

## ⚠️ Problemas Comuns e Soluções

### Problema 1: Página não carrega (`/admin/usuarios`)

**Possíveis causas:**
1. **Sem sessão ativa** → AuthGuard redireciona para login
2. **Erro ao carregar usuários** → Verificar console do navegador
3. **Erro de compilação** → Verificar terminal do servidor

**Solução:**
- Verificar se está logado
- Verificar console do navegador (F12)
- Verificar terminal do servidor

### Problema 2: Erro 403 ao criar usuário

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` não configurada ou incorreta

**Solução:**
1. Ir no Supabase Dashboard → Settings → API
2. Copiar a `service_role` key (secret)
3. Adicionar no `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
   ```
4. Reiniciar o servidor

### Problema 3: `obterPermissoesPadrao is not a function`

**Causa:** Hot reload não recarregou o código

**Solução:**
1. Parar o servidor (Ctrl+C)
2. Limpar cache: `rm -rf .next`
3. Reiniciar: `npm run dev`

---

## 📝 Arquivos Importantes

### Autenticação
- `app/admin/login/page.tsx` - Página de login
- `components/admin/auth-guard.tsx` - Proteção de rotas
- `lib/supabase-auth.ts` - Funções de autenticação Supabase

### Gerenciamento de Usuários
- `app/admin/(auth)/usuarios/page.tsx` - Página de gerenciamento
- `services/usuarios-admin-service.ts` - Serviço de usuários
- `components/admin/modals/modal-criar-usuario.tsx` - Modal criar
- `components/admin/modals/modal-editar-usuario.tsx` - Modal editar

### Configuração
- `lib/supabase-admin.ts` - Cliente Supabase com service role key
- `.env.local` - Variáveis de ambiente

---

## 🔑 Variáveis de Ambiente Necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui

# IMPORTANTE: Service Role Key para criar usuários
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
```

---

## 🎯 Como Criar o Primeiro Usuário Admin

Se não houver usuários no sistema, você precisa:

1. **Criar manualmente no Supabase Dashboard:**
   - Authentication → Users → Add User
   - Email e senha
   - Em `user_metadata`, adicione:
     ```json
     {
       "role": "admin",
       "perfil": "master"
     }
     ```

2. **Ou usar a API diretamente** (se tiver service role key configurada):
   - Acessar `/admin/usuarios`
   - Criar usuário através do modal

---

## 📚 Permissões e Perfis

### Perfis Disponíveis
- **master**: Acesso total (sempre tem todas as permissões)
- **super_admin**: Quase total, exceto algumas configurações críticas
- **admin**: Administrador geral
- **financeiro**: Acesso a módulos financeiros
- **vendas**: Acesso a vendas e propostas
- **atendimento**: Atendimento ao cliente
- **assistente**: Acesso limitado
- **readonly**: Somente leitura

### Permissões
Array de strings como:
- `dashboard`, `propostas`, `clientes`, `financeiro`, `usuarios`, etc.

---

## 🐛 Debug

Para debugar problemas:

1. **Console do navegador (F12):**
   - Verificar erros JavaScript
   - Verificar logs de autenticação
   - Verificar requisições de rede

2. **Terminal do servidor:**
   - Verificar erros de compilação
   - Verificar logs do servidor

3. **Supabase Dashboard:**
   - Verificar usuários em Authentication → Users
   - Verificar dados em Table Editor → usuarios_admin


