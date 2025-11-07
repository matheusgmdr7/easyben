"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ModalCriarUsuario from "@/components/admin/modals/modal-criar-usuario"
import ModalEditarUsuario from "@/components/admin/modals/modal-editar-usuario"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Users as UsersIcon,
  Shield,
  Mail,
  Calendar,
  Power,
} from "lucide-react"
import { toast } from "sonner"
import UsuariosAdminService, {
  type UsuarioAdmin,
  type CriarUsuarioData,
  type AtualizarUsuarioData,
  type Permissao,
  PERFIS_LABELS,
  PERMISSOES_LABELS,
  PERFIS_PERMISSOES,
} from "@/services/usuarios-admin-service"

interface FormUsuarioData {
  nome: string
  email: string
  senha: string
  perfil: string
  permissoes: Permissao[]
  ativo: boolean
}

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroPerfil, setFiltroPerfil] = useState("todos")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  
  // Modal estados
  const [showModalCriar, setShowModalCriar] = useState(false)
  const [showModalEditar, setShowModalEditar] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioAdmin | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form dados
  const [formData, setFormData] = useState<FormUsuarioData>({
    nome: "",
    email: "",
    senha: "",
    perfil: "atendimento",
    permissoes: [],
    ativo: true,
  })
  
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<Permissao[]>([])
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarPermissoesCriar, setMostrarPermissoesCriar] = useState(false)
  const [mostrarPermissoesEditar, setMostrarPermissoesEditar] = useState(false)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      console.log("🔄 Carregando usuários...")
      const data = await UsuariosAdminService.listar()
      console.log("✅ Usuários carregados:", data?.length || 0)
      setUsuarios(data || [])
    } catch (error: any) {
      console.error("❌ Erro ao carregar usuários:", error)
      console.error("Erro detalhado:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      })
      toast.error(`Erro ao carregar usuários: ${error?.message || "Erro desconhecido"}`)
      setUsuarios([]) // Garantir que sempre temos um array
    } finally {
      setLoading(false)
    }
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const matchNome = usuario.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
                      usuario.email.toLowerCase().includes(filtroNome.toLowerCase())
    const matchPerfil = filtroPerfil === "todos" || usuario.perfil === filtroPerfil
    const matchStatus = filtroStatus === "todos" || usuario.status === filtroStatus
    
    return matchNome && matchPerfil && matchStatus
  })

  const handleCriar = async () => {
    try {
    if (!formData.nome || !formData.email || !formData.senha) {
        toast.error("Preencha todos os campos obrigatórios")
      return
    }

      setSaving(true)
      
      // Usar permissões selecionadas se houver, senão usar do perfil
      const dados: CriarUsuarioData = {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        perfil: formData.perfil as any,
        permissoes: permissoesSelecionadas.length > 0 ? permissoesSelecionadas : formData.permissoes
      }
      
      await UsuariosAdminService.criar(dados)
      toast.success("Usuário criado com sucesso!")
      setShowModalCriar(false)
      limparFormulario()
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao criar usuário:", error)
      toast.error("Erro ao criar usuário")
    } finally {
      setSaving(false)
    }
  }

  const handleAtualizar = async () => {
    try {
      if (!usuarioSelecionado) return

      setSaving(true)
      
      // IMPORTANTE: Sempre usar formData.permissoes (mesmo que vazio) para garantir que as mudanças sejam salvas
      // Se formData.permissoes é um array válido (mesmo que vazio), usar ele
      // Isso permite salvar um array vazio quando o usuário desmarca todas as permissões
      const permissoesParaSalvar = Array.isArray(formData.permissoes)
        ? formData.permissoes
        : PERFIS_PERMISSOES[formData.perfil] || []
      
      const dados: AtualizarUsuarioData = {
        nome: formData.nome,
        email: formData.email,
        perfil: formData.perfil as any,
        permissoes: permissoesParaSalvar, // Sempre enviar, mesmo que vazio
      }
      
      console.log("📝 Preparando para salvar:", {
        permissoesFormData: formData.permissoes,
        permissoesParaSalvar,
        perfil: formData.perfil,
      })
      
      if (formData.senha) {
        dados.senha = formData.senha
      }
      
      console.log("📝 Dados para atualizar:", {
        id: usuarioSelecionado.id,
        dados: {
          ...dados,
          senha: dados.senha ? "[REDACTED]" : undefined,
        },
      })

      await UsuariosAdminService.atualizar(usuarioSelecionado.id, dados)
      toast.success("Usuário atualizado com sucesso!")
      setShowModalEditar(false)
      setUsuarioSelecionado(null)
      limparFormulario()
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error)
      toast.error("Erro ao atualizar usuário")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (usuario: UsuarioAdmin) => {
    try {
      await UsuariosAdminService.toggleAtivo(usuario.id, !usuario.ativo)
      toast.success(`Usuário ${!usuario.ativo ? "ativado" : "desativado"} com sucesso!`)
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      toast.error("Erro ao alterar status do usuário")
    }
  }

  const handleExcluir = async (usuario: UsuarioAdmin) => {
    try {
      const confirmar = confirm(
        `Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário "${usuario.nome}"?\n\n` +
        `Esta ação não pode ser desfeita e irá:\n` +
        `• Remover o usuário do sistema\n` +
        `• Remover do Supabase Auth\n` +
        `• Deletar todos os dados associados`
      )
      
      if (!confirmar) {
        toast.info("Exclusão cancelada")
        return
      }

      await UsuariosAdminService.excluir(usuario.id)
      toast.success(`Usuário "${usuario.nome}" excluído permanentemente!`)
      carregarUsuarios()
    } catch (error) {
      console.error("Erro ao excluir usuário:", error)
      toast.error("Erro ao excluir usuário")
    }
  }


  const abrirModalEditar = (usuario: UsuarioAdmin) => {
    // Normalizar permissões do usuário
    const permissoesUsuario = Array.isArray(usuario.permissoes) ? usuario.permissoes : []
    
    setUsuarioSelecionado(usuario)
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      permissoes: permissoesUsuario,
      ativo: usuario.ativo,
    })
    // Sincronizar permissoesSelecionadas com formData.permissoes
    setPermissoesSelecionadas(permissoesUsuario)
    setMostrarPermissoesEditar(true)
    setShowModalEditar(true)
  }


  const limparFormulario = () => {
    setFormData({
      nome: "",
      email: "",
      senha: "",
      perfil: "atendimento",
      permissoes: [],
      ativo: true,
    })
    setPermissoesSelecionadas([])
    setMostrarSenha(false)
    setMostrarPermissoesCriar(false)
    setMostrarPermissoesEditar(false)
  }

  const togglePermissao = (permissao: Permissao) => {
    if (permissoesSelecionadas.includes(permissao)) {
      setPermissoesSelecionadas(permissoesSelecionadas.filter((p) => p !== permissao))
      } else {
      setPermissoesSelecionadas([...permissoesSelecionadas, permissao])
    }
  }

  const aplicarPermissoesDoPerfil = (perfil: UsuarioAdmin["perfil"]) => {
    setPermissoesSelecionadas(PERFIS_PERMISSOES[perfil] || [])
  }
  
  const handleChangePerfilCriar = (perfil: UsuarioAdmin["perfil"]) => {
    setFormData({ ...formData, perfil })
    // Aplicar permissões do perfil automaticamente
    setPermissoesSelecionadas(PERFIS_PERMISSOES[perfil] || [])
    setMostrarPermissoesCriar(true)
  }
  
  const handleChangePerfilEditar = (perfil: UsuarioAdmin["perfil"]) => {
    setFormData({ ...formData, perfil })
    // Sugerir permissões do perfil, mas manter as já selecionadas se usuário quiser
    if (permissoesSelecionadas.length === 0) {
      setPermissoesSelecionadas(PERFIS_PERMISSOES[perfil] || [])
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      ativo: { bg: "bg-green-100 text-green-800", icon: CheckCircle },
      inativo: { bg: "bg-gray-100 text-gray-800", icon: XCircle },
      bloqueado: { bg: "bg-red-100 text-red-800", icon: XCircle },
      pendente: { bg: "bg-yellow-100 text-yellow-800", icon: Calendar },
    }
    return badges[status as keyof typeof badges] || badges.ativo
  }

  const getPerfilBadge = (perfil: string) => {
    const badges = {
      master: "bg-indigo-100 text-indigo-800",
      super_admin: "bg-purple-100 text-purple-800",
      admin: "bg-blue-100 text-blue-800",
      assistente: "bg-teal-100 text-teal-800",
      financeiro: "bg-green-100 text-green-800",
      vendas: "bg-orange-100 text-orange-800",
      atendimento: "bg-cyan-100 text-cyan-800",
      readonly: "bg-gray-100 text-gray-800",
    }
    return badges[perfil as keyof typeof badges] || badges.readonly
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando usuários...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans flex items-center gap-2">
              <Settings className="h-6 w-6 text-[#168979]" />
              Gestão de Usuários
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Gerencie usuários e permissões de acesso ao sistema
          </p>
        </div>
          <Button
            onClick={() => setShowModalCriar(true)}
            className="bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate shadow-corporate flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
        </div>
              </div>
              
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900 font-sans">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                Buscar
              </label>
                <Input
                placeholder="Nome ou e-mail..."
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                />
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="h-4 w-4 inline mr-1" />
                Perfil
              </label>
              <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
                  <SelectTrigger>
                  <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="todos">Todos os perfis</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="assistente">Assistente</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="readonly">Somente Leitura</SelectItem>
                  </SelectContent>
                </Select>
            </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Power className="h-4 w-4 inline mr-1" />
                Status
              </label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-[#168979]" />
              Usuários ({usuariosFiltrados.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usuariosFiltrados.map((usuario) => {
              const StatusBadge = getStatusBadge(usuario.status)
              
              return (
                <div
                  key={usuario.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-lg">{usuario.nome}</h3>
                        <Badge className={getPerfilBadge(usuario.perfil)}>
                          {PERFIS_LABELS[usuario.perfil]}
                        </Badge>
                        <Badge className={StatusBadge.bg}>
                          <StatusBadge.icon className="h-3 w-3 mr-1" />
                          {usuario.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{usuario.email}</span>
                        </div>
                        {usuario.ultimo_acesso && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Último acesso: {new Date(usuario.ultimo_acesso).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="text-xs font-medium text-gray-700">Permissões:</span>
                          {Array.isArray(usuario.permissoes) ? (
                            <>
                              {usuario.permissoes.slice(0, 3).map((perm: Permissao) => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {PERMISSOES_LABELS[perm]}
                                </Badge>
                              ))}
                              {usuario.permissoes.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{usuario.permissoes.length - 3} mais
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Nenhuma permissão definida
                            </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                    <div className="flex flex-col gap-2">
                    <Button
                        onClick={() => abrirModalEditar(usuario)}
                        size="sm"
                      variant="outline"
                        className="flex items-center gap-1"
                    >
                        <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                      <Button
                        onClick={() => handleToggleAtivo(usuario)}
                        size="sm"
                        variant={usuario.ativo ? "destructive" : "default"}
                        className="flex items-center gap-1"
                      >
                        <Power className="h-4 w-4" />
                        {usuario.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      {!usuario.ativo && (
                        <Button
                          onClick={() => handleExcluir(usuario)}
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {usuariosFiltrados.length === 0 && (
              <div className="py-12 text-center">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Nenhum usuário encontrado</p>
                <p className="text-gray-500 text-sm mt-2">
                  Ajuste os filtros ou crie um novo usuário
                </p>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Criar Usuário */}
      <ModalCriarUsuario
        isOpen={showModalCriar}
        onClose={() => setShowModalCriar(false)}
        onSave={handleCriar}
        saving={saving}
        formData={formData}
        setFormData={setFormData}
        limparFormulario={limparFormulario}
      />

      {/* Modal Editar Usuário */}
      <ModalEditarUsuario
        isOpen={showModalEditar && !!usuarioSelecionado}
        onClose={() => {
          setShowModalEditar(false)
          setUsuarioSelecionado(null)
        }}
        onSave={handleAtualizar}
        saving={saving}
        formData={formData}
        setFormData={setFormData}
        limparFormulario={limparFormulario}
        usuarioOriginal={usuarioSelecionado}
      />

    </div>
  )
}
