"use client"

import { useChamadosNotificacoes } from "@/hooks/use-chamados-notificacoes"
import { useAdministradoraPermissions } from "@/hooks/use-administradora-permissions"

/** Escuta novos chamados e dispara toast + sino (sem repetir no login). */
export function ChamadosNotificacoesListener() {
  const { podeAcessar } = useAdministradoraPermissions()
  const ativo = podeAcessar("chamados")
  useChamadosNotificacoes(ativo)
  return null
}
