"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AdminHeader from "@/components/admin/admin-header"
import AdminSidebar from "@/components/admin/admin-sidebar"
import AuthGuard from "@/components/admin/auth-guard"
// RecursoGuard temporariamente desabilitado para isolar "Unsupported Server Component type: undefined"
// import { RecursoGuard } from "@/components/tenant/recurso-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarHovered, setSidebarHovered] = useState(false)
  // Colapsado quando não há hover; expande ao passar o mouse
  const isVisuallyCollapsed = !sidebarHovered

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHover = () => setSidebarHovered(true)
    const onLeave = () => setSidebarHovered(false)
    window.addEventListener('sidebar-hover', onHover)
    window.addEventListener('sidebar-leave', onLeave)
    return () => {
      window.removeEventListener('sidebar-hover', onHover)
      window.removeEventListener('sidebar-leave', onLeave)
    }
  }, [])

  return (
    <AuthGuard>
      {/* RecursoGuard bypassado temporariamente para isolar erro RSC undefined */}
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
