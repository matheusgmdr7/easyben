"use client"

import React, { useState, useEffect } from "react"
import EasyBenSidebar from "@/components/admin/easyben-sidebar"
import AuthGuard from "@/components/admin/auth-guard"
import { usePermissions } from "@/hooks/use-permissions"

export default function EasyBenDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('easyben-sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  // Chamar hook no nível superior
  const permissions = usePermissions()
  const isMaster = permissions?.isMaster ?? false

  // Sincronizar estado do sidebar com o layout
  useEffect(() => {
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
  }, [])

  // Verificar se é master (apenas masters podem acessar EasyBen Admin)
  if (!isMaster) {
    return (
      <AuthGuard>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar a administração da EasyBen.</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
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
    </AuthGuard>
  )
}

