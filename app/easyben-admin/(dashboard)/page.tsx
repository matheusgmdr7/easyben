"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Globe, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { listarTenants, obterEstatisticasTenant, type Tenant } from "@/services/tenants-service"

export default function EasyBenDashboard() {
  const [totalPlataformas, setTotalPlataformas] = useState(0)
  const [plataformasAtivas, setPlataformasAtivas] = useState(0)
  const [totalClientes, setTotalClientes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const tenants = await listarTenants()
      setTotalPlataformas(tenants.length)
      setPlataformasAtivas(tenants.filter(t => t.status === 'ativo').length)

      // Calcular total de clientes (usuários admin de cada tenant)
      let total = 0
      for (const tenant of tenants) {
        try {
          const stats = await obterEstatisticasTenant(tenant.id)
          total += stats.totalClientes || 0
        } catch (error) {
          console.error(`Erro ao buscar stats do tenant ${tenant.id}:`, error)
        }
      }
      setTotalClientes(total)
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">EasyBen - Administração</h1>
        <p className="text-gray-600 mt-2">
          Gerencie plataformas, clientes e serviços da plataforma white-label
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Plataformas</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalPlataformas}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : `${plataformasAtivas} ativas`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plataformas Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : plataformasAtivas}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : "Em operação"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : "Em todas as plataformas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-[#0F172A]" />
              Gerenciar Plataformas
            </CardTitle>
            <CardDescription>
              Configure e gerencie todas as plataformas white-label dos seus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/easyben-admin/plataformas">
                Acessar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-[#0F172A]" />
              Gerenciar Clientes
            </CardTitle>
            <CardDescription>
              Visualize e gerencie informações dos clientes de cada plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/easyben-admin/clientes">
                Acessar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-[#0F172A]" />
              Configurar Serviços
            </CardTitle>
            <CardDescription>
              Configure serviços e funcionalidades disponíveis para cada plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/easyben-admin/servicos">
                Acessar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

