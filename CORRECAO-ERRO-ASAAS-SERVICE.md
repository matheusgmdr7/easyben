# ✅ CORREÇÃO: Erro na Geração de Fatura

## 🐛 Problema Identificado

**Erro:** `AsaasService.createCustomer is not a function`

**Cliente testado:** Matteus Silva (teste com outro cliente após Luzinete)

## 🔍 Análise dos Logs

### Log do Erro:
```
❌ Erro na integração com Asaas: TypeError: _asaas_service__WEBPACK_IMPORTED_MODULE_0__.AsaasService.createCustomer is not a function
    at IntegracaoAsaasService.cadastrarClienteNoAsaas (integracao-asaas-service.ts:152:40)
    at IntegracaoAsaasService.integrarClienteCompleto (integracao-asaas-service.ts:61:39)
```

### Fluxo Executado:
1. ✅ Cliente vinculado à administradora
2. ✅ Dados da proposta carregados
3. ✅ Configuração Asaas encontrada
4. ❌ **FALHA ao cadastrar cliente no Asaas**

## 🔧 Causa Raiz

O arquivo `services/asaas-service.ts` exporta o serviço de duas formas:

```typescript
// Linha 439: Exporta a CLASSE
export { AsaasService }

// Linha 440: Exporta uma INSTÂNCIA (default)
export default new AsaasService()
```

O arquivo `services/integracao-asaas-service.ts` estava importando **incorretamente**:

```typescript
// ❌ ERRADO - Importa a classe, não a instância
import { AsaasService, type AsaasCustomer, type AsaasCharge } from "./asaas-service"

// Tentava usar como instância
const cliente = await AsaasService.createCustomer(clienteData, apiKey)
//                    ^^^^^^^^^^^^^ - Método de instância, não estático!
```

## ✅ Solução Implementada

### Alteração no Import:
```typescript
// ✅ CORRETO - Importa a instância default
import AsaasServiceInstance from "./asaas-service"
import { type AsaasCustomer, type AsaasCharge } from "./asaas-service"

// Usa a instância corretamente
const cliente = await AsaasServiceInstance.createCustomer(clienteData, apiKey)
```

### Mudanças Realizadas:

**Arquivo:** `services/integracao-asaas-service.ts`

1. **Linha 1:** Import corrigido
   ```typescript
   // Antes
   import { AsaasService, type AsaasCustomer, type AsaasCharge } from "./asaas-service"
   
   // Depois
   import AsaasServiceInstance from "./asaas-service"
   import { type AsaasCustomer, type AsaasCharge } from "./asaas-service"
   ```

2. **Linha 153:** Criar cliente
   ```typescript
   // Antes
   const cliente = await AsaasService.createCustomer(clienteData, apiKey)
   
   // Depois
   const cliente = await AsaasServiceInstance.createCustomer(clienteData, apiKey)
   ```

3. **Linha 202:** Criar fatura
   ```typescript
   // Antes
   const fatura = await AsaasService.createCharge(faturaData, apiKey)
   
   // Depois
   const fatura = await AsaasServiceInstance.createCharge(faturaData, apiKey)
   ```

4. **Linha 276:** Criar assinatura
   ```typescript
   // Antes
   const assinatura = await AsaasService.createSubscription(assinaturaData, apiKey)
   
   // Depois
   const assinatura = await AsaasServiceInstance.createSubscription(assinaturaData, apiKey)
   ```

## 🎯 Resultado Esperado

Após essa correção, o fluxo completo deve funcionar:

1. ✅ Vincular cliente à administradora
2. ✅ Buscar configuração Asaas
3. ✅ Cadastrar cliente no Asaas → **AGORA FUNCIONA!**
4. ✅ Gerar primeira fatura → **AGORA FUNCIONA!**
5. ✅ Criar assinatura recorrente → **AGORA FUNCIONA!**
6. ✅ Salvar dados no banco
7. ✅ Atualizar status para "Completo"

## 🧪 Próximo Teste

Para validar a correção:

1. **Recarregue a página** do painel de Cadastrados
2. **Selecione um cliente** válido (pode ser outro cliente novo)
3. **Complete o cadastro** com:
   - ✅ Administradora: Clube Ben
   - ✅ Data de vencimento
   - ✅ Data de vigência
   - ✅ Valor mensal
   - ✅ **Integrar com Asaas: MARCADO**
   - ✅ **Criar assinatura: MARCADO**
4. **Clique em "Finalizar Cadastro"**

