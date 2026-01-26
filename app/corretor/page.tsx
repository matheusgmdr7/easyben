"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCorretorLogado } from "@/services/auth-corretores-simples"

export default function CorretorPage() {
  const router = useRouter()

  useEffect(() => {
    // Verificar se o corretor está autenticado
    const corretor = getCorretorLogado()
    
    if (corretor) {
      // Se estiver autenticado, redirecionar para o dashboard
      router.replace("/corretor/dashboard")
    } else {
      // Se não estiver autenticado, redirecionar para o login
      router.replace("/corretor/login")
    }
  }, [router])

  return null
}
