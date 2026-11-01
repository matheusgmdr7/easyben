import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"
import { WHATSAPP_BILLING_EVENT_LABELS } from "./event-types"
import { referenceDateHoje } from "./idempotency"
import { enviarWhatsAppTextoTwilio, extrairCodigoErroTwilio } from "./twilio-client"
import { telefoneParaTwilioWhatsApp } from "./content-variables"

const JANELA_RESPOSTA_MS = 24 * 60 * 60 * 1000
const EVENTO_RESPOSTA = "resposta_operador"

const ROTULO_VARIAVEL: Record<string, string> = {
  cliente_nome: "Nome",
  administradora_nome: "Administradora",
  financeira_nome: "Financeira",
  plano_descricao: "Plano",
  valor_fatura: "Valor",
  data_vencimento: "Vencimento",
  data_pagamento: "Pagamento",
  link_boleto: "Boleto",
  numero_fatura: "Fatura",
  url_portal_cliente: "Portal",
  telefone_suporte: "Suporte",
}

export type ConversaResumo = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  telefone_mascara: string
  ultima_em: string
  ultima_preview: string
  ultima_origem: "cliente" | "nos"
  pode_responder: boolean
}

export type ItemHistorico = {
  id: string
  origem: "cliente" | "nos"
  em: string
  texto: string
  rotulo: string
  status: string | null
}

function mascararTelefone(telefone: string | null | undefined): string {
  return String(telefone || "").replace(/\d(?=\d{4})/g, "*")
}

function sufixoTelefone(telefone: string | null | undefined): string {
  return String(telefone || "").replace(/\D/g, "").slice(-11)
}

function rotuloEvento(eventType: string): string {
  if (eventType === EVENTO_RESPOSTA) return "Resposta"
  if (eventType in WHATSAPP_BILLING_EVENT_LABELS) {
    return WHATSAPP_BILLING_EVENT_LABELS[eventType as keyof typeof WHATSAPP_BILLING_EVENT_LABELS]
  }
  return "Mensagem enviada"
}

function textoEnvio(
  eventType: string,
  variaveis: Record<string, string>,
  mapas: Map<string, Record<string, string>>
): string {
  if (eventType === EVENTO_RESPOSTA) return String(variaveis.texto || "").trim()
  const mapa = mapas.get(eventType) || {}
  const linhas = Object.entries(mapa)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([chaveTwilio, chaveInterna]) => {
      const valor = String(variaveis[chaveTwilio] || "").trim()
      if (!valor) return null
      const rotulo = ROTULO_VARIAVEL[chaveInterna] || chaveInterna
      return `${rotulo}: ${valor}`
    })
    .filter(Boolean)
  return linhas.join("\n")
}

async function mapasTemplates(): Promise<Map<string, Record<string, string>>> {
  const { data } = await supabaseAdmin.from("billing_templates").select("event_type, variaveis_map")
  const mapas = new Map<string, Record<string, string>>()
  for (const row of data || []) {
    mapas.set(String(row.event_type), (row.variaveis_map || {}) as Record<string, string>)
  }
  return mapas
}

