import {
  WHATSAPP_BILLING_EVENT_LABELS,
  type WhatsAppBillingEventType,
} from "./event-types"

export const STATUS_FALHA_WHATSAPP = new Set(["failed", "failed_permanent", "undelivered"])

/** Rótulos conhecidos de códigos Twilio WhatsApp (amostra dos mais comuns). */
const ROTULO_CODIGO_TWILIO: Record<string, string> = {
  "21211": "Telefone inválido",
  "21614": "Número não é celular",
  "21608": "Número não habilitado para WhatsApp",
  "63007": "Canal WhatsApp indisponível",
  "63015": "Template não aprovado ou inexistente",
  "63016": "Fora da janela de 24h / template obrigatório",
  "63017": "Limite de taxa excedido",
  "63018": "Conta WhatsApp restrita",
  "63024": "Template rejeitado ou inválido",
  "63025": "Parâmetro de template inválido",
  "63026": "Template pausado ou desabilitado",
  "30003": "Destinatário indisponível",
  "30004": "Mensagem bloqueada",
  "30005": "Destino desconhecido",
  "30006": "Linha fixa ou indisponível",
  "30007": "Spam / bloqueio do operador",
  "30008": "Erro desconhecido no destino",
}

export type LinhaAgregacaoFalha = {
  event_type: string
  status: string
  error_message: string | null
  error_code: string | null
  failed_at: string | null
  created_at: string
}

export type ErroFrequenteRelatorio = {
  chave: string
  titulo: string
  mensagem: string
  error_code: string | null
  qtd: number
  pct_falhas: number
  eventos: Array<{ event_type: string; event_label: string; qtd: number }>
  ultima_ocorrencia: string | null
  status_tipico: string | null
}

export type FalhaRecenteRelatorio = {
  id?: string
  created_at: string
  failed_at: string | null
  event_type: string
  event_label: string
  status: string
  error_code: string | null
  titulo_erro: string
  mensagem: string
  cliente_nome?: string | null
  telefone_mascara?: string
}

function extrairCodigoTwilio(errorCode: string | null | undefined, errorMessage: string | null | undefined) {
  const code = String(errorCode || "").trim()
  if (code) return code
  const msg = String(errorMessage || "")
  const m = msg.match(/\b(21\d{3}|30\d{3}|63\d{3})\b/)
  return m?.[1] || null
}

function normalizarTextoErro(msg: string) {
  return msg
    .replace(/\s+/g, " ")
    .replace(/\+?\d{10,15}/g, "{telefone}")
    .trim()
    .slice(0, 240)
}

export function classificarMotivoErroWhatsApp(params: {
  error_message?: string | null
  error_code?: string | null
  status?: string | null
}): { chave: string; titulo: string; mensagem: string; codigo: string | null } {
  const status = String(params.status || "failed").toLowerCase()
  const codigo = extrairCodigoTwilio(params.error_code, params.error_message)
  const rawMsg = String(params.error_message || "").trim()

  if (codigo && ROTULO_CODIGO_TWILIO[codigo]) {
    return {
      chave: `code:${codigo}`,
      titulo: ROTULO_CODIGO_TWILIO[codigo],
      mensagem: rawMsg || ROTULO_CODIGO_TWILIO[codigo],
      codigo,
    }
  }

  if (rawMsg) {
    const norm = normalizarTextoErro(rawMsg)
    const lower = norm.toLowerCase()
    if (lower.includes("timeout twilio")) {
      return { chave: "timeout", titulo: "Timeout na Twilio", mensagem: norm, codigo }
    }
    if (lower.includes("telefone") && (lower.includes("inválido") || lower.includes("invalid"))) {
      return { chave: "telefone_invalido", titulo: "Telefone inválido", mensagem: norm, codigo }
    }
    if (lower.includes("content") && lower.includes("sid")) {
      return { chave: "content_sid", titulo: "Template / Content SID", mensagem: norm, codigo }
    }
    if (codigo) {
      return { chave: `code:${codigo}`, titulo: `Erro Twilio ${codigo}`, mensagem: norm, codigo }
    }
    const chave = `msg:${norm.slice(0, 80)}`
    return { chave, titulo: norm.slice(0, 72) + (norm.length > 72 ? "…" : ""), mensagem: norm, codigo }
  }

  if (codigo) {
    return {
      chave: `code:${codigo}`,
      titulo: `Erro Twilio ${codigo}`,
      mensagem: `Código Twilio ${codigo}`,
      codigo,
    }
  }

  const tituloStatus =
    status === "undelivered"
      ? "Não entregue (sem motivo detalhado)"
      : status === "failed_permanent"
        ? "Falha permanente (sem motivo detalhado)"
        : "Falha (sem motivo detalhado)"

  return {
    chave: `sem_motivo:${status}`,
    titulo: tituloStatus,
    mensagem: tituloStatus,
    codigo: null,
  }
}

export function agregarErrosFrequentes(
  linhas: LinhaAgregacaoFalha[],
  totalFalhas: number
): ErroFrequenteRelatorio[] {
  const map = new Map<
    string,
    {
      titulo: string
      mensagem: string
      error_code: string | null
      qtd: number
      eventos: Record<string, number>
      ultima: string | null
      status: string | null
    }
  >()

  for (const row of linhas) {
    if (!STATUS_FALHA_WHATSAPP.has(String(row.status || ""))) continue
    const cls = classificarMotivoErroWhatsApp({
      error_message: row.error_message,
      error_code: row.error_code,
      status: row.status,
    })
    const when = row.failed_at || row.created_at
    const cur = map.get(cls.chave) || {
      titulo: cls.titulo,
      mensagem: cls.mensagem,
      error_code: cls.codigo,
      qtd: 0,
      eventos: {},
      ultima: null,
      status: row.status,
    }
    cur.qtd++
    const ev = String(row.event_type || "outro")
    cur.eventos[ev] = (cur.eventos[ev] || 0) + 1
    if (when && (!cur.ultima || when > cur.ultima)) cur.ultima = when
    if (!cur.error_code && cls.codigo) cur.error_code = cls.codigo
    if (cls.mensagem.length > cur.mensagem.length) cur.mensagem = cls.mensagem
    map.set(cls.chave, cur)
  }

  return [...map.entries()]
    .map(([chave, v]) => ({
      chave,
      titulo: v.titulo,
      mensagem: v.mensagem,
      error_code: v.error_code,
      qtd: v.qtd,
      pct_falhas: totalFalhas > 0 ? Math.round((v.qtd / totalFalhas) * 100) : 0,
      eventos: Object.entries(v.eventos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([event_type, qtd]) => ({
          event_type,
          event_label:
            WHATSAPP_BILLING_EVENT_LABELS[event_type as WhatsAppBillingEventType] || event_type,
          qtd,
        })),
      ultima_ocorrencia: v.ultima,
      status_tipico: v.status,
    }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 12)
}

export function contarFalhasComESemMotivo(linhas: LinhaAgregacaoFalha[]) {
  let comMotivo = 0
  let semMotivo = 0
  for (const row of linhas) {
    if (!STATUS_FALHA_WHATSAPP.has(String(row.status || ""))) continue
    const tem =
      Boolean(String(row.error_message || "").trim()) || Boolean(String(row.error_code || "").trim())
    if (tem) comMotivo++
    else semMotivo++
  }
  return { comMotivo, semMotivo }
}
