import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function garantirRecursoDashboardClienteCpf() {
  await supabaseAdmin
    .from('recursos_disponiveis')
    .upsert(
      {
        codigo: 'portal_cliente_cpf',
        nome: 'Dashboard do Cliente (CPF)',
        descricao: 'Página whitelabel para consulta de cliente e boletos por CPF',
        categoria: 'portal',
        rota_base: '/[tenant-slug]/cliente',
        icone: 'UserRound',
        ativo: true,
        ordem: 31,
      },
      { onConflict: 'codigo' }
    )
}

/**
 * GET /api/admin/recursos/verificar-acesso
 * Verifica se um tenant tem acesso a um recurso específico
 */
export async function GET(request: NextRequest) {
  try {
    await garantirRecursoDashboardClienteCpf()

    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    const codigo = searchParams.get('codigo')

    if (!tenantId || !codigo) {
      return NextResponse.json(
        { error: 'tenantId e codigo são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar recurso pelo código
    const { data: recurso, error: recursoError } = await supabaseAdmin
      .from('recursos_disponiveis')
      .select('id')
      .eq('codigo', codigo)
      .eq('ativo', true)
      .single()

    if (recursoError || !recurso) {
      return NextResponse.json({ habilitado: false })
    }

    // Verificar se está habilitado para o tenant
    const { data: tenantRecurso, error: tenantError } = await supabaseAdmin
      .from('tenant_recursos')
      .select('habilitado')
      .eq('tenant_id', tenantId)
      .eq('recurso_id', recurso.id)
      .single()

    if (tenantError || !tenantRecurso) {
      return NextResponse.json({ habilitado: false })
    }

    return NextResponse.json({ habilitado: tenantRecurso.habilitado === true })
  } catch (error: any) {
    console.error('Erro ao verificar acesso:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar acesso' },
      { status: 500 }
    )
  }
}