async function nomesClientes(administradoraId: string, ids: string[]): Promise<Record<string, string>> {
  const nomes: Record<string, string> = {}
  if (!ids.length) return nomes

  const { data: vista } = await supabaseAdmin
    .from("vw_clientes_administradoras_completo")
    .select("id, cliente_nome")
    .eq("administradora_id", administradoraId)
    .in("id", ids)
  for (const row of vista || []) {
    if (row.id && row.cliente_nome) nomes[String(row.id)] = String(row.cliente_nome)
  }

  const faltantes = ids.filter((id) => !nomes[id])
  if (!faltantes.length) return nomes

  const { data: vinculos } = await supabaseAdmin
    .from("clientes_administradoras")
    .select("id, proposta_id")
    .in("id", faltantes)
  const propostaPorCliente = new Map<string, string>()
  for (const row of vinculos || []) {
    if (row.id && row.proposta_id) propostaPorCliente.set(String(row.id), String(row.proposta_id))
  }
  const propostaIds = Array.from(new Set(propostaPorCliente.values()))
  if (propostaIds.length) {
    const { data: propostas } = await supabaseAdmin.from("propostas").select("id, nome").in("id", propostaIds)
    const nomeProposta = new Map((propostas || []).map((p) => [String(p.id), String(p.nome || "").trim()]))
    for (const [clienteId, propostaId] of propostaPorCliente) {
      const nome = nomeProposta.get(propostaId)
      if (nome) nomes[clienteId] = nome
    }
  }

  const ainda = faltantes.filter((id) => !nomes[id])
  if (ainda.length) {
    const { data: faturas } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, cliente_nome")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", ainda)
      .order("created_at", { ascending: false })
      .limit(Math.min(500, ainda.length * 5))
    for (const row of faturas || []) {
      const id = String(row.cliente_administradora_id || "")
      const nome = String(row.cliente_nome || "").trim()
      if (id && nome && nome.toLowerCase() !== "cliente" && !nomes[id]) nomes[id] = nome
    }
  }

  const semNomeReal = ids.filter((id) => !nomes[id] || nomes[id].toLowerCase() === "cliente")
  if (semNomeReal.length) {
    const mapas = await mapasTemplates()
    const { data: envios } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("cliente_administradora_id, event_type, content_variables")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", semNomeReal)
      .order("created_at", { ascending: false })
      .limit(300)
    for (const row of envios || []) {
      const id = String(row.cliente_administradora_id || "")
      if (!id || (nomes[id] && nomes[id].toLowerCase() !== "cliente")) continue
      const texto = textoEnvio(
        String(row.event_type),
        (row.content_variables || {}) as Record<string, string>,
        mapas
      )
      const linha = texto.split("\n").find((l) => l.startsWith("Nome:"))
      const nome = linha?.replace(/^Nome:\s*/, "").trim()
      if (nome && nome.toLowerCase() !== "cliente") nomes[id] = nome
    }
  }

  return nomes
}

type InboundRow = {
  id: string
  telefone: string
  body: string | null
  cliente_administradora_id: string | null
  administradora_id: string | null
  created_at: string
}

async function garantirAdministradora(msg: InboundRow, administradoraId: string): Promise<boolean> {
  if (msg.administradora_id && msg.administradora_id !== administradoraId) return false
  if (!msg.administradora_id && msg.cliente_administradora_id) {
    const { data: cli } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("administradora_id")
      .eq("id", msg.cliente_administradora_id)
      .maybeSingle()
    return cli?.administradora_id === administradoraId
  }
  return Boolean(msg.administradora_id)
}

export async function listarConversasWhatsApp(params: {
  administradoraId: string
  page: number
  limit: number
}): Promise<{ conversas: ConversaResumo[]; page: number; has_next: boolean }> {
  const page = Math.max(1, params.page)
  const limit = Math.min(50, Math.max(1, params.limit))
  const preciso = page * limit + 1
  const vistos = new Map<string, InboundRow>()
  let offset = 0

  while (vistos.size < preciso && offset < 4000) {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_inbound_messages")
      .select("id, telefone, body, cliente_administradora_id, administradora_id, created_at")
      .eq("administradora_id", params.administradoraId)
      .order("created_at", { ascending: false })
      .range(offset, offset + 299)

    if (error) throw new Error(error.message)
    const chunk = (data || []) as InboundRow[]
    if (!chunk.length) break
    for (const row of chunk) {
      const cliente = String(row.cliente_administradora_id || "").trim()
      const chave = cliente ? `c:${cliente}` : `t:${sufixoTelefone(row.telefone)}`
      if (!vistos.has(chave)) vistos.set(chave, row)
      if (vistos.size >= preciso) break
    }
    if (chunk.length < 300) break
    offset += 300
  }

  const ordenadas = Array.from(vistos.values())
  const fatia = ordenadas.slice((page - 1) * limit, page * limit)
  const ids = fatia.map((r) => r.cliente_administradora_id).filter(Boolean) as string[]
  const nomes = await nomesClientes(params.administradoraId, ids)
  const mapas = await mapasTemplates()

  const ultimoEnvio = new Map<string, { em: string; texto: string }>()
  await Promise.all(
    ids.map(async (clienteId) => {
      const { data } = await supabaseAdmin
        .from("whatsapp_messages")
        .select("event_type, content_variables, created_at, status")
        .eq("administradora_id", params.administradoraId)
        .eq("cliente_administradora_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data?.created_at) return
      const texto = textoEnvio(
        String(data.event_type),
        (data.content_variables || {}) as Record<string, string>,
        mapas
      )
      ultimoEnvio.set(clienteId, {
        em: String(data.created_at),
        texto: texto || rotuloEvento(String(data.event_type)),
      })
    })
  )

  const agora = Date.now()
  const conversas: ConversaResumo[] = fatia.map((row) => {
    const clienteId = row.cliente_administradora_id ? String(row.cliente_administradora_id) : null
    const envio = clienteId ? ultimoEnvio.get(clienteId) : undefined
    const inboundEm = new Date(row.created_at).getTime()
    const envioEm = envio ? new Date(envio.em).getTime() : 0
    const nossa = envioEm > inboundEm
    const pode =
      Boolean(clienteId) && Number.isFinite(inboundEm) && agora - inboundEm < JANELA_RESPOSTA_MS
    const previewCliente = String(row.body || "").trim() || "(sem texto)"
    return {
      id: row.id,
      cliente_administradora_id: clienteId,
      cliente_nome: clienteId ? nomes[clienteId] || null : null,
      telefone_mascara: mascararTelefone(row.telefone),
      ultima_em: nossa && envio ? envio.em : row.created_at,
      ultima_preview: (nossa && envio ? envio.texto : previewCliente).slice(0, 140),
      ultima_origem: nossa ? "nos" : "cliente",
      pode_responder: pode,
    }
  })

  return { conversas, page, has_next: ordenadas.length > page * limit }
}

export type RespostaRecenteWhatsApp = {
  id: string
  conversa_id: string
  cliente_nome: string
  preview: string
  created_at: string
}

export async function listarRespostasRecentesWhatsApp(params: {
  administradoraId: string
  desde: string
}): Promise<RespostaRecenteWhatsApp[]> {
  const desde = new Date(params.desde)
  if (Number.isNaN(desde.getTime())) throw new Error("desde inválido")

  const { data, error } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .select("id, body, cliente_administradora_id, created_at")
    .eq("administradora_id", params.administradoraId)
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: true })
    .limit(20)

  if (error) throw new Error(error.message)
  const rows = data || []
  const ids = Array.from(
    new Set(rows.map((row) => String(row.cliente_administradora_id || "")).filter(Boolean))
  )
  const nomes = await nomesClientes(params.administradoraId, ids)

  return rows.map((row) => {
    const clienteId = row.cliente_administradora_id ? String(row.cliente_administradora_id) : ""
    const preview = String(row.body || "").replace(/\s+/g, " ").trim().slice(0, 140)
    return {
      id: String(row.id),
      conversa_id: String(row.id),
      cliente_nome: clienteId ? nomes[clienteId] || "Cliente" : "Número sem cliente vinculado",
      preview: preview || "(sem texto)",
      created_at: String(row.created_at),
    }
  })
}

