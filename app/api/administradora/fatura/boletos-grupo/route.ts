import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"
import { buscarFaturasPorClienteIdsChunks, CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"

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

async function preencherNomesViewEmChunks(
  ids: string[],
  tenantId: string,
  destino: Record<string, string>
): Promise<void> {
  const falta = ids.filter((id) => id && !destino[id])
  if (falta.length === 0) return

  for (let i = 0; i < falta.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = falta.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data: rows } = await supabaseAdmin
      .from("vw_clientes_administradoras_completo")
      .select("id, cliente_nome")
      .in("id", chunk)
      .eq("tenant_id", tenantId)
    if (!rows?.length) {
      const fb = await supabaseAdmin
        .from("vw_clientes_administradoras_completo")
        .select("id, cliente_nome")
        .in("id", chunk)
      rows = fb.data
    }
    for (const row of rows || []) {
      const id = String((row as { id?: string }).id || "")
      const nome = String((row as { cliente_nome?: string }).cliente_nome || "").trim()
      if (id && nome) destino[id] = nome
    }
  }
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

    let { data: vinculos } = await supabaseAdmin
      .from("clientes_grupos")
      .select("id, cliente_id, cliente_tipo")
      .eq("grupo_id", grupoId)
      .eq("tenant_id", tenantId)

    if (!vinculos || vinculos.length === 0) {
      const fb = await supabaseAdmin
        .from("clientes_grupos")
        .select("id, cliente_id, cliente_tipo")
        .eq("grupo_id", grupoId)
      vinculos = fb.data || []
    }

    const clienteIdSet = new Set<string>()
    const nomePorId: Record<string, string> = {}

    const propostaIds = (vinculos || [])
      .filter((v) => v.cliente_tipo === "proposta" && v.cliente_id)
      .map((v) => String(v.cliente_id))

    const propostaIdUnicos = [...new Set(propostaIds)]
    const propostaToCaId = new Map<string, string>()
    if (propostaIdUnicos.length > 0) {
      for (let i = 0; i < propostaIdUnicos.length; i += CHUNK_IN_CLIENTE_IDS) {
        const chunk = propostaIdUnicos.slice(i, i + CHUNK_IN_CLIENTE_IDS)
        let { data: cas } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id")
          .in("proposta_id", chunk)
          .eq("tenant_id", tenantId)
        if (!cas?.length) {
          const fb = await supabaseAdmin
            .from("clientes_administradoras")
            .select("id, proposta_id")
            .in("proposta_id", chunk)
          cas = fb.data
        }
        for (const ca of cas || []) {
          const pid = String((ca as { proposta_id?: string }).proposta_id || "")
          const id = String((ca as { id?: string }).id || "")
          if (pid && id && !propostaToCaId.has(pid)) propostaToCaId.set(pid, id)
        }
      }
    }

    for (const v of vinculos || []) {
      if (v.cliente_tipo === "cliente_administradora" && v.cliente_id) {
        const id = String(v.cliente_id)
        clienteIdSet.add(id)
        continue
      }
      if (v.cliente_tipo === "proposta" && v.cliente_id) {
        const caId = propostaToCaId.get(String(v.cliente_id))
        if (caId) clienteIdSet.add(caId)
      }
    }

    const { data: vidasComTenant } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, tipo, cliente_administradora_id")
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    const vidasSet = new Map<string, { nome?: string; cliente_administradora_id?: string | null }>()
    for (const vida of vidasComTenant || []) {
      const id = String((vida as { id?: string }).id || "")
      if (id) vidasSet.set(id, vida as { nome?: string; cliente_administradora_id?: string | null })
    }
    if (vidasSet.size === 0) {
      const { data: vidasSemTenant } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, nome, tipo, cliente_administradora_id")
        .eq("grupo_id", grupoId)
        .eq("administradora_id", administradoraId)
      for (const vida of vidasSemTenant || []) {
        const id = String((vida as { id?: string }).id || "")
        if (id) vidasSet.set(id, vida as { nome?: string; cliente_administradora_id?: string | null })
      }
    }

    for (const vida of vidasSet.values()) {
      const caId = vida.cliente_administradora_id
      if (caId && String(caId).trim() !== "") {
        const id = String(caId).trim()
        clienteIdSet.add(id)
        const nm = String(vida.nome || "").trim()
        if (nm) nomePorId[id] = nm
      }
    }

    const clienteIds = [...clienteIdSet]
    const idsSemNome = clienteIds.filter((id) => !nomePorId[id])
    await preencherNomesViewEmChunks(idsSemNome, tenantId, nomePorId)

    if (clienteIds.length === 0) {
      return NextResponse.json([])
    }

    const selectCols =
      "id, cliente_administradora_id, numero_fatura, valor, status, vencimento, pagamento_data, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id, created_at"

    let faturasRaw: Array<Record<string, unknown>> = []
    try {
      faturasRaw = await buscarFaturasPorClienteIdsChunks(
        supabaseAdmin,
        clienteIds,
        administradoraId,
        selectCols,
        FETCH_CAP
      )
    } catch (e) {
      console.error("Erro ao buscar faturas do grupo (chunks):", e)
      return NextResponse.json({ error: "Erro ao buscar boletos" }, { status: 500 })
    }

    const faturasOrdenadas = faturasRaw.sort(
      (a, b) =>
        timestampOrdenacaoFatura(b as { created_at?: string | null; vencimento?: string | null }) -
        timestampOrdenacaoFatura(a as { created_at?: string | null; vencimento?: string | null })
    )
    const faturas = faturasOrdenadas.slice(0, MAX_FATURAS_GRUPO)

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
