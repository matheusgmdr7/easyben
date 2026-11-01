"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { adicionarAlertaRespostaWhatsApp } from "@/services/administradora-alertas-service"
import {
  avisarAtualizacaoRespostasWhatsApp,
  iniciarBaselineRespostasSessao,
  marcarRespostaComoNotificada,
  obterRespostasJaNotificadas,
  obterUltimaVerificacaoRespostas,
  salvarUltimaVerificacaoRespostas,
} from "@/lib/whatsapp-respostas-notificacoes"

const INTERVALO_MS = 8_000

let assinantes = 0
let timerPoll: number | null = null
let verificarAtual: (() => void) | null = null

function aoFicarVisivel() {
  if (document.visibilityState === "visible") verificarAtual?.()
}

type RespostaRecente = {
  id: string
  conversa_id: string
  cliente_nome: string
  preview: string
  created_at: string
}

export function useWhatsappRespostasNotificacoes(ativo: boolean) {
  const processandoRef = useRef(false)

  useEffect(() => {
    if (!ativo) return

    const administradora = getAdministradoraLogada()
    const administradoraId = administradora?.id
    if (!administradoraId) return

    iniciarBaselineRespostasSessao(administradoraId)

    async function verificarNovasRespostas() {
      if (processandoRef.current) return
      if (typeof document !== "undefined" && document.hidden) return
      processandoRef.current = true

      try {
        const desde = obterUltimaVerificacaoRespostas(administradoraId!)
        if (!desde) {
          const base = await fetch(
            `/api/administradora/whatsapp/conversas/recentes?${new URLSearchParams({
              administradora_id: administradoraId!,
              baseline: "1",
            }).toString()}`,
            { cache: "no-store" }
          )
          if (!base.ok) return
          const marco = (await base.json()) as { agora?: string }
          if (marco.agora) salvarUltimaVerificacaoRespostas(administradoraId!, marco.agora)
          return
        }

        const res = await fetch(
          `/api/administradora/whatsapp/conversas/recentes?${new URLSearchParams({
            administradora_id: administradoraId!,
            desde,
          }).toString()}`,
          { cache: "no-store" }
        )
        if (!res.ok) return

        const novos = (await res.json()) as RespostaRecente[]
        if (!Array.isArray(novos) || novos.length === 0) return

        const jaNotificadas = obterRespostasJaNotificadas(administradoraId!)
        let ultimaVerificacao = desde
        let houveNova = false

        for (const mensagem of novos) {
          if (mensagem.created_at > ultimaVerificacao) ultimaVerificacao = mensagem.created_at
          if (jaNotificadas.has(mensagem.id)) continue

          adicionarAlertaRespostaWhatsApp({
            mensagemId: mensagem.id,
            clienteNome: mensagem.cliente_nome,
            preview: mensagem.preview,
          })

          toast.info("Cliente respondeu no WhatsApp", {
            description: `${mensagem.cliente_nome} — ${mensagem.preview}`,
            duration: 8000,
          })

          marcarRespostaComoNotificada(administradoraId!, mensagem.id)
          jaNotificadas.add(mensagem.id)
          houveNova = true
        }

        salvarUltimaVerificacaoRespostas(administradoraId!, ultimaVerificacao)
        if (houveNova) avisarAtualizacaoRespostasWhatsApp()
      } catch {
        // silencioso — próxima tentativa no intervalo
      } finally {
        processandoRef.current = false
      }
    }

    verificarAtual = () => {
      void verificarNovasRespostas()
    }
    assinantes += 1
    if (timerPoll == null) {
      void verificarAtual()
      timerPoll = window.setInterval(() => verificarAtual?.(), INTERVALO_MS)
      document.addEventListener("visibilitychange", aoFicarVisivel)
    }

    return () => {
      assinantes -= 1
      if (assinantes > 0) return
      assinantes = 0
      if (timerPoll != null) window.clearInterval(timerPoll)
      timerPoll = null
      verificarAtual = null
      document.removeEventListener("visibilitychange", aoFicarVisivel)
    }
  }, [ativo])
}
