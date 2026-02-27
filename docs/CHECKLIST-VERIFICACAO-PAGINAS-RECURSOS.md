# ✅ Checklist de Verificação: Páginas e Recursos

## 📋 GUIA DE VERIFICAÇÃO SISTEMÁTICA

Use este checklist para verificar o funcionamento de cada página e recurso antes de testar o sistema multi-tenancy completo.

---

## 🎯 RECURSOS POR PORTAL

### 1. **Portal do Corretor** (`portal_corretor`)

#### ✅ Páginas Públicas (sem autenticação)
- [x] `/corretor/cadastro` - Cadastro de novo corretor
  - [x] Formulário funciona
  - [x] Validação de campos
  - [x] Envio de dados
  - [x] Redirecionamento após cadastro

- [x] `/corretor/login` - Login do corretor
  - [x] Formulário de login funciona
  - [x] Validação de credenciais
  - [x] Redirecionamento após login bem-sucedido
  - [x] Mensagem de erro para credenciais inválidas

- [x] `/corretor/recuperar-senha` - Recuperação de senha
  - [x] Formulário funciona
  - [x] Envio de email de recuperação

#### ✅ Páginas Autenticadas (requer login)
- [x] `/corretor/aguardando-aprovacao` - Aguardando aprovação
  - [x] Exibe para corretores com status "pendente"
  - [x] Não permite acesso a outras páginas

- [x] `/corretor/dashboard` - Dashboard principal
  - [x] Carrega dados do corretor
  - [x] Exibe estatísticas
  - [x] Navegação funciona

- [x] `/corretor/propostas` - Lista de propostas
  - [x] Lista propostas do corretor
  - [x] Filtros funcionam
  - [x] Paginação funciona

- [x] `/corretor/propostas/nova` - Criar nova proposta
  - [x] Formulário funciona
  - [x] Validação de campos
  - [x] Salvamento de proposta

- [x] `/corretor/propostas/[id]` - Visualizar proposta
  - [x] Exibe dados da proposta
  - [x] Ações disponíveis funcionam

- [x] `/corretor/clientes` - Lista de clientes
  - [x] Lista clientes do corretor
  - [x] Busca funciona
  - [x] Filtros funcionam

- [ ] `/corretor/produtos` - Lista de produtos
  - [ ] Lista produtos disponíveis
  - [ ] Filtros funcionam
  - [ ] Visualização de detalhes
  - **Onde configurar:** `/admin/produtos` e `/admin/produtos-corretores` (tabela `produtos_corretores`).

- [ ] `/corretor/comissoes` - Comissões
  - [ ] Exibe comissões do corretor
  - [ ] Cálculos corretos
  - [ ] Filtros por período

- [ ] `/corretor/tabelas` - Tabelas de preços
  - [ ] Lista tabelas disponíveis
  - [ ] Visualização de preços
  - **Onde configurar:** `/admin/tabelas` (tabelas `tabelas_precos`, `tabelas_precos_faixas`). Vincular produto ↔ tabela em `/admin/produtos-corretores` (relação `produto_tabela_relacao`).

- [ ] `/corretor/modelos-propostas` - Modelos de propostas
  - [ ] Lista modelos disponíveis
  - [ ] Criação/edição de modelos

- [ ] `/corretor/meu-link` - Link de cadastro pessoal
  - [ ] Gera link único
  - [ ] Link funciona para cadastro

---

### 2. **Portal do Gestor** (`portal_gestor`)

#### ✅ Páginas Públicas
- [ ] `/gestor/cadastro` - Cadastro de gestor
  - [ ] Formulário funciona
  - [ ] Validação de campos
  - [ ] Envio de dados

- [x] `/gestor/login` - Login do gestor
  - [x] Formulário funciona
  - [x] Validação de credenciais
  - [x] Redirecionamento após login

#### ✅ Páginas Autenticadas
- [x] `/gestor/aguardando-aprovacao` - Aguardando aprovação
  - [x] Exibe para gestores pendentes

- [x] `/gestor` - Dashboard do gestor
  - [x] Carrega dados do gestor
  - [x] Exibe estatísticas da equipe

- [x] `/gestor/equipe` - Minha equipe
  - [x] Lista corretores da equipe
  - [x] Filtros funcionam
  - [x] Visualização de detalhes

- [x] `/gestor/equipe/novo` - Adicionar corretor
  - [x] Formulário funciona
  - [x] Validação de campos
  - [x] Vinculação à equipe

- [x] `/gestor/link-cadastro` - Link de cadastro
  - [x] Gera link único
  - [x] Link funciona para cadastro

---

### 3. **Portal da Administradora** (`portal_administradora`)

