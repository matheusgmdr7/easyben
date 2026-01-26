# 📚 Documentação Completa de Páginas do Sistema

Este documento descreve todas as páginas do sistema "Contratando Planos" (agora transformado em plataforma white-label "EasyBen"), suas funcionalidades e propósitos.

---

## 🏠 **PÁGINAS PÚBLICAS E APRESENTAÇÃO**

### `/` - Página Principal EasyBen
**Descrição**: Página institucional de apresentação da plataforma white-label EasyBen.

**Funcionalidades**:
- Apresentação da plataforma white-label
- Hero section com dashboard preview
- Seção de funcionalidades
- Seção "Como Funciona"
- Seção "O Diferencial White Label"
- Call-to-action para contato
- Design moderno e institucional inspirado em Brex

**Acesso**: Público

---

### `/cotacao` - Página de Cotação
**Descrição**: Página para cotação online de planos de saúde.

**Funcionalidades**:
- Formulário de cotação
- Seleção de produtos
- Cálculo de valores
- Envio de proposta

**Acesso**: Público

---

### `/sobre` - Sobre Nós
**Descrição**: Página institucional sobre a empresa.

**Funcionalidades**:
- Informações sobre a empresa
- História e valores
- Equipe

**Acesso**: Público

---

### `/contato` - Contato
**Descrição**: Página de contato.

**Funcionalidades**:
- Formulário de contato
- Informações de contato
- Mapa de localização (se aplicável)

**Acesso**: Público

---

### `/[tenant-slug]` - Página do Cliente (Tenant)
**Descrição**: Página inicial personalizada para cada cliente white-label.

**Funcionalidades**:
- Renderiza template de cotação personalizado
- Branding específico do tenant
- Navegação personalizada
- Integração com sistema de tenants

**Acesso**: Público (baseado no domínio/slug)

---

### `/[tenant-slug]/sobre` - Sobre do Cliente
**Descrição**: Página "Sobre Nós" personalizada para o tenant.

**Funcionalidades**:
- Conteúdo personalizado do cliente
- Branding específico

**Acesso**: Público

---

### `/[tenant-slug]/contato` - Contato do Cliente
**Descrição**: Página de contato personalizada para o tenant.

**Funcionalidades**:
- Formulário de contato personalizado
- Informações de contato do cliente

**Acesso**: Público

---

## 🔐 **AUTENTICAÇÃO E CADASTRO**

### `/corretor/login` - Login do Corretor
**Descrição**: Página de login para corretores.

**Funcionalidades**:
- Autenticação de corretores
- Validação de credenciais
- Redirecionamento baseado em status (aprovado/pendente)
- Link para cadastro
- Link para recuperação de senha

**Acesso**: Público (corretores)

---

### `/corretor/cadastro` - Cadastro de Corretor
**Descrição**: Página de cadastro de novos corretores com sistema de steps.

**Funcionalidades**:
- **Step 1 - Dados Pessoais**:
  - Nome completo
  - Email
  - WhatsApp (com formatação automática)
  - Estado e Cidade
  - CPF (com validação e formatação)
  - Data de nascimento
- **Step 2 - Credenciais**:
  - Senha (com visualização)
  - Confirmar senha (com visualização)
  - Validação de senha
- **Step 3 - Dados Financeiros** (obrigatórios):
  - Chave PIX (tipo e chave)
  - Dados bancários (banco, agência, conta, tipo, titular, CPF/CNPJ)
  - Validação: pelo menos uma forma de recebimento
- Indicador de progresso
- Validação em tempo real
- Redirecionamento para aguardando aprovação

**Acesso**: Público

---

### `/corretor/aguardando-aprovacao` - Aguardando Aprovação (Corretor)
**Descrição**: Página exibida após cadastro, enquanto aguarda aprovação.

**Funcionalidades**:
- Exibição de status do cadastro
- Informações sobre o processo de aprovação
- Atualização automática quando aprovado
- Opção de logout

**Acesso**: Corretor autenticado (pendente)

---

### `/corretor/recuperar-senha` - Recuperação de Senha
**Descrição**: Página para recuperação de senha do corretor.

**Funcionalidades**:
- Solicitação de recuperação de senha
- Envio de email com link de recuperação

**Acesso**: Público

---

### `/gestor/login` - Login do Gestor
**Descrição**: Página de login específica para gestores de equipe.

**Funcionalidades**:
- Autenticação de gestores
- Verificação de status `is_gestor`
- Validação de status (aprovado/pendente)
- Redirecionamento apropriado
- Link para cadastro de gestor
- Link para portal do corretor

**Acesso**: Público (gestores)

---

