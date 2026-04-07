"use client"

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantRecurso } from '@/hooks/use-tenant-recurso'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Lock } from 'lucide-react'

interface RecursoGuardProps {
  codigoRecurso: string
  children: ReactNode
  redirectTo?: string
  showError?: boolean
}

/**
 * Componente que protege rotas baseado em recursos habilitados para o tenant
 * 
 * @param codigoRecurso - Código do recurso a verificar (ex: 'portal_corretor')
 * @param children - Conteúdo a ser renderizado se tiver acesso
 * @param redirectTo - Rota para redirecionar se não tiver acesso (opcional)
 * @param showError - Se deve mostrar mensagem de erro ao invés de redirecionar
 */
export function RecursoGuard({ 
  codigoRecurso, 
  children, 
  redirectTo,
  showError = false 
}: RecursoGuardProps) {
  const router = useRouter()
  
  // Garantir que codigoRecurso sempre tem um valor válido
  if (!codigoRecurso) {
    console.warn('RecursoGuard: codigoRecurso não fornecido')
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Erro de Configuração</CardTitle>
            </div>
            <CardDescription>Código do recurso não fornecido</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }
  
  const { hasAccess, loading, error } = useTenantRecurso(codigoRecurso)
  
  // Garantir que sempre temos valores válidos (nunca undefined)
  const isLoading = loading === true
  const hasAccessValue = hasAccess === true
  const errorValue = error || null

  useEffect(() => {
    if (!isLoading && !hasAccessValue && redirectTo) {
      router.push(redirectTo)
    }
  }, [isLoading, hasAccessValue, redirectTo, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/80">
        <div className="flex flex-col items-center gap-6 px-4" role="status" aria-live="polite">
          <div className="relative h-14 w-14" aria-hidden>
            <div className="absolute inset-0 rounded-full border-[3px] border-slate-200/90" />
            <div
              className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-slate-900 border-r-slate-900/40 animate-spin"
              style={{ animationDuration: '0.85s' }}
            />
            <div
              className="absolute inset-2 rounded-full border-2 border-transparent border-b-slate-400/60 animate-spin"
              style={{ animationDuration: '1.25s', animationDirection: 'reverse' }}
            />
          </div>
          <p className="text-sm font-medium tracking-wide text-slate-600">Carregando</p>
        </div>
      </div>
    )
  }

  if (errorValue) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Erro ao verificar acesso</CardTitle>
            </div>
            <CardDescription>{errorValue}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!hasAccessValue) {
    if (showError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-md w-full border-orange-200">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Acesso Restrito</CardTitle>
              </div>
              <CardDescription>
                Este recurso não está habilitado para sua plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Entre em contato com o administrador para habilitar este recurso.
              </p>
              <Button 
                onClick={() => router.push('/')} 
                variant="outline"
                className="w-full"
              >
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // Se não mostrar erro e não tiver redirectTo, não renderizar nada (mas retornar elemento válido)
    return <div style={{ display: 'none' }}></div>
  }

  return <>{children}</>
}
