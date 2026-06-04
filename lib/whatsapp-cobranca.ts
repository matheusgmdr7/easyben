import { formatarData, formatarMoeda } from "@/utils/formatters"

export type DadosMensagemCobranca = {
  clienteNome: string
  vencimento?: string | null
  valor?: number | null
  numeroFatura?: string | null
  linkBoleto: string
  administradoraNome?: string | null
}

/** Dígitos com DDI 55 para links wa.me (Brasil). */
export function normalizarTelefoneWhatsApp(telefone: string | null | undefined): string | null {
  const digits = String(telefone || "").replace(/\D/g, "")
  if (digits.length < 10) return null
  if (digits.startsWith("55") && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length >= 12) return digits
  return null
}

export function montarMensagemCobrancaFatura(dados: DadosMensagemCobranca): string {
  const nome = String(dados.clienteNome || "Cliente").trim() || "Cliente"
  const venc =
    dados.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(String(dados.vencimento).slice(0, 10))
      ? formatarData(String(dados.vencimento).slice(0, 10))
      : null
  const valor =
    dados.valor != null && Number.isFinite(Number(dados.valor))
      ? formatarMoeda(Number(dados.valor))
      : null
  const numero = String(dados.numeroFatura || "").trim()
  const adm = String(dados.administradoraNome || "").trim()

  const linhas = [
    `Olá, ${nome}!`,
    "",
    "Identificamos uma fatura em aberto em nosso sistema.",
    venc ? `Vencimento: ${venc}` : null,
    valor ? `Valor: ${valor}` : null,
    numero ? `Nº da fatura: ${numero}` : null,
    "",
    "Acesse o boleto para pagamento:",
    dados.linkBoleto,
    "",
    "Em caso de dúvidas, responda esta mensagem.",
    adm ? `\n${adm}` : null,
  ].filter((l): l is string => l != null && l !== "")

  return linhas.join("\n")
}

export function montarUrlWhatsAppCobranca(
  telefoneCliente: string | null | undefined,
  mensagem: string
): string | null {
  const tel = normalizarTelefoneWhatsApp(telefoneCliente)
  if (!tel) return null
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`
}
