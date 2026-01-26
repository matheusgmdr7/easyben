"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { ClientesAdministradorasService, type ClienteAdministradoraCompleto, type FiltrosClientes, type PaginacaoClientes, type ResultadoClientes } from "@/services/clientes-administradoras-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Search,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  User,
} from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import * as XLSX from "xlsx"

export default function ClientesPage() {
  const router = useRouter()
  const [administradora, setAdministradora] = useState<any>(null)
  const [resultadoClientes, setResultadoClientes] = useState<ResultadoClientes | null>(null)
  const [loading, setLoading] = useState(true)

  // Estados dos filtros
  const [filtros, setFiltros] = useState<FiltrosClientes>({})
  const [paginacao, setPaginacao] = useState<PaginacaoClientes>({
    pagina: 1,
    limite: 10,
    ordenacao: {
      campo: 'data_vinculacao',
      direcao: 'desc'
    }
  })

  // Estados dos formulários de filtro
  const [filtroNome, setFiltroNome] = useState("")
  const [filtroCpf, setFiltroCpf] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")

  useEffect(() => {
    const administradoraLogada = getAdministradoraLogada()
    if (!administradoraLogada) {
      router.push("/administradora/login")
      return
    }
    setAdministradora(administradoraLogada)
    carregarDados()
  }, [router, filtros, paginacao])

  async function carregarDados() {
    if (!administradora) return

    try {
      setLoading(true)
      const clientesData = await ClientesAdministradorasService.buscarPorAdministradora(
        administradora.id,
        filtros,
        paginacao
      )
      setResultadoClientes(clientesData)
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados:", error)
      toast.error("Erro ao carregar clientes")
    } finally {
      setLoading(false)
    }
  }

  function aplicarFiltros() {
    const novosFiltros: FiltrosClientes = {}
    
    if (filtroNome.trim()) novosFiltros.nome = filtroNome.trim()
    if (filtroCpf.trim()) novosFiltros.cpf = filtroCpf.trim()
    if (filtroStatus !== "todos") novosFiltros.status = filtroStatus

    setFiltros(novosFiltros)
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
  }

  function limparFiltros() {
    setFiltroNome("")
    setFiltroCpf("")
    setFiltroStatus("todos")
    setFiltros({})
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
  }

  async function exportarRelatorioExcel() {
    try {
      toast.info("Preparando relatório...")
      
      if (!administradora) return

      const resultado = await ClientesAdministradorasService.buscarPorAdministradora(
        administradora.id,
        filtros,
        { pagina: 1, limite: 10000, ordenacao: { campo: 'cliente_nome', direcao: 'asc' } }
      )

      const clientes = resultado.clientes

      if (clientes.length === 0) {
        toast.warning("Nenhum cliente encontrado para exportar")
        return
      }

      // Preparar dados para Excel
      const dadosExcel = clientes.map((cliente) => ({
        Nome: cliente.cliente_nome || "",
        CPF: cliente.cliente_cpf || "",
        Email: cliente.cliente_email || "",
        Telefone: cliente.cliente_telefone || "",
        Produto: cliente.produto_nome || "",
        Plano: cliente.plano_nome || "",
        Status: cliente.status || "",
        "Valor Mensal": cliente.valor_mensal || 0,
        "Data Vinculação": cliente.data_vinculacao ? new Date(cliente.data_vinculacao).toLocaleDateString("pt-BR") : "",
        "Data Vencimento": cliente.data_vencimento ? new Date(cliente.data_vencimento).toLocaleDateString("pt-BR") : "",
        "Data Vigência": cliente.data_vigencia ? new Date(cliente.data_vigencia).toLocaleDateString("pt-BR") : "",
        "Número Contrato": cliente.numero_contrato || "",
        "Número Carteirinha": cliente.numero_carteirinha || "",
      }))

      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosExcel)

      // Ajustar larguras das colunas
      const colWidths = [
        { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
        { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, "Clientes")

      const nomeArquivo = `clientes_${administradora.nome_fantasia || administradora.nome}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, nomeArquivo)

      toast.success(`Relatório exportado com sucesso! ${clientes.length} cliente(s) exportado(s).`)
    } catch (error: any) {
      console.error("❌ Erro ao exportar relatório:", error)
      toast.error("Erro ao exportar relatório Excel")
    }
  }

  function alterarPagina(novaPagina: number) {
    setPaginacao(prev => ({ ...prev, pagina: novaPagina }))
  }

  function verCliente(clienteId: string) {
    router.push(`/administradora/clientes/${clienteId}`)
  }

  const getStatusBadge = (cliente: ClienteAdministradoraCompleto) => {
    if (cliente.implantado === true) {
      return (
        <Badge className="bg-[#7BD9F6] bg-opacity-20 text-[#0F172A] border border-[#7BD9F6] border-opacity-30 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Implantado
        </Badge>
      )
    } else if (cliente.implantado === false) {
      return (
        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Aguardando Implantação
        </Badge>
      )
    }
    
    const badges = {
      ativo: { bg: "bg-[#7BD9F6] bg-opacity-20 text-[#0F172A] border border-[#7BD9F6] border-opacity-30", icon: CheckCircle, label: "Ativo" },
      suspenso: { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", icon: AlertCircle, label: "Suspenso" },
      cancelado: { bg: "bg-red-50 text-red-700 border border-red-200", icon: XCircle, label: "Cancelado" },
      inadimplente: { bg: "bg-orange-50 text-orange-700 border border-orange-200", icon: Clock, label: "Inadimplente" },
      aguardando_implantacao: { bg: "bg-blue-50 text-blue-700 border border-blue-200", icon: Clock, label: "Aguardando Implantação" }
    }
    
    const badge = badges[cliente.status as keyof typeof badges] || badges.ativo
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando clientes...</span>
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
              <Users className="h-6 w-6 text-[#0F172A]" />
              Meus Clientes
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Gerencie os clientes vinculados à sua administradora
            </p>
          </div>
          <Button
            onClick={exportarRelatorioExcel}
            variant="outline"
            className="border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white rounded"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Nome
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                CPF
              </label>
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={filtroCpf}
                onChange={(e) => setFiltroCpf(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="aguardando_implantacao">Aguardando Implantação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={aplicarFiltros}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white flex-1"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button
                onClick={limparFiltros}
                variant="outline"
                className="border-gray-300"
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes ({resultadoClientes?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultadoClientes && resultadoClientes.clientes.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">CPF</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Produto</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Valor Mensal</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Data Vinculação</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoClientes.clientes.map((cliente) => (
                      <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{cliente.cliente_nome || "N/A"}</div>
                          <div className="text-xs text-gray-500">{cliente.cliente_email || ""}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{cliente.cliente_cpf || "N/A"}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900">{cliente.produto_nome || "N/A"}</div>
                          <div className="text-xs text-gray-500">{cliente.plano_nome || ""}</div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {formatarMoeda(cliente.valor_mensal)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(cliente)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatarData(cliente.data_vinculacao)}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            onClick={() => verCliente(cliente.id)}
                            variant="outline"
                            size="sm"
                            className="border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {resultadoClientes.total_paginas > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Página {resultadoClientes.pagina} de {resultadoClientes.total_paginas}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => alterarPagina(paginacao.pagina - 1)}
                      disabled={paginacao.pagina === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      onClick={() => alterarPagina(paginacao.pagina + 1)}
                      disabled={paginacao.pagina >= resultadoClientes.total_paginas}
                      variant="outline"
                      size="sm"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum cliente encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

