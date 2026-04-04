/** Mesmo limite do script SQL `gateway_nome VARCHAR(50)` ao gravar boleto administradora. */
export const GATEWAY_NOME_MAX_LEN = 50

/** Texto como gravado em `faturas.gateway_nome` em `gerar-boleto-administradora` (truncado). */
export function gatewayAsaasComoNoBanco(nomeFinanceira: string): string {
  return `Asaas - ${String(nomeFinanceira || "Financeira").trim()}`.slice(0, GATEWAY_NOME_MAX_LEN)
}

/**
 * Fatura combina com o filtro de financeira (nome), considerando:
 * - legado: `gateway_nome` vazio ou só "Asaas" (antes do multi-conta);
 * - atual: "Asaas - Nome" com possível truncamento em 50 caracteres;
 * - match por substring no nome completo ou no trecho após "Asaas -".
 */
export function faturaCombinaFiltroFinanceira(
  gatewayNome: string | null | undefined,
  nomeFinanceiraFiltro: string
): boolean {
  const termo = String(nomeFinanceiraFiltro || "").trim().toLowerCase()
  if (!termo) return true

  const raw = String(gatewayNome ?? "").trim()
  const g = raw.toLowerCase()

  if (!g || g === "asaas") return true

  if (g.includes(termo)) return true

  const esperado = gatewayAsaasComoNoBanco(termo).toLowerCase()
  if (g === esperado) return true
  if (g.startsWith(esperado) || esperado.startsWith(g)) return true

  const semPrefixo = g.replace(/^asaas\s*-\s*/i, "").trim()
  if (semPrefixo.includes(termo)) return true

  return false
}
