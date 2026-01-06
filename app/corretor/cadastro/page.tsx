"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Spinner } from "@/components/ui/spinner"
import { criarCorretor } from "@/services/corretores-service"
import { Eye, EyeOff } from "lucide-react"

export default function CadastroCorretor() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    // Step 1: Dados Pessoais
    nome: "",
    email: "",
    whatsapp: "",
    estado: "",
    cidade: "",
    cpf: "",
    data_nascimento: "",
    // Step 2: Credenciais
    senha: "",
    confirmarSenha: "",
    // Step 3: Dados Financeiros - PIX
    chave_pix: "",
    tipo_chave_pix: "",
    // Step 3: Dados Financeiros - Bancários
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "",
    nome_titular_conta: "",
    cpf_cnpj_titular_conta: "",
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [step, setStep] = useState(1)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [erroCpf, setErroCpf] = useState<string | null>(null)
  // Logo será carregada da configuração do sistema/tenant (configurada no painel EasyBen)
  const [logoUrl] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Função para formatar CPF
  const formatarCPF = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "")
    if (apenasNumeros.length <= 3) return apenasNumeros
    if (apenasNumeros.length <= 6) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`
    if (apenasNumeros.length <= 9) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9, 11)}`
  }

  // Função para formatar WhatsApp
  const formatarWhatsapp = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "")
    // Limita a 11 dígitos (DDD + 9 dígitos)
    const numerosLimitados = apenasNumeros.slice(0, 11)
    
    if (numerosLimitados.length <= 2) return numerosLimitados
    if (numerosLimitados.length <= 7) return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados.slice(2)}`
    return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados.slice(2, 7)}-${numerosLimitados.slice(7, 11)}`
  }

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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value)
    setFormData({ ...formData, cpf: valorFormatado })
    if (valorFormatado.replace(/\D/g, "").length === 11) {
      if (!validarCPF(valorFormatado)) {
        setErroCpf("CPF inválido")
      } else {
        setErroCpf(null)
      }
    } else {
      setErroCpf(null)
    }
  }

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarWhatsapp(e.target.value)
    setFormData({ ...formData, whatsapp: valorFormatado })
  }

  const nextStep = () => {
    if (step === 1) {
      // Validar campos do step 1
      if (!formData.nome || !formData.email || !formData.whatsapp || !formData.estado || !formData.cidade || !formData.cpf || !formData.data_nascimento) {
        setErro("Por favor, preencha todos os campos obrigatórios")
        return
      }
      if (formData.cpf && !validarCPF(formData.cpf)) {
        setErro("CPF inválido. Por favor, verifique o número digitado.")
        return
      }
      setErro("")
      setStep(2)
    } else if (step === 2) {
      // Validar campos do step 2
      if (!formData.senha || !formData.confirmarSenha) {
        setErro("Por favor, preencha a senha e confirmação")
        return
      }
      if (formData.senha.length < 6) {
        setErro("A senha deve ter no mínimo 6 caracteres")
        return
      }
      if (formData.senha !== formData.confirmarSenha) {
        setErro("As senhas não coincidem")
        return
      }
      setErro("")
      setStep(3)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
    setErro("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    setLoading(true)

    try {
      // Validar dados financeiros
      if (!formData.chave_pix && !formData.banco) {
        setErro("Preencha pelo menos uma forma de recebimento: Chave PIX ou Dados Bancários")
        setLoading(false)
        return
      }

      if (formData.chave_pix && !formData.tipo_chave_pix) {
        setErro("Selecione o tipo de chave PIX")
        setLoading(false)
        return
      }

      if (formData.banco && (!formData.agencia || !formData.conta || !formData.tipo_conta || !formData.nome_titular_conta)) {
        setErro("Preencha todos os dados bancários obrigatórios")
        setLoading(false)
        return
      }

      // 1. Verificar se o email já está cadastrado
      const { data: corretorExistente, error: checkError } = await supabase
        .from("corretores")
        .select("*")
        .eq("email", formData.email)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Erro ao verificar email:", checkError)
        setErro("Erro ao verificar email. Tente novamente.")
        setLoading(false)
        return
      }

      if (corretorExistente) {
        setErro("Este email já está cadastrado. Tente fazer login ou recuperar sua senha.")
        setLoading(false)
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
        setLoading(false)
        return
      }

      // 3. Criar registro na tabela corretores usando o serviço
      const corretor = await criarCorretor({
            nome: formData.nome,
            email: formData.email,
            whatsapp: formData.whatsapp,
            estado: formData.estado,
        cidade: formData.cidade,
            cpf: formData.cpf,
            data_nascimento: formData.data_nascimento,
        // Dados financeiros (obrigatórios)
        chave_pix: formData.chave_pix || null,
        tipo_chave_pix: formData.tipo_chave_pix || null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        tipo_conta: formData.tipo_conta || null,
        nome_titular_conta: formData.nome_titular_conta || null,
        cpf_cnpj_titular_conta: formData.cpf_cnpj_titular_conta || null,
            status: "pendente", // Corretor começa como pendente
        ativo: true,
      })

      // 4. Salvar dados do corretor no localStorage
      localStorage.setItem(
        "corretorLogado",
        JSON.stringify({
          ...corretor,
          session: authData.session,
        }),
      )

      // 5. Redirecionar para página de aguardando aprovação
      router.push("/corretor/aguardando-aprovacao")
    } catch (error) {
      console.error("Erro ao cadastrar:", error)
      setErro("Ocorreu um erro ao cadastrar. Tente novamente.")
      setLoading(false)
    }
  }

  const estados = [
    { sigla: "AC", nome: "Acre" },
    { sigla: "AL", nome: "Alagoas" },
    { sigla: "AP", nome: "Amapá" },
    { sigla: "AM", nome: "Amazonas" },
    { sigla: "BA", nome: "Bahia" },
    { sigla: "CE", nome: "Ceará" },
    { sigla: "DF", nome: "Distrito Federal" },
    { sigla: "ES", nome: "Espírito Santo" },
    { sigla: "GO", nome: "Goiás" },
    { sigla: "MA", nome: "Maranhão" },
    { sigla: "MT", nome: "Mato Grosso" },
    { sigla: "MS", nome: "Mato Grosso do Sul" },
    { sigla: "MG", nome: "Minas Gerais" },
    { sigla: "PA", nome: "Pará" },
    { sigla: "PB", nome: "Paraíba" },
    { sigla: "PR", nome: "Paraná" },
    { sigla: "PE", nome: "Pernambuco" },
    { sigla: "PI", nome: "Piauí" },
    { sigla: "RJ", nome: "Rio de Janeiro" },
    { sigla: "RN", nome: "Rio Grande do Norte" },
    { sigla: "RS", nome: "Rio Grande do Sul" },
    { sigla: "RO", nome: "Rondônia" },
    { sigla: "RR", nome: "Roraima" },
    { sigla: "SC", nome: "Santa Catarina" },
    { sigla: "SP", nome: "São Paulo" },
    { sigla: "SE", nome: "Sergipe" },
    { sigla: "TO", nome: "Tocantins" },
  ]

  const tiposChavePix = [
    { value: "CPF", label: "CPF" },
    { value: "CNPJ", label: "CNPJ" },
    { value: "Email", label: "E-mail" },
    { value: "Telefone", label: "Telefone" },
    { value: "Chave Aleatória", label: "Chave Aleatória (EVP)" },
  ]

  const tiposConta = [
    { value: "Corrente", label: "Conta Corrente" },
    { value: "Poupanca", label: "Conta Poupança" },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 mb-4">
            {logoUrl && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex-shrink-0">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Cadastro de Corretor</h1>
          </div>
          <p className="text-gray-600 mt-2">Preencha os dados para se cadastrar</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{erro}</div>
          )}

          {/* Indicador de progresso */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <div className={`flex items-center ${step >= 1 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}>
                  1
                </div>
                <span>Dados Pessoais</span>
              </div>
              <div className={`flex items-center ${step >= 2 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}>
                  2
                </div>
                <span>Credenciais</span>
              </div>
              <div className={`flex items-center ${step >= 3 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 3 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}>
                  3
                </div>
                <span>Dados Financeiros</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div
                className="bg-[#0F172A] h-1 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Dados Pessoais */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados Pessoais</h2>
                
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp *
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                value={formData.whatsapp}
                    onChange={handleWhatsappChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    placeholder="(00) 00000-0000"
                required
                    maxLength={15}
                    inputMode="numeric"
              />
                  <p className="text-xs text-gray-500 mt-1">Digite apenas números</p>
            </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                      Estado *
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
              >
                      <option value="">Selecione</option>
                {estados.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>
                    {estado.nome}
                  </option>
                ))}
              </select>
                  </div>
                  <div>
                    <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade *
                    </label>
                    <input
                      id="cidade"
                      name="cidade"
                      type="text"
                      value={formData.cidade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      required
                    />
                  </div>
            </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                      CPF *
              </label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                value={formData.cpf}
                      onChange={handleCpfChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                      inputMode="numeric"
              />
                    {erroCpf && <span className="text-xs text-red-600 mt-1 block">{erroCpf}</span>}
                    {!erroCpf && formData.cpf && formData.cpf.replace(/\D/g, "").length === 11 && (
                      <span className="text-xs text-[#0F172A] mt-1 block">✓ CPF válido</span>
                    )}
            </div>
            <div>
              <label htmlFor="data_nascimento" className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Nascimento *
              </label>
              <input
                id="data_nascimento"
                name="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
              />
            </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-[#0F172A] text-white px-6 py-2 rounded-md hover:bg-[#1E293B] transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Credenciais */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Credenciais</h2>
                
                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <input
                      id="senha"
                      name="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={formData.senha}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      tabIndex={-1}
                    >
                      {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                </div>

                <div>
                  <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmarSenha"
                      name="confirmarSenha"
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      value={formData.confirmarSenha}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                      tabIndex={-1}
                    >
                      {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-[#0F172A] text-white px-6 py-2 rounded-md hover:bg-[#1E293B] transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Dados Financeiros */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados Financeiros</h2>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Importante:</strong> Preencha pelo menos uma forma de recebimento (PIX ou Dados Bancários)
                  </p>
                </div>

                {/* Seção PIX */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Chave PIX</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="tipo_chave_pix" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Chave PIX
                    </label>
                    <select
                      id="tipo_chave_pix"
                      name="tipo_chave_pix"
                      value={formData.tipo_chave_pix}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    >
                      <option value="">Selecione o tipo</option>
                      {tiposChavePix.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="chave_pix" className="block text-sm font-medium text-gray-700 mb-1">
                      Chave PIX
                    </label>
                    <input
                      id="chave_pix"
                      name="chave_pix"
                      type="text"
                      value={formData.chave_pix}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      placeholder="Digite sua chave PIX"
                    />
                  </div>
                </div>

                {/* Seção Dados Bancários */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Dados Bancários</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="banco" className="block text-sm font-medium text-gray-700 mb-1">
                        Banco
                      </label>
                      <input
                        id="banco"
                        name="banco"
                        type="text"
                        value={formData.banco}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                        placeholder="Ex: Banco do Brasil"
                      />
                    </div>
                    <div>
                      <label htmlFor="agencia" className="block text-sm font-medium text-gray-700 mb-1">
                        Agência
                      </label>
                      <input
                        id="agencia"
                        name="agencia"
                        type="text"
                        value={formData.agencia}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="conta" className="block text-sm font-medium text-gray-700 mb-1">
                        Conta
                      </label>
                      <input
                        id="conta"
                        name="conta"
                        type="text"
                        value={formData.conta}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label htmlFor="tipo_conta" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Conta
                      </label>
                      <select
                        id="tipo_conta"
                        name="tipo_conta"
                        value={formData.tipo_conta}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      >
                        <option value="">Selecione</option>
                        {tiposConta.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="nome_titular_conta" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Titular da Conta
                    </label>
                    <input
                      id="nome_titular_conta"
                      name="nome_titular_conta"
                      type="text"
                      value={formData.nome_titular_conta}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label htmlFor="cpf_cnpj_titular_conta" className="block text-sm font-medium text-gray-700 mb-1">
                      CPF/CNPJ do Titular da Conta
                    </label>
                    <input
                      id="cpf_cnpj_titular_conta"
                      name="cpf_cnpj_titular_conta"
                      type="text"
                      value={formData.cpf_cnpj_titular_conta}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                      maxLength={18}
                      placeholder="CPF ou CNPJ"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Voltar
                  </button>
            <button
              type="submit"
              disabled={loading}
                    className="bg-[#0F172A] text-white px-6 py-2 rounded-md hover:bg-[#1E293B] transition-colors disabled:opacity-70"
            >
              {loading ? (
                      <span className="flex items-center">
                  <Spinner className="h-4 w-4 mr-2" />
                  Cadastrando...
                </span>
              ) : (
                      "Finalizar Cadastro"
              )}
            </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link href="/corretor/login" className="text-[#0F172A] hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
