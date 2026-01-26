"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline"
import { supabase } from "@/lib/supabase-auth"

export default function AnalistaSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  // Estado para hover (auto-colapsar)
  const [isHovered, setIsHovered] = useState(false)
  
  // Estado colapsado (sempre true - sidebar sempre inicia colapsado)
  // O sidebar só expande no hover, não há toggle manual
  const [isCollapsed] = useState(true)
  
  // Estado visual (colapsado quando não está com hover)
  const isVisuallyCollapsed = isCollapsed && !isHovered
  
  // Estado para logo do tenant
  const [tenantLogo, setTenantLogo] = useState<string | null>(null)
  
  // Buscar logo do tenant
  useEffect(() => {
    async function loadTenantLogo() {
      try {
        // Obter tenant_id da sessão
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        // Buscar tenant do usuário admin
        const { data: usuarioAdmin } = await supabase
          .from('usuarios_admin')
          .select('tenant_id')
          .eq('email', session.user.email)
          .single()
        
        if (usuarioAdmin?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('logo_url')
            .eq('id', usuarioAdmin.tenant_id)
            .single()
          
          if (tenant?.logo_url) {
            setTenantLogo(tenant.logo_url)
          }
        }
      } catch (error) {
        console.log("Erro ao carregar logo do tenant:", error)
      }
    }
    
    loadTenantLogo()
  }, [])
  
  // Atualizar estado visual quando hover muda e disparar eventos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Disparar evento para o layout se ajustar quando hover muda
      window.dispatchEvent(new Event('sidebar-toggle'))
    }
  }, [isHovered, isVisuallyCollapsed])
  
  // Detectar se é mobile (verificar imediatamente)
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }

    // Verificar imediatamente
    if (typeof window !== 'undefined') {
      checkIfMobile()
      window.addEventListener("resize", checkIfMobile)
      return () => window.removeEventListener("resize", checkIfMobile)
    }
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
  
  // Função helper para classes do menu item
  const getMenuItemClasses = (path: string) => {
    const active = isActive(path)
    return cn(
      "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
      active 
        ? "bg-[#1E293B] text-white shadow-md active-item" 
        : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
      !isVisuallyCollapsed && !active && "hover:translate-x-1",
      isVisuallyCollapsed && "justify-center px-2"
    )
  }


  // Handlers para hover (apenas desktop)
  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsHovered(true)
      // Disparar evento para o layout se ajustar
      window.dispatchEvent(new Event('sidebar-hover'))
    }
  }
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsHovered(false)
      // Disparar evento para o layout se ajustar
      window.dispatchEvent(new Event('sidebar-leave'))
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button 
          onClick={toggleSidebar} 
          className="p-2.5 rounded-lg bg-white shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors" 
          aria-label="Toggle menu"
        >
          {isOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 z-40 h-screen bg-[#0F172A] shadow-lg transition-all duration-300 ease-in-out ${
          isOpen
            ? isVisuallyCollapsed
              ? "w-16 sm:w-20 translate-x-0"
              : "w-64 lg:w-72 translate-x-0"
            : isVisuallyCollapsed
              ? "w-16 sm:w-20 -translate-x-full"
              : "w-64 lg:w-72 -translate-x-full"
        } md:translate-x-0 ${isVisuallyCollapsed ? "md:w-16 lg:w-20" : "md:w-64 lg:w-72"}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div 
            className="flex items-center justify-center h-16 bg-white px-2 sm:px-3 md:px-4"
            style={{
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}
          >
            {!isVisuallyCollapsed ? (
              <Link
                href="/analista"
                className="flex items-center gap-2 sm:gap-3 font-bold transition-colors hover:opacity-90 text-[#0F172A] min-w-0 flex-1"
              >
                {tenantLogo && (
                  <img 
                    src={tenantLogo} 
                    alt="Logo" 
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
                  />
                )}
                <span className="text-xs sm:text-sm md:text-base font-semibold truncate whitespace-nowrap">
                  Portal<span className="hidden md:inline"> Analista</span>
                </span>
              </Link>
            ) : (
              <Link
                href="/analista"
                className="flex items-center justify-center w-full h-full"
              >
                {tenantLogo && (
                  <img 
                    src={tenantLogo} 
                    alt="Logo" 
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain mx-auto"
                  />
                )}
              </Link>
            )}
          </div>
          
          {/* Navigation sem scrollbar - responsivo */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx global>{`
              nav::-webkit-scrollbar {
                display: none;
              }
              /* Hover azul para TODOS os itens ativos */
              nav a.active-item:hover,
              nav button.active-item:hover,
              nav li a.active-item:hover,
              nav li button.active-item:hover,
              nav ul li a.active-item:hover,
              nav ul li button.active-item:hover {
                background-color: #2563eb !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
              }
              /* Garantir que o hover azul sobrescreva qualquer outro estilo */
              aside nav a.active-item:hover,
              aside nav button.active-item:hover,
              aside nav li a.active-item:hover,
              aside nav li button.active-item:hover {
                background-color: #2563eb !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
              }
            `}</style>
            <ul className="space-y-0.5 px-2">
              {/* Dashboard/Home */}
              <li>
                <Link
                  href="/analista"
                  className={getMenuItemClasses("/analista")}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Dashboard" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Dashboard</span>}
                  <HomeIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>

              {/* Propostas Recebidas */}
              <li>
                <Link
                  href="/analista/propostas"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/analista/propostas")
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/analista/propostas") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Propostas Recebidas" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Propostas Recebidas</span>}
                  <DocumentTextIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>

              {/* Em Análise */}
              <li>
                <Link
                  href="/analista/em-analise"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/analista/em-analise")
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/analista/em-analise") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Em Análise" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Em Análise</span>}
                  <ClipboardDocumentListIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>

              {/* Relatórios */}
              <li>
                <Link
                  href="/analista/relatorios"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/analista/relatorios")
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/analista/relatorios") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Relatórios" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Relatórios</span>}
                  <DocumentChartBarIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
            </ul>
          </nav>

        </div>
      </aside>
    </>
  )
}

