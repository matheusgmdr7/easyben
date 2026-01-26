"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Download } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { buscarVendas, buscarResumoVendas, buscarCorretoras } from "@/services/propostas-corretores-service"

interface Venda {
  id: string
  cliente: string
  produto: string
  valor: number
  data: string
  status: string
  corretor: {
    id: string
    nome: string
    corretora?: {
      id: string
      nome: string
    }
  }
}

interface ResumoVendas {
  total: number
  aprovadas: number
  pendentes: number
  rejeitadas: number
  valor_total: number
  valor_aprovado: number
}

interface Corretora {
  id: string
  nome: string
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [resumo, setResumo] = useState<ResumoVendas | null>(null)
  const [corretoras, setCorretoras] = useState<Corretora[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [corretoraFiltro, setCorretoraFiltro] = useState("todas")
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("mes-atual")
  const [mesSelecionado, setMesSelecionado] = useState<string>(new Date().toISOString().substring(0, 7)) // Formato YYYY-MM
  const [ordenacao, setOrdenacao] = useState<string>("data-desc")

  useEffect(() => {
    carregarDados()
  }, [statusFiltro, corretoraFiltro, periodoSelecionado, mesSelecionado, ordenacao])

  async function carregarDados() {
    try {
      setLoading(true)
      const [vendasData, resumoData, corretorasData] = await Promise.all([
        buscarVendas(),
        buscarResumoVendas(),
        buscarCorretoras(),
      ])

      // Filtrar vendas por status se necessário
      let vendasFiltradas = vendasData
      if (statusFiltro !== "todos") {
        vendasFiltradas = vendasData.filter((venda) => venda.status === statusFiltro)
      }

      // Filtrar por corretora se necessário
      if (corretoraFiltro !== "todas") {
        vendasFiltradas = vendasFiltradas.filter((venda) => venda.corretor?.corretora?.id === corretoraFiltro)
      }

      // Filtrar por período
      if (periodoSelecionado !== "todos") {
        const hoje = new Date()
        let dataInicio: Date, dataFim: Date

        if (periodoSelecionado === "mes-atual") {
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        } else if (periodoSelecionado === "mes-especifico") {
          const [ano, mes] = mesSelecionado.split("-")
          dataInicio = new Date(Number.parseInt(ano), Number.parseInt(mes) - 1, 1)
          dataFim = new Date(Number.parseInt(ano), Number.parseInt(mes), 0)
        }

        vendasFiltradas = vendasFiltradas.filter((venda) => {
          const dataVenda = new Date(venda.data)
          return dataVenda >= dataInicio && dataVenda <= dataFim
        })
      }

      // Ordenar vendas
      vendasFiltradas.sort((a, b) => {
        const dataA = new Date(a.data)
        const dataB = new Date(b.data)

        if (ordenacao === "data-desc") {
          return dataB.getTime() - dataA.getTime()
        } else if (ordenacao === "data-asc") {
          return dataA.getTime() - dataB.getTime()
        } else if (ordenacao === "valor-desc") {
          return b.valor - a.valor
        } else {
          // valor-asc
          return a.valor - b.valor
        }
      })

      setVendas(vendasFiltradas)
      setResumo(resumoData)
      setCorretoras(corretorasData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const vendasFiltradas = vendas.filter(
    (venda) =>
      venda.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      venda.produto.toLowerCase().includes(filtro.toLowerCase()) ||
      venda.corretor?.nome?.toLowerCase().includes(filtro.toLowerCase()),
  )

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

  // Função para formatar o mês para exibição
  const formatarMes = (dataStr: string) => {
    const [ano, mes] = dataStr.split("-")
    const data = new Date(Number.parseInt(ano), Number.parseInt(mes) - 1, 1)
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vendas" description="Acompanhe as vendas por corretora e corretor" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <CardDescription>Quantidade de propostas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo ? resumo.total : <Spinner size="sm" />}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vendas Aprovadas</CardTitle>
            <CardDescription>Propostas aprovadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">{resumo ? resumo.aprovadas : <Spinner size="sm" />}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <CardDescription>Valor total das vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resumo ? formatarMoeda(resumo.valor_total) : <Spinner size="sm" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Aprovado</CardTitle>
            <CardDescription>Valor das vendas aprovadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {resumo ? formatarMoeda(resumo.valor_aprovado) : <Spinner size="sm" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Lista de Vendas</CardTitle>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por cliente, produto..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aprovada">Aprovadas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={corretoraFiltro} onValueChange={setCorretoraFiltro}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Corretora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Corretoras</SelectItem>
                  {corretoras.map((corretora) => (
                    <SelectItem key={corretora.id} value={corretora.id}>
                      {corretora.nome?.toUpperCase() || "-"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              <Button variant="outline" className="w-full md:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : vendasFiltradas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead>Corretora</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">{venda.cliente}</TableCell>
                      <TableCell>{venda.produto}</TableCell>
                      <TableCell>{formatarMoeda(venda.valor)}</TableCell>
                      <TableCell>{new Date(venda.data).toLocaleDateString()}</TableCell>
                      <TableCell>{venda.corretor?.nome || "N/A"}</TableCell>
                      <TableCell className="font-bold">{venda.corretor?.corretora?.nome?.toUpperCase() || "Independente"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            venda.status === "aprovada"
                              ? "success"
                              : venda.status === "rejeitada"
                                ? "destructive"
                                : "outline"
                          }
                          className={`${
                            venda.status === "aprovada"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-30"
                              : venda.status === "rejeitada"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }`}
                        >
                          {venda.status === "aprovada"
                            ? "Aprovada"
                            : venda.status === "rejeitada"
                              ? "Rejeitada"
                              : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma venda encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
