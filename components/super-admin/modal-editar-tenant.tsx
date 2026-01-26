'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { atualizarTenant, type EditarTenantData, type Tenant } from '@/services/tenants-service'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SelecaoRecursos } from './selecao-recursos'

interface ModalEditarTenantProps {
  isOpen: boolean
  onClose: () => void
  tenant: Tenant
  onSuccess: () => void
}

export function ModalEditarTenant({ isOpen, onClose, tenant, onSuccess }: ModalEditarTenantProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EditarTenantData>({
    id: tenant.id,
    slug: tenant.slug,
    nome: tenant.nome,
    dominio_principal: tenant.dominio_principal || '',
    subdominio: tenant.subdominio || '',
    status: tenant.status || 'ativo',
    cor_primaria: tenant.cor_primaria || '#0F172A',
    cor_secundaria: tenant.cor_secundaria || '#1E293B',
    nome_marca: tenant.nome_marca || '',
    email_remetente: tenant.email_remetente || '',
    nome_remetente: tenant.nome_remetente || '',
    dominio_personalizado: tenant.dominio_personalizado || '',
    logo_url: tenant.logo_url || '',
    favicon_url: tenant.favicon_url || '',
  })

  useEffect(() => {
    if (tenant) {
      setFormData({
        id: tenant.id,
        slug: tenant.slug,
        nome: tenant.nome,
        dominio_principal: tenant.dominio_principal || '',
        subdominio: tenant.subdominio || '',
        status: tenant.status || 'ativo',
        cor_primaria: tenant.cor_primaria || '#0F172A',
        cor_secundaria: tenant.cor_secundaria || '#1E293B',
        nome_marca: tenant.nome_marca || '',
        email_remetente: tenant.email_remetente || '',
        nome_remetente: tenant.nome_remetente || '',
        dominio_personalizado: tenant.dominio_personalizado || '',
        logo_url: tenant.logo_url || '',
        favicon_url: tenant.favicon_url || '',
      })
    }
  }, [tenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.slug || !formData.nome) {
      toast.error('Slug e nome são obrigatórios')
      return
    }

    try {
      setLoading(true)
      await atualizarTenant(formData)
      toast.success('Plataforma atualizada com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(`Erro ao atualizar plataforma: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plataforma</DialogTitle>
          <DialogDescription>
            Atualize as informações da plataforma e configure os recursos disponíveis
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados da Plataforma</TabsTrigger>
            <TabsTrigger value="recursos">Recursos e Funcionalidades</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dados" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Dados Básicos</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nome_marca">Nome da Marca</Label>
              <Input
                id="nome_marca"
                value={formData.nome_marca}
                onChange={(e) => setFormData({ ...formData, nome_marca: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'ativo' | 'inativo' | 'suspenso') => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Domínios */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Configurações de Domínio</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dominio_principal">Domínio Principal</Label>
                <Input
                  id="dominio_principal"
                  value={formData.dominio_principal}
                  onChange={(e) => setFormData({ ...formData, dominio_principal: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="subdominio">Subdomínio</Label>
                <Input
                  id="subdominio"
                  value={formData.subdominio}
                  onChange={(e) => setFormData({ ...formData, subdominio: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dominio_personalizado">Domínio Personalizado</Label>
              <Input
                id="dominio_personalizado"
                value={formData.dominio_personalizado}
                onChange={(e) => setFormData({ ...formData, dominio_personalizado: e.target.value })}
              />
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Personalização</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cor_primaria">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="cor_primaria"
                    type="color"
                    value={formData.cor_primaria}
                    onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.cor_primaria}
                    onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="cor_secundaria">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    id="cor_secundaria"
                    type="color"
                    value={formData.cor_secundaria}
                    onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.cor_secundaria}
                    onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="logo_url">URL do Logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="favicon_url">URL do Favicon</Label>
              <Input
                id="favicon_url"
                value={formData.favicon_url}
                onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Configurações de Email</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email_remetente">Email Remetente</Label>
                <Input
                  id="email_remetente"
                  type="email"
                  value={formData.email_remetente}
                  onChange={(e) => setFormData({ ...formData, email_remetente: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="nome_remetente">Nome do Remetente</Label>
                <Input
                  id="nome_remetente"
                  value={formData.nome_remetente}
                  onChange={(e) => setFormData({ ...formData, nome_remetente: e.target.value })}
                />
              </div>
            </div>
          </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#0F172A] hover:bg-[#1E293B]">
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="recursos" className="space-y-4">
            <SelecaoRecursos 
              tenantId={tenant.id} 
              onRecursosAlterados={() => {
                // Recarregar dados se necessário
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

