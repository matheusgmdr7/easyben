import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ArrowRight, Users, Building, User, Shield, Heart, Clock } from "lucide-react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function PlanosPage() {
  return (
    <>
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] to-[#1E293B] -skew-y-6 origin-top-left transform-gpu -translate-y-32 z-0"></div>
          <div className="container relative z-10 px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Planos de Saúde para Todas as Necessidades</h1>
              <p className="text-xl text-white/90">
                Conheça nossas opções de planos de saúde e encontre a proteção ideal para você, sua família ou sua
                empresa.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" className="bg-white text-[#0F172A] hover:bg-white/90 rounded-full">
                  <Link href="/cotacao">
                    Fazer cotação agora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Intro Section */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Por que escolher um plano de saúde?</h2>
              <p className="text-gray-600 text-lg mb-12">
                Um plano de saúde oferece segurança e tranquilidade para você e sua família, garantindo acesso a
                serviços médicos de qualidade quando mais precisar. Na Contratandoplanos, trabalhamos com as melhores
                operadoras do mercado para oferecer opções que se adequam ao seu perfil e necessidades.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#0F172A]/10 p-3 rounded-full inline-flex mb-6">
                    <Shield className="h-6 w-6 text-[#0F172A]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">Proteção</h3>
                  <p className="text-gray-600">
                    Tenha a segurança de atendimento médico quando precisar, sem preocupações financeiras.
                  </p>
                </div>

                <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#0F172A]/10 p-3 rounded-full inline-flex mb-6">
                    <Heart className="h-6 w-6 text-[#0F172A]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">Qualidade</h3>
                  <p className="text-gray-600">
                    Acesso à rede credenciada com os melhores hospitais, clínicas e médicos.
                  </p>
                </div>

                <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#0F172A]/10 p-3 rounded-full inline-flex mb-6">
                    <Clock className="h-6 w-6 text-[#0F172A]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">Agilidade</h3>
                  <p className="text-gray-600">
                    Atendimento rápido e eficiente, sem as longas filas do sistema público.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tipos de Planos Section */}
        <section className="py-16 bg-gray-50">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Tipos de Planos</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-0">
                <CardHeader className="bg-[#0F172A] text-white pb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="bg-white/20 p-2 rounded-full">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-white">Planos Individuais</CardTitle>
                  </div>
                  <CardDescription className="text-white/80">
                    Proteção personalizada para suas necessidades específicas
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Cobertura para consultas, exames e internações</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Opções com diferentes níveis de cobertura</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Atendimento em rede credenciada nacional</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Planos com ou sem coparticipação</span>
                    </li>
                  </ul>
                  <Button asChild className="w-full bg-[#0F172A] hover:bg-[#1E293B] rounded-full">
                    <Link href="/cotacao">
                      Fazer cotação
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-0 relative">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  MAIS POPULAR
                </div>
                <CardHeader className="bg-[#0F172A] text-white pb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="bg-white/20 p-2 rounded-full">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-white">Planos Familiares</CardTitle>
                  </div>
                  <CardDescription className="text-white/80">Proteção completa para toda a sua família</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Cobertura para titular e dependentes</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Melhor custo-benefício para famílias</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Opções com cobertura odontológica</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Descontos progressivos por número de dependentes</span>
                    </li>
                  </ul>
                  <Button asChild className="w-full bg-[#0F172A] hover:bg-[#1E293B] rounded-full">
                    <Link href="/cotacao">
                      Fazer cotação
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-0">
                <CardHeader className="bg-[#0F172A] text-white pb-4">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="bg-white/20 p-2 rounded-full">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-white">Planos Empresariais</CardTitle>
                  </div>
                  <CardDescription className="text-white/80">Soluções para empresas de todos os portes</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Planos a partir de 2 vidas</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Valores competitivos e condições especiais</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Redução de carências e flexibilidade</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-2 mt-0.5 flex-shrink-0" />
                      <span>Benefício que aumenta a retenção de talentos</span>
                    </li>
                  </ul>
                  <Button asChild className="w-full bg-[#0F172A] hover:bg-[#1E293B] rounded-full">
                    <Link href="/cotacao">
                      Fazer cotação
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Coberturas Section */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">Coberturas e Benefícios</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
                  <h3 className="text-xl font-semibold mb-6 text-[#0F172A]">Coberturas Básicas</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Consultas médicas em consultório</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Exames diagnósticos</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Internações hospitalares</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Urgências e emergências</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Tratamentos ambulatoriais</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
                  <h3 className="text-xl font-semibold mb-6 text-[#0F172A]">Coberturas Adicionais</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Atendimento odontológico</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Reembolso para procedimentos</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Acomodação em quarto privativo</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Atendimento domiciliar</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <span>Telemedicina e orientação médica</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para encontrar o plano ideal?</h2>
              <p className="text-xl mb-8 text-white/90">
                Faça uma cotação online e descubra as melhores opções de planos de saúde para você, sua família ou sua
                empresa.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-[#0F172A] hover:bg-white/90 rounded-full">
                  <Link href="/cotacao">
                    Fazer cotação gratuita
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 rounded-full"
                >
                  <Link href="/contato">Falar com um consultor</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
