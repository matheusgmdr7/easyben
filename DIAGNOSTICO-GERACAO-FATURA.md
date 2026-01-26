# 🔍 Diagnóstico: Geração de Fatura Não Funcionando

## 📋 Análise dos Logs do Frontend

### ❌ **PROBLEMA PRINCIPAL: Erro 401 Bloqueia Todo o Fluxo**

Pelos logs do frontend, identifiquei que:

1. ✅ **Wizard envia dados corretamente:**
   ```
   📤 Dados de integração sendo enviados: {
     proposta_id: 'ad88fe7c-c195-4d98-ac89-58a7c29b979a',
     administradora_id: 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f',
     valor_mensal: 1102,
     data_vencimento: '2025-11-10',
     gerar_fatura: true,  ← ✅ Parâmetro está sendo enviado!
     criar_assinatura: false
   }
   ```

2. ❌ **Integração falha no cadastro do cliente:**
   ```
   ✅ Integração Asaas concluída: {
     cliente_asaas_id: '',  ← ❌ Vazio! Cliente não foi cadastrado
     fatura_asaas_id: '',    ← ❌ Vazio! Fatura não foi gerada (não chegou aqui)
     sucesso: false,
     erros: ['Erro na requisição Asaas: 401 - "A chave de API fornecida é inválida"']
   }
   ```

3. ⚠️ **A geração de fatura nunca é executada** porque o cliente não foi cadastrado primeiro.

## 📋 Problemas Identificados

### 1. **Erro 401 - Chave API Inválida** ⚠️ **CRÍTICO**
```
⚠️ Erros na integração: ['Erro na requisição Asaas: 401 - {"errors":[{"code":"invalid_access_token","description":"A chave de API fornecida é inválida"}]}']
```

**Status:** Ainda não resolvido - **BLOQUEIA TODO O FLUXO**

**Possíveis causas:**
- Chave API incorreta no banco de dados
- Ambiente incorreto (sandbox vs produção)
- Chave API expirada ou revogada
- Chave API de ambiente diferente sendo usada
- Chave API sendo truncada ou modificada

### 2. **Erro 406 - Not Acceptable** ⚠️
```
GET .../clientes_administradoras?select=*&administradora_id=eq.a7b5b2d5-0e8f-4905-8917-4b95dc98d20f&proposta_id=eq.ad88fe7c-c195-4d98-ac89-58a7c29b979a 406 (Not Acceptable)
```

**Causa:** Query do Supabase usando `select=*` pode estar causando problema com RLS (Row Level Security) ou formato aceito.

### 3. **Logs do Backend Não Aparecem** ⚠️
Não estamos vendo os logs detalhados que foram adicionados:
- `💰 [ASAAS] Criando cobrança (fatura)...`
- `📤 Dados da fatura para Asaas:`
- `🔑 Customer ID:`
- `✅ Fatura criada no Asaas com sucesso!`

Isso indica que:
- Ou a requisição não está chegando ao backend
- Ou está falhando antes de chegar na função `gerarFaturaInicial`
- Ou está sendo bloqueada pelo erro 401 no cadastro do cliente

## 🔧 Próximos Passos para Resolver

### ⚠️ **AÇÃO IMEDIATA NECESSÁRIA:**

**1. Copiar Logs do Terminal do Backend** 📋
   - Abra o terminal onde está rodando `npm run dev`
   - Execute o teste novamente (cadastrar cliente com gerar fatura)
   - **Copie TODOS os logs** que aparecerem, especialmente:
     - `🚀 [API] Iniciando integração com Asaas...`
     - `🔍 [ASAAS CONFIG] Buscando configuração...`
     - `🔧 [ASAAS] Ambiente configurado: ...`
     - `🔑 [ASAAS] API Key (primeiros 20 chars): ...`
     - `👤 Cadastrando cliente no Asaas...`
     - `❌ Erro na requisição Asaas: 401...`
     - Qualquer stack trace completo

**2. Verificar Chave API no Banco de Dados** 🔑
   Execute no Supabase SQL Editor e envie o resultado:

### Passo 2: Verificar Chave API no Banco
Execute no Supabase SQL Editor:
```sql
SELECT 
  administradora_id,
  ambiente,
  status_integracao,
  LENGTH(api_key) as tamanho_chave,
  LEFT(api_key, 20) as inicio_chave,
  RIGHT(api_key, 20) as fim_chave,
  updated_at
FROM administradoras_config_financeira
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f'
  AND status_integracao = 'ativa';
```

**Verificar:**
- ✅ `ambiente` deve ser `'producao'` (não `'sandbox'`)
- ✅ `status_integracao` deve ser `'ativa'`
- ✅ Chave deve começar com `$aact_prod_` (produção) ou `$aact_YTUx` (sandbox)
- ✅ Se chave de produção, ambiente deve ser `'producao'`

### Passo 3: Testar API Diretamente
Use o curl ou Postman para testar diretamente a API do Asaas:

```bash
# Testar com chave de PRODUÇÃO
curl -X GET "https://api.asaas.com/v3/myAccount" \
  -H "access_token: SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json"

# Testar com chave de SANDBOX
curl -X GET "https://sandbox.asaas.com/api/v3/myAccount" \
  -H "access_token: SUA_CHAVE_AQUI" \
  -H "Content-Type: application/json"
```

### Passo 4: Corrigir Erro 406
O erro 406 pode estar impedindo a verificação do vínculo. Verificar se há RLS bloqueando a query.

## 📝 Checklist de Verificação

- [ ] Logs completos do terminal do servidor foram copiados
- [ ] Chave API verificada no banco de dados
- [ ] Ambiente correto (producao) confirmado no banco
- [ ] Teste direto na API do Asaas realizado
- [ ] Erro 406 investigado e resolvido
- [ ] Cliente está sendo cadastrado no Asaas (mesmo com erro 401)
- [ ] Função `gerarFaturaInicial` está sendo executada
