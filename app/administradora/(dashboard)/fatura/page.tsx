"use client"

import { useState, useEffect, useMemo } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
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

type Corretor = { id: string; nome: string }

interface FaturaCompleta {
  id: string
  titular?: string
  beneficiario?: string
  corretor?: string
  numero_fatura?: string | null
  referencia?: string | null
  status: string
  data_vencimento?: string | null
  valor_total: number
  coparticipacao?: number
  valor_liquidado?: number
  variacao?: number
  data_liquidacao?: string | null
  dias_atraso?: number
}

export default function FaturaPage() {
  const [faturas, setFaturas] = useState<FaturaCompleta[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])

  // Filtros
  const [grupoFiltro, setGrupoFiltro] = useState<string>("todos")
  const [beneficiarioFiltro, setBeneficiarioFiltro] = useState<string>("")
  const [corretorFiltro, setCorretorFiltro] = useState<string>("todos")
  const [referenciaFiltro, setReferenciaFiltro] = useState<string>("")
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>("")
  const [dataFimFiltro, setDataFimFiltro] = useState<string>("")
  const [dataLiquidacaoInicioFiltro, setDataLiquidacaoInicioFiltro] = useState<string>("")
  const [dataLiquidacaoFimFiltro, setDataLiquidacaoFimFiltro] = useState<string>("")
  const [dataVencimentoInicioFiltro, setDataVencimentoInicioFiltro] = useState<string>("")
  const [dataVencimentoFimFiltro, setDataVencimentoFimFiltro] = useState<string>("")
  const [statusFaturaFiltro, setStatusFaturaFiltro] = useState<string[]>([])
  const [statusBeneficiarioFiltro, setStatusBeneficiarioFiltro] = useState<string>("todos")
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
      carregarCorretores(administradora.id)
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

  async function carregarCorretores(admId: string) {
    try {
      const res = await fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(admId)}`)
      if (res.ok) {
        const data = await res.json()
        setCorretores(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    }
  }

  function temAlgumFiltroPreenchido() {
    if (grupoFiltro && grupoFiltro !== "todos") return true
    if (beneficiarioFiltro.trim()) return true
    if (corretorFiltro && corretorFiltro !== "todos") return true
    if (referenciaFiltro.trim()) return true
    if (dataInicioFiltro || dataFimFiltro) return true
    if (dataLiquidacaoInicioFiltro || dataLiquidacaoFimFiltro) return true
    if (dataVencimentoInicioFiltro || dataVencimentoFimFiltro) return true
    if (statusFaturaFiltro.length > 0) return true
    if (statusBeneficiarioFiltro && statusBeneficiarioFiltro !== "todos") return true
    if (somenteVencidas) return true
    return false
  }

  async function pesquisarFaturas(pagina = 1, limitOverride?: number) {
    if (!administradoraId) return

    if (!temAlgumFiltroPreenchido()) {
      toast.error("Preencha ao menos um filtro para pesquisar.")
      return
    }

    try {
      setLoading(true)
      const url = new URL("/api/administradora/fatura/pesquisar", window.location.origin)
      url.searchParams.set("administradora_id", administradoraId)
      url.searchParams.set("page", String(pagina))
      url.searchParams.set("limit", String(limitOverride ?? itemsPerPage))

      if (grupoFiltro && grupoFiltro !== "todos") url.searchParams.set("grupo_id", grupoFiltro)
      if (beneficiarioFiltro.trim()) url.searchParams.set("beneficiario", beneficiarioFiltro.trim())
      if (corretorFiltro && corretorFiltro !== "todos") url.searchParams.set("corretor_id", corretorFiltro)
      if (referenciaFiltro.trim()) url.searchParams.set("referencia", referenciaFiltro.trim())
      if (dataInicioFiltro) url.searchParams.set("data_inicio", dataInicioFiltro)
      if (dataFimFiltro) url.searchParams.set("data_fim", dataFimFiltro)
      if (dataLiquidacaoInicioFiltro) url.searchParams.set("pagamento_inicio", dataLiquidacaoInicioFiltro)
      if (dataLiquidacaoFimFiltro) url.searchParams.set("pagamento_fim", dataLiquidacaoFimFiltro)
      if (dataVencimentoInicioFiltro) url.searchParams.set("vencimento_inicio", dataVencimentoInicioFiltro)
      if (dataVencimentoFimFiltro) url.searchParams.set("vencimento_fim", dataVencimentoFimFiltro)
      if (statusFaturaFiltro.length > 0) url.searchParams.set("status_fatura", statusFaturaFiltro.join(","))
      if (statusBeneficiarioFiltro && statusBeneficiarioFiltro !== "todos") {
        url.searchParams.set("status_beneficiario", statusBeneficiarioFiltro)
      }
      if (somenteVencidas) url.searchParams.set("somente_vencidas", "1")

      const res = await fetch(url.toString(), { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao buscar faturas")
      }

      const lista = Array.isArray(data?.linhas) ? (data.linhas as FaturaCompleta[]) : []
      setFaturas(lista)
      setTotalFaturas(Number(data?.total_registros ?? lista.length))
      setValorTotal(Number(data?.total_valor ?? 0))
      setValorCoparticipacao(0)
      setValorLiquidado(Number(data?.total_liquidado ?? 0))
      setCurrentPage(Number(data?.page ?? pagina))
      setTotalPages(Math.max(0, Number(data?.total_pages ?? 0)))

      if (Number(data?.total_registros ?? 0) === 0) {
        toast.info("Nenhuma fatura encontrada com os filtros informados.")
      }
    } catch (error: unknown) {
      console.error("Erro ao pesquisar faturas:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao pesquisar faturas")
      setFaturas([])
      setTotalFaturas(0)
      setValorTotal(0)
      setValorCoparticipacao(0)
      setValorLiquidado(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setGrupoFiltro("todos")
    setBeneficiarioFiltro("")
    setCorretorFiltro("todos")
    setReferenciaFiltro("")
    setDataInicioFiltro("")
    setDataFimFiltro("")
    setDataLiquidacaoInicioFiltro("")
    setDataLiquidacaoFimFiltro("")
    setDataVencimentoInicioFiltro("")
    setDataVencimentoFimFiltro("")
    setStatusFaturaFiltro([])
    setStatusBeneficiarioFiltro("todos")
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

  function irParaPagina(pagina: number) {
    setCurrentPage(pagina)
    pesquisarFaturas(pagina)
  }

  const faturasPaginadas = faturas

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Pesquisar Faturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Informe ao menos um filtro (nome do beneficiário, grupo, corretor, datas, etc.) para localizar faturas.
        </p>
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
                  <SelectItem value="todos">Todos os grupos</SelectItem>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") pesquisarFaturas(1)
                }}
                placeholder="Nome, CPF ou nº da fatura"
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
                  <SelectItem value="todos">Todos os corretores</SelectItem>
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
            onClick={() => pesquisarFaturas(1)}
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
                onClick={() => irParaPagina(1)}
                disabled={currentPage === 1 || loading}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => irParaPagina(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
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
                onClick={() => irParaPagina(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || loading}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Próxima
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => irParaPagina(totalPages)}
                disabled={currentPage >= totalPages || loading}
                className="h-8 px-3 text-xs border-gray-300"
              >
                Última
              </Button>
            </div>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => {
                const novo = Number(v)
                setItemsPerPage(novo)
                setCurrentPage(1)
                if (temAlgumFiltroPreenchido()) pesquisarFaturas(1, novo)
              }}
            >
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
