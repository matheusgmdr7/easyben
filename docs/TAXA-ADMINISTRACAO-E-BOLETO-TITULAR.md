# Taxa de administração e geração de boleto por titular

## Como o boleto é salvo no banco

1. **Insert na tabela `faturas`**  
   Ao gerar o boleto (Fatura → Gerar), o sistema:
   - Cria a cobrança no Asaas (gateway).
   - Insere um registro em **`faturas`** com: `cliente_administradora_id`, `administradora_id`, `valor`, `vencimento`, `status`, `cliente_id`, `cliente_nome`, etc.

2. **Update com dados do gateway**  
   Em seguida, o mesmo registro é atualizado com:
   - `gateway_id` / `asaas_charge_id`: ID da cobrança no Asaas (ex.: `pay_xxx`).
   - `boleto_url` / `asaas_boleto_url`: URL do PDF do boleto.
   - `gateway_nome`, `asaas_invoice_url`, `asaas_payment_link`, quando existirem.

3. **Onde aparece**  
   As faturas do cliente são listadas na aba **Financeiro** do modal do beneficiário (Grupos de beneficiários → grupo → Visualizar no cliente). Se a tabela `faturas` tiver as colunas de boleto (`gateway_id`, `boleto_url`, etc.), os botões **Visualizar** e **Baixar** são exibidos.

**Se a coluna Boleto aparecer com "-" na aba Financeiro** (sem botões Visualizar/Baixar), a tabela `faturas` provavelmente ainda não tem as colunas de boleto. Ao gerar um boleto, no terminal do `npm run dev` deve aparecer:  
`[gerar-boleto] AVISO: não foi possível salvar URL do boleto na fatura... Execute no Supabase o script scripts/adicionar-colunas-boleto-faturas.sql`  

**Solução:** execute no Supabase (SQL Editor) o script **`scripts/adicionar-colunas-boleto-faturas.sql`**. Depois disso, novos boletos passam a gravar a URL e os botões na aba Financeiro funcionam.

---

## Comportamento

- **Fatura > Gerar** lista apenas **titulares**. Dependentes não aparecem na lista; o valor do titular já inclui a soma (titular + dependentes vinculados pelo CPF do titular).
- O **valor total do boleto** é: **valor (titular + dependentes) + taxa de administração**.
- A **descrição do boleto** inclui: nome do produto, titular, dependentes (se houver) e o valor da taxa de administração.

## Configurar a taxa de administração

1. Execute o script no Supabase (SQL Editor):
   - `scripts/adicionar-taxa-administracao-config-financeira.sql`
2. Depois, defina o valor da taxa para cada administradora:
   - Opção A: no banco, na tabela `administradoras_config_financeira`, coluna `taxa_administracao` (em reais).
   - Opção B: se a coluna não existir, use o campo JSON `configuracoes_adicionais`: `{"taxa_administracao": 10.00}`.

## Importação de vidas (titular/dependente)

Na importação (Beneficiários → Importação de vidas), use:

- **Tipo**: `Titular` ou `Dependente`
- **CPF do titular**: para dependentes, preencha com o CPF do titular (mesmo grupo)

Assim, na geração de boleto só aparecem titulares, e o valor e a descrição já consideram os dependentes vinculados. Ver também: `docs/VINCULAR-DEPENDENTE-TITULAR.md`.
