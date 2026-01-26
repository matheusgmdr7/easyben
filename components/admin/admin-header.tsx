"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-auth"
import Link from "next/link"
import { Settings, User, LogOut, ClipboardCheck } from "lucide-react"
import { signOutAdmin } from "@/lib/supabase-auth"
import { Button } from "@/components/ui/button"
import type React from "react"

interface AdminHeaderProps {
  sidebarCollapsed?: boolean
}

export default function AdminHeader({ sidebarCollapsed = false }: AdminHeaderProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function getUserInfo() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/admin/login")
        return
      }
      setUserEmail(session.user.email || null)

      // Extrair nome do email (parte antes do @)
      if (session.user.email) {
        const namePart = session.user.email.split("@")[0]
        // Capitalizar primeira letra de cada palavra
        const formattedName = namePart
          .split(".")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
        setUserName(formattedName)
      }

      // Buscar nome do tenant
      try {
        const { data: usuarioAdmin } = await supabase
          .from('usuarios_admin')
          .select('tenant_id')
          .eq('email', session.user.email)
          .single()
        
        if (usuarioAdmin?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('nome, nome_marca')
            .eq('id', usuarioAdmin.tenant_id)
            .single()
          
          if (tenant) {
            // Usar nome_marca se disponível, senão usar nome
            setTenantName(tenant.nome_marca || tenant.nome || 'Contratandoplanos')
          }
        }
      } catch (error) {
        console.log("Erro ao carregar nome do tenant:", error)
        setTenantName('Contratandoplanos') // Fallback
      }
    }
    getUserInfo()
  }, [router])

  const handleLogout = async () => {
    try {
      await signOutAdmin()
      router.push("/admin/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  // Calcular posição left baseado no sidebar (apenas desktop)
  const headerLeft = sidebarCollapsed 
    ? '4rem' // md:ml-16 = 4rem (64px) quando colapsado
    : '16rem' // md:ml-64 = 16rem (256px) quando expandido

  const headerStyle: React.CSSProperties = {
    background: '#ffffff',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
  }

  return (
    <header 
      className={`admin-header h-16 px-2 sm:px-3 md:px-4 flex items-center justify-between fixed top-0 z-20 shadow-lg transition-all duration-300 ${
        sidebarCollapsed ? 'md:left-16 lg:left-20' : 'md:left-64 lg:left-72'
      } left-0 right-0`}
      style={{ ...headerStyle, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Logo/Título */}
      <div className="flex items-center h-full">
        <Link href="/admin" className="text-sm sm:text-base md:text-lg font-semibold text-[#0F172A] block md:hidden hover:opacity-90 transition-opacity">
          Portal<span className="hidden sm:inline"> Admin</span>
        </Link>
        <Link href="/admin" className="text-base md:text-lg font-semibold text-[#0F172A] hidden md:block hover:opacity-90 transition-opacity">
          {tenantName || 'Contratandoplanos'} <span className="text-gray-600 font-normal">Admin</span>
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Desktop menu */}
      <div className="hidden md:flex items-center gap-1 sm:gap-2 h-full">
        <button 
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors flex items-center justify-center" 
          onClick={() => router.push("/analista")}
          title="Portal do Analista"
        >
          <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        
        <button 
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors flex items-center justify-center" 
          onClick={handleLogout}
          title="Sair"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <button 
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors flex items-center justify-center"
          title="Configurações"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* User Info */}
        <div className="flex items-center gap-2 sm:gap-3 ml-2 pl-3 border-l border-gray-200 h-full">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 hidden lg:block">
            {userName && (
              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] xl:max-w-[150px]">
                {userName}
              </p>
            )}
            {userEmail && (
              <p className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[120px] xl:max-w-[150px]">
                {userEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2 h-auto rounded-lg hover:bg-gray-100 text-gray-700" 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile dropdown menu */}
      {showMobileMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-200 md:hidden overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#0F172A] to-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  {userName && (
                    <p className="text-sm font-semibold text-white truncate">
                      {userName}
                    </p>
                  )}
                  {userEmail && (
                    <p className="text-xs text-white/80 truncate">
                      {userEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              onClick={() => {
                router.push("/analista")
                setShowMobileMenu(false)
              }}
            >
              <ClipboardCheck className="h-4 w-4 text-gray-500" />
              Portal do Analista
            </button>
            <button
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              onClick={() => {
                router.push("/admin/perfil")
                setShowMobileMenu(false)
              }}
            >
              <Settings className="h-4 w-4 text-gray-500" />
              Configurações
            </button>
            <button
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
              onClick={() => {
                handleLogout()
                setShowMobileMenu(false)
              }}
            >
              <LogOut className="h-4 w-4 text-red-500" />
              Sair
            </button>
          </div>
        </>
      )}
    </header>
  )
}
