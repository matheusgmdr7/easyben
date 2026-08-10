import { formatarData, formatarMoeda, formatarTelefone } from "@/utils/formatters"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"
import type { ContentVariablesInput } from "./event-types"

export type DadosEnvioWhatsApp = {
  clienteNome: string
  administradoraNome: string
  /** Nome da financeira (conta de cobrança) — template saudação variável 2 */
  financeiraNome?: string | null
  /** Descrição do plano — template saudação variável 3 */
  planoDescricao?: string | null
  /** Cobertura do plano — template saudação variável 4 */
  coberturaPlano?: string | null
  telefoneSuporte?: string | null
  urlPortalCliente?: string | null
  valorFatura?: number | null
  dataVencimento?: string | null
  dataPagamento?: string | null
  linkBoleto?: string | null
  numeroFatura?: string | null
}

export function montarVariaveisInternas(dados: DadosEnvioWhatsApp): ContentVariablesInput {
  const venc =
    dados.dataVencimento && /^\d{4}-\d{2}-\d{2}/.test(dados.dataVencimento)
      ? formatarData(String(dados.dataVencimento).slice(0, 10))
      : dados.dataVencimento || undefined

  const pag =
    dados.dataPagamento && /^\d{4}-\d{2}-\d{2}/.test(dados.dataPagamento)
      ? formatarData(String(dados.dataPagamento).slice(0, 10))
      : dados.dataPagamento || undefined

  return {
    cliente_nome: String(dados.clienteNome || "Cliente").trim() || "Cliente",
    administradora_nome: String(dados.administradoraNome || "Administradora").trim() || "Administradora",
    financeira_nome: dados.financeiraNome?.trim() || undefined,
    plano_descricao: dados.planoDescricao?.trim() || undefined,
    cobertura: dados.coberturaPlano?.trim() || undefined,
    valor_fatura:
      dados.valorFatura != null && Number.isFinite(Number(dados.valorFatura))
        ? formatarMoeda(Number(dados.valorFatura))
        : undefined,
    data_vencimento: venc,
    data_pagamento: pag,
    link_boleto: dados.linkBoleto?.trim() || undefined,
    numero_fatura: dados.numeroFatura?.trim() || undefined,
    url_portal_cliente: dados.urlPortalCliente?.trim() || "https://easyben.com.br/benefit/cliente",
    telefone_suporte: (() => {
      const raw = dados.telefoneSuporte?.trim()
      if (!raw) return undefined
      return formatarTelefone(raw) || raw
    })(),
  }
}

/**
 * Converte variáveis internas → contentVariables Twilio ({"1":"João",...})
 * conforme variaveis_map do billing_templates.
 */
export function mapearParaContentVariablesTwilio(
  variaveisInternas: ContentVariablesInput,
  variaveisMap: Record<string, string>
): Record<string, string> {
  const invertido = new Map<string, string>()
  for (const [twilioKey, internalKey] of Object.entries(variaveisMap)) {
    invertido.set(internalKey, twilioKey)
  }

  const out: Record<string, string> = {}
  for (const [internalKey, valor] of Object.entries(variaveisInternas)) {
    if (valor == null || String(valor).trim() === "") continue
    const twilioKey = invertido.get(internalKey)
    if (twilioKey) out[twilioKey] = String(valor).trim()
  }
  return out
}

export function telefoneParaTwilioWhatsApp(telefone: string | null | undefined): string | null {
  const digits = normalizarTelefoneWhatsApp(telefone)
  if (!digits) return null
  return `whatsapp:+${digits}`
}