### `/gestor/cadastro` - Cadastro de Gestor
**Descrição**: Página de cadastro de gestores com campos financeiros completos.

**Funcionalidades**:
- **Step 1 - Dados Pessoais**:
  - Nome completo
  - Email
  - WhatsApp
  - Estado e Cidade
  - CPF
  - Data de nascimento
- **Step 2 - Dados Empresariais**:
  - CNPJ
  - Razão Social
  - Nome Fantasia
  - Inscrição Estadual
  - Inscrição Municipal
- **Step 3 - Credenciais**:
  - Senha
  - Confirmar senha
- **Step 4 - Dados Financeiros** (obrigatórios):
  - Chave PIX
  - Dados bancários completos
- Sistema de steps com indicador de progresso
- Validações em tempo real

**Acesso**: Público

---

### `/gestor/aguardando-aprovacao` - Aguardando Aprovação (Gestor)
**Descrição**: Página de aguardando aprovação para gestores.

**Funcionalidades**:
- Status do cadastro
- Informações sobre aprovação
- Atualização automática

**Acesso**: Gestor autenticado (pendente)

---

### `/corretores` - Cadastro Antigo (Legado)
**Descrição**: Página de cadastro antiga (mantida para compatibilidade).

**Funcionalidades**:
- Formulário de cadastro em 2 steps
- Dados pessoais e credenciais
- Dados financeiros opcionais

**Acesso**: Público (legado)

---

### `/corretores/equipe/[token]` - Cadastro via Link de Equipe
**Descrição**: Página de cadastro de corretor através de link único de equipe.

**Funcionalidades**:
- Cadastro pré-preenchido com `gestor_id`
- Informações sobre o gestor que convidou
- Vinculação automática à equipe
- Formulário completo de cadastro

**Acesso**: Público (via link único)

---

### `/admin/login` - Login Administrativo
**Descrição**: Página de login para administradores.

**Funcionalidades**:
- Autenticação de usuários admin
- Validação de permissões
- Redirecionamento para dashboard

**Acesso**: Público (administradores)

---

## 👤 **PORTAL DO CORRETOR**

### `/corretor/dashboard` - Dashboard do Corretor
**Descrição**: Dashboard principal do corretor com visão geral de suas atividades.

**Funcionalidades**:
- Cards de estatísticas:
  - Total de propostas
  - Propostas aprovadas
  - Propostas pendentes
  - Total de clientes
- Gráfico de performance (últimos meses)
- Últimas propostas enviadas
- Lista de clientes recentes
- Filtros por período (mês atual, específico, todos)
- Navegação rápida para outras seções

**Acesso**: Corretor autenticado (aprovado)

---

### `/corretor/propostas` - Lista de Propostas
**Descrição**: Página de listagem de todas as propostas do corretor.

**Funcionalidades**:
- Lista completa de propostas
- Filtros por status
- Busca por cliente/nome
- Visualização de detalhes
- Status das propostas
- Data de criação
- Link para nova proposta

**Acesso**: Corretor autenticado

---

### `/corretor/propostas/nova` - Nova Proposta
**Descrição**: Formulário completo para criação de nova proposta.

**Funcionalidades**:
- Wizard multi-step:
  - Dados do titular
  - Dados de dependentes
  - Informações do plano
  - Questionário de saúde
  - Upload de documentos
  - Assinatura digital
  - Revisão final
- Validações em cada step
- Salvamento automático
- Envio de proposta

**Acesso**: Corretor autenticado

---

### `/corretor/propostas/[id]` - Detalhes da Proposta
**Descrição**: Página de detalhes de uma proposta específica.

**Funcionalidades**:
- Visualização completa da proposta
- Status atual
- Histórico de alterações
- Documentos anexados
- Informações do cliente
- Ações disponíveis (editar, enviar, etc.)

**Acesso**: Corretor autenticado (proprietário)

---

### `/corretor/clientes` - Gestão de Clientes
**Descrição**: Página de gestão de clientes do corretor.

**Funcionalidades**:
- Lista de clientes
- Filtros e busca
- Detalhes do cliente
- Histórico de propostas por cliente
- Status dos clientes

**Acesso**: Corretor autenticado

---

### `/corretor/produtos` - Catálogo de Produtos
**Descrição**: Página de visualização de produtos disponíveis.

**Funcionalidades**:
- Lista de produtos
- Filtros por categoria
- Detalhes do produto
- Valores e características
- Tabelas de preços

**Acesso**: Corretor autenticado

---

### `/corretor/comissoes` - Comissões
**Descrição**: Página de visualização de comissões do corretor.

**Funcionalidades**:
- Lista de comissões
- Filtros por período
- Valores recebidos/pendentes
- Histórico de pagamentos
- Gráficos de performance

