"use client"

const MAX_IDS = 300

function storageKeyNotificados(administradoraId: string) {
  return `chamados_notificados_${administradoraId}`
}

function storageKeyUltimaVerificacao(administradoraId: string) {
  return `chamados_ultima_verificacao_${administradoraId}`
}

function storageKeySessaoIniciada(administradoraId: string) {
  return `chamados_poll_sessao_${administradoraId}`
}

export function obterChamadosJaNotificados(administradoraId: string): Set<string> {
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

export function marcarChamadoComoNotificado(administradoraId: string, chamadoId: string) {
  if (typeof window === "undefined") return
  const ids = obterChamadosJaNotificados(administradoraId)
  ids.add(chamadoId)
  localStorage.setItem(
    storageKeyNotificados(administradoraId),
    JSON.stringify(Array.from(ids).slice(-MAX_IDS))
  )
}

export function obterUltimaVerificacaoChamados(administradoraId: string): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(storageKeyUltimaVerificacao(administradoraId))
}

export function salvarUltimaVerificacaoChamados(administradoraId: string, iso: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(storageKeyUltimaVerificacao(administradoraId), iso)
}

/** Na primeira carga da sessão do browser, define baseline sem notificar chamados antigos. */
export function iniciarBaselineChamadosSessao(administradoraId: string) {
  if (typeof window === "undefined") return
  const key = storageKeySessaoIniciada(administradoraId)
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, "1")
  salvarUltimaVerificacaoChamados(administradoraId, new Date().toISOString())
}

export function limparEstadoNotificacoesChamados(administradoraId: string) {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(storageKeyUltimaVerificacao(administradoraId))
  sessionStorage.removeItem(storageKeySessaoIniciada(administradoraId))
}
