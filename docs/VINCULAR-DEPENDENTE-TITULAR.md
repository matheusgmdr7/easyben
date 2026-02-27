# Como vincular um dependente a um titular

No cadastro de beneficiários (vidas importadas), o vínculo entre **dependente** e **titular** é feito pelo campo **CPF do titular**: o dependente deve ter `tipo = "dependente"` e o **CPF do titular** preenchido com o CPF (apenas números) do titular ao qual ele pertence. O titular precisa estar no **mesmo grupo** de beneficiários.

---

## 1. Na importação em lote (Excel)

**Caminho:** Administradora → Beneficiários → Importação de vidas

- Na planilha, use a coluna **Tipo (Titular/Dependente)** com os valores `Titular` ou `Dependente`.
- Para cada linha com **Tipo = Dependente**, preencha a coluna **CPF do titular** com o CPF do titular (pode ser com ou sem pontuação; o sistema usa só os dígitos).
- O titular precisa existir na **mesma importação** (mesma planilha) ou já estar cadastrado no grupo. Na importação, o sistema associa todos ao grupo escolhido; dependentes são vinculados ao titular pelo CPF.

**Exemplo no Excel:**

| Nome        | CPF           | Tipo       | CPF do titular |
|------------|---------------|------------|----------------|
| Maria Silva| 111.222.333-44| Titular    |                |
| João Silva  | 555.666.777-88| Dependente | 111.222.333-44 |

---

## 2. Na edição do beneficiário (detalhes do grupo)

**Caminho:** Administradora → Grupos de beneficiários → [clique no grupo] → na tabela, clique em **Visualizar** (ícone de olho) no dependente

1. Clique em **Editar**.
2. Em **Tipo**, selecione **Dependente**.
3. Em **Titular** ou **CPF do titular**:
   - Use o campo **"Selecionar titular do grupo"** para escolher um titular já cadastrado no mesmo grupo (recomendado), ou
   - Preencha manualmente o **CPF do titular** (apenas números ou com máscara).
4. Clique em **Salvar**.

O titular escolhido ou informado deve ser um beneficiário do **mesmo grupo** com tipo **Titular**.

---

## Regras importantes

- O **titular** deve existir no mesmo grupo e ter `tipo = "titular"`.
- O **CPF do titular** é armazenado apenas com dígitos; na interface pode ser digitado com ou sem formatação.
- Propostas/clientes vinculados ao grupo por proposta são tratados como titulares; o vínculo dependente ↔ titular por CPF aplica-se às **vidas importadas**.