**Acesso**: Corretor autenticado

---

### `/corretor/tabelas` - Tabelas de Preços
**Descrição**: Visualização de tabelas de preços disponíveis.

**Funcionalidades**:
- Lista de tabelas
- Filtros por produto
- Visualização de faixas etárias
- Valores por faixa
- Exportação de dados

**Acesso**: Corretor autenticado

---

### `/corretor/tabelas/[id]` - Detalhes da Tabela
**Descrição**: Detalhes de uma tabela de preços específica.

**Funcionalidades**:
- Visualização completa da tabela
- Faixas etárias e valores
- Produtos associados
- Informações adicionais

**Acesso**: Corretor autenticado

---

### `/corretor/produto-tabelas/[id]` - Produto e Tabelas
**Descrição**: Visualização de produto com suas tabelas associadas.

**Funcionalidades**:
- Detalhes do produto
- Tabelas disponíveis
- Comparação de valores
- Seleção de tabela

**Acesso**: Corretor autenticado

---

### `/corretor/modelos-propostas` - Modelos de Propostas
**Descrição**: Página de modelos/templates de propostas.

**Funcionalidades**:
- Lista de modelos disponíveis
- Visualização de modelos
- Uso de modelo para nova proposta
- Criação de modelos personalizados

**Acesso**: Corretor autenticado

---

### `/corretor/meu-link` - Meu Link de Indicação
**Descrição**: Página com link único do corretor para indicações.

**Funcionalidades**:
- Exibição do link único
- Cópia do link
- Estatísticas de cliques
- QR Code do link

**Acesso**: Corretor autenticado

---

## 👥 **PORTAL DO GESTOR DE EQUIPES**

### `/gestor` - Dashboard do Gestor
**Descrição**: Dashboard principal do gestor de equipe.

**Funcionalidades**:
- Cards de estatísticas:
  - Total de corretores na equipe
  - Total de propostas da equipe
  - Propostas aprovadas
  - Propostas pendentes
- Filtros por período (mês atual, específico, todos)
- Link de cadastro para equipe
- Últimas propostas da equipe
- Lista resumida de membros da equipe
- Performance da equipe

**Acesso**: Gestor autenticado (aprovado)

---

### `/gestor/equipe` - Minha Equipe
**Descrição**: Página de gestão completa da equipe.

**Funcionalidades**:
- Lista completa de corretores da equipe
- Detalhes de cada corretor:
  - Nome, email, WhatsApp
  - Status (aprovado/pendente)
  - Total de propostas
  - Propostas aprovadas
  - Data de cadastro
- Busca e filtros
- Estatísticas individuais
- Visualização de propostas por corretor

**Acesso**: Gestor autenticado

---

### `/gestor/equipe/novo` - Adicionar Corretor
**Descrição**: Página para adicionar novo corretor à equipe.

**Funcionalidades**:
- Formulário de busca de corretor
- Vinculação de corretor existente
- Criação de novo corretor
- Atribuição automática ao gestor

**Acesso**: Gestor autenticado

---

### `/gestor/link-cadastro` - Link de Cadastro
**Descrição**: Página de gerenciamento do link único de cadastro.

**Funcionalidades**:
- Exibição do link único
- Cópia do link
- Geração de novo link
- Estatísticas de uso do link
- QR Code para compartilhamento

**Acesso**: Gestor autenticado

---

## 🔍 **PORTAL DO ANALISTA**

### `/analista` - Portal do Analista
**Descrição**: Portal dedicado para análise de propostas.

**Funcionalidades**:
- **Aba "Propostas Recebidas"**:
  - Lista de todas as propostas recebidas
  - Filtros por status, data, corretor
  - Visualização de detalhes
  - Ações de análise
- **Aba "Em Análise"**:
  - Propostas com status "pendente"
  - Acompanhamento de análise
  - Aprovação/rejeição
- **Aba "Aguardando Cadastro"**:
  - Propostas aprovadas aguardando cadastro
  - Processo de cadastro do cliente
  - Finalização de propostas

**Acesso**: Usuário admin com permissões de analista

---

## 🛠️ **PORTAL ADMINISTRATIVO**

### `/admin` - Dashboard Administrativo
**Descrição**: Dashboard principal do administrador.

**Funcionalidades**:
- Cards de estatísticas:
  - Leads recebidos
  - Propostas recebidas
  - Propostas aprovadas
  - Corretores ativos
- Gráficos de performance (últimos 6 meses)
- Links rápidos para principais seções
- Visão geral do sistema

**Acesso**: Usuário admin autenticado

---

### `/admin/propostas` - Gestão de Propostas
**Descrição**: Página de gestão completa de propostas.

