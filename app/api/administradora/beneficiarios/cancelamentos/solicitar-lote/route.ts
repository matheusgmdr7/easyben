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

function normalizarVidaId(v: unknown): string {
  return String(v || "")
    .trim()
    .replace(/^vida[:\-]/i, "")
    .replace(/[{}]/g, "")
    .toLowerCase()
}

function normalizarNome(v: unknown): string {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
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
    const motivo = String(body?.motivo_solicitacao || "").trim()
    const idsEntrada = Array.isArray(body?.beneficiario_ids) ? body.beneficiario_ids : []
    const referenciasEntrada = Array.isArray(body?.referencias) ? body.referencias : []
    const beneficiarioIds = Array.from(
      new Set(
        idsEntrada
          .map((id: unknown) => normalizarVidaId(id))
          .filter(Boolean)
      )
    )

    if (!administradoraId || (beneficiarioIds.length === 0 && referenciasEntrada.length === 0)) {
      return NextResponse.json(
        { error: "administradora_id e ao menos beneficiario_ids ou referencias são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await resolverTenantDaAdministradora(administradoraId)

    const { data: vidasGrupoTenant, error: errVidasTenant } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .neq("ativo", false)
    if (errVidasTenant) throw errVidasTenant

    let vidasGrupo = (vidasGrupoTenant || []) as Vida[]
    // Fallback: alguns registros legados podem estar sem tenant_id consistente.
    // Nesse caso, buscamos pelo escopo da administradora para não ignorar beneficiários válidos.
    if (vidasGrupo.length === 0) {
      const { data: vidasGrupoLegado, error: errVidasLegado } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
        .eq("administradora_id", administradoraId)
        .neq("ativo", false)
      if (errVidasLegado) throw errVidasLegado
      vidasGrupo = (vidasGrupoLegado || []) as Vida[]
    }

    const mapaVidas = new Map<string, Vida>()
    const mapaCpf = new Map<string, Vida>()
    const mapaCpfSemZero = new Map<string, Vida>()
    const mapaNome = new Map<string, Vida[]>()
    for (const v of vidasGrupo) {
      mapaVidas.set(normalizarVidaId(v.id), v)
      const cpf = limparDigitos(v.cpf)
      if (cpf) {
        mapaCpf.set(cpf, v)
        mapaCpfSemZero.set(cpf.replace(/^0+/, ""), v)
      }
      const nome = normalizarNome(v.nome)
      if (nome) {
        const arr = mapaNome.get(nome) || []
        arr.push(v)
        mapaNome.set(nome, arr)
      }
    }

    const vidasAfetarMap = new Map<string, Vida>()
    const idsNaoMapeados = new Set<string>(beneficiarioIds.map((id) => normalizarVidaId(id)))

    // 1) Busca direta por IDs recebidos (mais confiável que apenas mapa em memória)
    let vidasPorIds = [] as Vida[]
    if (beneficiarioIds.length > 0) {
      const { data: porIdsTenant, error: errPorIdsTenant } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .neq("ativo", false)
        .in("id", beneficiarioIds)
      if (errPorIdsTenant) throw errPorIdsTenant
      vidasPorIds = (porIdsTenant || []) as Vida[]

      if (vidasPorIds.length < beneficiarioIds.length) {
        const idsEncontrados = new Set(vidasPorIds.map((v) => normalizarVidaId(v.id)))
        const faltantes = beneficiarioIds.filter((id) => !idsEncontrados.has(normalizarVidaId(id)))
        if (faltantes.length > 0) {
          const { data: porIdsLegado, error: errPorIdsLegado } = await supabaseAdmin
            .from("vidas_importadas")
            .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
            .eq("administradora_id", administradoraId)
            .neq("ativo", false)
            .in("id", faltantes)
          if (errPorIdsLegado) throw errPorIdsLegado
          vidasPorIds = [...vidasPorIds, ...((porIdsLegado || []) as Vida[])]
        }
      }
    }

    for (const vida of vidasPorIds) {
      vidasAfetarMap.set(vida.id, vida)
      idsNaoMapeados.delete(normalizarVidaId(vida.id))
      const tipo = String(vida.tipo || "titular").toLowerCase()
      if (tipo === "titular") {
        const cpfTitular = limparDigitos(vida.cpf)
        if (cpfTitular.length >= 11) {
          for (const dep of mapaVidas.values()) {
            const depTipo = String(dep.tipo || "").toLowerCase()
            if (depTipo !== "dependente") continue
            if (dep.grupo_id !== vida.grupo_id) continue
            if (limparDigitos(dep.cpf_titular) === cpfTitular) {
              vidasAfetarMap.set(dep.id, dep)
            }
          }
        }
      }
    }

    // 2) Fallback: tenta mapear por CPF/Nome quando ID não casar
    for (const refRaw of referenciasEntrada) {
      const ref = (refRaw || {}) as { id?: string; cpf?: string; nome?: string }
      const idNorm = normalizarVidaId(ref.id)
      if (idNorm && mapaVidas.has(idNorm)) {
        idsNaoMapeados.delete(idNorm)
        continue
      }

      let vidaEncontrada: Vida | null = null
      const cpf = limparDigitos(ref.cpf)
      if (cpf) {
        vidaEncontrada = mapaCpf.get(cpf) || mapaCpfSemZero.get(cpf.replace(/^0+/, "")) || null
      }
      if (!vidaEncontrada) {
        const nome = normalizarNome(ref.nome)
        if (nome) {
          const candidatos = mapaNome.get(nome) || []
          if (candidatos.length === 1) {
            vidaEncontrada = candidatos[0]
          }
        }
      }
      if (vidaEncontrada) {
        vidasAfetarMap.set(vidaEncontrada.id, vidaEncontrada)
        if (idNorm) idsNaoMapeados.delete(idNorm)
        const tipo = String(vidaEncontrada.tipo || "titular").toLowerCase()
        if (tipo === "titular") {
          const cpfTitular = limparDigitos(vidaEncontrada.cpf)
          if (cpfTitular.length >= 11) {
            for (const dep of mapaVidas.values()) {
              const depTipo = String(dep.tipo || "").toLowerCase()
              if (depTipo !== "dependente") continue
              if (dep.grupo_id !== vidaEncontrada.grupo_id) continue
              if (limparDigitos(dep.cpf_titular) === cpfTitular) {
                vidasAfetarMap.set(dep.id, dep)
              }
            }
          }
        }
      }
    }

    const ignorados: Array<{ id: string; motivo: string }> = Array.from(idsNaoMapeados).map((id) => ({
      id,
      motivo: "Beneficiário não encontrado/ativo no cadastro",
    }))

    const vidasAfetar = Array.from(vidasAfetarMap.values())
    if (vidasAfetar.length === 0) {
      return NextResponse.json({
        success: true,
        solicitados: 0,
        ja_solicitados: 0,
        ignorados,
        diagnostico: {
          ids_recebidos: beneficiarioIds.length,
          referencias_recebidas: referenciasEntrada.length,
          ids_mapeados: 0,
          amostra_ignorados: ignorados.slice(0, 5),
        },
      })
    }

    const idsAfetar = vidasAfetar.map((v) => v.id)
    const { data: existentesSolicitados } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("vida_id")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .eq("status_fluxo", "solicitado")
      .in("vida_id", idsAfetar)
    const idsComSolicitacaoAberta = new Set((existentesSolicitados || []).map((r: any) => String(r.vida_id)))

    const jaSolicitados = vidasAfetar.filter((v) => idsComSolicitacaoAberta.has(v.id))
    const vidasParaSolicitar = vidasAfetar.filter((v) => !idsComSolicitacaoAberta.has(v.id))
    for (const v of vidasAfetar) {
      if (idsComSolicitacaoAberta.has(v.id)) {
        // Não trata como erro funcional; é comportamento idempotente.
        // Mantemos fora de "ignorados" para evitar impressão de falha total.
      }
    }

    if (vidasParaSolicitar.length === 0) {
      return NextResponse.json({
        success: true,
        solicitados: 0,
        ja_solicitados: jaSolicitados.length,
        ignorados,
        diagnostico: {
          ids_recebidos: beneficiarioIds.length,
          referencias_recebidas: referenciasEntrada.length,
          ids_mapeados: vidasAfetar.length,
          amostra_ignorados: ignorados.slice(0, 5),
        },
      })
    }

    const cancelamentos = vidasParaSolicitar.map((vida) => ({
      tenant_id: tenantId,
      administradora_id: administradoraId,
      grupo_origem_id: vida.grupo_id,
      vida_id: vida.id,
      tipo_registro: String(vida.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular",
      status_fluxo: "solicitado",
      motivo_solicitacao: motivo || null,
      data_solicitacao: new Date().toISOString(),
    }))

    const { error: errInsert } = await supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .insert(cancelamentos)
    if (errInsert) throw errInsert

    const carimbo = new Date().toLocaleString("pt-BR")
    const nota = `Cancelamento solicitado em lote em ${carimbo}.`
    for (const vida of vidasParaSolicitar) {
      const obsAtual = String(vida.observacoes || "").trim()
      const observacoes = obsAtual ? `${obsAtual}\n${nota}` : nota
      const { error: errVida } = await supabaseAdmin
        .from("vidas_importadas")
        .update({ ativo: false, observacoes })
        .eq("id", vida.id)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
      if (errVida) throw errVida

      await supabaseAdmin.from("vidas_importadas_historico").insert({
        vida_id: vida.id,
        tenant_id: tenantId,
        alteracoes: {
          ativo: { antes: vida.ativo ?? true, depois: false },
          observacoes: { antes: vida.observacoes ?? null, depois: observacoes },
        },
      })
    }

    return NextResponse.json({
      success: true,
      solicitados: vidasParaSolicitar.length,
      ja_solicitados: jaSolicitados.length,
      ignorados,
      beneficiarios_afetados: vidasParaSolicitar.map((v) => ({ id: v.id, nome: v.nome, tipo: v.tipo })),
      diagnostico: {
        ids_recebidos: beneficiarioIds.length,
        referencias_recebidas: referenciasEntrada.length,
        ids_mapeados: vidasAfetar.length,
        amostra_ignorados: ignorados.slice(0, 5),
      },
    })
  } catch (e: unknown) {
    console.error("Erro ao solicitar cancelamento em lote:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao solicitar cancelamento em lote" },
      { status: 500 }
    )
  }
}
