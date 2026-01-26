# 🚨 Correção Urgente - Problemas Identificados

## ❌ Problemas Encontrados

### 1. **RLS Bloqueando Acesso**
- O RLS está ativo mas o `tenant_id` não está sendo definido no contexto do PostgreSQL
- A função `get_current_tenant_id()` retorna NULL
- Todas as queries estão sendo bloqueadas

### 2. **Página /admin Não Funciona**
- Menu do admin não mostra páginas
- Provavelmente porque as queries de permissões estão sendo bloqueadas pelo RLS

### 3. **Login de Corretores Não Funciona**
- Queries de autenticação estão sendo bloqueadas pelo RLS

---

## ✅ Solução Imediata

### **Script SQL Criado**: `scripts/WHITELABEL-04-ajustar-rls-compatibilidade.sql`

Este script:
1. ✅ Atualiza `get_current_tenant_id()` para usar tenant padrão quando não definido
2. ✅ Ajusta todas as policies RLS para permitir acesso ao tenant padrão
3. ✅ Permite que o sistema continue funcionando enquanto ajustamos a implementação

### **Como Executar**:

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o script `WHITELABEL-04-ajustar-rls-compatibilidade.sql`
4. Verifique se não há erros

---

## 🔧 O Que Este Script Faz

### **1. Atualiza Função `get_current_tenant_id()`**
- Tenta obter do contexto (`app.current_tenant_id`)
- Se não encontrar, tenta obter do `tenant_slug`
- Se ainda não encontrar, usa tenant padrão (`00000000-0000-0000-0000-000000000001`)

### **2. Ajusta Policies RLS**
- Permite acesso quando `tenant_id` corresponde ao tenant atual
- **OU** quando o tenant atual é o padrão (modo compatibilidade)
- Isso permite que o sistema funcione mesmo sem definir o contexto

---

## ⚠️ Importante

Este é um **ajuste temporário** para permitir que o sistema funcione.

**Próximos passos** (após o sistema voltar a funcionar):
1. Implementar sistema que define `tenant_id` no contexto antes de queries
2. Ajustar todos os serviços para usar o tenant correto
3. Remover o modo compatibilidade quando tudo estiver funcionando

---

## 🧪 Teste Após Executar

1. ✅ Tente fazer login no `/admin/login`
2. ✅ Verifique se o menu do admin aparece
3. ✅ Tente fazer login no `/corretor/login`
4. ✅ Verifique se as páginas do admin carregam

---

## 📝 Notas

- O sistema continuará funcionando com o tenant padrão "Contratando Planos"
- Quando implementarmos o sistema completo de whitelabel, cada cliente terá seu próprio tenant
- Por enquanto, todos os dados estão associados ao tenant padrão

---

**Execute o script SQL e me avise se o sistema voltou a funcionar!** 🚀

