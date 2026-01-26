# 🔍 RESUMO DA VERIFICAÇÃO - API ASAAS BENEFIT COBRANÇAS

## ✅ Correções Implementadas

### 1. **Formatação do CPF na busca de clientes**
   - **Problema**: O CPF estava sendo passado com formatação (pontos e traços) para a API do Asaas
   - **Solução**: 
     - Corrigido `app/api/admin/recuperar-fatura-asaas/route.ts` para limpar o CPF antes de buscar
     - Corrigido `services/asaas-service.ts` no método `getCustomerByCpfCnpj()` para formatar automaticamente o CPF removendo caracteres não numéricos
   - **Arquivos modificados**:
     - `app/api/admin/recuperar-fatura-asaas/route.ts` (linha 163-165)
     - `services/asaas-service.ts` (linha 210-218)

### 2. **Logs melhorados**
   - Adicionados logs detalhados mostrando CPF original e CPF limpo
   - Facilita o diagnóstico de problemas

## 📋 Scripts de Verificação Criados

### 1. `scripts/verificar-api-asaas-benefit-detalhado.sql`
   - Verifica formato da API key
   - Verifica se há espaços ou caracteres especiais
   - Compara com outras administradoras
   - Mostra diagnóstico completo

### 2. `scripts/diagnostico-completo-asaas-benefit.sql`
   - Verificação completa da configuração
   - Verificação de caracteres especiais
   - Verificação de CPFs dos clientes
   - Comparação com outras administradoras
   - Diagnóstico automático com recomendações

### 3. `scripts/testar-chamada-asaas-benefit.js`
   - Script JavaScript para testar a chamada completa
   - Testa cada etapa do processo
   - Mostra erros detalhados com sugestões de correção

## 🔍 Como a API Funciona

### Fluxo de Busca de Faturas:

1. **Busca Configuração no Banco**
   ```sql
   SELECT api_key, ambiente 
   FROM administradoras_config_financeira
   WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
     AND instituicao_financeira = 'asaas'
     AND status_integracao = 'ativa'
   ```

2. **Busca Cliente no Asaas por CPF**
   ```
   GET /customers?cpfCnpj={cpf_limpo}
   ```
   - CPF deve estar SEM pontos, traços ou espaços
   - Exemplo: `01432034448` (não `014.320.344-48`)

3. **Busca Faturas do Cliente**
   ```
   GET /payments?customer={customer_id}
   ```
   - Usa o ID do customer encontrado no passo 2

## ⚠️ Possíveis Problemas e Soluções

### Problema 1: API Key não encontrada
- **Sintoma**: Erro "API key do Asaas não encontrada"
- **Solução**: 
  - Verificar se existe configuração em `administradoras_config_financeira`
  - Verificar se `instituicao_financeira = 'asaas'`
  - Verificar se `status_integracao = 'ativa'`

### Problema 2: API Key com formato incorreto
- **Sintoma**: Erro 401 ou 403 do Asaas
- **Solução**:
  - API Key deve começar com `$aact_` (produção) ou `$aact_YTU` (sandbox)
  - Não deve ter espaços ou quebras de linha
  - Execute: `scripts/diagnostico-completo-asaas-benefit.sql` para verificar

### Problema 3: Cliente não encontrado no Asaas
- **Sintoma**: Erro "Cliente não encontrado no Asaas"
- **Solução**:
  - Verificar se o CPF no banco corresponde ao CPF no Asaas
  - Verificar se o cliente existe no Asaas
  - O CPF agora é formatado automaticamente (corrigido)

### Problema 4: Nenhuma cobrança encontrada
- **Sintoma**: Erro "Nenhuma cobrança encontrada no Asaas para este cliente"
- **Solução**:
  - Verificar se há faturas cadastradas no Asaas para o cliente
  - Verificar se o cliente_id está correto no Asaas

## 🧪 Como Testar

### Opção 1: Script SQL (Recomendado)
```sql
-- Execute no Supabase SQL Editor
\i scripts/diagnostico-completo-asaas-benefit.sql
```

### Opção 2: Script JavaScript
1. Abra o console do navegador (F12) em qualquer página do admin
2. Cole o conteúdo de `scripts/testar-chamada-asaas-benefit.js`
3. Pressione Enter
4. Veja os resultados no console

### Opção 3: Teste Manual
1. Acesse a página de uma administradora
2. Clique em "Atualizar & Sincronizar" em um cliente
3. Verifique os logs no console do servidor

## 📝 Próximos Passos

1. Execute `scripts/diagnostico-completo-asaas-benefit.sql` para verificar a configuração
2. Se a API Key estiver incorreta, corrija na página de configurações
3. Teste a importação de faturas usando o script JavaScript ou a API diretamente
4. Verifique os logs do servidor para identificar erros específicos

## 🔗 Arquivos Relacionados

- `app/api/admin/recuperar-fatura-asaas/route.ts` - API de recuperação de faturas
- `services/asaas-service.ts` - Serviço de integração com Asaas
- `app/api/importar-asaas/route.ts` - API de importação em massa
- `scripts/importar-todas-faturas-benefit-cobrancas-simples.js` - Script de importação em massa







