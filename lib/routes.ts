/**
 * 📚 Arquivo Centralizado de Rotas do Sistema
 * 
 * Este arquivo contém todas as rotas do sistema organizadas por módulo.
 * Use este arquivo como referência única para todas as rotas disponíveis.
 * 
 * Última atualização: 2024
 */

export interface Route {
  path: string
  label: string
  description?: string
  requiresAuth?: boolean
  requiredRole?: 'corretor' | 'gestor' | 'admin' | 'analista' | 'administradora' | 'public'
  children?: Route[]
}

/**
 * 🏠 ROTAS PÚBLICAS E APRESENTAÇÃO
 */
export const publicRoutes: Route[] = [
  {
    path: '/',
    label: 'Página Principal',
    description: 'Página institucional da plataforma EasyBen',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/cotacao',
    label: 'Cotação',
    description: 'Página de cotação online de planos de saúde',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/sobre',
    label: 'Sobre Nós',
    description: 'Página institucional sobre a empresa',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/contato',
    label: 'Contato',
    description: 'Página de contato',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/[tenant-slug]',
    label: 'Página do Cliente (Tenant)',
    description: 'Página inicial personalizada para cada cliente white-label',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/[tenant-slug]/sobre',
    label: 'Sobre do Cliente',
    description: 'Página "Sobre Nós" personalizada para o tenant',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/[tenant-slug]/contato',
    label: 'Contato do Cliente',
    description: 'Página de contato personalizada para o tenant',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/[tenant-slug]/cliente',
    label: 'Dashboard do Cliente (CPF)',
    description: 'Consulta de cliente e boletos/faturas por CPF no tenant',
    requiresAuth: false,
    requiredRole: 'public',
  },
]

/**
 * 🔐 ROTAS DE AUTENTICAÇÃO E CADASTRO
 */
export const authRoutes: Route[] = [
  // Corretor
  {
    path: '/corretor/login',
    label: 'Login do Corretor',
    description: 'Página de login para corretores',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/corretor/cadastro',
    label: 'Cadastro de Corretor',
    description: 'Página de cadastro de novos corretores com sistema de steps',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/corretor/aguardando-aprovacao',
    label: 'Aguardando Aprovação (Corretor)',
    description: 'Página exibida após cadastro, enquanto aguarda aprovação',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/recuperar-senha',
    label: 'Recuperação de Senha (Corretor)',
    description: 'Página para recuperação de senha do corretor',
    requiresAuth: false,
    requiredRole: 'public',
  },
  // Gestor
  {
    path: '/gestor/login',
    label: 'Login do Gestor',
    description: 'Página de login específica para gestores de equipe',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/gestor/cadastro',
    label: 'Cadastro de Gestor',
    description: 'Página de cadastro de gestores com campos financeiros completos',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/gestor/aguardando-aprovacao',
    label: 'Aguardando Aprovação (Gestor)',
    description: 'Página de aguardando aprovação para gestores',
    requiresAuth: true,
    requiredRole: 'gestor',
  },
  // Admin
  {
    path: '/admin/login',
    label: 'Login Administrativo',
    description: 'Página de login para administradores',
    requiresAuth: false,
    requiredRole: 'public',
  },
  // Administradora
  {
    path: '/administradora/login',
    label: 'Login da Administradora',
    description: 'Página de login para administradoras',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/administradora/cadastro',
    label: 'Cadastro de Administradora',
    description: 'Página de cadastro de novas administradoras',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/administradora/recuperar-senha',
    label: 'Recuperação de Senha (Administradora)',
    description: 'Página para recuperação de senha da administradora',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/administradora/redefinir-senha',
    label: 'Redefinir Senha (Administradora)',
    description: 'Página para redefinir senha da administradora',
    requiresAuth: false,
    requiredRole: 'public',
  },
  // Legado
  {
    path: '/corretores',
    label: 'Cadastro Antigo (Legado)',
    description: 'Página de cadastro antiga (mantida para compatibilidade)',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/corretores/equipe/[token]',
    label: 'Cadastro via Link de Equipe',
    description: 'Página de cadastro de corretor através de link único de equipe',
    requiresAuth: false,
    requiredRole: 'public',
  },
]

/**
 * 👤 PORTAL DO CORRETOR
 */
