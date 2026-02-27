"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Package, LogOut, Menu, X, DollarSign, FilePlus, Users, BarChart3, Settings, Building2, Calculator, Briefcase, UserCheck, FileBarChart } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { verificarAutenticacao, logout } from "@/services/auth-corretores-simples"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { obterUrlAvatar } from "@/services/storage-service"

export default function CorretorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [corretor, setCorretor] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function verificarAcesso() {
      try {
        console.log("Verificando autenticação do corretor...")

        // Verificar autenticação usando o módulo simplificado
        const { autenticado, corretor } = verificarAutenticacao()

        console.log("Resultado da verificação:", { autenticado, corretor })

        if (!autenticado || !corretor) {
          console.log("Corretor não autenticado, redirecionando para login")
          router.push("/corretor/login")
          return
        }

        // Verificar status atual do corretor no banco de dados
        const { data, error } = await supabase.from("corretores").select("*").eq("id", corretor.id).single()

        console.log("Dados atualizados do corretor:", { data, error })

        if (error || !data) {
          console.log("Erro ao buscar dados atualizados do corretor, redirecionando para login")
          logout()
          router.push("/corretor/login")
          return
        }

        // Verificar status do corretor
        if (data.status !== "aprovado") {
          console.log("Corretor não aprovado, redirecionando para aguardando aprovação")
          router.push("/corretor/aguardando-aprovacao")
          return
        }

        // Atualizar dados do corretor no localStorage
        localStorage.setItem(
          "corretorLogado",
          JSON.stringify({
            ...data,
          }),
        )

        setCorretor(data)
      } catch (error) {
        console.error("Erro ao verificar acesso:", error)
        logout()
        router.push("/corretor/login")
      } finally {
        setLoading(false)
      }
    }

    verificarAcesso()
  }, [router])

  useEffect(() => {
    async function carregarAvatar() {
      if (corretor?.id) {
        const url = await obterUrlAvatar(corretor.id)
        setAvatarUrl(url)
      }
    }

    if (corretor) {
      carregarAvatar()
    }
  }, [corretor])

  const handleLogout = () => {
    logout()
    router.push("/corretor/login")
  }

  const menuItems = [
    {
      href: "/corretor/dashboard",
      label: "Dashboard",
      icon: FileBarChart,
    },
    {
      href: "/corretor/propostas",
      label: "Propostas",
      icon: Briefcase,
    },
    {
      href: "/corretor/propostas/nova",
      label: "Nova Proposta",
      icon: FileText,
    },
    {
      href: "/corretor/comissoes",
      label: "Comissões",
      icon: Calculator,
    },
    {
      href: "/corretor/produtos",
      label: "Produtos",
      icon: Building2,
    },
    {
      href: "/corretor/clientes",
      label: "Clientes",
      icon: UserCheck,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-gray-600">Verificando credenciais...</span>
      </div>
    )
  }

  if (!corretor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-gray-600">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-700 hover:bg-gray-100 h-9 w-9 btn-corporate-sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight font-sans">Corretor Digital</h1>
                <p className="text-xs text-gray-600 font-semibold">Portal do Corretor</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end bg-white px-3 py-2 rounded-lg border border-gray-200">
              <span className="text-sm font-bold text-gray-900 font-sans">{corretor.nome}</span>
              <span className="text-xs text-gray-600 font-medium">{corretor.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-700 hover:bg-gray-100 border border-gray-200 h-9 px-3 btn-corporate font-semibold" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="bg-gradient-to-b from-gray-50 to-gray-100 h-full w-80 shadow-2xl animate-in slide-in-from-left">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900 font-sans">Menu</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:bg-gray-100 h-9 w-9 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-gray-300">
                    <AvatarImage src={avatarUrl || ""} alt={corretor.nome || corretor.email} />
                    <AvatarFallback className="bg-gray-200 text-gray-800 font-bold">
                      {corretor.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 truncate font-sans">{corretor.nome || "Corretor"}</span>
                    <span className="text-xs text-gray-600 truncate font-medium">{corretor.email}</span>
                  </div>
                </div>
              </div>

              <nav className="p-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center px-4 py-3 text-sm font-bold rounded-lg transition-all duration-200 relative font-sans",
                        isActive 
                          ? "bg-[#0F172A] text-white shadow-lg" 
                          : "text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm",
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon
                        className={cn(
                          "flex-shrink-0 h-5 w-5 mr-3",
                          isActive ? "text-white" : "text-gray-600 group-hover:text-gray-800",
                        )}
                        aria-hidden="true"
                      />
                      {item.label}
                      {isActive && (
                        <div className="absolute right-3 w-2 h-2 bg-white rounded-full" />
                      )}
                    </Link>
                  )
                })}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
                <Button
                  variant="ghost"
                  className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 justify-start font-bold font-sans btn-corporate"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sair da conta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-sm">
          <div className="flex flex-col flex-grow overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-gray-300">
                  <AvatarImage src={avatarUrl || ""} alt={corretor.nome || corretor.email} />
                  <AvatarFallback className="bg-gray-200 text-gray-800 font-bold text-sm">
                    {corretor.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-gray-900 truncate font-sans">{corretor.nome || "Corretor"}</span>
                  <span className="text-xs text-gray-600 truncate font-medium" title={corretor.email}>
                    {corretor.email}
                  </span>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-4 py-3 text-sm font-bold corporate-rounded-lg transition-all duration-200 relative font-sans",
                      isActive 
                        ? "bg-[#0F172A] text-white shadow-lg" 
                        : "text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm",
                    )}
                  >
                    <Icon
                      className={cn(
                        "flex-shrink-0 h-5 w-5 mr-3",
                        isActive ? "text-white" : "text-gray-600 group-hover:text-gray-800",
                      )}
                      aria-hidden="true"
                    />
                    {item.label}
                    {isActive && (
                      <div className="absolute right-3 w-2 h-2 bg-white rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>
            
            <div className="p-4 border-t border-gray-200 bg-white">
              <Button
                variant="ghost"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 justify-start font-bold font-sans btn-corporate"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sair da conta
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-auto bg-gray-100">{children}</main>
      </div>
    </div>
  )
}
