"use client"

import { Button } from "@/components/ui/button"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Globe,
  Settings,
  Building2,
  Users,
  FileText,
  BarChart3,
  Home,
  Shield,
} from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { signOutAdmin } from "@/lib/supabase-auth"

export default function EasyBenSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Não renderizar sidebar na página de login
  if (pathname?.includes('/easyben-admin/login')) {
    return null
  }
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('easyben-sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  
  const { isMaster } = usePermissions()
  
  // Salvar estado colapsado no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('easyben-sidebar-collapsed', String(isCollapsed))
      setTimeout(() => {
        window.dispatchEvent(new Event('easyben-sidebar-toggle'))
      }, 0)
    }
  }, [isCollapsed])

  // Detectar se é mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  // Fechar sidebar automaticamente após navegação em mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [pathname, isMobile])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const isActive = (path: string) => {
    if (pathname === path) return true
    if (pathname.startsWith(path + '/')) return true
    return false
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOutAdmin()
      router.push("/easyben-admin/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
      setIsLoggingOut(false)
    }
  }

  const sidebarWidth = isCollapsed ? "w-16 lg:w-20" : "w-64 lg:w-72"
  const sidebarTranslate = isCollapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0"

  return (
    <>
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu />
      </Button>

      {/* Overlay para mobile */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white transition-all duration-300",
          sidebarWidth,
          isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : sidebarTranslate
        )}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-white/10">
          {!isCollapsed && (
            <h1 className="text-2xl font-bold">
              <Link href="/easyben-admin">EasyBen</Link>
            </h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:bg-white/10"
          >
            {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            <li>
              <Link
                href="/easyben-admin"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin") && pathname === "/easyben-admin" ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <Home className="h-5 w-5 mr-3" />
                {!isCollapsed && "Dashboard"}
              </Link>
            </li>

            <li>
              <Link
                href="/easyben-admin/plataformas"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin/plataformas") ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <Globe className="h-5 w-5 mr-3" />
                {!isCollapsed && "Plataformas"}
              </Link>
            </li>

            <li>
              <Link
                href="/easyben-admin/clientes"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin/clientes") ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <Building2 className="h-5 w-5 mr-3" />
                {!isCollapsed && "Clientes"}
              </Link>
            </li>

            <li>
              <Link
                href="/easyben-admin/servicos"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin/servicos") ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <Settings className="h-5 w-5 mr-3" />
                {!isCollapsed && "Serviços"}
              </Link>
            </li>

            <li>
              <Link
                href="/easyben-admin/usuarios"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin/usuarios") ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <Users className="h-5 w-5 mr-3" />
                {!isCollapsed && "Usuários"}
              </Link>
            </li>

            <li>
              <Link
                href="/easyben-admin/relatorios"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin/relatorios") ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <BarChart3 className="h-5 w-5 mr-3" />
                {!isCollapsed && "Relatórios"}
              </Link>
            </li>

            <li>
              <Link
                href="/easyben-admin/configuracoes"
                className={cn(
                  "flex items-center rounded-md p-2 text-sm font-medium hover:bg-[#00C6FF]/20 transition-colors",
                  isActive("/easyben-admin/configuracoes") ? "bg-[#00C6FF] text-white" : "text-white/90 hover:text-white"
                )}
                onClick={closeSidebar}
              >
                <Settings className="h-5 w-5 mr-3" />
                {!isCollapsed && "Configurações"}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mt-auto p-4 border-t border-white/10">
          <Button
            onClick={handleLogout}
            className="w-full justify-center bg-[#00C6FF] hover:bg-[#00B8E6] text-white border-0"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </aside>
    </>
  )
}

