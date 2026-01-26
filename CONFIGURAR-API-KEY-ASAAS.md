# 🔑 Como Configurar a API Key do Asaas

## 🚨 Erro Atual:

```
❌ Configuração do Asaas não encontrada para esta administradora
```

## 📋 Problema:

A API Key pode estar configurada, mas o `status_integracao` pode não estar como `"ativa"` na tabela `administradoras_config_financeira`.

---

## ✅ Solução Rápida (3 Passos):

### **Passo 1: Verificar a Configuração Atual**

Execute no Supabase SQL Editor:
```bash
scripts/DEBUG-CONFIG-ASAAS.sql
```

**Este script vai mostrar:**
- ✅ Se a configuração existe
- ✅ Se a API Key está preenchida
- ✅ Se o status está como "ativa"

### **Passo 2: Corrigir o Status (se necessário)**

Se a API Key estiver configurada mas o status não estiver como "ativa", execute:
```bash
scripts/CORRIGIR-STATUS-CONFIG-ASAAS.sql
```

**Este script vai:**
- ✅ Atualizar `status_integracao` para `"ativa"`
- ✅ Se a API Key estiver preenchida

### **Passo 3: Testar o Fluxo Novamente**

1. Recarregue a página (Ctrl+Shift+R ou Cmd+Shift+R)
2. Selecione um cliente (ex: "Matteus Silva")
3. Complete o cadastro com:
   - ✅ **Integrar com Asaas: MARCADO**
   - ✅ **Criar Assinatura: MARCADO**
4. Finalize

---

## 🔍 Se a Configuração NÃO Existir:

Se os scripts mostrarem que não há configuração:

1. **Vá para a página de configurações:**
   ```
   /admin/administradoras/a7b5b2d5-0e8f-4905-8917-4b95dc98d20f/configuracoes
   ```

2. **Preencha:**
   - Instituição Financeira: `Asaas`
   - API Key: Sua chave do Asaas (obtenha em https://www.asaas.com/config/api)
   - Ambiente: `Sandbox` (para testes) ou `Produção`

3. **Salve** e teste novamente

---

## 🔍 Verificação:

Para verificar se a configuração está correta, execute:

```sql
SELECT 
    administradora_id,
    instituicao_financeira,
    CASE
        WHEN api_key IS NOT NULL AND api_key != ''
        THEN '✅ API Key configurada (' || LENGTH(api_key) || ' caracteres)'
        ELSE '❌ API Key não configurada'
    END as api_key_status,
    ambiente,
    status_integracao
FROM administradoras_config_financeira
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';
```

**Resultado esperado:**
```
✅ API Key configurada (XXX caracteres)
ambiente: sandbox (ou production)
status_integracao: ativa
```

---

## 📝 Observações Importantes:

1. **Segurança da API Key:**
   - ⚠️ NUNCA commite a API Key no Git
   - ⚠️ Use variáveis de ambiente em produção
   - ⚠️ A API Key dá acesso total à sua conta Asaas

2. **Ambientes:**
   - **Sandbox:** Para testes (não cobra de verdade)
   - **Production:** Valores reais (cuidado!)

3. **Próximos Passos:**
   - Após configurar, o fluxo completo deve funcionar
   - Cliente será cadastrado no Asaas
   - Fatura será gerada
   - Assinatura recorrente será criada (se marcado)

---

## 🎯 Resumo das Correções até Agora:

| # | Erro | Status |
|---|------|--------|
| 1 | `AsaasService.createCustomer is not a function` | ✅ CORRIGIDO |
| 2 | `API Key do Asaas não configurada` | ✅ CORRIGIDO |
| 3 | `CORS policy blocked` | ✅ CORRIGIDO |
| 4 | `Configuração do Asaas não encontrada` | ⏳ **AGUARDANDO SQL** |

**Próximo passo:** Execute o script SQL com sua API Key real! 🚀
