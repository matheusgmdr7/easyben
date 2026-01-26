import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Check,
  Globe,
  Shield,
  Zap,
  Users,
  Building2,
  BarChart3,
  Lock,
  Award,
  Clock,
  TrendingUp,
  FileText,
  CreditCard,
  Settings,
  Rocket,
} from "lucide-react"
import Link from "next/link"
import EasyBenHeader from "@/components/easyben/easyben-header"
import EasyBenFooter from "@/components/easyben/easyben-footer"
import StackedDashboards from "@/components/easyben/stacked-dashboards"
import TimelineFuncionalidades from "@/components/easyben/timeline-funcionalidades"

export default function EasyBenHome() {
  return (
    <>
      <EasyBenHeader />

      <main className="flex-grow">
        {/* Hero Section - Brex Style */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container px-4 md:px-6 py-20 md:py-32">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left Column - Content */}
                <div className="space-y-8">
                  {/* Badge - Sem emoji */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00C6FF]/10 text-[#00C6FF] rounded-full text-sm font-medium">
                    Plataforma White-Label Completa
                  </div>

                  {/* Main Title - Lato Bold */}
                  <div className="space-y-4">
                    <h1
                      className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-[#0F172A] tracking-tight"
                      style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}
                    >
                      Venda mais e Gerencie melhor seus produtos
                </h1>

                    {/* Subtitle - Lato */}
                    <p
                      className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-xl"
                      style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}
                    >
                      Plataforma que une ferramentas avançadas de venda e gestão de benefícios de seguros e saúde usando a sua marca.
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      asChild
                    size="lg"
                      className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 px-8 py-6 text-base h-auto border-0"
                      style={{ fontFamily: "'Inter', sans-serif", borderRadius: '8px' }}
                  >
                      <Link href="/easyben-admin" className="flex items-center">
                        Agendar Demonstração
                    <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg font-medium px-8 py-6 text-base h-auto transition-all duration-200"
                      style={{ fontFamily: "'Inter', sans-serif", borderRadius: '8px' }}
                    >
                      <Link href="#funcionalidades">
                        Ver Funcionalidades
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Right Column - Dashboards Empilhados */}
                <div className="hidden lg:block relative w-full flex items-center">
                  <div className="relative w-full h-full min-h-[500px] flex items-center">
                    <StackedDashboards />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Trust Bar */}
        <section className="py-12 bg-white border-y border-gray-200">
          <div className="container px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <p className="text-sm text-gray-500 text-center mb-8" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                Confiado por empresas líderes
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-center">
                    <div className="h-12 w-32 bg-gray-300 rounded-lg"></div>
                </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bloco 1: O Diferencial White Label - Timeline de Funcionalidades */}
        <section className="py-24 md:py-32 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2
                  className="text-4xl md:text-5xl font-bold mb-6 text-[#0F172A] tracking-tight"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
                >
                  Todas as Funcionalidades do Sistema
            </h2>
                <p
                  className="text-xl text-gray-600 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
                >
                  Explore todas as páginas e funções disponíveis em cada portal da plataforma
              </p>
            </div>

              {/* Timeline de Funcionalidades */}
              <TimelineFuncionalidades />
            </div>
          </div>
        </section>

        {/* Bloco 2: Funcionalidades Core */}
        <section id="funcionalidades" className="py-24 md:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2
                  className="text-4xl md:text-5xl font-bold mb-6 text-[#0F172A] tracking-tight"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
                >
                  Funcionalidades Core
                </h2>
                <p
                  className="text-xl text-gray-600 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
                >
                  Tudo que você precisa para gerenciar e vender benefícios de forma eficiente
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: "Gestão de Vidas",
                    description: "Controle completo de vidas, dependentes e beneficiários com interface intuitiva.",
                  },
                  {
                    title: "Flexibilidade de Saldos",
                    description: "Configure saldos personalizados por categoria de benefício e perfil de usuário.",
                  },
                  {
                    title: "Relatórios em Tempo Real",
                    description: "Dashboards com métricas atualizadas em tempo real para tomada de decisão.",
                  },
                  {
                    title: "Gestão de Propostas",
                    description: "Sistema completo de propostas digitais com assinatura eletrônica e rastreamento.",
                  },
                  {
                    title: "Portal do Corretor",
                    description: "Dashboard dedicado para corretores com gestão de clientes e comissões.",
                  },
                  {
                    title: "Integrações",
                    description: "Conecte com principais operadoras, ERPs e sistemas de pagamento.",
                  },
                ].map((feature, index) => {
                  // SVG Icons Institucionais
                  const iconSVGs = [
                    // Gestão de Vidas
                    <svg key="users" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>,
                    // Flexibilidade de Saldos
                    <svg key="credit" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>,
                    // Relatórios
                    <svg key="chart" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>,
                    // Gestão de Propostas
                    <svg key="file" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>,
                    // Portal do Corretor
                    <svg key="building" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>,
                    // Integrações
                    <svg key="settings" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>,
                  ]
                  
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-[#1E293B] hover:shadow-lg transition-all duration-300"
                    >
                      <div className="bg-[#1E293B]/10 rounded-lg p-3 w-fit mb-4 text-[#1E293B]">
                        {iconSVGs[index]}
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-[#0F172A]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
                        {feature.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Bloco 3: Como Funciona */}
        <section id="como-funciona" className="py-24 md:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2
                  className="text-4xl md:text-5xl font-bold mb-6 text-[#0F172A] tracking-tight"
                  style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}
                >
                  Como Funciona
                </h2>
                <p
                  className="text-xl text-gray-600 leading-relaxed"
                  style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}
                >
                  Três passos simples para começar a usar sua plataforma white-label
              </p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: "01",
                    title: "Cadastre sua Empresa",
                    description: "Crie sua conta na EasyBen e configure os dados básicos da sua empresa. Nossa equipe valida e ativa sua plataforma em até 24 horas.",
                    icon: Building2,
                  },
                  {
                    step: "02",
                    title: "Personalize sua Marca",
                    description: "Configure cores, logo, domínio personalizado e identidade visual. Sua plataforma estará pronta com sua marca em minutos.",
                    icon: Settings,
                  },
                  {
                    step: "03",
                    title: "Comece a Vender",
                    description: "Acesse sua plataforma personalizada, cadastre corretores e comece a receber propostas. Tudo funcionando com sua marca.",
                    icon: Rocket,
                  },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="relative">
                      {/* Step Number */}
                      <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#7BD9F6] rounded-full flex items-center justify-center shadow-lg z-10">
                        <span className="text-white font-bold text-lg" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>
                          {item.step}
                        </span>
                      </div>

                      {/* Card */}
                      <div className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-shadow duration-300 pt-12">
                        <div className="w-12 h-12 bg-[#00C6FF]/10 rounded-lg flex items-center justify-center mb-6">
                          <Icon className="h-6 w-6 text-[#00C6FF]" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-[#0F172A]" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>
                          {item.title}
                  </h3>
                        <p className="text-gray-600 leading-relaxed" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>
                          {item.description}
                  </p>
                </div>
                    </div>
                  )
                })}
              </div>
            </div>
                </div>
        </section>

        {/* Bloco 4: Tecnologia e Segurança */}
        <section className="py-24 md:py-32 bg-[#0F172A] text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2
                  className="text-4xl md:text-5xl font-bold mb-6 tracking-tight"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
                >
                  Tecnologia e Segurança
                </h2>
                <p
                  className="text-xl text-gray-300 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
                >
                  Infraestrutura de classe empresarial com os mais altos padrões de segurança
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Lock,
                    title: "LGPD Compliant",
                    description: "Totalmente em conformidade com a Lei Geral de Proteção de Dados.",
                  },
                  {
                    icon: Shield,
                    title: "Certificações",
                    description: "Infraestrutura certificada e auditada regularmente.",
                  },
                  {
                    icon: Clock,
                    title: "99.9% Uptime",
                    description: "Disponibilidade garantida com monitoramento 24/7.",
                  },
                ].map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {feature.title}
                  </h3>
                      <p className="text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
                        {feature.description}
                  </p>
                </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-24 md:py-32 bg-[#00C6FF] text-white">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}
              >
                Pronto para transformar seu negócio?
              </h2>
              <p
                className="text-xl md:text-2xl mb-10 text-white/90 leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
              >
                Agende uma demonstração e veja como nossa plataforma pode acelerar seu crescimento
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[#00C6FF] hover:bg-gray-50 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 px-10 py-6 text-lg h-auto border-0"
                  style={{ fontFamily: "'Inter', sans-serif", borderRadius: '8px' }}
                >
                  <Link href="/admin/easyben" className="flex items-center">
                    Agendar Demonstração
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-transparent text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50 rounded-lg font-medium px-10 py-6 text-lg h-auto transition-all duration-200"
                  style={{ fontFamily: "'Inter', sans-serif", borderRadius: '8px' }}
                >
                  <Link href="/contato">Falar com Vendas</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <EasyBenFooter />
    </>
  )
}
