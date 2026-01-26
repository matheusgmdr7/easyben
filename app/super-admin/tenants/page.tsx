'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Eye,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  listarTenants, 
  deletarTenant, 
  ativarTenant,
  obterEstatisticasTenant,
  type Tenant 
} from '@/services/tenants-service'
import { ModalCriarTenant } from '@/components/super-admin/modal-criar-tenant'
import { ModalEditarTenant } from '@/components/super-admin/modal-editar-tenant'
import Link from 'next/link'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModalCriar, setShowModalCriar] = useState(false)
  const [showModalEditar, setShowModalEditar] = useState(false)
  const [tenantSelecionado, setTenantSelecionado] = useState<Tenant | null>(null)
  const [busca, setBusca] = useState('')
  const [estatisticas, setEstatisticas] = useState<Record<string, any>>({})

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const dados = await listarTenants()
      setTenants(dados)
      
      // Carregar estatísticas para cada tenant
      const stats: Record<string, any> = {}
      for (const tenant of dados) {
        try {
          stats[tenant.id] = await obterEstatisticasTenant(tenant.id)
        } catch (error) {
          stats[tenant.id] = {
            totalPropostas: 0,
            totalCorretores: 0,
            totalClientes: 0,
            totalFaturas: 0,
          }
        }
      }
      setEstatisticas(stats)
    } catch (error: any) {
      console.error('Erro ao carregar tenants:', error)
      toast.error(`Erro ao carregar tenants: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletar = async (tenant: Tenant) => {
    if (!confirm(`Tem certeza que deseja desativar o tenant "${tenant.nome}"?`)) {
      return
    }

    try {
      await deletarTenant(tenant.id)
      toast.success('Tenant desativado com sucesso!')
      loadTenants()
    } catch (error: any) {
      toast.error(`Erro ao desativar tenant: ${error.message}`)
    }
  }

  const handleAtivar = async (tenant: Tenant) => {
    try {
      await ativarTenant(tenant.id)
      toast.success('Tenant ativado com sucesso!')
      loadTenants()
    } catch (error: any) {
      toast.error(`Erro ao ativar tenant: ${error.message}`)
    }
  }

  const handleEditar = (tenant: Tenant) => {
    setTenantSelecionado(tenant)
    setShowModalEditar(true)
  }

  const tenantsFiltrados = tenants.filter(tenant => {
    const buscaLower = busca.toLowerCase()
    return (
      tenant.nome.toLowerCase().includes(buscaLower) ||
      tenant.slug.toLowerCase().includes(buscaLower) ||
      tenant.dominio_principal?.toLowerCase().includes(buscaLower) ||
      tenant.subdominio?.toLowerCase().includes(buscaLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F172A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tenants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Tenants</h1>
          <p className="text-gray-600 mt-1">
            Gerencie todos os clientes (tenants) da plataforma white-label
          </p>
        </div>
        <Button onClick={() => setShowModalCriar(true)} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <Plus className="mr-2 h-4 w-4" />
          Criar Novo Tenant
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenants Ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {tenants.filter(t => t.status === 'ativo').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenants Inativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {tenants.filter(t => t.status === 'inativo').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Propostas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(estatisticas).reduce((acc: number, stat: any) => acc + (stat.totalPropostas || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome, slug, domínio..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabela de Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tenants</CardTitle>
          <CardDescription>
            {tenantsFiltrados.length} tenant(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estatísticas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum tenant encontrado
                  </TableCell>
                </TableRow>
              ) : (
                tenantsFiltrados.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {tenant.logo_url ? (
                          <img 
                            src={tenant.logo_url} 
                            alt={tenant.nome}
                            className="w-8 h-8 rounded"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-gray-400" />
                        )}
                        {tenant.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {tenant.dominio_principal && (
                          <div>{tenant.dominio_principal}</div>
                        )}
                        {tenant.subdominio && (
                          <div className="text-gray-500 text-xs">
                            {tenant.subdominio}.plataforma.com
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={tenant.status === 'ativo' ? 'default' : 'secondary'}
                        className={
                          tenant.status === 'ativo' 
                            ? 'bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]' 
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {tenant.status === 'ativo' ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Inativo
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {estatisticas[tenant.id] && (
                        <div className="text-xs space-y-1">
                          <div>Propostas: {estatisticas[tenant.id].totalPropostas || 0}</div>
                          <div>Corretores: {estatisticas[tenant.id].totalCorretores || 0}</div>
                          <div>Clientes: {estatisticas[tenant.id].totalClientes || 0}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditar(tenant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/super-admin/tenants/${tenant.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {tenant.status === 'ativo' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletar(tenant)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAtivar(tenant)}
                            className="text-[#0F172A] hover:text-[#0F172A]"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modais */}
      {showModalCriar && (
        <ModalCriarTenant
          isOpen={showModalCriar}
          onClose={() => setShowModalCriar(false)}
          onSuccess={loadTenants}
        />
      )}

      {showModalEditar && tenantSelecionado && (
        <ModalEditarTenant
          isOpen={showModalEditar}
          onClose={() => {
            setShowModalEditar(false)
            setTenantSelecionado(null)
          }}
          tenant={tenantSelecionado}
          onSuccess={loadTenants}
        />
      )}
    </div>
  )
}

