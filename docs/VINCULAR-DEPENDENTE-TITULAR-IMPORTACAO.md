# Vínculo dependente ↔ titular (vidas importadas)

## Como o vínculo funciona

- **Titular:** registro em `vidas_importadas` com `tipo = 'titular'` e `cpf` preenchido.
- **Dependente:** registro com `tipo = 'dependente'` e **`cpf_titular`** = CPF do titular (apenas números, mesmo grupo).

O sistema considera vinculado quando, no **mesmo grupo** (`grupo_id`):
- o dependente tem `cpf_titular` igual ao `cpf` de um titular (comparação só com dígitos).

---

## Na importação (planilha/Excel)

Para que os dependentes já entrem vinculados:

1. A planilha deve ter uma coluna que será mapeada para **CPF do titular** (na tela de importação aparece como "CPF Tit." / `cpf_titular`).
2. Em **cada linha que for dependente** (coluna "Tipo" = dependente), preencha nessa coluna o **CPF do titular** ao qual esse dependente pertence (pode ser com ou sem pontuação; o sistema grava só números).
3. O CPF informado deve ser o mesmo de uma linha **titular** da mesma importação/grupo.

Se a coluna "CPF do titular" não for preenchida para dependentes, eles serão importados com `cpf_titular` vazio e ficarão "soltos" (não vinculados a nenhum titular).

---

## Vincular dependentes já importados (que estão soltos)

Para vidas que já foram importadas e estão como dependente sem vínculo:

1. Acesse **Grupos de beneficiários** → abra o grupo.
2. Na lista, **clique no dependente** (tipo "Dependente") que deseja vincular.
3. Se ele não estiver vinculado, aparecerá um aviso amarelo: *"Este dependente não está vinculado a um titular..."*.
4. Clique em **"Editar e vincular"** (ou em **Editar**).
5. Na aba **Dados Básicos**, localize o campo **"Vincular a titular"**:
   - Selecione na lista o **titular do grupo** ao qual este dependente pertence (nome + CPF), ou
   - Digite o CPF do titular no campo ao lado.
6. Clique em **Salvar**.

O sistema grava `cpf_titular` com apenas dígitos; a comparação com o titular é feita sempre por CPF normalizado. Depois de salvar, o dependente passa a aparecer na aba **Dependentes** do modal daquele titular.

---

## Conferir vínculos (SQL)

Use o script **`scripts/conferir-vinculo-titular-dependente-vidas.sql`** no Supabase (SQL Editor) para:

- Listar titulares e dependentes vinculados por grupo (e coluna de conferência).
- Listar dependentes "órfãos" (sem titular correspondente no grupo).
- Ver resumo por grupo (quantidade de titulares e de dependentes vinculados).
