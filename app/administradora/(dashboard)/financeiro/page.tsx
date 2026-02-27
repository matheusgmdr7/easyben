"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Wallet,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  ArrowUpDown
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatarMoeda } from "@/utils/formatters"
import { Badge } from "@/components/ui/badge"

export default function FinanceiroPage() {
  const router = useRouter()
  const [administradora, setAdministradora] = useState<any>(null)
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalFaturas, setTotalFaturas] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Filtros
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>("")
  const [dataFimFiltro, setDataFimFiltro] = useState<string>("")
  
  // Ordenação
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({
    campo: 'vencimento',
    direcao: 'desc'
  })

  useEffect(() => {
    const administradoraLogada = getAdministradoraLogada()
    if (!administradoraLogada) {
      router.push("/administradora/login")
      return
    }
    setAdministradora(administradoraLogada)
    carregarDados()
  }, [router])

  useEffect(() => {
    if (administradora) {
      setCurrentPage(1)
      carregarFaturas()
    }
  }, [administradora, statusFiltro, dataInicioFiltro, dataFimFiltro, ordenacao])

  useEffect(() => {
    if (administradora) {
      carregarFaturas()
    }
  }, [currentPage, itemsPerPage, administradora])

  async function carregarDados() {
    try {
      setLoading(true)
      // Estatísticas serão carregadas junto com as faturas
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados financeiros")
    } finally {
      setLoading(false)
    }
  }

  async function carregarFaturas() {
    if (!administradora) return

    try {
      const filtros: any = {
        page: currentPage,
        limit: itemsPerPage
      }
      
      if (statusFiltro !== "todos") {
        filtros.status = statusFiltro
      }

      if (dataInicioFiltro) {
        filtros.data_inicio = dataInicioFiltro
      }
      if (dataFimFiltro) {
        filtros.data_fim = dataFimFiltro
      }

      const resultado = await FaturasService.buscarPorAdministradora(
        administradora.id,
        filtros
      )
      
      // Ordenar faturas
      const faturasOrdenadas = [...resultado.faturas].sort((a, b) => {
        let aValue: any
        let bValue: any
        
        switch (ordenacao.campo) {
          case 'vencimento':
            aValue = new Date(a.vencimento + 'T00:00:00').getTime()
            bValue = new Date(b.vencimento + 'T00:00:00').getTime()
            break
          case 'valor':
            aValue = (a as any).valor || a.valor_total || 0
            bValue = (b as any).valor || b.valor_total || 0
            break
          case 'cliente':
            aValue = (a as any).cliente_nome || ''
            bValue = (b as any).cliente_nome || ''
            break
          case 'status':
            aValue = a.status || ''
            bValue = b.status || ''
            break
          default:
            aValue = a.vencimento
            bValue = b.vencimento
        }
        
        if (aValue < bValue) return ordenacao.direcao === 'asc' ? -1 : 1
        if (aValue > bValue) return ordenacao.direcao === 'asc' ? 1 : -1
        return 0
      })
      
      setFaturas(faturasOrdenadas)
      setTotalPages(resultado.totalPages)
      setTotalFaturas(resultado.total)

      // Carregar estatísticas
      const statsFilters: any = {}
      if (dataInicioFiltro) {
        statsFilters.data_inicio = dataInicioFiltro
      }
      if (dataFimFiltro) {
        statsFilters.data_fim = dataFimFiltro
      }
      const stats = await FaturasService.buscarEstatisticas(administradora.id, statsFilters)
      setEstatisticas(stats)
    } catch (error: any) {
      console.error("❌ Erro ao carregar faturas:", error)
      toast.error("Erro ao carregar faturas")
    }
  }

  async function handleAtualizar() {
    if (!administradora) return

    try {
      setSincronizando(true)
      toast.info("Atualizando dados... Isso pode levar alguns minutos")

      // Atualizar faturas vencidas para atrasadas
      const quantidadeAtrasadas = await FaturasService.atualizarFaturasVencidas()

      // Sincronizar status com o Asaas
      const response = await fetch('/api/sincronizar-status-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          administradora_id: administradora.id
        })
      })

      if (response.ok) {
        const resultado = await response.json()
        if (resultado.faturas_atualizadas > 0) {
          toast.success(
            `✅ Atualização concluída! ${quantidadeAtrasadas} marcadas como atrasadas e ${resultado.faturas_atualizadas} sincronizadas com o Asaas`
          )
        } else {
          toast.success(
            `✅ Atualização concluída! ${quantidadeAtrasadas} faturas marcadas como atrasadas`
          )
        }
      } else {
        toast.success(`✅ ${quantidadeAtrasadas} faturas marcadas como atrasadas`)
      }

      await carregarFaturas()
    } catch (error: any) {
      console.error("❌ Erro ao atualizar:", error)
      toast.error(`Erro ao atualizar: ${error.message}`)
    } finally {
      setSincronizando(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: { bg: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pendente" },
      paga: { bg: "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]", icon: CheckCircle, label: "Paga" },
      atrasada: { bg: "bg-red-100 text-red-800", icon: AlertCircle, label: "Atrasada" },
      cancelada: { bg: "bg-gray-100 text-gray-800", icon: FileText, label: "Cancelada" },
      parcialmente_paga: { bg: "bg-blue-100 text-blue-800", icon: DollarSign, label: "Parcialmente Paga" },
    }
    const badge = badges[status as keyof typeof badges] || badges.pendente
    const Icon = badge.icon
    
    return (
      <Badge className={`${badge.bg} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </Badge>
    )
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#0F172A]" />
              Financeiro
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Gestão de faturas e pagamentos
            </p>
          </div>
          <Button 
            onClick={handleAtualizar} 
            disabled={sincronizando}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 rounded"
          >
            {sincronizando ? (
              <>
                <div className="loading-corporate-small"></div>
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Atualizar & Sincronizar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      {estatisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Pendentes</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-1">
                    {estatisticas.total_pendentes}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatarMoeda(estatisticas.valor_pendente)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Atrasadas</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 mb-1">
                    {estatisticas.total_atrasadas}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatarMoeda(estatisticas.valor_atrasado)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Pagas</h3>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">
                    {estatisticas.total_pagas}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatarMoeda(estatisticas.valor_recebido)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Em Aberto</h3>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">
                    {formatarMoeda(estatisticas.valor_em_aberto)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {estatisticas.total_em_aberto} faturas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="atrasada">Atrasada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="parcialmente_paga">Parcialmente Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Data Início
              </label>
              <Input
                type="date"
                value={dataInicioFiltro}
                onChange={(e) => setDataInicioFiltro(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Data Fim
              </label>
              <Input
                type="date"
                value={dataFimFiltro}
                onChange={(e) => setDataFimFiltro(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setDataInicioFiltro("")
                  setDataFimFiltro("")
                  setStatusFiltro("todos")
                }}
                variant="outline"
                className="w-full border-gray-300 rounded"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Faturas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Faturas ({totalFaturas})</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={ordenacao.campo}
                onValueChange={(value) => setOrdenacao(prev => ({ ...prev, campo: value }))}
              >
                <SelectTrigger className="w-40 h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vencimento">Vencimento</SelectItem>
                  <SelectItem value="valor">Valor</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrdenacao(prev => ({ ...prev, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }))}
                className="h-9 rounded"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {faturas.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Vencimento</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Valor</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturas.map((fatura) => (
                      <tr key={fatura.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{(fatura as any).cliente_nome || "N/A"}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatarData(fatura.vencimento)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {formatarMoeda((fatura as any).valor || fatura.valor_total || 0)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(fatura.status)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {fatura.descricao || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma fatura encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