**Funcionalidades**:
- Lista completa de propostas
- Filtros avançados:
  - Por status
  - Por corretor
  - Por data
  - Por produto
- Visualização de detalhes
- Edição inline de dados
- Aprovação/rejeição de propostas
- Alteração de status
- Exportação de dados

**Acesso**: Admin com permissão "propostas"

---

### `/admin/em-analise` - Propostas em Análise
**Descrição**: Página específica para propostas pendentes de análise.

**Funcionalidades**:
- Lista de propostas com status "pendente"
- Filtros e busca
- Visualização detalhada
- Aprovação/rejeição
- Comentários e observações

**Acesso**: Admin com permissão "em_analise"

---

### `/admin/cadastrado` - Clientes Cadastrados
**Descrição**: Página de clientes que já foram cadastrados no sistema.

**Funcionalidades**:
- Lista de clientes cadastrados
- Filtros por data, produto, corretor
- Detalhes do cliente
- Histórico de propostas
- Status do cadastro

**Acesso**: Admin com permissão "cadastrado"

---

### `/admin/corretores` - Gestão de Corretores
**Descrição**: Página de gestão completa de corretores.

**Funcionalidades**:
- Lista de todos os corretores
- Filtros por status, gestor, data
- Aprovação/rejeição de corretores
- Edição de dados
- Promoção a gestor
- Remoção de status de gestor
- Geração de link de cadastro de equipe
- Visualização de propostas do corretor
- Estatísticas individuais

**Acesso**: Admin com permissão "corretores"

---

### `/admin/corretores/propostas` - Propostas por Corretor
**Descrição**: Visualização de propostas agrupadas por corretor.

**Funcionalidades**:
- Lista de corretores
- Propostas de cada corretor
- Filtros e estatísticas
- Performance por corretor

**Acesso**: Admin com permissão "corretores"

---

### `/admin/leads` - Gestão de Leads
**Descrição**: Página de gestão de leads recebidos.

**Funcionalidades**:
- Lista de leads
- Filtros por data, origem, status
- Detalhes do lead
- Conversão em proposta
- Atribuição a corretor
- Exportação de dados

**Acesso**: Admin com permissão "leads"

---

### `/admin/produtos` - Gestão de Produtos
**Descrição**: Página de gestão de produtos/planos.

**Funcionalidades**:
- Lista de produtos
- Criação de novo produto
- Edição de produtos
- Ativação/desativação
- Associação com tabelas
- Valores e características

**Acesso**: Admin com permissão "produtos"

---

### `/admin/tabelas` - Gestão de Tabelas
**Descrição**: Página de gestão de tabelas de preços.

**Funcionalidades**:
- Lista de tabelas
- Criação de nova tabela
- Edição de tabela
- Configuração de faixas etárias
- Valores por faixa
- Associação com produtos
- Visualização detalhada

**Acesso**: Admin com permissão "tabelas"

---

### `/admin/tabelas/[id]` - Detalhes da Tabela
**Descrição**: Página de detalhes de uma tabela específica.

**Funcionalidades**:
- Visualização completa da tabela
- Edição de faixas e valores
- Produtos associados
- Histórico de alterações

**Acesso**: Admin com permissão "tabelas"

---

### `/admin/tabelas/[id]/visualizar` - Visualização da Tabela
**Descrição**: Visualização somente leitura da tabela.

**Funcionalidades**:
- Visualização formatada
- Exportação em PDF/Excel
- Compartilhamento

**Acesso**: Admin com permissão "tabelas"

---

### `/admin/comissoes` - Gestão de Comissões
**Descrição**: Página de gestão de comissões de corretores.

**Funcionalidades**:
- Lista de comissões
- Filtros por corretor, período, status
- Cálculo de comissões
- Pagamento de comissões
- Histórico de pagamentos
- Relatórios

**Acesso**: Admin com permissão "comissoes"

---

### `/admin/financeiro` - Gestão Financeira
**Descrição**: Página de gestão financeira do sistema.

**Funcionalidades**:
- Dashboard financeiro
- Receitas e despesas
- Comissões pagas
- Relatórios financeiros
- Integração com sistemas externos
- Importação de dados

**Acesso**: Admin com permissão "financeiro"

---

### `/admin/financeiro/importar` - Importar Dados Financeiros
**Descrição**: Página para importação de dados financeiros.

**Funcionalidades**:
- Upload de arquivos
- Importação de planilhas
- Validação de dados
- Processamento de importação

**Acesso**: Admin com permissão "financeiro"

---

### `/admin/contratos` - Gestão de Contratos
**Descrição**: Página de gestão de contratos.

