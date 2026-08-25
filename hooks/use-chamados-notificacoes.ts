"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { adicionarAlertaChamadoAberto } from "@/services/administradora-alertas-service"
import { SETOR_CHAMADO_LABELS, type SetorChamado } from "@/services/chamados-administradora-service"
import {
  iniciarBaselineChamadosSessao,
  marcarChamadoComoNotificado,
  obterChamadosJaNotificados,
  obterUltimaVerificacaoChamados,
  salvarUltimaVerificacaoChamados,
} from "@/lib/chamados-notificacoes-storage"

const INTERVALO_MS = 15_000

type ChamadoRecente = {
  id: string
  numero: number
  cliente_nome: string
  assunto: string
  aberto_em: string
  setor_responsavel: string | null
}

function labelSetor(codigo: string | null) {
  if (!codigo) return undefined
  return SETOR_CHAMADO_LABELS[codigo as SetorChamado] || codigo
}

export function useChamadosNotificacoes(ativo: boolean) {
  const processandoRef = useRef(false)

  useEffect(() => {
    if (!ativo) return

    const administradora = getAdministradoraLogada()
    const administradoraId = administradora?.id
    if (!administradoraId) return

    iniciarBaselineChamadosSessao(administradoraId)

    async function verificarNovosChamados() {
      if (processandoRef.current) return
      processandoRef.current = true

      try {
        const desde = obterUltimaVerificacaoChamados(administradoraId!)
        if (!desde) return

        const res = await fetch(
          `/api/administradora/chamados/recentes?${new URLSearchParams({
            administradora_id: administradoraId!,
            desde,
          }).toString()}`,
          { cache: "no-store" }
        )
        if (!res.ok) return

        const novos = (await res.json()) as ChamadoRecente[]
        if (!Array.isArray(novos) || novos.length === 0) return

        const jaNotificados = obterChamadosJaNotificados(administradoraId!)
        let ultimaVerificacao = desde

        for (const chamado of novos) {
          if (jaNotificados.has(chamado.id)) {
            if (chamado.aberto_em > ultimaVerificacao) ultimaVerificacao = chamado.aberto_em
            continue
          }

          const setorLabel = labelSetor(chamado.setor_responsavel)
          adicionarAlertaChamadoAberto({
            chamadoId: chamado.id,
            numero: chamado.numero,
            clienteNome: chamado.cliente_nome,
            assunto: chamado.assunto,
            setorLabel,
          })

          toast.info(`Novo chamado #${chamado.numero}`, {
            description: `${chamado.cliente_nome} — ${chamado.assunto}`,
            duration: 8000,
          })

          marcarChamadoComoNotificado(administradoraId!, chamado.id)
          jaNotificados.add(chamado.id)

          if (chamado.aberto_em > ultimaVerificacao) ultimaVerificacao = chamado.aberto_em
        }

        salvarUltimaVerificacaoChamados(administradoraId!, ultimaVerificacao)
      } catch {
        // silencioso — próxima tentativa no intervalo
      } finally {
        processandoRef.current = false
      }
    }

    void verificarNovosChamados()
    const timer = window.setInterval(() => void verificarNovosChamados(), INTERVALO_MS)
    return () => window.clearInterval(timer)
  }, [ativo])
}
