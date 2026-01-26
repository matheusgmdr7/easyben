import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * API Route para obter estatísticas de uma plataforma
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar contagens de cada tabela com tratamento de erro individual
    const buscarContagem = async (tabela: string, tenantId: string) => {
      try {
        const { count, error } = await supabaseAdmin
          .from(tabela)
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
        
        if (error) {
          console.warn(`⚠️ Erro ao buscar contagem de ${tabela}:`, error.message)
          return 0
        }
        
        return count || 0
      } catch (error: any) {
        console.warn(`⚠️ Erro ao buscar contagem de ${tabela}:`, error.message)
        return 0
      }
    }

    const [totalPropostas, totalCorretores, totalClientes, totalFaturas] = await Promise.all([
      buscarContagem('propostas', tenantId),
      buscarContagem('corretores', tenantId),
      buscarContagem('clientes_administradoras', tenantId),
      buscarContagem('faturas', tenantId),
    ])

    return NextResponse.json({
      data: {
        totalPropostas,
        totalCorretores,
        totalClientes,
        totalFaturas,
      },
    })
  } catch (error: any) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}

