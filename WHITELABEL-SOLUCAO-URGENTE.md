# 🚨 Solução Urgente - Sistema Bloqueado pelo RLS

## 📋 Resumo do Problema

Após executar os scripts SQL de whitelabel, o sistema parou de funcionar porque:

1. ❌ **RLS está bloqueando todas as queries** - O `tenant_id` não está sendo definido no contexto do PostgreSQL
2. ❌ **Página `/admin` não funciona** - Menu não aparece porque queries de permissões são bloqueadas
3. ❌ **Login de corretores não funciona** - Queries de autenticação são bloqueadas

---

## ✅ Solução Imediata

### **Execute o Script SQL**: `scripts/WHITELABEL-04-ajustar-rls-compatibilidade.sql`

Este script ajusta o RLS para permitir que o sistema funcione enquanto implementamos a solução completa.

### **Passos**:

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `scripts/WHITELABEL-04-ajustar-rls-compatibilidade.sql`
4. **Copie e cole** o conteúdo no editor
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Aguarde a confirmação de sucesso

---

## 🔧 O Que Este Script Faz

### **1. Atualiza `get_current_tenant_id()`**
- Tenta obter `tenant_id` do contexto PostgreSQL
- Se não encontrar, usa o tenant padrão (`00000000-0000-0000-0000-000000000001`)
- Garante que sempre retorna um valor válido

### **2. Ajusta Todas as Policies RLS**
- Permite acesso quando `tenant_id` corresponde ao tenant atual
- **E também** permite acesso ao tenant padrão (modo compatibilidade)
- Isso permite que o sistema funcione mesmo sem definir o contexto

---

## 🧪 Teste Após Executar

Após executar o script, teste:

1. ✅ Acesse `/admin/login` e faça login
2. ✅ Verifique se o menu do admin aparece com todas as páginas
3. ✅ Acesse `/corretor/login` e tente fazer login
4. ✅ Verifique se as páginas do admin carregam normalmente

---

## ⚠️ Importante

### **Este é um ajuste temporário!**

O sistema funcionará com o tenant padrão "Contratando Planos" enquanto:
- Ajustamos a implementação completa
- Implementamos o sistema que define `tenant_id` corretamente
- Configuramos o whitelabel para múltiplos clientes

### **Próximos Passos** (depois que o sistema voltar a funcionar):

1. Implementar sistema que define `tenant_id` no contexto antes de queries
2. Ajustar middleware para definir contexto corretamente
3. Testar com múltiplos tenants
4. Remover modo compatibilidade quando tudo estiver funcionando

---

## 📝 Notas Técnicas

- **Por que o RLS bloqueou?**
  - O RLS verifica se `tenant_id = get_current_tenant_id()`
  - Mas `get_current_tenant_id()` retornava NULL
  - NULL ≠ qualquer valor → todas as queries eram bloqueadas

- **Por que a solução funciona?**
  - Agora `get_current_tenant_id()` sempre retorna um valor (tenant padrão)
  - As policies permitem acesso ao tenant padrão
  - O sistema funciona normalmente com o tenant padrão

- **Segurança:**
  - O RLS ainda está ativo
  - Apenas permite acesso ao tenant padrão quando contexto não está definido
  - Quando implementarmos o sistema completo, cada tenant terá isolamento total

---

## 🚀 Após Executar

**Me avise se:**
- ✅ O sistema voltou a funcionar
- ❌ Ainda há problemas (e quais são)

**Depois podemos:**
- Ajustar a implementação completa
- Configurar whitelabel para múltiplos clientes
- Testar isolamento entre tenants

---

**Execute o script e me avise o resultado!** 🎯

