# Erro: coluna 'bairro' (ou outra) não encontrada em vidas_importadas

## Mensagem
`Could not find the 'bairro' column of 'vidas_importadas' in the schema cache`

ou ao salvar beneficiário: **"Erro ao salvar: Could not find the 'bairro' column..."**

## Causa
A tabela `vidas_importadas` foi criada com o script básico (`criar-tabela-vidas-importadas.sql`), que não inclui as colunas de endereço e contato (bairro, logradouro, telefones, emails, etc.). O sistema tenta atualizar esses campos ao editar um beneficiário.

## Solução

Execute no **Supabase** (Dashboard → SQL Editor) um dos scripts abaixo.

### Opção 1 – Só a coluna que falta (rápido)
Se o erro citar apenas **bairro**:
```sql
-- Cole e execute o conteúdo de:
-- scripts/adicionar-coluna-bairro-vidas-importadas.sql
```

### Opção 2 – Todas as colunas de endereço e contato (recomendado)
Para garantir que todas as colunas usadas na edição de beneficiários existam:
```sql
-- Cole e execute o conteúdo de:
-- scripts/adicionar-colunas-completas-vidas-importadas.sql
```

Esse script adiciona (se ainda não existirem): ativo, sexo, estado_civil, nome_pai, identidade, cns, observacoes, cep, cidade, estado, **bairro**, logradouro, numero, complemento, telefones, emails.

Depois de rodar o script, tente salvar o beneficiário novamente. Se o Supabase usar cache de schema, aguarde alguns segundos ou recarregue a página.
