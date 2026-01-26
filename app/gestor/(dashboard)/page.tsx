"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, UserPlus, Link as LinkIcon, TrendingUp, FileText, CheckCircle, Clock, Copy, Send, CheckSquare, UserCheck, AlertCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { getCorretorLogado } from "@/services/auth-corretores-simples"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"

interface CorretorEquipe {
  id: string
  nome: string
  email: string
  status: string
  created_at: string
  total_propostas?: number
  propostas_aprovadas?: number
}

export default function GestorDashboard() {
  const [corretoresEquipe, setCorretoresEquipe] = useState<CorretorEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [gestorId, setGestorId] = useState<string | null>(null)
  const [linkCadastro, setLinkCadastro] = useState<string>("")
  const [stats, setStats] = useState({
    totalCorretores: 0,
    totalPropostas: 0,
    propostasAprovadas: 0,
    propostasPendentes: 0,
  })
  const [mesSelecionado, setMesSelecionado] = useState<string>(new Date().toISOString().substring(0, 7))
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("todos")

  useEffect(() => {
    carregarDados()
  }, [mesSelecionado, periodoSelecionado])

  // Função para obter o primeiro e último dia do mês
  const obterPrimeiroDiaDoMes = (dataStr: string) => {
    const [ano, mes] = dataStr.split("-")
    return new Date(Number.parseInt(ano), Number.parseInt(mes) - 1, 1, 0, 0, 0, 0)
  }

  const obterUltimoDiaDoMes = (dataStr: string) => {
    const [ano, mes] = dataStr.split("-")
    return new Date(Number.parseInt(ano), Number.parseInt(mes), 0, 23, 59, 59, 999)
  }

  // Função para filtrar dados por período
  const filtrarPorPeriodo = (dados: any[], dataInicio: Date, dataFim: Date) => {
    return dados.filter((item) => {
      try {
        const dataItem = new Date(item.created_at || item.data)
        if (isNaN(dataItem.getTime())) return false
        return dataItem >= dataInicio && dataItem <= dataFim
      } catch {
        return false
      }
    })
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      // Buscar dados do gestor logado
      const corretorLocal = getCorretorLogado()
      if (!corretorLocal) {
        toast.error("Sessão não encontrada")
        return
      }

      const tenantId = await getCurrentTenantId()
      
      // Buscar dados atualizados do gestor
      const { data: gestor, error: gestorError } = await supabase
        .from("corretores")
        .select("id, link_cadastro_equipe")
        .eq("id", corretorLocal.id)
        .eq("tenant_id", tenantId)
        .eq("is_gestor", true)
        .single()

      if (gestorError || !gestor) {
        toast.error("Gestor não encontrado")
        return
      }

      setGestorId(gestor.id)
      
      // Gerar ou usar link existente
      if (gestor.link_cadastro_equipe) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("slug")
          .eq("id", tenantId)
          .single()
        
        setLinkCadastro(`${tenant?.slug || 'default'}/${gestor.link_cadastro_equipe}`)
      } else {
        const novoLink = await gerarLinkCadastro(gestor.id)
        setLinkCadastro(novoLink)
      }

      // Buscar corretores da equipe
      const { data: corretores, error: corretoresError } = await supabase
        .from("corretores")
        .select("id, nome, email, status, created_at")
        .eq("gestor_id", gestor.id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })

      if (corretoresError) {
        throw corretoresError
      }

      // Buscar todas as propostas da equipe
      const todasPropostas: any[] = []
      for (const corretor of corretores || []) {
        const { data: propostas } = await supabase
          .from("propostas_corretores")
          .select("id, status, created_at, corretor_id")
          .eq("corretor_id", corretor.id)
        
        if (propostas) {
          todasPropostas.push(...propostas)
        }
      }

      // Definir datas de início e fim com base no período selecionado
      let dataInicio: Date, dataFim: Date

      if (periodoSelecionado === "mes-atual") {
        const hoje = new Date()
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999)
      } else if (periodoSelecionado === "mes-especifico") {
        dataInicio = obterPrimeiroDiaDoMes(mesSelecionado)
        dataFim = obterUltimoDiaDoMes(mesSelecionado)
      } else {
        dataInicio = new Date(0)
        dataFim = new Date(8640000000000000)
      }

      // Filtrar propostas por período
      const propostasFiltradas = filtrarPorPeriodo(todasPropostas, dataInicio, dataFim)

      // Buscar estatísticas de propostas para cada corretor
      const corretoresComStats = await Promise.all(
        (corretores || []).map(async (corretor) => {
          const propostasCorretor = propostasFiltradas.filter(p => p.corretor_id === corretor.id)
          const total = propostasCorretor.length
          const aprovadas = propostasCorretor.filter(p => p.status === "aprovada").length

          return {
            ...corretor,
            total_propostas: total,
            propostas_aprovadas: aprovadas,
          }
        })
      )

      setCorretoresEquipe(corretoresComStats)

      // Calcular estatísticas gerais
      setStats({
        totalCorretores: corretoresComStats.length,
        totalPropostas: propostasFiltradas.length,
        propostasAprovadas: propostasFiltradas.filter(p => p.status === "aprovada").length,
        propostasPendentes: propostasFiltradas.filter(p => p.status === "pendente").length,
      })
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error)
      toast.error(`Erro ao carregar dados: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const gerarLinkCadastro = async (gestorId: string): Promise<string> => {
    try {
      const tenantId = await getCurrentTenantId()
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { data: tenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .single()

      const link = `corretores/equipe/${token}`

      await supabase
        .from("corretores")
        .update({ link_cadastro_equipe: link })
        .eq("id", gestorId)

      return `${tenant?.slug || 'default'}/${link}`
    } catch (error) {
      console.error("Erro ao gerar link:", error)
      throw error
    }
  }

  const copiarLink = () => {
    const urlCompleta = typeof window !== 'undefined' ? `${window.location.origin}/${linkCadastro}` : linkCadastro
    navigator.clipboard.writeText(urlCompleta)
    toast.success("Link copiado para a área de transferência!")
  }

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
      const valor = data.toISOString().substring(0, 7)
      opcoes.push({ valor, label: data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) })
    }

    return opcoes
  }

  const opcoesMeses = gerarOpcoesMeses()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando dados do dashboard...</span>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section - Mesmo design do corretor */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Dashboard</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie sua equipe de corretores</p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <Tabs defaultValue="todos" className="w-full lg:w-[420px]" onValueChange={setPeriodoSelecionado}>
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger value="mes-atual" className="text-sm font-medium">Mês Atual</TabsTrigger>
                <TabsTrigger value="mes-especifico" className="text-sm font-medium">Mês Específico</TabsTrigger>
                <TabsTrigger value="todos" className="text-sm font-medium">Todos</TabsTrigger>
              </TabsList>
              <TabsContent value="mes-especifico" className="mt-3">
                <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                  <SelectTrigger className="w-full">
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
            <Button 
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-6 py-2 btn-corporate shadow-corporate"
              onClick={() => window.location.href = '/gestor/equipe/novo'}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Corretor
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mesmo design do corretor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total de Corretores</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{stats.totalCorretores}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">
              {periodoSelecionado === "mes-atual"
                ? "No mês atual"
                : periodoSelecionado === "mes-especifico"
                  ? `Em ${formatarMes(mesSelecionado)}`
                  : "Total"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Propostas Enviadas</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{stats.totalPropostas}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Send className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">
              {periodoSelecionado === "mes-atual"
                ? "No mês atual"
                : periodoSelecionado === "mes-especifico"
                  ? `Em ${formatarMes(mesSelecionado)}`
                  : "Total"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Propostas Aprovadas</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{stats.propostasAprovadas}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">
              {periodoSelecionado === "mes-atual"
                ? "No mês atual"
                : periodoSelecionado === "mes-especifico"
                  ? `Em ${formatarMes(mesSelecionado)}`
                  : "Total"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Propostas Pendentes</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{stats.propostasPendentes}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">
              {periodoSelecionado === "mes-atual"
                ? "No mês atual"
                : periodoSelecionado === "mes-especifico"
                  ? `Em ${formatarMes(mesSelecionado)}`
                  : "Total"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicator - Mesmo design do corretor */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 font-sans">Performance da Equipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100">
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {stats.totalPropostas > 0 && stats.propostasAprovadas > 0 
                ? Math.round((stats.propostasAprovadas / stats.totalPropostas) * 100)
                : 0}%
            </div>
            <p className="text-sm text-gray-600 font-semibold">Taxa de Aprovação</p>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100">
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {stats.totalCorretores}
            </div>
            <p className="text-sm text-gray-600 font-semibold">Corretores na Equipe</p>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100">
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {stats.totalCorretores > 0 ? Math.round(stats.totalPropostas / stats.totalCorretores) : 0}
            </div>
            <p className="text-sm text-gray-600 font-semibold">Média de Propostas/Corretor</p>
          </div>
        </div>
      </div>

      {/* Link de Cadastro - Mesmo design */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link de Cadastro para Equipe
          </CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Compartilhe este link para que corretores se cadastrem diretamente na sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex gap-2">
            <Input
              value={typeof window !== 'undefined' ? `${window.location.origin}/${linkCadastro}` : linkCadastro}
              readOnly
              className="flex-1"
            />
            <Button onClick={copiarLink} variant="outline" className="btn-corporate">
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Corretores - Mesmo design */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="text-lg font-bold text-gray-900 font-sans">Corretores da Equipe</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Lista de todos os corretores vinculados à sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {corretoresEquipe.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">Nenhum corretor vinculado à sua equipe ainda</p>
              <p className="text-sm text-gray-500 mt-2 font-medium">Compartilhe o link de cadastro acima para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {corretoresEquipe.map((corretor) => (
                <div
                  key={corretor.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:shadow-corporate transition-all duration-200"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{corretor.nome}</span>
                    <span className="text-xs text-gray-500 mt-1">{corretor.email}</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-600 font-medium">
                        {corretor.total_propostas || 0} propostas
                      </span>
                      <span className="text-xs text-[#0F172A] font-semibold">
                        {corretor.propostas_aprovadas || 0} aprovadas
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={corretor.status === "aprovado" ? "default" : "secondary"}
                      className="px-2 py-1 text-xs font-semibold"
                    >
                      {corretor.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(corretor.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
