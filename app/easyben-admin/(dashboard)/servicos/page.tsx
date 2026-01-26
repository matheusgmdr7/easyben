"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, CheckCircle2, XCircle, Globe, Users, FileText, BarChart3, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function ServicosPage() {
  // Lista de serviços disponíveis na plataforma
  const servicos = [
    {
      id: "cotacao-online",
      nome: "Cotação Online",
      descricao: "Permite que clientes façam cotações de planos de saúde online",
      icone: Globe,
      ativo: true,
      categoria: "Frontend",
    },
    {
      id: "portal-corretor",
      nome: "Portal do Corretor",
      descricao: "Dashboard completo para corretores gerenciarem propostas e clientes",
      icone: Users,
      ativo: true,
      categoria: "Backend",
    },
    {
      id: "gestao-propostas",
      nome: "Gestão de Propostas",
      descricao: "Sistema completo de criação, aprovação e gestão de propostas digitais",
      icone: FileText,
      ativo: true,
      categoria: "Backend",
    },
    {
      id: "assinatura-digital",
      nome: "Assinatura Digital",
      descricao: "Permite assinatura eletrônica de propostas e documentos",
      icone: Shield,
      ativo: true,
      categoria: "Backend",
    },
    {
      id: "relatorios-analytics",
      nome: "Relatórios e Analytics",
      descricao: "Dashboard com métricas, relatórios e análises de performance",
      icone: BarChart3,
      ativo: true,
      categoria: "Backend",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
        <p className="text-gray-600 mt-2">
          Configure quais serviços e funcionalidades estão disponíveis para cada plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {servicos.map((servico) => {
          const Icon = servico.icone
          return (
            <Card key={servico.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#0F172A]/10 rounded-lg p-2">
                      <Icon className="h-5 w-5 text-[#0F172A]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{servico.nome}</CardTitle>
                      <CardDescription>{servico.descricao}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{servico.categoria}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor={servico.id} className="flex items-center space-x-2">
                    {servico.ativo ? (
                      <CheckCircle2 className="h-4 w-4 text-[#0F172A]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span>Ativo</span>
                  </Label>
                  <Switch id={servico.id} checked={servico.ativo} disabled />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Este serviço está disponível para todas as plataformas
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
          <CardDescription>
            Configurações que afetam todas as plataformas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Manutenção Global</Label>
              <p className="text-sm text-gray-500">
                Coloca todas as plataformas em modo de manutenção
              </p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificações por Email</Label>
              <p className="text-sm text-gray-500">
                Envia notificações automáticas para administradores
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Backup Automático</Label>
              <p className="text-sm text-gray-500">
                Realiza backup automático diário de todas as plataformas
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

