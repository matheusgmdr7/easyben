"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAdministradoraPermissions } from "@/hooks/use-administradora-permissions"
import {
  moduloParaRotaAdministradora,
  normalizarPathAdministradora,
  primeiraRotaDisponivelAdministradora,
  aplicarPrefixoTenantNaRota,
} from "@/lib/administradora-permissoes"

export function AdministradoraPermissaoGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { podeAcessar, isMaster, permissoes } = useAdministradoraPermissions()

  useEffect(() => {
    const modulo = moduloParaRotaAdministradora(pathname || "")
    if (!modulo) return
    if (isMaster || podeAcessar(modulo)) return

    const destino = aplicarPrefixoTenantNaRota(
      pathname || "",
      primeiraRotaDisponivelAdministradora(permissoes, isMaster)
    )
    if (normalizarPathAdministradora(destino) === normalizarPathAdministradora(pathname || "")) return

    toast.error("Você não tem permissão para acessar esta página")
    router.replace(destino)
  }, [pathname, podeAcessar, isMaster, router, permissoes])

  return <>{children}</>
}
