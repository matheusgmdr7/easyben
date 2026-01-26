# ⚠️ Análise de Risco: Deploy do Sistema White-Label

## 📋 Resumo Executivo

**Status Atual**: ⚠️ **DEPLOY NÃO RECOMENDADO AGORA**

**Razão Principal**: O sistema ainda tem problemas não resolvidos que podem afetar a experiência dos usuários em produção.

## 🔴 Riscos Identificados

### 1. **Problema Crítico: Admin Sidebar Incompleto**
- **Status**: ❌ Não resolvido completamente
- **Impacto**: Usuários admin não conseguem acessar todas as funcionalidades
- **Causa**: API route `/api/admin/auth/user` retorna 404 em produção
- **Solução Temporária**: Fallback implementado, mas pode não funcionar devido ao RLS

### 2. **Mudanças no Banco de Dados**
- **Scripts SQL Executados**:
  - ✅ `WHITELABEL-01-criar-tabela-tenants.sql` - Nova tabela (seguro)
  - ✅ `WHITELABEL-02-adicionar-tenant-id-tabelas.sql` - Adiciona coluna `tenant_id` (pode afetar queries)
  - ✅ `WHITELABEL-03-criar-rls-policies.sql` - Políticas RLS (pode bloquear acesso)
  - ✅ `WHITELABEL-04-ajustar-rls-compatibilidade.sql` - Ajustes de compatibilidade
  - ✅ `WHITELABEL-05-corrigir-rls-usuarios-admin.sql` - Correção de RLS para admin
  - ✅ `WHITELABEL-06-garantir-permissoes-usuarios.sql` - Atualização de permissões

- **Risco**: Se os scripts não foram executados em produção, o sistema pode quebrar

### 3. **Mudanças no Código**
- **Novas API Routes**: `/api/admin/auth/user` (não existe em produção)
- **Mudanças em Serviços**: Todos os serviços agora filtram por `tenant_id`
- **Novo Middleware**: Detecta tenant por domínio
- **Novos Componentes**: Página de plataformas, etc.

### 4. **Dependências de Scripts SQL**
- Se os scripts SQL não foram executados em produção, o sistema pode:
  - Não encontrar a coluna `tenant_id` nas tabelas
  - Ter queries quebradas
  - Ter RLS bloqueando acesso

## ✅ O Que Está Funcionando

1. ✅ **Sistema atual funciona** (dados antigos ainda acessíveis)
2. ✅ **Fallback implementado** (tenta buscar do Supabase se API falhar)
3. ✅ **Scripts SQL são idempotentes** (podem ser executados múltiplas vezes)
4. ✅ **Backup feito** (você mencionou que o Supabase faz backups diários)

## ⚠️ O Que Pode Quebrar

1. ❌ **Admin Sidebar**: Pode não aparecer completo se o fallback não funcionar
2. ❌ **Queries sem tenant_id**: Se algum serviço não foi atualizado
3. ❌ **RLS muito restritivo**: Pode bloquear acesso legítimo
4. ❌ **API Routes faltando**: Algumas funcionalidades podem não funcionar

## 🎯 Checklist ANTES do Deploy

### Fase 1: Verificação de Banco de Dados (CRÍTICO)

- [ ] **Verificar se TODOS os scripts SQL foram executados em produção**:
  ```sql
  -- Verificar se a tabela tenants existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tenants'
  );
  
  -- Verificar se tenant_id existe nas tabelas principais
  SELECT column_name, table_name 
  FROM information_schema.columns 
  WHERE column_name = 'tenant_id' 
  AND table_name IN ('propostas', 'corretores', 'clientes_administradoras', 'produtos_corretores');
  
  -- Verificar RLS policies
  SELECT tablename, policyname 
  FROM pg_policies 
  WHERE tablename IN ('propostas', 'corretores', 'usuarios_admin');
  ```

- [ ] **Verificar se há dados sem tenant_id**:
  ```sql
  -- Verificar se há registros sem tenant_id (devem ser migrados)
  SELECT COUNT(*) FROM propostas WHERE tenant_id IS NULL;
  SELECT COUNT(*) FROM corretores WHERE tenant_id IS NULL;
  ```

### Fase 2: Testes Locais (OBRIGATÓRIO)

- [ ] **Testar login de admin**:
  - [ ] Login funciona?
  - [ ] Sidebar aparece completo?
  - [ ] Permissões funcionam?

- [ ] **Testar login de corretor**:
  - [ ] Login funciona?
  - [ ] Dashboard aparece?