**Funcionalidades**:
- Lista de contratos
- Criação de novo contrato
- Edição de contratos
- Status dos contratos
- Renovação de contratos
- Visualização de detalhes

**Acesso**: Admin com permissão "contratos"

---

### `/admin/contratos/[id]` - Detalhes do Contrato
**Descrição**: Página de detalhes de um contrato específico.

**Funcionalidades**:
- Visualização completa
- Edição de dados
- Histórico de alterações
- Faturas associadas
- Documentos

**Acesso**: Admin com permissão "contratos"

---

### `/admin/administradoras` - Gestão de Administradoras
**Descrição**: Página de gestão de administradoras de planos.

**Funcionalidades**:
- Lista de administradoras
- Criação de nova administradora
- Edição de dados
- Configurações
- Clientes associados

**Acesso**: Admin com permissão "administradoras"

---

### `/admin/administradoras/[id]` - Detalhes da Administradora
**Descrição**: Página de detalhes de uma administradora.

**Funcionalidades**:
- Visualização completa
- Edição de dados
- Configurações
- Clientes vinculados
- Faturas

**Acesso**: Admin com permissão "administradoras"

---

### `/admin/administradoras/[id]/clientes` - Clientes da Administradora
**Descrição**: Lista de clientes de uma administradora.

**Funcionalidades**:
- Lista de clientes
- Filtros e busca
- Detalhes do cliente
- Histórico

**Acesso**: Admin com permissão "administradoras"

---

### `/admin/administradoras/[id]/clientes/[clienteId]` - Detalhes do Cliente
**Descrição**: Detalhes de um cliente específico.

**Funcionalidades**:
- Dados completos do cliente
- Propostas associadas
- Contratos
- Faturas

**Acesso**: Admin com permissão "administradoras"

---

### `/admin/administradoras/[id]/clientes/[clienteId]/faturas` - Faturas do Cliente
**Descrição**: Faturas de um cliente específico.

**Funcionalidades**:
- Lista de faturas
- Detalhes de cada fatura
- Status de pagamento
- Histórico

**Acesso**: Admin com permissão "administradoras"

---

### `/admin/administradoras/[id]/configuracoes` - Configurações da Administradora
**Descrição**: Configurações específicas de uma administradora.

**Funcionalidades**:
- Configurações gerais
- Integrações
- Parâmetros de negócio
- Notificações

**Acesso**: Admin com permissão "administradoras"

---

### `/admin/usuarios` - Gestão de Usuários Admin
**Descrição**: Página de gestão de usuários administrativos.

**Funcionalidades**:
- Lista de usuários admin
- Criação de novo usuário
- Edição de usuário
- Atribuição de permissões
- Perfis de acesso
- Ativação/desativação

**Acesso**: Admin master

---

### `/admin/vendas` - Gestão de Vendas
**Descrição**: Página de gestão de vendas.

**Funcionalidades**:
- Lista de vendas
- Filtros por período, corretor, produto
- Estatísticas de vendas
- Relatórios
- Performance de vendas

**Acesso**: Admin com permissão "vendas"

---

### `/admin/propostas-digitais` - Propostas Digitais
**Descrição**: Página de gestão de propostas digitais.

**Funcionalidades**:
- Lista de propostas digitais
- Filtros e busca
- Status das propostas
- Visualização de detalhes
- Acompanhamento de preenchimento

**Acesso**: Admin com permissão "propostas_digitais"

---

### `/admin/propostas-digitais/visualizar/[id]` - Visualizar Proposta Digital
**Descrição**: Visualização de uma proposta digital específica.

**Funcionalidades**:
- Visualização completa
- Status de preenchimento
- Dados preenchidos
- Documentos anexados
- Assinatura

**Acesso**: Admin com permissão "propostas_digitais"

---

### `/admin/propostas-corretores` - Propostas por Corretor
**Descrição**: Visualização de propostas agrupadas por corretor.

**Funcionalidades**:
- Lista de corretores
- Propostas de cada corretor
- Estatísticas
- Performance

**Acesso**: Admin com permissão "propostas"

---

### `/admin/produtos-corretores` - Produtos por Corretor
**Descrição**: Gestão de produtos disponíveis para cada corretor.

**Funcionalidades**:
- Lista de corretores
- Produtos associados a cada corretor
- Atribuição de produtos
- Remoção de produtos
- Configurações de acesso

**Acesso**: Admin com permissão "produtos_corretores"

---

### `/admin/produtos-corretores/[id]` - Produtos do Corretor
**Descrição**: Produtos disponíveis para um corretor específico.

**Funcionalidades**:
- Lista de produtos
- Atribuição/remoção
- Configurações
- Tabelas associadas

