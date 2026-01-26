import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/admin/recursos
 * Lista todos os recursos disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('recursos_disponiveis')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('categoria', { ascending: true })
      .order('nome', { ascending: true })

    if (error) {
      throw new Error(`Erro ao listar recursos: ${error.message}`)
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Erro ao listar recursos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar recursos' },
      { status: 500 }
    )
  }
}


