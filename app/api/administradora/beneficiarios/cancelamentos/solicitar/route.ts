import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

type Vida = {
  id: string
  administradora_id: string
  grupo_id: string
  nome: string | null
  cpf: string | null
  cpf_titular: string | null
  tipo: string | null
  ativo: boolean | null
  observacoes: string | null
}

function limparDigitos(v: string | null | undefined) {
  return String(v || "").replace(/\D/g, "")
}

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
    const vidaId = String(body?.beneficiario_id || "").trim()
    const grupoIdBody = String(body?.grupo_id || "").trim()
    const motivo = String(body?.motivo_solicitacao || "").trim()

    if (!administradoraId || !vidaId) {
      return NextResponse.json({ error: "administradora_id e beneficiario_id são obrigatórios" }, { status: 400 })
    }

    const tenantId = await resolverTenantDaAdministradora(administradoraId)

    const { data: vidaBase, error: errVida } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
      .eq("id", vidaId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (errVida) throw errVida
    if (!vidaBase) return NextResponse.json({ error: "Beneficiário não encontrado" }, { status: 404 })

    const vidaPrincipal = vidaBase as Vida
    const grupoId = grupoIdBody || vidaPrincipal.grupo_id
    const tipo = String(vidaPrincipal.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular"

    let vidasAfetadas: Vida[] = [vidaPrincipal]
    if (tipo === "titular") {
      const cpfTitular = limparDigitos(vidaPrincipal.cpf)
      if (cpfTitular.length >= 11) {
        const { data: dependentes, error: errDeps } = await supabaseAdmin
          .from("vidas_importadas")
          .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
          .eq("administradora_id", administradoraId)
          .eq("tenant_id", tenantId)
          .eq("grupo_id", grupoId)
          .eq("tipo", "dependente")
          .eq("ativo", true)
          .eq("cpf_titular", cpfTitular)
        if (errDeps) throw errDeps
        vidasAfetadas = [vidaPrincipal, ...((dependentes || []) as Vida[])]
      }
    }

    const carimbo = new Date().toLocaleString("pt-BR")
    const nota = tipo === "titular"
      ? `Cancelamento solicitado em ${carimbo} (titular + dependentes).`
      : `Cancelamento solicitado em ${carimbo} (dependente).`

    const cancelamentosParaInserir = vidasAfetadas.map((vida) => ({
      tenant_id: tenantId,
      administradora_id: administradoraId,
      grupo_origem_id: vida.grupo_id,
      vida_id: vida.id,
      tipo_registro: String(vida.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular",
      status_fluxo: "solicitado",
      motivo_solicitacao: motivo || null,
      data_solicitacao: new Date().toISOString(),
      observacao_processamento: null,
    }))

    const { data: inseridos, error: errInsert } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .insert(cancelamentosParaInserir)
      .select("id, vida_id, status_fluxo")
    if (errInsert) throw errInsert

    for (const vida of vidasAfetadas) {
      const obsAtual = String(vida.observacoes || "").trim()
      const observacoes = obsAtual ? `${obsAtual}\n${nota}` : nota
      const { error: errUpdate } = await supabaseAdmin
        .from("vidas_importadas")
        .update({ ativo: false, observacoes })
        .eq("id", vida.id)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
      if (errUpdate) throw errUpdate

      const alteracoes = {
        ativo: { antes: vida.ativo ?? true, depois: false },
        observacoes: { antes: vida.observacoes ?? null, depois: observacoes },
      }
      await supabaseAdmin.from("vidas_importadas_historico").insert({
        vida_id: vida.id,
        tenant_id: tenantId,
        alteracoes,
      })
    }

    return NextResponse.json({
      success: true,
      cancelamentos_criados: inseridos?.length || 0,
      beneficiarios_afetados: vidasAfetadas.map((v) => ({ id: v.id, nome: v.nome, tipo: v.tipo || "titular" })),
      tipo_solicitacao: tipo,
    })
  } catch (e: unknown) {
    console.error("Erro ao solicitar cancelamento:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao solicitar cancelamento" },
      { status: 500 }
    )
  }
}
