"use client"

import { useState, useEffect } from "react"
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
  XCircle, 
  Users, 
  Search
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type React from "react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"
import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { toast } from "sonner"
import { buscarCorretores } from "@/services/corretores-service"
import type { Corretor } from "@/types/corretores"
import { Badge } from "@/components/ui/badge"

interface ModalGerenciarCorretoraProps {
  isOpen: boolean
  onClose: () => void
  corretora: Corretor | null
  onSave: () => Promise<void>
}

export default function ModalGerenciarCorretora({
  isOpen,
  onClose,
  corretora,
  onSave
}: ModalGerenciarCorretoraProps) {
  useModalOverlay(isOpen)
  const [loading, setLoading] = useState(false)
  const [supervisores, setSupervisores] = useState<Corretor[]>([])
  const [todosCorretores, setTodosCorretores] = useState<Corretor[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [corretorSelecionado, setCorretorSelecionado] = useState<string>("")
  const [loadingSupervisores, setLoadingSupervisores] = useState(true)
  const [mostrarFormularioNovo, setMostrarFormularioNovo] = useState(false)
  const [formDataNovo, setFormDataNovo] = useState({
    nome: "",
    email: "",
    cpf: "",
    whatsapp: "",
    senha: "",
    confirmarSenha: ""
  })

  useEffect(() => {
    if (isOpen && corretora) {
      carregarSupervisores()
      carregarTodosCorretores()
    }
  }, [isOpen, corretora])

  async function carregarSupervisores() {
    if (!corretora) return

    try {
      setLoadingSupervisores(true)
      const todosCorretores = await buscarCorretores()
      
      // Supervisores são corretores vinculados à corretora que têm acesso ao portal do gestor
      const supervisoresFiltrados = todosCorretores.filter(
        (corretor) => 
          corretor.gestor_id === corretora.id && 
          corretor.acesso_portal_gestor === true &&
          !corretor.is_gestor
      )
      
      setSupervisores(supervisoresFiltrados)
    } catch (error) {
      console.error("Erro ao carregar supervisores:", error)
      toast.error("Erro ao carregar supervisores")
    } finally {
      setLoadingSupervisores(false)
    }
  }

  async function carregarTodosCorretores() {
    try {
      const todosCorretores = await buscarCorretores()
      
      // Filtrar apenas corretores que não são gestores
      // Podem ser corretores sem gestor_id ou já vinculados a esta corretora
      const corretoresDisponiveis = todosCorretores.filter(
        (corretor) => 
          !corretor.is_gestor &&
          corretor.id !== corretora?.id
      )
      
      setTodosCorretores(corretoresDisponiveis)
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    }
  }

  async function adicionarSupervisor() {
    if (!corretorSelecionado || !corretora) {
      toast.error("Selecione um corretor")
      return
    }

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from("corretores")
        .update({
          gestor_id: corretora.id,
          acesso_portal_gestor: true
        })
        .eq("id", corretorSelecionado)

      if (error) {
        console.error("Erro ao adicionar supervisor:", error)
        toast.error("Erro ao adicionar supervisor")
        return
      }

      toast.success("Supervisor adicionado com sucesso!")
      setCorretorSelecionado("")
      await carregarSupervisores()
      await carregarTodosCorretores()
      await onSave()
    } catch (error) {
      console.error("Erro ao adicionar supervisor:", error)
      toast.error("Erro ao adicionar supervisor")
    } finally {
      setLoading(false)
    }
  }

  async function suspenderCorretora() {
    if (!corretora) return

    try {
      setLoading(true)
      
      const novoStatus = corretora.ativo ? false : true
      
      const { error } = await supabase
        .from("corretores")
        .update({ ativo: novoStatus })
        .eq("id", corretora.id)

      if (error) {
        console.error("Erro ao suspender corretora:", error)
        toast.error("Erro ao alterar status da corretora")
        return
      }

      toast.success(novoStatus ? "Corretora ativada com sucesso!" : "Corretora suspensa com sucesso!")
      await onSave()
      onClose()
    } catch (error) {
      console.error("Erro ao suspender corretora:", error)
      toast.error("Erro ao alterar status da corretora")
    } finally {
      setLoading(false)
    }
  }

  async function suspenderSupervisor(supervisorId: string, ativo: boolean) {
    try {
      setLoading(true)
      
      const novoStatus = !ativo
      
      const { error } = await supabase
        .from("corretores")
        .update({ 
          ativo: novoStatus,
          // Se suspender, remove acesso ao portal. Se ativar, restaura acesso
          acesso_portal_gestor: novoStatus ? true : false
        })
        .eq("id", supervisorId)

      if (error) {
        console.error("Erro ao suspender supervisor:", error)
        toast.error("Erro ao alterar status do supervisor")
        return
      }

      toast.success(novoStatus ? "Supervisor ativado com sucesso!" : "Supervisor suspenso com sucesso!")
      await carregarSupervisores()
      await onSave()
    } catch (error) {
      console.error("Erro ao suspender supervisor:", error)
      toast.error("Erro ao alterar status do supervisor")
    } finally {
      setLoading(false)
    }
  }

  async function removerSupervisor(supervisorId: string) {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from("corretores")
        .update({ 
          acesso_portal_gestor: false,
          gestor_id: null
        })
        .eq("id", supervisorId)

      if (error) {
        console.error("Erro ao remover supervisor:", error)
        toast.error("Erro ao remover supervisor")
        return
      }

      toast.success("Supervisor removido com sucesso!")
      await carregarSupervisores()
      await carregarTodosCorretores()
      await onSave()
    } catch (error) {
      console.error("Erro ao remover supervisor:", error)
      toast.error("Erro ao remover supervisor")
    } finally {
      setLoading(false)
    }
  }

  // Funções de formatação
  function formatarCPF(valor: string): string {
    const apenasNumeros = valor.replace(/\D/g, "")
    return apenasNumeros
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
  }

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

  async function cadastrarNovoSupervisor() {
    if (!corretora) return

    // Validações
    if (!formDataNovo.nome || !formDataNovo.email || !formDataNovo.cpf || !formDataNovo.whatsapp || !formDataNovo.senha || !formDataNovo.confirmarSenha) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    if (!validarCPF(formDataNovo.cpf)) {
      toast.error("CPF inválido")
      return
    }

    if (formDataNovo.senha !== formDataNovo.confirmarSenha) {
      toast.error("As senhas não coincidem")
      return
    }

    if (formDataNovo.senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres")
      return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formDataNovo.email)) {
      toast.error("Email inválido")
      return
    }

    try {
      setLoading(true)

      // Verificar se o email já está cadastrado
      const { data: corretorExistente } = await supabase
        .from("corretores")
        .select("*")
        .eq("email", formDataNovo.email)
        .maybeSingle()

      if (corretorExistente) {
        toast.error("Este email já está cadastrado")
        return
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formDataNovo.email,
        password: formDataNovo.senha,
        options: {
          data: {
            role: "corretor",
            nome: formDataNovo.nome,
          },
        },
      })

      if (authError) {
        console.error("Erro ao criar usuário no Auth:", authError)
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          toast.error("Este email já está cadastrado no sistema")
        } else {
          toast.error(`Erro ao criar conta: ${authError.message}`)
        }
        return
      }

      // Obter tenant_id
      const tenantId = await getCurrentTenantId()

      // Criar registro na tabela corretores como supervisor
      const { error: corretorError } = await supabase
        .from("corretores")
        .insert([
          {
            nome: formDataNovo.nome.toUpperCase(),
            email: formDataNovo.email,
            whatsapp: formDataNovo.whatsapp.replace(/\D/g, ""),
            cpf: formDataNovo.cpf.replace(/\D/g, ""),
            is_gestor: false,
            gestor_id: corretora.id,
            acesso_portal_gestor: true,
            status: "pendente",
            ativo: true,
            tenant_id: tenantId,
          },
        ])

      if (corretorError) {
        console.error("Erro ao criar supervisor:", corretorError)
        toast.error("Erro ao criar supervisor")
        return
      }

      // Fazer logout após criar (o admin não precisa estar logado como o supervisor)
      await supabase.auth.signOut()

      toast.success("Supervisor cadastrado com sucesso!")
      setFormDataNovo({
        nome: "",
        email: "",
        cpf: "",
        whatsapp: "",
        senha: "",
        confirmarSenha: ""
      })
      setMostrarFormularioNovo(false)
      await carregarSupervisores()
      await carregarTodosCorretores()
      await onSave()
    } catch (error) {
      console.error("Erro ao cadastrar supervisor:", error)
      toast.error("Erro ao cadastrar supervisor")
    } finally {
      setLoading(false)
    }
  }

  const corretoresDisponiveis = todosCorretores.filter(
    (corretor) =>
      !supervisores.some((s) => s.id === corretor.id) &&
      (corretor.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        corretor.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isOpen || !corretora) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      {/* Backdrop com blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-[100]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                Gerenciar Corretora: {corretora.nome?.toUpperCase()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status da Corretora */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Status da Corretora</h3>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={corretora.ativo ? "default" : "secondary"}
                    className={
                      corretora.ativo
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {corretora.ativo ? "Ativa" : "Suspensa"}
                  </Badge>
                  <Button
                    onClick={suspenderCorretora}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900 border-gray-300"
                  >
                    {corretora.ativo ? "Suspender" : "Ativar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Adicionar Supervisor */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Adicionar Supervisor</h3>
            <Tabs defaultValue="selecionar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="selecionar">Selecionar Existente</TabsTrigger>
                <TabsTrigger value="novo">Novo Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="selecionar" className="space-y-4 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar corretor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={corretorSelecionado} onValueChange={setCorretorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um corretor para adicionar como supervisor" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {corretoresDisponiveis.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        {searchTerm ? "Nenhum corretor encontrado" : "Nenhum corretor disponível"}
                      </div>
                    ) : (
                      corretoresDisponiveis.map((corretor) => (
                        <SelectItem key={corretor.id} value={corretor.id}>
                          {corretor.nome?.toUpperCase()} - {corretor.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={adicionarSupervisor}
                  disabled={loading || !corretorSelecionado}
                  className="w-full bg-[#0F172A] hover:bg-[#1E293B]"
                >
                  Adicionar Supervisor
                </Button>
              </TabsContent>

              <TabsContent value="novo" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formDataNovo.nome}
                      onChange={(e) => setFormDataNovo({ ...formDataNovo, nome: e.target.value.toUpperCase() })}
                      placeholder="Digite o nome completo"
                      className="w-full uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formDataNovo.email}
                      onChange={(e) => setFormDataNovo({ ...formDataNovo, email: e.target.value })}
                      placeholder="exemplo@email.com"
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        CPF <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formDataNovo.cpf}
                        onChange={(e) => {
                          const valor = formatarCPF(e.target.value)
                          setFormDataNovo({ ...formDataNovo, cpf: valor })
                        }}
                        maxLength={14}
                        placeholder="000.000.000-00"
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        value={formDataNovo.whatsapp}
                        onChange={(e) => {
                          const valor = formatarTelefone(e.target.value)
                          setFormDataNovo({ ...formDataNovo, whatsapp: valor })
                        }}
                        placeholder="(00) 00000-0000"
                        className="w-full"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Senha <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="password"
                        value={formDataNovo.senha}
                        onChange={(e) => setFormDataNovo({ ...formDataNovo, senha: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full"
                        minLength={6}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Confirmar Senha <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="password"
                        value={formDataNovo.confirmarSenha}
                        onChange={(e) => setFormDataNovo({ ...formDataNovo, confirmarSenha: e.target.value })}
                        placeholder="Confirme a senha"
                        className="w-full"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    onClick={cadastrarNovoSupervisor}
                    disabled={loading}
                    className="w-full bg-[#0F172A] hover:bg-[#1E293B]"
                  >
                    Cadastrar Supervisor
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Lista de Supervisores */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Supervisores ({supervisores.length})
            </h3>
            {loadingSupervisores ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : supervisores.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum supervisor cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supervisores.map((supervisor) => (
                  <div
                    key={supervisor.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-gray-900">{supervisor.nome?.toUpperCase()}</p>
                        <Badge
                          variant={supervisor.ativo ? "default" : "secondary"}
                          className={
                            supervisor.ativo
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {supervisor.ativo ? "Ativo" : "Suspenso"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{supervisor.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => suspenderSupervisor(supervisor.id, supervisor.ativo)}
                        disabled={loading}
                        className="text-gray-600 hover:text-gray-900 border-gray-300"
                      >
                        {supervisor.ativo ? "Suspender" : "Ativar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removerSupervisor(supervisor.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 border-red-300"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

