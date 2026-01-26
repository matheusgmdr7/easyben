"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { verificarAutenticacaoAdministradora, getAdministradoraLogada } from "@/services/auth-administradoras-service"
import AdministradoraSidebar from "@/components/administradora/administradora-sidebar"
import AdministradoraHeader from "@/components/administradora/administradora-header"

export default function AdministradoraLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('administradora-sidebar-collapsed')
      // Sempre iniciar como colapsado se não houver valor salvo ou se o valor for 'false'
      if (saved === null || saved === 'false') {
        localStorage.setItem('administradora-sidebar-collapsed', 'true')
        return true
      }
      return saved === 'true'
    }
    return true // Iniciar colapsado
  })
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [loading, setLoading] = useState(true)

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = () => {
      const { autenticado, administradora } = verificarAutenticacaoAdministradora()
      
      if (!autenticado) {
        router.push("/administradora/login")
        return
      }

      // Verificar status de login
      if (administradora?.status_login !== "ativo") {
        router.push("/administradora/aguardando-aprovacao")
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Sincronizar estado do sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSidebarState = () => {
        const current = localStorage.getItem('administradora-sidebar-collapsed')
        const isCollapsed = current === 'true'
        setSidebarCollapsed(isCollapsed)
      }
      
      const handleSidebarToggle = () => {
        requestAnimationFrame(() => {
          updateSidebarState()
        })
      }

      const handleSidebarHover = () => {
        setSidebarHovered(true)
      }

      const handleSidebarLeave = () => {
        setSidebarHovered(false)
      }
      
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

  // Calcular se o sidebar está visualmente colapsado
  const isVisuallyCollapsed = sidebarCollapsed && !sidebarHovered

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-corporate"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AdministradoraSidebar />
      <div 
        className={`flex flex-col transition-all duration-300 ease-in-out bg-gray-100 ${
          isVisuallyCollapsed
            ? "md:ml-16 lg:ml-20" 
            : "md:ml-64 lg:ml-72"
        }`}
      >
        <AdministradoraHeader sidebarCollapsed={isVisuallyCollapsed} />
        <main className="flex-1 overflow-x-auto bg-gray-100 transition-all duration-300 ease-in-out" style={{ paddingTop: '5.5rem', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '2rem' }}>
          <div className="max-w-full md:px-2 lg:px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

