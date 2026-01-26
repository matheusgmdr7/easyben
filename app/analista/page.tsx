"use client"

import { useState, useEffect } from "react"
import { buscarPropostas } from "@/services/propostas-service-unificado"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Clock, CheckCircle, XCircle, TrendingUp, User, Building2, Package } from "lucide-react"

interface CorretorStats {
  id: string
  nome: string
  totalPropostas: number
  ultimaProposta?: string
}

interface CorretoraStats {
  id: string
  nome: string
  totalPropostas: number
}

interface ProdutoStats {
  id: string
  nome: string
  totalPropostas: number
}

export default function AnalistaDashboard() {
  const [loading, setLoading] = useState(true)
  const [propostasRecebidas, setPropostasRecebidas] = useState(0)
  const [aguardandoAnalise, setAguardandoAnalise] = useState(0)
  const [aprovadas, setAprovadas] = useState(0)
  const [reprovadas, setReprovadas] = useState(0)
  const [ultimosCorretores, setUltimosCorretores] = useState<CorretorStats[]>([])
  const [topCorretoras, setTopCorretoras] = useState<CorretoraStats[]>([])
  const [topProdutos, setTopProdutos] = useState<ProdutoStats[]>([])
  const [filtroTempo, setFiltroTempo] = useState("30") // 7, 30, 90, 365, todos

  useEffect(() => {
    carregarMetricas()
  }, [filtroTempo])

  async function carregarMetricas() {
    try {
      setLoading(true)
      const todasPropostas = await buscarPropostas()
      
      // Calcular data de corte baseado no filtro
      const agora = new Date()
      let dataCorte: Date | null = null
      
      if (filtroTempo !== "todos") {
        const dias = parseInt(filtroTempo)
        dataCorte = new Date(agora)
        dataCorte.setDate(dataCorte.getDate() - dias)
      }

      // Filtrar propostas pelo período
      const propostasFiltradas = dataCorte
        ? todasPropostas.filter((p: any) => {
            const dataProposta = new Date(p.created_at || p.data)
            return dataProposta >= dataCorte!
          })
        : todasPropostas

      // Calcular métricas
      setPropostasRecebidas(propostasFiltradas.length)
      setAguardandoAnalise(propostasFiltradas.filter((p: any) => p.status === "pendente").length)
      setAprovadas(propostasFiltradas.filter((p: any) => p.status === "aprovada").length)
      setReprovadas(propostasFiltradas.filter((p: any) => p.status === "rejeitada").length)

      // Buscar dados dos corretores e corretoras
      const corretoresIds = propostasFiltradas
        .filter((p: any) => p.corretor_id)
        .map((p: any) => p.corretor_id)
        .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index)
        .filter((id: string) => id && id !== "null" && id !== "undefined")

      let corretoresData = new Map<string, any>()
      let corretorasData = new Map<string, any>()

      if (corretoresIds.length > 0) {
        const { data: corretores, error: corretoresError } = await supabase
          .from("corretores")
          .select("id, nome, gestor_id")
          .in("id", corretoresIds)

        if (!corretoresError && corretores) {
          corretores.forEach((c: any) => {
            corretoresData.set(c.id, c)
          })

          // Buscar corretoras (gestores)
          const gestoresIds = corretores
            .filter((c: any) => c.gestor_id)
            .map((c: any) => c.gestor_id)
            .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index)
            .filter((id: string) => id && id !== "null" && id !== "undefined")

          if (gestoresIds.length > 0) {
            const { data: gestores, error: gestoresError } = await supabase
              .from("corretores")
              .select("id, nome")
              .in("id", gestoresIds)
              .eq("is_gestor", true)

            if (!gestoresError && gestores) {
              gestores.forEach((g: any) => {
                corretorasData.set(g.id, g)
              })
            }
          }
        }
      }

      // Buscar TODOS os produtos cadastrados (não apenas os que têm propostas)
      let produtosData = new Map<string, any>()
      
      // Tentar buscar primeiro na tabela produtos
      let { data: produtos, error: produtosError } = await supabase
        .from("produtos")
        .select("id, nome")

      // Se não encontrar, tentar na tabela produtos_corretores
      if (produtosError || !produtos || produtos.length === 0) {
        const { data: produtosCorretores, error: produtosCorretoresError } = await supabase
          .from("produtos_corretores")
          .select("id, nome")

        if (!produtosCorretoresError && produtosCorretores) {
          produtos = produtosCorretores
          produtosError = null
        }
      }

      if (!produtosError && produtos) {
        produtos.forEach((p: any) => {
          produtosData.set(p.id, p)
        })
      }

      // Processar últimos corretores
      const corretoresMap = new Map<string, { total: number; ultimaData?: Date }>()
      propostasFiltradas
        .filter((p: any) => p.corretor_id)
        .forEach((p: any) => {
          const corretorId = p.corretor_id
          const dataProposta = new Date(p.created_at || p.data)
          
          if (!corretoresMap.has(corretorId)) {
            corretoresMap.set(corretorId, { total: 0 })
          }
          
          const stats = corretoresMap.get(corretorId)!
          stats.total++
          if (!stats.ultimaData || dataProposta > stats.ultimaData) {
            stats.ultimaData = dataProposta
          }
        })

      const ultimosCorretoresList: CorretorStats[] = Array.from(corretoresMap.entries())
        .map(([id, stats]) => {
          const corretor = corretoresData.get(id)
          // Se não encontrou o corretor no mapa, tentar buscar o nome na proposta
          let nomeCorretor = corretor?.nome
          if (!nomeCorretor) {
            const propostaComCorretor = propostasFiltradas.find((p: any) => p.corretor_id === id)
            nomeCorretor = propostaComCorretor?.corretor_nome || propostaComCorretor?.nome_corretor
          }
          return {
            id,
            nome: nomeCorretor?.toUpperCase() || `Corretor ${id.slice(0, 8)}`,
            totalPropostas: stats.total,
            ultimaProposta: stats.ultimaData?.toLocaleDateString("pt-BR")
          }
        })
        .sort((a, b) => {
          // Ordenar por quantidade de propostas (decrescente - maior para menor)
          if (b.totalPropostas !== a.totalPropostas) {
            return b.totalPropostas - a.totalPropostas
          }
          // Se tiverem a mesma quantidade, ordenar por data da última proposta (mais recente primeiro)
          const dataA = corretoresMap.get(a.id)?.ultimaData || new Date(0)
          const dataB = corretoresMap.get(b.id)?.ultimaData || new Date(0)
          return dataB.getTime() - dataA.getTime()
        })
        .slice(0, 10) // Top 10

      setUltimosCorretores(ultimosCorretoresList)

      // Processar top corretoras
      const corretorasMap = new Map<string, number>()
      propostasFiltradas
        .filter((p: any) => p.corretor_id)
        .forEach((p: any) => {
          const corretor = corretoresData.get(p.corretor_id)
          if (corretor?.gestor_id) {
            const corretoraId = corretor.gestor_id
            corretorasMap.set(corretoraId, (corretorasMap.get(corretoraId) || 0) + 1)
          }
        })

      const topCorretorasList: CorretoraStats[] = Array.from(corretorasMap.entries())
        .map(([id, total]) => {
          const corretora = corretorasData.get(id)
          return {
            id,
            nome: corretora?.nome?.toUpperCase() || "Corretora não identificada",
            totalPropostas: total
          }
        })
        .sort((a, b) => b.totalPropostas - a.totalPropostas) // Ordem decrescente (maior para menor)
        .slice(0, 10) // Top 10

      setTopCorretoras(topCorretorasList)

      // Processar produtos com contagem de propostas
      const produtosMap = new Map<string, number>()
      
      // Contar propostas por produto
      // Verificar múltiplos campos possíveis para identificar o produto
      propostasFiltradas.forEach((p: any) => {
        // Tentar diferentes campos que podem conter o ID do produto
        const produtoId = p.produto_id || p.produtoId || p.id_produto
        
        if (produtoId) {
          const produtoIdStr = String(produtoId).trim()
          if (produtoIdStr && produtoIdStr !== "null" && produtoIdStr !== "undefined") {
            produtosMap.set(produtoIdStr, (produtosMap.get(produtoIdStr) || 0) + 1)
          }
        }
      })

      // Criar lista com todos os produtos cadastrados, incluindo os sem propostas
      const todosProdutosList: ProdutoStats[] = Array.from(produtosData.entries())
        .map(([id, produto]) => {
          const produtoIdStr = String(id).trim()
          const totalPropostas = produtosMap.get(produtoIdStr) || 0
          return {
            id: produtoIdStr,
            nome: produto.nome || `Produto ${id.slice(0, 8)}`,
            totalPropostas: totalPropostas
          }
        })
        .sort((a, b) => b.totalPropostas - a.totalPropostas) // Ordem decrescente
        .slice(0, 10) // Top 10 produtos

      setTopProdutos(todosProdutosList)
    } catch (error) {
      console.error("Erro ao carregar métricas:", error)
    } finally {
      setLoading(false)
    }
  }

  const getFiltroLabel = () => {
    switch (filtroTempo) {
      case "7": return "Últimos 7 dias"
      case "30": return "Últimos 30 dias"
      case "90": return "Últimos 90 dias"
      case "365": return "Último ano"
      case "todos": return "Todos os períodos"
      default: return "Últimos 30 dias"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Roboto', sans-serif" }}>Dashboard do Analista</h1>
            <p className="text-gray-600 mt-1 font-medium">Visão geral das propostas e análises</p>
          </div>
          <Select value={filtroTempo} onValueChange={setFiltroTempo}>
            <SelectTrigger className="w-[180px] border-2 border-gray-300">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="todos">Todos os períodos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Propostas Recebidas */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Propostas Recebidas</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{propostasRecebidas}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{getFiltroLabel()}</p>
          </div>
        </div>

        {/* Aguardando Análise */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Aguardando Análise</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{aguardandoAnalise}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
              {propostasRecebidas > 0 
                ? `${((aguardandoAnalise / propostasRecebidas) * 100).toFixed(1)}% do total`
                : "0% do total"}
            </p>
          </div>
        </div>

        {/* Aprovadas */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Aprovadas</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{aprovadas}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
              {propostasRecebidas > 0 
                ? `${((aprovadas / propostasRecebidas) * 100).toFixed(1)}% do total`
                : "0% do total"}
            </p>
          </div>
        </div>

        {/* Reprovadas */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Reprovadas</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{reprovadas}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
              {propostasRecebidas > 0 
                ? `${((reprovadas / propostasRecebidas) * 100).toFixed(1)}% do total`
                : "0% do total"}
            </p>
          </div>
        </div>
      </div>

      {/* Seções de Análise */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Melhores Corretores */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: "'Roboto', sans-serif" }}>Melhores Corretores</h3>
              <p className="text-gray-600 text-xs font-medium mt-1">Mais recentes</p>
            </div>
          </div>
          {ultimosCorretores.length > 0 ? (
            <div className="space-y-3">
              {ultimosCorretores.map((corretor, index) => (
                <div key={corretor.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{corretor.nome}</p>
                    {corretor.ultimaProposta && (
                      <p className="text-xs text-gray-500">Última: {corretor.ultimaProposta}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-base font-bold text-[#0F172A]">{corretor.totalPropostas}</p>
                    <p className="text-xs text-gray-500">propostas</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhum corretor encontrado
            </div>
          )}
        </div>

        {/* Melhores Corretoras */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: "'Roboto', sans-serif" }}>Melhores Corretoras</h3>
              <p className="text-gray-600 text-xs font-medium mt-1">Mais propostas</p>
            </div>
          </div>
          {topCorretoras.length > 0 ? (
            <div className="space-y-3">
              {topCorretoras.map((corretora, index) => (
                <div key={corretora.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{corretora.nome}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-base font-bold text-[#0F172A]">{corretora.totalPropostas}</p>
                    <p className="text-xs text-gray-500">propostas</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhuma corretora encontrada
            </div>
          )}
        </div>

        {/* Melhores Produtos */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: "'Roboto', sans-serif" }}>Melhores Produtos</h3>
              <p className="text-gray-600 text-xs font-medium mt-1">Mais propostas</p>
            </div>
          </div>
          {topProdutos.length > 0 ? (
            <div className="space-y-3">
              {topProdutos.map((produto) => (
                <div key={produto.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{produto.nome}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-base font-bold text-[#0F172A]">{produto.totalPropostas}</p>
                    <p className="text-xs text-gray-500">propostas</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
