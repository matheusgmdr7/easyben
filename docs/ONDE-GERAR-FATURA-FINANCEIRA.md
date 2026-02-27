# Onde fica a função de gerar fatura do cliente na financeira

A geração de fatura/boleto na financeira (gateway de pagamento) ocorre em **dois fluxos**:

## 1. Fatura > Gerar (menu administradora)

- **Página:** `app/administradora/(dashboard)/fatura/gerar/page.tsx`  
  O usuário seleciona um grupo de beneficiários, vê os clientes do grupo e clica em **"Gerar boleto"** por cliente. Abre um modal para informar financeira, valor, vencimento e descrição.

- **API:** `app/api/administradora/fatura/gerar-boleto/route.ts`  
  - **Método:** `POST`  
  - **Body:** `administradora_id`, `financeira_id`, `cliente_administradora_id`, `valor`, `vencimento`, `descricao`  
  - Carrega a financeira (ex.: Asaas), o cliente (clientes_administradoras + proposta), cria/usa cliente no Asaas e chama **AsaasServiceInstance.createCharge()** para gerar a cobrança.  
  - Grava o boleto na tabela `faturas` (gateway_id, boleto_url, etc.).

- **Serviço Asaas:** `services/asaas-service.ts` (createCharge, createCustomer).

## 2. Grupo de beneficiários > Modal do cliente > Gerar Fatura

- **Página:** `app/administradora/(dashboard)/grupos-beneficiarios/[id]/page.tsx`  
  Na lista do grupo, ao clicar em um cliente e abrir o modal, na aba ou ação **"Gerar Fatura"** o fluxo usa o **FaturamentoService**.

- **Chamada:** `FaturamentoService.gerarFatura(dados)` em `handleConfirmarGerarFatura` (por volta da linha 215).

- **Serviço:** `services/faturamento-service.ts` — método `gerarFatura`, que orquestra a criação da fatura (e pode integrar com Asaas/outros conforme a configuração).

Resumo: a **criação da cobrança no gateway** (ex.: Asaas) é feita em **`app/api/administradora/fatura/gerar-boleto/route.ts`** (e no Asaas em **`services/asaas-service.ts`**). O fluxo pelo **grupo de beneficiários** usa **`services/faturamento-service.ts`**.