**Acesso**: Admin com permissão "produtos_corretores"

---

### `/admin/modelos-propostas` - Modelos de Propostas
**Descrição**: Gestão de modelos/templates de propostas.

**Funcionalidades**:
- Lista de modelos
- Criação de novo modelo
- Edição de modelo
- Duplicação
- Exclusão
- Uso em propostas

**Acesso**: Admin com permissão "modelos_propostas"

---

### `/admin/plataformas` - Gestão de Plataformas (Legado)
**Descrição**: Página legada de gestão de plataformas (movida para EasyBen).

**Funcionalidades**:
- Lista de plataformas
- Configurações básicas

**Acesso**: Admin (legado)

---

### `/admin/clientes` - Gestão de Clientes
**Descrição**: Página de gestão de clientes.

**Funcionalidades**:
- Lista de clientes
- Filtros e busca
- Detalhes do cliente
- Edição de dados
- Histórico de propostas
- Status do cliente

**Acesso**: Admin com permissão "clientes"

---

### `/admin/clientes-ativos` - Clientes Ativos
**Descrição**: Página específica para clientes ativos no sistema.

**Funcionalidades**:
- Lista de clientes ativos
- Filtros por produto, data, corretor
- Estatísticas
- Detalhes

**Acesso**: Admin com permissão "clientes"

---

## 🏢 **PORTAL EASYBEN (WHITE-LABEL)**

### `/admin/easyben` - Dashboard EasyBen
**Descrição**: Dashboard principal da administração EasyBen (white-label).

**Funcionalidades**:
- Cards de estatísticas:
  - Total de plataformas
  - Plataformas ativas
  - Total de clientes
- Links rápidos para:
  - Plataformas
  - Clientes
  - Serviços
  - Configurações
  - Relatórios

**Acesso**: Admin EasyBen

---

### `/admin/easyben/plataformas` - Gestão de Plataformas
**Descrição**: Página de gestão de plataformas white-label (tenants).

**Funcionalidades**:
- Lista de todas as plataformas
- Criação de nova plataforma
- Edição de plataforma:
  - Dados básicos
  - Branding (logo, cores)
  - Domínio/slug
  - Configurações
- Ativação/desativação
- Estatísticas por plataforma
- Visualização de detalhes

**Acesso**: Admin EasyBen

---

### `/admin/easyben/clientes` - Clientes EasyBen
**Descrição**: Página de gestão de clientes da plataforma EasyBen.

**Funcionalidades**:
- Lista de clientes
- Filtros por plataforma
- Detalhes do cliente
- Estatísticas

**Acesso**: Admin EasyBen

---

### `/admin/easyben/servicos` - Serviços EasyBen
**Descrição**: Página de gestão de serviços oferecidos.

**Funcionalidades**:
- Lista de serviços
- Configuração de serviços
- Preços e planos
- Ativação/desativação

**Acesso**: Admin EasyBen

---

### `/admin/easyben/configuracoes` - Configurações EasyBen
**Descrição**: Página de configurações gerais da plataforma EasyBen.

**Funcionalidades**:
- Configurações gerais
- Integrações
- Parâmetros do sistema
- Notificações
- Segurança

**Acesso**: Admin EasyBen

---

### `/admin/easyben/relatorios` - Relatórios EasyBen
**Descrição**: Página de relatórios e análises.

**Funcionalidades**:
- Relatórios gerais
- Relatórios por plataforma
- Relatórios por cliente
- Exportação de dados
- Gráficos e estatísticas

**Acesso**: Admin EasyBen

---

### `/super-admin` - Super Admin (Redireciona)
**Descrição**: Página raiz do super admin (redireciona para tenants).

**Funcionalidades**:
- Redirecionamento automático para `/super-admin/tenants`

**Acesso**: Super admin

---

### `/super-admin/tenants` - Gestão de Tenants
**Descrição**: Página de gestão completa de tenants (clientes white-label).

**Funcionalidades**:
- Lista de todos os tenants
- Criação de novo tenant
- Edição completa:
  - Dados básicos
  - Slug/domínio
  - Branding completo
  - Configurações
  - Status
- Ativação/desativação
- Estatísticas por tenant
- Visualização de detalhes
- Gerenciamento de usuários admin do tenant

**Acesso**: Super admin

---

## 📄 **PROPOSTAS E FORMULÁRIOS**

### `/proposta-digital` - Proposta Digital (Inicial)
**Descrição**: Página inicial para criação de proposta digital.

**Funcionalidades**:
- Seleção de corretor (se não pré-definido)
- Início do processo de proposta digital
- Redirecionamento para completar proposta

**Acesso**: Público

---

