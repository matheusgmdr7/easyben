"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdministradoraRootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/administradora/dashboard")
  }, [router])

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="loading-corporate"></div>
    </div>
  )
}
