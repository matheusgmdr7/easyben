"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600 mt-2">
          Visualize métricas e análises de todas as plataformas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-[#0F172A]" />
              Relatório de Plataformas
            </CardTitle>
            <CardDescription>
              Análise completa de todas as plataformas white-label
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Visualize estatísticas, crescimento e performance de cada plataforma
            </p>
            <Button variant="outline" className="w-full">
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-[#0F172A]" />
              Análise de Crescimento
            </CardTitle>
            <CardDescription>
              Métricas de crescimento e tendências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Acompanhe o crescimento de clientes, propostas e receita
            </p>
            <Button variant="outline" className="w-full">
              Ver Análise
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportar Dados</CardTitle>
          <CardDescription>
            Exporte relatórios e dados em diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Relatório Completo</p>
              <p className="text-sm text-gray-500">
                Exporta todos os dados de todas as plataformas
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">CSV</Button>
              <Button variant="outline" size="sm">Excel</Button>
              <Button variant="outline" size="sm">PDF</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

