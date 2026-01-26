"use client"

import { useState, useEffect } from "react"
import { buscarCorretores, atualizarCorretor } from "@/services/corretores-service"
import type { Corretor } from "@/types/corretores"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Users, Clock, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { enviarEmailAprovacaoCorretor } from "@/services/email-service"

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<string>("todos")

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(15)

  useEffect(() => {
    carregarCorretores()
  }, [])

  async function carregarCorretores() {
    try {
      setLoading(true)
      const data = await buscarCorretores()
      setCorretores(data)
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
      toast.error("Erro ao carregar corretores")
    } finally {
      setLoading(false)
    }
  }

  async function aprovarCorretor(id: string) {
    try {
      const corretorAtualizado = await atualizarCorretor(id, { status: "aprovado" })
      toast.success("Corretor aprovado com sucesso")
      // Enviar email de aprovação
      if (corretorAtualizado?.email && corretorAtualizado?.nome) {
        const emailEnviado = await enviarEmailAprovacaoCorretor(
          corretorAtualizado.email || "",
          corretorAtualizado.nome || "Corretor"
        )
        if (emailEnviado) {
          toast.success("Email de aprovação enviado ao corretor!")
        } else {
          toast.warning("Corretor aprovado, mas não foi possível enviar o email de aprovação.")
        }
      }
      carregarCorretores()
    } catch (error) {
      console.error("Erro ao aprovar corretor:", error)
      toast.error("Erro ao aprovar corretor")
    }
  }

  async function rejeitarCorretor(id: string) {
    try {
      await atualizarCorretor(id, { status: "rejeitado" })
      toast.success("Corretor rejeitado com sucesso")
      carregarCorretores()
    } catch (error) {
      console.error("Erro ao rejeitar corretor:", error)
      toast.error("Erro ao rejeitar corretor")
    }
  }

  async function promoverGestor(id: string, isGestor: boolean) {
    try {
      await atualizarCorretor(id, { is_gestor: isGestor })
      toast.success(isGestor ? "Corretor promovido a gestor com sucesso" : "Status de gestor removido com sucesso")
      carregarCorretores()
    } catch (error) {
      console.error("Erro ao atualizar status de gestor:", error)
      toast.error("Erro ao atualizar status de gestor")
    }
  }

  const corretoresFiltrados = corretores.filter((corretor) => {
    const matchFiltro =
      corretor.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      corretor.email.toLowerCase().includes(filtro.toLowerCase()) ||
      corretor.cidade.toLowerCase().includes(filtro.toLowerCase()) ||
      (corretor.cpf && corretor.cpf.includes(filtro))

    if (statusFiltro === "todos") return matchFiltro
    return matchFiltro && corretor.status === statusFiltro
  })

  // Cálculos de paginação
  const totalItens = corretoresFiltrados.length
  const totalPaginas = Math.ceil(totalItens / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const corretoresExibidos = corretoresFiltrados.slice(indiceInicio, indiceFim)

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1)
  }, [filtro, statusFiltro])

  const formatarData = (data: string) => {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR")
  }

  const formatarCPF = (cpf: string) => {
    if (!cpf) return "-"
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  const formatarTelefone = (telefone: string) => {
    if (!telefone) return "-"
    return telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Gerenciamento de Corretores</h1>
          <p className="text-gray-600 mt-1 font-medium">Gerencie e aprove corretores do sistema</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{corretores.length}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Corretores cadastrados</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Pendentes</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{corretores.filter((c) => c.status === "pendente").length}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-gray-700" />
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
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{corretores.filter((c) => c.status === "aprovado").length}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Corretores aprovados</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <h2 className="text-lg font-semibold mb-4 md:mb-0 text-gray-700">Lista de Corretores</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Buscar por nome, email, cidade ou CPF..."
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                >
                  <option value="todos">Todos os status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="aprovado">Aprovados</option>
                  <option value="rejeitado">Rejeitados</option>
                </select>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} corretores
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="loading-corporate mx-auto"></div>
              <span className="block mt-4 loading-text-corporate">Carregando corretores...</span>
              <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Corretor
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localização
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Nasc.
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastro
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {corretoresExibidos.length > 0 ? (
                    corretoresExibidos.map((corretor) => (
                      <tr key={corretor.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            {corretor.foto_url ? (
                              <img
                                src={corretor.foto_url || "/placeholder.svg"}
                                alt={corretor.nome}
                                className="w-10 h-10 rounded-full mr-3 object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center border border-gray-300">
                                <span className="text-gray-600 font-medium text-sm">{corretor.nome.charAt(0)}</span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{corretor.nome}</div>
                              <div className="text-sm text-gray-500">{corretor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">{formatarCPF(corretor.cpf)}</td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900">{formatarTelefone(corretor.telefone)}</div>
                          {corretor.whatsapp && (
                            <div className="text-sm text-gray-500">WhatsApp: {formatarTelefone(corretor.whatsapp)}</div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900">
                            {corretor.cidade}, {corretor.estado}
                          </div>
                          {(corretor.endereco || corretor.cep) && (
                            <div className="text-sm text-gray-500">
                              {corretor.endereco && <div>{corretor.endereco}</div>}
                              {corretor.cep && <div>CEP: {corretor.cep}</div>}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">{formatarData(corretor.data_nascimento)}</td>
                        <td className="py-4 px-4 text-sm text-gray-900">{formatarData(corretor.created_at)}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                corretor.status === "aprovado"
                                  ? "bg-gray-100 text-gray-800"
                                  : corretor.status === "rejeitado"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-gray-50 text-gray-700"
                              }`}
                            >
                              {corretor.status === "aprovado"
                                ? "Aprovado"
                                : corretor.status === "rejeitado"
                                  ? "Rejeitado"
                                  : "Pendente"}
                            </span>
                            {corretor.is_gestor && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Gestor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-2">
                            {corretor.status === "pendente" && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => aprovarCorretor(corretor.id)}
                                  className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700 transition-colors"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => rejeitarCorretor(corretor.id)}
                                  className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200 transition-colors border border-red-200"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            )}
                            {corretor.status === "rejeitado" && (
                              <button
                                onClick={() => aprovarCorretor(corretor.id)}
                                className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700 transition-colors"
                              >
                                Aprovar
                              </button>
                            )}
                            {corretor.status === "aprovado" && (
                              <button
                                onClick={() => rejeitarCorretor(corretor.id)}
                                className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200 transition-colors border border-red-200"
                              >
                                Desativar
                              </button>
                            )}
                            {corretor.status === "aprovado" && (
                              <button
                                onClick={() => promoverGestor(corretor.id, !corretor.is_gestor)}
                                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                                  corretor.is_gestor
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                                }`}
                              >
                                {corretor.is_gestor ? "Remover Gestor" : "Promover a Gestor"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Nenhum corretor encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-700">
                    Página {paginaAtual} de {totalPaginas}
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                      className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="ml-1">Anterior</span>
                    </Button>

                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                        let pageNum
                        if (totalPaginas <= 5) {
                          pageNum = i + 1
                        } else if (paginaAtual <= 3) {
                          pageNum = i + 1
                        } else if (paginaAtual >= totalPaginas - 2) {
                          pageNum = totalPaginas - 4 + i
                        } else {
                          pageNum = paginaAtual - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={paginaAtual === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaginaAtual(pageNum)}
                            className="h-8 sm:h-9 w-8 sm:w-9 p-0 text-xs sm:text-sm rounded-none"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                    >
                      <span className="mr-1">Próxima</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
