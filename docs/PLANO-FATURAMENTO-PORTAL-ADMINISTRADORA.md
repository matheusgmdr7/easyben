# Plano: Faturamento e Financeiras no Portal Administradora

## 1. Como funciona hoje no Admin

### 1.1 Configurações da administradora (API / conta banco)

- **Rota:** `/admin/administradoras/[id]/configuracoes` (ex.: [configuracoes](https://contratandoplanos.com.br/admin/administradoras/e5e1431e-8b17-4d80-ac64-5b9a48d65b84/configuracoes))
- **Arquivo:** `app/admin/(auth)/administradoras/[id]/configuracoes/page.tsx`
- **Serviço:** `AdministradorasService.buscarConfiguracaoFinanceira(administradoraId)` e `salvarConfiguracaoFinanceira(administradoraId, config)`
- **Tabela:** `configuracoes_financeiras` (ou `administradoras_config_financeira` no IntegracaoAsaasService), ligada a `administradora_id`:
  - `instituicao_financeira` (asaas, pagseguro, mercadopago, stripe, outro)
  - `api_key`, `api_token`, `ambiente` (sandbox | producao)
  - `status_integracao` (ativa | inativa)
- O **admin** escolhe a administradora e preenche API Key / Token / Ambiente; a integração Asaas usa essa config para criar cliente e cobrança.

### 1.2 Completar cadastro (geração de boleto por cliente)

- **Rota:** `/admin/cadastrado`
- **Arquivo:** `app/admin/(auth)/cadastrado/page.tsx`
- **Fluxo:**
  1. Lista propostas (aprovada/transmitida/cadastrada).
  2. Botão "Completar cadastro" abre o **WizardCadastroCliente** (`components/admin/wizard-cadastro-cliente.tsx`).
  3. No wizard: escolhe **administradora**, datas, valor; opção "Integrar Asaas"; tipo de faturamento (fatura única / assinatura / depois).
  4. Ao finalizar, chama `ClientesAdministradorasService.vincularCliente()` que:
     - Cria vínculo em `clientes_administradoras`;
     - Atualiza proposta (status transmitida etc.);
     - Se `integrar_asaas`: chama **POST `/api/integrar-cliente-asaas`** com `administradora_id`, `proposta_id`, valores, `gerar_fatura`/`criar_assinatura`.
  5. A API **`/api/integrar-cliente-asaas`** usa `IntegracaoAsaasService.integrarClienteCompleto(dados)`:
     - Busca a config da administradora em `administradoras_config_financeira` (api_key, ambiente);
     - Cadastra cliente no Asaas e, se pedido, gera fatura única ou assinatura.

Resumo: no admin, a **conta/API é da administradora** (configurada em configuracoes); a **geração de boleto** é por cliente, via wizard “Completar cadastro”, usando essa conta.

---

## 2. O que você quer no portal administradora

- **Financeiras:** a administradora pode ter **várias** “empresas financeiras” (ex.: uma conta Asaas, outra PagSeguro), cada uma com sua conexão API (conta banco).
- **Configuração API:** igual à tela de configuracoes do admin, mas no portal e por financeira.
- **Gerar faturas:** por cliente, escolhendo uma financeira (e assim a API/conta a usar), semelhante ao modal “Completar cadastro” do admin.
- **Menus:**
  - **Fatura** → submenu **Gerar** (página para gerar fatura por cliente).
  - Novo item de menu: **Empresas financeiras** (listar, cadastrar, editar).

---

## 3. Modelo sugerido

### 3.1 Tabela: empresas financeiras (por administradora)

Uma tabela para a administradora cadastrar N financeiras (cada uma com sua API):

```sql
-- Exemplo: nome da tabela pode ser financeiras ou administradora_financeiras
CREATE TABLE administradora_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome TEXT NOT NULL,                    -- ex: "Asaas Produção", "PagSeguro Loja X"
  instituicao_financeira TEXT NOT NULL,  -- asaas | pagseguro | mercadopago | stripe | outro
  api_key TEXT,
  api_token TEXT,
  ambiente TEXT DEFAULT 'producao',      -- sandbox | producao
  status_integracao TEXT DEFAULT 'inativa', -- ativa | inativa
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(administradora_id, nome)  -- opcional: mesmo nome não repetir por administradora
);

-- RLS: administradora só acessa suas próprias financeiras (por administradora_id do token/sessão)
```

- **Configuração API:** igual ao admin: instituição, API Key, Token (opcional), Ambiente, Status.
- A **geração de boleto** no portal usará uma dessas linhas (a “financeira” selecionada) para obter `api_key` e `ambiente` e chamar o mesmo fluxo Asaas (ou outro gateway depois).

### 3.2 Reuso da config atual (alternativa mais simples)

Se hoje já existe **uma** config por administradora em `configuracoes_financeiras` ou `administradoras_config_financeira`:

- **Opção A – Uma config por administradora (sem tabela nova):**
  - No **portal**, criar apenas a tela **Configurações** (como a do admin), onde a administradora logada edita **sua própria** config (api_key, instituição, ambiente).
  - Em **Fatura > Gerar**, não “selecionar financeira”, e sim usar sempre essa config única.
- **Opção B – Várias financeiras (tabela acima):**
  - Novo item de menu **Empresas financeiras** → CRUD em `administradora_financeiras`.
  - **Fatura > Gerar** → seleção de **uma financeira** + cliente + valor/vencimento → gera boleto usando a API dessa financeira.

O texto do seu pedido (“cadastrar empresa financeira e ver e editar as cadastradas”) combina com a **Opção B**.

---

## 4. Estrutura de rotas e menus (portal administradora)

### 4.1 Menu (sidebar)

- **Fatura** (já existe)
  - **Pesquisar** → `/administradora/fatura`
  - **Devedores** → `/administradora/fatura/devedores`
  - **Gerar** (novo) → `/administradora/fatura/gerar` — gerar fatura por cliente, escolhendo financeira.
- **Empresas financeiras** (novo item)
  - Listar/cadastrar/editar → por exemplo `/administradora/financeiras` (lista) e `/administradora/financeiras/nova`, `/administradora/financeiras/[id]/editar`.

### 4.2 Páginas sugeridas

| Rota | Descrição |
|------|-----------|
| `app/administradora/(dashboard)/fatura/gerar/page.tsx` | Lista clientes da administradora (ex.: `clientes_administradoras` ou clientes de grupos); seleção de financeira; botão “Gerar fatura” por cliente (modal ou inline) com valor, vencimento, descrição; chama API de geração de boleto usando a financeira selecionada. |
| `app/administradora/(dashboard)/financeiras/page.tsx` | Lista de `administradora_financeiras` da administradora logada; botão “Nova empresa financeira”; ações editar/excluir. |
| `app/administradora/(dashboard)/financeiras/nova/page.tsx` | Formulário igual ao de configuracoes do admin: nome, instituição, API Key, Token, Ambiente; salvar em `administradora_financeiras`. |
| `app/administradora/(dashboard)/financeiras/[id]/editar/page.tsx` | Mesmo formulário, carregando a financeira por `id` (e validando `administradora_id` = logada). |

### 4.3 APIs sugeridas

| Método / Rota | Uso |
|---------------|-----|
| `GET /api/administradora/financeiras` | Listar financeiras da administradora (tenant + administradora_id da sessão). |
| `POST /api/administradora/financeiras` | Criar financeira (nome, instituição, api_key, etc.). |
| `GET /api/administradora/financeiras/[id]` | Detalhe de uma financeira (para edição). |
| `PUT /api/administradora/financeiras/[id]` | Atualizar financeira. |
| `DELETE /api/administradora/financeiras/[id]` | Excluir (ou inativar) financeira. |
| `POST /api/administradora/gerar-fatura` (já existe?) | Se já existir, estender para receber `financeira_id` (ou `administradora_financeira_id`) e usar a API dessa financeira; senão, criar essa rota para “gerar uma fatura por cliente” usando a config da financeira escolhida. |

O fluxo de “gerar boleto” pode reutilizar a lógica atual de `IntegracaoAsaasService` / `FaturamentoService`, mas recebendo `financeira_id` e lendo `api_key`/`ambiente` de `administradora_financeiras` em vez de `configuracoes_financeiras`/`administradoras_config_financeira` por administradora.

---

## 5. Resumo do que implementar

1. **Script SQL**  
   - Criar tabela `administradora_financeiras` (e índices/RLS por `administradora_id` e `tenant_id`).

2. **Backend**  
   - APIs CRUD para `administradora_financeiras` (listar, criar, obter, atualizar, excluir), sempre filtradas por administradora logada e tenant.  
   - Estender (ou criar) a rota de “gerar fatura” para aceitar `financeira_id` e usar a config dessa financeira para chamar Asaas (ou outro gateway).

3. **Portal – Menu**  
   - Em **Fatura**, adicionar submenu **Gerar** → `/administradora/fatura/gerar`.  
   - Novo item **Empresas financeiras** → `/administradora/financeiras` (e subrotas nova/editar se fizer sentido no seu layout).

4. **Portal – Páginas**  
   - **Fatura > Gerar:** página que lista clientes, permite escolher uma financeira e gerar fatura individual (fluxo parecido com o modal “Completar cadastro” do admin).  
   - **Empresas financeiras:** lista + nova + editar, com formulário de configuração API (como na página de configuracoes do admin).

5. **Serviços**  
   - Serviço ou funções para ler/gravar `administradora_financeiras`.  
   - Na geração de boleto, função que recebe `financeira_id`, carrega api_key/ambiente dessa linha e chama o mesmo fluxo Asaas já usado no admin.

Com isso, o portal da administradora fica com:
- **Configuração de conta/API** por “empresa financeira” (cadastro e edição no menu Empresas financeiras).
- **Geração de faturas por cliente** em Fatura > Gerar, usando a financeira selecionada, de forma semelhante ao “Completar cadastro” do admin.

Se quiser, o próximo passo pode ser: (1) script SQL exato para o seu banco (Supabase), (2) assinaturas das APIs (request/response) e (3) esboço dos componentes React (lista de clientes, seleção de financeira, modal de gerar fatura) para você ou sua equipe implementarem em código.
