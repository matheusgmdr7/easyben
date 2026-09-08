import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

const CHUNK = 100

type VidaRow = {
  id: string
  grupo_id: string | null
  cliente_administradora_id: string | null
  cpf: string | null
  cpf_titular: string | null
  tipo: string | null
  nome: string | null
  ativo: boolean | null
}

async function resolverTenant(administradoraId: string): Promise<string> {
  const { data: adm } = await supabaseAdmin
    .from("administradoras")
    .select("tenant_id")
    .eq("id", administradoraId)
    .maybeSingle()
  if (adm?.tenant_id) return adm.tenant_id
  return getCurrentTenantId()
}

function normalizarCpf(v: string | null | undefined): string {
  return String(v || "").replace(/\D/g, "")
}

async function expandirComDependentesDoGrupo(
  grupoOrigemId: string,
  administradoraId: string,
  tenantId: string,
  vidas: VidaRow[]
): Promise<Set<string>> {
  const ids = new Set(vidas.map((v) => v.id))
  const cpfsTitular = new Set<string>()

  for (const v of vidas) {
    const tipo = String(v.tipo || "titular").toLowerCase()
    if (tipo === "dependente") continue
    const cpf = normalizarCpf(v.cpf)
    if (cpf) cpfsTitular.add(cpf)
  }

  if (cpfsTitular.size === 0) return ids

  let q = supabaseAdmin
    .from("vidas_importadas")
    .select("id, cpf_titular, tipo")
    .eq("grupo_id", grupoOrigemId)
    .eq("administradora_id", administradoraId)
  if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)

  const { data: vidasGrupo } = await q
  for (const row of vidasGrupo || []) {
    const tipo = String((row as { tipo?: string }).tipo || "").toLowerCase()
    if (tipo !== "dependente") continue
    const cpfTit = normalizarCpf((row as { cpf_titular?: string }).cpf_titular)
    if (cpfTit && cpfsTitular.has(cpfTit)) {
      ids.add(String((row as { id: string }).id))
    }
  }

  return ids
}

async function sincronizarClientesGrupos(
  clienteIds: string[],
  grupoOrigemId: string,
  grupoDestinoId: string,
  tenantId: string
) {
  for (const clienteId of clienteIds) {
    await supabaseAdmin
      .from("clientes_grupos")
      .delete()
      .eq("grupo_id", grupoOrigemId)
      .eq("cliente_id", clienteId)
      .eq("cliente_tipo", "cliente_administradora")

    const { data: existente } = await supabaseAdmin
      .from("clientes_grupos")
      .select("id")
      .eq("grupo_id", grupoDestinoId)
      .eq("cliente_id", clienteId)
      .eq("cliente_tipo", "cliente_administradora")
      .maybeSingle()

    if (!existente) {
      await supabaseAdmin.from("clientes_grupos").insert({
        grupo_id: grupoDestinoId,
        cliente_id: clienteId,
        cliente_tipo: "cliente_administradora",
        tenant_id: tenantId,
      })
    }
  }
}

