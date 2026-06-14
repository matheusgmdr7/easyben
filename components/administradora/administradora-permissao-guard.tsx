"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAdministradoraPermissions } from "@/hooks/use-administradora-permissions"
import { moduloParaRotaAdministradora } from "@/lib/administradora-permissoes"

export function AdministradoraPermissaoGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { podeAcessar, isMaster } = useAdministradoraPermissions()

  useEffect(() => {
    const modulo = moduloParaRotaAdministradora(pathname || "")
    if (!modulo) return
    if (isMaster || podeAcessar(modulo)) return
    toast.error("Você não tem permissão para acessar esta página")
    router.replace("/administradora/dashboard")
  }, [pathname, podeAcessar, isMaster, router])

  return <>{children}</>
}
