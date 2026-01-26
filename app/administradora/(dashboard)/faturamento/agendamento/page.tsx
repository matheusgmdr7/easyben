"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X, Plus, MoreVertical, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Agendamento {
  id: string
  convenio?: string
  sacador_avalista?: string
  referencia_inicial?: string
  ultimo_faturamento?: string
  dia_agendado?: number
  recorrente?: boolean
  email_automatico?: boolean
  whatsapp_automatico?: boolean
  grupo_beneficiario_id?: string
  grupo_beneficiario?: string
}

export default function AgendamentoPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])

  // Filtros
  const [grupoFiltro, setGrupoFiltro] = useState<string>("")
  const [referenciaFiltro, setReferenciaFiltro] = useState<string>("")

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalAgendamentos, setTotalAgendamentos] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      carregarGrupos(administradora.id)
    }
  }, [])

  async function carregarGrupos(adminId: string) {
    try {
      const data = await GruposBeneficiariosService.buscarTodos(adminId)
      setGrupos(data)
    } catch (error) {
      console.error("Erro ao carregar grupos:", error)
    }
  }

  async function pesquisarAgendamentos() {
    if (!administradoraId) return

    try {
      setLoading(true)
      // TODO: Implementar busca de agendamentos
      // Por enquanto, retornar array vazio
      setAgendamentos([])
      setTotalAgendamentos(0)
      setTotalPages(1)
    } catch (error: any) {
      console.error("Erro ao pesquisar agendamentos:", error)
      toast.error("Erro ao pesquisar agendamentos: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setGrupoFiltro("")
    setReferenciaFiltro("")
    setCurrentPage(1)
    setAgendamentos([])
  }

  function formatarData(data: string | undefined): string {
    if (!data) return "-"
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return data
    }
  }

  function getRecorrenteBadge(recorrente: boolean | undefined) {
    return (
      <Badge className={cn("font-semibold text-xs", recorrente ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
        {recorrente ? "Sim" : "Não"}
      </Badge>
    )
  }

  function getAutomaticoBadge(automatico: boolean | undefined) {
    return (
      <Badge className={cn("font-semibold text-xs", automatico ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800")}>
        {automatico ? "Sim" : "Não"}
      </Badge>
    )
  }

  const agendamentosPaginados = agendamentos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Pesquisar Agendamento</h1>
      </div>

      {/* Filtros Simplificados */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo Beneficiário</label>
            <div className="flex gap-1">
              <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
                <SelectTrigger className="h-9 text-sm border-gray-300 rounded-sm flex-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 px-2 bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                title="Buscar"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Referência</label>
            <Input
              value={referenciaFiltro}
              onChange={(e) => setReferenciaFiltro(e.target.value)}
              placeholder="Ex: 12/2025"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
        </div>

        {/* Botões de Ação Simplificados */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={pesquisarAgendamentos}
            disabled={loading}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button
            onClick={limparFiltros}
            variant="outline"
            className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Tabela com Design Bancário */}
      <div className="px-6 py-4">
        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Grupo Beneficiário</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Convênio</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Sacador Avalista</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Referência Inicial</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Último Faturamento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Dia Agendado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Recorrente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Email Automático</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">WhatsApp Automático</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : agendamentosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum agendamento encontrado
                    </td>
                  </tr>
                ) : (
                  agendamentosPaginados.map((agendamento, index) => (
                    <tr
                      key={agendamento.id}
                      className={cn(
                        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{agendamento.id.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{agendamento.grupo_beneficiario || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{agendamento.convenio || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{agendamento.sacador_avalista || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{agendamento.referencia_inicial || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(agendamento.ultimo_faturamento)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{agendamento.dia_agendado ? `Dia ${agendamento.dia_agendado}` : "-"}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getRecorrenteBadge(agendamento.recorrente)}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getAutomaticoBadge(agendamento.email_automatico)}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getAutomaticoBadge(agendamento.whatsapp_automatico)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          title="Ações"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginação Simplificada */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Anterior
              </Button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Próxima
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Última
              </Button>
            </div>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-xs border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
