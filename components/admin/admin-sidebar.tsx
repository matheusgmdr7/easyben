"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  UsersIcon,
  TableCellsIcon,
  DocumentTextIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  CubeIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline"
import { usePermissions } from "@/hooks/use-permissions"
import { signOutAdmin } from "@/lib/supabase-auth"
import { supabase } from "@/lib/supabase-auth"

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Hover: expande ao passar o mouse (apenas desktop)
  const [isHovered, setIsHovered] = useState(false)
  
  // Colapsado quando não há hover; no mobile com menu aberto usa largura total
  const isVisuallyCollapsed = isMobile && isOpen ? false : !isHovered
  
  // Hook de permissões
  const { podeVisualizar, isMaster } = usePermissions()
  
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

  // Função helper para classes de hover melhoradas
  const getHoverClasses = (active: boolean) => {
    return cn(
      "transition-all duration-300 ease-in-out rounded-md",
      active 
        ? "bg-[#1E293B] text-white shadow-md" 
        : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
      !isVisuallyCollapsed && "hover:translate-x-1"
    )
  }

  // Função para lidar com o logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOutAdmin()
      router.push("/admin/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Handlers para hover (apenas desktop)
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true)
      // Disparar evento para o layout se ajustar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sidebar-hover'))
      }
    }
  }
  
  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false)
      // Disparar evento para o layout se ajustar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sidebar-leave'))
      }
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
                href="/admin"
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
                  Portal<span className="hidden md:inline"> Admin</span>
                </span>
              </Link>
            ) : (
              <Link
                href="/admin"
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
              {podeVisualizar("dashboard") && (
              <li>
                <Link
                  href="/admin"
                  className={getMenuItemClasses("/admin")}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Dashboard" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Dashboard</span>}
                  <HomeIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("operadoras") && (
              <li>
                <Link
                  href="/admin/operadoras"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/operadoras") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/operadoras") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Operadoras" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Operadoras</span>}
                  <ShieldCheckIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("administradoras") && (
              <li>
                <Link
                  href="/admin/administradoras"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/administradoras") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/administradoras") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Administradoras" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Administradoras</span>}
                  <BuildingOfficeIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("entidades") && (
              <li>
                <Link
                  href="/admin/entidades"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/entidades") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/entidades") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Entidades" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Entidades</span>}
                  <AcademicCapIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("corretoras") && (
              <li>
                <Link
                  href="/admin/corretoras"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/corretoras") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/corretoras") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Corretoras" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Corretoras</span>}
                  <UsersIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("produtos") && (
              <li>
                <Link
                  href="/admin/produtos"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/produtos") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/produtos") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Produtos" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Produtos</span>}
                  <CubeIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("tabelas") && (
              <li>
                <Link
                  href="/admin/tabelas"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/tabelas") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/tabelas") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Tabelas" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Tabelas</span>}
                  <TableCellsIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("modelos_propostas") && (
              <li>
                <Link
                  href="/admin/modelos-propostas"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/modelos-propostas") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/modelos-propostas") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Modelo de Propostas" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Modelo de Propostas</span>}
                  <DocumentTextIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("leads") && (
              <li>
                <Link
                  href="/admin/leads"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/leads") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/leads") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Leads" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Leads</span>}
                  <UsersIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {podeVisualizar("cadastrados") && (
              <li>
                <Link
                  href="/admin/cadastrado"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/cadastrado") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/cadastrado") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Em Cadastro" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Em Cadastro</span>}
                  <UserPlusIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
              {/* Item Usuários - Apenas para Master */}
              {isMaster && (
              <li>
                <Link
                  href="/admin/usuarios"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/admin/usuarios") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/admin/usuarios") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Usuários" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Usuários</span>}
                  <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              )}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  )
}
