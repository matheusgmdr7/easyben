import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"

const MAX_FATURAS_GRUPO = 500
const FETCH_CAP = 8000

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
 * GET /api/administradora/fatura/boletos-grupo?grupo_id=xxx&administradora_id=xxx
 * Retorna as faturas/boletos já gerados para os clientes do grupo (para exibir na página Fatura > Gerar).
 */
export async function GET(request: NextRequest) {
  try {
    const grupoId = request.nextUrl.searchParams.get("grupo_id")
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")

    if (!grupoId || !administradoraId) {
      return NextResponse.json(
        { error: "grupo_id e administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()

    const { data: grupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id")
      .eq("id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    const { data: vinculos } = await supabaseAdmin
      .from("clientes_grupos")
      .select("id, cliente_id, cliente_tipo")
      .eq("grupo_id", grupoId)
      .eq("tenant_id", tenantId)

    const clienteIds: string[] = []
    const nomePorId: Record<string, string> = {}

    for (const v of vinculos || []) {
      if (v.cliente_tipo === "cliente_administradora") {
        clienteIds.push(v.cliente_id)
        const { data: vw } = await supabaseAdmin
          .from("vw_clientes_administradoras_completo")
          .select("id, cliente_nome")
          .eq("id", v.cliente_id)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (vw) nomePorId[v.cliente_id] = (vw as any)?.cliente_nome || "Cliente"
        continue
      }
      if (v.cliente_tipo === "proposta") {
        const { data: clienteAdm } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id")
          .eq("proposta_id", v.cliente_id)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (clienteAdm) {
          clienteIds.push(clienteAdm.id)
          const { data: vw } = await supabaseAdmin
            .from("vw_clientes_administradoras_completo")
            .select("id, cliente_nome")
            .eq("id", clienteAdm.id)
            .eq("tenant_id", tenantId)
            .maybeSingle()
          if (vw) nomePorId[clienteAdm.id] = (vw as any)?.cliente_nome || "Cliente"
        }
      }
    }

    // Incluir clientes_administradora_id das vidas importadas do grupo (titulares com fatura)
    const { data: vidasGrupo } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, cliente_administradora_id")
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
    for (const vida of vidasGrupo || []) {
      const caId = (vida as any).cliente_administradora_id
      if (caId && typeof caId === "string" && caId.trim() !== "" && !clienteIds.includes(caId)) {
        clienteIds.push(caId)
        nomePorId[caId] = (vida as any).nome || "Beneficiário"
      }
    }

    if (clienteIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: faturasRaw, error } = await supabaseAdmin
      .from("faturas")
      .select("id, cliente_administradora_id, numero_fatura, valor, status, vencimento, pagamento_data, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id, created_at")
      .in("cliente_administradora_id", clienteIds)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .limit(FETCH_CAP)

    if (error) {
      console.error("Erro ao buscar faturas do grupo:", error)
      return NextResponse.json({ error: "Erro ao buscar boletos" }, { status: 500 })
    }

    const faturasOrdenadas = [...(faturasRaw || [])].sort(
      (a, b) => timestampOrdenacaoFatura(b) - timestampOrdenacaoFatura(a)
    )
    const faturas = faturasOrdenadas.slice(0, MAX_FATURAS_GRUPO)

    const lista = faturas.map((f: any) => {
      const link = getBoletoLinkFromFatura(f)
      return {
        id: f.id,
        cliente_administradora_id: f.cliente_administradora_id,
        cliente_nome: nomePorId[f.cliente_administradora_id] || "Cliente",
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
