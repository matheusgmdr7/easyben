/** Tempo em que o envio permanece visível na página de Cobranças após clicar em Enviar fatura. */
export const COBRANCA_ENVIADA_TTL_MS = 5 * 60 * 1000

export type RegistroEnvioCobranca = {
  fatura_id: string
  cliente_nome: string
  enviado_em: number
}

function chaveStorage(administradoraId: string) {
  return `easyben:cobrancas-enviadas:${administradoraId}`
}

export function carregarEnviosRecentes(administradoraId: string): RegistroEnvioCobranca[] {
  if (typeof window === "undefined" || !administradoraId.trim()) return []
  try {
    const raw = sessionStorage.getItem(chaveStorage(administradoraId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as RegistroEnvioCobranca[]
    if (!Array.isArray(parsed)) return []
    return filtrarEnviosAtivos(parsed)
  } catch {
    return []
  }
}

export function salvarEnviosRecentes(administradoraId: string, registros: RegistroEnvioCobranca[]) {
  if (typeof window === "undefined" || !administradoraId.trim()) return
  const ativos = filtrarEnviosAtivos(registros)
  try {
    if (ativos.length === 0) {
      sessionStorage.removeItem(chaveStorage(administradoraId))
      return
    }
    sessionStorage.setItem(chaveStorage(administradoraId), JSON.stringify(ativos))
  } catch {
    /* quota / modo privado */
  }
}

export function filtrarEnviosAtivos(registros: RegistroEnvioCobranca[], agora = Date.now()): RegistroEnvioCobranca[] {
  const limite = agora - COBRANCA_ENVIADA_TTL_MS
  return registros
    .filter((r) => r.fatura_id && r.enviado_em > limite)
    .sort((a, b) => b.enviado_em - a.enviado_em)
}

export function registrarEnvioCobranca(
  administradoraId: string,
  item: { fatura_id: string; cliente_nome: string },
  registrosAtuais: RegistroEnvioCobranca[]
): RegistroEnvioCobranca[] {
  const agora = Date.now()
  const semDuplicata = registrosAtuais.filter((r) => r.fatura_id !== item.fatura_id)
  const proximo: RegistroEnvioCobranca[] = [
    {
      fatura_id: item.fatura_id,
      cliente_nome: item.cliente_nome,
      enviado_em: agora,
    },
    ...semDuplicata,
  ]
  const ativos = filtrarEnviosAtivos(proximo, agora)
  salvarEnviosRecentes(administradoraId, ativos)
  return ativos
}

export function minutosDesdeEnvio(enviadoEm: number, agora = Date.now()): number {
  return Math.max(0, Math.floor((agora - enviadoEm) / 60_000))
}

export function minutosRestantesVisibilidade(enviadoEm: number, agora = Date.now()): number {
  const restante = COBRANCA_ENVIADA_TTL_MS - (agora - enviadoEm)
  return Math.max(0, Math.ceil(restante / 60_000))
}

export function rotuloEnvioRecente(enviadoEm: number, agora = Date.now()): string {
  const min = minutosDesdeEnvio(enviadoEm, agora)
  if (min <= 0) return "Enviada agora"
  if (min === 1) return "Enviada há 1 min"
  return `Enviada há ${min} min`
}
