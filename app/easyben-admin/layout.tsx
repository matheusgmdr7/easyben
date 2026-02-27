"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import EasyBenSidebar from "@/components/admin/easyben-sidebar"
import EasyBenAuthGuard from "@/components/easyben-admin/auth-guard"
import { usePermissions } from "@/hooks/use-permissions"

export default function EasyBenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/easyben-admin/login"
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('easyben-sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  // Chamar hook no nível superior (sempre chamar para manter ordem dos hooks)
  const permissions = usePermissions()
  const isMaster = isLoginPage ? false : (permissions?.isMaster ?? false)

  // Sincronizar estado do sidebar com o layout (sempre chamar, mas só executar se não for login)
  useEffect(() => {
    if (isLoginPage) return // Não executar na página de login
    
    if (typeof window !== 'undefined') {
      const updateSidebarState = () => {
        const current = localStorage.getItem('easyben-sidebar-collapsed')
        const isCollapsed = current === 'true'
        setSidebarCollapsed(isCollapsed)
      }
      
      const handleSidebarToggle = () => {
        requestAnimationFrame(() => {
          updateSidebarState()
        })
      }
      
      const interval = setInterval(updateSidebarState, 200)
      
      window.addEventListener('easyben-sidebar-toggle', handleSidebarToggle)
      
      return () => {
        window.removeEventListener('easyben-sidebar-toggle', handleSidebarToggle)
        clearInterval(interval)
      }
    }
  }, [isLoginPage])

  // Se for a página de login, renderizar sem sidebar e sem guard
  if (isLoginPage) {
    return <div>{children}</div>
  }

  // Verificar se é master (apenas masters podem acessar EasyBen Admin)
  if (!isMaster) {
    return (
      <EasyBenAuthGuard>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar a administração da EasyBen.</p>
          </div>
        </div>
      </EasyBenAuthGuard>
    )
  }

  return (
    <EasyBenAuthGuard>
      <div className="min-h-screen bg-gray-100">
        <EasyBenSidebar />
        <div 
          className={`flex flex-col transition-all duration-300 bg-gray-100 ${
            sidebarCollapsed 
              ? "md:ml-16 lg:ml-20" 
              : "md:ml-64 lg:ml-72"
          }`}
        >
          <main className="flex-1 overflow-x-auto bg-gray-100" style={{ paddingTop: '1rem', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '2rem' }}>
            <div className="max-w-full md:px-2 lg:px-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </EasyBenAuthGuard>
  )
}