### `/proposta-digital/completar/[id]` - Completar Proposta Digital
**Descrição**: Formulário completo para preenchimento de proposta digital.

**Funcionalidades**:
- Wizard multi-step:
  - Dados pessoais
  - Dados de dependentes
  - Informações do plano
  - Questionário de saúde
  - Upload de documentos
  - Assinatura digital
  - Revisão final
- Validações em tempo real
- Salvamento automático
- Envio de proposta

**Acesso**: Público (via link único)

---

### `/proposta-digital/sucesso` - Sucesso na Proposta Digital
**Descrição**: Página de confirmação após envio de proposta digital.

**Funcionalidades**:
- Mensagem de sucesso
- Informações sobre próximos passos
- Número da proposta
- Link para acompanhamento

**Acesso**: Público (após envio)

---

### `/proposta` - Proposta (Geral)
**Descrição**: Página geral de propostas.

**Funcionalidades**:
- Informações sobre propostas
- Links para criação

**Acesso**: Público

---

### `/proposta/[corretor]` - Proposta por Corretor
**Descrição**: Página de proposta vinculada a um corretor específico.

**Funcionalidades**:
- Informações do corretor
- Formulário de proposta
- Criação de proposta vinculada

**Acesso**: Público

---

### `/obrigado` - Página de Agradecimento
**Descrição**: Página exibida após envio de formulário/cotação.

**Funcionalidades**:
- Mensagem de agradecimento
- Informações sobre próximos passos
- Contato

**Acesso**: Público

---

### `/confirmar-email` - Confirmação de Email
**Descrição**: Página de confirmação de email.

**Funcionalidades**:
- Confirmação de cadastro
- Validação de email
- Redirecionamento após confirmação

**Acesso**: Público (via link de email)

---

## 🧪 **PÁGINAS DE TESTE E DEBUG**

### `/teste-peso-altura` - Teste Peso/Altura
**Descrição**: Página de teste para cálculos de peso e altura.

**Funcionalidades**:
- Teste de fórmulas
- Validação de cálculos

**Acesso**: Desenvolvimento

---

### `/teste-questionario-dependentes` - Teste Questionário Dependentes
**Descrição**: Página de teste para questionário de dependentes.

**Funcionalidades**:
- Teste de formulário
- Validações

**Acesso**: Desenvolvimento

---

### `/teste-dados-proposta` - Teste Dados Proposta
**Descrição**: Página de teste para dados de proposta.

**Funcionalidades**:
- Teste de estrutura de dados
- Validações

**Acesso**: Desenvolvimento

---

### `/debug/proposta-wizard` - Debug Proposta Wizard
**Descrição**: Página de debug do wizard de propostas.

**Funcionalidades**:
- Debug de fluxo
- Teste de steps
- Validações

**Acesso**: Desenvolvimento

---

### `/admin/ferramentas/*` - Ferramentas de Diagnóstico
**Descrição**: Conjunto de páginas de ferramentas de diagnóstico e debug.

**Páginas disponíveis**:
- `/admin/ferramentas/analisar-fluxo-propostas` - Análise de fluxo
- `/admin/ferramentas/corrigir-tipos-colunas` - Correção de tipos
- `/admin/ferramentas/diagnostico-campos-propostas` - Diagnóstico de campos
- `/admin/ferramentas/diagnostico-edge-function` - Diagnóstico Edge Function
- `/admin/ferramentas/diagnostico-status-propostas` - Diagnóstico de status
- `/admin/ferramentas/diagnostico-tabela-propostas` - Diagnóstico de tabela
- `/admin/ferramentas/investigar-documentos` - Investigação de documentos
- `/admin/ferramentas/investigar-fluxo-documentos` - Investigação de fluxo
- `/admin/ferramentas/testar-email` - Teste de email
- `/admin/ferramentas/testar-email-corrigido` - Teste de email corrigido
- `/admin/ferramentas/testar-link-proposta` - Teste de link de proposta
- `/admin/ferramentas/testar-usuarios` - Teste de usuários
- `/admin/ferramentas/verificar-api` - Verificação de API
- `/admin/ferramentas/verificar-ids-propostas` - Verificação de IDs
- `/admin/ferramentas/verificar-pdf` - Verificação de PDF
- `/admin/ferramentas/verificar-propostas` - Verificação de propostas
- `/admin/ferramentas/verificar-supabase` - Verificação Supabase

**Funcionalidades**:
- Diagnóstico de problemas
- Testes de funcionalidades
- Verificação de dados
- Correção de erros
- Análise de fluxos

**Acesso**: Desenvolvimento/Admin

---

## 📊 **RESUMO DE PERMISSÕES E ACESSOS**

