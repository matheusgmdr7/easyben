"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Users, BarChart3, Send, Target, UserCheck } from "lucide-react"
import Link from "next/link"
import { buscarLeads } from "@/services/leads-service"
import { buscarPropostas } from "@/services/propostas-service-unificado"
import { buscarCorretores } from "@/services/corretores-service"

const DashboardChart = dynamic(() => import("./dashboard-chart"), { ssr: false })

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [leadsRecebidos, setLeadsRecebidos] = useState(0)
  const [propostasRecebidas, setPropostasRecebidas] = useState(0)
  const [propostasAprovadas, setPropostasAprovadas] = useState(0)
  const [corretoresAtivos, setCorretoresAtivos] = useState(0)
  const [corretores, setCorretores] = useState<any[]>([])
  const [dadosGrafico, setDadosGrafico] = useState<any>(null)

  // Função para gerar dados do gráfico dos últimos 6 meses
  const gerarDadosGrafico = (leads: any[], propostas: any[]) => {
    const meses = []
    const dadosLeads = []
    const dadosPropostas = []
    const dadosAprovadas = []
    
    // Gerar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const data = new Date()
      data.setMonth(data.getMonth() - i)
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      meses.push(mesAno)
      
      const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1)
      const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Contar leads do mês
      const leadsMes = leads.filter(lead => {
        const dataLead = new Date(lead.created_at || lead.data)
        return dataLead >= inicioMes && dataLead <= fimMes
      }).length
      dadosLeads.push(leadsMes)
      
      // Contar propostas do mês
      const propostasMes = propostas.filter(proposta => {
        const dataProposta = new Date(proposta.created_at || proposta.data)
        return dataProposta >= inicioMes && dataProposta <= fimMes
      }).length
      dadosPropostas.push(propostasMes)
      
      // Contar propostas aprovadas do mês
      const aprovadasMes = propostas.filter(proposta => {
        const dataProposta = new Date(proposta.created_at || proposta.data)
        return dataProposta >= inicioMes && dataProposta <= fimMes && proposta.status === 'aprovada'
      }).length
      dadosAprovadas.push(aprovadasMes)
    }
    
    return {
      labels: meses,
      datasets: [
        {
          label: 'Leads Recebidos',
          data: dadosLeads,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Propostas Recebidas',
          data: dadosPropostas,
          backgroundColor: 'rgba(123, 217, 246, 0.1)',
          borderColor: 'rgba(60, 74, 87, 1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgba(60, 74, 87, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Propostas Aprovadas',
          data: dadosAprovadas,
          backgroundColor: 'rgba(123, 217, 246, 0.15)',
          borderColor: 'rgba(123, 217, 246, 1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgba(123, 217, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch Leads
        const leads = await buscarLeads()
        setLeadsRecebidos(leads.length)

        // Fetch Propostas de Corretores
        const propostasCorretores = await buscarPropostas()
        setPropostasRecebidas(propostasCorretores.length)

        // Filtra propostas aprovadas
        const aprovadas = propostasCorretores.filter((p) => p.status === "aprovada").length
        setPropostasAprovadas(aprovadas)

        // Fetch Corretores
        const corretoresData = await buscarCorretores()
        // Verificando se o campo status existe antes de filtrar
        const ativos = corretoresData.filter((c: any) => c.status === "aprovado").length
        setCorretoresAtivos(ativos)
        setCorretores(corretoresData)

        // Gerar dados do gráfico
        const dadosGraficoProcessados = gerarDadosGrafico(leads, propostasCorretores)
        setDadosGrafico(dadosGraficoProcessados)
      } catch (error) {
        console.error("Error fetching data:", error)
        // Definindo valores padrão em caso de erro
        setLeadsRecebidos(0)
        setPropostasRecebidas(0)
        setPropostasAprovadas(0)
        setCorretoresAtivos(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando dashboard administrativo...</span>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Roboto', sans-serif" }}>Dashboard Administrativo</h1>
            <p className="text-gray-600 mt-1 font-medium">Visão geral das operações e métricas da plataforma</p>
          </div>
          <button className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-6 py-2 btn-corporate shadow-corporate">
            Gerar Relatório
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Leads Recebidos</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{leadsRecebidos}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total acumulado</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Propostas Recebidas</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{propostasRecebidas}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Send className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total acumulado</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Propostas Aprovadas</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{propostasAprovadas}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total acumulado</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider" style={{ fontFamily: "'Roboto', sans-serif" }}>Corretores Ativos</h3>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{corretoresAtivos}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-gray-700" />
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total acumulado</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Roboto', sans-serif" }}>Desempenho dos Últimos 6 Meses</h3>
              <p className="text-gray-600 text-sm font-medium mt-1">Evolução de leads e propostas</p>
            </div>
            <Link href="/admin/propostas" className="text-sm text-[#0F172A] hover:text-[#1E293B] font-semibold btn-corporate px-3 py-1 border border-gray-200 rounded-lg">
              Ver todas →
            </Link>
          </div>
          <div className="h-64">
            {dadosGrafico ? (
              <DashboardChart data={dadosGrafico} />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Carregando dados do gráfico...</p>
                </div>
            </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Roboto', sans-serif" }}>Corretores Recentes</h3>
              <p className="text-gray-600 text-sm font-medium mt-1">Últimos cadastros</p>
            </div>
            <Link href="/admin/corretores" className="text-sm text-[#0F172A] hover:text-[#1E293B] font-semibold btn-corporate px-3 py-1 border border-gray-200 rounded-lg">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-4">
            {corretores.slice(0, 5).map((corretor: any) => (
              <div
                key={corretor.id}
                className="flex items-center space-x-3 p-4 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-all duration-200 mb-3"
              >
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "'Roboto', sans-serif" }}>{corretor.nome}</p>
                  <p className="text-xs text-gray-600 truncate font-medium">{corretor.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 corporate-rounded text-xs font-semibold ${
                      corretor.status === "aprovado"
                        ? "bg-[#7BD9F6] bg-opacity-20 text-[#0F172A]"
                        : corretor.status === "rejeitado"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {corretor.status === "aprovado"
                      ? "Ativo"
                      : corretor.status === "rejeitado"
                        ? "Inativo"
                        : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
            {corretores.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold">Nenhum corretor cadastrado</p>
                <p className="text-sm text-gray-500 mt-2">Os corretores aparecerão aqui quando forem cadastrados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: "'Roboto', sans-serif" }}>Indicadores de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100">
            <div className="text-3xl font-bold text-[#0F172A] mb-2">
              {propostasRecebidas > 0 ? Math.round((propostasAprovadas / propostasRecebidas) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-600 font-semibold">Taxa de Conversão</p>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100">
            <div className="text-3xl font-bold text-[#0F172A] mb-2">2.5h</div>
            <p className="text-sm text-gray-600 font-semibold">Tempo Médio</p>
          </div>
          <div className="text-center bg-white rounded-lg p-4 border border-gray-100">
            <div className="text-3xl font-bold text-[#0F172A] mb-2">R$ 0</div>
            <p className="text-sm text-gray-600 font-semibold">Volume Total</p>
          </div>
        </div>
      </div>

    </>
  )
}
