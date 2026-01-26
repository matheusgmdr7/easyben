# Solução para Recuperação de Faturas

## Problema Identificado
Quando uma fatura é criada durante o cadastro de cliente:
1. ✅ A fatura é criada no Asaas com sucesso
2. ❌ A fatura **pode não ser salva** no banco de dados local
3. ❌ A fatura não aparece na página da administradora

## Soluções Implementadas

### 1. Melhorias no Salvamento de Faturas
- ✅ Verificação final após inserção para garantir que a fatura foi salva
- ✅ Correção automática se a fatura foi salva sem `cliente_administradora_id`
- ✅ Logs detalhados para debug
- ✅ Retry mechanism para buscar `cliente_administradora_id` se não estiver disponível

**Arquivo:** `services/integracao-asaas-service.ts` - método `salvarFaturaNoBanco`

### 2. API Route para Recuperar Faturas Órfãs
- ✅ Busca cliente no Asaas por CPF
- ✅ Lista todas as cobranças do cliente no Asaas
- ✅ Verifica se já existe no banco (pelo `asaas_charge_id`)
- ✅ Salva faturas que não existem no banco
- ✅ Atualiza faturas existentes sem `asaas_charge_id`
- ✅ Busca API key automaticamente do banco (não precisa fornecer)

**Arquivo:** `app/api/admin/recuperar-fatura-asaas/route.ts`

### 3. Botão "Recuperar do Asaas" na Página do Cliente
- ✅ Botão na aba "Financeiro" da página do cliente
- ✅ Um clique recupera todas as faturas do Asaas
- ✅ Feedback visual com toast notifications
- ✅ Recarrega automaticamente as faturas após recuperação

**Arquivo:** `app/admin/(auth)/administradoras/[id]/clientes/[clienteId]/page.tsx`

## Como Usar

### Opção 1: Via Interface (Recomendado)
1. Acesse a página do cliente na administradora
2. Vá para a aba "Financeiro"
3. Clique no botão **"Recuperar do Asaas"**
4. Aguarde a recuperação (pode levar alguns segundos)
5. As faturas aparecerão automaticamente

### Opção 2: Via API (Programático)
```javascript
fetch('/api/admin/recuperar-fatura-asaas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cliente_administradora_id: 'ID_DO_CLIENTE',
    administradora_id: 'ID_DA_ADMINISTRADORA'
    // api_key é opcional - será buscada do banco se não fornecida
  })
})
.then(res => res.json())
.then(data => {
  console.log('Faturas recuperadas:', data.faturas_salvas)
  console.log('Faturas existentes:', data.faturas_existentes)
})
```

## O que a API Retorna

```json
{
  "sucesso": true,
  "faturas_salvas": 1,
  "faturas_existentes": 0,
  "faturas": {
    "salvas": [
      {
        "asaas_charge_id": "pay_xxxxx",
        "fatura_id": "uuid-da-fatura",
        "acao": "criada"
      }
    ],
    "existentes": []
  },
  "erros": []
}
```

## Casos de Uso

### Caso 1: Fatura Criada no Asaas mas Não Salva no Banco
- A API busca a fatura no Asaas
- Salva no banco com `cliente_administradora_id` correto
- Fatura aparece na página do cliente

### Caso 2: Fatura Salva sem `asaas_charge_id`
- A API encontra a fatura no banco
- Atualiza com os dados do Asaas (`asaas_charge_id`, URLs, etc.)
- Fatura fica completa e vinculada

### Caso 3: Múltiplas Faturas no Asaas
- A API processa todas as faturas do cliente
- Salva apenas as que não existem no banco
- Evita duplicações

## Prevenção de Problemas Futuros

As melhorias no código de salvamento garantem que:
1. A fatura sempre tenha `cliente_administradora_id` antes de salvar
2. Se faltar, há tentativas de correção automática
3. Logs detalhados facilitam o debug

## Troubleshooting

### Erro: "API key do Asaas não encontrada"
**Solução:** Configure a API key na administradora:
1. Acesse a administradora
2. Vá em Configurações > Financeiro
3. Configure a API key do Asaas

### Erro: "Cliente não encontrado no Asaas"
**Possíveis causas:**
- Cliente não foi cadastrado no Asaas
- CPF está incorreto no banco
- Cliente foi deletado do Asaas

### Fatura ainda não aparece após recuperação
**Verifique:**
1. Logs do servidor para ver se houve erro
2. Execute query SQL para verificar se a fatura foi salva
3. Verifique se o `cliente_administradora_id` está correto

## Queries SQL Úteis

```sql
-- Verificar faturas do cliente
SELECT * FROM faturas 
WHERE cliente_administradora_id = 'ID_DO_CLIENTE'
ORDER BY created_at DESC;

-- Verificar faturas sem vínculo
SELECT * FROM faturas 
WHERE cliente_administradora_id IS NULL
ORDER BY created_at DESC;

-- Verificar configuração do Asaas
SELECT * FROM administradoras_config_financeira
WHERE administradora_id = 'ID_DA_ADMINISTRADORA'
AND instituicao_financeira = 'asaas';
```

