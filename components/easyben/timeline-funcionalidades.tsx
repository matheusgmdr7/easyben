"use client"

import { useEffect, useRef, useState } from "react"
import { 
  Users, 
  FileText, 
  Building2, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Shield, 
  TrendingUp,
  CheckCircle,
  UserCheck,
  Target,
  DollarSign,
  Package,
  ClipboardList,
  Search,
  Link as LinkIcon,
  Calendar,
  Mail,
  Lock,
  Globe,
  Zap,
  Clock
} from "lucide-react"

interface Funcionalidade {
  categoria: string
  titulo: string
  descricao: string
  icon: React.ReactNode
  portal: string
}

const funcionalidades: Funcionalidade[] = [
  // 1. Página de Cotação
  {
    categoria: "Página de Cotação",
    titulo: "Catálogo Online Personalizável",
    descricao: "Tenha uma página de cotação online dos seus produtos como um catálogo online e personalizável",
    icon: <Package className="h-5 w-5" />,
    portal: "cotacao"
  },
  
  // 2. Portal do Corretor/Consultor
  {
    categoria: "Portal do Corretor/Consultor",
    titulo: "Dashboard Personalizado",
    descricao: "Visão geral de propostas, comissões e performance",
    icon: <BarChart3 className="h-5 w-5" />,
    portal: "corretor"
  },
  {
    categoria: "Portal do Corretor/Consultor",
    titulo: "Gestão de Propostas",
    descricao: "Criação, envio e acompanhamento de propostas digitais",
    icon: <FileText className="h-5 w-5" />,
    portal: "corretor"
  },
  {
    categoria: "Portal do Corretor/Consultor",
    titulo: "Gestão de Clientes",
    descricao: "Controle completo de clientes e histórico de propostas",
    icon: <Users className="h-5 w-5" />,
    portal: "corretor"
  },
  {
    categoria: "Portal do Corretor/Consultor",
    titulo: "Catálogo de Produtos",
    descricao: "Visualização de produtos, tabelas e preços disponíveis",
    icon: <Package className="h-5 w-5" />,
    portal: "corretor"
  },
  {
    categoria: "Portal do Corretor/Consultor",
    titulo: "Comissões",
    descricao: "Acompanhamento de comissões recebidas e pendentes",
    icon: <DollarSign className="h-5 w-5" />,
    portal: "corretor"
  },
  {
    categoria: "Portal do Corretor/Consultor",
    titulo: "Meu Link de Indicação",
    descricao: "Link único para indicações e rastreamento de conversões",
    icon: <LinkIcon className="h-5 w-5" />,
    portal: "corretor"
  },
  
  // 3. Portal do Gestor
  {
    categoria: "Portal do Gestor",
    titulo: "Dashboard de Equipe",
    descricao: "Visão geral da equipe, propostas e performance",
    icon: <Users className="h-5 w-5" />,
    portal: "gestor"
  },
  {
    categoria: "Portal do Gestor",
    titulo: "Minha Equipe",
    descricao: "Gestão completa de corretores da equipe",
    icon: <UserCheck className="h-5 w-5" />,
    portal: "gestor"
  },
  {
    categoria: "Portal do Gestor",
    titulo: "Adicionar Corretor",
    descricao: "Vinculação de corretores existentes à equipe",
    icon: <UserCheck className="h-5 w-5" />,
    portal: "gestor"
  },
  {
    categoria: "Portal do Gestor",
    titulo: "Link de Cadastro",
    descricao: "Link único para cadastro de novos membros da equipe",
    icon: <LinkIcon className="h-5 w-5" />,
    portal: "gestor"
  },
  
  // 4. Portal do Analista
  {
    categoria: "Portal do Analista",
    titulo: "Propostas Recebidas",
    descricao: "Visualização e análise de propostas recebidas",
    icon: <FileText className="h-5 w-5" />,
    portal: "analista"
  },
  {
    categoria: "Portal do Analista",
    titulo: "Em Análise",
    descricao: "Acompanhamento de propostas em processo de análise",
    icon: <ClipboardList className="h-5 w-5" />,
    portal: "analista"
  },
  {
    categoria: "Portal do Analista",
    titulo: "Aguardando Cadastro",
    descricao: "Propostas aprovadas aguardando finalização de cadastro",
    icon: <CheckCircle className="h-5 w-5" />,
    portal: "analista"
  },
  
  // 5. Portal do Administrador
  {
    categoria: "Portal do Administrador",
    titulo: "Dashboard Administrativo",
    descricao: "Visão geral de leads, propostas, corretores e métricas",
    icon: <TrendingUp className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Propostas",
    descricao: "Análise, aprovação e gestão completa de propostas",
    icon: <ClipboardList className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Em Análise",
    descricao: "Propostas pendentes de análise e aprovação",
    icon: <Clock className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Em Cadastro",
    descricao: "Clientes aprovados aguardando finalização de cadastro",
    icon: <UserCheck className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Corretores",
    descricao: "Aprovação, edição e promoção de corretores",
    icon: <UserCheck className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Analistas",
    descricao: "Aprovação e gestão de analistas do sistema",
    icon: <UserCheck className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Produtos",
    descricao: "Criação e edição de produtos e planos disponíveis",
    icon: <Package className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Tabelas",
    descricao: "Configuração de tabelas de preços por faixa etária",
    icon: <BarChart3 className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Comissões",
    descricao: "Cálculo, pagamento e histórico de comissões",
    icon: <DollarSign className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão Financeira",
    descricao: "Dashboard financeiro, receitas, despesas e relatórios",
    icon: <CreditCard className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Administradoras",
    descricao: "Controle de administradoras e clientes vinculados",
    icon: <Building2 className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Leads",
    descricao: "Controle de leads recebidos e conversão em propostas",
    icon: <Search className="h-5 w-5" />,
    portal: "admin"
  },
  {
    categoria: "Portal do Administrador",
    titulo: "Gestão de Usuários",
    descricao: "Controle de usuários admin e permissões",
    icon: <Settings className="h-5 w-5" />,
    portal: "admin"
  },
  
  // 6. Portal da Administradora
  {
    categoria: "Portal da Administradora",
    titulo: "Dashboard Administradora",
    descricao: "Visão geral de clientes, faturas e receitas",
    icon: <BarChart3 className="h-5 w-5" />,
    portal: "administradora"
  },
  {
    categoria: "Portal da Administradora",
    titulo: "Gestão de Clientes",
    descricao: "Controle de clientes vinculados e seus contratos",
    icon: <Users className="h-5 w-5" />,
    portal: "administradora"
  },
  {
    categoria: "Portal da Administradora",
    titulo: "Gestão Financeira",
    descricao: "Faturas, pagamentos e integração com Asaas",
    icon: <CreditCard className="h-5 w-5" />,
    portal: "administradora"
  },
  
  // 7. Sistema Geral/Clientes
  {
    categoria: "Sistema Geral/Clientes",
    titulo: "Propostas Digitais",
    descricao: "Wizard completo com assinatura digital e upload de documentos",
    icon: <FileText className="h-5 w-5" />,
    portal: "geral"
  },
  {
    categoria: "Sistema Geral/Clientes",
    titulo: "Questionário de Saúde",
    descricao: "Questionário completo de saúde para análise",
    icon: <ClipboardList className="h-5 w-5" />,
    portal: "geral"
  },
  {
    categoria: "Sistema Geral/Clientes",
    titulo: "Integração Asaas",
    descricao: "Cadastro automático, geração de faturas e assinaturas",
    icon: <Zap className="h-5 w-5" />,
    portal: "geral"
  },
  {
    categoria: "Sistema Geral/Clientes",
    titulo: "White-Label Completo",
    descricao: "Branding personalizado, domínio próprio e identidade visual",
    icon: <Globe className="h-5 w-5" />,
    portal: "geral"
  },
  {
    categoria: "Sistema Geral/Clientes",
    titulo: "Segurança e LGPD",
    descricao: "Conformidade com LGPD e segurança de dados",
    icon: <Shield className="h-5 w-5" />,
    portal: "geral"
  },
]

