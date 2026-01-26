"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Mail, Bell, Database, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">
          Configure as opções globais da plataforma EasyBen
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-[#0F172A]" />
              Configurações de Email
            </CardTitle>
            <CardDescription>
              Configure servidor e templates de email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input id="smtp-host" placeholder="smtp.exemplo.com" />
            </div>
            <div>
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input id="smtp-port" type="number" placeholder="587" />
            </div>
            <div>
              <Label htmlFor="smtp-user">Usuário</Label>
              <Input id="smtp-user" placeholder="usuario@exemplo.com" />
            </div>
            <Button className="w-full">Salvar Configurações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-[#0F172A]" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure notificações e alertas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificações por Email</Label>
                <p className="text-sm text-gray-500">
                  Envia notificações por email para administradores
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Alertas de Sistema</Label>
                <p className="text-sm text-gray-500">
                  Receba alertas sobre problemas no sistema
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Relatórios Semanais</Label>
                <p className="text-sm text-gray-500">
                  Receba relatórios semanais por email
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-[#0F172A]" />
              Backup e Manutenção
            </CardTitle>
            <CardDescription>
              Configure backups automáticos e manutenção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Backup Automático</Label>
                <p className="text-sm text-gray-500">
                  Realiza backup diário automático
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div>
              <Label htmlFor="backup-time">Horário do Backup</Label>
              <Input id="backup-time" type="time" defaultValue="02:00" />
            </div>
            <div>
              <Label htmlFor="backup-retention">Retenção (dias)</Label>
              <Input id="backup-retention" type="number" defaultValue="30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[#0F172A]" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configurações de segurança e acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Autenticação em Dois Fatores</Label>
                <p className="text-sm text-gray-500">
                  Exige 2FA para administradores
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Logs de Auditoria</Label>
                <p className="text-sm text-gray-500">
                  Registra todas as ações administrativas
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div>
              <Label htmlFor="session-timeout">Timeout de Sessão (minutos)</Label>
              <Input id="session-timeout" type="number" defaultValue="60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

