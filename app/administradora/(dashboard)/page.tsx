"use client"

import { useEffect, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { AdministradorasService } from "@/services/administradoras-service"
import { ClientesAdministradorasService } from "@/services/clientes-administradoras-service"
import { Building, Users, Wallet, FileText, TrendingUp, DollarSign, User, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"

export default function AdministradoraDashboard() {
  const [administradora, setAdministradora] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    clientes_ativos: 0,
    clientes_inadimplentes: 0,
    faturas_pendentes: 0,
    faturas_atrasadas: 0,
    faturas_pagas: 0,
    valor_em_aberto: 0,
    valor_recebido_mes: 0,
    valor_atrasado: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const administradoraLogada = getAdministradoraLogada()
        if (!administradoraLogada) return

        setAdministradora(administradoraLogada)

        // Buscar dados do dashboard
        try {
          const dashboard = await AdministradorasService.buscarDashboard(administradoraLogada.id)
          setDashboardData(dashboard)
        } catch (error) {
          console.error("Erro ao buscar dashboard:", error)
          // Continuar mesmo com erro
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            {administradora?.nome_fantasia || administradora?.nome || "Administradora"}
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Clientes Ativos</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{dashboardData.clientes_ativos}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total de clientes ativos</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Faturas Pendentes</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{dashboardData.faturas_pendentes}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Aguardando pagamento</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Valor em Aberto</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
                {formatarMoeda(dashboardData.valor_em_aberto)}
              </div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total a receber</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Recebido este Mês</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
                {formatarMoeda(dashboardData.valor_recebido_mes)}
              </div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total recebido</p>
          </div>
        </div>
      </div>

      {/* Cards Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Clientes Inadimplentes</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{dashboardData.clientes_inadimplentes}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Com pagamentos em atraso</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Faturas Atrasadas</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{dashboardData.faturas_atrasadas}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Vencidas</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Valor Atrasado</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
                {formatarMoeda(dashboardData.valor_atrasado)}
              </div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total em atraso</p>
          </div>
        </div>
      </div>
    </div>
  )
}

