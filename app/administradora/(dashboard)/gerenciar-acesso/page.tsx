"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Shield,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { useAdministradoraPermissions } from "@/hooks/use-administradora-permissions"
import {
  type ModuloAdministradora,
  PERFIS_ADMINISTRADORA,
  contarPermissoesSelecionadas,
  normalizarPermissoesAdministradora,
} from "@/lib/administradora-permissoes"
import { SeletorPermissoesMenu } from "@/components/administradora/seletor-permissoes-menu"
import {
  atualizarUsuarioAdministradora,
  criarUsuarioAdministradora,
  excluirUsuarioAdministradora,
  listarUsuariosAdministradora,
  obterPermissoesDoPerfil,
  type UsuarioAdministradora,
} from "@/services/usuarios-administradora-service"

type FormUsuario = {
  nome: string
  email: string
  senha: string
  confirmarSenha: string
  perfil: string
  status: "ativo" | "inativo"
  permissoes: ModuloAdministradora[]
}

const FORM_VAZIO: FormUsuario = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  perfil: "operacional",
  status: "ativo",
  permissoes: obterPermissoesDoPerfil("operacional"),
}

export default function GerenciarAcessoAdministradoraPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { podeGerenciarAcesso, usuario: usuarioLogado, rotaInicial } = useAdministradoraPermissions()
  const adm = getAdministradoraLogada()

  const [usuarios, setUsuarios] = useState<UsuarioAdministradora[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<UsuarioAdministradora | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO)

  useEffect(() => {
    if (!podeGerenciarAcesso) {
      toast.error("Você não tem permissão para gerenciar acesso")
      router.replace(rotaInicial(pathname || ""))
      return
    }
    void carregar()
  }, [podeGerenciarAcesso])

  async function carregar() {
    if (!adm?.id) return
    try {
      setLoading(true)
      const lista = await listarUsuariosAdministradora(adm.id, {
        solicitante_usuario_id: usuarioLogado.id,
        solicitante_email: usuarioLogado.email,
      })
      setUsuarios(lista)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function abrirEditar(u: UsuarioAdministradora) {
    setEditando(u)
    setForm({
      nome: u.nome,
      email: u.email,
      senha: "",
      confirmarSenha: "",
      perfil: u.perfil || "customizado",
      status: u.status,
      permissoes: normalizarPermissoesAdministradora(u.permissoes),
    })
    setModalAberto(true)
  }

  function aplicarPerfil(perfil: string) {
    const permissoes = obterPermissoesDoPerfil(perfil)
    setForm((prev) => ({ ...prev, perfil, permissoes }))
  }

  async function salvar() {
    if (!adm?.id) return
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Preencha nome e email")
      return
    }
    if (!editando && !form.senha) {
      toast.error("Informe uma senha")
      return
    }
    if (form.senha && form.senha !== form.confirmarSenha) {
      toast.error("As senhas não coincidem")
      return
    }
    if (form.permissoes.length === 0) {
      toast.error("Selecione ao menos uma permissão de página")
      return
    }

    const ctx = {
      administradora_id: adm.id,
      solicitante_usuario_id: usuarioLogado.id,
      solicitante_email: usuarioLogado.email,
    }

    try {
      setSalvando(true)
      if (editando) {
        await atualizarUsuarioAdministradora(editando.id, {
          ...ctx,
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          perfil: form.perfil,
          status: form.status,
          permissoes: form.permissoes,
          ...(form.senha ? { senha: form.senha } : {}),
        })
        toast.success("Usuário atualizado")
      } else {
        await criarUsuarioAdministradora({
          ...ctx,
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          senha: form.senha,
          perfil: form.perfil,
          status: form.status,
          permissoes: form.permissoes,
        })
        toast.success("Usuário criado")
      }
      setModalAberto(false)
      await carregar()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar usuário")
    } finally {
      setSalvando(false)
    }
  }

  async function remover(u: UsuarioAdministradora) {
    if (!adm?.id) return
    if (!confirm(`Excluir o usuário ${u.nome}?`)) return
    try {
      await excluirUsuarioAdministradora(u.id, {
        administradora_id: adm.id,
        solicitante_usuario_id: usuarioLogado.id,
        solicitante_email: usuarioLogado.email,
      })
      toast.success("Usuário excluído")
      await carregar()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir usuário")
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = filtro.toLowerCase().trim()
    if (!termo) return true
    return u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Gerenciar acesso</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Crie usuários e defina quais páginas do menu cada perfil pode acessar.
            </p>
          </div>
          <Button
            onClick={abrirNovo}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold shadow-lg rounded inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo usuário
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-10 bg-white"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Usuários do portal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Carregando usuários...</p>
            ) : usuariosFiltrados.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Nenhum usuário adicional cadastrado. A conta master continua sendo o login principal da
                administradora.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Páginas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-gray-600">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-normal">
                          {u.perfil.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 tabular-nums">
                          {contarPermissoesSelecionadas(u.permissoes)} página(s)
                        </span>
                      </TableCell>
                      <TableCell>
                        {u.status === "ativo" ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remover(u)}
                            title="Excluir"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#0F172A]/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-[#0F172A]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editando ? "Editar usuário" : "Novo usuário"}
                  </h2>
                  <p className="text-sm text-gray-500">Credenciais e permissões de acesso ao menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600 rounded-md p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Nome *</label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Senha {editando ? "(deixe vazio para manter)" : "*"}
                  </label>
                  <Input
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Confirmar senha</label>
                  <Input
                    type="password"
                    value={form.confirmarSenha}
                    onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Perfil base</label>
                  <Select value={form.perfil} onValueChange={aplicarPerfil}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERFIS_ADMINISTRADORA).map(([id, perfil]) => (
                        <SelectItem key={id} value={id}>
                          <span>{perfil.label}</span>
                          <span className="text-gray-400 ml-1 text-xs hidden sm:inline">
                            — {perfil.descricao}
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value="customizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as "ativo" | "inativo" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="text-sm font-medium text-gray-700">Páginas do menu</label>
                <SeletorPermissoesMenu
                  value={form.permissoes}
                  onChange={(permissoes) =>
                    setForm((prev) => ({ ...prev, perfil: "customizado", permissoes }))
                  }
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2 bg-gray-50">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
              >
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
