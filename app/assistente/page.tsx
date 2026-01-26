"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowRight, Phone, Calendar, Shield, Award, Clock } from "lucide-react"
import Script from "next/script"

interface DadosCliente {
  nome: string
  email: string
  whatsapp: string
  planoSelecionado: {
    nome: string
    operadora: string
  }
}

export default function FaleComConsultorPage() {
  const [dadosCliente, setDadosCliente] = useState<DadosCliente | null>(null)

  useEffect(() => {
    // Recuperar dados do cliente do localStorage
    const dadosSalvos = localStorage.getItem("dadosCliente")
    if (dadosSalvos) {
      setDadosCliente(JSON.parse(dadosSalvos))
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Meta Pixel Code - Loading asynchronously */}
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
         !function(f,b,e,v,n,t,s)
         {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
           n.callMethod.apply(n,arguments):n.queue.push(arguments)};
         if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
         n.queue=[];t=b.createElement(e);t.async=!0;
         t.src=v;s=b.getElementsByTagName(e)[0];
         s.parentNode.insertBefore(t,s)}(window, document,'script',
         'https://connect.facebook.com/en_US/fbevents.js');
         fbq('init', '987817753011551');
         fbq('track', 'PageView');
       `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=987817753011551&ev=PageView&noscript=1"
        />
      </noscript>
      {/* End Meta Pixel Code */}

      <main className="flex-grow py-8 md:py-12 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-4xl font-bold text-center mb-4 text-[#0F172A]">Fale com um Consultor</h1>
            <p className="text-base md:text-xl text-center text-gray-600 mb-8 md:mb-10">
              Nossos consultores especializados estão prontos para ajudar você a encontrar o plano de saúde ideal para
              suas necessidades.
            </p>

            <div className="text-center mb-10 flex flex-col md:flex-row gap-4 justify-center">
              <a
                href={
                  dadosCliente?.nome && dadosCliente?.planoSelecionado
                    ? `https://wa.me/5521973244434?text=Olá! Meu nome é ${dadosCliente.nome} e tenho interesse no plano ${dadosCliente.planoSelecionado.nome} da ${dadosCliente.planoSelecionado.operadora}.`
                    : "https://wa.me/5521973244434?text=Olá! Gostaria de informações sobre planos de saúde."
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[#0F172A] rounded-lg shadow-lg hover:bg-[#1E293B] transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#0F172A]/50"
              >
                Consultor Barreto
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href={
                  dadosCliente?.nome && dadosCliente?.planoSelecionado
                    ? `https://wa.me/5592999994404?text=Olá! Meu nome é ${dadosCliente.nome} e tenho interesse no plano ${dadosCliente.planoSelecionado.nome} da ${dadosCliente.planoSelecionado.operadora}.`
                    : "https://wa.me/5592999994404?text=Olá! Gostaria de informações sobre planos de saúde."
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[#25D366] rounded-lg shadow-lg hover:bg-[#128C7E] transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#25D366]/50"
              >
                Consultor Oliveira
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </div>

            {dadosCliente && (
              <Card className="mb-6 md:mb-8 bg-[#0F172A] text-white">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="font-medium text-lg">Olá, {dadosCliente.nome.split(" ")[0]}!</p>
                      <p className="text-sm md:text-base text-gray-100">
                        Plano selecionado:{" "}
                        <span className="font-medium">
                          {dadosCliente.planoSelecionado.nome} - {dadosCliente.planoSelecionado.operadora}
                        </span>
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/5521973244434?text=Olá! Meu nome é ${dadosCliente.nome} e tenho interesse no plano ${dadosCliente.planoSelecionado.nome} da ${dadosCliente.planoSelecionado.operadora}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 text-base font-bold text-[#0F172A] bg-white rounded-lg shadow-md hover:bg-yellow-300 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50"
                    >
                      Falar com consultor agora
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <Card className="bg-white border-2 border-[#0F172A]/20 hover:border-[#0F172A]/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="mb-4 p-3 bg-[#0F172A]/10 rounded-full w-fit">
                      <Phone className="h-6 w-6 text-[#0F172A]" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Atendimento Rápido</h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      Fale diretamente com um consultor pelo WhatsApp e receba atendimento imediato para suas dúvidas
                      sobre planos de saúde.
                    </p>
                    <a
                      href={
                        dadosCliente?.nome && dadosCliente?.planoSelecionado
                          ? `https://wa.me/5521973244434?text=Olá! Meu nome é ${dadosCliente.nome} e tenho interesse no plano ${dadosCliente.planoSelecionado.nome} da ${dadosCliente.planoSelecionado.operadora}.`
                          : "https://wa.me/5521973244434?text=Olá! Gostaria de informações sobre planos de saúde."
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-base font-medium text-white bg-[#0F172A] rounded-lg hover:bg-[#1E293B] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/50"
                    >
                      WhatsApp Direto
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-[#0F172A]/20 hover:border-[#0F172A]/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="mb-4 p-3 bg-[#0F172A]/10 rounded-full w-fit">
                      <Calendar className="h-6 w-6 text-[#0F172A]" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Agendar Consulta</h3>
                    <p className="text-gray-600 mb-6 flex-grow">
                      Prefere uma consulta agendada? Nossos consultores podem marcar um horário específico para atender
                      você com mais calma.
                    </p>
                    <a
                      href={
                        dadosCliente?.nome
                          ? `https://wa.me/551151941621?text=Olá! Meu nome é ${dadosCliente.nome} e gostaria de agendar uma consulta para falar sobre planos de saúde.`
                          : "https://wa.me/551151941621?text=Olá! Gostaria de agendar uma consulta para falar sobre planos de saúde."
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-base font-medium text-white bg-[#0F172A] rounded-lg hover:bg-[#1E293B] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/50"
                    >
                      Agendar Consulta
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-10">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-semibold mb-6 text-center">
                  Por que escolher nossos consultores?
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-3 bg-[#0F172A]/10 rounded-full">
                      <Shield className="h-6 w-6 text-[#0F172A]" />
                    </div>
                    <h4 className="font-medium mb-2">Especialistas em Planos</h4>
                    <p className="text-sm text-gray-600">
                      Nossos consultores são especialistas em planos de saúde e conhecem todas as opções do mercado.
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-3 bg-[#0F172A]/10 rounded-full">
                      <Award className="h-6 w-6 text-[#0F172A]" />
                    </div>
                    <h4 className="font-medium mb-2">Atendimento Personalizado</h4>
                    <p className="text-sm text-gray-600">
                      Oferecemos atendimento personalizado para encontrar o plano que melhor se adapta às suas
                      necessidades.
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-3 bg-[#0F172A]/10 rounded-full">
                      <Clock className="h-6 w-6 text-[#0F172A]" />
                    </div>
                    <h4 className="font-medium mb-2">Suporte Contínuo</h4>
                    <p className="text-sm text-gray-600">
                      Mesmo após a contratação, continuamos oferecendo suporte para qualquer dúvida ou necessidade.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
