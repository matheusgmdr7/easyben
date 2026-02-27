"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AuthGuard from "@/components/admin/auth-guard"
import AnalistaSidebar from "@/components/analista/analista-sidebar"
import AnalistaHeader from "@/components/analista/analista-header"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { RecursoGuard } from "@/components/tenant/recurso-guard"
import { Spinner } from "@/components/ui/spinner"

export default function AnalistaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { podeVisualizar, isMaster } = usePermissions()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  // Sidebar sempre inicia colapsado (não há toggle manual, só expande no hover)
  const [sidebarCollapsed] = useState(true)
  const [sidebarHovered, setSidebarHovered] = useState(false)

  useEffect(() => {
    // Aguardar um pouco para garantir que as permissões foram carregadas
    const timer = setTimeout(() => {
      // Buscar dados do usuário do localStorage
      const adminUsuario = localStorage.getItem("admin_usuario")
      if (!adminUsuario) {
        router.push("/analista/login")
        return
      }

      try {
        const usuario = JSON.parse(adminUsuario)
        
        // Verificar status do usuário
        if (usuario.status === "pendente") {
          router.push("/analista/aguardando-aprovacao")
          return
        }

        if (usuario.status !== "ativo") {
          router.push("/analista/aguardando-aprovacao")
          return
        }

        // Verificar se o usuário tem permissão de analista
        const canAccess = isMaster || podeVisualizar("propostas") || podeVisualizar("em_analise") || podeVisualizar("cadastrado")
        
        if (!canAccess) {
          router.push("/admin")
          return
        }

        setHasAccess(true)
        setLoading(false)
      } catch (error) {
        console.error("Erro ao parsear dados do usuário:", error)
        router.push("/analista/login")
      }
    }, 100)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaster, router]) // podeVisualizar é uma função estável do hook, não precisa estar nas dependências

  // Sincronizar estado do hover do sidebar com o layout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Detectar hover no sidebar via eventos customizados
      const handleSidebarHover = () => {
        setSidebarHovered(true)
      }
      
      const handleSidebarLeave = () => {
        setSidebarHovered(false)
      }
      
      window.addEventListener('sidebar-hover', handleSidebarHover)
      window.addEventListener('sidebar-leave', handleSidebarLeave)
      
      return () => {
        window.removeEventListener('sidebar-hover', handleSidebarHover)
        window.removeEventListener('sidebar-leave', handleSidebarLeave)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-gray-600">Verificando permissões...</span>
      </div>
    )
  }

  const isVisuallyCollapsed = sidebarCollapsed && !sidebarHovered

  return (
    <AuthGuard>
      <RecursoGuard codigoRecurso="portal_analista" redirectTo="/admin" showError={true}>
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
        <AnalistaSidebar />
        <div 
          className={`flex flex-col transition-all duration-300 ease-in-out bg-gray-50 ${
            isVisuallyCollapsed 
              ? "md:ml-16 lg:ml-20" 
              : "md:ml-64 lg:ml-72"
          }`}
        >
          <AnalistaHeader sidebarCollapsed={isVisuallyCollapsed} />
          <main className="flex-1 overflow-x-auto bg-gray-50 transition-all duration-300 ease-in-out" style={{ paddingTop: '5.5rem', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '2rem' }}>
            <div className="max-w-full md:px-2 lg:px-4">
              {children}
            </div>
          </main>
        </div>
      </div>
      </RecursoGuard>
    </AuthGuard>
  )
}

