"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline"
import { supabase } from "@/lib/supabase-auth"

export default function AdministradoraSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [faturamentoMenuOpen, setFaturamentoMenuOpen] = useState(false)
  const [faturaMenuOpen, setFaturaMenuOpen] = useState(false)
  const [financeiroMenuOpen, setFinanceiroMenuOpen] = useState(false)
  const [contratoMenuOpen, setContratoMenuOpen] = useState(false)
  
  // Estado para hover (auto-colapsar)
  const [isHovered, setIsHovered] = useState(false)
  
  // Persistir estado colapsado no localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('administradora-sidebar-collapsed')
      // Sempre iniciar como colapsado se não houver valor salvo ou se o valor for 'false'
      if (saved === null || saved === 'false') {
        localStorage.setItem('administradora-sidebar-collapsed', 'true')
        return true
      }
      return saved === 'true'
    }
    return true // Iniciar colapsado por padrão
  })
  
  // Estado visual (colapsado quando não está com hover)
  const isVisuallyCollapsed = isCollapsed && !isHovered
  
  // Estado para logo e nome da administradora
  const [administradoraInfo, setAdministradoraInfo] = useState<{
    nome: string | null
    logo: string | null
  }>({ nome: null, logo: null })
  
  // Buscar informações da administradora
  useEffect(() => {
    async function loadAdministradoraInfo() {
      try {
        // Buscar do localStorage (salvo pelo serviço de autenticação)
        if (typeof window !== 'undefined') {
          const administradoraLogadaStr = localStorage.getItem('administradoraLogada')
          if (administradoraLogadaStr) {
            try {
              const administradoraLogada = JSON.parse(administradoraLogadaStr)
              if (administradoraLogada) {
                setAdministradoraInfo({
                  nome: administradoraLogada.nome_fantasia || administradoraLogada.nome || null,
                  logo: administradoraLogada.logo_url || null
                })
                return
              }
            } catch (e) {
              console.log("Erro ao parsear administradora do localStorage:", e)
            }
          }
        }
        
        // Fallback: buscar do sessionStorage
        const administradoraEmail = sessionStorage.getItem('administradora_email')
        if (!administradoraEmail) return
        
        const { data: administradora } = await supabase
          .from('administradoras')
          .select('nome, nome_fantasia, logo_url')
          .eq('email_login', administradoraEmail)
          .single()
        
        if (administradora) {
          setAdministradoraInfo({
            nome: administradora.nome_fantasia || administradora.nome || null,
            logo: administradora.logo_url || null
          })
        }
      } catch (error) {
        console.log("Erro ao carregar informações da administradora:", error)
      }
    }
    
    loadAdministradoraInfo()
  }, [])
  
  // Salvar estado colapsado no localStorage e disparar evento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('administradora-sidebar-collapsed', String(isCollapsed))
      setTimeout(() => {
        window.dispatchEvent(new Event('sidebar-toggle'))
      }, 0)
    }
  }, [isCollapsed])
  
  // Atualizar estado visual quando hover muda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new Event('sidebar-toggle'))
      }, 0)
    }
  }, [isHovered])
  
  // Detectar se é mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileWidth = window.innerWidth < 768
      setIsMobile(isMobileWidth)
      // Se não for mobile e estiver colapsado, permitir hover
      if (!isMobileWidth && isCollapsed) {
        // Garantir que os eventos de mouse funcionem
      }
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [isCollapsed])

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

  // Verificar se os menus devem estar abertos
  useEffect(() => {
    if (pathname?.startsWith('/administradora/faturamento')) {
      setFaturamentoMenuOpen(true)
    }
    if (pathname?.startsWith('/administradora/fatura')) {
      setFaturaMenuOpen(true)
    }
    if (pathname?.startsWith('/administradora/financeiro')) {
      setFinanceiroMenuOpen(true)
    }
    if (pathname?.startsWith('/administradora/contrato')) {
      setContratoMenuOpen(true)
    }
  }, [pathname])
  
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

  // Função para lidar com o logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      // Limpar dados do localStorage e sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('administradoraLogada')
        sessionStorage.removeItem('administradora_email')
        sessionStorage.removeItem('administradora_id')
      }
      await supabase.auth.signOut()
      router.push('/administradora/login')
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
                href="/administradora"
                className="flex items-center gap-2 sm:gap-3 font-bold transition-colors hover:opacity-90 text-[#0F172A] min-w-0 flex-1"
              >
                {administradoraInfo.logo && (
                  <img 
                    src={administradoraInfo.logo} 
                    alt="Logo Administradora" 
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0 rounded"
                  />
                )}
                <span className="text-xs sm:text-sm md:text-base font-semibold truncate whitespace-nowrap">
                  Portal Administradora
                </span>
              </Link>
            ) : (
              <Link
                href="/administradora"
                className="flex items-center justify-center w-full h-full"
              >
                {administradoraInfo.logo ? (
                  <img 
                    src={administradoraInfo.logo} 
                    alt="Logo Administradora" 
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain mx-auto rounded"
                  />
                ) : null}
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
              {/* Dashboard - Primeiro item */}
              <li>
                <Link
                  href="/administradora"
                  className={getMenuItemClasses("/administradora")}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Dashboard" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Dashboard</span>}
                  <HomeIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              {/* Item Faturamento com Submenu */}
              <li>
                <button
                  onClick={() => setFaturamentoMenuOpen(!faturamentoMenuOpen)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/faturamento") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/faturamento") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  title={isVisuallyCollapsed ? "Faturamento" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1 text-left">Faturamento</span>}
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 flex-shrink-0" />
                    {!isVisuallyCollapsed && (
                      faturamentoMenuOpen ? (
                        <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
                      )
                    )}
                  </div>
                </button>
                {!isVisuallyCollapsed && faturamentoMenuOpen && (
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>
                      <Link
                        href="/administradora/faturamento/pesquisar"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/faturamento/pesquisar")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        <span>Pesquisar</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/administradora/faturamento/agendamento"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/faturamento/agendamento")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        <span>Agendamento</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              {/* Item Fatura com Submenu */}
              <li>
                <button
                  onClick={() => setFaturaMenuOpen(!faturaMenuOpen)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/fatura") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/fatura") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  title={isVisuallyCollapsed ? "Fatura" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1 text-left">Fatura</span>}
                  <div className="flex items-center gap-2">
                    <DocumentDuplicateIcon className="h-5 w-5 flex-shrink-0" />
                    {!isVisuallyCollapsed && (
                      faturaMenuOpen ? (
                        <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
                      )
                    )}
                  </div>
                </button>
                {!isVisuallyCollapsed && faturaMenuOpen && (
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>
                      <Link
                        href="/administradora/fatura"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/fatura") && !isActive("/administradora/fatura/devedores")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        <span>Pesquisar</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/administradora/fatura/devedores"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/fatura/devedores")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>Devedores</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              {/* Item Financeiro com Submenu - Acima de Grupo de Beneficiários */}
              <li>
                <button
                  onClick={() => setFinanceiroMenuOpen(!financeiroMenuOpen)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/financeiro")
                      ? "bg-[#1E293B] text-white shadow-md active-item"
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/financeiro") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  title={isVisuallyCollapsed ? "Financeiro" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1 text-left">Financeiro</span>}
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 flex-shrink-0" />
                    {!isVisuallyCollapsed && (
                      financeiroMenuOpen ? (
                        <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
                      )
                    )}
                  </div>
                </button>
                {!isVisuallyCollapsed && financeiroMenuOpen && (
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>
                      <Link
                        href="/administradora/financeiro/pesquisar"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/financeiro/pesquisar")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        <span>Pesquisar</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              {/* Item Contrato com Submenu - Abaixo de Financeiro */}
              <li>
                <button
                  onClick={() => setContratoMenuOpen(!contratoMenuOpen)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/contrato")
                      ? "bg-[#1E293B] text-white shadow-md active-item"
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/contrato") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  title={isVisuallyCollapsed ? "Contrato" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1 text-left">Contrato</span>}
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 flex-shrink-0" />
                    {!isVisuallyCollapsed && (
                      contratoMenuOpen ? (
                        <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
                      )
                    )}
                  </div>
                </button>
                {!isVisuallyCollapsed && contratoMenuOpen && (
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>
                      <Link
                        href="/administradora/contrato/pesquisar"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/contrato/pesquisar")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        <span>Pesquisar</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/administradora/contrato/novo"
                        className={cn(
                          "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-md transition-all duration-300",
                          isActive("/administradora/contrato/novo")
                            ? "bg-[#1E293B]/80 text-white"
                            : "text-gray-300 hover:bg-[#1E293B]/50 hover:text-white"
                        )}
                        onClick={closeSidebar}
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span>Novo</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              {/* Grupo de Beneficiários */}
              <li>
                <Link
                  href="/administradora/grupos-beneficiarios"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/grupos-beneficiarios") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/grupos-beneficiarios") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Grupo de Beneficiários" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Grupo de Beneficiários</span>}
                  <UserGroupIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              <li>
                <Link
                  href="/administradora/propostas"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/propostas") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/propostas") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Propostas" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Propostas</span>}
                  <DocumentTextIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
              <li>
                <Link
                  href="/administradora/configuracoes"
                  className={cn(
                    "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ease-in-out font-medium text-xs sm:text-sm rounded-md",
                    isActive("/administradora/configuracoes") 
                      ? "bg-[#1E293B] text-white shadow-md active-item" 
                      : "text-gray-300 hover:bg-[#1E293B] hover:text-white hover:scale-[1.02] hover:shadow-md",
                    !isVisuallyCollapsed && !isActive("/administradora/configuracoes") && "hover:translate-x-1",
                    isVisuallyCollapsed && "justify-center px-2"
                  )}
                  onClick={closeSidebar}
                  title={isVisuallyCollapsed ? "Configurações" : ""}
                >
                  {!isVisuallyCollapsed && <span className="truncate flex-1">Configurações</span>}
                  <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    </>
  )
}