### Público
- Páginas de apresentação (`/`, `/sobre`, `/contato`)
- Páginas de tenant (`/[tenant-slug]/*`)
- Cadastro de corretor (`/corretor/cadastro`)
- Cadastro de gestor (`/gestor/cadastro`)
- Login de corretor (`/corretor/login`)
- Login de gestor (`/gestor/login`)
- Proposta digital (`/proposta-digital/*`)

### Corretor Autenticado (Aprovado)
- Dashboard (`/corretor/dashboard`)
- Propostas (`/corretor/propostas/*`)
- Clientes (`/corretor/clientes`)
- Produtos (`/corretor/produtos`)
- Comissões (`/corretor/comissoes`)
- Tabelas (`/corretor/tabelas/*`)
- Modelos (`/corretor/modelos-propostas`)
- Meu Link (`/corretor/meu-link`)

### Gestor Autenticado (Aprovado)
- Dashboard (`/gestor`)
- Minha Equipe (`/gestor/equipe`)
- Adicionar Corretor (`/gestor/equipe/novo`)
- Link de Cadastro (`/gestor/link-cadastro`)

### Analista (Admin com Permissões)
- Portal do Analista (`/analista`)
- Abas: Recebidas, Em Análise, Aguardando Cadastro

### Admin (Com Permissões Específicas)
- Dashboard (`/admin`)
- Propostas (`/admin/propostas`)
- Corretores (`/admin/corretores`)
- Produtos (`/admin/produtos`)
- Tabelas (`/admin/tabelas`)
- Comissões (`/admin/comissoes`)
- Financeiro (`/admin/financeiro`)
- Contratos (`/admin/contratos`)
- Administradoras (`/admin/administradoras`)
- Usuários (`/admin/usuarios`)
- Vendas (`/admin/vendas`)
- Leads (`/admin/leads`)
- Clientes (`/admin/clientes`)
- Modelos (`/admin/modelos-propostas`)
- Propostas Digitais (`/admin/propostas-digitais`)
- Produtos por Corretor (`/admin/produtos-corretores`)

### Admin EasyBen
- Dashboard EasyBen (`/admin/easyben`)
- Plataformas (`/admin/easyben/plataformas`)
- Clientes (`/admin/easyben/clientes`)
- Serviços (`/admin/easyben/servicos`)
- Configurações (`/admin/easyben/configuracoes`)
- Relatórios (`/admin/easyben/relatorios`)

### Super Admin (EasyBen)
- Super Admin (`/super-admin`) - Redireciona para tenants
- Gestão de Tenants (`/super-admin/tenants`)

---

## 🔄 **FLUXOS PRINCIPAIS**

### Fluxo de Cadastro de Corretor
1. `/corretor/cadastro` → Preenchimento de dados (3 steps)
2. `/corretor/aguardando-aprovacao` → Aguardando aprovação
3. `/corretor/dashboard` → Após aprovação

### Fluxo de Cadastro de Gestor
1. `/gestor/cadastro` → Preenchimento de dados (4 steps)
2. `/gestor/aguardando-aprovacao` → Aguardando aprovação
3. `/gestor` → Após aprovação

### Fluxo de Proposta Digital
1. `/proposta-digital` → Início
2. `/proposta-digital/completar/[id]` → Preenchimento
3. `/proposta-digital/sucesso` → Confirmação

### Fluxo de Análise de Proposta
1. `/analista` → Portal do Analista
2. Aba "Recebidas" → Visualização
3. Aba "Em Análise" → Análise
4. Aba "Aguardando Cadastro" → Finalização

### Fluxo de Gestão de Equipe (Gestor)
1. `/gestor` → Dashboard
2. `/gestor/equipe` → Visualização da equipe
3. `/gestor/equipe/novo` → Adicionar corretor
4. `/gestor/link-cadastro` → Compartilhar link

---

## 📝 **NOTAS IMPORTANTES**

1. **Sistema White-Label**: O sistema foi transformado em plataforma white-label, permitindo múltiplos clientes (tenants) com branding personalizado.

2. **Permissões**: O sistema utiliza um sistema de permissões baseado em perfis e permissões específicas para controlar acesso às funcionalidades.

3. **RLS (Row Level Security)**: O sistema utiliza RLS do Supabase para isolamento de dados por tenant.

4. **Responsividade**: Todas as páginas são responsivas e otimizadas para mobile.

5. **Autenticação**: Sistema de autenticação separado para corretores, gestores e administradores.

6. **Páginas Legadas**: Algumas páginas antigas foram mantidas para compatibilidade, mas novas funcionalidades estão sendo migradas para novas rotas.

---

**Última atualização**: Dezembro 2024
**Versão do Sistema**: White-Label (EasyBen)

