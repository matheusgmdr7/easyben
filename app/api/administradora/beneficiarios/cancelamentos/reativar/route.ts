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

function limparDigitos(v: unknown): string {
  return String(v || "").replace(/\D/g, "")
}

type VidaReativacao = {
  id: string
  ativo?: boolean | null
  grupo_id?: string | null
  observacoes?: string | null
  nome?: string | null
  tipo?: string | null
  cpf?: string | null
  cpf_titular?: string | null
  valor_mensal?: number | null
}

/**
 * Dependentes ainda inativos (ou em cancelamento) vinculados ao CPF do titular.
 * Não inclui dependentes já ativos — evita mexer em quem já está ok.
 */
async function buscarDependentesParaReativacao(params: {
  administradoraId: string
  tenantId: string
  cpfTitular: string
}): Promise<VidaReativacao[]> {
  const cpf = limparDigitos(params.cpfTitular)
  if (cpf.length < 11) return []

  const { data: porCpf } = await supabaseAdmin
    .from("vidas_importadas")
    .select("id, ativo, grupo_id, observacoes, tipo, nome, cpf, cpf_titular, valor_mensal")
    .eq("administradora_id", params.administradoraId)
    .eq("tenant_id", params.tenantId)
    .eq("tipo", "dependente")
    .eq("cpf_titular", cpf)

  let lista = (porCpf || []) as VidaReativacao[]

  if (lista.length === 0) {
    const { data: amplo } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, ativo, grupo_id, observacoes, tipo, nome, cpf, cpf_titular, valor_mensal")
      .eq("administradora_id", params.administradoraId)
      .eq("tenant_id", params.tenantId)
      .eq("tipo", "dependente")
      .limit(5000)
    lista = ((amplo || []) as VidaReativacao[]).filter(
      (d) => limparDigitos(d.cpf_titular) === cpf
    )
  }

  // Só quem está explicitamente inativo (não remexe em dependentes já ativos)
  return lista.filter((d) => d.ativo === false)
}

