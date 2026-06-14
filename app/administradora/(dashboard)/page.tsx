"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { primeiraRotaDisponivelAdministradora, aplicarPrefixoTenantNaRota } from "@/lib/administradora-permissoes"

export default function AdministradoraRootPage() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const adm = getAdministradoraLogada()
    const usuario = adm?.usuario
    const rota = primeiraRotaDisponivelAdministradora(usuario?.permissoes, usuario?.is_master)
    router.replace(aplicarPrefixoTenantNaRota(pathname || "", rota))
  }, [router, pathname])

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="loading-corporate"></div>
    </div>
  )
}