/**
 * POST /api/administradora/grupos/[id]/mover-vidas-lote
 * Body: { administradora_id, grupo_destino_id, vida_ids: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: grupoOrigemId } = await params
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body?.administradora_id || "").trim()
    const grupoDestinoId = String(body?.grupo_destino_id || "").trim()
    const vidaIdsRaw = Array.isArray(body?.vida_ids) ? body.vida_ids : []
    const vidaIds = [...new Set(vidaIdsRaw.map((id: unknown) => String(id || "").trim()).filter(Boolean))]

    if (!administradoraId || !grupoOrigemId || !grupoDestinoId) {
      return NextResponse.json(
        { error: "administradora_id, grupo de origem e grupo_destino_id são obrigatórios" },
        { status: 400 }
      )
    }
    if (grupoOrigemId === grupoDestinoId) {
      return NextResponse.json(
        { error: "O grupo de destino deve ser diferente do grupo atual." },
        { status: 400 }
      )
    }
    if (vidaIds.length === 0) {
      return NextResponse.json({ error: "Informe ao menos uma vida para mover." }, { status: 400 })
    }

    const tenantId = await resolverTenant(administradoraId)

    const { data: grupos } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .eq("administradora_id", administradoraId)
      .in("id", [grupoOrigemId, grupoDestinoId])
    if (!grupos || grupos.length !== 2) {
      return NextResponse.json({ error: "Grupo de origem ou destino inválido." }, { status: 404 })
    }

    const vidasSelecionadas: VidaRow[] = []
    for (let i = 0; i < vidaIds.length; i += CHUNK) {
      const chunk = vidaIds.slice(i, i + CHUNK)
      let q = supabaseAdmin
        .from("vidas_importadas")
        .select("id, grupo_id, cliente_administradora_id, cpf, cpf_titular, tipo, nome, ativo")
        .eq("administradora_id", administradoraId)
        .in("id", chunk)
      if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      const { data, error } = await q
      if (error) throw error
      vidasSelecionadas.push(...((data || []) as VidaRow[]))
    }

    const invalidas = vidasSelecionadas.filter((v) => String(v.grupo_id || "") !== grupoOrigemId)
    if (invalidas.length > 0) {
      return NextResponse.json(
        {
          error: `${invalidas.length} beneficiário(s) não pertence(m) ao grupo de origem.`,
        },
        { status: 400 }
      )
    }
    if (vidasSelecionadas.length === 0) {
      return NextResponse.json({ error: "Nenhum beneficiário válido encontrado." }, { status: 404 })
    }

    const idsParaMover = await expandirComDependentesDoGrupo(
      grupoOrigemId,
      administradoraId,
      tenantId,
      vidasSelecionadas
    )

    const vidasParaAtualizar: VidaRow[] = [...vidasSelecionadas]
    const idsJaCarregados = new Set(vidasSelecionadas.map((v) => v.id))
    const idsExtras = [...idsParaMover].filter((id) => !idsJaCarregados.has(id))

    for (let i = 0; i < idsExtras.length; i += CHUNK) {
      const chunk = idsExtras.slice(i, i + CHUNK)
      let q = supabaseAdmin
        .from("vidas_importadas")
        .select("id, grupo_id, cliente_administradora_id, cpf, cpf_titular, tipo, nome, ativo")
        .eq("administradora_id", administradoraId)
        .eq("grupo_id", grupoOrigemId)
        .in("id", chunk)
      if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      const { data } = await q
      vidasParaAtualizar.push(...((data || []) as VidaRow[]))
    }

    let movidas = 0
    const clienteIdsUnicos = new Set<string>()

    for (const vida of vidasParaAtualizar) {
      const { error: errUp } = await supabaseAdmin
        .from("vidas_importadas")
        .update({ grupo_id: grupoDestinoId })
        .eq("id", vida.id)
        .eq("administradora_id", administradoraId)
      if (errUp) throw errUp

      movidas++
      const caId = String(vida.cliente_administradora_id || "").trim()
      if (caId) clienteIdsUnicos.add(caId)

      try {
        await supabaseAdmin.from("vidas_importadas_historico").insert({
          vida_id: vida.id,
          tenant_id: tenantId,
          alteracoes: {
            grupo_id: { antes: vida.grupo_id ?? null, depois: grupoDestinoId },
          },
        })
      } catch {
        // Histórico complementar; não bloqueia a mudança.
      }
    }

    if (clienteIdsUnicos.size > 0) {
      await sincronizarClientesGrupos(
        [...clienteIdsUnicos],
        grupoOrigemId,
        grupoDestinoId,
        tenantId
      )
    }

    const dependentesIncluidos = Math.max(0, movidas - vidasSelecionadas.length)

    return NextResponse.json({
      success: true,
      movidas,
      selecionadas: vidasSelecionadas.length,
      dependentes_incluidos: dependentesIncluidos,
      grupo_destino_id: grupoDestinoId,
    })
  } catch (e: unknown) {
    console.error("Erro mover-vidas-lote:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao mover beneficiários de grupo" },
      { status: 500 }
    )
  }
}
