# Documentação: Cadastro de Corretor e Gestor

## 📋 Resumo

Este documento descreve os dados solicitados para cadastro de corretores e gestores, e como funciona o processo de cadastro.

---

## 🔵 Cadastro de Corretor

### Páginas de Cadastro

1. **`/corretores`** - Página principal de cadastro de corretor
2. **`/corretor/cadastro`** - Página alternativa de cadastro de corretor
3. **`/corretores/equipe/[token]`** - Cadastro via link de equipe (vincula automaticamente ao gestor)

### Dados Solicitados para Cadastro de Corretor

| Campo | Obrigatório | Tipo | Descrição |
|-------|-------------|------|-----------|
| **Nome Completo** | ✅ Sim | Texto | Nome completo do corretor |
| **Email** | ✅ Sim | Email | Email para login e comunicação |
| **Senha** | ✅ Sim | Password | Mínimo 6 caracteres |
| **Confirmar Senha** | ✅ Sim | Password | Deve ser igual à senha |
| **WhatsApp** | ✅ Sim | Telefone | Número de WhatsApp com máscara (XX) XXXXX-XXXX |
| **CPF** | ✅ Sim | Texto | CPF com validação (formato: 000.000.000-00) |
| **Data de Nascimento** | ✅ Sim | Date | Data de nascimento |
| **Estado** | ✅ Sim | Select | Estado brasileiro (UF) |
| **Cidade** | ⚠️ Parcial | Texto | Cidade (obrigatório em algumas versões) |

### Processo de Cadastro

1. **Validação de CPF**: Validação matemática do CPF antes de enviar
2. **Validação de Senha**: Verifica se as senhas coincidem
3. **Criação no Supabase Auth**: Cria usuário no sistema de autenticação
4. **Criação na Tabela `corretores`**: 
   - Status inicial: `"pendente"`
   - Ativo: `true`
   - `tenant_id`: Atribuído automaticamente
5. **Redirecionamento**: Após cadastro, redireciona para `/corretor/aguardando-aprovacao`

### Cadastro via Link de Equipe

Quando um corretor se cadastra usando o link de equipe (`/corretores/equipe/[token]`):

- **Mesmos campos** do cadastro normal
- **Diferença**: O campo `gestor_id` é preenchido automaticamente com o ID do gestor que gerou o link
- **Validação**: Verifica se o token do link é válido e se o gestor existe
- **Mensagem**: Informa que o corretor será vinculado à equipe após aprovação

---

## 🟢 Cadastro de Gestor

### ⚠️ IMPORTANTE: Não há página de cadastro específica para gestor

**Gestores NÃO se cadastram diretamente.** O processo funciona assim:

1. **Corretor se cadastra normalmente** usando `/corretores` ou `/corretor/cadastro`
2. **Administrador promove corretor a gestor** via página `/admin/corretores`
3. **Ao promover**:
   - Campo `is_gestor` é definido como `true`
   - Campo `link_cadastro_equipe` é gerado automaticamente
   - Corretor ganha acesso ao Portal do Gestor (`/gestor`)

### Dados do Gestor

Como gestores são corretores promovidos, eles têm os mesmos dados de um corretor, mais:

| Campo Adicional | Tipo | Descrição |
|-----------------|------|-----------|
| **is_gestor** | Boolean | Indica se é gestor (true/false) |
| **gestor_id** | UUID/BIGINT | ID do gestor ao qual está vinculado (NULL se for gestor) |
| **link_cadastro_equipe** | Text | Link único para cadastro de corretores na equipe |

### Login de Gestor

- **Página**: `/gestor/login`
- **Autenticação**: Usa o mesmo sistema de autenticação de corretores
- **Validação**: Verifica se `is_gestor = true` antes de permitir acesso
- **Redirecionamento**: Se não for gestor, redireciona para `/corretor/dashboard`

---

## 📝 Comparação: Corretor vs Gestor

| Aspecto | Corretor | Gestor |
|---------|----------|--------|
| **Cadastro** | Página própria (`/corretores`) | Não tem - é promovido |
| **Login** | `/corretor/login` | `/gestor/login` |
| **Dashboard** | `/corretor/dashboard` | `/gestor` |
| **Dados de Cadastro** | Nome, Email, Senha, WhatsApp, CPF, Data Nascimento, Estado, Cidade | Mesmos dados (quando era corretor) |
| **Status Inicial** | `pendente` | `pendente` (quando era corretor) |
| **Acesso Especial** | Portal do Corretor | Portal do Gestor + Portal do Corretor |

---

## 🔄 Fluxo de Promoção a Gestor

```
1. Corretor se cadastra normalmente
   ↓
2. Administrador acessa /admin/corretores
   ↓
3. Administrador clica em "Promover a Gestor"
   ↓
4. Sistema:
   - Define is_gestor = true
   - Gera link_cadastro_equipe
   - Salva no banco
   ↓
5. Corretor agora pode:
   - Fazer login em /gestor/login
   - Acessar Portal do Gestor
   - Gerar links de cadastro para equipe
   - Ver dashboard de gestão de equipe
```

---

## 📌 Observações Importantes

1. **Gestores não têm cadastro próprio**: Eles são corretores promovidos
2. **Um gestor pode ter gestor**: Se um gestor for vinculado a outro gestor via `gestor_id`, ele também pode ser gerenciado
3. **Link de cadastro é único**: Cada gestor tem um link único para cadastro de sua equipe
4. **Status pendente**: Tanto corretores quanto gestores começam com status `pendente` e precisam ser aprovados
5. **Autenticação unificada**: Tanto corretores quanto gestores usam o mesmo sistema de autenticação (Supabase Auth)

---

## 🛠️ Próximos Passos para Ajustes

1. ✅ Verificar se todas as páginas de cadastro estão consistentes
2. ✅ Garantir que o cadastro via link de equipe funciona corretamente
3. ✅ Ajustar design das páginas de cadastro para ficarem consistentes
4. ⚠️ **NÃO criar página de cadastro para gestor** - gestores são promovidos, não se cadastram