#### ✅ Páginas Públicas
- [ ] `/administradora/cadastro` - Cadastro de administradora
  - [ ] Formulário funciona
  - [ ] Validação de campos
  - [ ] Envio de dados

- [ ] `/administradora/login` - Login da administradora
  - [ ] Formulário funciona
  - [ ] Validação de credenciais
  - [ ] Redirecionamento após login

- [ ] `/administradora/recuperar-senha` - Recuperação de senha
  - [ ] Formulário funciona
  - [ ] Envio de email

#### ✅ Páginas Autenticadas
- [ ] `/administradora/aguardando-aprovacao` - Aguardando aprovação
  - [ ] Exibe para administradoras pendentes

- [ ] `/administradora` - Dashboard da administradora
  - [ ] Carrega dados da administradora
  - [ ] Exibe estatísticas

- [ ] `/administradora/clientes` - Clientes
  - [ ] Lista clientes
  - [ ] Busca funciona
  - [ ] Filtros funcionam

- [ ] `/administradora/fatura` - Faturas
  - [ ] Lista faturas
  - [ ] Geração de faturas
  - [ ] Visualização de detalhes

- [ ] `/administradora/faturamento` - Faturamento
  - [ ] Agendamento funciona
  - [ ] Pesquisa funciona

- [ ] `/administradora/financeiro` - Financeiro
  - [ ] Exibe dados financeiros
  - [ ] Relatórios funcionam

- [ ] `/administradora/grupos-beneficiarios` - Grupos de beneficiários
  - [ ] Lista grupos
  - [ ] Criação/edição funciona

- [ ] `/administradora/contrato` - Contratos
  - [ ] Lista contratos
  - [ ] Criação de contratos
  - [ ] Pesquisa funciona

---

### 4. **Portal do Admin** (`portal_admin`)

#### ✅ Páginas Públicas
- [ ] `/admin/login` - Login administrativo
  - [ ] Formulário funciona
  - [ ] Validação de credenciais
  - [ ] Redirecionamento após login

#### ✅ Páginas Autenticadas
- [ ] `/admin` - Dashboard administrativo
  - [ ] Carrega dados
  - [ ] Exibe estatísticas gerais

- [ ] `/admin/propostas` - Propostas
  - [ ] Lista todas as propostas
  - [ ] Filtros funcionam
  - [ ] Ações administrativas

- [ ] `/admin/corretores` - Corretores
  - [ ] Lista todos os corretores
  - [ ] Aprovação/reprovação
  - [ ] Edição de dados

- [ ] `/admin/produtos` - Produtos
  - [ ] Lista produtos
  - [ ] Criação/edição funciona

- [ ] `/admin/tabelas` - Tabelas de preços
  - [ ] Lista tabelas
  - [ ] Criação/edição funciona

- [ ] `/admin/comissoes` - Comissões
  - [ ] Lista comissões
  - [ ] Cálculos e relatórios

- [ ] `/admin/financeiro` - Financeiro
  - [ ] Exibe dados financeiros
  - [ ] Importação de dados
  - [ ] Relatórios

- [ ] `/admin/contratos` - Contratos
  - [ ] Lista contratos
  - [ ] Visualização de detalhes

- [ ] `/admin/administradoras` - Administradoras
  - [ ] Lista administradoras
  - [ ] Gerenciamento funciona

- [ ] `/admin/usuarios` - Usuários
  - [ ] Lista usuários
  - [ ] Criação/edição funciona
  - [ ] Permissões funcionam

- [ ] `/admin/vendas` - Vendas
  - [ ] Lista vendas
  - [ ] Relatórios funcionam

- [ ] `/admin/leads` - Leads
  - [ ] Lista leads
  - [ ] Filtros funcionam

- [ ] `/admin/clientes` - Clientes
  - [ ] Lista clientes
  - [ ] Busca funciona

- [ ] `/admin/modelos-propostas` - Modelos de propostas
  - [ ] Lista modelos
  - [ ] Criação/edição funciona

- [ ] `/admin/propostas-digitais` - Propostas digitais
  - [ ] Lista propostas digitais
  - [ ] Visualização funciona

- [ ] `/admin/produtos-corretores` - Produtos por corretor
  - [ ] Lista vínculos
  - [ ] Criação/edição funciona

---

### 5. **Portal do Analista** (`portal_analista`)

#### ✅ Páginas Públicas
- [ ] `/analista/login` - Login do analista
  - [ ] Formulário funciona
  - [ ] Validação de credenciais

- [ ] `/analista/cadastro` - Cadastro de analista
  - [ ] Formulário funciona
  - [ ] Validação de campos

#### ✅ Páginas Autenticadas
- [ ] `/analista/aguardando-aprovacao` - Aguardando aprovação
  - [ ] Exibe para analistas pendentes

