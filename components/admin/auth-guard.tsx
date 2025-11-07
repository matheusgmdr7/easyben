"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-auth"
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
              // Buscar dados completos do usuário
              // Nota: Isso requer a senha, então vamos buscar por email apenas
              // Por enquanto, vamos apenas verificar se existe no localStorage
              // Se não existir, o usuário precisará fazer login novamente
              console.log("⚠️ AuthGuard: Usuário não encontrado no localStorage. Faça login novamente.")
            } catch (err) {
              console.error("❌ AuthGuard: Erro ao buscar usuário:", err)
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
