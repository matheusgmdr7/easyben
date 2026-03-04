import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Tenant } from '@/lib/tenant-utils'

function normalizarSlug(valor: string): string {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function mergeSlugAliases(configuracoesBase: any, slugAntigo: string, slugNovo: string) {
  const base = configuracoesBase && typeof configuracoesBase === 'object' ? { ...configuracoesBase } : {}
  const aliasesAtuais = Array.isArray(base.slug_aliases) ? base.slug_aliases : []
  const setAliases = new Set(
    aliasesAtuais
      .map((s: any) => normalizarSlug(String(s || '')))
      .filter(Boolean)
  )
  const antigo = normalizarSlug(slugAntigo)
  const novo = normalizarSlug(slugNovo)
  if (antigo && antigo !== novo) setAliases.add(antigo)
  if (novo) setAliases.delete(novo)
  return {
    ...base,
    slug_aliases: Array.from(setAliases),
  }
}

/**
 * API Route para gerenciamento de tenants (Super Admin)
 * Todas as operações usam supabaseAdmin (service role) no servidor
 */

// GET - Listar todos os tenants
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')

    // Buscar tenant específico por ID
    if (action === 'get' && id) {
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ data: null }, { status: 404 })
        }
        throw error
      }

      return NextResponse.json({ data: data as Tenant })
    }

    // Buscar tenant por slug
    if (action === 'get-by-slug' && slug) {
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ data: null }, { status: 404 })
        }
        throw error
      }

      return NextResponse.json({ data: data as Tenant })
    }

    // Listar todos os tenants
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data: (data || []) as Tenant[] })
  } catch (error: any) {
    console.error('Erro na API de tenants:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

// POST - Criar novo tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar dados obrigatórios
    if (!body.slug || !body.nome) {
      return NextResponse.json(
        { error: 'Slug e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se slug já existe
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', body.slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um tenant com este slug' },
        { status: 400 }
      )
    }

    // Criar tenant
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .insert([{
        ...body,
        status: body.status || 'ativo',
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: data as Tenant }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar tenant:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar tenant' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar tenant
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID do tenant é obrigatório' },
        { status: 400 }
      )
    }

    const { id, ...dadosAtualizacao } = body

    const { data: tenantAtual, error: erroTenantAtual } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, configuracoes')
      .eq('id', id)
      .single()

    if (erroTenantAtual || !tenantAtual) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    // Se estiver atualizando o slug, verificar se não existe outro com o mesmo slug
    if (dadosAtualizacao.slug) {
      const slugNovo = normalizarSlug(dadosAtualizacao.slug)
      dadosAtualizacao.slug = slugNovo

      const { data: existing } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', slugNovo)
        .single()

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: 'Já existe outro tenant com este slug' },
          { status: 400 }
        )
      }

      if (slugNovo !== normalizarSlug(tenantAtual.slug)) {
        dadosAtualizacao.configuracoes = mergeSlugAliases(
          dadosAtualizacao.configuracoes ?? tenantAtual.configuracoes,
          tenantAtual.slug,
          slugNovo
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(dadosAtualizacao)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: data as Tenant })
  } catch (error: any) {
    console.error('Erro ao atualizar tenant:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar tenant' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar tenant (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    if (!id) {
      return NextResponse.json(
        { error: 'ID do tenant é obrigatório' },
        { status: 400 }
      )
    }

    if (action === 'activate') {
      // Ativar tenant
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ status: 'ativo' })
        .eq('id', id)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, message: 'Tenant ativado com sucesso' })
    } else {
      // Desativar tenant (soft delete)
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ status: 'inativo' })
        .eq('id', id)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, message: 'Tenant desativado com sucesso' })
    }
  } catch (error: any) {
    console.error('Erro ao deletar tenant:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar tenant' },
      { status: 500 }
    )
  }
}

