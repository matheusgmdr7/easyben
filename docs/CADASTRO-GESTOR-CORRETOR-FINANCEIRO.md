# Documentação: Cadastro de Gestor e Dados Financeiros

## 📋 Resumo das Alterações

Este documento descreve as alterações realizadas para incluir cadastro de gestor e dados financeiros para corretores e gestores.

---

## 🆕 Novos Recursos

### 1. Página de Cadastro de Gestor
- **Rota**: `/gestor/cadastro`
- **Funcionalidade**: Permite que gestores se cadastrem diretamente
- **Aprovação**: Requer aprovação via portal do admin (status inicial: `pendente`)
- **Diferenciais**: 
  - CNPJ obrigatório (gestores geralmente são empresas)
  - Dados financeiros completos (PIX e bancários)

### 2. Dados Financeiros para Corretores e Gestores
- **Chave PIX**: Tipo e valor da chave
- **Dados Bancários**: Banco, agência, conta, tipo de conta, titular
- **Opcional para Corretores**: Podem preencher depois
- **Obrigatório para Gestores**: Devem preencher no cadastro

---

## 📊 Campos Adicionados na Tabela `corretores`

### Script SQL: `WHITELABEL-25-adicionar-campos-financeiros-corretores.sql`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cnpj` | VARCHAR(18) | CNPJ do gestor (quando for empresa) |
| `chave_pix` | VARCHAR(255) | Chave PIX para recebimento |
| `tipo_chave_pix` | VARCHAR(20) | Tipo: CPF, CNPJ, Email, Telefone, Chave Aleatória |
| `banco` | VARCHAR(100) | Nome do banco |
| `agencia` | VARCHAR(20) | Agência bancária |
| `conta` | VARCHAR(20) | Número da conta |
| `tipo_conta` | VARCHAR(20) | Corrente ou Poupança |
| `nome_titular_conta` | VARCHAR(255) | Nome do titular |
| `cpf_cnpj_titular_conta` | VARCHAR(18) | CPF/CNPJ do titular |

---

## 🔵 Cadastro de Corretor Atualizado

### Página: `/corretor/cadastro`

**Campos Obrigatórios:**
- Nome Completo
- Email
- Senha
- WhatsApp
- Estado
- Cidade (adicionado)
- CPF
- Data de Nascimento

**Campos Opcionais (Dados Financeiros):**
- Tipo de Chave PIX
- Chave PIX
- Banco
- Agência
- Conta
- Tipo de Conta
- Nome do Titular da Conta
- CPF/CNPJ do Titular da Conta

**Características:**
- Seção de dados financeiros colapsável (expandir/contrair)
- Mensagem informando que pode preencher depois
- Todos os campos financeiros são opcionais

---

## 🟢 Cadastro de Gestor

### Página: `/gestor/cadastro`

**Estrutura em 3 Steps:**

#### Step 1: Dados Pessoais
- Nome Completo / Razão Social *
- Email *
- Senha *
- Confirmar Senha *
- WhatsApp *
- Estado *
- Cidade *

#### Step 2: Dados Empresariais
- CNPJ * (obrigatório para gestores)
- CPF (opcional)
- Data de Nascimento (opcional)

#### Step 3: Dados Financeiros
- **Chave PIX:**
  - Tipo de Chave PIX
  - Chave PIX
- **Dados Bancários:**
  - Banco
  - Agência
  - Conta
  - Tipo de Conta
  - Nome do Titular da Conta
  - CPF/CNPJ do Titular da Conta

**Validações:**
- Validação de CPF (se preenchido)
- Validação de CNPJ (obrigatório)
- Validação de senhas (devem coincidir)
- Verificação de email duplicado

**Após Cadastro:**
- Status inicial: `pendente`
- `is_gestor`: `true`
- Redireciona para `/gestor/aguardando-aprovacao`

---

## 🔄 Fluxo de Aprovação

### Gestor
1. Gestor se cadastra em `/gestor/cadastro`
2. Status: `pendente`
3. Administrador aprova via `/admin/corretores`
4. Ao aprovar, gestor pode acessar `/gestor/login`
5. Após login, acessa `/gestor` (Portal do Gestor)

### Corretor
1. Corretor se cadastra em `/corretor/cadastro` ou `/corretores`
2. Status: `pendente`
3. Administrador aprova via `/admin/corretores`
4. Ao aprovar, corretor pode acessar `/corretor/login`
5. Após login, acessa `/corretor/dashboard`

---

## 📝 Páginas Criadas/Atualizadas

### Novas Páginas
- ✅ `/gestor/cadastro` - Cadastro de gestor
- ✅ `/gestor/aguardando-aprovacao` - Aguardando aprovação de gestor

### Páginas Atualizadas
- ✅ `/corretor/cadastro` - Adicionados dados financeiros opcionais
- ✅ `/gestor/login` - Adicionado link para cadastro

### Serviços Atualizados
- ✅ `services/corretores-service.ts` - Inclui campos financeiros no `criarCorretor`
- ✅ `types/corretores.ts` - Interface atualizada com campos financeiros

---

## ⚠️ Scripts SQL

### Scripts Criados
1. **`WHITELABEL-25-adicionar-campos-financeiros-corretores.sql`**
   - Adiciona todos os campos financeiros na tabela `corretores`
   - Deve ser executado antes de usar as novas funcionalidades

### Scripts Pendentes (Não Executados)
- **`WHITELABEL-21-criar-sistema-gestao-equipes.sql`**
  - Documentado em `scripts/SCRIPTS-NAO-EXECUTADOS.md`
  - Não executado para evitar problemas em produção

---

## 🎯 Funcionalidades Mantidas

### Promoção de Corretor a Gestor
- ✅ Continua funcionando via `/admin/corretores`
- ✅ Administrador pode promover qualquer corretor a gestor
- ✅ Ao promover, gera automaticamente o `link_cadastro_equipe`

### Cadastro via Link de Equipe
- ✅ Continua funcionando em `/corretores/equipe/[token]`
- ✅ Corretores se cadastram e são vinculados automaticamente ao gestor

---

## 📌 Observações Importantes

1. **CNPJ é obrigatório para gestores** no cadastro direto
2. **Dados financeiros são opcionais** para corretores, mas recomendados
3. **Gestores podem se cadastrar diretamente** ou serem promovidos
4. **Aprovação é necessária** para ambos (corretores e gestores)
5. **Campos financeiros podem ser atualizados** depois do cadastro

---

## 🔄 Próximos Passos

1. Executar script `WHITELABEL-25-adicionar-campos-financeiros-corretores.sql`
2. Testar cadastro de gestor
3. Testar cadastro de corretor com dados financeiros
4. Verificar aprovação via portal do admin
5. Testar login e acesso aos portais após aprovação

