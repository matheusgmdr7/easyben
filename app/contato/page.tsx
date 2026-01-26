import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Clock, Instagram, MessageCircle } from "lucide-react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function ContatoPage() {
  return (
    <>
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-[#0F172A] text-white py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Entre em Contato</h1>
              <p className="text-lg md:text-xl text-gray-100">
                Estamos à disposição para esclarecer suas dúvidas e ajudar você a encontrar o plano de saúde ideal.
              </p>
            </div>
          </div>
        </section>

        {/* Contato Section */}
        <section className="py-12 bg-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informações de Contato */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl">Informações de Contato</CardTitle>
                    <CardDescription>Entre em contato diretamente pelos nossos canais de atendimento.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">E-mail</p>
                        <p className="text-gray-600 break-words">contato@contratandoplanos.com.br</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Instagram className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Instagram</p>
                        <p className="text-gray-600">@contratandoplanos</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-[#0F172A] mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Horário de Atendimento</p>
                        <p className="text-gray-600">
                          Segunda a Sexta: 8h às 18h
                          <br />
                          Sábado: 9h às 13h
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Atendimento Imediato */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl">Atendimento Imediato</CardTitle>
                    <CardDescription>Precisa de uma resposta rápida? Fale conosco pelo WhatsApp.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-center h-full">
                    <p className="text-gray-600 mb-6">
                      Nossos consultores estão prontos para atender você e esclarecer todas as suas dúvidas sobre planos
                      de saúde.
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="w-full md:w-auto bg-[#25D366] text-white hover:bg-[#25D366]/90 rounded-full font-medium"
                    >
                      <Link
                        href="https://wa.me/551151941621"
                        target="_blank"
                        className="flex items-center justify-center"
                      >
                        Falar pelo WhatsApp
                        <MessageCircle className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#0F172A]">Perguntas Frequentes</h2>

              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg md:text-xl font-semibold mb-2">
                      Qual o prazo de resposta para mensagens enviadas por e-mail?
                    </h3>
                    <p className="text-gray-600">
                      Respondemos todas as mensagens em até 24 horas úteis. Para atendimento mais rápido, recomendamos o
                      contato via WhatsApp.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg md:text-xl font-semibold mb-2">
                      Posso agendar uma visita presencial para tirar dúvidas?
                    </h3>
                    <p className="text-gray-600">
                      Sim! Atendemos presencialmente em nosso escritório mediante agendamento prévio. Entre em contato
                      por telefone ou WhatsApp para marcar um horário.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg md:text-xl font-semibold mb-2">Vocês atendem em todo o Brasil?</h3>
                    <p className="text-gray-600">
                      Sim, atendemos clientes em todo o território nacional. Para clientes fora de São Paulo, oferecemos
                      atendimento remoto completo via telefone, e-mail, WhatsApp ou videoconferência.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg md:text-xl font-semibold mb-2">
                      Como funciona o processo após o primeiro contato?
                    </h3>
                    <p className="text-gray-600">
                      Após o primeiro contato, um de nossos consultores entrará em contato para entender suas
                      necessidades. Em seguida, apresentaremos as melhores opções de planos disponíveis para o seu
                      perfil, auxiliando em todo o processo de contratação.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