export const corretorRoutes: Route[] = [
  {
    path: '/corretor/dashboard',
    label: 'Dashboard',
    description: 'Dashboard principal do corretor com visão geral de suas atividades',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/propostas',
    label: 'Propostas',
    description: 'Lista de todas as propostas do corretor',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/propostas/nova',
    label: 'Nova Proposta',
    description: 'Formulário completo para criação de nova proposta',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/propostas/[id]',
    label: 'Detalhes da Proposta',
    description: 'Página de detalhes de uma proposta específica',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/clientes',
    label: 'Clientes',
    description: 'Gestão de clientes do corretor',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/produtos',
    label: 'Produtos',
    description: 'Lista de produtos disponíveis para o corretor',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/comissoes',
    label: 'Comissões',
    description: 'Visualização de comissões do corretor',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/tabelas',
    label: 'Tabelas',
    description: 'Tabelas de preços e produtos',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/modelos-propostas',
    label: 'Modelos de Propostas',
    description: 'Modelos de propostas disponíveis',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/meu-link',
    label: 'Meu Link',
    description: 'Link personalizado do corretor',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
  {
    path: '/corretor/configuracoes',
    label: 'Configurações',
    description: 'Configurações do corretor',
    requiresAuth: true,
    requiredRole: 'corretor',
  },
]

/**
 * 👥 PORTAL DO GESTOR
 */
export const gestorRoutes: Route[] = [
  {
    path: '/gestor',
    label: 'Dashboard',
    description: 'Dashboard principal do gestor',
    requiresAuth: true,
    requiredRole: 'gestor',
  },
  {
    path: '/gestor/equipe',
    label: 'Minha Equipe',
    description: 'Visualização da equipe do gestor',
    requiresAuth: true,
    requiredRole: 'gestor',
  },
  {
    path: '/gestor/equipe/novo',
    label: 'Adicionar Corretor',
    description: 'Adicionar novo corretor à equipe',
    requiresAuth: true,
    requiredRole: 'gestor',
  },
  {
    path: '/gestor/link-cadastro',
    label: 'Link de Cadastro',
    description: 'Link de cadastro para compartilhar com novos corretores',
    requiresAuth: true,
    requiredRole: 'gestor',
  },
]

/**
 * 📋 PORTAL DO ANALISTA
 */
export const analistaRoutes: Route[] = [
  {
    path: '/analista',
    label: 'Dashboard',
    description: 'Dashboard principal do analista',
    requiresAuth: true,
    requiredRole: 'analista',
  },
  {
    path: '/analista/propostas',
    label: 'Propostas Recebidas',
    description: 'Lista de propostas recebidas para análise',
    requiresAuth: true,
    requiredRole: 'analista',
  },
  {
    path: '/analista/em-analise',
    label: 'Em Análise',
    description: 'Propostas em processo de análise',
    requiresAuth: true,
    requiredRole: 'analista',
  },
  {
    path: '/analista/relatorios',
    label: 'Relatórios',
    description: 'Relatórios e estatísticas do analista',
    requiresAuth: true,
    requiredRole: 'analista',
  },
]

/**
 * 🏢 PORTAL DA ADMINISTRADORA
 */
export const administradoraRoutes: Route[] = [
  {
    path: '/administradora/dashboard',
    label: 'Dashboard',
    description: 'Dashboard principal da administradora',
    requiresAuth: true,
    requiredRole: 'administradora',
  },
  {
    path: '/administradora/faturamento',
    label: 'Faturamento',
    description: 'Módulo de faturamento',
    requiresAuth: true,
    requiredRole: 'administradora',
    children: [
      {
        path: '/administradora/faturamento/pesquisar',
        label: 'Pesquisar',
        description: 'Pesquisar faturamentos',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
      {
        path: '/administradora/faturamento/agendamento',
        label: 'Agendamento',
        description: 'Agendamento de faturamentos',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
    ],
  },
  {
    path: '/administradora/fatura',
    label: 'Fatura',
    description: 'Módulo de fatura',
    requiresAuth: true,
    requiredRole: 'administradora',
    children: [
      {
        path: '/administradora/fatura',
        label: 'Pesquisar',
        description: 'Pesquisar faturas',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
      {
        path: '/administradora/fatura/devedores',
        label: 'Devedores',
        description: 'Faturas de devedores',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
    ],
  },
  {
    path: '/administradora/financeiro',
    label: 'Financeiro',
    description: 'Módulo financeiro',
    requiresAuth: true,
    requiredRole: 'administradora',
    children: [
      {
        path: '/administradora/financeiro/pesquisar',
        label: 'Pesquisar',
        description: 'Pesquisar lançamentos financeiros',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
    ],
  },
  {
    path: '/administradora/contrato',
    label: 'Contrato',
    description: 'Módulo de contratos',
    requiresAuth: true,
    requiredRole: 'administradora',
    children: [
      {
        path: '/administradora/contrato/pesquisar',
        label: 'Pesquisar',
        description: 'Pesquisar contratos',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
      {
        path: '/administradora/contrato/novo',
        label: 'Novo',
        description: 'Cadastrar novo contrato',
        requiresAuth: true,
        requiredRole: 'administradora',
      },
    ],
  },
  {
    path: '/administradora/grupos-beneficiarios',
    label: 'Grupo de Beneficiários',
    description: 'Gestão de grupos de beneficiários',
    requiresAuth: true,
    requiredRole: 'administradora',
  },
  {
    path: '/administradora/propostas',
    label: 'Propostas',
    description: 'Gestão de propostas',
    requiresAuth: true,
    requiredRole: 'administradora',
  },
  {
    path: '/administradora/configuracoes',
    label: 'Configurações',
    description: 'Configurações da administradora',
    requiresAuth: true,
    requiredRole: 'administradora',
  },
]

/**
 * 🔧 PORTAL DO ADMIN
 */
export const adminRoutes: Route[] = [
  {
    path: '/admin',
    label: 'Dashboard',
    description: 'Dashboard principal do admin',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/operadoras',
    label: 'Operadoras',
    description: 'Gestão de operadoras',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/administradoras',
    label: 'Administradoras',
    description: 'Gestão de administradoras',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/entidades',
    label: 'Entidades',
    description: 'Gestão de entidades',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/corretoras',
    label: 'Corretoras',
    description: 'Gestão de corretoras',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/produtos',
    label: 'Produtos',
    description: 'Gestão de produtos',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/tabelas',
    label: 'Tabelas',
    description: 'Gestão de tabelas',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/modelos-propostas',
    label: 'Modelo de Propostas',
    description: 'Gestão de modelos de propostas',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/leads',
    label: 'Leads',
    description: 'Gestão de leads',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/cadastrado',
    label: 'Em Cadastro',
    description: 'Gestão de cadastros pendentes',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/admin/usuarios',
    label: 'Usuários',
    description: 'Gestão de usuários admin (apenas para Master)',
    requiresAuth: true,
    requiredRole: 'admin',
  },
]

/**
 * 🌐 PORTAL EASYBEN ADMIN
 */
export const easybenAdminRoutes: Route[] = [
  {
    path: '/easyben/admin',
    label: 'Plataformas',
    description: 'Gerenciar clientes white-label',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/easyben/admin/configuracoes',
    label: 'Configurações',
    description: 'Configurações gerais do sistema',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/easyben/admin/usuarios',
    label: 'Usuários',
    description: 'Gerenciar usuários administradores',
    requiresAuth: true,
    requiredRole: 'admin',
  },
  {
    path: '/easyben/admin/relatorios',
    label: 'Relatórios',
    description: 'Relatórios e analytics',
    requiresAuth: true,
    requiredRole: 'admin',
  },
]

/**
 * 📄 PROPOSTA DIGITAL
 */
export const propostaDigitalRoutes: Route[] = [
  {
    path: '/proposta-digital',
    label: 'Proposta Digital',
    description: 'Início do processo de proposta digital',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/proposta-digital/completar/[id]',
    label: 'Completar Proposta Digital',
    description: 'Preenchimento de proposta digital',
    requiresAuth: false,
    requiredRole: 'public',
  },
  {
    path: '/proposta-digital/sucesso',
    label: 'Sucesso',
    description: 'Confirmação de proposta digital enviada',
    requiresAuth: false,
    requiredRole: 'public',
  },
]

/**
 * 🔄 TODAS AS ROTAS (CONSOLIDADO)
 */
export const allRoutes: Route[] = [
  ...publicRoutes,
  ...authRoutes,
  ...corretorRoutes,
  ...gestorRoutes,
  ...analistaRoutes,
  ...administradoraRoutes,
  ...adminRoutes,
  ...easybenAdminRoutes,
  ...propostaDigitalRoutes,
]

/**
 * Função helper para buscar uma rota por path
 */
export function findRouteByPath(path: string): Route | undefined {
  function searchInRoutes(routes: Route[]): Route | undefined {
    for (const route of routes) {
      if (route.path === path) {
        return route
      }
      if (route.children) {
        const found = searchInRoutes(route.children)
        if (found) return found
      }
    }
    return undefined
  }

  return searchInRoutes(allRoutes)
}

/**
 * Função helper para buscar todas as rotas de um módulo específico
 */
export function getRoutesByRole(role: Route['requiredRole']): Route[] {
  const roleRoutes: Route[] = []

  function collectRoutes(routes: Route[]) {
    for (const route of routes) {
      if (route.requiredRole === role) {
        roleRoutes.push(route)
      }
      if (route.children) {
        collectRoutes(route.children)
      }
    }
  }

  collectRoutes(allRoutes)
  return roleRoutes
}

/**
 * Função helper para verificar se uma rota requer autenticação
 */
export function routeRequiresAuth(path: string): boolean {
  const route = findRouteByPath(path)
  return route?.requiresAuth ?? false
}

/**
 * Função helper para obter todas as rotas públicas
 */
export function getPublicRoutes(): Route[] {
  return allRoutes.filter(route => !route.requiresAuth || route.requiredRole === 'public')
}

/**
 * Função helper para obter todas as rotas autenticadas
 */
export function getAuthenticatedRoutes(): Route[] {
  return allRoutes.filter(route => route.requiresAuth === true)
}


