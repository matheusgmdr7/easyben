"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { criarLead } from "@/services/leads-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Script from "next/script" // Import Script component

interface Plano {
  id: number
  nome: string
  operadora: string
  preco: number
  cobertura: string
  tipo: string
  descricao: string
}

const ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]

export default function CadastroPage() {
  const router = useRouter()
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [estado, setEstado] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    // Recuperar o plano selecionado do localStorage
    const planoSalvo = localStorage.getItem("planoSelecionado")
    if (planoSalvo) {
      setPlanoSelecionado(JSON.parse(planoSalvo))
    } else {
      // Se não houver plano selecionado, redirecionar para a página de cotação
      router.push("/cotacao")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setCarregando(true)
    setErro(null)
    setSucesso(false)

    try {
      if (!planoSelecionado) {
        throw new Error("Plano não selecionado")
      }

      // Recuperar a faixa etária do localStorage
      const idade = localStorage.getItem("idade")
      if (!idade) {
        throw new Error("Idade não encontrada")
      }

      // Determinar a faixa etária baseado na idade
      let faixaEtaria = ""
      const idadeNum = Number.parseInt(idade)
      if (idadeNum <= 18) faixaEtaria = "0-18"
      else if (idadeNum <= 23) faixaEtaria = "19-23"
      else if (idadeNum <= 28) faixaEtaria = "24-28"
      else if (idadeNum <= 33) faixaEtaria = "29-33"
      else if (idadeNum <= 38) faixaEtaria = "34-38"
      else if (idadeNum <= 43) faixaEtaria = "39-43"
      else if (idadeNum <= 48) faixaEtaria = "44-48"
      else if (idadeNum <= 53) faixaEtaria = "49-53"
      else if (idadeNum <= 58) faixaEtaria = "54-58"
      else faixaEtaria = "59+"

      // Criar lead no Supabase
      await criarLead({
        nome,
        email,
        whatsapp,
        plano_id: planoSelecionado.id.toString(),
        plano_nome: planoSelecionado.nome,
        plano_operadora: planoSelecionado.operadora,
        faixa_etaria: faixaEtaria,
        estado: estado,
        status: "Novo",
      })

      // Dados do cliente para armazenar no localStorage (para o assistente)
      const dadosCliente = {
        nome,
        email,
        whatsapp,
        planoSelecionado,
        dataRegistro: new Date().toISOString(),
      }

      localStorage.setItem("dadosCliente", JSON.stringify(dadosCliente))

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você será redirecionado para falar com nosso assistente virtual.",
      })

      // Redirecionar para a página do assistente virtual após 2 segundos
      setTimeout(() => {
        router.push("/assistente")
      }, 2000)

      setSucesso(true)
    } catch (error) {
      console.error("Erro ao realizar cadastro:", error)
      setErro(error instanceof Error ? error.message : "Erro ao criar lead")
    } finally {
      setIsSubmitting(false)
      setCarregando(false)
    }
  }

  const formatarWhatsapp = (valor: string) => {
    // Remove todos os caracteres não numéricos
    const apenasNumeros = valor.replace(/\D/g, "")

    // Aplica a máscara (XX) XXXXX-XXXX
    let resultado = apenasNumeros
    if (apenasNumeros.length > 0) {
      resultado = apenasNumeros.replace(/^(\d{2})(\d)/g, "($1) $2")
      resultado = resultado.replace(/(\d)(\d{4})$/, "$1-$2")
    }

    return resultado
  }

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarWhatsapp(e.target.value)
    setWhatsapp(valorFormatado)
  }

  if (!planoSelecionado) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow py-10 flex items-center justify-center">
          <p>Carregando...</p>
        </main>
        <Footer />
      </div>
    )
  }

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
         'https://connect.facebook.net/en_US/fbevents.js');
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

      <Toaster />

      <main className="flex-grow py-8 md:py-10 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[#0F172A]">
              Receba mais informações
            </h1>

            <Card className="mb-4 md:mb-6">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Plano selecionado</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Confira os detalhes do plano que você selecionou
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm md:text-base">
                  <div className="flex justify-between">
                    <span className="font-medium">Plano:</span>
                    <span>{planoSelecionado.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Operadora:</span>
                    <span>{planoSelecionado.operadora}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tipo:</span>
                    <span>{planoSelecionado.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Valor mensal:</span>
                    <span className="font-bold text-[#0F172A] text-lg md:text-xl">
                      R$ {planoSelecionado.preco.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Receba mais informações em segundos</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Preencha seus dados para que um de nossos corretores entre em contato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-sm md:text-base">
                      Nome completo
                    </Label>
                    <Input
                      id="nome"
                      placeholder="Digite seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm md:text-base">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Digite seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm md:text-base">
                      WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      placeholder="(00) 00000-0000"
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      maxLength={15}
                      required
                      className="text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado" className="text-sm md:text-base">
                      Estado
                    </Label>
                    <Select value={estado} onValueChange={setEstado} required>
                      <SelectTrigger id="estado" className="text-sm md:text-base">
                        <SelectValue placeholder="Selecione seu estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((estado) => (
                          <SelectItem key={estado} value={estado} className="text-sm md:text-base">
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-sm md:text-base py-2 md:py-3"
                    disabled={isSubmitting || carregando}
                  >
                    {carregando ? "Enviando..." : "Quero mais informações"}
                  </Button>

                  {erro && <p className="text-red-500 text-sm md:text-base">{erro}</p>}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
