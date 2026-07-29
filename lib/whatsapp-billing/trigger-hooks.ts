import { dispararConfirmacaoPagamento, dispararPrimeiroBoletoGerado, dispararSaudacaoBoasVindas } from "./dispatch"

export function dispararSaudacaoBoasVindasSafe(params: {
  administradoraId: string
  clienteAdministradoraId: string
}): void {
  dispararSaudacaoBoasVindas(params).catch(() => {})
}

export function dispararPrimeiroBoletoGeradoSafe(params: {
  faturaId: string
  clienteAdministradoraId: string
  administradoraId: string
  clienteNome: string
  telefone: string
  valor: number
  vencimento: string
  linkBoleto?: string | null
  numeroFatura?: string | null
}): void {
  dispararPrimeiroBoletoGerado(params).catch(() => {})
}

export function dispararConfirmacaoPagamentoSafe(faturaId: string): void {
  dispararConfirmacaoPagamento(faturaId).catch(() => {})
}
