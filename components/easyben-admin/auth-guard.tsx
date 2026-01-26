"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-auth"
import { Spinner } from "@/components/ui/spinner"

/**
 * AuthGuard específico para EasyBen Admin
 * Verifica se o usuário está autenticado e tem permissão de master
 */
export default function EasyBenAuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMaster, setIsMaster] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔐 EasyBen AuthGuard: Verificando autenticação...")
        
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()
        
        if (error) {
          console.error("❌ EasyBen AuthGuard: Erro ao obter sessão:", error)
          router.push("/easyben-admin/login")
          return
        }
        
        if (!session) {
          console.log("⚠️ EasyBen AuthGuard: Sem sessão - redirecionando para login")
          router.push("/easyben-admin/login")
          return
        }

        console.log("✅ EasyBen AuthGuard: Usuário autenticado, verificando permissões...")
        
        // Verificar se é master
        const usuarioSalvo = localStorage.getItem("admin_usuario")
        if (usuarioSalvo) {
          try {
            const usuario = JSON.parse(usuarioSalvo)
            const perfil = usuario.perfil || usuario.role
            
            // Verificar se é master ou super_admin
            if (perfil === 'master' || perfil === 'super_admin') {
              console.log("✅ EasyBen AuthGuard: Usuário é master/super_admin")
              setIsMaster(true)
              setIsAuthenticated(true)
            } else {
              console.log("❌ EasyBen AuthGuard: Usuário não é master")
              router.push("/easyben-admin/login?error=permission_denied")
            }
          } catch (err) {
            console.error("❌ EasyBen AuthGuard: Erro ao verificar permissões:", err)
            router.push("/easyben-admin/login")
          }
        } else {
          // Buscar usuário do banco
          try {
            const email = session.user.email
            const { data: usuario, error: usuarioError } = await supabase
              .from("usuarios_admin")
              .select("*")
              .eq("email", email?.toLowerCase())
              .eq("ativo", true)
              .single()
            
            if (usuarioError || !usuario) {
              console.error("❌ EasyBen AuthGuard: Usuário não encontrado")
              router.push("/easyben-admin/login")
              return
            }
            
            const perfil = usuario.perfil || usuario.role
            if (perfil === 'master' || perfil === 'super_admin') {
              // Salvar no localStorage
              localStorage.setItem("admin_usuario", JSON.stringify({
                ...usuario,
                senha_hash: undefined,
              }))
              setIsMaster(true)
              setIsAuthenticated(true)
            } else {
              console.log("❌ EasyBen AuthGuard: Usuário não é master")
              router.push("/easyben-admin/login?error=permission_denied")
            }
          } catch (err) {
            console.error("❌ EasyBen AuthGuard: Erro ao buscar usuário:", err)
            router.push("/easyben-admin/login")
          }
        }
      } catch (error: any) {
        console.error("❌ EasyBen AuthGuard: Erro ao verificar autenticação:", error)
        router.push("/easyben-admin/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isMaster) {
    return null
  }

  return <>{children}</>
}