### Logs Esperados (Sucesso):
```
🚀 Iniciando integração completa com Asaas...
📋 Dados: {...}
👤 Cadastrando cliente no Asaas...
📤 Dados do cliente para Asaas: {...}
✅ Cliente cadastrado no Asaas: cus_xxxxx
✅ Customer ID salvo no banco: cus_xxxxx
💰 Gerando primeira fatura...
📤 Dados da fatura para Asaas: {...}
✅ Fatura criada no Asaas: pay_xxxxx
✅ Fatura salva no banco local
🔄 Criando assinatura para faturamento recorrente...
📤 Dados da assinatura para Asaas: {...}
✅ Assinatura criada no Asaas: sub_xxxxx
✅ Integração completa realizada com sucesso!
```

## 📊 Verificação Pós-Teste

Após o teste bem-sucedido, verifique:

1. **Painel Financeiro** → Deve mostrar a fatura gerada
2. **Detalhes do Cliente** → Deve mostrar:
   - Status: "Completo" ou "ativo"
   - Asaas Customer ID preenchido
   - Fatura listada
3. **Console** → Sem erros, apenas logs de sucesso

---

## 🔧 CORREÇÃO ADICIONAL - API Key

### Segundo Erro Encontrado:
```
❌ API Key do Asaas não configurada. Use setApiKey() primeiro.
```

### Causa:
O `AsaasService` requer que `setApiKey()` seja chamado antes de qualquer operação, mas estávamos apenas passando a API Key como parâmetro.

### Solução Implementada:

Adicionei `AsaasServiceInstance.setApiKey(apiKey)` em **3 métodos**:

1. **`cadastrarClienteNoAsaas`** (linha 137)
   ```typescript
   // Configurar API Key antes de usar
   AsaasServiceInstance.setApiKey(apiKey)
   const cliente = await AsaasServiceInstance.createCustomer(clienteData)
   ```

2. **`gerarFaturaInicial`** (linha 194)
   ```typescript
   // Configurar API Key antes de usar
   AsaasServiceInstance.setApiKey(apiKey)
   const fatura = await AsaasServiceInstance.createCharge(faturaData)
   ```

3. **`criarAssinaturaRecorrente`** (linha 269)
   ```typescript
   // Configurar API Key antes de usar
   AsaasServiceInstance.setApiKey(apiKey)
   const assinatura = await AsaasServiceInstance.createSubscription(assinaturaData)
   ```

---

## 🔧 CORREÇÃO ADICIONAL - CORS

### Terceiro Erro Encontrado:
```
Access to fetch at 'https://api.asaas.com/v3/customers' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

### Causa:
O `AsaasService` estava sendo chamado **diretamente do frontend** (browser), mas a API do Asaas não permite chamadas diretas do browser por questões de segurança.

### Solução Implementada:

Criamos uma **API Route no Next.js** para fazer proxy das chamadas ao Asaas:

1. **Nova API Route:** `app/api/integrar-cliente-asaas/route.ts`
   - Recebe os dados do frontend
   - Chama `IntegracaoAsaasService.integrarClienteCompleto()` no servidor
   - Retorna o resultado para o frontend

2. **Atualizado:** `services/clientes-administradoras-service.ts`
   ```typescript
   // Chamar API route ao invés do serviço direto (para evitar CORS)
   const response = await fetch('/api/integrar-cliente-asaas', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(dadosIntegracao)
   })
   ```

3. **Atualizado:** `components/admin/wizard-cadastro-cliente.tsx`
   - Removido import de `IntegracaoAsaasService`
   - Agora chama a API route `/api/integrar-cliente-asaas`

### Arquitetura Corrigida:

```
Frontend (Browser)
    ↓
    fetch('/api/integrar-cliente-asaas')
    ↓
Next.js API Route (Servidor)
    ↓
IntegracaoAsaasService
    ↓
AsaasService (com setApiKey)
    ↓
API Asaas ✅
```

---

**Status:** ✅ **TODAS AS 3 CORREÇÕES IMPLEMENTADAS E PRONTAS PARA TESTE**

---

## 🔧 CONFIGURAÇÃO NECESSÁRIA - API Key Asaas

### Quarto Erro Encontrado:
```
❌ Configuração do Asaas não encontrada para esta administradora
```

### Causa:
A tabela `administradoras_config_financeira` não possui um registro com a API Key do Asaas para a administradora "Clube Ben".

### Solução:

**Você precisa configurar a API Key do Asaas no banco de dados!**

📋 **Veja o guia completo:** `CONFIGURAR-API-KEY-ASAAS.md`

📋 **Script SQL:** `scripts/VERIFICAR-E-INSERIR-CONFIG-ASAAS.sql`

**Passos rápidos:**
1. Obtenha sua API Key em: https://www.asaas.com/config/api
2. Abra `scripts/VERIFICAR-E-INSERIR-CONFIG-ASAAS.sql`
3. **Substitua** a API Key na linha 31 pela sua chave real
4. Execute o script no Supabase SQL Editor
5. Teste o fluxo novamente!

---

**Status:** ⏳ **AGUARDANDO CONFIGURAÇÃO DA API KEY**