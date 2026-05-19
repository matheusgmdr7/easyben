import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  inativarVidaImportada,
  resolverTenantIdAdministradora,
} from "@/lib/cancelamento-beneficiario-vida"

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

    const tenantId = await resolverTenantIdAdministradora(administradoraId)

    const buscarVida = async (comTenant: boolean) => {
      let q = supabaseAdmin
        .from("vidas_importadas")
        .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
        .eq("id", vidaId)
        .eq("administradora_id", administradoraId)
      if (comTenant && tenantId) q = q.eq("tenant_id", tenantId)
      return q.maybeSingle()
    }

    let { data: vidaBase, error: errVida } = await buscarVida(true)
    if (errVida) throw errVida
    if (!vidaBase) {
      const legado = await buscarVida(false)
      if (legado.error) throw legado.error
      vidaBase = legado.data
    }

    if (!vidaBase) return NextResponse.json({ error: "Beneficiário não encontrado" }, { status: 404 })

    const vidaPrincipal = vidaBase as Vida
    const grupoId = grupoIdBody || vidaPrincipal.grupo_id
    const tipo = String(vidaPrincipal.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular"

    let vidasAfetadas: Vida[] = [vidaPrincipal]
    if (tipo === "titular") {
      const cpfTitular = limparDigitos(vidaPrincipal.cpf)
      if (cpfTitular.length >= 11) {
        const buscarDeps = async (comTenant: boolean) => {
          let q = supabaseAdmin
            .from("vidas_importadas")
            .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
            .eq("administradora_id", administradoraId)
            .eq("grupo_id", grupoId)
            .eq("tipo", "dependente")
            .neq("ativo", false)
            .eq("cpf_titular", cpfTitular)
          if (comTenant && tenantId) q = q.eq("tenant_id", tenantId)
          return q
        }
        let { data: dependentes, error: errDeps } = await buscarDeps(true)
        if (errDeps) throw errDeps
        if (!dependentes?.length) {
          const legado = await buscarDeps(false)
          if (legado.error) throw legado.error
          dependentes = legado.data
        }
        vidasAfetadas = [vidaPrincipal, ...((dependentes || []) as Vida[])]
      }
    }

    const carimbo = new Date().toLocaleString("pt-BR")
    const nota =
      tipo === "titular"
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

    const avisos: string[] = []
    for (const vida of vidasAfetadas) {
      const res = await inativarVidaImportada({
        vidaId: vida.id,
        administradoraId,
        tenantId,
        notaObservacao: nota,
      })
      if (!res.ok) avisos.push(`${vida.nome || vida.id}: ${res.error || "falha ao inativar"}`)
    }

    return NextResponse.json({
      success: true,
      cancelamentos_criados: inseridos?.length || 0,
      beneficiarios_afetados: vidasAfetadas.map((v) => ({ id: v.id, nome: v.nome, tipo: v.tipo || "titular" })),
      tipo_solicitacao: tipo,
      avisos: avisos.slice(0, 10),
    })
  } catch (e: unknown) {
    console.error("Erro ao solicitar cancelamento:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao solicitar cancelamento" },
      { status: 500 }
    )
  }
}
