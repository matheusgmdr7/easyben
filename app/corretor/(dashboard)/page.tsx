"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

export default function CorretorPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar para o dashboard
    router.replace("/corretor/dashboard")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
      <span className="ml-2 text-gray-600">Redirecionando...</span>
    </div>
  )
}
