/** Mapeamento de status Asaas → status interno da plataforma. */
export const ASAAS_TO_INTERNO: Record<string, string> = {
  PENDING: "pendente",
  RECEIVED: "paga",
  CONFIRMED: "paga",
  RECEIVED_IN_CASH: "paga",
  OVERDUE: "atrasada",
  REFUNDED: "cancelada",
  REFUND_REQUESTED: "cancelada",
  CHARGEBACK_REQUESTED: "cancelada",
  CHARGEBACK_DISPUTE: "cancelada",
  AWAITING_CHARGEBACK_REVERSAL: "cancelada",
  DELETED: "cancelada",
  CANCELED: "cancelada",
  CANCELLED: "cancelada",
  AWAITING_RISK_ANALYSIS: "pendente",
  DUNNING_REQUESTED: "atrasada",
  DUNNING_RECEIVED: "paga",
}

/** Sinônimos usados em importações/planilhas (mesmo mapa da pesquisa de faturas). */
const STATUS_ALIASES: Record<string, string> = {
  liquidado: "paga",
  baixado: "paga",
  cancelado: "cancelada",
  faturado: "pendente",
  processado: "pendente",
  vencido: "vencida",
  atrasado: "atrasada",
}

/** No banco, inadimplência aparece como `atrasada` (Asaas/cron) ou `vencida` (legado). */
const STATUS_EQUIVALENTES_FILTRO: Record<string, readonly string[]> = {
  atrasada: ["atrasada", "vencida"],
  vencida: ["vencida", "atrasada"],
}

export function normalizarStatusFatura(status: string | null | undefined): string {
  const bruto = String(status || "").trim()
  if (!bruto) return ""

  const upper = bruto.toUpperCase()
  if (ASAAS_TO_INTERNO[upper]) return ASAAS_TO_INTERNO[upper]

  const lower = bruto.toLowerCase()
  if (STATUS_ALIASES[lower]) return STATUS_ALIASES[lower]
  if (lower === "paid" || lower === "pago") return "paga"
  if (lower === "overdue") return "atrasada"
  if (lower === "cancelled" || lower === "canceled") return "cancelada"
  return lower
}

export function mapearStatusAsaas(status: string | null | undefined): string {
  const s = String(status || "").toUpperCase()
  return ASAAS_TO_INTERNO[s] || "pendente"
}

/** Fatura quitada: status canônico, variantes textuais ou data de pagamento registrada. */
export function faturaEstaPaga(
  status: string | null | undefined,
  pagamentoData?: string | null
): boolean {
  const canon = normalizarStatusFatura(status)
  if (canon === "cancelada") return false
  if (canon === "paga" || canon === "parcialmente_paga") return true

  const bruto = String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  if (/(pago|recebid|liquid|quitad)/.test(bruto)) return true

  return String(pagamentoData || "").trim().length > 0
}

/** Status gravado diverge da quitação (ex.: pendente com pagamento_data). */
export function faturaStatusPareceInconsistente(
  status: string | null | undefined,
  pagamentoData?: string | null
): boolean {
  const canon = normalizarStatusFatura(status)
  if (canon === "paga" || canon === "cancelada") return false
  return faturaEstaPaga(status, pagamentoData)
}

export function faturaStatusEmAberto(status: string | null | undefined): boolean {
  const s = normalizarStatusFatura(status)
  return s === "pendente" || s === "atrasada" || s === "vencida"
}

export function statusCanonicoEquivaleAoFiltro(statusFatura: string, statusFiltro: string): boolean {
  const f = normalizarStatusFatura(statusFatura)
  const alvo = normalizarStatusFatura(statusFiltro)
  if (!f || !alvo) return false
  if (f === alvo) return true
  const equivalentes = STATUS_EQUIVALENTES_FILTRO[alvo]
  return equivalentes?.includes(f) ?? false
}

function faturaVencimentoAnteriorAHoje(vencimento: string | null | undefined): boolean {
  const venc = dataIsoFatura(vencimento)
  if (!venc) return false
  const hoje = new Date().toISOString().slice(0, 10)
  return venc < hoje
}

export function faturaCombinaFiltroStatus(
  statusFatura: string,
  pagamentoData: string | null | undefined,
  statusFiltro: string,
  vencimento?: string | null
): boolean {
  const alvo = normalizarStatusFatura(statusFiltro)
  if (!alvo) return false
  if (alvo === "paga") return faturaEstaPaga(statusFatura, pagamentoData)
  if (faturaEstaPaga(statusFatura, pagamentoData)) return false
  const canon = normalizarStatusFatura(statusFatura)
  if (canon === "cancelada") return alvo === "cancelada"
  if (!canon && (alvo === "pendente" || alvo === "vencida" || alvo === "atrasada")) {
    return true
  }
  if (statusCanonicoEquivaleAoFiltro(statusFatura, alvo)) return true
  // Ainda `pendente` no banco, mas vencimento já passou (cron de atrasada não rodou).
  if (
    (alvo === "atrasada" || alvo === "vencida") &&
    (canon === "pendente" || !canon) &&
    faturaVencimentoAnteriorAHoje(vencimento)
  ) {
    return true
  }
  return false
}

export function dataIsoFatura(val: unknown): string | null {
  if (val == null || String(val).trim() === "") return null
  return String(val).slice(0, 10)
}

/** Verifica se vencimento, data_vencimento ou liquidação cai no intervalo [inicio, fim]. */
export function faturaDataCaiNoPeriodo(
  f: {
    vencimento?: string | null
    data_vencimento?: string | null
    pagamento_data?: string | null
  },
  inicio: string,
  fim: string
): boolean {
  for (const raw of [f.vencimento, f.data_vencimento, f.pagamento_data]) {
    const d = dataIsoFatura(raw)
    if (d && d >= inicio && d <= fim) return true
  }
  return false
}
