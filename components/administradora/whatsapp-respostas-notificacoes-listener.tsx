"use client"

import { useWhatsappRespostasNotificacoes } from "@/hooks/use-whatsapp-respostas-notificacoes"
import { useAdministradoraPermissions } from "@/hooks/use-administradora-permissions"

/** Escuta respostas de clientes no WhatsApp e dispara toast + sino. */
export function WhatsappRespostasNotificacoesListener() {
  const { podeAcessarItem } = useAdministradoraPermissions()
  const ativo = podeAcessarItem("financeiro_cobrancas")
  useWhatsappRespostasNotificacoes(ativo)
  return null
}
