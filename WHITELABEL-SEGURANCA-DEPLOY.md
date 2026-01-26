# 🔒 Segurança e Deploy - Whitelabel

## ⚠️ IMPORTANTE: Nenhuma mudança será commitada automaticamente

Todas as alterações estão sendo feitas localmente e **NÃO serão commitadas** sem sua aprovação explícita.

## 📋 Checklist de Segurança

### Antes de Fazer Deploy

- [ ] **Backup completo do banco de dados** ✅ (Já feito)
- [ ] **Testar em ambiente de desenvolvimento**
- [ ] **Verificar que RLS está funcionando**
- [ ] **Testar isolamento de dados entre tenants**
- [ ] **Revisar todas as mudanças**
- [ ] **Criar branch separada para whitelabel**
- [ ] **Testar rollback se necessário**

## 🧪 Estratégia de Teste Seguro

### Opção 1: Branch Separada (Recomendado)

```bash
# Criar branch para whitelabel
git checkout -b feature/whitelabel-multi-tenant

# Trabalhar normalmente
# ... fazer mudanças ...

# Quando estiver pronto para testar
git add .
git commit -m "feat: implementação whitelabel multi-tenant"

# Fazer merge apenas quando testado
git checkout main
git merge feature/whitelabel-multi-tenant
```

### Opção 2: Stash (Para testar sem commit)

```bash
# Salvar mudanças atuais
git stash save "whitelabel-wip"

# Voltar ao estado original
git checkout main

# Quando quiser voltar às mudanças
git stash pop
```

### Opção 3: Ambiente de Teste Separado

- Criar ambiente de staging/teste
- Deploy apenas neste ambiente primeiro
- Testar completamente antes de produção

## 🚀 Plano de Deploy Seguro

### Fase 1: Preparação (Já Feito ✅)
- [x] Backup do banco
- [x] Scripts SQL criados
- [x] Estrutura de tenants criada

### Fase 2: Desenvolvimento (Em Andamento)
- [x] Helper de tenant criado
- [x] Serviços críticos atualizados
- [ ] Testes locais
- [ ] Validação de isolamento

### Fase 3: Teste em Staging
- [ ] Deploy em ambiente de teste
- [ ] Testar com dados reais
- [ ] Verificar performance
- [ ] Validar RLS

### Fase 4: Deploy em Produção
- [ ] Deploy gradual (feature flag)
- [ ] Monitorar erros
- [ ] Rollback plan pronto

## 🔄 Rollback Plan

Se algo der errado:

1. **Reverter código:**
```bash
git revert HEAD
```

2. **Reverter banco (se necessário):**
```sql
-- Usar backup criado antes
-- Restaurar schema backup_pre_whitelabel
```

3. **Desabilitar RLS temporariamente:**
```sql
ALTER TABLE nome_tabela DISABLE ROW LEVEL SECURITY;
```

## 📝 Arquivos Modificados (NÃO COMMITADOS)

### Serviços Atualizados
- `services/propostas-service.ts`
- `services/corretores-service.ts`
- `services/produtos-corretores-service.ts`
- `services/comissoes-service.ts`
- `services/clientes-administradoras-service.ts`
- `services/faturas-service.ts`

### Novos Arquivos
- `lib/tenant-query-helper.ts`
- `lib/tenant-utils-server.ts`
- `lib/tenant-context.tsx`
- `components/theme-provider-tenant.tsx`
- `middleware.ts` (atualizado)
- `app/super-admin/**` (novo)
- `app/api/super-admin/**` (novo)

### Scripts SQL (Já Executados)
- `scripts/WHITELABEL-01-criar-tabela-tenants.sql` ✅
- `scripts/WHITELABEL-02-adicionar-tenant-id-tabelas.sql` ✅
- `scripts/WHITELABEL-03-criar-rls-policies.sql` ✅

## ⚠️ Atenção

**NENHUM destes arquivos será commitado automaticamente!**

Você precisa fazer commit manualmente quando estiver pronto:

```bash
# Ver o que mudou
git status

# Adicionar arquivos específicos
git add lib/tenant-query-helper.ts
git add services/*.ts

# Commit
git commit -m "feat: implementação whitelabel - fase 4"
```

## 🧪 Como Testar Localmente

1. **Rodar em desenvolvimento:**
```bash
npm run dev
```

2. **Testar isolamento:**
   - Criar dados em um tenant
   - Verificar que não aparecem em outro
   - Testar todas as operações CRUD

3. **Verificar logs:**
   - Verificar console do navegador
   - Verificar logs do servidor
   - Verificar erros no Supabase

## 📊 Status Atual

- ✅ Fase 1: Estrutura de banco (completa)
- ✅ Fase 2: Super Admin (completa)
- ✅ Fase 3: Middleware e Context (completa)
- ✅ Fase 4: Serviços críticos (completa)
- ⏳ Fase 5: Testes e validação (próxima)
- ⏳ Fase 6: Deploy (futuro)

---

**Última atualização**: Agora  
**Status**: Desenvolvimento - Nenhum commit feito

