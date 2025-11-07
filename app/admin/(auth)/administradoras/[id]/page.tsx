"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { ClientesAdministradorasService, type ClienteAdministradoraCompleto, type FiltrosClientes, type PaginacaoClientes, type ResultadoClientes } from "@/services/clientes-administradoras-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building,
  ArrowLeft,
  Users,
  DollarSign,
  FileText,
  Settings,
  Search,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  User,
  CreditCard,
  Calendar,
  Mail,
  Download
} from "lucide-react"

export default function AdministradoraDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const administradoraId = params.id as string

  // Estados principais
  const [administradora, setAdministradora] = useState<Administradora | null>(null)
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
  const [filtroProduto, setFiltroProduto] = useState("")
  const [filtroStatusImplantacao, setFiltroStatusImplantacao] = useState<"todos" | "implantado" | "aguardando">("todos")

  useEffect(() => {
    if (administradoraId) {
      carregarDados()
    }
  }, [administradoraId, filtros, paginacao])

  async function carregarDados() {
    try {
      setLoading(true)

      const [admData, clientesData] = await Promise.all([
        AdministradorasService.buscarPorId(administradoraId),
        ClientesAdministradorasService.buscarPorAdministradora(administradoraId, filtros, paginacao)
      ])

      setAdministradora(admData)
      setResultadoClientes(clientesData)
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados da administradora")
    } finally {
      setLoading(false)
    }
  }

  function aplicarFiltros() {
    const novosFiltros: FiltrosClientes = {}
    
    if (filtroNome.trim()) novosFiltros.nome = filtroNome.trim()
    if (filtroCpf.trim()) novosFiltros.cpf = filtroCpf.trim()

    setFiltros(novosFiltros)
    setPaginacao(prev => ({ ...prev, pagina: 1 })) // Reset para primeira página
  }

  function limparFiltros() {
    setFiltroNome("")
    setFiltroCpf("")
    setFiltroProduto("")
    setFiltroStatusImplantacao("todos")
    setFiltros({})
    setPaginacao(prev => ({ ...prev, pagina: 1 }))
  }

  // Buscar todos os clientes (sem paginação) para exportação
  async function buscarTodosClientesParaExportacao() {
    try {
      const resultado = await ClientesAdministradorasService.buscarPorAdministradora(
        administradoraId,
        filtros,
        { pagina: 1, limite: 10000, ordenacao: { campo: 'cliente_nome', direcao: 'asc' } }
      )
      return resultado.clientes
    } catch (error) {
      console.error("❌ Erro ao buscar clientes para exportação:", error)
      toast.error("Erro ao buscar clientes para exportação")
      return []
    }
  }

  async function exportarRelatorioExcel() {
    try {
      toast.info("Preparando relatório...")
      
      // Buscar todos os clientes
      let clientes = await buscarTodosClientesParaExportacao()
      
      // Aplicar filtros locais (produto e status de implantação)
      if (filtroProduto && filtroProduto.trim()) {
        const filtroProdutoNormalizado = filtroProduto.trim().toLowerCase()
        clientes = clientes.filter(c => {
          const produtoNome = c.produto_nome?.trim().toLowerCase() || ""
          return produtoNome.includes(filtroProdutoNormalizado)
        })
      }
      
      if (filtroStatusImplantacao !== "todos") {
        if (filtroStatusImplantacao === "implantado") {
          clientes = clientes.filter(c => c.implantado === true)
        } else if (filtroStatusImplantacao === "aguardando") {
          clientes = clientes.filter(c => c.implantado === false || c.status === "aguardando_implantacao")
        }
      }

      if (clientes.length === 0) {
        toast.warning("Nenhum cliente encontrado com os filtros aplicados")
        return
      }

      // Preparar dados para o Excel
      const dadosExcel = clientes.map((cliente, index) => {
        const statusImplantacao = cliente.implantado === true 
          ? "Implantado" 
          : cliente.implantado === false 
            ? "Aguardando Implantação" 
            : cliente.status === "aguardando_implantacao"
              ? "Aguardando Implantação"
              : "Não informado"
        
        return {
          "Nº": index + 1,
          "Nome do Cliente": cliente.cliente_nome || "N/A",
          "CPF": cliente.cliente_cpf || "N/A",
          "Email": cliente.cliente_email || "N/A",
          "Telefone": cliente.cliente_telefone || "N/A",
          "Produto": cliente.produto_nome || "N/A",
          "Plano": cliente.plano_nome || "N/A",
          "Cobertura": cliente.cobertura || "N/A",
          "Acomodação": cliente.acomodacao || "N/A",
          "Status de Implantação": statusImplantacao,
          "Número da Carteirinha": cliente.numero_carteirinha || "N/A",
          "Valor Mensal": formatarValor(cliente.valor_mensal),
          "Data de Vinculação": formatarData(cliente.data_vinculacao),
          "Data de Vencimento": formatarData(cliente.data_vencimento),
          "Data de Vigência": formatarData(cliente.data_vigencia),
          "Dia de Vencimento": cliente.dia_vencimento || "N/A",
          "Número do Contrato": cliente.numero_contrato || "N/A",
          "Total de Faturas": cliente.total_faturas || 0,
          "Faturas Pagas": cliente.faturas_pagas || 0,
          "Faturas Atrasadas": cliente.faturas_atrasadas || 0,
          "Faturas Pendentes": cliente.faturas_pendentes || 0,
          "Observações": cliente.observacoes || "N/A"
        }
      })

      // Importar XLSX dinamicamente
      const XLSX = await import('xlsx')
      
      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosExcel)
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 5 },   // Nº
        { wch: 30 },  // Nome do Cliente
        { wch: 15 },  // CPF
        { wch: 30 },  // Email
        { wch: 15 },  // Telefone
        { wch: 25 },  // Produto
        { wch: 25 },  // Plano
        { wch: 20 },  // Cobertura
        { wch: 15 },  // Acomodação
        { wch: 25 },  // Status de Implantação
        { wch: 20 },  // Número da Carteirinha
        { wch: 15 },  // Valor Mensal
        { wch: 18 },  // Data de Vinculação
        { wch: 18 },  // Data de Vencimento
        { wch: 18 },  // Data de Vigência
        { wch: 15 },  // Dia de Vencimento
        { wch: 20 },  // Número do Contrato
        { wch: 15 },  // Total de Faturas
        { wch: 15 },  // Faturas Pagas
        { wch: 18 },  // Faturas Atrasadas
        { wch: 18 },  // Faturas Pendentes
        { wch: 40 }   // Observações
      ]
      ws['!cols'] = colWidths
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Clientes")
      
      // Gerar nome do arquivo
      const nomeArquivo = `relatorio_clientes_${administradora?.nome?.replace(/\s+/g, '_') || 'administradora'}_${new Date().toISOString().split('T')[0]}.xlsx`
      
      // Salvar arquivo
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

  function alterarOrdenacao(campo: 'cliente_nome' | 'data_vinculacao' | 'valor_mensal' | 'status') {
    setPaginacao(prev => ({
      ...prev,
      ordenacao: {
        campo,
        direcao: prev.ordenacao.campo === campo && prev.ordenacao.direcao === 'asc' ? 'desc' : 'asc'
      },
      pagina: 1
    }))
  }

  function verCliente(clienteId: string) {
    router.push(`/admin/administradoras/${administradoraId}/clientes/${clienteId}`)
  }

  const getStatusBadge = (cliente: ClienteAdministradoraCompleto) => {
    // Priorizar status de implantação sobre status geral
    if (cliente.implantado === true) {
      return (
        <Badge className="bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
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
    
    // Fallback para status tradicionais se implantado não estiver definido
    const badges = {
      ativo: { bg: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle, label: "Ativo" },
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

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando dados...</span>
        </div>
      </div>
    )
  }

  if (!administradora) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Administradora não encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 sm:py-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/administradoras")}
              className="flex items-center gap-2 border-gray-300 hover:border-gray-400 w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Voltar</span>
            </Button>
            <div className="flex-1 sm:flex-none">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                Detalhes da Administradora
              </h1>
              <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
                Gerencie clientes e configurações
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push(`/admin/administradoras/${administradoraId}/configuracoes`)}
            className="bg-[#168979] hover:bg-[#13786a] text-white border-0 w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="ml-2 sm:ml-0">Configurações</span>
          </Button>
        </div>
      </div>

      {/* Cards da Administradora e Clientes Ativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Card da Administradora */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <Building className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  {administradora.nome}
                </h2>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600 break-all">
                    <span className="font-medium">CNPJ:</span> {administradora.cnpj}
                  </p>
                  <p className="text-gray-600 break-all">
                    <span className="font-medium">Email:</span> {administradora.email}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Telefone:</span> {administradora.telefone}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Card - Apenas Clientes Ativos */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-white rounded-lg shadow-md">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-green-800 uppercase tracking-wide">
                    CLIENTES ATIVOS
                  </p>
                  <p className="text-[10px] sm:text-xs text-green-600 mt-0.5">
                    Clientes vinculados à administradora
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-bold text-green-700">
                  {resultadoClientes?.total || 0}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 bg-white rounded-lg p-2 sm:p-2.5">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Total de clientes cadastrados e ativos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-6">
          {/* Filtros */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Nome do Cliente
                    </label>
                    <Input
                      placeholder="Digite o nome..."
                      value={filtroNome}
                      onChange={(e) => setFiltroNome(e.target.value)}
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-sm h-10"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      CPF
                    </label>
                    <Input
                      placeholder="000.000.000-00"
                      value={filtroCpf}
                      onChange={(e) => setFiltroCpf(e.target.value)}
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-sm h-10"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={aplicarFiltros} 
                      className="bg-[#168979] hover:bg-[#13786a] text-white px-4 h-10 text-sm flex-1 sm:flex-none"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={limparFiltros} 
                      className="px-4 border-gray-300 hover:border-gray-400 h-10 text-sm flex-1 sm:flex-none"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                
                {/* Filtros para Exportação */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Produto (para exportação)
                      </label>
                      <Input
                        placeholder="Digite o nome do produto..."
                        value={filtroProduto}
                        onChange={(e) => setFiltroProduto(e.target.value)}
                        className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 text-sm h-10"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Status de Implantação
                      </label>
                      <Select 
                        value={filtroStatusImplantacao} 
                        onValueChange={(value: "todos" | "implantado" | "aguardando") => setFiltroStatusImplantacao(value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-gray-500 text-sm h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="implantado">Implantado</SelectItem>
                          <SelectItem value="aguardando">Aguardando Implantação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-auto">
                      <Button 
                        onClick={exportarRelatorioExcel}
                        className="bg-[#168979] hover:bg-[#13786a] text-white px-4 h-10 text-sm w-full sm:w-auto flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar Relatório Excel
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Os filtros de produto e status de implantação são aplicados apenas na exportação do relatório.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Clientes */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1">
                  <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                    Clientes Vinculados
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Total de <span className="font-semibold text-gray-800">{resultadoClientes?.total || 0}</span> cliente(s) encontrado(s)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Ordenar por:</span>
                  <Select 
                    value={`${paginacao.ordenacao.campo}-${paginacao.ordenacao.direcao}`}
                    onValueChange={(value) => {
                      const [campo, direcao] = value.split('-')
                      setPaginacao(prev => ({
                        ...prev,
                        ordenacao: {
                          campo: campo as any,
                          direcao: direcao as 'asc' | 'desc'
                        }
                      }))
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-56 border-gray-300 focus:border-gray-500 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_vinculacao-desc">Data Cadastro (Mais Recente)</SelectItem>
                      <SelectItem value="data_vinculacao-asc">Data Cadastro (Mais Antigo)</SelectItem>
                      <SelectItem value="cliente_nome-asc">Nome (A-Z)</SelectItem>
                      <SelectItem value="cliente_nome-desc">Nome (Z-A)</SelectItem>
                      <SelectItem value="valor_mensal-desc">Valor (Maior)</SelectItem>
                      <SelectItem value="valor_mensal-asc">Valor (Menor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {resultadoClientes?.clientes.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum cliente encontrado</p>
                  <p className="text-sm text-gray-500">Tente ajustar os filtros de busca</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {resultadoClientes?.clientes.map((cliente) => (
                    <div key={cliente.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                              {cliente.cliente_nome}
                            </h3>
                            {getStatusBadge(cliente)}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{cliente.cliente_email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{cliente.cliente_cpf}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="font-semibold text-green-600">{formatarValor(cliente.valor_mensal)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">Venc: {formatarData(cliente.data_vencimento)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verCliente(cliente.id)}
                          className="border-gray-300 hover:border-green-500 hover:text-green-600 w-full sm:w-auto text-xs h-8 sm:h-9"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Paginação */}
              {resultadoClientes && resultadoClientes.total_paginas > 1 && (() => {
                const paginaAtual = paginacao.pagina
                const totalPaginas = resultadoClientes.total_paginas
                const paginasParaMostrar: (number | string)[] = []

                // Sempre mostrar primeira página
                if (totalPaginas <= 7) {
                  // Se tiver 7 ou menos páginas, mostrar todas
                  for (let i = 1; i <= totalPaginas; i++) {
                    paginasParaMostrar.push(i)
                  }
                } else {
                  // Lógica para muitas páginas
                  paginasParaMostrar.push(1)

                  if (paginaAtual <= 3) {
                    // Páginas iniciais: 1, 2, 3, 4, ..., última
                    for (let i = 2; i <= 4; i++) {
                      paginasParaMostrar.push(i)
                    }
                    paginasParaMostrar.push('...')
                    paginasParaMostrar.push(totalPaginas)
                  } else if (paginaAtual >= totalPaginas - 2) {
                    // Páginas finais: 1, ..., penúltima-2, penúltima-1, penúltima, última
                    paginasParaMostrar.push('...')
                    for (let i = totalPaginas - 3; i <= totalPaginas; i++) {
                      paginasParaMostrar.push(i)
                    }
                  } else {
                    // Páginas do meio: 1, ..., atual-1, atual, atual+1, ..., última
                    paginasParaMostrar.push('...')
                    for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) {
                      paginasParaMostrar.push(i)
                    }
                    paginasParaMostrar.push('...')
                    paginasParaMostrar.push(totalPaginas)
                  }
                }

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                      Mostrando <span className="font-semibold text-gray-800">
                        {((paginacao.pagina - 1) * paginacao.limite) + 1}
                      </span>
                      {' '}a{' '}
                      <span className="font-semibold text-gray-800">
                        {Math.min(paginacao.pagina * paginacao.limite, resultadoClientes.total)}
                      </span>
                      {' '}de{' '}
                      <span className="font-semibold text-gray-800">
                        {resultadoClientes.total}
                      </span>
                      {' '}registros
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alterarPagina(paginacao.pagina - 1)}
                        disabled={paginacao.pagina === 1}
                        className="border-gray-300 hover:border-gray-500 hover:text-gray-700 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {paginasParaMostrar.map((page, index) => {
                          if (page === '...') {
                            return (
                              <span
                                key={`ellipsis-${index}`}
                                className="px-2 text-gray-400 text-xs sm:text-sm"
                              >
                                ...
                              </span>
                            )
                          }

                          const pageNum = page as number
                          const isActive = pageNum === paginaAtual

                          return (
                            <Button
                              key={pageNum}
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              onClick={() => alterarPagina(pageNum)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm ${
                                isActive 
                                  ? 'bg-[#168979] hover:bg-[#13786a] text-white' 
                                  : 'border-gray-300 hover:border-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alterarPagina(paginacao.pagina + 1)}
                        disabled={paginacao.pagina === resultadoClientes.total_paginas}
                        className="border-gray-300 hover:border-gray-500 hover:text-gray-700 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="informacoes">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Administradora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <p className="text-gray-900">{administradora.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">CNPJ</label>
                  <p className="text-gray-900">{administradora.cnpj}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{administradora.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefone</label>
                  <p className="text-gray-900">{administradora.telefone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}