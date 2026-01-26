"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Users, 
  XCircle, 
  Mail, 
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Eye,
  EyeOff
} from "lucide-react"
import type React from "react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"
import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { toast } from "sonner"

interface ModalNovaCorretoraProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => Promise<void>
}

const ESTADOS = [
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

const TIPOS_CHAVE_PIX = [
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "Email", label: "E-mail" },
  { value: "Telefone", label: "Telefone" },
  { value: "Chave Aleatória", label: "Chave Aleatória (EVP)" },
]

const TIPOS_CONTA = [
  { value: "Corrente", label: "Conta Corrente" },
  { value: "Poupanca", label: "Conta Poupança" },
]

// Função para formatar CPF
function formatarCPF(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, "")
  return apenasNumeros
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
}

// Função para formatar CNPJ
function formatarCNPJ(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, "")
  return apenasNumeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

// Função para formatar telefone
function formatarTelefone(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, "")
  if (apenasNumeros.length <= 10) {
    return apenasNumeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  } else {
    return apenasNumeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }
}

export default function ModalNovaCorretora({
  isOpen,
  onClose,
  onSave
}: ModalNovaCorretoraProps) {
  useModalOverlay(isOpen)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [cidades, setCidades] = useState<string[]>([])
  const [carregandoCidades, setCarregandoCidades] = useState(false)

  const [formData, setFormData] = useState({
    // Step 1: Informações Pessoais
    nome: "", // Nome Completo do Gestor
    cpf: "",
    data_nascimento: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    whatsapp: "",
    estado: "",
    cidade: "",
    // Step 2: Dados Empresariais
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    // Step 3: Dados Financeiros
    chave_pix: "",
    tipo_chave_pix: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "",
    nome_titular_conta: "",
    cpf_cnpj_titular_conta: "",
  })

  if (!isOpen) return null

  // Buscar cidades do IBGE baseado no UF
  const buscarCidades = async (uf: string) => {
    if (!uf || uf.length !== 2) {
      setCidades([])
      return
    }

    try {
      setCarregandoCidades(true)
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      const data = await response.json()
      
      if (Array.isArray(data)) {
        const nomesCidades = data.map((municipio: any) => municipio.nome).sort()
        setCidades(nomesCidades)
      } else {
        setCidades([])
      }
    } catch (error) {
      console.error("Erro ao buscar cidades:", error)
      setCidades([])
    } finally {
      setCarregandoCidades(false)
    }
  }

  // Validar CPF
  function validarCPF(cpf: string) {
    cpf = cpf.replace(/\D/g, "")
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let soma = 0
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let digito = 11 - (soma % 11)
    if (digito >= 10) digito = 0
    if (digito !== parseInt(cpf.charAt(9))) return false
    soma = 0
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i)
    }
    digito = 11 - (soma % 11)
    if (digito >= 10) digito = 0
    return digito === parseInt(cpf.charAt(10))
  }

  // Validar CNPJ
  function validarCNPJ(cnpj: string) {
    cnpj = cnpj.replace(/\D/g, "")
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
    let tamanho = cnpj.length - 2
    let numeros = cnpj.substring(0, tamanho)
    let digitos = cnpj.substring(tamanho)
    let soma = 0
    let pos = tamanho - 7
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--
      if (pos < 2) pos = 9
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
    if (resultado !== parseInt(digitos.charAt(0))) return false
    tamanho = tamanho + 1
    numeros = cnpj.substring(0, tamanho)
    soma = 0
    pos = tamanho - 7
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--
      if (pos < 2) pos = 9
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
    return resultado === parseInt(digitos.charAt(1))
  }

  const handleClose = () => {
    setStep(1)
    setErro("")
    setFormData({
      nome: "",
      cpf: "",
      data_nascimento: "",
      email: "",
      senha: "",
      confirmarSenha: "",
      whatsapp: "",
      estado: "",
      cidade: "",
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      chave_pix: "",
      tipo_chave_pix: "",
      banco: "",
      agencia: "",
      conta: "",
      tipo_conta: "",
      nome_titular_conta: "",
      cpf_cnpj_titular_conta: "",
    })
    setCidades([])
    onClose()
  }

  const nextStep = () => {
    setErro("")
    if (step === 1) {
      // Validações Step 1: Informações Pessoais
      if (!formData.nome || !formData.cpf || !formData.data_nascimento || !formData.email || !formData.senha || !formData.confirmarSenha || !formData.whatsapp || !formData.estado || !formData.cidade) {
        setErro("Preencha todos os campos obrigatórios")
        return
      }
      if (!validarCPF(formData.cpf)) {
        setErro("CPF inválido")
        return
      }
      if (formData.senha !== formData.confirmarSenha) {
        setErro("As senhas não coincidem")
        return
      }
      if (formData.senha.length < 6) {
        setErro("A senha deve ter no mínimo 6 caracteres")
        return
      }
      setStep(2)
    } else if (step === 2) {
      // Validações Step 2: Dados Empresariais
      if (!formData.razao_social || !formData.nome_fantasia || !formData.cnpj) {
        setErro("Preencha todos os campos obrigatórios")
        return
      }
      if (!validarCNPJ(formData.cnpj)) {
        setErro("CNPJ inválido")
        return
      }
      setStep(3)
    }
  }

  const prevStep = () => {
    setErro("")
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      setErro("")

      console.log("🚀 Iniciando cadastro de corretora...")
      console.log("📋 Dados do formulário completo:", formData)

      // Validações finais
      if (!formData.nome || !formData.cpf || !formData.data_nascimento || !formData.email || !formData.senha || !formData.confirmarSenha || !formData.whatsapp || !formData.estado || !formData.cidade) {
        setErro("Preencha todos os campos obrigatórios das Informações Pessoais")
        setSaving(false)
        return
      }

      if (!formData.razao_social || !formData.nome_fantasia || !formData.cnpj) {
        setErro("Preencha todos os campos obrigatórios dos Dados Empresariais")
        setSaving(false)
        return
      }

      if (formData.senha !== formData.confirmarSenha) {
        setErro("As senhas não coincidem")
        setSaving(false)
        return
      }

      // Validar senha (mínimo 6 caracteres para Supabase)
      if (!formData.senha || formData.senha.length < 6) {
        setErro("A senha deve ter no mínimo 6 caracteres")
        setSaving(false)
        return
      }

      // Validar CPF
      if (!validarCPF(formData.cpf)) {
        setErro("CPF inválido")
        setSaving(false)
        return
      }

      // Validar CNPJ
      if (!validarCNPJ(formData.cnpj)) {
        setErro("CNPJ inválido")
        setSaving(false)
        return
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setErro("Email inválido")
        setSaving(false)
        return
      }

      // Verificar se o email já está cadastrado
      console.log("🔍 Verificando email duplicado:", formData.email)
      const tenantId = await getCurrentTenantId()
      console.log("✅ Tenant ID obtido:", tenantId)
      
      const { data: corretorExistente, error: checkError } = await supabase
        .from("corretores")
        .select("*")
        .eq("email", formData.email)
        .eq("tenant_id", tenantId)
        .maybeSingle()

      // Se houver erro e não for "PGRST116" (nenhum resultado), tratar como erro
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("❌ Erro ao verificar email:", checkError)
        setErro("Erro ao verificar email. Tente novamente.")
        setSaving(false)
        return
      }

      if (corretorExistente) {
        console.log("⚠️ Email já cadastrado:", formData.email)
        setErro("Este email já está cadastrado")
        setSaving(false)
        return
      }

      console.log("✅ Email disponível, prosseguindo com cadastro...")

      // Criar usuário no Supabase Auth (ou verificar se já existe)
      let authUserId: string | null = null
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            role: "gestor",
            nome: formData.nome,
          },
        },
      })

      if (authError) {
        console.warn("⚠️ Erro ao criar usuário no Auth:", authError)
        
        // Se o usuário já está registrado, tentar buscar o ID do usuário existente
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          console.log("ℹ️ Usuário já existe no Auth, buscando ID...")
          
          // Tentar fazer login para obter o ID do usuário
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.senha,
          })
          
          if (signInError) {
            console.error("❌ Não foi possível autenticar usuário existente:", signInError)
            setErro("Este email já está cadastrado no sistema, mas a senha informada está incorreta. Use a senha correta ou escolha outro email.")
            setSaving(false)
            return
          }
          
          authUserId = signInData?.user?.id || null
          console.log("✅ ID do usuário existente obtido:", authUserId)
          
          // Fazer logout após obter o ID
          await supabase.auth.signOut()
        } else if (authError.message.includes("password")) {
          setErro("A senha não atende aos requisitos mínimos")
          setSaving(false)
          return
        } else if (authError.message.includes("email")) {
          setErro("Email inválido")
          setSaving(false)
          return
        } else {
          setErro(`Erro ao criar conta: ${authError.message}`)
          setSaving(false)
          return
        }
      } else {
        // Usuário criado com sucesso
        authUserId = authData?.user?.id || null
        console.log("✅ Usuário criado no Auth com ID:", authUserId)
        
        // Fazer logout após criar (o admin não precisa estar logado como o gestor)
        await supabase.auth.signOut()
      }

      // Criar registro na tabela corretores como gestor
      console.log("💾 Criando registro na tabela corretores...")
      console.log("📋 Dados do formulário:", {
        nome: formData.nome,
        email: formData.email,
        cpf: formData.cpf,
        cnpj: formData.cnpj,
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia,
        tenant_id: tenantId
      })

      const dadosCorretor = {
        nome: formData.nome,
        email: formData.email,
        whatsapp: formData.whatsapp.replace(/\D/g, ""),
        estado: formData.estado,
        cidade: formData.cidade,
        cpf: formData.cpf ? formData.cpf.replace(/\D/g, "") : null,
        cnpj: formData.cnpj ? formData.cnpj.replace(/\D/g, "") : null,
        data_nascimento: formData.data_nascimento || null,
        // Dados empresariais
        razao_social: formData.razao_social || null,
        nome_fantasia: formData.nome_fantasia || null,
        // Dados financeiros
        chave_pix: formData.chave_pix || null,
        tipo_chave_pix: formData.tipo_chave_pix || null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        tipo_conta: formData.tipo_conta || null,
        nome_titular_conta: formData.nome_titular_conta ? formData.nome_titular_conta.toUpperCase() : null,
        cpf_cnpj_titular_conta: formData.cpf_cnpj_titular_conta ? formData.cpf_cnpj_titular_conta.replace(/\D/g, "") : null,
        // Marcar como gestor
        is_gestor: true,
        status: "pendente",
        ativo: true,
        acesso_portal_gestor: false, // Inicia sem acesso
        tenant_id: tenantId,
      }

      const { error: gestorError } = await supabase
        .from("corretores")
        .insert([dadosCorretor])

      if (gestorError) {
        console.error("❌ Erro ao criar gestor:", gestorError)
        console.error("📋 Dados que causaram erro:", dadosCorretor)
        console.error("📋 Código do erro:", gestorError.code)
        console.error("📋 Detalhes do erro:", gestorError.details)
        console.error("📋 Hint do erro:", gestorError.hint)
        
        // Mensagem de erro mais detalhada
        let mensagemErro = `Erro ao criar gestor: ${gestorError.message}`
        
        // Adicionar informações específicas baseadas no código do erro
        if (gestorError.code === '42703') {
          mensagemErro = `Erro: Coluna não encontrada na tabela. Verifique se todas as colunas necessárias existem no banco de dados. Detalhes: ${gestorError.message}`
        } else if (gestorError.code === '23502') {
          mensagemErro = `Erro: Campo obrigatório não preenchido. Verifique se todos os campos obrigatórios foram preenchidos. Detalhes: ${gestorError.message}`
        } else if (gestorError.code === '23505') {
          mensagemErro = `Erro: Já existe um registro com estes dados. Verifique se o email ou CPF já está cadastrado.`
        } else if (gestorError.hint) {
          mensagemErro += ` Dica: ${gestorError.hint}`
        }
        
        setErro(mensagemErro)
        setSaving(false)
        return
      }

      console.log("✅ Corretor criado com sucesso!")

      toast.success("Corretora cadastrada com sucesso! Aguardando autorização para acesso ao portal.")
      await onSave()
      handleClose()
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error)
      setErro("Ocorreu um erro ao cadastrar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Nova Corretora (Gestor)</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Indicador de progresso */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}>
                1
              </div>
              <span className="text-sm">Informações Pessoais</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}>
                2
              </div>
              <span className="text-sm">Dados Empresariais</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 3 ? "text-[#0F172A] font-medium" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-[#0F172A] text-white" : "bg-gray-200"}`}>
                3
              </div>
              <span className="text-sm">Dados Financeiros</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 h-1 rounded-full">
            <div
              className="bg-[#0F172A] h-1 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {erro}
            </div>
          )}

          {/* Step 1: Informações Pessoais */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Informações Pessoais</h3>
              
              {/* 1. Nome Completo do Gestor */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nome Completo do Gestor <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                  placeholder="Digite o nome completo do gestor"
                  className="w-full uppercase"
                  required
                />
              </div>

              {/* 2. CPF */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  CPF <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => {
                    const valor = formatarCPF(e.target.value)
                    setFormData({ ...formData, cpf: valor })
                  }}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className="w-full"
                  required
                />
              </div>

              {/* 3. Data de Nascimento */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Data de Nascimento <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* 4. Email */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemplo@email.com"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>

              {/* 5. Senha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={mostrarSenha ? "text" : "password"}
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {/* 6. Confirmar Senha */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Confirmar Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      value={formData.confirmarSenha}
                      onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                      placeholder="Confirme a senha digitada"
                      className="w-full pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 7. WhatsApp */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const valor = formatarTelefone(e.target.value)
                      setFormData({ ...formData, whatsapp: valor })
                    }}
                    placeholder="(00) 00000-0000"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>

              {/* 8. Estado e 9. Cidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => {
                      setFormData({ ...formData, estado: value, cidade: "" })
                      buscarCidades(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((estado) => (
                        <SelectItem key={estado.sigla} value={estado.sigla}>
                          {estado.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  {formData.estado ? (
                    <Select
                      value={formData.cidade}
                      onValueChange={(value) => setFormData({ ...formData, cidade: value })}
                      disabled={carregandoCidades}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={carregandoCidades ? "Carregando..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {carregandoCidades ? (
                          <div className="p-2 text-sm text-gray-500">Carregando cidades...</div>
                        ) : cidades.length > 0 ? (
                          cidades.map((cidade) => (
                            <SelectItem key={cidade} value={cidade}>
                              {cidade}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">Selecione um estado primeiro</div>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      placeholder="Selecione o estado primeiro"
                      disabled
                      className="w-full"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dados Empresariais */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Empresariais</h3>
              
              {/* 1. Razão Social */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value.toUpperCase() })}
                  placeholder="Digite a razão social"
                  className="w-full uppercase"
                  required
                />
              </div>

              {/* 2. Nome Fantasia */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nome Fantasia <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value.toUpperCase() })}
                  placeholder="Digite o nome fantasia"
                  className="w-full uppercase"
                  required
                />
              </div>

              {/* 3. CNPJ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  CNPJ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const valor = formatarCNPJ(e.target.value)
                      setFormData({ ...formData, cnpj: valor })
                    }}
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Dados Financeiros */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Financeiros</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Preencha pelo menos uma forma de recebimento (PIX ou Dados Bancários)
                </p>
              </div>

              {/* Seção PIX */}
              <div className="border-b pb-4 mb-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Chave PIX
                </h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo de Chave PIX
                  </label>
                  <Select
                    value={formData.tipo_chave_pix}
                    onValueChange={(value) => setFormData({ ...formData, tipo_chave_pix: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CHAVE_PIX.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Chave PIX
                  </label>
                    <Input
                      type="text"
                      value={formData.chave_pix}
                      onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                      placeholder="Digite a chave PIX conforme o tipo selecionado"
                      className="w-full"
                    />
                </div>
              </div>

              {/* Seção Dados Bancários */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados Bancários
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Banco
                    </label>
                    <Input
                      type="text"
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      placeholder="Nome do banco (ex: Banco do Brasil, Itaú, etc.)"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Agência
                    </label>
                    <Input
                      type="text"
                      value={formData.agencia}
                      onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                      placeholder="Número da agência"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Conta
                    </label>
                    <Input
                      type="text"
                      value={formData.conta}
                      onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                      placeholder="Número da conta"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Tipo de Conta
                    </label>
                    <Select
                      value={formData.tipo_conta}
                      onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CONTA.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nome do Titular da Conta
                  </label>
                  <Input
                    type="text"
                    value={formData.nome_titular_conta}
                    onChange={(e) => setFormData({ ...formData, nome_titular_conta: e.target.value.toUpperCase() })}
                    placeholder="Nome completo do titular da conta"
                    className="w-full uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    CPF/CNPJ do Titular da Conta
                  </label>
                  <Input
                    type="text"
                    value={formData.cpf_cnpj_titular_conta}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "")
                      const formatado = valor.length <= 11 
                        ? formatarCPF(e.target.value)
                        : formatarCNPJ(e.target.value)
                      setFormData({ ...formData, cpf_cnpj_titular_conta: formatado })
                    }}
                    maxLength={18}
                    placeholder="CPF ou CNPJ"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between">
            {step > 1 && (
              <Button
                onClick={prevStep}
                variant="outline"
                disabled={saving}
                className="border-gray-300"
              >
                Voltar
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={saving}
                className="border-gray-300"
              >
                Cancelar
              </Button>
              {step < 3 ? (
                <Button
                  onClick={nextStep}
                  disabled={saving}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                >
                  {saving ? "Salvando..." : "Finalizar Cadastro"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

