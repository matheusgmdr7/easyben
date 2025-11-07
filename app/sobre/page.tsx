import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Clock, Shield, Heart } from "lucide-react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function SobrePage() {
  return (
    <>
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-[#168979] text-white py-20">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Sobre a Contratandoplanos</h1>
              <p className="text-lg md:text-xl text-white/90">
                Te ajudamos a encontrar o plano de saúde ideal para suas necessidades.
              </p>
            </div>
          </div>
        </section>

        {/* Nossa História Section */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="md:w-1/2">
                  <h2 className="text-3xl font-bold mb-6 text-[#168979]">Nossa História</h2>
                  <p className="text-gray-600 mb-4">
                    A Contratandoplanos nasceu com o propósito de simplificar o acesso à saúde privada no Brasil.
                    Identificamos que muitas pessoas tinham dificuldade em encontrar planos adequados às suas
                    necessidades e orçamento, além de enfrentarem processos burocráticos complexos.
                  </p>
                  <p className="text-gray-600 mb-4">
                    Começamos como uma pequena corretora com apenas 3 colaboradores e, ao longo dos anos, expandimos
                    nossa atuação para todo o território nacional, construindo parcerias sólidas com as principais
                    Corretoras e Operadoras de saúde do país.
                  </p>
                  <p className="text-gray-600">
                    Hoje, somos reconhecidos pela excelência no atendimento personalizado e pelo compromisso em oferecer
                    as melhores soluções em planos de saúde para indivíduos, famílias e empresas.
                  </p>
                </div>
                <div className="md:w-1/2">
                  <img
                    src="https://i.ibb.co/7tNXmzzB/Inserir-um-ti-tulo-4.png"
                    alt="Escritório da Contratandoplanos"
                    className="rounded-xl shadow-lg w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Nossos Diferenciais Section */}
        <section className="py-16 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12 text-[#168979]">Nossos Diferenciais</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-start bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#168979]/10 p-3 rounded-full mr-4 flex-shrink-0">
                    <Users className="h-6 w-6 text-[#168979]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Atendimento Personalizado</h3>
                    <p className="text-gray-600">
                      Entendemos que cada cliente tem necessidades únicas. Por isso, oferecemos um atendimento
                      totalmente personalizado, analisando o perfil e as necessidades específicas de cada pessoa ou
                      empresa.
                    </p>
                  </div>
                </div>

                <div className="flex items-start bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#168979]/10 p-3 rounded-full mr-4 flex-shrink-0">
                    <Shield className="h-6 w-6 text-[#168979]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Parceria com as Melhores Operadoras</h3>
                    <p className="text-gray-600">
                      Trabalhamos com as principais operadoras de planos de saúde do mercado, garantindo opções de
                      qualidade e condições diferenciadas para nossos clientes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#168979]/10 p-3 rounded-full mr-4 flex-shrink-0">
                    <Clock className="h-6 w-6 text-[#168979]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Agilidade nos Processos</h3>
                    <p className="text-gray-600">
                      Simplificamos toda a burocracia envolvida na contratação de planos de saúde, oferecendo um
                      processo ágil e descomplicado, desde a cotação até a efetivação do contrato.
                    </p>
                  </div>
                </div>

                <div className="flex items-start bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#168979]/10 p-3 rounded-full mr-4 flex-shrink-0">
                    <Heart className="h-6 w-6 text-[#168979]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Suporte Contínuo</h3>
                    <p className="text-gray-600">
                      Nosso relacionamento não termina após a contratação do plano. Oferecemos suporte contínuo para
                      auxiliar em dúvidas, solicitações e renovações, garantindo que você sempre tenha a melhor
                      experiência.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Números Section */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-12 text-[#168979]">Contratandoplanos em Números</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-6 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-4xl font-bold text-[#168979] mb-2">5</p>
                  <p className="text-gray-600">Anos de experiência</p>
                </div>

                <div className="p-6 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-4xl font-bold text-[#168979] mb-2">+2k</p>
                  <p className="text-gray-600">Clientes atendidos</p>
                </div>

                <div className="p-6 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-4xl font-bold text-[#168979] mb-2">+10</p>
                  <p className="text-gray-600">Corretoras e Operadoras parceiras</p>
                </div>

                <div className="p-6 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-4xl font-bold text-[#168979] mb-2">97%</p>
                  <p className="text-gray-600">Clientes satisfeitos</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-[#168979] to-[#13786a] text-white">
          <div className="container px-4 md:px-6 text-center">
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Faça uma cotação gratuita e descubra como podemos ajudar você a encontrar o plano de saúde ideal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all"
              >
                <Link href="/cotacao">
                  Fazer cotação gratuita
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-white text-[#168979] hover:bg-white/90 rounded-full font-medium">
                <Link href="/contato">Falar com um consultor</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
