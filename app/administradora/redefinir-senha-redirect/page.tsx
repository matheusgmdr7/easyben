"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

/**
 * Página intermediária para redirecionamento de redefinição de senha
 * Detecta o tenant e redireciona para o domínio correto
 * 
 * Esta página resolve o problema de URLs dinâmicas no white-label:
 * - Supabase só aceita URLs fixas nas configurações
 * - Cada cliente tem seu próprio domínio
 * - Esta página recebe o token e redireciona para o domínio correto
 */
export default function RedefinirSenhaRedirectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    const processarRedirecionamento = async () => {
      try {
        // Obter token da URL (Supabase adiciona automaticamente)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        // Verificar se é um token de recuperação
        if (type !== "recovery" || !accessToken) {
          setErro("Link inválido ou expirado. Solicite uma nova redefinição de senha.")
          setLoading(false)
          return
        }

        // Detectar domínio atual
        const hostname = window.location.hostname
        const protocol = window.location.protocol

        // Construir URL de redirecionamento para o mesmo domínio
        const redirectUrl = `${protocol}//${hostname}/administradora/redefinir-senha?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken || "")}&type=${type}`

        // Redirecionar para a página de redefinição no mesmo domínio
        router.push(redirectUrl)
      } catch (error: any) {
        console.error("❌ Erro ao processar redirecionamento:", error)
        setErro("Erro ao processar link de redefinição. Tente novamente.")
        setLoading(false)
      }
    }

    processarRedirecionamento()
  }, [router])

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{erro}</p>
          <a
            href="/administradora/recuperar-senha"
            className="text-[#0F172A] hover:underline font-medium"
          >
            Solicitar nova redefinição de senha
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner className="h-8 w-8 mx-auto mb-4" />
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  )
}