export async function carregarHistoricoConversa(params: {
  administradoraId: string
  conversaId: string
}): Promise<{
  cliente_nome: string | null
  telefone_mascara: string
  pode_responder: boolean
  motivo_bloqueio: string | null
  itens: ItemHistorico[]
}> {
  const { data: ancora, error } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .select("id, telefone, body, cliente_administradora_id, administradora_id, created_at")
    .eq("id", params.conversaId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!ancora) throw new Error("Conversa não encontrada")
  const ok = await garantirAdministradora(ancora as InboundRow, params.administradoraId)
  if (!ok) throw new Error("Conversa não encontrada")

  const clienteId = ancora.cliente_administradora_id ? String(ancora.cliente_administradora_id) : null
  const sufixo = sufixoTelefone(ancora.telefone)
  const mapas = await mapasTemplates()

  let qIn = supabaseAdmin
    .from("whatsapp_inbound_messages")
    .select("id, body, created_at, telefone, cliente_administradora_id")
    .eq("administradora_id", params.administradoraId)
    .order("created_at", { ascending: false })
    .limit(80)

  if (clienteId && sufixo.length >= 10) {
    qIn = qIn.or(`cliente_administradora_id.eq.${clienteId},telefone.ilike.%${sufixo}`)
  } else if (clienteId) {
    qIn = qIn.eq("cliente_administradora_id", clienteId)
  } else if (sufixo.length >= 10) {
    qIn = qIn.ilike("telefone", `%${sufixo}`)
  } else {
    qIn = qIn.eq("id", params.conversaId)
  }

  const { data: recebidas, error: inErr } = await qIn
  if (inErr) throw new Error(inErr.message)

  let enviadas: Array<{
    id: string
    event_type: string
    content_variables: Record<string, string> | null
    created_at: string
    status: string
  }> = []
  if (clienteId) {
    const { data, error: outErr } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, event_type, content_variables, created_at, status")
      .eq("administradora_id", params.administradoraId)
      .eq("cliente_administradora_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(80)
    if (outErr) throw new Error(outErr.message)
    enviadas = (data || []) as typeof enviadas
  }

  const itens: ItemHistorico[] = []
  for (const row of recebidas || []) {
    itens.push({
      id: `in:${row.id}`,
      origem: "cliente",
      em: String(row.created_at),
      texto: String(row.body || "").trim() || "(sem texto)",
      rotulo: "Cliente",
      status: null,
    })
  }
  for (const row of enviadas) {
    const texto = textoEnvio(String(row.event_type), row.content_variables || {}, mapas)
    itens.push({
      id: `out:${row.id}`,
      origem: "nos",
      em: String(row.created_at),
      texto: texto || rotuloEvento(String(row.event_type)),
      rotulo: rotuloEvento(String(row.event_type)),
      status: String(row.status || ""),
    })
  }
  itens.sort((a, b) => new Date(a.em).getTime() - new Date(b.em).getTime())

  const ultimaDoCliente = (recebidas || []).reduce<string | null>((acc, row) => {
    if (!acc || String(row.created_at) > acc) return String(row.created_at)
    return acc
  }, null)
  const idade = ultimaDoCliente ? Date.now() - new Date(ultimaDoCliente).getTime() : Infinity
  const dentroDaJanela = idade < JANELA_RESPOSTA_MS
  let motivo: string | null = null
  if (!clienteId) {
    motivo = "Este número não está vinculado a um cliente, então a resposta não pode ser registrada."
  } else if (!dentroDaJanela) {
    motivo =
      "O WhatsApp só permite resposta livre nas 24 horas depois da mensagem do cliente. Essa janela já fechou."
  }

  let clienteNome: string | null = null
  if (clienteId) {
    const nomes = await nomesClientes(params.administradoraId, [clienteId])
    clienteNome = nomes[clienteId] || null
  }

  return {
    cliente_nome: clienteNome,
    telefone_mascara: mascararTelefone(ancora.telefone),
    pode_responder: Boolean(clienteId) && dentroDaJanela,
    motivo_bloqueio: motivo,
    itens,
  }
}

export async function responderConversaWhatsApp(params: {
  administradoraId: string
  conversaId: string
  texto: string
}): Promise<{ ok: true }> {
  const texto = params.texto.trim()
  if (!texto) throw new Error("Escreva a resposta.")
  if (texto.length > 1000) throw new Error("A resposta pode ter no máximo 1000 caracteres.")

  const historico = await carregarHistoricoConversa({
    administradoraId: params.administradoraId,
    conversaId: params.conversaId,
  })
  if (!historico.pode_responder) {
    throw new Error(historico.motivo_bloqueio || "Não é possível responder esta conversa agora.")
  }

  const { data: ancora, error } = await supabaseAdmin
    .from("whatsapp_inbound_messages")
    .select("telefone, cliente_administradora_id")
    .eq("id", params.conversaId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const clienteId = String(ancora?.cliente_administradora_id || "").trim()
  const destino = telefoneParaTwilioWhatsApp(ancora?.telefone)
  const telefone = normalizarTelefoneWhatsApp(ancora?.telefone)
  if (!clienteId || !destino || !telefone) {
    throw new Error("Não foi possível identificar o telefone do cliente.")
  }

  let messageSid: string | null = null
  let status = "sent"
  let erroEnvio: string | null = null
  try {
    const enviado = await enviarWhatsAppTextoTwilio({ to: destino, body: texto })
    messageSid = enviado.messageSid
    status = enviado.status === "queued" ? "queued" : "sent"
  } catch (err: unknown) {
    const codigo = extrairCodigoErroTwilio(err)
    erroEnvio =
      codigo === "63016"
        ? "O WhatsApp só aceita resposta livre até 24 horas depois da mensagem do cliente."
        : err instanceof Error
          ? err.message
          : "Falha ao enviar a resposta"
    status = "failed"
  }

  const agora = new Date().toISOString()
  const { error: insErr } = await supabaseAdmin.from("whatsapp_messages").insert({
    administradora_id: params.administradoraId,
    cliente_administradora_id: clienteId,
    event_type: EVENTO_RESPOSTA,
    reference_date: referenceDateHoje(),
    idempotency_key: `${EVENTO_RESPOSTA}:${clienteId}:${Date.now()}`,
    telefone,
    content_sid: "sessao",
    content_variables: { texto },
    message_sid: messageSid,
    status,
    error_message: erroEnvio,
    sent_at: status === "failed" ? null : agora,
    failed_at: status === "failed" ? agora : null,
  })
  if (insErr) throw new Error(insErr.message)
  if (erroEnvio) throw new Error(erroEnvio)
  return { ok: true }
}
