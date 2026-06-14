"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import {
  type ModuloAdministradora,
  usuarioAdministradoraTemPermissao,
  moduloParaRotaAdministradora,
  primeiraRotaDisponivelAdministradora,
  aplicarPrefixoTenantNaRota,
} from "@/lib/administradora-permissoes"
import {
  type UsuarioAdministradoraSessao,
  montarUsuarioMasterSessao,
} from "@/services/usuarios-administradora-service"

export function useAdministradoraPermissions() {
  const pathname = usePathname()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setTick((t) => t + 1)
  }, [pathname])

  const sessao = typeof window !== "undefined" ? getAdministradoraLogada() : null
  const usuario: UsuarioAdministradoraSessao = useMemo(() => {
    void tick
    if (sessao?.usuario) return sessao.usuario
    if (sessao) return montarUsuarioMasterSessao(sessao)
    return {
      id: null,
      nome: "",
      email: "",
      is_master: false,
      perfil: "customizado",
      permissoes: [],
    }
  }, [sessao, tick])

  const isMaster = usuario.is_master === true

  const rotaInicialPortal = useMemo(
    () => primeiraRotaDisponivelAdministradora(usuario.permissoes, isMaster),
    [usuario.permissoes, isMaster]
  )

  function podeAcessar(modulo: ModuloAdministradora): boolean {
    return usuarioAdministradoraTemPermissao(usuario.permissoes, modulo, isMaster)
  }

  /** Verifica permissão de um item específico do menu (inclui subitens). */
  function podeAcessarItem(itemId: ModuloAdministradora): boolean {
    return usuarioAdministradoraTemPermissao(usuario.permissoes, itemId, isMaster)
  }

  function podeAcessarRota(pathname: string): boolean {
    const modulo = moduloParaRotaAdministradora(pathname)
    if (!modulo) return true
    return podeAcessar(modulo)
  }

  function rotaInicial(pathname?: string): string {
    if (pathname) return aplicarPrefixoTenantNaRota(pathname, rotaInicialPortal)
    return rotaInicialPortal
  }

  return {
    usuario,
    isMaster,
    permissoes: usuario.permissoes,
    podeAcessar,
    podeAcessarItem,
    podeAcessarRota,
    rotaInicial,
    podeGerenciarAcesso: isMaster || podeAcessar("gerenciar_acesso"),
  }
}
