# 🔒 Fase 4: Segurança e Queries - Plano de Implementação

## 📋 Objetivo

Atualizar todos os serviços para filtrar automaticamente por `tenant_id`, garantindo isolamento completo de dados entre tenants.

## 🎯 Estratégia

1. **Criar helper** para facilitar queries com tenant
2. **Atualizar serviços críticos** primeiro
3. **Testar isolamento** após cada atualização
4. **Migrar serviços restantes** gradualmente

## 📊 Priorização de Serviços

### 🔴 CRÍTICOS (Atualizar Primeiro)
1. ✅ `propostas-service.ts` - Serviço principal de propostas
2. ✅ `corretores-service.ts` - Gestão de corretores
3. ✅ `produtos-corretores-service.ts` - Produtos
4. ✅ `clientes-administradoras-service.ts` - Clientes
5. ✅ `comissoes-service.ts` - Comissões
6. ✅ `faturas-service.ts` - Faturas

### 🟡 IMPORTANTES (Atualizar Depois)
7. `tabelas-service.ts` - Tabelas de preços
8. `administradoras-service.ts` - Administradoras
9. `leads-service.ts` - Leads
10. `modelos-propostas-service.ts` - Modelos

### 🟢 BAIXA PRIORIDADE (Atualizar Por Último)
11. `questionario-service.ts` - Questionários
12. `contratos-service.ts` - Contratos
13. Outros serviços auxiliares

## 🛠️ Implementação

### Passo 1: Helper Criado ✅
- `lib/tenant-query-helper.ts` - Funções helper para queries

### Passo 2: Atualizar Serviços Críticos

Para cada serviço, fazer:

1. **Importar helper:**
```typescript
import { getCurrentTenantId, withTenantFilter } from '@/lib/tenant-query-helper'
```

2. **Atualizar queries SELECT:**
```typescript
// ANTES:
const { data } = await supabase
  .from('propostas')
  .select('*')

// DEPOIS:
const tenantId = await getCurrentTenantId()
const { data } = await supabase
  .from('propostas')
  .select('*')
  .eq('tenant_id', tenantId)
```

3. **Atualizar INSERT:**
```typescript
// ANTES:
const { data } = await supabase
  .from('propostas')
  .insert(dados)

// DEPOIS:
const tenantId = await getCurrentTenantId()
const { data } = await supabase
  .from('propostas')
  .insert({
    ...dados,
    tenant_id: tenantId,
  })
```

4. **Atualizar UPDATE:**
```typescript
// ANTES:
const { data } = await supabase
  .from('propostas')
  .update(dados)
  .eq('id', id)

// DEPOIS:
const tenantId = await getCurrentTenantId()
const { data } = await supabase
  .from('propostas')
  .update(dados)
  .eq('id', id)
  .eq('tenant_id', tenantId) // Garantir que só atualiza do tenant correto
```

5. **Atualizar DELETE:**
```typescript
// ANTES:
await supabase
  .from('propostas')
  .delete()
  .eq('id', id)

// DEPOIS:
const tenantId = await getCurrentTenantId()
await supabase
  .from('propostas')
  .delete()
  .eq('id', id)
  .eq('tenant_id', tenantId) // Garantir que só deleta do tenant correto
```

## ✅ Checklist de Atualização

Para cada serviço:

- [ ] Importar helper de tenant
- [ ] Atualizar todas as queries SELECT
- [ ] Atualizar todos os INSERT
- [ ] Atualizar todos os UPDATE
- [ ] Atualizar todos os DELETE
- [ ] Testar que funciona
- [ ] Verificar que não quebrou funcionalidades existentes

## 🧪 Testes de Isolamento

Após atualizar cada serviço, testar:

1. **Criar dados em um tenant**
2. **Verificar que não aparecem em outro tenant**
3. **Verificar que RLS está funcionando**
4. **Testar todas as operações CRUD**

## 📝 Ordem de Implementação Sugerida

1. ✅ Helper criado
2. ⏳ `propostas-service.ts`
3. ⏳ `corretores-service.ts`
4. ⏳ `produtos-corretores-service.ts`
5. ⏳ `clientes-administradoras-service.ts`
6. ⏳ `comissoes-service.ts`
7. ⏳ `faturas-service.ts`
8. ⏳ Demais serviços

---

**Status**: Helper criado, pronto para atualizar serviços  
**Próximo**: Atualizar `propostas-service.ts`