- [ ] `/analista` - Dashboard do analista
  - [ ] Carrega dados
  - [ ] Exibe abas: Recebidas, Em Análise, Aguardando Cadastro

- [ ] `/analista/propostas` - Propostas
  - [ ] Lista propostas para análise
  - [ ] Filtros funcionam
  - [ ] Ações de análise funcionam

- [ ] `/analista/em-analise` - Em análise
  - [ ] Lista propostas em análise
  - [ ] Ações disponíveis

- [ ] `/analista/relatorios` - Relatórios
  - [ ] Gera relatórios
  - [ ] Exportação funciona

---

### 6. **EasyBen Admin** (Super Admin)

#### ✅ Páginas Públicas
- [ ] `/easyben-admin/login` - Login EasyBen Admin
  - [ ] Formulário funciona
  - [ ] Validação de credenciais master/super_admin
  - [ ] Redirecionamento correto

#### ✅ Páginas Autenticadas
- [ ] `/easyben-admin` - Dashboard EasyBen Admin
  - [ ] Carrega dados
  - [ ] Exibe estatísticas gerais

- [ ] `/easyben-admin/plataformas` - Gestão de Plataformas
  - [ ] Lista todas as plataformas (tenants)
  - [ ] Botão "Criar Nova Plataforma" funciona
  - [ ] Modal de criação funciona
  - [ ] Botão "Editar" funciona
  - [ ] Modal de edição funciona
  - [ ] Aba "Recursos e Funcionalidades" funciona
  - [ ] Seleção de recursos funciona
  - [ ] Botão "Salvar Recursos" funciona
  - [ ] Feedback visual de alterações

- [ ] `/easyben-admin/clientes` - Clientes EasyBen
  - [ ] Lista clientes
  - [ ] Filtros funcionam

- [ ] `/easyben-admin/servicos` - Serviços
  - [ ] Lista serviços
  - [ ] Gerenciamento funciona

- [ ] `/easyben-admin/configuracoes` - Configurações
  - [ ] Formulário funciona
  - [ ] Salvamento funciona

- [ ] `/easyben-admin/relatorios` - Relatórios
  - [ ] Gera relatórios
  - [ ] Exportação funciona

---

## 🔍 VERIFICAÇÕES GERAIS

### ✅ Autenticação e Autorização
- [ ] Login funciona em todos os portais
- [ ] Logout funciona em todos os portais
- [ ] Redirecionamento após login funciona
- [ ] Proteção de rotas autenticadas funciona
- [ ] Mensagens de erro de autenticação são claras

### ✅ Navegação
- [ ] Sidebar funciona em todos os portais
- [ ] Menu mobile funciona
- [ ] Links de navegação funcionam
- [ ] Breadcrumbs funcionam (se houver)

### ✅ Formulários
- [ ] Validação de campos funciona
- [ ] Mensagens de erro são claras
- [ ] Submit funciona
- [ ] Loading states funcionam
- [ ] Feedback de sucesso/erro funciona

### ✅ Listagens
- [ ] Paginação funciona
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Ordenação funciona (se houver)
- [ ] Loading states funcionam

### ✅ Dados
- [ ] Dados são carregados corretamente
- [ ] Dados são salvos corretamente
- [ ] Atualização de dados funciona
- [ ] Exclusão de dados funciona
- [ ] Isolamento por tenant funciona (tenant_id)

---

## 🧪 TESTES ESPECÍFICOS POR RECURSO

### Teste 1: Portal do Corretor
1. [ ] Criar um corretor via `/corretor/cadastro`
2. [ ] Fazer login em `/corretor/login`
3. [ ] Verificar redirecionamento para `/corretor/aguardando-aprovacao`
4. [ ] Aprovar corretor no admin
5. [ ] Fazer login novamente
6. [ ] Verificar acesso ao dashboard
7. [ ] Criar uma proposta
8. [ ] Verificar que proposta tem `tenant_id` correto

### Teste 2: Portal do Gestor
1. [ ] Criar um gestor via `/gestor/cadastro`
2. [ ] Fazer login em `/gestor/login`
3. [ ] Verificar acesso ao dashboard
4. [ ] Adicionar corretor à equipe
5. [ ] Verificar que corretor aparece na equipe
6. [ ] Gerar link de cadastro
7. [ ] Verificar que link funciona

### Teste 3: Portal da Administradora
1. [ ] Criar uma administradora via `/administradora/cadastro`
2. [ ] Fazer login em `/administradora/login`
3. [ ] Verificar acesso ao dashboard
4. [ ] Criar um cliente
5. [ ] Verificar que cliente tem `tenant_id` correto
6. [ ] Gerar uma fatura
7. [ ] Verificar que fatura está vinculada ao tenant

