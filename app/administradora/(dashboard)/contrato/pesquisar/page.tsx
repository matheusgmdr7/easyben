"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { buscarCorretores } from "@/services/corretores-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, ChevronDown, FileDown } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { Corretor } from "@/types/corretores"
import { useRouter } from "next/navigation"

interface Contrato {
  id: string
  titular?: string
  tipo?: string
  forma_pagamento?: string
  vencimento?: string
  valor?: number
  situacao_lancamento?: string
  situacao_boleto?: string
  liquidacao?: string
  pago?: boolean
  dias_atraso?: number
  convenio?: string
  corretor?: string
  data_emissao?: string
  data_liquidacao?: string
}

export default function PesquisarContratoPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [convenios, setConvenios] = useState<string[]>([])

  // Filtros
  const [convenioFiltro, setConvenioFiltro] = useState<string>("")
  const [corretorFiltro, setCorretorFiltro] = useState<string>("")
  const [dataEmissaoInicioFiltro, setDataEmissaoInicioFiltro] = useState<string>("")
  const [dataEmissaoFimFiltro, setDataEmissaoFimFiltro] = useState<string>("")
  const [dataLiquidacaoInicioFiltro, setDataLiquidacaoInicioFiltro] = useState<string>("")
  const [dataLiquidacaoFimFiltro, setDataLiquidacaoFimFiltro] = useState<string>("")
  const [dataVencimentoInicioFiltro, setDataVencimentoInicioFiltro] = useState<string>("")
  const [dataVencimentoFimFiltro, setDataVencimentoFimFiltro] = useState<string>("")
  const [situacoesFiltro, setSituacoesFiltro] = useState<string[]>([])
  const [statusBeneficiarioFiltro, setStatusBeneficiarioFiltro] = useState<string>("")

  // Resumo
  const [totalLancamentos, setTotalLancamentos] = useState(0)
  const [valorPrincipal, setValorPrincipal] = useState(0)
  const [valorLiquidado, setValorLiquidado] = useState(0)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      carregarCorretores()
      carregarConvenios()
    }
  }, [])

  async function carregarCorretores() {
    try {
      const data = await buscarCorretores()
      setCorretores(data)
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    }
  }

  async function carregarConvenios() {
    try {
      // TODO: Implementar busca de convênios cadastrados
      // Por enquanto, usar lista vazia
      setConvenios([])
    } catch (error) {
      console.error("Erro ao carregar convênios:", error)
    }
  }

  async function pesquisarContratos() {
    if (!administradoraId) return

    try {
      setLoading(true)

      // TODO: Implementar busca de contratos
      // Por enquanto, usar array vazio
      const contratosFiltrados: Contrato[] = []

      const total = contratosFiltrados.length
      const valor = contratosFiltrados.reduce((sum, c) => sum + (c.valor || 0), 0)
      const liquidado = contratosFiltrados
        .filter((c) => c.pago)
        .reduce((sum, c) => sum + (c.valor || 0), 0)

      setTotalLancamentos(total)
      setValorPrincipal(valor)
      setValorLiquidado(liquidado)

      setContratos(contratosFiltrados)
      setTotalPages(Math.ceil(contratosFiltrados.length / itemsPerPage))
    } catch (error: any) {
      console.error("Erro ao pesquisar contratos:", error)
      toast.error("Erro ao pesquisar contratos: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setConvenioFiltro("")
    setCorretorFiltro("")
    setDataEmissaoInicioFiltro("")
    setDataEmissaoFimFiltro("")
    setDataLiquidacaoInicioFiltro("")
    setDataLiquidacaoFimFiltro("")
    setDataVencimentoInicioFiltro("")
    setDataVencimentoFimFiltro("")
    setSituacoesFiltro([])
    setStatusBeneficiarioFiltro("")
    setCurrentPage(1)
    setContratos([])
    setTotalLancamentos(0)
    setValorPrincipal(0)
    setValorLiquidado(0)
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

  function getSituacaoBadge(situacao: string) {
    const situacaoMap: Record<string, { label: string; className: string }> = {
      liquidado: { label: "LIQUIDADO", className: "bg-green-100 text-green-800" },
      baixado: { label: "BAIXADO", className: "bg-blue-100 text-blue-800" },
      "em aberto": { label: "EM ABERTO", className: "bg-yellow-100 text-yellow-800" },
      cancelado: { label: "CANCELADO", className: "bg-red-100 text-red-800" },
    }

    const situacaoInfo = situacaoMap[situacao.toLowerCase()] || { label: situacao.toUpperCase(), className: "bg-gray-100 text-gray-800" }

    return (
      <Badge className={cn("font-semibold text-xs", situacaoInfo.className)}>
        {situacaoInfo.label}
      </Badge>
    )
  }

  function exportarPDF() {
    // TODO: Implementar exportação PDF
    toast.info("Funcionalidade de exportação PDF em desenvolvimento")
  }

  function exportarExcel() {
    // TODO: Implementar exportação Excel
    toast.info("Funcionalidade de exportação Excel em desenvolvimento")
  }

  const contratosPaginados = contratos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Pesquisa Lançamento Financeiro</h1>
        <Button
          onClick={() => router.push("/administradora/contrato/novo")}
          className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm flex items-center gap-2"
        >
          <span>+</span>
          Nova
        </Button>
      </div>

      {/* Filtros Simplificados */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Convênio</label>
            <div className="flex gap-1">
              <Input
                value={convenioFiltro}
                onChange={(e) => setConvenioFiltro(e.target.value)}
                placeholder="Buscar convênio"
                className="h-9 text-sm border-gray-300 rounded-sm flex-1"
              />
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
            <label className="block text-xs text-gray-600 mb-1">Corretor</label>
            <div className="flex gap-1">
              <Select value={corretorFiltro} onValueChange={setCorretorFiltro}>
                <SelectTrigger className="h-9 text-sm border-gray-300 rounded-sm flex-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {corretores.map((corretor) => (
                    <SelectItem key={corretor.id} value={corretor.id}>
                      {corretor.nome?.toUpperCase() || "-"}
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
            <label className="block text-xs text-gray-600 mb-1">Data Emissão Inicio</label>
            <Input
              type="date"
              value={dataEmissaoInicioFiltro}
              onChange={(e) => setDataEmissaoInicioFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Emissão Fim</label>
            <Input
              type="date"
              value={dataEmissaoFimFiltro}
              onChange={(e) => setDataEmissaoFimFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Liquidação Inicio</label>
            <Input
              type="date"
              value={dataLiquidacaoInicioFiltro}
              onChange={(e) => setDataLiquidacaoInicioFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Liquidação Fim</label>
            <Input
              type="date"
              value={dataLiquidacaoFimFiltro}
              onChange={(e) => setDataLiquidacaoFimFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Vencimento Inicio</label>
            <Input
              type="date"
              value={dataVencimentoInicioFiltro}
              onChange={(e) => setDataVencimentoInicioFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Vencimento Fim</label>
            <Input
              type="date"
              value={dataVencimentoFimFiltro}
              onChange={(e) => setDataVencimentoFimFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Situações</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-full justify-between text-sm border-gray-300 rounded-sm font-normal"
                >
                  {situacoesFiltro.length > 0
                    ? `${situacoesFiltro.length} selecionado(s)`
                    : "Selecione"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="start">
                <div className="space-y-2">
                  {["liquidado", "baixado", "em aberto", "cancelado"].map((situacao) => (
                    <div key={situacao} className="flex items-center space-x-2">
                      <Checkbox
                        id={`situacao-${situacao}`}
                        checked={situacoesFiltro.includes(situacao)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSituacoesFiltro([...situacoesFiltro, situacao])
                          } else {
                            setSituacoesFiltro(situacoesFiltro.filter((s) => s !== situacao))
                          }
                        }}
                      />
                      <label
                        htmlFor={`situacao-${situacao}`}
                        className="text-sm font-normal cursor-pointer capitalize"
                      >
                        {situacao}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Status Beneficiário</label>
            <Select value={statusBeneficiarioFiltro} onValueChange={setStatusBeneficiarioFiltro}>
              <SelectTrigger className="h-9 text-sm border-gray-300 rounded-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os beneficiários</SelectItem>
                <SelectItem value="ativo">Beneficiários ativos</SelectItem>
                <SelectItem value="inativo">Beneficiários inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de Ação Simplificados */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={pesquisarContratos}
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
            <span className="text-gray-600">Lançamentos: </span>
            <span className="font-semibold text-gray-800">{totalLancamentos}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor Principal: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(valorPrincipal)}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor Liquidado: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(valorLiquidado)}</span>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Titular</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Forma Pagamento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Vencimento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Situação Lançamento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Situação Boleto</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Liquidação</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Pago</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Dias Atraso</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : contratosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum lançamento encontrado
                    </td>
                  </tr>
                ) : (
                  contratosPaginados.map((contrato, index) => (
                    <tr
                      key={contrato.id}
                      className={cn(
                        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.id.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.titular || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.tipo || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.forma_pagamento || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(contrato.vencimento)}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800 border-r border-gray-200">{formatarMoeda(contrato.valor || 0)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getSituacaoBadge(contrato.situacao_lancamento || "")}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getSituacaoBadge(contrato.situacao_boleto || "")}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(contrato.liquidacao)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {contrato.pago ? (
                          <Badge className="bg-green-100 text-green-800 font-semibold text-xs">Sim</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 font-semibold text-xs">Não</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {contrato.dias_atraso && contrato.dias_atraso > 0 ? (
                          <Badge className="bg-red-100 text-red-800 font-semibold text-xs">
                            {contrato.dias_atraso} dias
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginação e Exportação */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &lt;&lt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &lt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &gt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &gt;&gt;
          </Button>
          <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-20 h-8 text-xs border-gray-300 rounded-sm">
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
        <div className="flex items-center gap-2">
          <Button
            onClick={exportarPDF}
            variant="outline"
            className="h-8 px-3 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm flex items-center gap-1"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Button
            onClick={exportarExcel}
            variant="outline"
            className="h-8 px-3 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm flex items-center gap-1"
          >
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>
    </div>
  )
}







