import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

async function resolverTenantDaAdministradora(administradoraId: string): Promise<string> {
  const { data: adm } = await supabaseAdmin
    .from("administradoras")
    .select("tenant_id")
    .eq("id", administradoraId)
    .maybeSingle()
  if (adm?.tenant_id) return adm.tenant_id
  return getCurrentTenantId()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body?.administradora_id || "").trim()
    const cancelamentoId = String(body?.cancelamento_id || "").trim()
    const grupoDestinoIdBody = String(body?.grupo_destino_id || "").trim()
    const observacao = String(body?.observacao_reativacao || "").trim()

    if (!administradoraId || !cancelamentoId) {
      return NextResponse.json({ error: "administradora_id e cancelamento_id são obrigatórios" }, { status: 400 })
    }

    const tenantId = await resolverTenantDaAdministradora(administradoraId)

    const { data: cancelamento, error: errCancelamento } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("id, vida_id, grupo_origem_id, status_fluxo")
      .eq("id", cancelamentoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (errCancelamento) throw errCancelamento
    if (!cancelamento) return NextResponse.json({ error: "Cancelamento não encontrado" }, { status: 404 })

    const grupoDestinoId = grupoDestinoIdBody || String(cancelamento.grupo_origem_id || "")
    if (!grupoDestinoId) {
      return NextResponse.json({ error: "Não foi possível determinar o grupo de destino para reativação" }, { status: 400 })
    }

    const { data: grupoDestino } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id")
      .eq("id", grupoDestinoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (!grupoDestino) {
      return NextResponse.json({ error: "Grupo de destino inválido" }, { status: 400 })
    }

    const { data: vidaAtual, error: errVidaAtual } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, ativo, grupo_id, observacoes")
      .eq("id", cancelamento.vida_id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (errVidaAtual) throw errVidaAtual
    if (!vidaAtual) return NextResponse.json({ error: "Beneficiário não encontrado para reativação" }, { status: 404 })

    const carimbo = new Date().toLocaleString("pt-BR")
    const nota = `Reativado em ${carimbo}${observacao ? ` - ${observacao}` : ""}`
    const obsAtual = String(vidaAtual.observacoes || "").trim()
    const observacoes = obsAtual ? `${obsAtual}\n${nota}` : nota

    const { error: errVida } = await supabaseAdmin
      .from("vidas_importadas")
      .update({
        ativo: true,
        grupo_id: grupoDestinoId,
        observacoes,
      })
      .eq("id", cancelamento.vida_id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
    if (errVida) throw errVida

    await supabaseAdmin.from("vidas_importadas_historico").insert({
      vida_id: cancelamento.vida_id,
      tenant_id: tenantId,
      alteracoes: {
        ativo: { antes: vidaAtual.ativo ?? false, depois: true },
        grupo_id: { antes: vidaAtual.grupo_id ?? null, depois: grupoDestinoId },
        observacoes: { antes: vidaAtual.observacoes ?? null, depois: observacoes },
      },
    })

    const { data: atualizado, error: errAtualizado } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .update({
        status_fluxo: "reativado",
        grupo_destino_reativacao_id: grupoDestinoId,
        data_reativacao: new Date().toISOString(),
        observacao_reativacao: observacao || null,
      })
      .eq("id", cancelamentoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .select("*")
      .maybeSingle()
    if (errAtualizado) throw errAtualizado

    return NextResponse.json({ success: true, registro: atualizado })
  } catch (e: unknown) {
    console.error("Erro ao reativar cancelamento:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao reativar cancelamento" },
      { status: 500 }
    )
  }
}
