"use client"

const MAX_IDS = 300

export const EVENTO_WHATSAPP_RESPOSTAS_ATUALIZADAS = "whatsapp-respostas-atualizadas"

function storageKeyNotificados(administradoraId: string) {
  return `whatsapp_respostas_notificadas_${administradoraId}`
}

function storageKeyUltimaVerificacao(administradoraId: string) {
  return `whatsapp_respostas_ultima_verificacao_${administradoraId}`
}

function storageKeySessaoIniciada(administradoraId: string) {
  return `whatsapp_respostas_poll_sessao_${administradoraId}`
}

export function obterRespostasJaNotificadas(administradoraId: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(storageKeyNotificados(administradoraId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

export function marcarRespostaComoNotificada(administradoraId: string, mensagemId: string) {
  if (typeof window === "undefined") return
  const ids = obterRespostasJaNotificadas(administradoraId)
  ids.add(mensagemId)
  localStorage.setItem(
    storageKeyNotificados(administradoraId),
    JSON.stringify(Array.from(ids).slice(-MAX_IDS))
  )
}

export function obterUltimaVerificacaoRespostas(administradoraId: string): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(storageKeyUltimaVerificacao(administradoraId))
}

export function salvarUltimaVerificacaoRespostas(administradoraId: string, iso: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(storageKeyUltimaVerificacao(administradoraId), iso)
}

/** Marca a sessão. O horário inicial vem do servidor, para não avisar mensagens antigas. */
export function iniciarBaselineRespostasSessao(administradoraId: string) {
  if (typeof window === "undefined") return
  const key = storageKeySessaoIniciada(administradoraId)
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, "1")
}

export function limparEstadoNotificacoesRespostas(administradoraId: string) {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(storageKeyUltimaVerificacao(administradoraId))
  sessionStorage.removeItem(storageKeySessaoIniciada(administradoraId))
}

export function avisarAtualizacaoRespostasWhatsApp() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(EVENTO_WHATSAPP_RESPOSTAS_ATUALIZADAS))
}
