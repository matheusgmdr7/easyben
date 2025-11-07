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
  Table,
  Home,
  Users,
  ChevronDown,
  ChevronRight,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Package,
  DollarSign,
  UserCheck,
  ClipboardList,
  CheckCircle,
  UserPlus,
  Building,
  Wallet,
  Settings,
} from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { signOutAdmin } from "@/lib/supabase-auth"

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [corretoresExpanded, setCorretoresExpanded] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const avatarUrl = "" // Replace with actual avatar URL if available
  const corretor = { email: "admin@example.com" } // Replace with actual corretor data
  // Persistir estado colapsado no localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  
  // Hook de permissões
  const { podeVisualizar, isMaster } = usePermissions()
  
  // Salvar estado colapsado no localStorage e disparar evento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed))
      // Disparar evento para sincronizar o layout imediatamente
      setTimeout(() => {
        window.dispatchEvent(new Event('sidebar-toggle'))
      }, 0)
    }
  }, [isCollapsed])
  
  // Debug: verificar permissões
  useEffect(() => {
    console.log("🔍 AdminSidebar - Verificando permissões:", {
      isMaster,
      podeVisualizarDashboard: podeVisualizar("dashboard"),
      podeVisualizarLeads: podeVisualizar("leads"),
      podeVisualizarCorretores: podeVisualizar("corretores"),
    })
  }, [isMaster])

  const getInitials = (name: string | undefined) => {
    if (!name) return ""
    const nameParts = name.split(" ")
    let initials = ""
    for (let i = 0; i < nameParts.length; i++) {
      initials += nameParts[i].charAt(0).toUpperCase()
    }
    return initials
  }

  // Detectar se é mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Verificar inicialmente
    checkIfMobile()

    // Adicionar listener para redimensionamento
    window.addEventListener("resize", checkIfMobile)

    // Limpar listener
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

  const toggleCorretoresSection = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isCollapsed) {
      setCorretoresExpanded(!corretoresExpanded)
    }
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const isCorretoresSection = () => {
    return (
      pathname.includes("/admin/corretores") ||
      pathname.includes("/admin/produtos-corretores") ||
      pathname.includes("/admin/comissoes")
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

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    // Quando colapsar, sempre expandir a seção de corretores para mostrar os ícones
    if (newState) {
      setCorretoresExpanded(true)
    }
    // Salvar no localStorage primeiro
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin-sidebar-collapsed', String(newState))
      // Disparar evento customizado para o layout atualizar imediatamente
      setTimeout(() => {
        window.dispatchEvent(new Event('sidebar-toggle'))
      }, 0)
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
          {isOpen ? <X size={20} /> : <Menu size={20} />}
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
        className={`fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-100/30 shadow-lg transition-all duration-300 ease-in-out ${
          isOpen
            ? isCollapsed
              ? "w-16 sm:w-20 translate-x-0"
              : "w-56 sm:w-64 translate-x-0"
            : isCollapsed
              ? "w-16 sm:w-20 -translate-x-full"
              : "w-56 sm:w-64 -translate-x-full"
        } md:translate-x-0 ${isCollapsed ? "md:w-16 lg:w-20" : "md:w-64 lg:w-72"}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between h-16 border-b border-white/5 px-2 sm:px-3 md:px-4 bg-gradient-to-r from-[#168979] to-[#13786a]">
            {!isCollapsed ? (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 sm:gap-2 font-bold transition-colors hover:opacity-90 text-white min-w-0 flex-1"
              >
                <span className="text-xs sm:text-sm md:text-base font-semibold truncate whitespace-nowrap">
                  Portal<span className="hidden md:inline"> Admin</span>
                </span>
              </Link>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto flex-shrink-0">
                <span className="text-white font-bold text-xs sm:text-sm">PA</span>
              </div>
            )}
            <Button 
              onClick={toggleCollapse} 
              variant="ghost" 
              className="p-1 sm:p-1.5 hover:bg-white/20 hidden md:flex text-white rounded-lg transition-colors flex-shrink-0" 
              size="sm"
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              {isCollapsed ? <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
          </div>
          
          {/* Navigation com scroll customizado */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 admin-sidebar-nav">
            <ul className="space-y-1.5 px-2">
              {podeVisualizar("dashboard") && (
              <li>
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2 sm:px-2.5"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Dashboard" : ""}
                >
                  <Home className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Dashboard</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("leads") && (
              <li>
                <Link
                  href="/admin/leads"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/leads") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Leads" : ""}
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Leads</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("tabelas") && (
              <li>
                <Link
                  href="/admin/tabelas"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/tabelas") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Tabelas de Preços" : ""}
                >
                  <Table className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Tabelas de Preços</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("modelos_propostas") && (
              <li>
                <Link
                  href="/admin/modelos-propostas"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/modelos-propostas") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Modelo de Propostas" : ""}
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Modelo de Propostas</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("propostas") && (
              <li>
                <Link
                  href="/admin/propostas"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/propostas") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Propostas Recebidas" : ""}
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Propostas Recebidas</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("em_analise") && (
              <li>
                <Link
                  href="/admin/em-analise"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/em-analise") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Em Análise" : ""}
                >
                  <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Em Análise</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("cadastrados") && (
              <li>
                <Link
                  href="/admin/cadastrado"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/cadastrado") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Cadastrados" : ""}
                >
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Cadastrados</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("administradoras") && (
              <li>
                <Link
                  href="/admin/administradoras"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/administradoras") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Administradoras" : ""}
                >
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Administradoras</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("financeiro") && (
              <li>
                <Link
                  href="/admin/financeiro"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/financeiro") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Financeiro" : ""}
                >
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Financeiro</span>}
                </Link>
              </li>
              )}
              {podeVisualizar("usuarios") && (
              <li>
                <Link
                  href="/admin/usuarios"
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-200 font-medium text-xs sm:text-sm",
                    isActive("/admin/usuarios") 
                      ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isCollapsed ? "Usuários" : ""}
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Usuários</span>}
                </Link>
              </li>
              )}

              {/* Separador */}
              {podeVisualizar("corretores") && (
                <div className="my-3 mx-2 h-px bg-gray-200"></div>
              )}

              {/* Seção de Corretores com expansão/colapso */}
              {podeVisualizar("corretores") && (
              <li>
                {!isCollapsed ? (
                  <>
                    <button
                      onClick={toggleCorretoresSection}
                      className={cn(
                        "flex items-center justify-between w-full px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm",
                        isCorretoresSection() 
                          ? "bg-gray-100 text-[#168979]" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="truncate">Corretores</span>
                      </div>
                      {corretoresExpanded ? (
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      )}
                    </button>
                    {corretoresExpanded && (
                      <ul className="pl-8 mt-1 space-y-1">
                        <li>
                          <Link
                            href="/admin/corretores"
                            className={cn(
                              "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-all duration-200 text-xs sm:text-sm",
                              isActive("/admin/corretores")
                                ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md"
                                : "text-gray-600 hover:bg-gray-50 hover:text-[#168979]",
                            )}
                            onClick={closeSidebar}
                          >
                            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">Corretores</span>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/admin/produtos-corretores"
                            className={cn(
                              "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-all duration-200 text-xs sm:text-sm",
                              isActive("/admin/produtos-corretores")
                                ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md"
                                : "text-gray-600 hover:bg-gray-50 hover:text-[#168979]",
                            )}
                            onClick={closeSidebar}
                          >
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">Produtos</span>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/admin/comissoes"
                            className={cn(
                              "flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-all duration-200 text-xs sm:text-sm",
                              isActive("/admin/comissoes")
                                ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md"
                                : "text-gray-600 hover:bg-gray-50 hover:text-[#168979]",
                            )}
                            onClick={closeSidebar}
                          >
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">Comissões</span>
                          </Link>
                        </li>
                      </ul>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <Link
                      href="/admin/corretores"
                      className={cn(
                        "flex items-center justify-center rounded-lg px-2 py-2 sm:py-2.5 transition-all duration-200",
                        isActive("/admin/corretores")
                          ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md"
                          : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                      )}
                      onClick={closeSidebar}
                      title="Corretores"
                    >
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    </Link>
                    <Link
                      href="/admin/produtos-corretores"
                      className={cn(
                        "flex items-center justify-center rounded-lg px-2 py-2 sm:py-2.5 transition-all duration-200",
                        isActive("/admin/produtos-corretores")
                          ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md"
                          : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                      )}
                      onClick={closeSidebar}
                      title="Produtos"
                    >
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    </Link>
                    <Link
                      href="/admin/comissoes"
                      className={cn(
                        "flex items-center justify-center rounded-lg px-2 py-2 sm:py-2.5 transition-all duration-200",
                        isActive("/admin/comissoes")
                          ? "bg-gradient-to-r from-[#168979] to-[#13786a] text-white shadow-md"
                          : "text-gray-700 hover:bg-gray-100 hover:text-[#168979]",
                      )}
                      onClick={closeSidebar}
                      title="Comissões"
                    >
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    </Link>
                  </div>
                )}
              </li>
              )}
            </ul>
          </nav>

        </div>
      </aside>
    </>
  )
}