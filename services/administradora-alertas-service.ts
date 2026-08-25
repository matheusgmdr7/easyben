"use client"

export type AlertaSistemaTipo = "warning" | "info"

export interface AlertaSistema {
  id: string
  titulo: string
  mensagem: string
  tipo: AlertaSistemaTipo
  criadoEm: string
  lido: boolean
  refTipo?: "chamado"
  refId?: string
  href?: string
}

const STORAGE_KEY = "administradora_alertas_sistema"
const EVENT_NAME = "administradora-alertas-updated"

function podeUsarStorage() {
  return typeof window !== "undefined" && !!window.localStorage
}

function dispararAtualizacao() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME))
  }
}

export function listarAlertasSistema(): AlertaSistema[] {
  if (!podeUsarStorage()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function salvarAlertas(alertas: AlertaSistema[]) {
  if (!podeUsarStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alertas))
  dispararAtualizacao()
}

export function adicionarAlertaSistema(input: {
  titulo: string
  mensagem: string
  tipo?: AlertaSistemaTipo
  refTipo?: "chamado"
  refId?: string
  href?: string
}) {
  const atual = listarAlertasSistema()
  if (input.refId && input.refTipo) {
    const duplicado = atual.some((a) => a.refTipo === input.refTipo && a.refId === input.refId)
    if (duplicado) return
  }
  const novo: AlertaSistema = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    titulo: input.titulo,
    mensagem: input.mensagem,
    tipo: input.tipo || "warning",
    criadoEm: new Date().toISOString(),
    lido: false,
    refTipo: input.refTipo,
    refId: input.refId,
    href: input.href,
  }
  salvarAlertas([novo, ...atual].slice(0, 50))
}

export function adicionarAlertaChamadoAberto(input: {
  chamadoId: string
  numero: number
  clienteNome: string
  assunto: string
  setorLabel?: string
}) {
  adicionarAlertaSistema({
    titulo: `Novo chamado #${input.numero}`,
    mensagem: `${input.clienteNome}\n${input.assunto}${input.setorLabel ? `\n${input.setorLabel}` : ""}`,
    tipo: "info",
    refTipo: "chamado",
    refId: input.chamadoId,
    href: `/administradora/chamados/${input.chamadoId}`,
  })
}

export function marcarTodosAlertasComoLidos() {
  const atual = listarAlertasSistema()
  salvarAlertas(atual.map((a) => ({ ...a, lido: true })))
}

export function removerAlertaSistema(id: string) {
  const atual = listarAlertasSistema()
  salvarAlertas(atual.filter((a) => a.id !== id))
}

export function obterNomeEventoAlertasSistema() {
  return EVENT_NAME
}
