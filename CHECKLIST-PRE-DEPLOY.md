# ✅ Checklist Pré-Deploy - Sistema White-Label

## 🎯 Decisão: Deploy Agora?

### ⚠️ **NÃO RECOMENDADO** - Razões:

1. ❌ **Admin Sidebar ainda não funciona completamente**
2. ❌ **API route não existe em produção** (retorna 404)
3. ❌ **Fallback pode não funcionar** (depende do RLS)
4. ❌ **Não há ambiente de staging** para testar

## 📋 Checklist de Verificação

### 🔴 CRÍTICO - Verificar ANTES de qualquer deploy

#### 1. Banco de Dados
- [ ] **Verificar se scripts SQL foram executados em produção**:
  ```sql
  -- Executar no Supabase SQL Editor
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tenants'
  ) AS tabela_tenants_existe;
  
  SELECT column_name, table_name 
  FROM information_schema.columns 
  WHERE column_name = 'tenant_id' 
  AND table_name IN ('propostas', 'corretores', 'clientes_administradoras', 'produtos_corretores')
  ORDER BY table_name;
  ```

- [ ] **Verificar se há dados sem tenant_id**:
  ```sql
  SELECT 
    'propostas' AS tabela,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) AS sem_tenant_id
  FROM propostas
  UNION ALL
  SELECT 
    'corretores' AS tabela,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) AS sem_tenant_id
  FROM corretores;
  ```

- [ ] **Verificar RLS policies**:
  ```sql
  SELECT tablename, policyname, cmd 
  FROM pg_policies 
  WHERE tablename IN ('propostas', 'corretores', 'usuarios_admin')
  ORDER BY tablename, policyname;
  ```

#### 2. Código
- [ ] **Verificar se build funciona**:
  ```bash
  npm run build
  # Deve compilar sem erros
  ```

- [ ] **Verificar variáveis de ambiente**:
  - [ ] `SUPABASE_URL` configurada em produção?
  - [ ] `SUPABASE_ANON_KEY` configurada em produção?
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada em produção? (CRÍTICO para API routes)

#### 3. Funcionalidades
- [ ] **Testar login de admin localmente**:
  - [ ] Login funciona?
  - [ ] Sidebar aparece completo?
  - [ ] Permissões funcionam?

- [ ] **Testar login de corretor localmente**:
  - [ ] Login funciona?
  - [ ] Dashboard aparece?

## 🚦 Estratégias de Deploy

### Opção 1: Deploy Parcial (SEGURA) ⭐ RECOMENDADA

**Deploy apenas das correções críticas** (sem white-label):

#### O que fazer deploy:
1. ✅ API route `/api/admin/auth/user/route.ts`
2. ✅ Correções de fallback em `hooks/use-permissions.tsx`
3. ✅ Correções de fallback em `lib/supabase-auth.ts`
4. ✅ Correções de permissões em `services/usuarios-admin-service.ts`

#### O que NÃO fazer deploy:
- ❌ Mudanças de white-label (middleware, tenant context, etc.)
- ❌ Mudanças em serviços que adicionam `tenant_id`
- ❌ Novas páginas de plataformas

#### Vantagens:
- ✅ Corrige o problema do admin sidebar
- ✅ Não introduz riscos de white-label
- ✅ Permite testar as correções isoladamente
- ✅ Rollback mais fácil

#### Como fazer:
```bash
# 1. Criar branch apenas com correções
git checkout -b fix/admin-sidebar-only

# 2. Adicionar apenas os arquivos de correção
git add app/api/admin/auth/user/route.ts
git add hooks/use-permissions.tsx
git add lib/supabase-auth.ts
git add services/usuarios-admin-service.ts

# 3. Commit
git commit -m "fix: corrigir admin sidebar e fallback de API"

# 4. Deploy apenas desta branch
```

### Opção 2: Deploy Completo (ARRISCADA) ⚠️

**Deploy de tudo** (white-label completo):

#### Pré-requisitos OBRIGATÓRIOS:
1. ✅ **TODOS os scripts SQL executados em produção**:
   - `WHITELABEL-01-criar-tabela-tenants.sql`
   - `WHITELABEL-02-adicionar-tenant-id-tabelas.sql`
   - `WHITELABEL-03-criar-rls-policies.sql`
   - `WHITELABEL-04-ajustar-rls-compatibilidade.sql`
   - `WHITELABEL-05-corrigir-rls-usuarios-admin.sql`
   - `WHITELABEL-06-garantir-permissoes-usuarios.sql`

2. ✅ **Backup do banco confirmado**
3. ✅ **Testes locais passando**
4. ✅ **Plano de rollback documentado**

#### Riscos:
- 🔴 Pode quebrar funcionalidades existentes
- 🔴 Pode bloquear acesso de usuários
- 🔴 Pode causar perda de dados (se scripts SQL falharem)
- 🔴 Difícil rollback

### Opção 3: Ambiente de Staging (IDEAL) ⭐⭐⭐

**Criar ambiente de staging primeiro**:

1. ✅ Copiar banco de produção para staging
2. ✅ Executar scripts SQL em staging
3. ✅ Fazer deploy do código em staging
4. ✅ Testar tudo em staging
5. ✅ Se tudo OK, fazer deploy em produção

## 📊 Matriz de Decisão

| Situação | Deploy Recomendado? | Estratégia |
|----------|---------------------|------------|
| Admin sidebar quebrado + Sem staging | ⚠️ Parcial | Opção 1: Apenas correções |
| Admin sidebar quebrado + Com staging | ✅ Sim | Opção 3: Testar em staging primeiro |
| Tudo funcionando + Scripts SQL executados | ✅ Sim | Opção 2: Deploy completo |
| Tudo funcionando + Scripts SQL NÃO executados | ❌ Não | Executar scripts SQL primeiro |

## 🎯 Recomendação Final

### Para AGORA:

**NÃO FAZER DEPLOY COMPLETO**

**FAZER DEPLOY PARCIAL** (Opção 1):
- ✅ Deploy apenas das correções do admin sidebar
- ✅ Isso resolve o problema atual
- ✅ Não introduz riscos de white-label
- ✅ Permite testar as correções isoladamente

### Para DEPOIS:

1. ✅ Criar ambiente de staging
2. ✅ Testar white-label completo em staging
3. ✅ Executar scripts SQL em staging
4. ✅ Testar tudo em staging
5. ✅ Se tudo OK, fazer deploy completo em produção

## 🔧 Comandos Úteis

### Verificar status do Git:
```bash
git status
git diff --name-only
```

### Verificar build:
```bash
npm run build
```

### Verificar variáveis de ambiente (local):
```bash
# Verificar se .env.local existe e tem as variáveis
cat .env.local | grep SUPABASE
```

## ⚠️ Avisos Importantes

1. **NUNCA faça deploy sem backup do banco**
2. **NUNCA faça deploy sem testar localmente primeiro**
3. **SEMPRE tenha um plano de rollback**
4. **SEMPRE verifique se scripts SQL foram executados**

## 📞 Próximos Passos

1. ✅ **Decidir qual estratégia usar** (recomendo Opção 1)
2. ✅ **Executar checklist de verificação**
3. ✅ **Fazer deploy gradual** (correções primeiro)
4. ✅ **Monitorar erros** após deploy
5. ✅ **Ter plano de rollback pronto**

