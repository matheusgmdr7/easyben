
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Link as LinkIcon, LogOut, Menu, X, BarChart3, FileText } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getCorretorLogado, obterCorretorAutenticado, logout } from "@/services/auth-corretores-simples"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { obterUrlAvatar } from "@/services/storage-service"
import { toast } from "sonner"
import { RecursoGuard } from "@/components/tenant/recurso-guard"
import { formatarCNPJ } from "@/lib/formatters"

export default function GestorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [gestor, setGestor] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function verificarAcesso() {
      try {
        console.log("Verificando autenticação do gestor...")

        // Verificar se há corretor logado
        const corretorLocal = getCorretorLogado()

        if (!corretorLocal) {
          console.log("Nenhum corretor logado, redirecionando para login")
          router.push("/gestor/login")
          return
        }

        // Buscar dados atualizados do corretor (incluindo is_gestor)
        const corretor = await obterCorretorAutenticado()

        if (!corretor) {
          console.log("Corretor não encontrado, redirecionando para login")
          logout()
          router.push("/gestor/login")
          return
        }

        // Verificar se é gestor
        if (!corretor.is_gestor) {
          console.log("Corretor não é gestor, redirecionando")
          toast.error("Você não tem permissão para acessar o Portal do Gestor")
          router.push("/corretor/dashboard")
          return
        }

        // Verificar status do corretor
        if (corretor.status !== "aprovado") {
          console.log("Corretor não aprovado, redirecionando")
          router.push("/corretor/aguardando-aprovacao")
          return
        }

        // Atualizar dados no localStorage
        localStorage.setItem(
          "corretorLogado",
          JSON.stringify({
            ...corretor,
          }),
        )

        setGestor(corretor)
      } catch (error) {
        console.error("Erro ao verificar acesso:", error)
        logout()
        router.push("/gestor/login")
      } finally {
        setLoading(false)
      }
    }

    verificarAcesso()
  }, [router])

  useEffect(() => {
    async function carregarAvatar() {
      if (gestor?.id) {
        const url = await obterUrlAvatar(gestor.id)
        setAvatarUrl(url)
      }
    }

    if (gestor) {
      carregarAvatar()
    }
  }, [gestor])

  const handleLogout = () => {
    logout()
    router.push("/gestor/login")
  }

  const menuItems = [
    {
      href: "/gestor",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: "/gestor/equipe",
      label: "Minha Equipe",
      icon: Users,
    },
    {
      href: "/gestor/producao",
      label: "Produção",
      icon: FileText,
    },
    {
      href: "/gestor/link-cadastro",
      label: "Link de Cadastro",
      icon: LinkIcon,
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

  if (!gestor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-gray-600">Carregando...</span>
      </div>
    )
  }

  return (
    <RecursoGuard codigoRecurso="portal_gestor" showError={true}>
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
                <h1 className="text-lg font-bold text-gray-900 tracking-tight font-sans">Portal do Gestor</h1>
                <p className="text-xs text-gray-600 font-semibold">Gestão de Equipes</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end bg-white px-3 py-2 rounded-lg border border-gray-200">
              <span className="text-sm font-bold text-gray-900 font-sans">{gestor.nome}</span>
              <span className="text-xs text-gray-600 font-medium">{gestor.email}</span>
              {(gestor.razao_social || gestor.nome_fantasia || gestor.cnpj) && (
                <span className="text-xs text-gray-500 mt-1 text-right">
                  {gestor.razao_social || gestor.nome_fantasia}
                  {gestor.cnpj && <><br />CNPJ: {formatarCNPJ(gestor.cnpj)}</>}
                </span>
              )}
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
                    <AvatarImage src={avatarUrl || ""} alt={gestor.nome || gestor.email} />
                    <AvatarFallback className="bg-gray-200 text-gray-800 font-bold">
                      {gestor.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 truncate font-sans">{gestor.nome || "Gestor"}</span>
                    <span className="text-xs text-gray-600 truncate font-medium">{gestor.email}</span>
                    {(gestor.razao_social || gestor.nome_fantasia || gestor.cnpj) && (
                      <span className="text-xs text-gray-500 mt-1 truncate" title={[gestor.razao_social || gestor.nome_fantasia, gestor.cnpj && `CNPJ: ${formatarCNPJ(gestor.cnpj)}`].filter(Boolean).join(" · ")}>
                        {gestor.razao_social || gestor.nome_fantasia}
                        {gestor.cnpj && ` · CNPJ: ${formatarCNPJ(gestor.cnpj)}`}
                      </span>
                    )}
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
                  <AvatarImage src={avatarUrl || ""} alt={gestor.nome || gestor.email} />
                  <AvatarFallback className="bg-gray-200 text-gray-800 font-bold text-sm">
                    {gestor.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-gray-900 truncate font-sans">{gestor.nome || "Gestor"}</span>
                  <span className="text-xs text-gray-600 truncate font-medium" title={gestor.email}>
                    {gestor.email}
                  </span>
                  {(gestor.razao_social || gestor.nome_fantasia || gestor.cnpj) && (
                    <span className="text-xs text-gray-500 mt-1 truncate" title={[gestor.razao_social || gestor.nome_fantasia, gestor.cnpj && `CNPJ: ${formatarCNPJ(gestor.cnpj)}`].filter(Boolean).join(" · ")}>
                      {gestor.razao_social || gestor.nome_fantasia}
                      {gestor.cnpj && ` · CNPJ: ${formatarCNPJ(gestor.cnpj)}`}
                    </span>
                  )}
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
    </RecursoGuard>
  )
}

