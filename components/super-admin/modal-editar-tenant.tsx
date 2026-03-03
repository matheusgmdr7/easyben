'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { atualizarTenant, type EditarTenantData, type Tenant } from '@/services/tenants-service'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SelecaoRecursos } from './selecao-recursos'
import { Eye, EyeOff } from 'lucide-react'

interface ModalEditarTenantProps {
  isOpen: boolean
  onClose: () => void
  tenant: Tenant
  onSuccess: () => void
}

type LogoAjuste = {
  zoom: number
  x: number
  y: number
}

const LOGO_AJUSTE_PADRAO: LogoAjuste = {
  zoom: 1,
  x: 0,
  y: 0,
}

export function ModalEditarTenant({ isOpen, onClose, tenant, onSuccess }: ModalEditarTenantProps) {
  const [loading, setLoading] = useState(false)
  const [loadingCredenciais, setLoadingCredenciais] = useState(false)
  const [criandoAdministradora, setCriandoAdministradora] = useState(false)
  const [salvandoAdmin, setSalvandoAdmin] = useState(false)
  const [salvandoAnalista, setSalvandoAnalista] = useState(false)
  const [salvandoAdministradora, setSalvandoAdministradora] = useState(false)
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
  const [credenciaisAdmin, setCredenciaisAdmin] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  })
  const [credenciaisAnalista, setCredenciaisAnalista] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  })
  const [administradoraVinculadaNome, setAdministradoraVinculadaNome] = useState('')
  const [credenciaisAdministradora, setCredenciaisAdministradora] = useState({
    email: '',
    senha: '',
    confirmarSenha: '',
  })
  const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false)
  const [mostrarConfirmacaoAdmin, setMostrarConfirmacaoAdmin] = useState(false)
  const [mostrarSenhaAnalista, setMostrarSenhaAnalista] = useState(false)
  const [mostrarConfirmacaoAnalista, setMostrarConfirmacaoAnalista] = useState(false)
  const [mostrarSenhaAdministradora, setMostrarSenhaAdministradora] = useState(false)
  const [mostrarConfirmacaoAdministradora, setMostrarConfirmacaoAdministradora] = useState(false)
  const [logoAjuste, setLogoAjuste] = useState<LogoAjuste>(LOGO_AJUSTE_PADRAO)

  useEffect(() => {
    if (tenant) {
      const ajusteSalvo = (tenant?.configuracoes as any)?.logo_ajuste || {}
      const zoom = Number(ajusteSalvo?.zoom)
      const x = Number(ajusteSalvo?.x)
      const y = Number(ajusteSalvo?.y)
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
        configuracoes: tenant.configuracoes || {},
      })
      setLogoAjuste({
        zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : LOGO_AJUSTE_PADRAO.zoom,
        x: Number.isFinite(x) ? x : LOGO_AJUSTE_PADRAO.x,
        y: Number.isFinite(y) ? y : LOGO_AJUSTE_PADRAO.y,
      })
    }
  }, [tenant])

  useEffect(() => {
    if (!isOpen || !tenant?.id) return
    carregarCredenciais()
  }, [isOpen, tenant?.id])

  const carregarCredenciais = async () => {
    try {
      setLoadingCredenciais(true)
      const response = await fetch(`/api/super-admin/tenants/${tenant.id}/credenciais`)
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json?.error || 'Erro ao carregar credenciais')

      setCredenciaisAdmin({
        nome: json?.admin?.nome || '',
        email: json?.admin?.email || '',
        senha: '',
        confirmarSenha: '',
      })
      setCredenciaisAnalista({
        nome: json?.analista?.nome || '',
        email: json?.analista?.email || '',
        senha: '',
        confirmarSenha: '',
      })

      setAdministradoraVinculadaNome(json?.administradora?.nome || '')
      setCredenciaisAdministradora({
        email: json?.administradora?.email_login || '',
        senha: '',
        confirmarSenha: '',
      })
      return json
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar credenciais da plataforma')
      return null
    } finally {
      setLoadingCredenciais(false)
    }
  }

  const resumoCredenciais = useMemo(() => {
    const adminEmail = String(credenciaisAdmin.email || '').trim()
    const analistaEmail = String(credenciaisAnalista.email || '').trim()
    const administradoraEmail = String(credenciaisAdministradora.email || '').trim()
    const total = [adminEmail, analistaEmail, administradoraEmail].filter(Boolean).length
    return {
      total,
      admin: { quantidade: adminEmail ? 1 : 0, email: adminEmail },
      analista: { quantidade: analistaEmail ? 1 : 0, email: analistaEmail },
      administradora: { quantidade: administradoraEmail ? 1 : 0, email: administradoraEmail },
    }
  }, [credenciaisAdmin.email, credenciaisAnalista.email, credenciaisAdministradora.email])

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

  const salvarCredencialAdmin = async () => {
    if (!credenciaisAdmin.email || !credenciaisAdmin.senha) {
      toast.error('Preencha email e senha do acesso /admin')
      return
    }
    if (credenciaisAdmin.senha !== credenciaisAdmin.confirmarSenha) {
      toast.error('A confirmação de senha do /admin não confere')
      return
    }
    try {
      setSalvandoAdmin(true)
      const response = await fetch(`/api/super-admin/tenants/${tenant.id}/credenciais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'admin',
          nome: credenciaisAdmin.nome,
          email: credenciaisAdmin.email,
          senha: credenciaisAdmin.senha,
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json?.error || 'Erro ao salvar credencial /admin')
      toast.success(json?.operation === 'criada' ? 'Credencial /admin criada com sucesso!' : 'Credencial /admin atualizada com sucesso!')
      setCredenciaisAdmin((prev) => ({ ...prev, senha: '', confirmarSenha: '' }))
      await carregarCredenciais()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar credencial /admin')
    } finally {
      setSalvandoAdmin(false)
    }
  }

  const salvarCredencialAnalista = async () => {
    if (!credenciaisAnalista.email || !credenciaisAnalista.senha) {
      toast.error('Preencha email e senha do acesso /analista')
      return
    }
    if (credenciaisAnalista.senha !== credenciaisAnalista.confirmarSenha) {
      toast.error('A confirmação de senha do /analista não confere')
      return
    }
    try {
      setSalvandoAnalista(true)
      const response = await fetch(`/api/super-admin/tenants/${tenant.id}/credenciais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'analista',
          nome: credenciaisAnalista.nome,
          email: credenciaisAnalista.email,
          senha: credenciaisAnalista.senha,
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json?.error || 'Erro ao salvar credencial /analista')
      toast.success(json?.operation === 'criada' ? 'Credencial /analista criada com sucesso!' : 'Credencial /analista atualizada com sucesso!')
      setCredenciaisAnalista((prev) => ({ ...prev, senha: '', confirmarSenha: '' }))
      await carregarCredenciais()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar credencial /analista')
    } finally {
      setSalvandoAnalista(false)
    }
  }

  const salvarCredencialAdministradora = async () => {
    if (!credenciaisAdministradora.email || !credenciaisAdministradora.senha) {
      toast.error('Preencha email/senha da administradora da plataforma')
      return
    }
    if (credenciaisAdministradora.senha !== credenciaisAdministradora.confirmarSenha) {
      toast.error('A confirmação de senha do /administradora não confere')
      return
    }
    try {
      setSalvandoAdministradora(true)
      const response = await fetch(`/api/super-admin/tenants/${tenant.id}/credenciais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'administradora',
          email: credenciaisAdministradora.email,
          senha: credenciaisAdministradora.senha,
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json?.error || 'Erro ao salvar credencial /administradora')
      toast.success(json?.operation === 'criada' ? 'Credencial /administradora criada com sucesso!' : 'Credencial /administradora atualizada com sucesso!')
      setCredenciaisAdministradora((prev) => ({ ...prev, senha: '', confirmarSenha: '' }))
      await carregarCredenciais()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar credencial /administradora')
    } finally {
      setSalvandoAdministradora(false)
    }
  }

  const criarVincularAdministradora = async () => {
    try {
      setCriandoAdministradora(true)
      const response = await fetch(`/api/super-admin/tenants/${tenant.id}/credenciais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'criar_vincular_administradora',
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json?.error || 'Erro ao criar/vincular administradora')
      toast.success(json?.message || 'Administradora criada e vinculada com sucesso!')
      await carregarCredenciais()
      onSuccess()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar/vincular administradora')
    } finally {
      setCriandoAdministradora(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.slug || !formData.nome) {
      toast.error('Slug e nome são obrigatórios')
      return
    }

    try {
      setLoading(true)
      const configuracoesAtuais = (formData.configuracoes || {}) as Record<string, any>
      const payload: EditarTenantData = {
        ...formData,
        configuracoes: {
          ...configuracoesAtuais,
          logo_ajuste: {
            zoom: Number(logoAjuste.zoom.toFixed(2)),
            x: Math.round(logoAjuste.x),
            y: Math.round(logoAjuste.y),
          },
        },
      }
      await atualizarTenant(payload)
      toast.success('Plataforma atualizada com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(`Erro ao atualizar plataforma: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const normalizarUrlImagem = (url: string | null | undefined) => {
    const valor = String(url || '').trim()
    if (!valor) return ''
    if (
      valor.startsWith('http://') ||
      valor.startsWith('https://') ||
      valor.startsWith('data:') ||
      valor.startsWith('blob:') ||
      valor.startsWith('/')
    ) {
      return valor
    }
    if (valor.startsWith('//')) return `https:${valor}`
    return `https://${valor}`
  }

  const previewLogoUrl = normalizarUrlImagem(formData.logo_url)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Editar Plataforma</DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            Atualize as informações da plataforma e configure os recursos disponíveis
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="dados" className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="dados" className="text-sm font-medium">
              Dados da Plataforma
            </TabsTrigger>
            <TabsTrigger value="recursos" className="text-sm font-medium">
              Recursos e Funcionalidades
            </TabsTrigger>
            <TabsTrigger value="credenciais" className="text-sm font-medium">
              Credenciais de Acesso
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dados" className="flex-1 overflow-y-auto space-y-6 pr-2">
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-base text-gray-900 mb-4">Dados Básicos</h3>
            
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
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-base text-gray-900 mb-4">Configurações de Domínio</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dominio_principal">Domínio Principal</Label>
                <Input
                  id="dominio_principal"
                  value={formData.dominio_principal}
                  onChange={(e) => setFormData({ ...formData, dominio_principal: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional. Se não informado, a plataforma usa o domínio nativo da EasyBen com o slug.
                </p>
              </div>
              
              <div>
                <Label htmlFor="subdominio">Subdomínio</Label>
                <Input
                  id="subdominio"
                  value={formData.subdominio}
                  onChange={(e) => setFormData({ ...formData, subdominio: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional. Se vazio, o acesso pode ser feito via slug no domínio nativo.
                </p>
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
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-base text-gray-900 mb-4">Personalização</h3>
            
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

            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">Ajuste da logo para espaços pequenos</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLogoAjuste(LOGO_AJUSTE_PADRAO)}
                >
                  Resetar
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Use zoom e posição para "recortar" visualmente a logo no sidebar, sem editar o arquivo original.
              </p>

              <div className="h-16 w-full max-w-[320px] border border-gray-200 rounded-md bg-gray-50 overflow-hidden relative">
                {previewLogoUrl ? (
                  <img
                    src={previewLogoUrl}
                    alt="Preview da logo"
                    className="absolute top-1/2 left-1/2 w-full h-full object-contain"
                    style={{
                      transform: `translate(calc(-50% + ${logoAjuste.x}px), calc(-50% + ${logoAjuste.y}px)) scale(${logoAjuste.zoom})`,
                      transformOrigin: 'center center',
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                    Informe uma URL de logo para visualizar o ajuste
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Zoom ({logoAjuste.zoom.toFixed(2)}x)</Label>
                  <Input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={logoAjuste.zoom}
                    onChange={(e) => setLogoAjuste((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Posição X ({Math.round(logoAjuste.x)}px)</Label>
                  <Input
                    type="range"
                    min="-120"
                    max="120"
                    step="1"
                    value={logoAjuste.x}
                    onChange={(e) => setLogoAjuste((prev) => ({ ...prev, x: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Posição Y ({Math.round(logoAjuste.y)}px)</Label>
                  <Input
                    type="range"
                    min="-80"
                    max="80"
                    step="1"
                    value={logoAjuste.y}
                    onChange={(e) => setLogoAjuste((prev) => ({ ...prev, y: Number(e.target.value) }))}
                  />
                </div>
              </div>
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
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-base text-gray-900 mb-4">Configurações de Email</h3>
            
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
              <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white pb-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white min-w-[140px]">
                  {loading ? (
                    <>
                      <span className="mr-2">Salvando...</span>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="recursos" className="flex-1 overflow-y-auto pr-2">
            <SelecaoRecursos 
              tenantId={tenant.id} 
              onRecursosAlterados={() => {
                onSuccess()
              }}
            />
          </TabsContent>

          <TabsContent value="credenciais" className="flex-1 overflow-y-auto space-y-6 pr-2">
            {loadingCredenciais ? (
              <div className="p-4 border rounded-md text-sm text-gray-600 bg-gray-50">
                Carregando credenciais da plataforma...
              </div>
            ) : (
              <>
                <div className="p-3 rounded-md border border-sky-200 bg-sky-50 text-sm text-sky-900">
                  <span className="font-medium">Resumo geral:</span>{' '}
                  {resumoCredenciais.total} credencial(is) com email configurado nesta plataforma.
                </div>
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-base text-gray-900">Acesso principal `/admin`</h3>
                  <p className="text-xs text-gray-600">
                    Cria ou atualiza o usuário administrativo da plataforma para acesso ao painel interno.
                  </p>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                    Credenciais criadas nesta seção: <span className="font-semibold">{resumoCredenciais.admin.quantidade}</span>
                    {' | '}
                    Email de acesso: <span className="font-semibold">{resumoCredenciais.admin.email || 'não configurado'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="admin_nome">Nome</Label>
                      <Input
                        id="admin_nome"
                        value={credenciaisAdmin.nome}
                        onChange={(e) => setCredenciaisAdmin((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_email">Email</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={credenciaisAdmin.email}
                        onChange={(e) => setCredenciaisAdmin((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="admin@empresa.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label htmlFor="admin_senha">Senha</Label>
                      <div className="relative">
                        <Input
                          id="admin_senha"
                          type={mostrarSenhaAdmin ? 'text' : 'password'}
                          value={credenciaisAdmin.senha}
                          onChange={(e) => setCredenciaisAdmin((prev) => ({ ...prev, senha: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenhaAdmin((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {mostrarSenhaAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="admin_confirmar_senha">Confirmar senha</Label>
                      <div className="relative">
                        <Input
                          id="admin_confirmar_senha"
                          type={mostrarConfirmacaoAdmin ? 'text' : 'password'}
                          value={credenciaisAdmin.confirmarSenha}
                          onChange={(e) => setCredenciaisAdmin((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                          placeholder="Repita a senha"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmacaoAdmin((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {mostrarConfirmacaoAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex md:justify-end">
                      <Button
                        type="button"
                        onClick={salvarCredencialAdmin}
                        disabled={salvandoAdmin}
                        className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white min-w-[180px]"
                      >
                        {salvandoAdmin ? 'Salvando /admin...' : 'Salvar credencial /admin'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-base text-gray-900">Acesso operacional `/analista`</h3>
                  <p className="text-xs text-gray-600">
                    Cria ou atualiza o usuário do portal do analista desta plataforma.
                  </p>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                    Credenciais criadas nesta seção: <span className="font-semibold">{resumoCredenciais.analista.quantidade}</span>
                    {' | '}
                    Email de acesso: <span className="font-semibold">{resumoCredenciais.analista.email || 'não configurado'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="analista_nome">Nome</Label>
                      <Input
                        id="analista_nome"
                        value={credenciaisAnalista.nome}
                        onChange={(e) => setCredenciaisAnalista((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome do analista"
                      />
                    </div>
                    <div>
                      <Label htmlFor="analista_email">Email</Label>
                      <Input
                        id="analista_email"
                        type="email"
                        value={credenciaisAnalista.email}
                        onChange={(e) => setCredenciaisAnalista((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="analista@empresa.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label htmlFor="analista_senha">Senha</Label>
                      <div className="relative">
                        <Input
                          id="analista_senha"
                          type={mostrarSenhaAnalista ? 'text' : 'password'}
                          value={credenciaisAnalista.senha}
                          onChange={(e) => setCredenciaisAnalista((prev) => ({ ...prev, senha: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenhaAnalista((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {mostrarSenhaAnalista ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="analista_confirmar_senha">Confirmar senha</Label>
                      <div className="relative">
                        <Input
                          id="analista_confirmar_senha"
                          type={mostrarConfirmacaoAnalista ? 'text' : 'password'}
                          value={credenciaisAnalista.confirmarSenha}
                          onChange={(e) => setCredenciaisAnalista((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                          placeholder="Repita a senha"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmacaoAnalista((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {mostrarConfirmacaoAnalista ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex md:justify-end">
                      <Button
                        type="button"
                        onClick={salvarCredencialAnalista}
                        disabled={salvandoAnalista}
                        className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white min-w-[180px]"
                      >
                        {salvandoAnalista ? 'Salvando /analista...' : 'Salvar credencial /analista'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-base text-gray-900">Acesso cliente `/administradora`</h3>
                  <p className="text-xs text-gray-600">
                    Configure o login da administradora principal desta plataforma (modelo 1:1).
                  </p>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                    Credenciais criadas nesta seção: <span className="font-semibold">{resumoCredenciais.administradora.quantidade}</span>
                    {' | '}
                    Email de acesso: <span className="font-semibold">{resumoCredenciais.administradora.email || 'não configurado'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Administradora vinculada</Label>
                      <div className="h-10 rounded-md border border-gray-300 bg-gray-100 px-3 flex items-center text-sm text-gray-700">
                        {administradoraVinculadaNome || 'Nenhuma administradora vinculada'}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="administradora_email">Email de login</Label>
                      <Input
                        id="administradora_email"
                        type="email"
                        value={credenciaisAdministradora.email}
                        onChange={(e) => setCredenciaisAdministradora((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="cliente@empresa.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label htmlFor="administradora_senha">Senha</Label>
                      <div className="relative">
                        <Input
                          id="administradora_senha"
                          type={mostrarSenhaAdministradora ? 'text' : 'password'}
                          value={credenciaisAdministradora.senha}
                          onChange={(e) => setCredenciaisAdministradora((prev) => ({ ...prev, senha: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenhaAdministradora((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {mostrarSenhaAdministradora ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="administradora_confirmar_senha">Confirmar senha</Label>
                      <div className="relative">
                        <Input
                          id="administradora_confirmar_senha"
                          type={mostrarConfirmacaoAdministradora ? 'text' : 'password'}
                          value={credenciaisAdministradora.confirmarSenha}
                          onChange={(e) => setCredenciaisAdministradora((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                          placeholder="Repita a senha"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmacaoAdministradora((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {mostrarConfirmacaoAdministradora ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex md:justify-end">
                      <Button
                        type="button"
                        onClick={salvarCredencialAdministradora}
                        disabled={salvandoAdministradora || !administradoraVinculadaNome}
                        className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white min-w-[220px]"
                      >
                        {salvandoAdministradora ? 'Salvando /administradora...' : 'Salvar credencial /administradora'}
                      </Button>
                    </div>
                  </div>
                  {!administradoraVinculadaNome && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <p className="text-xs text-amber-700">
                        Nenhuma administradora vinculada a esta plataforma.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={criarVincularAdministradora}
                        disabled={criandoAdministradora}
                        className="border-[#00C6FF] text-[#00A8D8] hover:bg-[#EAF8FD]"
                      >
                        {criandoAdministradora ? 'Criando administradora...' : 'Criar e vincular administradora'}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

