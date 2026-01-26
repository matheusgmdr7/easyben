"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X, MoreVertical } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface FaturaCompleta extends Fatura {
  grupo_beneficiario?: string
  data_processamento?: string
}

export default function PesquisarFaturamentoPage() {
  const [faturas, setFaturas] = useState<FaturaCompleta[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])

  // Filtros
  const [grupoFiltro, setGrupoFiltro] = useState<string>("")
  const [referenciaFiltro, setReferenciaFiltro] = useState<string>("")
  const [statusFaturamentoFiltro, setStatusFaturamentoFiltro] = useState<string>("")

  // Resumo
  const [valorTotal, setValorTotal] = useState(0)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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

  async function pesquisarFaturas() {
    if (!administradoraId) return

    try {
      setLoading(true)

      const resultado = await FaturasService.buscarPorAdministradora(
        administradoraId,
        {
          status: statusFaturamentoFiltro || undefined,
          page: 1,
          limit: 1000,
        }
      )

      if (!resultado) {
        throw new Error("Erro ao buscar faturas: resultado vazio")
      }

      let faturasFiltradas = resultado.faturas || []

      // Filtrar por referência (mês/ano)
      if (referenciaFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => 
          f.referencia?.toLowerCase().includes(referenciaFiltro.toLowerCase())
        )
      }

      // Filtrar por grupo de beneficiários (se selecionado)
      // TODO: Implementar filtro por grupo quando houver relação entre faturas e grupos

      const faturasCompletas = faturasFiltradas.map((fatura) => {
        return {
          ...fatura,
          grupo_beneficiario: "-", // TODO: Buscar grupo relacionado
          data_processamento: fatura.created_at || fatura.data_emissao,
        }
      })

      const valor = faturasCompletas.reduce((sum, f) => sum + (f.valor_total || 0), 0)

      setValorTotal(valor)
      setFaturas(faturasCompletas)
      setTotalPages(Math.ceil(faturasCompletas.length / itemsPerPage))
    } catch (error: any) {
      console.error("Erro ao pesquisar faturas:", error)
      toast.error("Erro ao pesquisar faturas: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setGrupoFiltro("")
    setReferenciaFiltro("")
    setStatusFaturamentoFiltro("")
    setCurrentPage(1)
    setFaturas([])
    setValorTotal(0)
  }

  function formatarData(data: string | undefined): string {
    if (!data) return "-"
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return data
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
      faturado: { label: "FATURADO", className: "bg-green-100 text-green-800" },
      cancelado: { label: "CANCELADO", className: "bg-red-100 text-red-800" },
      paga: { label: "PAGA", className: "bg-green-100 text-green-800" },
      pendente: { label: "PENDENTE", className: "bg-yellow-100 text-yellow-800" },
      atrasada: { label: "ATRASADA", className: "bg-red-100 text-red-800" },
    }

    const statusInfo = statusMap[status.toLowerCase()] || { label: status.toUpperCase(), className: "bg-gray-100 text-gray-800" }

    return (
      <Badge className={cn("font-semibold text-xs", statusInfo.className)}>
        {statusInfo.label}
      </Badge>
    )
  }

  const faturasPaginadas = faturas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Pesquisar Faturamento</h1>
      </div>

      {/* Filtros Simplificados */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo Beneficiário</label>
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger className="h-9 text-sm border-gray-300 rounded-sm">
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
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Mês de Referência</label>
            <Input
              value={referenciaFiltro}
              onChange={(e) => setReferenciaFiltro(e.target.value)}
              placeholder="Ex: 12/2025"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Status de Faturamento</label>
            <Select value={statusFaturamentoFiltro} onValueChange={setStatusFaturamentoFiltro}>
              <SelectTrigger className="h-9 text-sm border-gray-300 rounded-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faturado">Faturado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de Ação Simplificados */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={pesquisarFaturas}
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

      {/* Resumo Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-600">Valor: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(valorTotal)}</span>
          </div>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Data Processamento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Referência</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Grupo Beneficiário</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Log</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : faturasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhuma fatura encontrada
                    </td>
                  </tr>
                ) : (
                  faturasPaginadas.map((fatura, index) => (
                    <tr
                      key={fatura.id}
                      className={cn(
                        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.id.slice(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getStatusBadge(fatura.status)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(fatura.data_processamento)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.referencia || "-"}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800 border-r border-gray-200">{formatarMoeda(fatura.valor_total)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.grupo_beneficiario || "-"}</td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          title="Log"
                        >
                          <MoreVertical className="h-4 w-4" />
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
