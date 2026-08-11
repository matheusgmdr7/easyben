import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"
import { buscarFaturasPorClienteIdsChunks, limiteMesVencimento } from "@/lib/boletos-grupo-faturas"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"

/** Histórico de vencimentos carregado quando não há filtro de mês (competência na UI). */
const MESES_HISTORICO_PADRAO = 36

/**
 * Ordenação da lista: mais recente primeiro.
 * Com `created_at` (quando existir); faturas legadas sem `created_at` usam `vencimento`, como antes.
 */
function timestampOrdenacaoFatura(f: { created_at?: string | null; vencimento?: string | null }): number {
  if (f.created_at) {
    const t = new Date(f.created_at).getTime()
    if (!Number.isNaN(t)) return t
  }
  const v = String(f.vencimento ?? "").slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T12:00:00`).getTime()
  }
  return 0
}

/**
 * GET /api/administradora/fatura/boletos-grupo?grupo_id=xxx&administradora_id=xxx&mes_vencimento=YYYY-MM
 * Retorna faturas/boletos dos clientes do grupo. Sem mes_vencimento, carrega últimos 36 meses (competência na UI).
 */
export async function GET(request: NextRequest) {
  try {
    const grupoId = request.nextUrl.searchParams.get("grupo_id")
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const mesVencimento = request.nextUrl.searchParams.get("mes_vencimento")?.trim() || ""

    if (!grupoId || !administradoraId) {
      return NextResponse.json(
        { error: "grupo_id e administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await resolveTenantIdForAdministradora(administradoraId)

    let { data: grupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id")
      .eq("id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!grupo) {
      const fallbackGrupo = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id")
        .eq("id", grupoId)
        .eq("administradora_id", administradoraId)
        .maybeSingle()
      grupo = fallbackGrupo.data
    }

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    const { ids: clienteIds, nomePorId } = await listarClienteAdministradoraIdsENomesDoGrupo(
      grupoId,
      administradoraId,
      tenantId
    )

    if (clienteIds.length === 0) {
      return NextResponse.json([])
    }

    const selectCols =
      "id, cliente_administradora_id, numero_fatura, valor, status, vencimento, pagamento_data, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id, created_at"

    const buscaOpts: Parameters<typeof buscarFaturasPorClienteIdsChunks>[4] = {}
    if (/^\d{4}-\d{2}$/.test(mesVencimento)) {
      const limites = limiteMesVencimento(mesVencimento)
      if (limites) {
        buscaOpts.vencimentoGte = limites.inicio
        buscaOpts.vencimentoLt = limites.fimExclusivo
      }
    } else {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - MESES_HISTORICO_PADRAO)
      buscaOpts.vencimentoGte = cutoff.toISOString().slice(0, 10)
    }

    let faturasRaw: Array<Record<string, unknown>> = []
    try {
      faturasRaw = await buscarFaturasPorClienteIdsChunks(
        supabaseAdmin,
        clienteIds,
        administradoraId,
        selectCols,
        buscaOpts
      )
    } catch (e) {
      console.error("Erro ao buscar faturas do grupo (chunks):", e)
      return NextResponse.json({ error: "Erro ao buscar boletos" }, { status: 500 })
    }

    const faturas = faturasRaw.sort(
      (a, b) =>
        timestampOrdenacaoFatura(b as { created_at?: string | null; vencimento?: string | null }) -
        timestampOrdenacaoFatura(a as { created_at?: string | null; vencimento?: string | null })
    )

    const lista = faturas.map((f: Record<string, unknown>) => {
      const ca = String(f.cliente_administradora_id || "")
      const link = getBoletoLinkFromFatura({
        asaas_boleto_url: f.asaas_boleto_url as string | null | undefined,
        boleto_url: f.boleto_url as string | null | undefined,
        gateway_id: f.gateway_id as string | null | undefined,
        asaas_charge_id: f.asaas_charge_id as string | null | undefined,
      })
      return {
        id: f.id,
        cliente_administradora_id: f.cliente_administradora_id,
        cliente_nome: nomePorId[ca] || "Cliente",
        numero_fatura: f.numero_fatura,
        valor_total: Number(f.valor ?? 0),
        status: f.status,
        data_vencimento: f.vencimento,
        data_pagamento: f.pagamento_data,
        data_geracao: f.created_at ?? null,
        boleto_url: link,
        invoice_url: link,
      }
    })

    return NextResponse.json(lista)
  } catch (e: unknown) {
    console.error("Erro boletos-grupo:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar boletos" },
      { status: 500 }
    )
  }
}
