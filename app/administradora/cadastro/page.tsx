"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Spinner } from "@/components/ui/spinner"
import { Eye, EyeOff, Mail, MapPin, FileText, User, Building } from "lucide-react"

export default function CadastroAdministradora() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  // Logo será carregada da configuração do sistema/tenant (configurada no painel EasyBen)
  const [logoUrl] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    // Step 1: Dados da Empresa
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    // Step 2: Contato
    email: "",
    email_login: "",
    telefone: "",
    telefone_contato: "",
    whatsapp: "",
    site: "",
    // Step 3: Endereço
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    // Step 4: Representante Legal
    representante_legal_nome: "",
    representante_legal_cpf: "",
    representante_legal_cargo: "",
    representante_legal_email: "",
    representante_legal_telefone: "",
    // Step 5: Credenciais
    senha: "",
    confirmarSenha: "",
    // Observações
    observacoes: "",
  })

  // Funções de formatação
  const formatarCNPJ = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "")
    if (apenasNumeros.length <= 2) return apenasNumeros
    if (apenasNumeros.length <= 5) return `${apenasNumeros.slice(0, 2)}.${apenasNumeros.slice(2)}`
    if (apenasNumeros.length <= 8) return `${apenasNumeros.slice(0, 2)}.${apenasNumeros.slice(2, 5)}.${apenasNumeros.slice(5)}`
    if (apenasNumeros.length <= 12) return `${apenasNumeros.slice(0, 2)}.${apenasNumeros.slice(2, 5)}.${apenasNumeros.slice(5, 8)}/${apenasNumeros.slice(8)}`
    return `${apenasNumeros.slice(0, 2)}.${apenasNumeros.slice(2, 5)}.${apenasNumeros.slice(5, 8)}/${apenasNumeros.slice(8, 12)}-${apenasNumeros.slice(12, 14)}`
  }

  const formatarCPF = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "")
    if (apenasNumeros.length <= 3) return apenasNumeros
    if (apenasNumeros.length <= 6) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`
    if (apenasNumeros.length <= 9) return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9, 11)}`
  }

  const formatarTelefone = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "")
    const numerosLimitados = apenasNumeros.slice(0, 11)
    if (numerosLimitados.length <= 2) return numerosLimitados
    if (numerosLimitados.length <= 7) return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados.slice(2)}`
    return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados.slice(2, 7)}-${numerosLimitados.slice(7, 11)}`
  }

  const formatarCEP = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 8)
    if (apenasNumeros.length <= 5) return apenasNumeros
    return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.razao_social || !formData.nome_fantasia || !formData.cnpj) {
        setErro("Preencha todos os campos obrigatórios: Razão Social, Nome Fantasia e CNPJ")
        return
      }
      setErro("")
      setStep(2)
    } else if (step === 2) {
      if (!formData.email || !formData.email_login) {
        setErro("Preencha pelo menos o Email e Email para Login")
        return
      }
      setErro("")
      setStep(3)
    } else if (step === 3) {
      if (!formData.cep || !formData.endereco || !formData.numero || !formData.bairro || !formData.cidade || !formData.estado) {
        setErro("Preencha todos os campos obrigatórios do endereço")
        return
      }
      setErro("")
      setStep(4)
    } else if (step === 4) {
      if (!formData.representante_legal_nome || !formData.representante_legal_cpf) {
        setErro("Preencha pelo menos o Nome e CPF do Representante Legal")
        return
      }
      setErro("")
      setStep(5)
    } else if (step === 5) {
      if (!formData.senha || !formData.confirmarSenha) {
        setErro("Preencha a senha e confirmação")
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
      // Submeter formulário
      handleSubmit()
    }
  }

  const prevStep = () => {
    setStep(step - 1)
    setErro("")
  }

  const handleSubmit = async () => {
    setErro("")
    setLoading(true)

    try {
      // Preparar dados para inserção (senha será hasheada na API)
      const dadosAdministradora = {
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia,
        nome: formData.nome_fantasia, // Para compatibilidade
        cnpj: formData.cnpj.replace(/\D/g, ""),
        email: formData.email || null,
        email_login: formData.email_login,
        telefone: formData.telefone || null,
        telefone_contato: formData.telefone_contato || null,
        whatsapp: formData.whatsapp || null,
        site: formData.site || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep.replace(/\D/g, "") || null,
        representante_legal_nome: formData.representante_legal_nome || null,
        representante_legal_cpf: formData.representante_legal_cpf.replace(/\D/g, "") || null,
        representante_legal_cargo: formData.representante_legal_cargo || null,
        representante_legal_email: formData.representante_legal_email || null,
        representante_legal_telefone: formData.representante_legal_telefone || null,
        senha: formData.senha, // Senha será hasheada na API
        status: "ativa",
        status_login: "pendente", // Aguardando aprovação do admin
        observacoes: formData.observacoes || null,
      }

      // Inserir via API route (será criada)
      const response = await fetch("/api/administradora/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosAdministradora),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Erro ao cadastrar administradora")
      }

      // Sucesso - redirecionar para página de aguardando aprovação
      router.push("/administradora/aguardando-aprovacao")
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error)
      setErro(error.message || "Erro ao cadastrar administradora. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: "Dados da Empresa", icon: Building },
    { number: 2, title: "Contato", icon: Mail },
    { number: 3, title: "Endereço", icon: MapPin },
    { number: 4, title: "Representante Legal", icon: User },
    { number: 5, title: "Credenciais", icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Cadastro de Administradora</h1>
          </div>
          <p className="text-gray-600">Preencha os dados da sua empresa para criar sua conta</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((stepItem, index) => (
              <div key={stepItem.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= stepItem.number
                        ? "bg-[#0F172A] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > stepItem.number ? (
                      <span className="text-white">✓</span>
                    ) : (
                      <stepItem.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2 text-center hidden sm:block">{stepItem.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      step > stepItem.number ? "bg-[#0F172A]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {erro}
            </div>
          )}

          {/* Step 1: Dados da Empresa */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Dados da Empresa</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="razao_social"
                  value={formData.razao_social}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Fantasia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "")
                    if (valor.length <= 14) {
                      setFormData({ ...formData, cnpj: formatarCNPJ(valor) })
                    }
                  }}
                  maxLength={18}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

            </div>
          )}

          {/* Step 2: Contato */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Dados de Contato</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email para Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email_login"
                  value={formData.email_login}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="Será usado para fazer login no sistema"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "")
                      if (valor.length <= 11) {
                        setFormData({ ...formData, telefone: formatarTelefone(valor) })
                      }
                    }}
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "")
                      if (valor.length <= 11) {
                        setFormData({ ...formData, whatsapp: formatarTelefone(valor) })
                      }
                    }}
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site
                </label>
                <input
                  type="url"
                  name="site"
                  value={formData.site}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="https://www.exemplo.com.br"
                />
              </div>
            </div>
          )}

          {/* Step 3: Endereço */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Endereço</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "")
                    if (valor.length <= 8) {
                      setFormData({ ...formData, cep: formatarCEP(valor) })
                    }
                  }}
                  maxLength={9}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="00000-000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Representante Legal */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Representante Legal</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="representante_legal_nome"
                  value={formData.representante_legal_nome}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="representante_legal_cpf"
                  value={formData.representante_legal_cpf}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "")
                    if (valor.length <= 11) {
                      setFormData({ ...formData, representante_legal_cpf: formatarCPF(valor) })
                    }
                  }}
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  name="representante_legal_cargo"
                  value={formData.representante_legal_cargo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="Ex: Diretor, Gerente, etc"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="representante_legal_email"
                    value={formData.representante_legal_email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="representante_legal_telefone"
                    value={formData.representante_legal_telefone}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "")
                      if (valor.length <= 11) {
                        setFormData({ ...formData, representante_legal_telefone: formatarTelefone(valor) })
                      }
                    }}
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Credenciais */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Credenciais de Acesso</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={mostrarConfirmarSenha ? "text" : "password"}
                    name="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  placeholder="Informações adicionais sobre a administradora"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={loading}
              className="px-4 py-2 bg-[#0F172A] text-white rounded hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Cadastrando...</span>
                </>
              ) : step === 5 ? (
                "Finalizar Cadastro"
              ) : (
                "Próximo"
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{" "}
            <Link href="/administradora/login" className="text-[#0F172A] hover:underline font-medium">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

