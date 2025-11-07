"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AdminHeader from "@/components/admin/admin-header"
import AdminSidebar from "@/components/admin/admin-sidebar"
import AuthGuard from "@/components/admin/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  // Sincronizar estado do sidebar com o layout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Função para atualizar estado
      const updateSidebarState = () => {
        const current = localStorage.getItem('admin-sidebar-collapsed')
        const isCollapsed = current === 'true'
        setSidebarCollapsed(isCollapsed)
        console.log('📐 Layout: Sidebar colapsado =', isCollapsed, '| Margem aplicada:', isCollapsed ? 'md:ml-16 lg:ml-20' : 'md:ml-64 lg:ml-72')
      }
      
      // Listener para eventos customizados do sidebar
      const handleSidebarToggle = () => {
        // Delay mínimo para garantir que o localStorage foi atualizado
        requestAnimationFrame(() => {
          updateSidebarState()
        })
      }
      
      // Verificar periodicamente (fallback)
      const interval = setInterval(updateSidebarState, 200)
      
      window.addEventListener('sidebar-toggle', handleSidebarToggle)
      
      return () => {
        window.removeEventListener('sidebar-toggle', handleSidebarToggle)
        clearInterval(interval)
      }
    }
  }, [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <AdminSidebar />
        <div 
          className={`flex flex-col transition-all duration-300 bg-gray-100 ${
            sidebarCollapsed 
              ? "md:ml-16 lg:ml-20" 
              : "md:ml-64 lg:ml-72"
          }`}
        >
          <AdminHeader sidebarCollapsed={sidebarCollapsed} />
          <main className="flex-1 overflow-x-auto bg-gray-100" style={{ paddingTop: '5.5rem', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '2rem' }}>
            <div className="max-w-full md:px-2 lg:px-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
