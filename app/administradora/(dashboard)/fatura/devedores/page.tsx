"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function DevedoresPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)

  // Filtros
  const [nomeFiltro, setNomeFiltro] = useState<string>("")
  const [statusFiltro, setStatusFiltro] = useState<string>("")

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      carregarDevedores()
    }
  }, [])

  async function carregarDevedores() {
    if (!administradoraId) return

    try {
      setLoading(true)

      const resultado = await FaturasService.buscarPorAdministradora(
        administradoraId,
        {
          status: "atrasada",
          page: 1,
          limit: 1000,
        }
      )

      if (!resultado) {
        throw new Error("Erro ao buscar devedores: resultado vazio")
      }

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      let faturasAtrasadas = (resultado.faturas || []).filter((fatura) => {
        if (!fatura.data_vencimento) return false
        const vencimento = new Date(fatura.data_vencimento)
        vencimento.setHours(0, 0, 0, 0)
        return vencimento < hoje && fatura.status !== "paga"
      })

      if (nomeFiltro) {
        faturasAtrasadas = faturasAtrasadas.filter((f) => 
          f.cliente_nome?.toLowerCase().includes(nomeFiltro.toLowerCase())
        )
      }

      if (statusFiltro && statusFiltro !== "todos") {
        faturasAtrasadas = faturasAtrasadas.filter((f) => f.status === statusFiltro)
      }

      setFaturas(faturasAtrasadas)
      setTotalPages(Math.ceil(faturasAtrasadas.length / itemsPerPage))
    } catch (error: any) {
      console.error("Erro ao carregar devedores:", error)
      toast.error("Erro ao carregar devedores: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setNomeFiltro("")
    setStatusFiltro("")
    setCurrentPage(1)
    carregarDevedores()
  }

  function formatarData(data: string | undefined): string {
    if (!data) return "-"
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return data
    }
  }

  function calcularDiasAtraso(dataVencimento: string | undefined): number {
    if (!dataVencimento) return 0
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    const diff = hoje.getTime() - vencimento.getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  }

  function getStatusBadge(status: string) {
    const baseClass = "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border"
    const statusMap: Record<string, { label: string; className: string }> = {
      atrasada: { label: "Atrasada", className: "bg-gray-100 text-gray-600 border-gray-300" },
      pendente: { label: "Pendente", className: "bg-amber-50 text-amber-800 border-amber-200" },
      cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-gray-300" },
    }
    const statusInfo = statusMap[status.toLowerCase()] || { label: status, className: "bg-gray-100 text-gray-600 border-gray-300" }
    return <span className={cn(baseClass, statusInfo.className)}>{statusInfo.label}</span>
  }

  const faturasPaginadas = faturas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const valorTotal = faturas.reduce((sum, f) => sum + (f.valor_total || 0), 0)
  const totalDevedores = faturas.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Devedores</h1>
      </div>

      {/* Filtros Simplificados */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome do Cliente</label>
            <Input
              value={nomeFiltro}
              onChange={(e) => setNomeFiltro(e.target.value)}
              placeholder="Digite o nome do cliente"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Status</label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de Ação Simplificados */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={carregarDevedores}
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
            <span className="text-gray-600">Total de Devedores: </span>
            <span className="font-semibold text-gray-800">{totalDevedores}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor Total em Atraso: </span>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Fatura</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Vencimento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : faturasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum devedor encontrado
                    </td>
                  </tr>
                ) : (
                  faturasPaginadas.map((fatura, index) => {
                    const diasAtraso = calcularDiasAtraso(fatura.data_vencimento)
                    return (
                      <tr
                        key={fatura.id}
                        className={cn(
                          "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        )}
                      >
                        <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.cliente_nome || "-"}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.numero_fatura || fatura.id.slice(0, 8)}</td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          {getStatusBadge(fatura.status)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(fatura.data_vencimento)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-800 border-r border-gray-200">{formatarMoeda(fatura.valor_total)}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-gray-100 text-gray-600 border-gray-300">
                            {diasAtraso} dias
                          </span>
                        </td>
                      </tr>
                    )
                  })
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
              <SelectTrigger className="w-24 h-8 text-xs rounded-md border border-gray-300 bg-background px-3 py-2">
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
