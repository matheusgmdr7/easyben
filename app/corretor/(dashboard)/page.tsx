"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CorretorPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar para o dashboard
    router.replace("/corretor/dashboard")
  }, [router])

  return null
}
