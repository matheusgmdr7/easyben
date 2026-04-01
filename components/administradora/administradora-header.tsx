"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-auth"
import Link from "next/link"
import { Settings, User, LogOut, Bell, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import {
  listarAlertasSistema,
  marcarTodosAlertasComoLidos,
  removerAlertaSistema,
  obterNomeEventoAlertasSistema,
  type AlertaSistema,
} from "@/services/administradora-alertas-service"
import type React from "react"

interface AdministradoraHeaderProps {
  sidebarCollapsed?: boolean
}

export default function AdministradoraHeader({ sidebarCollapsed = false }: AdministradoraHeaderProps) {
  const [administradoraNome, setAdministradoraNome] = useState<string | null>(null)
  const [administradoraEmail, setAdministradoraEmail] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAlertas, setShowAlertas] = useState(false)
  const [alertas, setAlertas] = useState<AlertaSistema[]>([])
  const alertasRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function getAdministradoraInfo() {
      try {
        let tenantId: string | null = null
        let nomeFallback: string | null = null
        let emailFallback: string | null = null

        // Buscar administradora logada do serviço
        const administradora = getAdministradoraLogada()
        
        if (!administradora) {
          // Tentar buscar do sessionStorage como fallback
          const emailLogin = sessionStorage.getItem('administradora_email')
          if (!emailLogin) {
            router.push("/administradora/login")
            return
          }
          emailFallback = emailLogin
          
          // Buscar informações da administradora
          const { data: adminData, error } = await supabase
            .from('administradoras')
            .select('nome, nome_fantasia, email_login, tenant_id')
            .eq('email_login', emailLogin)
            .single()

          if (error) {
            console.error("Erro ao buscar administradora:", error)
            return
          }

          if (adminData) {
            tenantId = adminData.tenant_id || null
            nomeFallback = adminData.nome_fantasia || adminData.nome || "Administradora"
            emailFallback = adminData.email_login || emailLogin
          }
        } else {
          tenantId = administradora.tenant_id || null
          nomeFallback = administradora.nome_fantasia || administradora.nome || "Administradora"
          emailFallback = administradora.email_login || null
        }

        if (tenantId) {
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("nome_marca")
            .eq("id", tenantId)
            .maybeSingle()

          setAdministradoraNome(tenantData?.nome_marca || nomeFallback || "Administradora")
        } else {
          setAdministradoraNome(nomeFallback || "Administradora")
        }
        setAdministradoraEmail(emailFallback || null)
      } catch (error) {
        console.error("Erro ao carregar informações da administradora:", error)
      }
    }

    getAdministradoraInfo()
  }, [router])

  useEffect(() => {
    const atualizar = () => setAlertas(listarAlertasSistema())
    atualizar()
    const eventName = obterNomeEventoAlertasSistema()
    window.addEventListener(eventName, atualizar)
    return () => window.removeEventListener(eventName, atualizar)
  }, [])

  useEffect(() => {
    const handleCliqueFora = (event: MouseEvent) => {
      if (!alertasRef.current) return
      if (!alertasRef.current.contains(event.target as Node)) {
        setShowAlertas(false)
      }
    }
    document.addEventListener("mousedown", handleCliqueFora)
    return () => document.removeEventListener("mousedown", handleCliqueFora)
  }, [])

  const handleLogout = async () => {
    try {
      // Limpar dados do localStorage e sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('administradoraLogada')
        sessionStorage.removeItem('administradora_email')
        sessionStorage.removeItem('administradora_id')
      }
      await supabase.auth.signOut()
      router.push("/administradora/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  const headerStyle: React.CSSProperties = {
    background: '#ffffff',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
  }
  const alertasNaoLidos = alertas.filter((a) => !a.lido).length

  return (
    <header 
      className={`admin-header h-16 pl-14 pr-2 sm:pl-14 sm:pr-3 md:px-4 flex items-center justify-between fixed top-0 z-20 shadow-lg transition-all duration-300 ${
        sidebarCollapsed ? 'md:left-16 lg:left-20' : 'md:left-64 lg:left-72'
      } left-0 right-0 md:pl-4`}
      style={{ ...headerStyle, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Logo/Título — pl-14 no header libera o botão fixo do menu (sidebar) no mobile */}
      <div className="flex items-center h-full min-w-0 flex-1 md:flex-none pr-2">
        <Link
          href="/administradora/dashboard"
          className="text-sm sm:text-base md:text-lg font-semibold text-[#0F172A] block md:hidden hover:opacity-90 transition-opacity truncate"
        >
          Portal da Administradora
        </Link>
        <Link
          href="/administradora/dashboard"
          className="hidden md:flex items-center gap-2 lg:gap-3 text-base md:text-lg font-semibold text-[#0F172A] hover:opacity-90 transition-opacity"
        >
          <span className="whitespace-nowrap">{administradoraNome || "Administradora"}</span>
          <span className="h-5 w-px bg-gray-300 hidden lg:block" aria-hidden="true" />
          <span className="whitespace-nowrap">
            <span className="text-gray-600 font-normal">Portal da Administradora</span>
          </span>
        </Link>
      </div>

      {/* Spacer — só no desktop; no mobile o título usa flex-1 para truncar antes dos ícones */}
      <div className="hidden md:block flex-1" aria-hidden />

      {/* Desktop menu */}
      <div className="hidden md:flex items-center gap-1 sm:gap-2 h-full">
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

        <div className="relative" ref={alertasRef}>
          <button
            className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors flex items-center justify-center"
            title="Avisos do sistema"
            onClick={() => setShowAlertas((v) => !v)}
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {alertasNaoLidos > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {alertasNaoLidos > 9 ? "9+" : alertasNaoLidos}
              </span>
            )}
          </button>

          {showAlertas && (
            <div className="absolute right-0 top-11 w-[min(360px,calc(100vw-1.5rem))] max-h-[420px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl z-50">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Avisos do sistema</p>
                  <p className="text-xs text-gray-500">{alertasNaoLidos} não lido(s)</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => marcarTodosAlertasComoLidos()}
                  disabled={alertas.length === 0}
                >
                  Marcar todos como lidos
                </Button>
              </div>

              {alertas.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Nenhum aviso pendente.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {alertas.map((alerta) => (
                    <div key={alerta.id} className={`p-3 ${alerta.lido ? "bg-white" : "bg-amber-50/50"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 ${alerta.tipo === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{alerta.titulo}</p>
                            <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">{alerta.mensagem}</p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {new Date(alerta.criadoEm).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <button
                          className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          title="Remover aviso"
                          onClick={() => removerAlertaSistema(alerta.id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 sm:gap-3 ml-2 pl-3 border-l border-gray-200 h-full">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 hidden lg:block">
            {administradoraNome && (
              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] xl:max-w-[150px]">
                {administradoraNome}
              </p>
            )}
            {administradoraEmail && (
              <p className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[120px] xl:max-w-[150px]">
                {administradoraEmail}
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
                  {administradoraNome && (
                    <p className="text-sm font-semibold text-white truncate">
                      {administradoraNome}
                    </p>
                  )}
                  {administradoraEmail && (
                    <p className="text-xs text-white/80 truncate">
                      {administradoraEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              className="w-full text-left px-4 py-3 text-sm text-amber-700 hover:bg-amber-50 flex items-center justify-between gap-3 transition-colors"
              onClick={() => {
                setShowMobileMenu(false)
                setShowAlertas(true)
              }}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-amber-600" />
                Avisos do sistema
              </div>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {alertasNaoLidos > 9 ? "9+" : alertasNaoLidos}
              </span>
            </button>
            <button
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              onClick={() => {
                router.push("/administradora/configuracoes")
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