### Teste 4: Portal do Admin
1. [ ] Fazer login em `/admin/login`
2. [ ] Verificar acesso ao dashboard
3. [ ] Aprovar um corretor pendente
4. [ ] Criar um produto
5. [ ] Verificar que produto tem `tenant_id` correto
6. [ ] Visualizar propostas
7. [ ] Verificar filtros por tenant

### Teste 5: Portal do Analista
1. [ ] Fazer login em `/analista/login`
2. [ ] Verificar acesso ao dashboard
3. [ ] Visualizar propostas recebidas
4. [ ] Mover proposta para "Em Análise"
5. [ ] Aprovar proposta
6. [ ] Verificar que proposta muda de status

### Teste 6: EasyBen Admin
1. [ ] Fazer login em `/easyben-admin/login`
2. [ ] Verificar acesso ao dashboard
3. [ ] Criar uma nova plataforma
4. [ ] Editar plataforma criada
5. [ ] Habilitar recursos (Portal do Corretor, Portal do Gestor)
6. [ ] Desabilitar recursos (Portal da Administradora)
7. [ ] Salvar alterações
8. [ ] Verificar que recursos foram salvos no banco

---

## 📊 RESUMO DE VERIFICAÇÃO

### Status Geral
- [ ] **Portal do Corretor**: ___ / ___ páginas verificadas
- [ ] **Portal do Gestor**: ___ / ___ páginas verificadas
- [ ] **Portal da Administradora**: ___ / ___ páginas verificadas
- [ ] **Portal do Admin**: ___ / ___ páginas verificadas
- [ ] **Portal do Analista**: ___ / ___ páginas verificadas
- [ ] **EasyBen Admin**: ___ / ___ páginas verificadas

### Problemas Encontrados
```
[Liste aqui os problemas encontrados durante a verificação]
```

### Próximos Passos
- [ ] Corrigir problemas encontrados
- [ ] Re-testar páginas com problemas
- [ ] Verificar isolamento de dados (tenant_id)
- [ ] Testar sistema multi-tenancy completo

---

## ✅ APÓS VERIFICAÇÃO

Quando terminar de verificar todas as páginas:

1. ✅ Anote problemas encontrados
2. ✅ Corrija problemas críticos
3. ✅ Re-testar páginas corrigidas
4. ✅ Prosseguir com teste de criação de cliente e acesso por domínio

**Documento de referência:** `docs/COMO-TESTAR-CRIACAO-CLIENTE.md`

---

## 🚀 PRODUÇÃO: Configuração de Recuperação de Senha

**Fazer quando o ambiente de produção estiver em uso.** Garante que o email de recuperação e o link de redefinição funcionem em produção (e, em multi-tenant, que só o domínio EasyBen seja usado).

### O que significa **`app`**? Preciso criar esse subdomínio?

`app` é um **subdomínio** (ex.: `app.easyben.com.br`). **Não é obrigatório criar.** Use a URL onde a aplicação **já roda** em produção: `easyben.com.br`, `www.easyben.com.br`, `app.easyben.com.br`, etc. Só crie um novo subdomínio se for usá-lo para servir a app (DNS + hospedagem).

### Checklist – Produção

- [ ] Definir `NEXT_PUBLIC_APP_URL_RECOVERY` no ambiente de produção (ou `NEXT_PUBLIC_APP_URL` se for o único domínio).
  - Use a **URL real** da aplicação (ex.: `https://easyben.com.br` ou `https://app.easyben.com.br`).
  - Multi-tenant: use **sempre** o domínio EasyBen; não use domínios de clientes.
- [ ] No **Supabase** (produção): **Settings → Authentication → URL Configuration**
  - [ ] **Site URL**: mesmo domínio da aplicação (ex.: `https://easyben.com.br` ou `https://app.easyben.com.br`).
  - [ ] **Redirect URLs**: incluir **apenas** as 4 URLs de redefinição desse domínio (troque pelo seu):
    ```
    https://SEU-DOMINIO/corretor/redefinir-senha
    https://SEU-DOMINIO/gestor/redefinir-senha
    https://SEU-DOMINIO/analista/redefinir-senha
    https://SEU-DOMINIO/administradora/redefinir-senha
    ```
  - [ ] Não adicionar domínios de clientes nas Redirect URLs (multi-tenant).
- [ ] Reiniciar a aplicação após alterar variáveis de ambiente.
- [ ] Testar recuperação de senha em produção (ex.: `/corretor/recuperar-senha` → email → link → redefinir senha).

**Referência:** `docs/CONFIGURAR-RECUPERACAO-SENHA.md`

---

**Boa verificação!** 🚀
