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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Carregando recursos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-gray-700">Recursos e Funcionalidades</h3>
          <p className="text-xs text-gray-500 mt-1">
            Selecione quais recursos e funcionalidades esta plataforma terá acesso
          </p>
        </div>
        <Button
          onClick={handleSalvar}
          disabled={saving}
          className="bg-[#0F172A] hover:bg-[#1E293B]"
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
        {Object.entries(recursosAgrupados).map(([categoria, recursosCategoria]) => (
          <Card key={categoria}>
            <CardHeader>
              <CardTitle className="text-base">{getCategoriaLabel(categoria)}</CardTitle>
              <CardDescription>
                {recursosCategoria.length} recurso(s) disponível(is)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recursosCategoria.map((recurso) => (
                  <div
                    key={recurso.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`recurso-${recurso.id}`}
                      checked={recursosSelecionados.has(recurso.id)}
                      onCheckedChange={() => handleToggleRecurso(recurso.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`recurso-${recurso.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {recurso.nome}
                      </Label>
                      {recurso.descricao && (
                        <p className="text-xs text-gray-500 mt-1">{recurso.descricao}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {recurso.rota_base}
                        </Badge>
                        {recurso.icone && (
                          <Badge variant="secondary" className="text-xs">
                            {recurso.icone}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recursos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum recurso disponível</p>
        </div>
      )}
    </div>
  )
}

