"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
import FaturasAsaasService from "@/services/faturas-asaas-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wallet,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Plus,
  RefreshCw,
  Users,
  Calendar,
  XCircle,
  Building,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatarMoeda } from "@/utils/formatters"
import { supabase } from "@/lib/supabase"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

export default function FinanceiroPage() {
  const router = useRouter()
  const [administradoras, setAdministradoras] = useState<Administradora[]>([])
  const [administradoraSelecionada, setAdministradoraSelecionada] = useState<string>("todas")
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gerandoFaturas, setGerandoFaturas] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalFaturas, setTotalFaturas] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Filtros
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [mesReferencia, setMesReferencia] = useState("")
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>("")
  const [dataFimFiltro, setDataFimFiltro] = useState<string>("")
  
  // Ordenação
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({
    campo: 'vencimento',
    direcao: 'desc'
  })

  // Modal gerar faturas
  const [showModalGerar, setShowModalGerar] = useState(false)
  const [admGerarFaturas, setAdmGerarFaturas] = useState("")
  const [referenciaGerar, setReferenciaGerar] = useState("")
  const [diaVencimento, setDiaVencimento] = useState("10")
  const [tipoCobranca, setTipoCobranca] = useState<"BOLETO" | "PIX" | "CREDIT_CARD">("BOLETO")
  const [descricaoFatura, setDescricaoFatura] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (administradoraSelecionada) {
      setCurrentPage(1) // Reset para primeira página quando mudar filtros
      carregarFaturas()
    }
  }, [administradoraSelecionada, statusFiltro, dataInicioFiltro, dataFimFiltro, ordenacao])

  useEffect(() => {
    if (administradoraSelecionada) {
      carregarFaturas()
    }
  }, [currentPage, itemsPerPage])

  async function carregarDados() {
    try {
      setLoading(true)
      const admData = await AdministradorasService.buscarTodas({ status: "ativa" })
      setAdministradoras(admData)

      if (admData.length > 0) {
        setAdministradoraSelecionada(admData[0].id)
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados financeiros")
    } finally {
      setLoading(false)
    }
  }

  async function carregarFaturas() {
    if (!administradoraSelecionada || administradoraSelecionada === "todas") return

    try {
      const filtros: any = {
        page: currentPage,
        limit: itemsPerPage
      }
      
      if (statusFiltro !== "todos") {
        filtros.status = statusFiltro
      }

      // Adicionar filtros de data
      if (dataInicioFiltro) {
        filtros.data_inicio = dataInicioFiltro
      }
      if (dataFimFiltro) {
        filtros.data_fim = dataFimFiltro
      }

      const resultado = await FaturasService.buscarPorAdministradora(
        administradoraSelecionada,
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
          case 'emissao':
            aValue = new Date(a.created_at || 0).getTime()
            bValue = new Date(b.created_at || 0).getTime()
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

      // Carregar estatísticas com os mesmos filtros de data
      const statsFilters: any = {}
      if (dataInicioFiltro) {
        statsFilters.data_inicio = dataInicioFiltro
      }
      if (dataFimFiltro) {
        statsFilters.data_fim = dataFimFiltro
      }
      const stats = await FaturasService.buscarEstatisticas(administradoraSelecionada, statsFilters)
      setEstatisticas(stats)
    } catch (error: any) {
      console.error("❌ Erro ao carregar faturas:", error)
      toast.error("Erro ao carregar faturas")
    }
  }

  async function handleGerarFaturas() {
    if (!admGerarFaturas || !referenciaGerar) {
      toast.error("Selecione a administradora e a referência")
      return
    }

    try {
      setGerandoFaturas(true)
      
      // Gerar faturas via Asaas
      const resultado = await FaturasAsaasService.gerarFaturasLote({
        administradora_id: admGerarFaturas,
        mes_referencia: referenciaGerar,
        dia_vencimento: parseInt(diaVencimento),
        tipo_cobranca: tipoCobranca,
        descricao: descricaoFatura || `Mensalidade referente a ${referenciaGerar}`,
        enviar_notificacao: true
      })

      // Mostrar resultado detalhado
      if (resultado.erros > 0) {
        toast.warning(
          `Faturas geradas parcialmente: ${resultado.sucesso} criadas, ${resultado.erros} erros`,
          {
            description: resultado.erros_detalhados.slice(0, 3).map(e => `${e.cliente_nome}: ${e.erro}`).join('\n')
          }
        )
      } else {
        toast.success(
          `✅ ${resultado.sucesso} faturas geradas com sucesso!`,
          {
            description: `Todas as faturas foram criadas no Asaas`
          }
        )
      }

      setShowModalGerar(false)
      setAdmGerarFaturas("")
      setReferenciaGerar("")
      setDescricaoFatura("")
      carregarFaturas()
    } catch (error: any) {
      console.error("❌ Erro ao gerar faturas:", error)
      toast.error("Erro ao gerar faturas: " + error.message)
    } finally {
      setGerandoFaturas(false)
    }
  }

  async function handleAtualizar() {
    if (administradoraSelecionada === "todas") {
      toast.error("Selecione uma administradora específica para atualizar")
      return
    }

    try {
      setSincronizando(true)
      toast.info("Atualizando dados... Isso pode levar alguns minutos")

      // 1. Atualizar faturas vencidas para atrasadas
      console.log("📊 Atualizando faturas vencidas...")
      const quantidadeAtrasadas = await FaturasService.atualizarFaturasVencidas()
      console.log(`✅ ${quantidadeAtrasadas} faturas marcadas como atrasadas`)

      // 2. Sincronizar status com o Asaas
      console.log("🔄 Sincronizando status com o Asaas...")
      const response = await fetch('/api/sincronizar-status-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          administradora_id: administradoraSelecionada
        })
      })

      if (response.ok) {
        const resultado = await response.json()
        console.log("✅ Resultado da sincronização:", resultado)
        
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
        // Se a sincronização falhar, apenas mostra o resultado das atrasadas
        toast.success(`✅ ${quantidadeAtrasadas} faturas marcadas como atrasadas`)
      }

      // 3. Recarregar faturas e estatísticas
      await carregarFaturas()
    } catch (error: any) {
      console.error("❌ Erro ao atualizar:", error)
      toast.error(`Erro ao atualizar: ${error.message}`)
    } finally {
      setSincronizando(false)
    }
  }

  async function handleRegistrarPagamento(faturaId: string) {
    const valor = prompt("Digite o valor pago:")
    if (!valor) return

    const forma = prompt("Forma de pagamento (boleto, pix, dinheiro, transferencia):")
    if (!forma) return

    try {
      await FaturasService.registrarPagamento(faturaId, {
        valor_pago: Number.parseFloat(valor.replace(",", ".")),
        forma_pagamento: forma,
      })
      toast.success("Pagamento registrado com sucesso!")
      carregarFaturas()
    } catch (error) {
      console.error("❌ Erro ao registrar pagamento:", error)
      toast.error("Erro ao registrar pagamento")
    }
  }

  // Gerar referência padrão (mês atual)
  useEffect(() => {
    const hoje = new Date()
    const mes = String(hoje.getMonth() + 1).padStart(2, "0")
    const ano = hoje.getFullYear()
    setReferenciaGerar(`${mes}/${ano}`)
  }, [])

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: { bg: "bg-yellow-100 text-yellow-800", icon: Clock },
      paga: { bg: "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]", icon: CheckCircle },
      atrasada: { bg: "bg-red-100 text-red-800", icon: AlertCircle },
      cancelada: { bg: "bg-gray-100 text-gray-800", icon: FileText },
      parcialmente_paga: { bg: "bg-blue-100 text-blue-800", icon: DollarSign },
    }
    return badges[status as keyof typeof badges] || badges.pendente
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
              Gestão de faturas, pagamentos e fluxo de caixa
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowModalGerar(true)}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold btn-corporate shadow-corporate flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Gerar Faturas
            </Button>
            <Button 
              onClick={handleAtualizar} 
              disabled={sincronizando || administradoraSelecionada === "todas"}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
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
                    R$ {estatisticas.valor_pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Faturas a receber</p>
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
                    R$ {estatisticas.valor_atrasado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Faturas vencidas</p>
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
                    R$ {estatisticas.valor_recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Recebimentos confirmados</p>
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
                    R$ {estatisticas.valor_em_aberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {estatisticas.total_em_aberto} faturas
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Valor a receber</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros e Seleção */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 sm:p-4">
        {/* Botões de período rápido */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
            Período Rápido
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const hoje = new Date()
                const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
                setDataInicioFiltro(primeiroDia.toISOString().split('T')[0])
                setDataFimFiltro(ultimoDia.toISOString().split('T')[0])
              }}
              className="h-8 text-xs px-2 sm:px-3 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
            >
              Este Mês
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const hoje = new Date()
                const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
                const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
                setDataInicioFiltro(mesAnterior.toISOString().split('T')[0])
                setDataFimFiltro(ultimoDiaMesAnterior.toISOString().split('T')[0])
              }}
              className="h-8 text-xs px-2 sm:px-3 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
            >
              Mês Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const hoje = new Date()
                const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1)
                setDataInicioFiltro(primeiroDiaAno.toISOString().split('T')[0])
                setDataFimFiltro(hoje.toISOString().split('T')[0])
              }}
              className="h-8 text-xs px-2 sm:px-3 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
            >
              Ano Atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDataInicioFiltro("")
                setDataFimFiltro("")
              }}
              className="h-8 text-xs px-2 sm:px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Limpar
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Administradora
            </label>
            <Select
              value={administradoraSelecionada}
              onValueChange={setAdministradoraSelecionada}
            >
              <SelectTrigger className="h-9 text-sm border-2 border-gray-300 focus:border-[#0F172A]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {administradoras.map((adm) => (
                  <SelectItem key={adm.id} value={adm.id}>
                    {adm.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Data Início
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={dataInicioFiltro}
                onChange={(e) => setDataInicioFiltro(e.target.value)}
                className="h-9 text-sm pl-8 border-2 border-gray-300 focus:border-[#0F172A]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Data Fim
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={dataFimFiltro}
                onChange={(e) => setDataFimFiltro(e.target.value)}
                className="h-9 text-sm pl-8 border-2 border-gray-300 focus:border-[#0F172A]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Status
            </label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-9 text-sm border-2 border-gray-300 focus:border-[#0F172A]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <CardTitle>Lista de Faturas</CardTitle>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Ordenar por:</label>
              <Select
                value={`${ordenacao.campo}-${ordenacao.direcao}`}
                onValueChange={(value) => {
                  const [campo, direcao] = value.split('-')
                  setOrdenacao({ campo, direcao: direcao as 'asc' | 'desc' })
                  setCurrentPage(1) // Reset para primeira página ao mudar ordenação
                }}
              >
                <SelectTrigger className="h-9 w-[200px] text-sm border-2 border-gray-300 focus:border-[#0F172A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vencimento-desc">Vencimento (Mais Recente)</SelectItem>
                  <SelectItem value="vencimento-asc">Vencimento (Mais Antigo)</SelectItem>
                  <SelectItem value="valor-desc">Valor (Maior)</SelectItem>
                  <SelectItem value="valor-asc">Valor (Menor)</SelectItem>
                  <SelectItem value="cliente-asc">Cliente (A-Z)</SelectItem>
                  <SelectItem value="cliente-desc">Cliente (Z-A)</SelectItem>
                  <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                  <SelectItem value="status-desc">Status (Z-A)</SelectItem>
                  <SelectItem value="emissao-desc">Emissão (Mais Recente)</SelectItem>
                  <SelectItem value="emissao-asc">Emissão (Mais Antigo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faturas.map((fatura) => {
              const StatusInfo = getStatusBadge(fatura.status)
              const StatusIcon = StatusInfo.icon

              return (
                <div
                  key={fatura.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-gray-900 text-base">
                            {fatura.numero_fatura || `Fatura ${fatura.cliente_nome?.split(' ')[0] || 'Cliente'} - ${new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}`}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${StatusInfo.bg}`}>
                            <StatusIcon className="h-3 w-3" />
                            {fatura.status}
                          </span>
                          {fatura.referencia && (
                            <span className="text-xs text-gray-500">
                              Ref: {fatura.referencia}
                            </span>
                          )}
                        </div>
                        {fatura.cliente_nome && (
                          <p className="text-sm text-gray-600 font-medium">
                            Cliente: {fatura.cliente_nome}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Valor Total</p>
                          <p className="font-semibold text-lg text-gray-900">
                            R$ {fatura.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Vencimento</p>
                          <p className="font-medium">
                            {new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                          <div>
                            <p className="text-gray-600">Emissão</p>
                            <p className="font-medium">
                              {new Date(fatura.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Valor Pago</p>
                            <p className="font-medium text-[#0F172A]">
                              R$ {fatura.pagamento_valor?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                            </p>
                          </div>
                        </div>

                        {/* Seção de multa e juros - comentada até implementar esses campos
                        {(fatura.valor_multa && fatura.valor_multa > 0 || fatura.valor_juros && fatura.valor_juros > 0) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-red-600">
                              Multa: R$ {fatura.valor_multa?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"} | 
                              Juros: R$ {fatura.valor_juros?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                            </p>
                          </div>
                        )}
                        */}
                      </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
                      {fatura.status !== "paga" && fatura.status !== "pago" && fatura.status !== "cancelada" && (
                        <Button
                          onClick={() => handleRegistrarPagamento(fatura.id)}
                          size="sm"
                          className="bg-[#0F172A] hover:bg-[#0F172A] text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Registrar Pagamento
                        </Button>
                      )}
                      {(fatura.asaas_boleto_url || fatura.boleto_url || fatura.asaas_invoice_url) && (
                        <Button
                          onClick={() => window.open(fatura.asaas_boleto_url || fatura.boleto_url || fatura.asaas_invoice_url, "_blank")}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {fatura.asaas_boleto_url ? "Boleto" : "Fatura"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50 mt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="ml-1">Anterior</span>
                    </Button>

                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
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
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                    >
                      <span className="mr-1">Próxima</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {faturas.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhuma fatura encontrada</p>
              <p className="text-gray-500 text-sm mt-2">
                {statusFiltro !== "todos"
                  ? "Tente ajustar os filtros de busca"
                  : "Gere faturas mensais para visualizar aqui"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showModalGerar && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Gerar Faturas Mensais</h3>
                    <p className="text-white/80 text-sm">Configure os parâmetros para geração automática</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setShowModalGerar(false)
                    setAdmGerarFaturas("")
                    setReferenciaGerar("")
                    setDescricaoFatura("")
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">

                {/* Administradora */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Administradora <span className="text-red-500">*</span>
                  </label>
                  <Select value={admGerarFaturas} onValueChange={setAdmGerarFaturas}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg">
                      <SelectValue placeholder="Selecione a administradora..." />
                    </SelectTrigger>
                    <SelectContent>
                      {administradoras.map((adm) => (
                        <SelectItem key={adm.id} value={adm.id} className="py-3">
                          <div className="flex items-center gap-3">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{adm.nome}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid de campos principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Referência */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Referência (Mês/Ano) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="month"
                      value={referenciaGerar}
                      onChange={(e) => setReferenciaGerar(e.target.value)}
                      className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                      placeholder="2025-01"
                    />
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Selecione o mês e ano de referência
                    </p>
                  </div>

                  {/* Dia de Vencimento */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Dia de Vencimento <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={diaVencimento}
                      onChange={(e) => setDiaVencimento(e.target.value)}
                      className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Dia do mês para vencimento (1-31)
                    </p>
                  </div>
                </div>

                {/* Tipo de Cobrança */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Tipo de Cobrança <span className="text-red-500">*</span>
                  </label>
                  <Select value={tipoCobranca} onValueChange={(value: any) => setTipoCobranca(value)}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOLETO" className="py-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Boleto Bancário</span>
                          <span className="text-xs text-gray-500 ml-auto">Tradicional</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PIX" className="py-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-[#0F172A]" />
                          <span className="font-medium">PIX</span>
                          <span className="text-xs text-gray-500 ml-auto">Instantâneo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="CREDIT_CARD" className="py-3">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Cartão de Crédito</span>
                          <span className="text-xs text-gray-500 ml-auto">Online</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Descrição da Fatura
                    <span className="text-gray-500 font-normal text-xs ml-2">(Opcional)</span>
                  </label>
                  <Input
                    value={descricaoFatura}
                    onChange={(e) => setDescricaoFatura(e.target.value)}
                    className="h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg"
                    placeholder="Ex: Mensalidade do plano de saúde - Janeiro 2025"
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Esta descrição aparecerá na fatura do cliente
                  </p>
                </div>

                {/* Informações da Integração */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-blue-900 mb-3">
                        🚀 Integração Automática com Asaas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          <span>Clientes criados automaticamente</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          <span>Boletos/PIX gerados</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          <span>Notificações enviadas</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          <span>Pagamentos atualizados</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview da operação */}
                {admGerarFaturas && referenciaGerar && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-[#7BD9F6] border-opacity-30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-[#7BD9F6] bg-opacity-30 rounded-lg">
                        <Users className="h-5 w-5 text-[#0F172A]" />
                      </div>
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        📊 Resumo da Operação
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-[#0F172A]">Administradora</div>
                        <div className="text-[#0F172A] mt-1">
                          {administradoras.find(a => a.id === admGerarFaturas)?.nome}
                        </div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-[#0F172A]">Referência</div>
                        <div className="text-[#0F172A] mt-1">
                          {referenciaGerar ? new Date(referenciaGerar + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Não selecionado'}
                        </div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-[#0F172A]">Vencimento</div>
                        <div className="text-[#0F172A] mt-1">
                          Dia {diaVencimento || 'não definido'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  onClick={() => {
                    setShowModalGerar(false)
                    setAdmGerarFaturas("")
                    setReferenciaGerar("")
                    setDescricaoFatura("")
                  }}
                  variant="outline"
                  className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400"
                  disabled={gerandoFaturas}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGerarFaturas}
                  disabled={gerandoFaturas || !admGerarFaturas || !referenciaGerar}
                  className="h-12 px-8 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#0f6b5c] text-white font-bold shadow-lg"
                >
                  {gerandoFaturas ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-corporate-small"></div>
                      Gerando Faturas...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Gerar Faturas
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
