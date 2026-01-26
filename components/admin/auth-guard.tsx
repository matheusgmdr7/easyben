"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-auth"
import { PERFIS_PERMISSOES } from "@/services/usuarios-admin-service"
import { Spinner } from "@/components/ui/spinner"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔐 AuthGuard: Verificando autenticação...")
        
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()
        
        if (error) {
          console.error("❌ AuthGuard: Erro ao obter sessão:", error)
          router.push("/admin/login")
          return
        }
        
        if (session) {
          console.log("✅ AuthGuard: Usuário autenticado com sucesso")
          
          // Verificar se o usuário já está salvo no localStorage
          const usuarioSalvo = localStorage.getItem("admin_usuario")
          if (!usuarioSalvo && session.user?.email) {
            console.log("🔍 AuthGuard: Usuário não encontrado no localStorage, buscando do banco...")
            try {
              const email = session.user.email
              console.log("📧 AuthGuard: Buscando usuário por email:", email)
              
              // Tentar buscar via API primeiro
              let usuarioData: any = null
              let apiFuncionou = false
              
              try {
                console.log("🔄 AuthGuard: Tentando buscar usuário via API route...")
                console.log("📍 URL da API:", "/api/admin/auth/user")
                console.log("📍 Email:", email)
                
                const response = await fetch("/api/admin/auth/user", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email }),
                })
                
                console.log("📡 AuthGuard: Resposta da API:", {
                  status: response.status,
                  statusText: response.statusText,
                  ok: response.ok,
                })
                
                if (response.ok) {
                  try {
                    const data = await response.json()
                    usuarioData = data.usuario
                    apiFuncionou = true
                    console.log("✅ AuthGuard: Usuário encontrado via API")
                  } catch (jsonError) {
                    console.error("❌ AuthGuard: Erro ao fazer parse da resposta JSON:", jsonError)
                    const textResponse = await response.text()
                    console.error("📄 AuthGuard: Resposta em texto:", textResponse)
                  }
                } else {
                  console.warn("⚠️ AuthGuard: API retornou erro:", response.status, response.statusText)
                  if (response.status === 404) {
                    console.warn("⚠️ AuthGuard: API route não encontrada (404) - tentando fallback direto do Supabase")
                  }
                }
              } catch (apiError: any) {
                console.warn("⚠️ AuthGuard: Erro ao chamar API route:", apiError.message)
                console.warn("⚠️ AuthGuard: Tentando fallback direto do Supabase...")
              }
              
              // FALLBACK: Se a API não funcionou, tentar buscar diretamente do Supabase
              if (!apiFuncionou || !usuarioData) {
                console.log("🔄 AuthGuard: FALLBACK - Buscando usuário diretamente do Supabase...")
                console.log("📧 Email buscado:", email.toLowerCase())
                console.log("🔍 Executando query no Supabase...")
                
                try {
                  const { data: usuarioSupabase, error: supabaseError } = await supabase
                    .from("usuarios_admin")
                    .select("*")
                    .eq("email", email.toLowerCase())
                    .eq("ativo", true)
                    .single()
                  
                  console.log("📊 AuthGuard: Resultado do fallback Supabase:", {
                    usuarioEncontrado: !!usuarioSupabase,
                    error: supabaseError ? {
                      message: supabaseError.message,
                      code: supabaseError.code,
                      details: supabaseError.details,
                      hint: supabaseError.hint,
                    } : null,
                    usuarioId: usuarioSupabase?.id,
                    usuarioEmail: usuarioSupabase?.email,
                  })
                  
                  if (supabaseError || !usuarioSupabase) {
                    console.error("❌ AuthGuard: Erro no fallback ao buscar usuário do Supabase:", {
                      message: supabaseError?.message,
                      code: supabaseError?.code,
                      details: supabaseError?.details,
                      hint: supabaseError?.hint,
                    })
                    // Não bloquear, mas não salvar no localStorage
                    localStorage.removeItem("admin_usuario")
                    router.push("/admin/login")
                    return
                  }
                  
                  usuarioData = usuarioSupabase
                  console.log("✅ AuthGuard: Usuário encontrado via fallback Supabase")
                } catch (fallbackError: any) {
                  console.error("❌ AuthGuard: Erro no fallback ao buscar usuário:", fallbackError)
                  console.error("❌ Stack trace:", fallbackError.stack)
                  localStorage.removeItem("admin_usuario")
                  router.push("/admin/login")
                  return
                }
              }
              
              // Se encontrou o usuário, salvar no localStorage
              if (usuarioData) {
                // Garantir que permissões seja sempre um array
                let permissoesArray: string[] = []
                if (Array.isArray(usuarioData.permissoes)) {
                  permissoesArray = usuarioData.permissoes
                } else if (usuarioData.permissoes && typeof usuarioData.permissoes === "object") {
                  permissoesArray = Object.keys(usuarioData.permissoes)
                }
                
                // Se não há permissões, usar permissões padrão do perfil
                if (permissoesArray.length === 0 && usuarioData.perfil) {
                  permissoesArray = PERFIS_PERMISSOES[usuarioData.perfil as keyof typeof PERFIS_PERMISSOES] || []
                }
                
                const usuarioParaSalvar = {
                  ...usuarioData,
                  senha_hash: undefined,
                  permissoes: permissoesArray,
                }
                
                localStorage.setItem("admin_usuario", JSON.stringify(usuarioParaSalvar))
                console.log("✅ AuthGuard: Usuário salvo no localStorage")
              } else {
                console.warn("⚠️ AuthGuard: Usuário não encontrado no banco. Faça login novamente.")
              }
            } catch (err: any) {
              console.error("❌ AuthGuard: Erro ao buscar usuário:", err)
              console.error("❌ Stack trace:", err.stack)
            }
          }
          
          setIsAuthenticated(true)
        } else {
          console.log("⚠️ AuthGuard: Sem sessão - redirecionando para login")
          // Limpar localStorage se não há sessão
          localStorage.removeItem("admin_usuario")
          router.push("/admin/login")
        }
      } catch (error: any) {
        console.error("❌ AuthGuard: Erro ao verificar autenticação:", error)
        console.error("Erro detalhado:", {
          message: error?.message,
          stack: error?.stack
        })
        router.push("/admin/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