const coresPorPortal: Record<string, string> = {
  cotacao: "bg-gray-600",
  corretor: "bg-gray-700",
  gestor: "bg-gray-700",
  analista: "bg-gray-700",
  admin: "bg-gray-800",
  administradora: "bg-gray-800",
  geral: "bg-gray-600",
}

export default function TimelineFuncionalidades() {
  // Ordem definida das categorias
  const ordemCategorias = [
    "Página de Cotação",
    "Portal do Corretor/Consultor",
    "Portal do Gestor",
    "Portal do Analista",
    "Portal do Administrador",
    "Portal da Administradora",
    "Sistema Geral/Clientes"
  ]

  // Agrupar por categoria (portal)
  const funcionalidadesPorCategoria = funcionalidades.reduce((acc, func) => {
    if (!acc[func.categoria]) {
      acc[func.categoria] = []
    }
    acc[func.categoria].push(func)
    return acc
  }, {} as Record<string, Funcionalidade[]>)

  // Ordenar categorias conforme ordem definida
  const categoriasOrdenadas = ordemCategorias.filter(cat => funcionalidadesPorCategoria[cat])

  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set())
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    cardRefs.current.forEach((ref, index) => {
      if (!ref) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleCards((prev) => new Set(prev).add(index))
            }
          })
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      )

      observer.observe(ref)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* Timeline Container - Centralizado */}
      <div className="relative">
        {/* Linha vertical da timeline - responsiva */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 md:transform md:-translate-x-1/2"></div>

        {/* Itens da timeline - Layout alternado em desktop, centralizado em mobile */}
        <div className="space-y-6">
          {categoriasOrdenadas.map((categoria, categoriaIndex) => {
            const funcs = funcionalidadesPorCategoria[categoria]
            const isEven = categoriaIndex % 2 === 0
            
            return (
              <div 
                key={categoria} 
                className={`relative ml-8 md:ml-0 ${isEven ? 'md:pr-[50%]' : 'md:pl-[50%]'}`}
                ref={(el) => {
                  cardRefs.current[categoriaIndex] = el
                }}
              >
                {/* Card do Portal - Design melhorado com animação baseada em scroll e layout alternado */}
                <div 
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden transform w-full md:max-w-[400px] ${
                    visibleCards.has(categoriaIndex) 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  } ${isEven ? 'md:mr-auto' : 'md:ml-auto'}`}
                  style={{
                    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
                    transitionDelay: `${categoriaIndex * 0.1}s`,
                  }}
                >
                  {/* Header do Card - Responsivo */}
                  <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-3 py-2.5">
                    <h3 className="text-sm md:text-base font-bold text-[#0F172A] mb-0.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                      {categoria}
                    </h3>
                    <p className="text-[10px] text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {funcs.length} funcionalidades
                    </p>
                  </div>

                  {/* Funcionalidades dentro do card - Lista sem bolinhas, responsiva */}
                  <div className="p-3">
                    <ul className="space-y-1.5">
                      {funcs.map((func, funcIndex) => (
                        <li
                          key={funcIndex}
                          className="group"
                        >
                          {/* Conteúdo sem bullet point */}
                          <div>
                            <h4 className="text-xs font-semibold text-[#0F172A] mb-0.5 group-hover:text-[#1E293B] transition-colors" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                              {func.titulo}
                            </h4>
                            <p className="text-[10px] text-gray-600 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
                              {func.descricao}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}





