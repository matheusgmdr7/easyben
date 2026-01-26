"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buscarComissoesPorCorretor } from "@/services/comissoes-service"
import { Spinner } from "@/components/ui/spinner"
import { formatarMoeda } from "@/utils/formatters"
import { verificarAutenticacao } from "@/services/auth-corretores-simples"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertCircle } from "lucide-react"

// Define proper types for the comissoes and resumo
interface Comissao {
  id: string
  valor: number
  status: string
  data_prevista?: string
  data_pagamento?: string
  created_at?: string
  data?: string
  descricao?: string
  propostas_corretores?: {
    cliente?: string
    produto?: string
  }
}

interface ResumoComissoes {
  total: number
  pagas: number
  pendentes: number
  estimadaProximoMes: number
}

export default function ComissoesPage() {
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)
  const [resumo, setResumo] = useState<ResumoComissoes>({
    total: 0,
    pagas: 0,
    pendentes: 0,
    estimadaProximoMes: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [mesSelecionado, setMesSelecionado] = useState<string>(new Date().toISOString().substring(0, 7)) // Formato YYYY-MM
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("mes-atual")
  const [ordenacao, setOrdenacao] = useState<string>("data-desc")

  // Função para obter o primeiro e último dia do mês
  const obterPrimeiroDiaDoMes = (dataStr: string) => {
    const [ano, mes] = dataStr.split("-")
    return new Date(Number.parseInt(ano), Number.parseInt(mes) - 1, 1)
  }

  const obterUltimoDiaDoMes = (dataStr: string) => {
    const [ano, mes] = dataStr.split("-")
    return new Date(Number.parseInt(ano), Number.parseInt(mes), 0)
  }

  // Função para filtrar dados por período
  const filtrarPorPeriodo = (dados: Comissao[], dataInicio: Date, dataFim: Date) => {
    return dados.filter((item) => {
      const dataItem = new Date(item.created_at || item.data || item.data_prevista || new Date())
      return dataItem >= dataInicio && dataItem <= dataFim
    })
  }

  // Função para calcular comissão estimada para o próximo mês
  const calcularComissaoEstimada = (comissoes: Comissao[]) => {
    // Pegar o mês atual
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    // Filtrar comissões pendentes que devem ser pagas no próximo mês
    const comissoesPendentes = comissoes.filter((comissao) => {
      if (comissao.status !== "pendente") return false

      const dataComissao = new Date(comissao.data_prevista || comissao.created_at || new Date())
      const mesComissao = dataComissao.getMonth()
      const anoComissao = dataComissao.getFullYear()

      // Se a comissão é do mês atual, será paga no próximo mês
      return mesComissao === mesAtual && anoComissao === anoAtual
    })

    // Somar os valores das comissões pendentes
    return comissoesPendentes.reduce((acc, comissao) => acc + Number(comissao.valor), 0)
  }

  useEffect(() => {
    async function carregarComissoes() {
      try {
        setLoading(true)

        // Usar o sistema de autenticação simplificado
        const { autenticado, corretor } = verificarAutenticacao()

        if (!autenticado || !corretor) {
          setError("Usuário não autenticado. Por favor, faça login novamente.")
          return
        }

        const todasComissoes = await buscarComissoesPorCorretor(corretor.id)

        // Definir datas de início e fim com base no período selecionado
        let dataInicio: Date, dataFim: Date

        if (periodoSelecionado === "mes-atual") {
          const hoje = new Date()
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        } else if (periodoSelecionado === "mes-especifico") {
          dataInicio = obterPrimeiroDiaDoMes(mesSelecionado)
          dataFim = obterUltimoDiaDoMes(mesSelecionado)
        } else {
          // todos
          dataInicio = new Date(0) // Data mínima
          dataFim = new Date(8640000000000000) // Data máxima
        }

        // Filtrar comissões pelo período selecionado
        const comissoesFiltradas =
          periodoSelecionado === "todos" ? todasComissoes : filtrarPorPeriodo(todasComissoes, dataInicio, dataFim)

        // Ordenar comissões
        const comissoesOrdenadas = [...comissoesFiltradas].sort((a, b) => {
          const dataA = new Date(a.data_prevista || a.created_at || a.data || new Date())
          const dataB = new Date(b.data_prevista || b.created_at || b.data || new Date())

          if (ordenacao === "data-desc") {
            return dataB.getTime() - dataA.getTime()
          } else if (ordenacao === "data-asc") {
            return dataA.getTime() - dataB.getTime()
          } else if (ordenacao === "valor-desc") {
            return Number(b.valor) - Number(a.valor)
          } else {
            // valor-asc
            return Number(a.valor) - Number(b.valor)
          }
        })

        setComissoes(comissoesOrdenadas)

        // Calcular resumo
        const total = todasComissoes.reduce((acc, comissao) => acc + Number(comissao.valor), 0)
        const pagas = todasComissoes
          .filter((comissao) => comissao.status === "pago")
          .reduce((acc, comissao) => acc + Number(comissao.valor), 0)
        const pendentes = todasComissoes
          .filter((comissao) => comissao.status === "pendente")
          .reduce((acc, comissao) => acc + Number(comissao.valor), 0)

        // Calcular comissão estimada para o próximo mês
        const estimadaProximoMes = calcularComissaoEstimada(todasComissoes)

        setResumo({ total, pagas, pendentes, estimadaProximoMes })
      } catch (error) {
        setError("Erro ao carregar comissões. Por favor, tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    carregarComissoes()
  }, [mesSelecionado, periodoSelecionado, ordenacao])

  // Função para formatar o mês para exibição
  const formatarMes = (dataStr: string) => {
    const [ano, mes] = dataStr.split("-")
    const data = new Date(Number.parseInt(ano), Number.parseInt(mes) - 1, 1)
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  }

  // Gerar opções de meses (últimos 12 meses)
  const gerarOpcoesMeses = () => {
    const opcoes = []
    const dataAtual = new Date()

    for (let i = 0; i < 12; i++) {
      const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1)
      const valor = data.toISOString().substring(0, 7) // YYYY-MM
      opcoes.push({ valor, label: data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) })
    }

    return opcoes
  }

  const opcoesMeses = gerarOpcoesMeses()

  // Obter o próximo mês para exibição
  const obterProximoMes = () => {
    const hoje = new Date()
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    return proximoMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h1 className="text-xl font-semibold tracking-tight">Minhas Comissões</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tentar novamente
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center border-b pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Minhas Comissões</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-gray-700">Total de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(resumo.total)}</div>
            <p className="text-xs text-gray-500 mt-1">Valor acumulado</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-gray-700">Comissões Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">{formatarMoeda(resumo.pagas)}</div>
            <p className="text-xs text-gray-500 mt-1">Valor já recebido</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-gray-700">Comissões Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatarMoeda(resumo.pendentes)}</div>
            <p className="text-xs text-gray-500 mt-1">Valor a receber</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-blue-50">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-blue-700">Estimativa para {obterProximoMes()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatarMoeda(resumo.estimadaProximoMes)}</div>
            <p className="text-xs text-blue-600 mt-1">Previsão de recebimento</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-2 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <CardTitle>Histórico de Comissões</CardTitle>

            <div className="flex flex-col md:flex-row gap-3 mt-3 md:mt-0">
              <Tabs defaultValue="mes-atual" className="w-full md:w-auto" onValueChange={setPeriodoSelecionado}>
                <TabsList className="grid grid-cols-3 w-full md:w-auto">
                  <TabsTrigger value="mes-atual" className="text-xs">
                    Mês Atual
                  </TabsTrigger>
                  <TabsTrigger value="mes-especifico" className="text-xs">
                    Mês Específico
                  </TabsTrigger>
                  <TabsTrigger value="todos" className="text-xs">
                    Todos
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="mes-especifico" className="mt-2">
                  <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                    <SelectTrigger className="w-full md:w-[200px] h-8 text-xs">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoesMeses.map((opcao) => (
                        <SelectItem key={opcao.valor} value={opcao.valor}>
                          {opcao.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>

              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-full md:w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data-desc">Data (recente)</SelectItem>
                  <SelectItem value="data-asc">Data (antiga)</SelectItem>
                  <SelectItem value="valor-desc">Valor (maior)</SelectItem>
                  <SelectItem value="valor-asc">Valor (menor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : comissoes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-medium text-xs text-gray-600">Descrição</TableHead>
                    <TableHead className="font-medium text-xs text-gray-600">Valor</TableHead>
                    <TableHead className="font-medium text-xs text-gray-600">Data Prevista</TableHead>
                    <TableHead className="font-medium text-xs text-gray-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoes.map((comissao) => (
                    <TableRow key={comissao.id} className="text-sm">
                      <TableCell>
                        {comissao.descricao ||
                          (comissao.propostas_corretores?.cliente
                            ? `Proposta: ${comissao.propostas_corretores.cliente} - ${comissao.propostas_corretores.produto}`
                            : "Comissão")}
                      </TableCell>
                      <TableCell className="font-medium">{formatarMoeda(comissao.valor)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          {comissao.data_prevista
                            ? new Date(comissao.data_prevista).toLocaleDateString()
                            : "Não definida"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={comissao.status === "pago" ? "success" : "outline"}
                          className={`text-xs font-normal ${
                            comissao.status === "pago"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-30"
                              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }`}
                        >
                          {comissao.status === "pago" ? "Pago" : "Pendente"}
                        </Badge>
                        {comissao.status === "pago" && comissao.data_pagamento && (
                          <span className="text-xs text-gray-500 block mt-1">
                            Pago em {new Date(comissao.data_pagamento).toLocaleDateString()}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">
              {periodoSelecionado === "mes-atual"
                ? "Nenhuma comissão encontrada no mês atual"
                : periodoSelecionado === "mes-especifico"
                  ? `Nenhuma comissão encontrada em ${formatarMes(mesSelecionado)}`
                  : "Nenhuma comissão encontrada"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
