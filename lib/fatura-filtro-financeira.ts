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
export type FiltroFinanceiraOpcoes = {
  /**
   * Quando false, faturas sem `gateway_nome` (ou só "Asaas") não entram no filtro por financeira.
   * Útil no dashboard com várias financeiras; relatórios legados mantêm o padrão true.
   */
  tratarGatewayVazioComoMatch?: boolean
}

export function faturaCombinaFiltroFinanceira(
  gatewayNome: string | null | undefined,
  nomeFinanceiraFiltro: string,
  opcoes?: FiltroFinanceiraOpcoes
): boolean {
  const termo = String(nomeFinanceiraFiltro || "").trim().toLowerCase()
  if (!termo) return true

  const raw = String(gatewayNome ?? "").trim()
  const g = raw.toLowerCase()

  const vazioConta = opcoes?.tratarGatewayVazioComoMatch !== false
  if (!g || g === "asaas") return vazioConta

  if (g.includes(termo)) return true

  const esperado = gatewayAsaasComoNoBanco(termo).toLowerCase()
  if (g === esperado) return true
  if (g.startsWith(esperado) || esperado.startsWith(g)) return true

  const semPrefixo = g.replace(/^asaas\s*-\s*/i, "").trim()
  if (semPrefixo.includes(termo)) return true

  return false
}

/**
 * Filtro por financeira no dashboard/relatórios: prioriza `financeira_id` na fatura;
 * se ausente, usa o mesmo match por `gateway_nome` que `faturaCombinaFiltroFinanceira`.
 */
export function faturaPertenceAFinanceira(
  financeiraIdNaFatura: string | null | undefined,
  gatewayNome: string | null | undefined,
  financeiraIdFiltro: string,
  nomeFinanceiraFiltro: string,
  opcoes?: FiltroFinanceiraOpcoes
): boolean {
  const idFiltro = String(financeiraIdFiltro || "").trim().toLowerCase()
  const idFat = String(financeiraIdNaFatura || "").trim().toLowerCase()
  if (!idFiltro) {
    return faturaCombinaFiltroFinanceira(gatewayNome, nomeFinanceiraFiltro, opcoes)
  }
  if (idFat && idFat === idFiltro) return true
  if (idFat && idFat !== idFiltro) return false
  return faturaCombinaFiltroFinanceira(gatewayNome, nomeFinanceiraFiltro, opcoes)
}
