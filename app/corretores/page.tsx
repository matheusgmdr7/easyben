"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { criarCorretor } from "@/services/corretores-service"
import { Camera, CheckCircle2, ChevronRight, Shield, Award, BarChart3, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"

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

export default function CorretoresPage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    cidade: "",
    estado: "",
    cpf: "",
    data_nascimento: "",
    senha: "",
    confirmarSenha: "",
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [step, setStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [erroCpf, setErroCpf] = useState<string | null>(null)

  // Função para validar CPF
  function validarCPF(cpf: string) {
    cpf = cpf.replace(/\D/g, "")
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let soma = 0
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i)
    let resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.charAt(9))) return false
    soma = 0
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i)
    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.charAt(10))) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setErro(null)
    setSucesso(false)

    // Validar CPF antes de enviar
    if (!validarCPF(formData.cpf)) {
      setErro("CPF inválido. Por favor, verifique o número digitado.")
      setCarregando(false)
      return
    }

    // Validar senha
    if (formData.senha !== formData.confirmarSenha) {
      setErro("As senhas não coincidem")
      setCarregando(false)
      return
    }

    try {
      console.log("Iniciando cadastro para:", formData.email)

      // 1. Verificar se o email já está cadastrado na tabela corretores
      const { data: corretorExistente, error: checkError } = await supabase
        .from("corretores")
        .select("*")
        .eq("email", formData.email)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Erro ao verificar email:", checkError)
        setErro("Erro ao verificar email. Tente novamente.")
        setCarregando(false)
        return
      }

      if (corretorExistente) {
        console.log("⚠️ Email já cadastrado na tabela corretores:", formData.email)
        setErro("Este email já está cadastrado. Tente fazer login ou recuperar sua senha.")
        setCarregando(false)
        return
      }

      // 2. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            role: "corretor",
            nome: formData.nome,
          },
        },
      })

      if (authError) {
        console.error("Erro ao criar usuário no Auth:", authError)
        
        // Tratar erro específico de usuário já cadastrado
        if (authError.message.includes("already registered") || 
            authError.message.includes("User already registered") ||
            authError.message.includes("already exists")) {
          setErro("Este email já está cadastrado no sistema. Tente fazer login ou recuperar sua senha.")
        } else {
          setErro(`Erro ao criar conta: ${authError.message}`)
        }
        setCarregando(false)
        return
      }

      console.log("✅ Usuário criado no Auth com sucesso")

      // 3. Criar registro na tabela corretores
      const corretor = await criarCorretor({
        nome: formData.nome,
        email: formData.email,
        whatsapp: formData.whatsapp,
        cidade: formData.cidade,
        estado: formData.estado,
        cpf: formData.cpf,
        data_nascimento: formData.data_nascimento,
        status: "pendente", // Corretor começa como pendente
        ativo: true,
      })

      console.log("✅ Corretor criado com sucesso:", corretor)

      // Aqui você implementaria a lógica para fazer upload da foto
      // e salvar os dados do corretor no banco de dados

      setSucesso(true)
      setFormData({
        nome: "",
        email: "",
        whatsapp: "",
        cidade: "",
        estado: "",
        cpf: "",
        data_nascimento: "",
        senha: "",
        confirmarSenha: "",
      })
    } catch (error) {
      console.error("Erro ao cadastrar corretor:", error)
      setErro("Ocorreu um erro ao cadastrar. Por favor, tente novamente.")
    } finally {
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
    setFormData({ ...formData, whatsapp: valorFormatado })
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData({ ...formData, cpf: value })
    if (value.length === 14 || value.length === 11) {
      if (!validarCPF(value)) {
        setErroCpf("CPF inválido")
      } else {
        setErroCpf(null)
      }
    } else {
      setErroCpf(null)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      // Validar campos do primeiro passo
      if (!formData.nome || !formData.email || !formData.whatsapp) {
        setErro("Por favor, preencha todos os campos obrigatórios")
        return
      }
      setErro(null)
      setStep(2)
    }
  }

  const prevStep = () => {
    setStep(1)
    setErro(null)
  }

  return (
    <>
      <Header />

      <main className="flex-grow py-12 md:py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#0F172A]">Corretor Digital</h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                Junte-se à nossa rede de corretores parceiros e tenha acesso a ferramentas exclusivas para impulsionar
                suas vendas
              </p>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:w-2/5"
              >
                <Card className="border-0 shadow-lg overflow-hidden bg-white">
                  <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] h-3"></div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-[#0F172A]">
                      {sucesso ? "Cadastro Realizado!" : "Cadastre-se"}
                    </CardTitle>
                    <CardDescription>
                      {sucesso
                        ? "Seu cadastro foi realizado com sucesso. Acesse agora o Corretor Digital."
                        : "Preencha o formulário para se tornar um corretor parceiro."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sucesso ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-6"
                      >
                        <div className="flex justify-center mb-6">
                          <CheckCircle2 className="h-16 w-16 text-[#0F172A]" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Cadastro concluído!</h3>
                        <p className="text-gray-600 mb-6">
                          Seu cadastro foi realizado com sucesso.<br />
                          <span className="font-semibold text-[#0F172A]">Assim que for aprovado, você poderá acessar a plataforma normalmente e aproveitar todos os recursos do Corretor Digital.</span>
                        </p>
                        <motion.div
                          initial={{ scale: 1 }}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "loop",
                          }}
                          className="w-full"
                        >
                          <Button
                            asChild
                            className="w-full bg-gradient-to-r from-[#0F172A] to-[#0d5c52] hover:from-[#1E293B] hover:to-[#0a4a42] text-white py-6 rounded-lg text-lg font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
                          >
                            <Link href="/corretor/login">
                              <span className="flex items-center gap-2">
                                <span>Acessar Corretor Digital</span>
                                <ChevronRight className="h-5 w-5 animate-pulse" />
                              </span>
                            </Link>
                          </Button>
                        </motion.div>
                        <p className="text-center text-sm text-[#0F172A] mt-3 font-medium">
                          Você receberá um e-mail assim que seu cadastro for aprovado.
                        </p>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit}>
                        {erro && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md"
                          >
                            <p className="text-red-700">{erro}</p>
                          </motion.div>
                        )}

                        <div className="mb-6">
                          <div className="flex justify-between mb-4">
                            <div
                              className={`flex items-center ${step === 1 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step === 1 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}
                              >
                                1
                              </div>
                              <span>Informações Pessoais</span>
                            </div>
                            <div
                              className={`flex items-center ${step === 2 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step === 2 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}
                              >
                                2
                              </div>
                              <span>Credenciais</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 h-1 rounded-full">
                            <div
                              className="bg-[#0F172A] h-1 rounded-full transition-all duration-300"
                              style={{ width: step === 1 ? "50%" : "100%" }}
                            ></div>
                          </div>
                        </div>

                        {step === 1 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-5"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="nome" className="text-gray-700 font-medium">
                                Nome completo *
                              </Label>
                              <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Digite seu nome completo"
                                required
                                className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-gray-700 font-medium">
                                E-mail *
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Digite seu e-mail"
                                required
                                className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="whatsapp" className="text-gray-700 font-medium">
                                WhatsApp *
                              </Label>
                              <Input
                                id="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleWhatsappChange}
                                placeholder="(00) 00000-0000"
                                required
                                className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="cidade" className="text-gray-700 font-medium">
                                  Cidade *
                                </Label>
                                <Input
                                  id="cidade"
                                  value={formData.cidade}
                                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                  placeholder="Digite sua cidade"
                                  required
                                  className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="estado" className="text-gray-700 font-medium">
                                  Estado *
                                </Label>
                                <Select
                                  value={formData.estado}
                                  onValueChange={(value) => setFormData({ ...formData, estado: value })}
                                >
                                  <SelectTrigger id="estado" className="h-12 rounded-lg border-gray-300">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ESTADOS.map((estado) => (
                                      <SelectItem key={estado} value={estado}>
                                        {estado}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="cpf" className="text-gray-700 font-medium">
                                  CPF *
                                </Label>
                                <Input
                                  id="cpf"
                                  value={formData.cpf}
                                  onChange={handleCpfChange}
                                  placeholder="000.000.000-00"
                                  required
                                  maxLength={14}
                                  pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
                                  className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                                />
                                {erroCpf && <span className="text-xs text-red-600">{erroCpf}</span>}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="data_nascimento" className="text-gray-700 font-medium">
                                  Data de Nascimento *
                                </Label>
                                <Input
                                  id="data_nascimento"
                                  type="date"
                                  value={formData.data_nascimento}
                                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                  required
                                  className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A]"
                                />
                              </div>
                            </div>

                            <div className="pt-4">
                              <Button
                                type="button"
                                onClick={nextStep}
                                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white py-6 rounded-lg text-lg shadow-md"
                              >
                                Continuar
                                <ChevronRight className="ml-2 h-5 w-5" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {step === 2 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-5"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="senha" className="text-gray-700 font-medium">
                                Senha *
                              </Label>
                              <div className="relative">
                                <Input
                                  id="senha"
                                  type={mostrarSenha ? "text" : "password"}
                                  value={formData.senha}
                                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                  placeholder="Digite sua senha"
                                  required
                                  className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A] pr-10"
                                />
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                                  onClick={() => setMostrarSenha((v) => !v)}
                                  tabIndex={-1}
                                >
                                  {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Mínimo de 8 caracteres, incluindo letras e números
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="confirmarSenha" className="text-gray-700 font-medium">
                                Confirmar Senha *
                              </Label>
                              <div className="relative">
                                <Input
                                  id="confirmarSenha"
                                  type={mostrarConfirmarSenha ? "text" : "password"}
                                  value={formData.confirmarSenha}
                                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                                  placeholder="Confirme sua senha"
                                  required
                                  className="h-12 rounded-lg border-gray-300 focus:border-[#0F172A] focus:ring-[#0F172A] pr-10"
                                />
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                                  onClick={() => setMostrarConfirmarSenha((v) => !v)}
                                  tabIndex={-1}
                                >
                                  {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                              <Button
                                type="button"
                                onClick={prevStep}
                                variant="outline"
                                className="flex-1 py-6 rounded-lg text-lg border-[#0F172A] text-[#0F172A]"
                              >
                                Voltar
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1 bg-[#0F172A] hover:bg-[#1E293B] text-white py-6 rounded-lg text-lg shadow-md"
                                disabled={carregando}
                              >
                                {carregando ? "Processando..." : "Finalizar Cadastro"}
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        <div className="text-center mt-6 text-sm text-gray-500">
                          Já tem uma conta?{" "}
                          <Link href="/corretor/login" className="text-[#0F172A] hover:underline font-medium">
                            Faça login
                          </Link>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="lg:w-3/5"
              >
                <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-8 text-white shadow-xl h-full">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">
                    Potencialize suas vendas com o Corretor Digital
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Dashboard Completo</h3>
                        <p className="text-white/80">
                          Acompanhe suas propostas e comissões em tempo real com um painel intuitivo e completo.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Produtos Exclusivos</h3>
                        <p className="text-white/80">
                          Acesso a produtos exclusivos com as melhores condições do mercado e comissões diferenciadas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Suporte Especializado</h3>
                        <p className="text-white/80">
                          Conte com nossa equipe de especialistas para tirar dúvidas e auxiliar em todo o processo de
                          venda.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-white/20">
                    <div className="text-center">
                      <p className="text-white/80 mb-1">Junte-se a mais de</p>
                      <p className="text-3xl font-bold">500+ Corretores</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
