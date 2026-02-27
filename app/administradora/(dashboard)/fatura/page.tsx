"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { buscarCorretores } from "@/services/corretores-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, Edit, ChevronDown } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { Corretor } from "@/types/corretores"

interface FaturaCompleta extends Fatura {
  titular?: string
  beneficiario?: string
  corretor?: string
  coparticipacao?: number
  valor_liquidado?: number
  variacao?: number
  data_liquidacao?: string
  dias_atraso?: number
}

export default function FaturaPage() {
  const [faturas, setFaturas] = useState<FaturaCompleta[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])

  // Filtros
  const [grupoFiltro, setGrupoFiltro] = useState<string>("")
  const [beneficiarioFiltro, setBeneficiarioFiltro] = useState<string>("")
  const [corretorFiltro, setCorretorFiltro] = useState<string>("")
  const [referenciaFiltro, setReferenciaFiltro] = useState<string>("")
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>("")
  const [dataFimFiltro, setDataFimFiltro] = useState<string>("")
  const [dataLiquidacaoInicioFiltro, setDataLiquidacaoInicioFiltro] = useState<string>("")
  const [dataLiquidacaoFimFiltro, setDataLiquidacaoFimFiltro] = useState<string>("")
  const [dataVencimentoInicioFiltro, setDataVencimentoInicioFiltro] = useState<string>("")
  const [dataVencimentoFimFiltro, setDataVencimentoFimFiltro] = useState<string>("")
  const [statusFaturaFiltro, setStatusFaturaFiltro] = useState<string[]>([])
  const [statusBeneficiarioFiltro, setStatusBeneficiarioFiltro] = useState<string>("")
  const [somenteVencidas, setSomenteVencidas] = useState(false)

  // Resumo
  const [totalFaturas, setTotalFaturas] = useState(0)
  const [valorTotal, setValorTotal] = useState(0)
  const [valorCoparticipacao, setValorCoparticipacao] = useState(0)
  const [valorLiquidado, setValorLiquidado] = useState(0)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      carregarGrupos(administradora.id)
      carregarCorretores()
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

  async function carregarCorretores() {
    try {
      const data = await buscarCorretores()
      setCorretores(data)
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    }
  }

  async function pesquisarFaturas() {
    if (!administradoraId) return

    try {
      setLoading(true)

      const resultado = await FaturasService.buscarPorAdministradora(
        administradoraId,
        {
          data_inicio: dataInicioFiltro || undefined,
          data_fim: dataFimFiltro || undefined,
          page: 1,
          limit: 1000,
        }
      )

      if (!resultado) {
        throw new Error("Erro ao buscar faturas: resultado vazio")
      }

      let faturasFiltradas = resultado.faturas || []

      // Filtrar por status da fatura (múltiplos)
      if (statusFaturaFiltro.length > 0) {
        faturasFiltradas = faturasFiltradas.filter((f) => 
          statusFaturaFiltro.includes(f.status?.toLowerCase() || "")
        )
      }

      if (referenciaFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => 
          f.referencia?.toLowerCase().includes(referenciaFiltro.toLowerCase())
        )
      }

      if (beneficiarioFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => 
          f.cliente_nome?.toLowerCase().includes(beneficiarioFiltro.toLowerCase())
        )
      }

      // Filtrar por status do beneficiário
      if (statusBeneficiarioFiltro && statusBeneficiarioFiltro !== "todos") {
        // TODO: Implementar filtro por status do beneficiário quando houver relação
      }

      if (somenteVencidas) {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        faturasFiltradas = faturasFiltradas.filter((f) => {
          if (!f.data_vencimento) return false
          const vencimento = new Date(f.data_vencimento)
          vencimento.setHours(0, 0, 0, 0)
          return vencimento < hoje && f.status !== "paga"
        })
      }

      if (dataLiquidacaoInicioFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => {
          if (!f.data_pagamento) return false
          return new Date(f.data_pagamento) >= new Date(dataLiquidacaoInicioFiltro)
        })
      }
      if (dataLiquidacaoFimFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => {
          if (!f.data_pagamento) return false
          return new Date(f.data_pagamento) <= new Date(dataLiquidacaoFimFiltro)
        })
      }

      if (dataVencimentoInicioFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => {
          if (!f.data_vencimento) return false
          return new Date(f.data_vencimento) >= new Date(dataVencimentoInicioFiltro)
        })
      }
      if (dataVencimentoFimFiltro) {
        faturasFiltradas = faturasFiltradas.filter((f) => {
          if (!f.data_vencimento) return false
          return new Date(f.data_vencimento) <= new Date(dataVencimentoFimFiltro)
        })
      }

      const faturasCompletas = faturasFiltradas.map((fatura) => {
        let diasAtraso = 0
        if (fatura.data_vencimento && fatura.status !== "paga") {
          const hoje = new Date()
          const vencimento = new Date(fatura.data_vencimento)
          const diff = hoje.getTime() - vencimento.getTime()
          diasAtraso = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
        }

        return {
          ...fatura,
          titular: fatura.cliente_nome || "-",
          beneficiario: fatura.cliente_nome || "-",
          corretor: "-",
          coparticipacao: 0,
          valor_liquidado: fatura.valor_pago || 0,
          variacao: (fatura.valor_pago || 0) - (fatura.valor_total || 0),
          data_liquidacao: fatura.data_pagamento,
          dias_atraso: diasAtraso,
        }
      })

      const total = faturasCompletas.length
      const valor = faturasCompletas.reduce((sum, f) => sum + (f.valor_total || 0), 0)
      const coparticipacao = faturasCompletas.reduce((sum, f) => sum + (f.coparticipacao || 0), 0)
      const liquidado = faturasCompletas.reduce((sum, f) => sum + (f.valor_liquidado || 0), 0)

      setTotalFaturas(total)
      setValorTotal(valor)
      setValorCoparticipacao(coparticipacao)
      setValorLiquidado(liquidado)

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
    setBeneficiarioFiltro("")
    setCorretorFiltro("")
    setReferenciaFiltro("")
    setDataInicioFiltro("")
    setDataFimFiltro("")
    setDataLiquidacaoInicioFiltro("")
    setDataLiquidacaoFimFiltro("")
    setDataVencimentoInicioFiltro("")
    setDataVencimentoFimFiltro("")
    setStatusFaturaFiltro([])
    setStatusBeneficiarioFiltro("")
    setSomenteVencidas(false)
    setCurrentPage(1)
    setFaturas([])
    setTotalFaturas(0)
    setValorTotal(0)
    setValorCoparticipacao(0)
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

  function getStatusBadge(status: string) {
    const baseClass = "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border"
    const statusMap: Record<string, { label: string; className: string }> = {
      liquidado: { label: "Liquidado", className: "bg-slate-100 text-slate-800 border-slate-300" },
      cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-600 border-gray-300" },
      faturado: { label: "Faturado", className: "bg-slate-100 text-slate-800 border-slate-300" },
      processado: { label: "Processado", className: "bg-amber-50 text-amber-800 border-amber-200" },
      baixado: { label: "Baixado", className: "bg-slate-100 text-slate-800 border-slate-300" },
      paga: { label: "Paga", className: "bg-slate-100 text-slate-800 border-slate-300" },
      pendente: { label: "Pendente", className: "bg-amber-50 text-amber-800 border-amber-200" },
      atrasada: { label: "Atrasada", className: "bg-gray-100 text-gray-600 border-gray-300" },
    }
    const statusInfo = statusMap[status.toLowerCase()] || { label: status, className: "bg-gray-100 text-gray-600 border-gray-300" }
    return <span className={cn(baseClass, statusInfo.className)}>{statusInfo.label}</span>
  }

  const faturasPaginadas = faturas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Pesquisar Faturas</h1>
      </div>

      {/* Filtros Simplificados */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo Beneficiário</label>
            <div className="flex gap-1">
              <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
                <SelectTrigger className="h-10 flex-1 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
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
            <label className="block text-xs text-gray-600 mb-1">Beneficiário</label>
            <div className="flex gap-1">
              <Input
                value={beneficiarioFiltro}
                onChange={(e) => setBeneficiarioFiltro(e.target.value)}
                placeholder="Nome"
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
                <SelectTrigger className="h-10 flex-1 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
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
            <label className="block text-xs text-gray-600 mb-1">Referência</label>
            <Input
              value={referenciaFiltro}
              onChange={(e) => setReferenciaFiltro(e.target.value)}
              placeholder="Ex: 12/2025"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Inicio</label>
            <Input
              type="date"
              value={dataInicioFiltro}
              onChange={(e) => setDataInicioFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
            <Input
              type="date"
              value={dataFimFiltro}
              onChange={(e) => setDataFimFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Inicio Data Liquidação</label>
            <Input
              type="date"
              value={dataLiquidacaoInicioFiltro}
              onChange={(e) => setDataLiquidacaoInicioFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Fim Data Liquidação</label>
            <Input
              type="date"
              value={dataLiquidacaoFimFiltro}
              onChange={(e) => setDataLiquidacaoFimFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Inicio Data Vencimento</label>
            <Input
              type="date"
              value={dataVencimentoInicioFiltro}
              onChange={(e) => setDataVencimentoInicioFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Fim Data Vencimento</label>
            <Input
              type="date"
              value={dataVencimentoFimFiltro}
              onChange={(e) => setDataVencimentoFimFiltro(e.target.value)}
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Status Fatura</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-full justify-between text-sm border-gray-300 rounded-sm font-normal"
                >
                  {statusFaturaFiltro.length > 0
                    ? `${statusFaturaFiltro.length} selecionado(s)`
                    : "Selecione"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="start">
                <div className="space-y-2">
                  {["liquidado", "cancelado", "faturado", "processado", "baixado"].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={statusFaturaFiltro.includes(status)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setStatusFaturaFiltro([...statusFaturaFiltro, status])
                          } else {
                            setStatusFaturaFiltro(statusFaturaFiltro.filter((s) => s !== status))
                          }
                        }}
                      />
                      <label
                        htmlFor={`status-${status}`}
                        className="text-sm font-normal cursor-pointer capitalize"
                      >
                        {status}
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
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os beneficiários</SelectItem>
                <SelectItem value="ativo">Beneficiários ativos</SelectItem>
                <SelectItem value="inativo">Beneficiários inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="somente-vencidas"
                checked={somenteVencidas}
                onCheckedChange={(checked) => setSomenteVencidas(checked === true)}
              />
              <label
                htmlFor="somente-vencidas"
                className="text-xs text-gray-600 cursor-pointer"
              >
                Somente Faturas Vencidas
              </label>
            </div>
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
            <span className="text-gray-600">Faturas: </span>
            <span className="font-semibold text-gray-800">{totalFaturas}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(valorTotal)}</span>
          </div>
          <div>
            <span className="text-gray-600">Valor Coparticição: </span>
            <span className="font-semibold text-gray-800">{formatarMoeda(valorCoparticipacao)}</span>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Titular</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Fatura</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Referência</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Vencimento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Coparticipacao</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Valor Liquidado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Variação</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Liquidação</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Dias Atraso</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Editar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : faturasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
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
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.titular || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.numero_fatura || fatura.id.slice(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {getStatusBadge(fatura.status)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{fatura.referencia || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(fatura.data_vencimento)}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800 border-r border-gray-200">{formatarMoeda(fatura.valor_total)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarMoeda(fatura.coparticipacao || 0)}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarMoeda(fatura.valor_liquidado || 0)}</td>
                      <td className={cn(
                        "px-4 py-2 text-sm font-medium border-r border-gray-200",
                        (fatura.variacao || 0) > 0 ? "text-green-600" : (fatura.variacao || 0) < 0 ? "text-red-600" : "text-gray-600"
                      )}>
                        {formatarMoeda(fatura.variacao || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(fatura.data_liquidacao)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {fatura.dias_atraso && fatura.dias_atraso > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-gray-100 text-gray-600 border-gray-300">
                            {fatura.dias_atraso} dias
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                          title="Editar"
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
