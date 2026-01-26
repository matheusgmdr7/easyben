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
    return true // Iniciar colapsado por padrão
  })
  
  const [sidebarHovered, setSidebarHovered] = useState(false)
  
  // Estado visual (colapsado quando não está com hover)
  const isVisuallyCollapsed = sidebarCollapsed && !sidebarHovered

  // Sincronizar estado do sidebar com o layout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Função para atualizar estado
      const updateSidebarState = () => {
        const current = localStorage.getItem('admin-sidebar-collapsed')
        const isCollapsed = current === 'true'
        setSidebarCollapsed(isCollapsed)
      }
      
      // Listener para eventos customizados do sidebar
      const handleSidebarToggle = () => {
        requestAnimationFrame(() => {
          updateSidebarState()
        })
      }
      
      // Detectar hover no sidebar via eventos customizados
      const handleSidebarHover = () => {
        setSidebarHovered(true)
      }
      
      const handleSidebarLeave = () => {
        setSidebarHovered(false)
      }
      
      // Verificar periodicamente (fallback)
      const interval = setInterval(updateSidebarState, 100)
      
      window.addEventListener('sidebar-toggle', handleSidebarToggle)
      window.addEventListener('sidebar-hover', handleSidebarHover)
      window.addEventListener('sidebar-leave', handleSidebarLeave)
      
      return () => {
        window.removeEventListener('sidebar-toggle', handleSidebarToggle)
        window.removeEventListener('sidebar-hover', handleSidebarHover)
        window.removeEventListener('sidebar-leave', handleSidebarLeave)
        clearInterval(interval)
      }
    }
  }, [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
        <AdminSidebar />
        <div 
          className={`flex flex-col transition-all duration-300 ease-in-out bg-gray-100 ${
            isVisuallyCollapsed 
              ? "md:ml-16 lg:ml-20" 
              : "md:ml-64 lg:ml-72"
          }`}
        >
          <AdminHeader sidebarCollapsed={isVisuallyCollapsed} />
          <main className="flex-1 overflow-x-auto bg-gray-100 transition-all duration-300 ease-in-out" style={{ paddingTop: '5.5rem', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '2rem' }}>
            <div className="max-w-full md:px-2 lg:px-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
