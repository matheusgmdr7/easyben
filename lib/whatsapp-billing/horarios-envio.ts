export type JanelaEnvioWhatsApp = "manha" | "tarde"

export function normalizarHorarioEnvio(val: string | null | undefined, fallback: string): string {
  const raw = String(val || fallback).trim()
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 8)
  return fallback
}

export function horarioParaJanela(
  settings: {
    horario_envio?: string | null
    horario_envio_tarde?: string | null
  },
  janela: JanelaEnvioWhatsApp
): string | null {
  if (janela === "tarde") {
    const tarde = settings.horario_envio_tarde
    if (tarde == null || String(tarde).trim() === "") return null
    return normalizarHorarioEnvio(tarde, "15:00:00")
  }
  return normalizarHorarioEnvio(settings.horario_envio, "09:00:00")
}

export const LABELS_MOTIVO_IGNORADO: Record<string, string> = {
  telefone_invalido: "Telefone inválido ou ausente",
  evento_desativado: "Evento desativado na configuração",
  template_indisponivel: "Template não configurado",
  status_nao_elegivel: "Fatura com status não elegível",
  sem_cliente_vinculado: "Fatura sem cliente vinculado",
  fatura_nao_encontrada: "Fatura não encontrada",
  janela_tarde_desativada: "Retentativa da tarde desativada",
  ja_enviado: "Já enviado com sucesso na janela da manhã",
  desconhecido: "Motivo não informado",
}

export function labelMotivoIgnorado(reason: string | undefined): string {
  if (!reason) return LABELS_MOTIVO_IGNORADO.desconhecido
  return LABELS_MOTIVO_IGNORADO[reason] || reason
}
