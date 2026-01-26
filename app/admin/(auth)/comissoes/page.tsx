"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, DollarSign, Calendar, User, Download, RefreshCw, Eye, EyeOff } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"

interface Cliente {
  id: string
  nome: string
  email: string
  data_vencimento: string
  valor_mensal: number
  produto_nome: string
  corretor_id: string
  corretor_nome: string
  pago: boolean
  data_pagamento?: string
  mes_referencia: string
  porcentagem_comissao: number
  valor_comissao: number
}

interface RelatorioCorretor {
  corretor_id: string
  corretor_nome: string
  clientes: Cliente[]
  total_comissao: number
  total_clientes: number
}

export default function ComissoesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [relatorioCorretores, setRelatorioCorretores] = useState<RelatorioCorretor[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSelecionado, setMesSelecionado] = useState("")
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString())
  const [produtos, setProdutos] = useState<any[]>([])
  const [corretores, setCorretores] = useState<any[]>([])
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Gerar lista de meses
  const meses = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ]

  // Gerar lista de anos (últimos 5 anos)
  const anos = Array.from({ length: 5 }, (_, i) => {
    const ano = new Date().getFullYear() - i
    return { value: ano.toString(), label: ano.toString() }
  })

  useEffect(() => {
    carregarProdutos()
    carregarCorretores()
  }, [])

  useEffect(() => {
    if (mesSelecionado && anoSelecionado) {
      carregarClientes()
    }
  }, [mesSelecionado, anoSelecionado])

  // Adicionar fallback para loading infinito
  useEffect(() => {
    // Se após 10 segundos ainda estiver carregando, libera a tela e mostra erro
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false)
        toast.error("Não foi possível carregar os dados. Verifique a conexão ou a estrutura do banco.")
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [loading])

  const carregarProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("produtos_corretores")
        .select("id, nome, porcentagem_comissao")
        .order("nome")

      if (error) throw error
      setProdutos(data || [])
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      toast.error("Erro ao carregar produtos")
    }
  }

  const carregarCorretores = async () => {
    try {
      const { data, error } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .eq("status", "aprovado")
        .order("nome")

      if (error) throw error
      setCorretores(data || [])
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
      toast.error("Erro ao carregar corretores")
    }
  }

  const carregarClientes = async () => {
    if (!mesSelecionado || !anoSelecionado) return

    setLoading(true)
    try {
      console.log(`🔄 Carregando clientes para ${mesSelecionado}/${anoSelecionado}`)

      // Buscar clientes cadastrados até o mês/ano selecionado
      const dataInicio = `${anoSelecionado}-${mesSelecionado}-01`
      const dataFim = `${anoSelecionado}-${mesSelecionado}-31`

      const { data, error } = await supabase
        .from("propostas")
        .select(`
          id,
          nome,
          email,
          data_vencimento,
          valor_mensal,
          produto_id,
          corretor_id,
          corretor_nome,
          pago,
          data_pagamento,
          mes_referencia,
          produtos_corretores!inner(nome, porcentagem_comissao)
        `)
        .eq("status", "cadastrado")
        .lte("data_vencimento", dataFim)
        .order("data_vencimento", { ascending: true })

      if (error) throw error

      // Processar dados dos clientes
      const clientesProcessados = (data || []).map((cliente: any) => {
        const produto = produtos.find(p => p.id === cliente.produto_id)
        const porcentagemComissao = produto?.porcentagem_comissao || 0
        const valorComissao = (cliente.valor_mensal * porcentagemComissao) / 100

        return {
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email,
          data_vencimento: cliente.data_vencimento,
          valor_mensal: cliente.valor_mensal,
          produto_nome: produto?.nome || "Produto não encontrado",
          corretor_id: cliente.corretor_id,
          corretor_nome: cliente.corretor_nome,
          pago: cliente.pago || false,
          data_pagamento: cliente.data_pagamento,
          mes_referencia: `${mesSelecionado}/${anoSelecionado}`,
          porcentagem_comissao: porcentagemComissao,
          valor_comissao: valorComissao,
        }
      })

      setClientes(clientesProcessados)
      gerarRelatorio(clientesProcessados)
      console.log(`✅ ${clientesProcessados.length} clientes carregados`)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      toast.error("Erro ao carregar clientes. Verifique se o campo produto_id está correto e se há produtos cadastrados.")
      setClientes([])
      gerarRelatorio([])
    } finally {
      setLoading(false)
    }
  }

  const gerarRelatorio = (clientesData: Cliente[]) => {
    // Agrupar clientes por corretor
    const relatorioPorCorretor = clientesData.reduce((acc: RelatorioCorretor[], cliente) => {
      const corretorExistente = acc.find(c => c.corretor_id === cliente.corretor_id)
      
      if (corretorExistente) {
        corretorExistente.clientes.push(cliente)
        corretorExistente.total_comissao += cliente.valor_comissao
        corretorExistente.total_clientes += 1
      } else {
        acc.push({
          corretor_id: cliente.corretor_id,
          corretor_nome: cliente.corretor_nome,
          clientes: [cliente],
          total_comissao: cliente.valor_comissao,
          total_clientes: 1,
        })
      }
      
      return acc
    }, [])

    // Ordenar por total de comissão (maior primeiro)
    relatorioPorCorretor.sort((a, b) => b.total_comissao - a.total_comissao)
    
    setRelatorioCorretores(relatorioPorCorretor)
  }

  const marcarComoPago = async (clienteId: string, pago: boolean) => {
    setSalvando(true)
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          pago: pago,
          data_pagamento: pago ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId)

      if (error) throw error

      // Atualizar estado local
      setClientes(prev => prev.map(cliente => 
        cliente.id === clienteId 
          ? { ...cliente, pago, data_pagamento: pago ? new Date().toISOString() : undefined }
          : cliente
      ))

      toast.success(pago ? "Cliente marcado como pago" : "Pagamento desmarcado")
      gerarRelatorio(clientes)
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error)
      toast.error("Erro ao atualizar pagamento")
    } finally {
      setSalvando(false)
    }
  }

  const marcarTodosComoPago = async (corretorId?: string) => {
    setSalvando(true)
    try {
      const clientesParaMarcar = corretorId 
        ? clientes.filter(c => c.corretor_id === corretorId && !c.pago)
        : clientes.filter(c => !c.pago)

      if (clientesParaMarcar.length === 0) {
        toast.info("Nenhum cliente para marcar como pago")
        return
      }

      const { error } = await supabase
        .from("propostas")
        .update({
          pago: true,
          data_pagamento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", clientesParaMarcar.map(c => c.id))

      if (error) throw error

      // Atualizar estado local
      setClientes(prev => prev.map(cliente => 
        clientesParaMarcar.some(c => c.id === cliente.id)
          ? { ...cliente, pago: true, data_pagamento: new Date().toISOString() }
          : cliente
      ))

      toast.success(`${clientesParaMarcar.length} cliente(s) marcado(s) como pago`)
      gerarRelatorio(clientes)
    } catch (error) {
      console.error("Erro ao marcar pagamentos:", error)
      toast.error("Erro ao marcar pagamentos")
    } finally {
      setSalvando(false)
    }
  }

  const exportarRelatorio = () => {
    const data = relatorioCorretores.map(corretor => ({
      "Corretor": corretor.corretor_nome,
      "Total de Clientes": corretor.total_clientes,
      "Total de Comissão": formatarMoeda(corretor.total_comissao),
      "Clientes": corretor.clientes.map(cliente => ({
        "Nome": cliente.nome,
        "Email": cliente.email,
        "Data Vencimento": new Date(cliente.data_vencimento).toLocaleDateString("pt-BR"),
        "Valor Mensal": formatarMoeda(cliente.valor_mensal),
        "Produto": cliente.produto_nome,
        "Porcentagem Comissão": `${cliente.porcentagem_comissao}%`,
        "Valor Comissão": formatarMoeda(cliente.valor_comissao),
        "Pago": cliente.pago ? "Sim" : "Não",
        "Data Pagamento": cliente.data_pagamento 
          ? new Date(cliente.data_pagamento).toLocaleDateString("pt-BR")
          : "-"
      }))
    }))

    const csvContent = "data:text/csv;charset=utf-8," + 
      "Corretor,Total Clientes,Total Comissão\n" +
      data.map(corretor => 
        `"${corretor.Corretor}",${corretor["Total de Clientes"]},"${corretor["Total de Comissão"]}"`
      ).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `comissoes_${mesSelecionado}_${anoSelecionado}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Relatório exportado com sucesso!")
  }

  const totalGeralComissao = relatorioCorretores.reduce((total, corretor) => total + corretor.total_comissao, 0)
  const totalClientes = relatorioCorretores.reduce((total, corretor) => total + corretor.total_clientes, 0)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Comissões</h1>
        <div className="flex gap-2">
          <button
            onClick={carregarClientes}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button
            onClick={() => setMostrarRelatorio(!mostrarRelatorio)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {mostrarRelatorio ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {mostrarRelatorio ? "Ocultar" : "Mostrar"} Relatório
          </button>
          {mostrarRelatorio && (
            <button
              onClick={exportarRelatorio}
              className="bg-[#0F172A] hover:bg-[#0F172A] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          )}
            </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
              <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => marcarTodosComoPago()}
                disabled={salvando || clientes.filter(c => !c.pago).length === 0}
                className="w-full bg-[#0F172A] hover:bg-[#0F172A]"
              >
                {salvando ? "Salvando..." : `Marcar Todos como Pago (${clientes.filter(c => !c.pago).length})`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {mesSelecionado && anoSelecionado && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{totalClientes}</div>
              <div className="text-sm text-gray-600">Total de Clientes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[#0F172A]">
                {clientes.filter(c => c.pago).length}
              </div>
              <div className="text-sm text-gray-600">Clientes Pagos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {clientes.filter(c => !c.pago).length}
              </div>
              <div className="text-sm text-gray-600">Clientes Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {formatarMoeda(totalGeralComissao)}
              </div>
              <div className="text-sm text-gray-600">Total de Comissões</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relatório por Corretor */}
      {mostrarRelatorio && relatorioCorretores.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Relatório de Comissões por Corretor</h2>
          
          {relatorioCorretores.map((corretor) => (
            <Card key={corretor.corretor_id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{corretor.corretor_nome}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {corretor.total_clientes} cliente(s) • Total: {formatarMoeda(corretor.total_comissao)}
                    </p>
                  </div>
                  <Button
                    onClick={() => marcarTodosComoPago(corretor.corretor_id)}
                    disabled={salvando || corretor.clientes.filter(c => !c.pago).length === 0}
                    className="bg-[#0F172A] hover:bg-[#0F172A]"
                  >
                    Marcar Todos como Pago ({corretor.clientes.filter(c => !c.pago).length})
                  </Button>
          </div>
        </CardHeader>
        <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Cliente</th>
                        <th className="text-left py-2">Vencimento</th>
                        <th className="text-left py-2">Produto</th>
                        <th className="text-right py-2">Valor</th>
                        <th className="text-right py-2">Comissão</th>
                        <th className="text-center py-2">Status</th>
                        <th className="text-center py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corretor.clientes.map((cliente) => (
                        <tr key={cliente.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">
                            <div>
                              <div className="font-medium">{cliente.nome}</div>
                              <div className="text-gray-500 text-xs">{cliente.email}</div>
                            </div>
                          </td>
                          <td className="py-2">
                            {new Date(cliente.data_vencimento).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-2">
                            <div>
                              <div className="font-medium">{cliente.produto_nome}</div>
                              <div className="text-gray-500 text-xs">{cliente.porcentagem_comissao}%</div>
                            </div>
                          </td>
                          <td className="py-2 text-right">
                            {formatarMoeda(cliente.valor_mensal)}
                          </td>
                          <td className="py-2 text-right font-medium text-[#0F172A]">
                            {formatarMoeda(cliente.valor_comissao)}
                          </td>
                          <td className="py-2 text-center">
                            {cliente.pago ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Pago
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <Calendar className="h-3 w-3 mr-1" />
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-center">
                            <Button
                              onClick={() => marcarComoPago(cliente.id, !cliente.pago)}
                              disabled={salvando}
                              variant={cliente.pago ? "outline" : "default"}
                              size="sm"
                              className={cliente.pago ? "text-red-600" : "bg-[#0F172A] hover:bg-[#0F172A]"}
                            >
                              {cliente.pago ? "Desmarcar" : "Marcar Pago"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
      )}

      {/* Lista de Clientes (visão alternativa) */}
      {!mostrarRelatorio && clientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes - {meses.find(m => m.value === mesSelecionado)?.label} {anoSelecionado}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-left py-2">Corretor</th>
                    <th className="text-left py-2">Vencimento</th>
                    <th className="text-left py-2">Produto</th>
                    <th className="text-right py-2">Valor</th>
                    <th className="text-right py-2">Comissão</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-center py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <div>
                          <div className="font-medium">{cliente.nome}</div>
                          <div className="text-gray-500 text-xs">{cliente.email}</div>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="font-medium">{cliente.corretor_nome}</div>
                      </td>
                      <td className="py-2">
                        {new Date(cliente.data_vencimento).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2">
                        <div>
                          <div className="font-medium">{cliente.produto_nome}</div>
                          <div className="text-gray-500 text-xs">{cliente.porcentagem_comissao}%</div>
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        {formatarMoeda(cliente.valor_mensal)}
                      </td>
                      <td className="py-2 text-right font-medium text-[#0F172A]">
                        {formatarMoeda(cliente.valor_comissao)}
                      </td>
                      <td className="py-2 text-center">
                        {cliente.pago ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Calendar className="h-3 w-3 mr-1" />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <Button
                          onClick={() => marcarComoPago(cliente.id, !cliente.pago)}
                          disabled={salvando}
                          variant={cliente.pago ? "outline" : "default"}
                          size="sm"
                          className={cliente.pago ? "text-red-600" : "bg-[#0F172A] hover:bg-[#0F172A]"}
                        >
                          {cliente.pago ? "Desmarcar" : "Marcar Pago"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {mesSelecionado && anoSelecionado && clientes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-600">
              Não há clientes cadastrados para {meses.find(m => m.value === mesSelecionado)?.label} {anoSelecionado}
            </p>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
