import { supabaseAdmin } from "@/lib/supabase-admin"
import { WHATSAPP_BILLING_EVENT_LABELS, type WhatsAppBillingEventType } from "./event-types"
import { REGRAS_LEMBRETE_COBRANCA, vencimentoAlvoParaEvento } from "./reminder-rules"
import { STATUS_SUCESSO_LEMBRETE } from "./reminders-pending"

export type CoberturaEventoRow = {
  event_type: WhatsAppBillingEventType
  event_label: string
  reference_date: string
  vencimento_alvo: string
  elegiveis: number
  enviados_ok: number
  falhas: number
  pendentes_fila: number
  nunca_tentados: number
  cobertura_pct: number
}

export type ErroPorTelefoneRow = {
  telefone_mascara: string
  total_falhas: number
  titulo_erro: string
  error_code: string | null
  eventos: string[]
}

export type RelatorioCoberturaParams = {
  administradoraId: string
  de: string
  ate: string
}

const STATUS_FALHA = new Set(["failed", "failed_permanent", "undelivered"])
const STATUS_PENDENTE = new Set(["pending", "queued"])

function diasEntre(de: string, ate: string): string[] {
  const dias: string[] = []
  const start = new Date(`${de}T12:00:00.000Z`)
  const end = new Date(`${ate}T12:00:00.000Z`)
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10))
  }
  return dias
}

async function contarFaturasElegiveis(
  administradoraId: string,
  vencimento: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("faturas")
    .select("id", { count: "exact", head: true })
    .eq("administradora_id", administradoraId)
    .eq("vencimento", vencimento)
    .in("status", ["pendente", "atrasada", "vencida"])
    .not("cliente_administradora_id", "is", null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function agregarMensagensPorFatura(
  administradoraId: string,
  eventType: WhatsAppBillingEventType,
  referenceDate: string
): Promise<{ ok: number; falha: number; pendente: number; tentados: number }> {
  const pageSize = 1000
  let offset = 0
  const faturasOk = new Set<string>()
  const faturasFalha = new Set<string>()
  const faturasPendente = new Set<string>()
  const faturasTentados = new Set<string>()

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("fatura_id, status")
      .eq("administradora_id", administradoraId)
      .eq("event_type", eventType)
      .eq("reference_date", referenceDate)
      .not("fatura_id", "is", null)
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(error.message)
    const chunk = data || []
    if (!chunk.length) break

    for (const row of chunk) {
      const fid = String(row.fatura_id)
      faturasTentados.add(fid)
      const st = String(row.status)
      if (STATUS_SUCESSO_LEMBRETE.has(st)) faturasOk.add(fid)
      else if (STATUS_FALHA.has(st)) faturasFalha.add(fid)
      else if (STATUS_PENDENTE.has(st)) faturasPendente.add(fid)
    }

    if (chunk.length < pageSize) break
    offset += pageSize
    if (offset > 50000) break
  }

  return {
    ok: faturasOk.size,
    falha: faturasFalha.size,
    pendente: faturasPendente.size,
    tentados: faturasTentados.size,
  }
}

export async function montarRelatorioCoberturaWhatsApp(
  params: RelatorioCoberturaParams
): Promise<{
  periodo: { de: string; ate: string }
  por_evento_dia: CoberturaEventoRow[]
  resumo: {
    elegiveis_total: number
    enviados_ok_total: number
    falhas_total: number
    nunca_tentados_total: number
    cobertura_pct: number
  }
  erros_por_telefone: ErroPorTelefoneRow[]
}> {
  const de = String(params.de).slice(0, 10)
  const ate = String(params.ate).slice(0, 10)
  const dias = diasEntre(de, ate)
  const porEventoDia: CoberturaEventoRow[] = []

  let elegiveisTotal = 0
  let okTotal = 0
  let falhasTotal = 0
  let nuncaTotal = 0

  for (const refDate of dias) {
    for (const regra of REGRAS_LEMBRETE_COBRANCA) {
      const vencimentoAlvo = vencimentoAlvoParaEvento(regra.dayOffset, refDate)
      const elegiveis = await contarFaturasElegiveis(params.administradoraId, vencimentoAlvo)
      if (elegiveis === 0) continue

      const agg = await agregarMensagensPorFatura(
        params.administradoraId,
        regra.eventType,
        refDate
      )

      const nuncaTentados = Math.max(0, elegiveis - agg.tentados)
      const coberturaPct = elegiveis > 0 ? Math.round((agg.ok / elegiveis) * 100) : 0

      porEventoDia.push({
        event_type: regra.eventType,
        event_label: WHATSAPP_BILLING_EVENT_LABELS[regra.eventType],
        reference_date: refDate,
        vencimento_alvo: vencimentoAlvo,
        elegiveis,
        enviados_ok: agg.ok,
        falhas: agg.falha,
        pendentes_fila: agg.pendente,
        nunca_tentados: nuncaTentados,
        cobertura_pct: coberturaPct,
      })

      elegiveisTotal += elegiveis
      okTotal += agg.ok
      falhasTotal += agg.falha
      nuncaTotal += nuncaTentados
    }
  }

  const { data: falhasTel } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("telefone, event_type, error_code, error_message, status")
    .eq("administradora_id", params.administradoraId)
    .gte("reference_date", de)
    .lte("reference_date", ate)
    .in("status", [...STATUS_FALHA])
    .limit(5000)

  const mapaTel = new Map<string, ErroPorTelefoneRow>()
  for (const row of falhasTel || []) {
    const tel = String(row.telefone || "").replace(/\d(?=\d{4})/g, "*")
    if (!tel) continue
    const prev = mapaTel.get(tel) || {
      telefone_mascara: tel,
      total_falhas: 0,
      titulo_erro: String(row.error_message || "Erro desconhecido").slice(0, 80),
      error_code: row.error_code,
      eventos: [],
    }
    prev.total_falhas++
    const ev = String(row.event_type)
    if (!prev.eventos.includes(ev)) prev.eventos.push(ev)
    mapaTel.set(tel, prev)
  }

  const errosPorTelefone = Array.from(mapaTel.values())
    .sort((a, b) => b.total_falhas - a.total_falhas)
    .slice(0, 20)

  const coberturaGeral =
    elegiveisTotal > 0 ? Math.round((okTotal / elegiveisTotal) * 100) : 0

  return {
    periodo: { de, ate },
    por_evento_dia: porEventoDia,
    resumo: {
      elegiveis_total: elegiveisTotal,
      enviados_ok_total: okTotal,
      falhas_total: falhasTotal,
      nunca_tentados_total: nuncaTotal,
      cobertura_pct: coberturaGeral,
    },
    erros_por_telefone: errosPorTelefone,
  }
}
