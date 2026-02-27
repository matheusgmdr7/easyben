/**
 * Regra única para obter o link do boleto a partir de uma linha da tabela faturas.
 * Prioridade: asaas_boleto_url (onde o Asaas grava) → boleto_url → URL montada com gateway_id/asaas_charge_id.
 * Use em todas as APIs que leem faturas e expõem o link (boletos-grupo, faturas-cliente, boleto-link).
 */
export function getBoletoLinkFromFatura(f: {
  asaas_boleto_url?: string | null
  boleto_url?: string | null
  gateway_id?: string | null
  asaas_charge_id?: string | null
}): string | null {
  const url = f.asaas_boleto_url || f.boleto_url
  if (url && typeof url === "string" && url.trim() !== "") return url.trim()
  const chargeId = f.gateway_id || f.asaas_charge_id
  if (chargeId && typeof chargeId === "string") {
    const slug = String(chargeId).replace(/^pay_/, "").trim()
    if (slug) return `https://www.asaas.com/b/pdf/${slug}`
  }
  return null
}
