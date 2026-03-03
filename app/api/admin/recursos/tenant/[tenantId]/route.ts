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
 * GET /api/admin/recursos/tenant/[tenantId]
 * Lista recursos de um tenant específico com status de habilitação
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params
    await garantirRecursoDashboardClienteCpf()

    // Buscar todos os recursos disponíveis
    const { data: recursos, error: recursosError } = await supabaseAdmin
      .from('recursos_disponiveis')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('categoria', { ascending: true })

    if (recursosError) {
      throw new Error(`Erro ao buscar recursos: ${recursosError.message}`)
    }

    // Buscar recursos habilitados para este tenant
    const { data: tenantRecursos, error: tenantError } = await supabaseAdmin
      .from('tenant_recursos')
      .select('*, recurso:recursos_disponiveis(*)')
      .eq('tenant_id', tenantId)

    if (tenantError) {
      throw new Error(`Erro ao buscar recursos do tenant: ${tenantError.message}`)
    }

    // Criar mapa de recursos habilitados
    const recursosHabilitadosMap = new Map<string, any>()
    tenantRecursos?.forEach((tr: any) => {
      if (tr.recurso) {
        recursosHabilitadosMap.set(tr.recurso.id, tr)
      }
    })

    // Combinar recursos com status de habilitação
    const recursosComStatus = (recursos || []).map((recurso: any) => {
      const tenantRecurso = recursosHabilitadosMap.get(recurso.id)
      return {
        ...recurso,
        habilitado: tenantRecurso?.habilitado ?? false,
        tenant_recurso_id: tenantRecurso?.id,
      }
    })

    return NextResponse.json({ data: recursosComStatus })
  } catch (error: any) {
    console.error('Erro ao listar recursos do tenant:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar recursos do tenant' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/recursos/tenant/[tenantId]
 * Atualiza recursos habilitados para um tenant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params
    const body = await request.json()
    const { recursos } = body

    if (!Array.isArray(recursos)) {
      return NextResponse.json(
        { error: 'Recursos deve ser um array' },
        { status: 400 }
      )
    }

    // Deletar recursos existentes do tenant
    await supabaseAdmin
      .from('tenant_recursos')
      .delete()
      .eq('tenant_id', tenantId)

    // Inserir novos recursos habilitados
    const recursosParaInserir = recursos
      .filter((r: any) => r.habilitado)
      .map((r: any) => ({
        tenant_id: tenantId,
        recurso_id: r.recurso_id,
        habilitado: true,
      }))

    if (recursosParaInserir.length > 0) {
      const { error } = await supabaseAdmin
        .from('tenant_recursos')
        .insert(recursosParaInserir)

      if (error) {
        throw new Error(`Erro ao atualizar recursos: ${error.message}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar recursos do tenant:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar recursos' },
      { status: 500 }
    )
  }
}


