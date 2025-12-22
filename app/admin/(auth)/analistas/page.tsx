"use client"

import { useState, useEffect } from "react"
import usuariosAdminService from "@/services/usuarios-admin-service"
import type { UsuarioAdmin } from "@/services/usuarios-admin-service"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { ClipboardList, Clock, UserCheck, XCircle, Search, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function AnalistasPage() {
  const [analistas, setAnalistas] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<string>("todos")

  useEffect(() => {
    carregarAnalistas()
  }, [])

  async function carregarAnalistas() {
    try {
      setLoading(true)
      const todosUsuarios = await usuariosAdminService.listar()
      // Filtrar apenas analistas (perfil assistente ou com permissões de analista)
      const analistasFiltrados = todosUsuarios.filter(
        (usuario) =>
          usuario.perfil === "assistente" ||
          (Array.isArray(usuario.permissoes) &&
            (usuario.permissoes.includes("propostas") ||
              usuario.permissoes.includes("em_analise") ||
              usuario.permissoes.includes("cadastrado")))
      )
      setAnalistas(analistasFiltrados)
    } catch (error) {
      console.error("Erro ao carregar analistas:", error)
      toast.error("Erro ao carregar analistas")
    } finally {
      setLoading(false)
    }
  }

  async function aprovarAnalista(id: string) {
    try {
      await usuariosAdminService.atualizar(id, { status: "ativo" })
      toast.success("Analista aprovado com sucesso")
      carregarAnalistas()
    } catch (error) {
      console.error("Erro ao aprovar analista:", error)
      toast.error("Erro ao aprovar analista")
    }
  }

  async function rejeitarAnalista(id: string) {
    try {
      await usuariosAdminService.atualizar(id, { status: "bloqueado" })
      toast.success("Analista bloqueado com sucesso")
      carregarAnalistas()
    } catch (error) {
      console.error("Erro ao bloquear analista:", error)
      toast.error("Erro ao bloquear analista")
    }
  }

  const analistasFiltrados = analistas.filter((analista) => {
    const matchFiltro =
      analista.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      analista.email.toLowerCase().includes(filtro.toLowerCase())

    if (statusFiltro === "todos") return matchFiltro
    return matchFiltro && analista.status === statusFiltro
  })

  const formatarData = (data: string) => {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]">Ativo</Badge>
      case "pendente":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case "bloqueado":
        return <Badge className="bg-red-100 text-red-800">Bloqueado</Badge>
      case "inativo":
        return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalAnalistas = analistas.length
  const analistasPendentes = analistas.filter((a) => a.status === "pendente").length
  const analistasAtivos = analistas.filter((a) => a.status === "ativo").length

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Gerenciamento de Analistas</h1>
          <p className="text-gray-600 mt-1 font-medium">Gerencie e aprove analistas do sistema</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{totalAnalistas}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Analistas cadastrados</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Pendentes</h3>
              <div className="text-3xl font-bold text-yellow-600 mt-2">{analistasPendentes}</div>
            </div>
            <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Aguardando aprovação</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Ativos</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{analistasAtivos}</div>
            </div>
            <div className="w-14 h-14 bg-[#7BD9F6] bg-opacity-30 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-[#0F172A]" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Analistas ativos</p>
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
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="ativo">Ativo</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
            <span className="ml-2 text-gray-600">Carregando analistas...</span>
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
                  {analistasFiltrados.length > 0 ? (
                    analistasFiltrados.map((analista) => (
                      <tr key={analista.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">{analista.nome}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{analista.email}</td>
                        <td className="py-4 px-4 text-sm">{getStatusBadge(analista.status)}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatarData(analista.criado_em || "")}
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="flex gap-2">
                            {analista.status === "pendente" && (
                              <>
                                <Button
                                  onClick={() => aprovarAnalista(analista.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-[#0F172A] border-[#7BD9F6] border-opacity-30 hover:bg-[#7BD9F6] bg-opacity-20"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  onClick={() => rejeitarAnalista(analista.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Bloquear
                                </Button>
                              </>
                            )}
                            {analista.status === "ativo" && (
                              <Button
                                onClick={() => rejeitarAnalista(analista.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Bloquear
                              </Button>
                            )}
                            {analista.status === "bloqueado" && (
                              <Button
                                onClick={() => aprovarAnalista(analista.id)}
                                variant="outline"
                                size="sm"
                                className="text-[#0F172A] border-[#7BD9F6] border-opacity-30 hover:bg-[#7BD9F6] bg-opacity-20"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Reativar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Nenhum analista encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
