'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarTenant, type CriarTenantData } from '@/services/tenants-service'
import { toast } from 'sonner'

interface ModalCriarTenantProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ModalCriarTenant({ isOpen, onClose, onSuccess }: ModalCriarTenantProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CriarTenantData>({
    slug: '',
    nome: '',
    dominio_principal: '',
    subdominio: '',
    status: 'ativo',
    cor_primaria: '#0F172A',
    cor_secundaria: '#1E293B',
    nome_marca: '',
    email_remetente: '',
    nome_remetente: '',
    dominio_personalizado: '',
  })

  const previewAcesso = useMemo(() => {
    const slug = String(formData.slug || '').trim().toLowerCase()
    const subdominio = String(formData.subdominio || '').trim().toLowerCase()
    const dominioPersonalizado = String(formData.dominio_personalizado || '').trim().toLowerCase()

    const protocolo = typeof window !== 'undefined' ? window.location.protocol.replace(':', '') : 'https'
    const hostAtual = typeof window !== 'undefined' ? window.location.host : 'app.easyben.com.br'

    const hostSemPorta = hostAtual.split(':')[0]
    const labels = hostSemPorta.split('.').filter(Boolean)
    const prefixosPainel = new Set(['www', 'app', 'admin', 'easyben-admin'])
    const dominioNativoBase =
      labels.length >= 3 && prefixosPainel.has(labels[0]) ? labels.slice(1).join('.') : hostSemPorta

    const toUrl = (dominio: string) => {
      if (!dominio) return ''
      const valor = dominio.replace(/^https?:\/\//, '')
      return `${protocolo}://${valor}`
    }

    const porDominioPersonalizado = dominioPersonalizado ? toUrl(dominioPersonalizado) : ''
    const porSubdominio = subdominio ? `${protocolo}://${subdominio}.${dominioNativoBase}` : ''
    const porSlug = slug ? `${protocolo}://${hostAtual}/${slug}` : ''

    return {
      principal: porDominioPersonalizado || porSubdominio || porSlug || '-',
      porDominioPersonalizado: porDominioPersonalizado || '-',
      porSubdominio: porSubdominio || '-',
      porSlug: porSlug || '-',
    }
  }, [formData.slug, formData.subdominio, formData.dominio_personalizado])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.slug || !formData.nome) {
      toast.error('Slug e nome são obrigatórios')
      return
    }

    // Validar formato do slug (apenas letras, números e hífens)
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug deve conter apenas letras minúsculas, números e hífens')
      return
    }

    try {
      setLoading(true)
      await criarTenant(formData)
      toast.success('Plataforma criada com sucesso!')
      onSuccess()
      onClose()
      
      // Resetar formulário
      setFormData({
        slug: '',
        nome: '',
        dominio_principal: '',
        subdominio: '',
        status: 'ativo',
        cor_primaria: '#0F172A',
        cor_secundaria: '#1E293B',
        nome_marca: '',
        email_remetente: '',
        nome_remetente: '',
        dominio_personalizado: '',
      })
    } catch (error: any) {
      toast.error(`Erro ao criar plataforma: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Plataforma</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova plataforma para seu cliente
          </DialogDescription>
        </DialogHeader>
        
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
                  placeholder="Ex: Cliente XYZ"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="Ex: cliente-xyz"
                  required
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Identificador único (apenas letras minúsculas, números e hífens)
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="nome_marca">Nome da Marca</Label>
              <Input
                id="nome_marca"
                value={formData.nome_marca}
                onChange={(e) => setFormData({ ...formData, nome_marca: e.target.value })}
                placeholder="Ex: Cliente XYZ Saúde"
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
                  placeholder="Ex: cliente.com.br"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional. Se não informar, o acesso usa o domínio nativo da EasyBen com o slug.
                </p>
              </div>
              
              <div>
                <Label htmlFor="subdominio">Subdomínio</Label>
                <Input
                  id="subdominio"
                  value={formData.subdominio}
                  onChange={(e) => setFormData({ ...formData, subdominio: e.target.value })}
                  placeholder="Ex: cliente"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional. Se vazio, a plataforma pode ser acessada pelo slug no domínio nativo.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="dominio_personalizado">Domínio Personalizado</Label>
              <Input
                id="dominio_personalizado"
                value={formData.dominio_personalizado}
                onChange={(e) => setFormData({ ...formData, dominio_personalizado: e.target.value })}
                placeholder="Ex: app.cliente.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Domínio completamente personalizado (requer configuração DNS)
              </p>
            </div>

            <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-semibold text-sky-900">Preview da URL final de acesso</p>
              <p className="text-xs text-sky-800 mt-1 break-all">{previewAcesso.principal}</p>
              <p className="text-[11px] text-sky-700 mt-2">Prioridade aplicada:</p>
              <p className="text-[11px] text-sky-700 break-all">1) Domínio personalizado: {previewAcesso.porDominioPersonalizado}</p>
              <p className="text-[11px] text-sky-700 break-all">2) Subdomínio: {previewAcesso.porSubdominio}</p>
              <p className="text-[11px] text-sky-700 break-all">3) Fallback por slug: {previewAcesso.porSlug}</p>
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
                    placeholder="#0F172A"
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
                    placeholder="#1E293B"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="logo_url">URL do Logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url || ''}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>

            <div>
              <Label htmlFor="favicon_url">URL do Favicon</Label>
              <Input
                id="favicon_url"
                value={formData.favicon_url || ''}
                onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                placeholder="https://exemplo.com/favicon.ico"
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
                  placeholder="contato@cliente.com"
                />
              </div>
              
              <div>
                <Label htmlFor="nome_remetente">Nome do Remetente</Label>
                <Input
                  id="nome_remetente"
                  value={formData.nome_remetente}
                  onChange={(e) => setFormData({ ...formData, nome_remetente: e.target.value })}
                  placeholder="Cliente XYZ"
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
              {loading ? 'Criando...' : 'Criar Plataforma'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

