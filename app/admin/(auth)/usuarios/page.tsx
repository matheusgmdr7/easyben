"use client"

import { useState, useEffect } from "react"
import usuariosAdminService from "@/services/usuarios-admin-service"
import type { UsuarioAdmin } from "@/services/usuarios-admin-service"
import { buscarTodosCorretores } from "@/services/corretores-service"
import type { Corretor } from "@/types/corretores"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { Users, Search, Plus, Edit, Trash2, Power, CheckCircle, XCircle, Shield, UserCheck, Building2, UserCog, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import ModalEditarUsuario from "@/components/admin/modals/modal-editar-usuario"
import UsuariosAdminService, { PERFIS_LABELS, PERMISSOES_LABELS, PERFIS_PERMISSOES, type Permissao } from "@/services/usuarios-admin-service"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

type TipoUsuario = "admin" | "analista" | "gestor" | "supervisor" | "todos"

interface UsuarioUnificado {
  id: string
  nome: string
  email: string
  tipo: TipoUsuario
  status: string
  criado_em?: string
  ultimo_acesso?: string
  dadosOriginais: UsuarioAdmin | Corretor
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioUnificado[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState<TipoUsuario>("todos")
  const [statusFiltro, setStatusFiltro] = useState<string>("todos")
  
  
  // Form dados para criar analista
  const [formDataAnalista, setFormDataAnalista] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: ""
  })
  const [mostrarFormAnalista, setMostrarFormAnalista] = useState(false)
  const [salvandoAnalista, setSalvandoAnalista] = useState(false)
  
  // Hook para overlay do modal
  useModalOverlay(mostrarFormAnalista)
  
  // Modal de gerenciar usuário
  const [showModalGerenciar, setShowModalGerenciar] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioUnificado | null>(null)
  const [formDataGerenciar, setFormDataGerenciar] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "assistente" as UsuarioAdmin["perfil"],
    permissoes: [] as Permissao[],
    ativo: true
  })
  const [salvandoGerenciar, setSalvandoGerenciar] = useState(false)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    try {
      setLoading(true)
      
      // Carregar usuários admin
      const usuariosAdmin = await usuariosAdminService.listar()
      
      // Carregar corretores (gestores e supervisores)
      const corretores = await buscarTodosCorretores()
      
      // Transformar em lista unificada
      const usuariosUnificados: UsuarioUnificado[] = []
      
      // Adicionar admins
      usuariosAdmin.forEach((usuario) => {
        let tipo: TipoUsuario = "admin"
        if (usuario.perfil === "assistente" || 
            (Array.isArray(usuario.permissoes) && 
             (usuario.permissoes.includes("propostas") || 
              usuario.permissoes.includes("em_analise") || 
              usuario.permissoes.includes("cadastrado")))) {
          tipo = "analista"
        }
        
        usuariosUnificados.push({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo,
          status: usuario.status || "ativo",
          criado_em: usuario.criado_em,
          ultimo_acesso: usuario.ultimo_acesso,
          dadosOriginais: usuario
        })
      })
      
      // Adicionar apenas gestores e supervisores (não corretores simples)
      corretores.forEach((corretor) => {
        // Filtrar apenas gestores e supervisores
        if (corretor.is_gestor || (corretor.gestor_id && corretor.acesso_portal_gestor)) {
          const tipo: TipoUsuario = corretor.is_gestor ? "gestor" : "supervisor"
          
          usuariosUnificados.push({
            id: corretor.id,
            nome: corretor.nome || "",
            email: corretor.email || "",
            tipo,
            status: corretor.status || "pendente",
            criado_em: corretor.created_at,
            ultimo_acesso: corretor.updated_at,
            dadosOriginais: corretor
          })
        }
      })
      
      setUsuarios(usuariosUnificados)
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
      toast.error("Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  async function criarAnalista() {
    if (!formDataAnalista.nome || !formDataAnalista.email || !formDataAnalista.senha) {
        toast.error("Preencha todos os campos obrigatórios")
      return
    }

    if (formDataAnalista.senha !== formDataAnalista.confirmarSenha) {
      toast.error("As senhas não coincidem")
      return
    }

    if (formDataAnalista.senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres")
      return
    }

    try {
      setSalvandoAnalista(true)

      // Verificar se o email já está cadastrado
      const { data: usuarioExistente } = await supabase
        .from("usuarios_admin")
        .select("*")
        .eq("email", formDataAnalista.email)
        .maybeSingle()

      if (usuarioExistente) {
        toast.error("Este email já está cadastrado")
        return
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formDataAnalista.email,
        password: formDataAnalista.senha,
        options: {
          data: {
            role: "analista",
            nome: formDataAnalista.nome,
          },
        },
      })

      if (authError) {
        console.error("Erro ao criar usuário no Auth:", authError)
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          // Tentar fazer login para obter o ID do usuário existente
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formDataAnalista.email,
            password: formDataAnalista.senha,
          })

          if (signInError) {
            toast.error("Este email já está cadastrado no sistema")
            return
          }

          // Usar o ID do usuário existente
          const authUserId = signInData.user.id
          
          // Criar registro na tabela usuarios_admin
          const tenantId = await getCurrentTenantId()
          const { error: adminError } = await supabase
            .from("usuarios_admin")
            .insert([
              {
                nome: formDataAnalista.nome.toUpperCase(),
                email: formDataAnalista.email,
                perfil: "assistente",
                permissoes: ["propostas", "em_analise", "cadastrado"],
                status: "ativo",
                ativo: true,
                auth_user_id: authUserId,
                tenant_id: tenantId,
              },
            ])

          if (adminError) {
            console.error("Erro ao criar analista:", adminError)
            toast.error("Erro ao criar analista")
            return
          }

          toast.success("Analista criado com sucesso!")
          setMostrarFormAnalista(false)
          setFormDataAnalista({ nome: "", email: "", senha: "", confirmarSenha: "" })
          carregarUsuarios()
          return
        } else {
          toast.error(`Erro ao criar conta: ${authError.message}`)
          return
        }
      }

      if (!authData.user) {
        toast.error("Erro ao criar usuário")
        return
      }

      // Criar registro na tabela usuarios_admin
      const tenantId = await getCurrentTenantId()
      const { error: adminError } = await supabase
        .from("usuarios_admin")
        .insert([
          {
            nome: formDataAnalista.nome.toUpperCase(),
            email: formDataAnalista.email,
            perfil: "assistente",
            permissoes: ["propostas", "em_analise", "cadastrado"],
            status: "ativo",
            ativo: true,
            auth_user_id: authData.user.id,
            tenant_id: tenantId,
          },
        ])

      if (adminError) {
        console.error("Erro ao criar analista:", adminError)
        toast.error("Erro ao criar analista")
        return
      }

      toast.success("Analista criado com sucesso!")
      setMostrarFormAnalista(false)
      setFormDataAnalista({ nome: "", email: "", senha: "", confirmarSenha: "" })
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao criar analista:", error)
      toast.error("Erro ao criar analista")
    } finally {
      setSalvandoAnalista(false)
    }
  }

  async function toggleStatusUsuario(usuario: UsuarioUnificado) {
    try {
      if (usuario.tipo === "admin" || usuario.tipo === "analista") {
        const dadosOriginais = usuario.dadosOriginais as UsuarioAdmin
        await usuariosAdminService.atualizar(usuario.id, {
          status: dadosOriginais.status === "ativo" ? "inativo" : "ativo"
        })
      } else {
        const dadosOriginais = usuario.dadosOriginais as Corretor
        const { error } = await supabase
          .from("corretores")
          .update({ ativo: !dadosOriginais.ativo })
          .eq("id", usuario.id)
        
        if (error) throw error
      }
      
      toast.success(`Usuário ${usuario.status === "ativo" ? "desativado" : "ativado"} com sucesso!`)
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      toast.error("Erro ao alterar status do usuário")
    }
  }

  function abrirModalGerenciar(usuario: UsuarioUnificado) {
    // Só pode gerenciar admins e analistas (que são usuarios_admin)
    if (usuario.tipo !== "admin" && usuario.tipo !== "analista") {
      toast.error("Apenas administradores e analistas podem ter permissões gerenciadas")
        return
      }

    const dadosOriginais = usuario.dadosOriginais as UsuarioAdmin
    const permissoesUsuario = Array.isArray(dadosOriginais.permissoes) ? dadosOriginais.permissoes : []
    
    setUsuarioSelecionado(usuario)
    setFormDataGerenciar({
      nome: dadosOriginais.nome,
      email: dadosOriginais.email,
      senha: "",
      perfil: dadosOriginais.perfil,
      permissoes: permissoesUsuario,
      ativo: dadosOriginais.ativo
    })
    setShowModalGerenciar(true)
  }

  async function salvarGerenciamento(data?: any) {
    if (!usuarioSelecionado) return

    try {
      setSalvandoGerenciar(true)
      
      // Usar dados do formDataGerenciar ou os dados passados
      const dadosParaSalvar = data || formDataGerenciar
      
      const permissoesParaSalvar = Array.isArray(dadosParaSalvar.permissoes)
        ? dadosParaSalvar.permissoes
        : PERFIS_PERMISSOES[dadosParaSalvar.perfil] || []
      
      const dados: any = {
        nome: dadosParaSalvar.nome,
        email: dadosParaSalvar.email,
        perfil: dadosParaSalvar.perfil,
        permissoes: permissoesParaSalvar,
        ativo: dadosParaSalvar.ativo
      }
      
      if (dadosParaSalvar.senha) {
        dados.senha = dadosParaSalvar.senha
      }
      
      await usuariosAdminService.atualizar(usuarioSelecionado.id, dados)
      toast.success("Usuário atualizado com sucesso!")
      setShowModalGerenciar(false)
      setUsuarioSelecionado(null)
      limparFormularioGerenciar()
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error)
      toast.error("Erro ao atualizar usuário")
    } finally {
      setSalvandoGerenciar(false)
    }
  }

  function limparFormularioGerenciar() {
    setFormDataGerenciar({
      nome: "",
      email: "",
      senha: "",
      perfil: "assistente",
      permissoes: [],
      ativo: true
    })
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const matchFiltro =
      usuario.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      usuario.email.toLowerCase().includes(filtro.toLowerCase())

    const matchTipo = tipoFiltro === "todos" || usuario.tipo === tipoFiltro
    const matchStatus = statusFiltro === "todos" || usuario.status === statusFiltro

    return matchFiltro && matchTipo && matchStatus
  })

  const formatarData = (data: string | undefined) => {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR")
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "ativo" ? "default" : "secondary"}>
        {status}
      </Badge>
    )
  }

  const getTipoBadge = (tipo: TipoUsuario) => {
    const badges = {
      admin: { bg: "bg-blue-100 text-blue-800", label: "Administrador" },
      analista: { bg: "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]", label: "Analista" },
      gestor: { bg: "bg-purple-100 text-purple-800", label: "Gestor" },
      supervisor: { bg: "bg-orange-100 text-orange-800", label: "Supervisor" },
    }
    const badge = badges[tipo] || badges.admin
    return (
      <Badge className={badge.bg}>
        {badge.label}
      </Badge>
    )
  }

  const totalUsuarios = usuarios.length
  const usuariosAtivos = usuarios.filter((u) => u.status === "ativo").length
  const usuariosPendentes = usuarios.filter((u) => u.status === "pendente").length

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Gerenciamento de Usuários</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie todos os usuários do sistema</p>
        </div>
          <div className="flex gap-2">
          <Button
              onClick={() => setMostrarFormAnalista(true)}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
          >
              <Plus className="h-4 w-4 mr-2" />
              Novo Analista
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{totalUsuarios}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Usuários cadastrados</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Ativos</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{usuariosAtivos}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Usuários ativos</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Pendentes</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{usuariosPendentes}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Aguardando aprovação</p>
          </div>
        </div>
      </div>

      {/* Legenda de Perfis */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-bold text-[#0F172A] mb-3 font-sans">Legenda de Perfis</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#0F172A]" />
            <span className="font-semibold text-[#0F172A]">Analista:</span>
            <span className="text-gray-600">Portal do analista</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#0F172A]" />
            <span className="font-semibold text-[#0F172A]">Gestor:</span>
            <span className="text-gray-600">Portal do admin sem Usuários</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-[#0F172A]" />
            <span className="font-semibold text-[#0F172A]">Supervisor:</span>
            <span className="text-gray-600">Portal do gestor de equipes</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#0F172A]" />
            <span className="font-semibold text-[#0F172A]">Master:</span>
            <span className="text-gray-600">Portal do admin e aos usuários</span>
          </div>
        </div>
              </div>
              
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10"
                />
              </div>
          <Select value={tipoFiltro} onValueChange={(value) => setTipoFiltro(value as TipoUsuario)}>
            <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="analista">Analistas</SelectItem>
              <SelectItem value="gestor">Gestores</SelectItem>
              <SelectItem value="supervisor">Supervisores</SelectItem>
                  </SelectContent>
                </Select>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

      {/* Modal Criar Analista */}
      {mostrarFormAnalista && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Novo Analista</h3>
                  <p className="text-white/80 text-sm">Cadastre um novo analista no sistema</p>
                </div>
                <Button
                  onClick={() => {
                    setMostrarFormAnalista(false)
                    setFormDataAnalista({ nome: "", email: "", senha: "", confirmarSenha: "" })
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formDataAnalista.nome}
                    onChange={(e) => setFormDataAnalista({ ...formDataAnalista, nome: e.target.value.toUpperCase() })}
                    className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                    placeholder="Nome completo do analista"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formDataAnalista.email}
                    onChange={(e) => setFormDataAnalista({ ...formDataAnalista, email: e.target.value })}
                    className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formDataAnalista.senha}
                    onChange={(e) => setFormDataAnalista({ ...formDataAnalista, senha: e.target.value })}
                    className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Confirmar Senha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formDataAnalista.confirmarSenha}
                    onChange={(e) => setFormDataAnalista({ ...formDataAnalista, confirmarSenha: e.target.value })}
                    className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                    placeholder="Confirme a senha"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  onClick={() => {
                    setMostrarFormAnalista(false)
                    setFormDataAnalista({ nome: "", email: "", senha: "", confirmarSenha: "" })
                  }}
                  variant="outline"
                  className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400"
                  disabled={salvandoAnalista}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={criarAnalista}
                  disabled={salvandoAnalista}
                  className="h-12 px-8 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#0f6b5c] text-white font-bold shadow-lg"
                >
                  {salvandoAnalista ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-corporate-small"></div>
                      Salvando...
                    </div>
                  ) : (
                    "Criar Analista"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
            <span className="ml-2 text-gray-600">Carregando usuários...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Cadastro
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuariosFiltrados.length > 0 ? (
                    usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">{usuario.nome}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{usuario.email}</td>
                        <td className="py-4 px-4 text-sm">{getTipoBadge(usuario.tipo)}</td>
                        <td className="py-4 px-4 text-sm">{getStatusBadge(usuario.status)}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatarData(usuario.criado_em)}
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {(usuario.tipo === "admin" || usuario.tipo === "analista") && (
                              <Button
                                onClick={() => abrirModalGerenciar(usuario)}
                                variant="ghost"
                                size="sm"
                                className="text-[#0F172A] hover:bg-[#0F172A]/10"
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Gerenciar
                              </Button>
                            )}
                            <Button
                              onClick={() => toggleStatusUsuario(usuario)}
                              variant="ghost"
                              size="sm"
                              className="text-[#0F172A] hover:bg-[#0F172A]/10"
                            >
                              <Power className="h-4 w-4 mr-1" />
                              {usuario.status === "ativo" ? "Desativar" : "Ativar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
          )}
          </div>

      {/* Modal Gerenciar Usuário */}
      {showModalGerenciar && usuarioSelecionado && (
      <ModalEditarUsuario
          isOpen={showModalGerenciar}
        onClose={() => {
            setShowModalGerenciar(false)
          setUsuarioSelecionado(null)
            limparFormularioGerenciar()
          }}
          onSave={salvarGerenciamento}
          saving={salvandoGerenciar}
          formData={formDataGerenciar}
          setFormData={setFormDataGerenciar}
          limparFormulario={limparFormularioGerenciar}
          usuarioOriginal={usuarioSelecionado.dadosOriginais as UsuarioAdmin}
        />
      )}
    </div>
  )
}