- [ ] **Testar funcionalidades principais**:
  - [ ] Criar proposta
  - [ ] Listar propostas
  - [ ] Criar corretor
  - [ ] Listar corretores
  - [ ] Criar cliente
  - [ ] Listar clientes

- [ ] **Testar em diferentes domínios** (se possível):
  - [ ] Domínio principal funciona?
  - [ ] Subdomínio funciona?

### Fase 3: Verificação de Código (IMPORTANTE)

- [ ] **Verificar se todas as mudanças estão commitadas**:
  ```bash
  git status
  git diff
  ```

- [ ] **Verificar se não há código quebrado**:
  ```bash
  npm run build
  # Verificar se não há erros de compilação
  ```

- [ ] **Verificar variáveis de ambiente**:
  - [ ] `SUPABASE_URL` configurada?
  - [ ] `SUPABASE_ANON_KEY` configurada?
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada? (importante para API routes)

### Fase 4: Plano de Rollback (ESSENCIAL)

- [ ] **Backup do banco de dados confirmado**:
  - [ ] Backup automático do Supabase está ativo?
  - [ ] Backup manual feito antes do deploy?

- [ ] **Plano de rollback documentado**:
  - [ ] Como reverter o código?
  - [ ] Como reverter os scripts SQL (se necessário)?
  - [ ] Tempo estimado de rollback?

## 🚦 Recomendações

### Opção 1: Deploy Parcial (RECOMENDADO)

**Deploy apenas das correções críticas**:

1. ✅ Deploy da API route `/api/admin/auth/user`
2. ✅ Deploy das correções de fallback
3. ✅ Deploy das correções de permissões
4. ❌ **NÃO fazer deploy** das mudanças de white-label ainda

**Vantagens**:
- Corrige o problema do admin sidebar
- Não introduz riscos de white-label
- Permite testar as correções isoladamente

### Opção 2: Deploy Completo (ARRISCADO)

**Deploy de tudo**:

1. ⚠️ Executar TODOS os scripts SQL em produção primeiro
2. ⚠️ Verificar se tudo funciona
3. ⚠️ Fazer deploy do código
4. ⚠️ Monitorar erros

**Riscos**:
- Pode quebrar funcionalidades existentes
- Pode bloquear acesso de usuários
- Pode causar perda de dados (se scripts SQL falharem)

### Opção 3: Ambiente de Staging (IDEAL)

**Criar ambiente de staging**:

1. ✅ Copiar banco de produção para staging
2. ✅ Executar scripts SQL em staging
3. ✅ Fazer deploy do código em staging
4. ✅ Testar tudo em staging
5. ✅ Se tudo OK, fazer deploy em produção

**Vantagens**:
- Testa tudo sem risco
- Permite identificar problemas antes
- Rollback mais fácil

## 📊 Matriz de Risco

| Componente | Risco | Impacto | Probabilidade | Ação Recomendada |
|------------|-------|---------|---------------|------------------|
| Admin Sidebar | 🔴 Alto | Alto | Alta | Corrigir antes do deploy |
| Scripts SQL | 🟡 Médio | Alto | Média | Executar em staging primeiro |
| API Routes | 🟡 Médio | Médio | Média | Deploy parcial |
| RLS Policies | 🟡 Médio | Alto | Média | Testar em staging |
| Middleware | 🟢 Baixo | Baixo | Baixa | Deploy OK |
| Serviços | 🟡 Médio | Médio | Média | Testar em staging |

## ✅ Decisão Recomendada

**NÃO FAZER DEPLOY AGORA**

**Motivos**:
1. ❌ Admin sidebar ainda não funciona completamente
2. ❌ Fallback pode não funcionar devido ao RLS
3. ❌ Não há ambiente de staging para testar
4. ❌ Scripts SQL podem não ter sido executados em produção

**Próximos Passos**:
1. ✅ Resolver o problema do admin sidebar completamente
2. ✅ Criar ambiente de staging (se possível)
3. ✅ Testar tudo em staging
4. ✅ Fazer deploy gradual (correções primeiro, white-label depois)

## 🔧 Alternativa: Deploy de Correções Críticas

Se você **precisar** fazer deploy agora, faça apenas:

1. ✅ Deploy da API route `/api/admin/auth/user`
2. ✅ Deploy das correções de fallback
3. ✅ Deploy das correções de permissões
4. ❌ **NÃO fazer deploy** das mudanças de white-label

Isso corrige o problema atual sem introduzir riscos de white-label.

