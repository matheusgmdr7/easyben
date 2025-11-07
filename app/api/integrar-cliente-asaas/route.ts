import { NextRequest, NextResponse } from 'next/server'
import { IntegracaoAsaasService } from '@/services/integracao-asaas-service'

/**
 * API Route para integrar cliente com Asaas
 * Roda no servidor para evitar problemas de CORS
 */
export async function POST(request: NextRequest) {
  try {
    const dados = await request.json()
    
    console.log("📥 Dados recebidos na API route:", dados)

    // Validar dados obrigatórios
    if (!dados.proposta_id || !dados.administradora_id) {
      return NextResponse.json(
        { 
          sucesso: false,
          erros: ['proposta_id e administradora_id são obrigatórios'] 
        },
        { status: 400 }
      )
    }

    // Chamar serviço de integração
    const resultado = await IntegracaoAsaasService.integrarClienteCompleto(dados)
    
    console.log("📤 Resultado da integração:", resultado)

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error("❌ Erro na API route integrar-cliente-asaas:", error)
    return NextResponse.json(
      { 
        sucesso: false,
        erros: [error.message || 'Erro desconhecido'] 
      },
      { status: 500 }
    )
  }
}