/**
 * POST /api/administradora/beneficiarios/cancelamentos/reativar
 *
 * Body:
 * - administradora_id, cancelamento_id (obrigatórios)
 * - grupo_destino_id, observacao_reativacao
 * - preview: true → só lista titular + dependentes vinculados, sem gravar
 * - reativar_dependentes: true → titular + dependentes inativos vinculados
 * - somente_titular: true → só a vida do cancelamento (comportamento antigo)
 *
 * Se for titular com dependentes inativos e nenhuma flag de decisão:
 * retorna 409 com codigo=dependentes_vinculados para a UI pedir autorização.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body?.administradora_id || "").trim()
    const cancelamentoId = String(body?.cancelamento_id || "").trim()
    const grupoDestinoIdBody = String(body?.grupo_destino_id || "").trim()
    const observacao = String(body?.observacao_reativacao || "").trim()
    const preview = body?.preview === true || body?.preview === "true"
    const reativarDependentes =
      body?.reativar_dependentes === true || body?.reativar_dependentes === "true"
    const somenteTitular = body?.somente_titular === true || body?.somente_titular === "true"

    if (!administradoraId || !cancelamentoId) {
      return NextResponse.json(
        { error: "administradora_id e cancelamento_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await resolverTenantDaAdministradora(administradoraId)

    const { data: cancelamento, error: errCancelamento } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("id, vida_id, grupo_origem_id, status_fluxo, tipo_registro")
      .eq("id", cancelamentoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (errCancelamento) throw errCancelamento
    if (!cancelamento) {
      return NextResponse.json({ error: "Cancelamento não encontrado" }, { status: 404 })
    }

    const grupoDestinoId = grupoDestinoIdBody || String(cancelamento.grupo_origem_id || "")
    if (!preview && !grupoDestinoId) {
      return NextResponse.json(
        { error: "Não foi possível determinar o grupo de destino para reativação" },
        { status: 400 }
      )
    }

    if (!preview && grupoDestinoId) {
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
    }

    const { data: vidaAtual, error: errVidaAtual } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, ativo, grupo_id, observacoes, tipo, cpf, cpf_titular, nome, valor_mensal")
      .eq("id", cancelamento.vida_id)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()
    if (errVidaAtual) throw errVidaAtual
    if (!vidaAtual) {
      return NextResponse.json({ error: "Beneficiário não encontrado para reativação" }, { status: 404 })
    }

    const tipoPrincipal =
      String(vidaAtual.tipo || cancelamento.tipo_registro || "titular").toLowerCase() === "dependente"
        ? "dependente"
        : "titular"

    let dependentesVinculados: VidaReativacao[] = []
    if (tipoPrincipal === "titular") {
      dependentesVinculados = await buscarDependentesParaReativacao({
        administradoraId,
        tenantId,
        cpfTitular: String(vidaAtual.cpf || ""),
      })
    }

    const mapBenef = (v: VidaReativacao) => ({
      id: v.id,
      nome: v.nome || null,
      tipo: (String(v.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular") as
        | "titular"
        | "dependente",
      ativo: v.ativo ?? null,
      valor_mensal: v.valor_mensal ?? null,
      cpf: v.cpf ?? null,
    })

    if (preview) {
      return NextResponse.json({
        preview: true,
        tipo_registro: tipoPrincipal,
        titular: mapBenef(vidaAtual as VidaReativacao),
        dependentes_vinculados: dependentesVinculados.map(mapBenef),
        qtd_dependentes: dependentesVinculados.length,
        requer_confirmacao_dependentes: tipoPrincipal === "titular" && dependentesVinculados.length > 0,
      })
    }

    // Titular com deps inativos: exige decisão explícita (não reativa família no automático)
    if (
      tipoPrincipal === "titular" &&
      dependentesVinculados.length > 0 &&
      !reativarDependentes &&
      !somenteTitular
    ) {
      return NextResponse.json(
        {
          error:
            "Este titular possui dependentes vinculados ainda inativos. Confirme se deseja reativar também os dependentes ou somente o titular.",
          codigo: "dependentes_vinculados",
          requer_confirmacao: true,
          titular: mapBenef(vidaAtual as VidaReativacao),
          dependentes_vinculados: dependentesVinculados.map(mapBenef),
          qtd_dependentes: dependentesVinculados.length,
        },
        { status: 409 }
      )
    }

    const vidasParaReativar: VidaReativacao[] = [vidaAtual as VidaReativacao]
    if (tipoPrincipal === "titular" && reativarDependentes) {
      for (const d of dependentesVinculados) {
        if (vidasParaReativar.some((x) => x.id === d.id)) continue
        vidasParaReativar.push(d)
      }
    }

    const carimbo = new Date().toLocaleString("pt-BR")
    const notaBase = `Reativado em ${carimbo}${observacao ? ` - ${observacao}` : ""}`
    const notaFamilia =
      tipoPrincipal === "titular" && vidasParaReativar.length > 1
        ? `${notaBase} (titular + ${vidasParaReativar.length - 1} dependente(s)).`
        : notaBase

    const idsReativados: string[] = []
    for (const vida of vidasParaReativar) {
      const obsAtual = String(vida.observacoes || "").trim()
      const observacoes = obsAtual ? `${obsAtual}\n${notaFamilia}` : notaFamilia
      const { error: errVida } = await supabaseAdmin
        .from("vidas_importadas")
        .update({
          ativo: true,
          grupo_id: grupoDestinoId,
          observacoes,
        })
        .eq("id", vida.id)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
      if (errVida) throw errVida

      await supabaseAdmin.from("vidas_importadas_historico").insert({
        vida_id: vida.id,
        tenant_id: tenantId,
        alteracoes: {
          ativo: { antes: vida.ativo ?? false, depois: true },
          grupo_id: { antes: vida.grupo_id ?? null, depois: grupoDestinoId },
          observacoes: { antes: vida.observacoes ?? null, depois: observacoes },
          reativacao_em_familia: tipoPrincipal === "titular" && vida.id !== vidaAtual.id,
        },
      })
      idsReativados.push(vida.id)
    }

    const { data: cancelamentosRelacionados } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("id, vida_id, status_fluxo")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .in("vida_id", idsReativados)
      .in("status_fluxo", ["solicitado", "processado_operadora"])

    const idsCancel = Array.from(
      new Set([cancelamentoId, ...((cancelamentosRelacionados || []).map((c) => String(c.id)) || [])])
    )

    const { data: atualizado, error: errAtualizado } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .update({
        status_fluxo: "reativado",
        grupo_destino_reativacao_id: grupoDestinoId,
        data_reativacao: new Date().toISOString(),
        observacao_reativacao: observacao || null,
      })
      .in("id", idsCancel)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .select("*")

    if (errAtualizado) throw errAtualizado

    const registroPrincipal =
      (atualizado || []).find((r) => r.id === cancelamentoId) || atualizado?.[0] || null

    return NextResponse.json({
      success: true,
      registro: registroPrincipal,
      vidas_reativadas: idsReativados.length,
      reativou_dependentes: reativarDependentes && dependentesVinculados.length > 0,
      beneficiarios: vidasParaReativar.map(mapBenef),
    })
  } catch (e: unknown) {
    console.error("Erro ao reativar cancelamento:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao reativar cancelamento" },
      { status: 500 }
    )
  }
}
