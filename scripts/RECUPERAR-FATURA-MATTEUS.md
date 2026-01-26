# Script para Recuperar Fatura do Matteus

## Problema
A fatura do cliente **Matteus Silva** foi criada no Asaas, mas não foi salva no banco de dados. Por isso, ela não aparece na página da administradora.

## Solução
Criamos uma API route que busca as faturas do Asaas e salva no banco localmente.

## Como Usar

### 1. Execute a Query SQL para obter os dados necessários

Execute esta query no Supabase SQL Editor para obter os dados do cliente Matteus:

```sql
SELECT 
    ca.id as cliente_administradora_id,
    ca.administradora_id,
    p.nome as cliente_nome,
    p.cpf,
    adm.asaas_api_key
FROM clientes_administradoras ca
INNER JOIN propostas p ON p.id = ca.proposta_id
LEFT JOIN administradoras adm ON adm.id = ca.administradora_id
WHERE p.nome ILIKE '%MATTEUS%SILVA%'
   OR p.nome ILIKE '%MATTEUS%';
```

Anote:
- `cliente_administradora_id`: (ex: `93e8bcd0-3a62-4abe-bdc6-46b6c7c60435`)
- `administradora_id`: (ex: `a7b5b2d5-0e8f-4905-8917-4b95dc98d20f`)
- `asaas_api_key`: A chave da API do Asaas

### 2. Chame a API Route

Faça uma requisição POST para `/api/admin/recuperar-fatura-asaas` com os seguintes dados:

```bash
curl -X POST http://localhost:3000/api/admin/recuperar-fatura-asaas \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_administradora_id": "93e8bcd0-3a62-4abe-bdc6-46b6c7c60435",
    "administradora_id": "a7b5b2d5-0e8f-4905-8917-4b95dc98d20f",
    "api_key": "SUA_API_KEY_DO_ASAAS"
  }'
```

Ou use o JavaScript no Console do Navegador:

```javascript
fetch('/api/admin/recuperar-fatura-asaas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cliente_administradora_id: '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435',
    administradora_id: 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f',
    api_key: 'SUA_API_KEY_DO_ASAAS'
  })
})
.then(res => res.json())
.then(data => console.log('Resultado:', data))
.catch(err => console.error('Erro:', err))
```

### 3. Verifique o Resultado

A API retornará:
- `sucesso`: true/false
- `faturas_salvas`: número de faturas salvas
- `faturas_existentes`: número de faturas que já existiam
- `faturas`: lista detalhada das faturas processadas
- `erros`: lista de erros (se houver)

### 4. Teste na Página

Após executar a API:
1. Recarregue a página do cliente Matteus
2. Vá para a aba "Financeiro"
3. A fatura deve aparecer agora!

## O que a API faz

1. **Busca o cliente no banco** usando o `cliente_administradora_id`
2. **Busca o cliente no Asaas** usando o CPF
3. **Lista todas as cobranças** do cliente no Asaas
4. **Para cada cobrança**:
   - Verifica se já existe no banco (pelo `asaas_charge_id`)
   - Se não existir, cria uma nova fatura no banco
   - Se existir sem `asaas_charge_id`, atualiza com os dados do Asaas
   - Se já existir com `asaas_charge_id`, apenas marca como existente

## Troubleshooting

### Erro: "Cliente não encontrado no Asaas"
- Verifique se o CPF está correto no banco
- Verifique se o cliente foi realmente cadastrado no Asaas
- Verifique se a API key está correta

### Erro: "Nenhuma cobrança encontrada"
- Verifique se a fatura foi realmente criada no Asaas
- Verifique se está usando a API key correta (produção vs sandbox)

### Fatura ainda não aparece
- Verifique os logs do servidor para ver erros
- Execute as queries SQL para verificar se a fatura foi salva
- Verifique se o `cliente_administradora_id` está correto

