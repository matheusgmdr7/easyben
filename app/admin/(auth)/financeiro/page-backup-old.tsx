"use client"

import { useState, useEffect } from "react"
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
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
  Calendar
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function FinanceiroPage() {
  const [administradoras, setAdministradoras] = useState<Administradora[]>([])
  const [administradoraSelecionada, setAdministradoraSelecionada] = useState<string>("todas")
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gerandoFaturas, setGerandoFaturas] = useState(false)
  
  // Filtros
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [mesReferencia, setMesReferencia] = useState("")

  // Modal gerar faturas
  const [showModalGerar, setShowModalGerar] = useState(false)
  const [admGerarFaturas, setAdmGerarFaturas] = useState("")
  const [referenciaGerar, setReferenciaGerar] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (administradoraSelecionada) {
      carregarFaturas()
    }
  }, [administradoraSelecionada, statusFiltro])

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
      const filtros: any = {}
      if (statusFiltro !== "todos") {
        filtros.status = statusFiltro
      }

      const faturasData = await FaturasService.buscarPorAdministradora(
        administradoraSelecionada,
        filtros
      )
      setFaturas(faturasData)

      // Carregar estatísticas
      const stats = await FaturasService.buscarEstatisticas(administradoraSelecionada)
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
      const resultado = await FaturasService.gerarFaturasMensais(
        admGerarFaturas,
        referenciaGerar
      )

      toast.success(
        `Faturas geradas com sucesso! ${resultado.sucesso} criadas, ${resultado.erros} erros`
      )
      setShowModalGerar(false)
      setAdmGerarFaturas("")
      setReferenciaGerar("")
      carregarFaturas()
    } catch (error: any) {
      console.error("❌ Erro ao gerar faturas:", error)
      toast.error("Erro ao gerar faturas: " + error.message)
    } finally {
      setGerandoFaturas(false)
    }
  }

  async function handleAtualizarVencidas() {
    try {
      const quantidade = await FaturasService.atualizarFaturasVencidas()
      toast.success(`${quantidade} faturas marcadas como atrasadas`)
      carregarFaturas()
    } catch (error) {
      console.error("❌ Erro ao atualizar faturas:", error)
      toast.error("Erro ao atualizar faturas vencidas")
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
      paga: { bg: "bg-green-100 text-green-800", icon: CheckCircle },
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
              <Wallet className="h-6 w-6 text-[#168979]" />
              Financeiro
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Gestão de faturas, pagamentos e fluxo de caixa
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowModalGerar(true)}
              className="bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate shadow-corporate flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Gerar Faturas
            </Button>
            <Button 
              onClick={handleAtualizarVencidas} 
              variant="outline"
              className="font-bold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Seleção de Administradora */}
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Administradora
            </label>
            <Select
              value={administradoraSelecionada}
              onValueChange={setAdministradoraSelecionada}
            >
              <SelectTrigger>
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
        </div>
      </div>

      {/* Dashboard Cards */}
      {estatisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Pendentes</h3>
                <div className="text-3xl font-bold text-yellow-600 mt-2">
                  {estatisticas.total_pendentes}
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  R$ {estatisticas.valor_pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-14 h-14 bg-yellow-50 rounded-lg flex items-center justify-center border border-yellow-200">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="pb-6 px-6">
              <p className="text-xs text-gray-500 font-medium">Faturas a receber</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Atrasadas</h3>
                <div className="text-3xl font-bold text-red-600 mt-2">
                  {estatisticas.total_atrasadas}
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  R$ {estatisticas.valor_atrasado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-14 h-14 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="pb-6 px-6">
              <p className="text-xs text-gray-500 font-medium">Faturas vencidas</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Pagas no Mês</h3>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {estatisticas.total_pagas_mes}
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  R$ {estatisticas.valor_recebido_mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-50 rounded-lg flex items-center justify-center border border-green-200">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="pb-6 px-6">
              <p className="text-xs text-gray-500 font-medium">Recebimentos confirmados</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
            <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total Aberto</h3>
                <div className="text-2xl font-bold text-[#168979] mt-2">
                  R$ {(estatisticas.valor_pendente + estatisticas.valor_atrasado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Pendente + Atrasado
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-200">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="pb-6 px-6">
              <p className="text-xs text-gray-500 font-medium">Valor a receber</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros e Lista de Faturas */}
      <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Faturas</CardTitle>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-48">
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
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {fatura.numero_fatura}
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

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Valor Total</p>
                            <p className="font-semibold text-lg text-gray-900">
                              R$ {fatura.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Vencimento</p>
                            <p className="font-medium">
                              {new Date(fatura.data_vencimento).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Emissão</p>
                            <p className="font-medium">
                              {new Date(fatura.data_emissao).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Valor Pago</p>
                            <p className="font-medium text-green-600">
                              R$ {fatura.valor_pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {(fatura.valor_multa > 0 || fatura.valor_juros > 0) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-red-600">
                              Multa: R$ {fatura.valor_multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | 
                              Juros: R$ {fatura.valor_juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {fatura.status !== "paga" && fatura.status !== "cancelada" && (
                          <Button
                            onClick={() => handleRegistrarPagamento(fatura.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Registrar Pagamento
                          </Button>
                        )}
                        {fatura.boleto_url && (
                          <Button
                            onClick={() => window.open(fatura.boleto_url, "_blank")}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Boleto
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

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
      </div>

      {/* Modal Gerar Faturas */}
      {showModalGerar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Gerar Faturas Mensais</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administradora <span className="text-red-500">*</span>
                </label>
                <Select value={admGerarFaturas} onValueChange={setAdmGerarFaturas}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referência (Mês/Ano) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={referenciaGerar}
                  onChange={(e) => setReferenciaGerar(e.target.value)}
                  placeholder="01/2025"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: MM/AAAA (exemplo: 01/2025)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ Serão geradas faturas para todos os clientes ativos desta administradora.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowModalGerar(false)
                  setAdmGerarFaturas("")
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGerarFaturas}
                disabled={gerandoFaturas}
                className="bg-[#168979] hover:bg-[#13786a] text-white"
              >
                {gerandoFaturas ? "Gerando..." : "Gerar Faturas"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

