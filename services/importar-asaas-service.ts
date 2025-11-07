/**
 * Serviço para IMPORTAR clientes e faturas existentes do Asaas
 * 
 * USO:
 * 1. Busca todos os customers do Asaas
 * 2. Faz match com clientes do banco (por CPF)
 * 3. Salva asaas_customer_id
 * 4. Importa faturas/cobranças existentes
 */

import AsaasService from './asaas-service'
import { supabase } from '@/lib/supabase'

interface ResultadoImportacao {
  clientes_importados: number
  clientes_nao_encontrados: number
  faturas_importadas: number
  erros: string[]
}

export class ImportarAsaasService {
  /**
   * Importa clientes do Asaas e faz match com banco
   */
  static async importarClientes(
    administradoraId: string,
    apiKey: string
  ): Promise<ResultadoImportacao> {
    const resultado: ResultadoImportacao = {
      clientes_importados: 0,
      clientes_nao_encontrados: 0,
      faturas_importadas: 0,
      erros: []
    }

    try {
      // Configurar API Key
      AsaasService.setApiKey(apiKey)

      // 1. Buscar TODOS os clientes da administradora no nosso banco
      const { data: clientesBanco, error: errorBanco } = await supabase
        .from('clientes_administradoras')
        .select(`
          id,
          asaas_customer_id,
          proposta:propostas(
            id,
            nome,
            cpf,
            email,
            telefone
          )
        `)
        .eq('administradora_id', administradoraId)

      if (errorBanco) {
        throw new Error(`Erro ao buscar clientes: ${errorBanco.message}`)
      }

      console.log(`📊 Total de clientes no banco: ${clientesBanco?.length || 0}`)

      // 2. Buscar TODOS os customers do Asaas (paginado)
      let offset = 0
      const limit = 100
      let hasMore = true
      const customersAsaas: any[] = []

      while (hasMore) {
        try {
          const customers = await AsaasService.listCustomers(offset, limit)
          customersAsaas.push(...customers.data)
          
          console.log(`📥 Buscados ${customers.data.length} customers do Asaas (offset: ${offset})`)
          
          hasMore = customers.hasMore
          offset += limit
        } catch (error) {
          console.error('Erro ao buscar customers do Asaas:', error)
          hasMore = false
        }
      }

      console.log(`📊 Total de customers no Asaas: ${customersAsaas.length}`)

      // 3. Fazer match por CPF
      for (const clienteBanco of clientesBanco || []) {
        try {
          const proposta = Array.isArray(clienteBanco.proposta) 
            ? clienteBanco.proposta[0] 
            : clienteBanco.proposta

          if (!proposta || !proposta.cpf) {
            resultado.erros.push(`Cliente ${clienteBanco.id} sem CPF`)
            continue
          }

          // Já tem customer_id? Pular
          if (clienteBanco.asaas_customer_id) {
            continue
          }

          // Limpar CPF para comparação
          const cpfLimpo = proposta.cpf.replace(/\D/g, '')

          // Buscar no Asaas pelo CPF
          const customerAsaas = customersAsaas.find(c => 
            c.cpfCnpj?.replace(/\D/g, '') === cpfLimpo
          )

          if (customerAsaas) {
            // Match encontrado! Salvar customer_id
            const { error: updateError } = await supabase
              .from('clientes_administradoras')
              .update({ 
                asaas_customer_id: customerAsaas.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', clienteBanco.id)

            if (updateError) {
              resultado.erros.push(
                `Erro ao atualizar cliente ${proposta.nome}: ${updateError.message}`
              )
            } else {
              resultado.clientes_importados++
              console.log(`✅ Cliente ${proposta.nome} vinculado: ${customerAsaas.id}`)

              // Importar faturas deste cliente
              await this.importarFaturasCliente(
                clienteBanco.id,
                administradoraId,
                customerAsaas.id,
                apiKey,
                resultado
              )
            }
          } else {
            resultado.clientes_nao_encontrados++
            console.log(`⚠️  Cliente ${proposta.nome} (${cpfLimpo}) não encontrado no Asaas`)
          }
        } catch (error: any) {
          resultado.erros.push(`Erro ao processar cliente: ${error.message}`)
        }
      }

      return resultado
    } catch (error: any) {
      console.error('Erro na importação:', error)
      resultado.erros.push(`Erro geral: ${error.message}`)
      return resultado
    }
  }

  /**
   * Importa faturas/cobranças de um cliente específico
   */
  private static async importarFaturasCliente(
    clienteId: string,
    administradoraId: string,
    asaasCustomerId: string,
    apiKey: string,
    resultado: ResultadoImportacao
  ) {
    try {
      AsaasService.setApiKey(apiKey)

      // Buscar cobranças do cliente no Asaas
      const charges = await AsaasService.listCharges({
        customer: asaasCustomerId,
        status: undefined // Buscar todas
      })

      // Buscar dados do cliente para a fatura
      const { data: cliente } = await supabase
        .from('clientes_administradoras')
        .select(`
          proposta:propostas(nome, email, telefone, cpf)
        `)
        .eq('id', clienteId)
        .single()

      const proposta = Array.isArray(cliente?.proposta) 
        ? cliente.proposta[0] 
        : cliente?.proposta

      // Para cada cobrança, verificar se já existe
      for (const charge of charges.data || []) {
        try {
          // Verificar se já existe
          const { data: faturaExistente } = await supabase
            .from('faturas')
            .select('id')
            .eq('asaas_charge_id', charge.id)
            .single()

          if (faturaExistente) {
            console.log(`⏭️  Fatura ${charge.id} já existe`)
            continue
          }

          // Mapear status do Asaas para nosso sistema
          const statusMap: Record<string, string> = {
            'PENDING': 'pendente',
            'RECEIVED': 'paga',
            'CONFIRMED': 'paga',
            'OVERDUE': 'atrasada',
            'REFUNDED': 'cancelada',
            'RECEIVED_IN_CASH': 'paga',
            'REFUND_REQUESTED': 'cancelada',
            'CHARGEBACK_REQUESTED': 'cancelada',
            'CHARGEBACK_DISPUTE': 'cancelada',
            'AWAITING_CHARGEBACK_REVERSAL': 'cancelada',
            'DUNNING_REQUESTED': 'atrasada',
            'DUNNING_RECEIVED': 'paga',
            'AWAITING_RISK_ANALYSIS': 'pendente'
          }

          // Inserir fatura no banco
          const { error: insertError } = await supabase
            .from('faturas')
            .insert({
              cliente_administradora_id: clienteId,
              administradora_id: administradoraId,
              cliente_id: proposta?.cpf || '',
              cliente_nome: proposta?.nome || '',
              cliente_email: proposta?.email || '',
              cliente_telefone: proposta?.telefone || '',
              valor: charge.value,
              vencimento: charge.dueDate,
              status: statusMap[charge.status] || 'pendente',
              asaas_charge_id: charge.id,
              asaas_boleto_url: charge.bankSlipUrl || null,
              asaas_invoice_url: charge.invoiceUrl || null,
              boleto_codigo: charge.nossoNumero || null,
              boleto_linha_digitavel: charge.identificationField || null,
              pagamento_data: charge.paymentDate || null,
              pagamento_valor: charge.value || null,
              created_at: charge.dateCreated,
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`❌ Erro ao inserir fatura ${charge.id}:`, insertError)
            resultado.erros.push(`Fatura ${charge.id}: ${insertError.message}`)
          } else {
            resultado.faturas_importadas++
            console.log(`✅ Fatura importada: ${charge.id} - ${statusMap[charge.status]}`)
          }
        } catch (error: any) {
          resultado.erros.push(`Erro ao importar fatura ${charge.id}: ${error.message}`)
        }
      }
    } catch (error: any) {
      console.error('Erro ao importar faturas do cliente:', error)
      resultado.erros.push(`Erro ao buscar faturas: ${error.message}`)
    }
  }

  /**
   * Gera relatório da importação
   */
  static gerarRelatorio(resultado: ResultadoImportacao): string {
    return `
📊 RELATÓRIO DE IMPORTAÇÃO

✅ Clientes Importados: ${resultado.clientes_importados}
⚠️  Clientes Não Encontrados: ${resultado.clientes_nao_encontrados}
📄 Faturas Importadas: ${resultado.faturas_importadas}
❌ Erros: ${resultado.erros.length}

${resultado.erros.length > 0 ? '\n🔴 DETALHES DOS ERROS:\n' + resultado.erros.slice(0, 10).join('\n') : ''}
${resultado.erros.length > 10 ? `\n... e mais ${resultado.erros.length - 10} erros` : ''}
    `.trim()
  }
}

export default ImportarAsaasService
