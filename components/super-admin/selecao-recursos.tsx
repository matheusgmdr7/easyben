'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listarRecursosDoTenant, atualizarRecursosTenant, agruparRecursosPorCategoria, type RecursoComStatus } from '@/services/recursos-service'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface SelecaoRecursosProps {
  tenantId: string
  onRecursosAlterados?: () => void
}

export function SelecaoRecursos({ tenantId, onRecursosAlterados }: SelecaoRecursosProps) {
  const [recursos, setRecursos] = useState<RecursoComStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recursosSelecionados, setRecursosSelecionados] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (tenantId) {
      carregarRecursos()
    }
  }, [tenantId])

  const carregarRecursos = async () => {
    try {
      setLoading(true)
      const dados = await listarRecursosDoTenant(tenantId)
      setRecursos(dados)
      
      // Inicializar recursos selecionados
      const selecionados = new Set<string>()
      dados.forEach(recurso => {
        if (recurso.habilitado) {
          selecionados.add(recurso.id)
        }
      })
      setRecursosSelecionados(selecionados)
    } catch (error: any) {
      console.error('Erro ao carregar recursos:', error)
      toast.error(`Erro ao carregar recursos: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRecurso = (recursoId: string) => {
    const novosSelecionados = new Set(recursosSelecionados)
    if (novosSelecionados.has(recursoId)) {
      novosSelecionados.delete(recursoId)
    } else {
      novosSelecionados.add(recursoId)
    }
    setRecursosSelecionados(novosSelecionados)
  }

  const handleToggleCategoria = (categoria: string, recursosCategoria: RecursoComStatus[]) => {
    const todosHabilitados = recursosCategoria.every(r => recursosSelecionados.has(r.id))
    const novosSelecionados = new Set(recursosSelecionados)
    
    if (todosHabilitados) {
      // Desabilitar todos da categoria
      recursosCategoria.forEach(r => novosSelecionados.delete(r.id))
    } else {
      // Habilitar todos da categoria
      recursosCategoria.forEach(r => novosSelecionados.add(r.id))
    }
    
    setRecursosSelecionados(novosSelecionados)
  }

  const handleSalvar = async () => {
    try {
      setSaving(true)
      
      const recursosParaAtualizar = recursos.map(recurso => ({
        recurso_id: recurso.id,
        habilitado: recursosSelecionados.has(recurso.id),
      }))

      await atualizarRecursosTenant(tenantId, recursosParaAtualizar)
      toast.success('Recursos atualizados com sucesso!')
      
      // Recarregar recursos para atualizar estado
      await carregarRecursos()
      
      if (onRecursosAlterados) {
        onRecursosAlterados()
      }
    } catch (error: any) {
      console.error('Erro ao salvar recursos:', error)
      toast.error(`Erro ao salvar recursos: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const recursosAgrupados = agruparRecursosPorCategoria(recursos)

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      'publico': 'Público',
      'portal': 'Portais',
      'financeiro': 'Financeiro',
      'relatorios': 'Relatórios',
      'outros': 'Outros',
    }
    return labels[categoria] || categoria
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00C6FF] mb-4" />
        <p className="text-gray-600 font-medium">Carregando recursos...</p>
        <p className="text-xs text-gray-400 mt-1">Aguarde enquanto buscamos as informações</p>
      </div>
    )
  }

  const totalRecursos = recursos.length
  const recursosHabilitados = recursosSelecionados.size
  const temAlteracoes = recursos.some(recurso => {
    const estavaHabilitado = recurso.habilitado
    const estaHabilitado = recursosSelecionados.has(recurso.id)
    return estavaHabilitado !== estaHabilitado
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">Recursos e Funcionalidades</h3>
          <p className="text-sm text-gray-600 mt-1">
            Selecione quais recursos e funcionalidades esta plataforma terá acesso
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-md border border-green-200">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-700">
                <strong className="text-green-600 font-semibold">{recursosHabilitados}</strong> de{' '}
                <strong className="text-gray-700">{totalRecursos}</strong> recursos habilitados
              </span>
            </div>
            {temAlteracoes && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">
                ⚠️ Alterações não salvas
              </Badge>
            )}
            {!temAlteracoes && recursos.length > 0 && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                ✓ Tudo salvo
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={handleSalvar}
          disabled={saving || !temAlteracoes}
          className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Recursos'
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {Object.entries(recursosAgrupados).map(([categoria, recursosCategoria]) => {
          const habilitadosNaCategoria = recursosCategoria.filter(r => recursosSelecionados.has(r.id)).length
          return (
            <Card key={categoria} className="border-2">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold">{getCategoriaLabel(categoria)}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="text-green-600 font-medium">{habilitadosNaCategoria}</span> de{' '}
                      <span className="font-medium">{recursosCategoria.length}</span> recurso(s) habilitado(s)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={habilitadosNaCategoria === recursosCategoria.length ? "default" : "secondary"} className="text-xs">
                      {habilitadosNaCategoria === recursosCategoria.length ? 'Todos habilitados' : 'Parcial'}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleCategoria(categoria, recursosCategoria)}
                      className="text-xs h-7"
                    >
                      {habilitadosNaCategoria === recursosCategoria.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {recursosCategoria.map((recurso) => {
                    const estaHabilitado = recursosSelecionados.has(recurso.id)
                    return (
                      <div
                        key={recurso.id}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                          estaHabilitado
                            ? 'border-green-200 bg-green-50 hover:bg-green-100'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          id={`recurso-${recurso.id}`}
                          checked={estaHabilitado}
                          onCheckedChange={() => handleToggleRecurso(recurso.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`recurso-${recurso.id}`}
                              className="font-semibold cursor-pointer text-gray-900"
                            >
                              {recurso.nome}
                            </Label>
                            {estaHabilitado && (
                              <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                                Habilitado
                              </Badge>
                            )}
                          </div>
                          {recurso.descricao && (
                            <p className="text-sm text-gray-600 mt-1">{recurso.descricao}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              {recurso.rota_base}
                            </Badge>
                            {recurso.icone && (
                              <Badge variant="secondary" className="text-xs">
                                <span className="mr-1">📦</span>
                                {recurso.icone}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {recursos.length === 0 && !loading && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 text-sm">Nenhum recurso disponível no sistema</p>
            <p className="text-gray-400 text-xs mt-2">
              Entre em contato com o administrador para adicionar recursos
            </p>
          </CardContent>
        </Card>
      )}

      {Object.keys(recursosAgrupados).length === 0 && !loading && recursos.length > 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 text-sm">Nenhuma categoria encontrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

