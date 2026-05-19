import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  inativarVidaImportada,
  resolverTenantIdAdministradora,
  sincronizarVidasInativasPorCancelamentos,
} from "@/lib/cancelamento-beneficiario-vida"

export const maxDuration = 120

const CHUNK_IN = 80
const CHUNK_INSERT = 100

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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
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

    const tenantId = await resolverTenantIdAdministradora(administradoraId)

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
      const idsEncontradosPorChunk = new Set<string>()
      for (const idsChunk of chunkArray(beneficiarioIds, CHUNK_IN)) {
        let q = supabaseAdmin
          .from("vidas_importadas")
          .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
          .eq("administradora_id", administradoraId)
          .neq("ativo", false)
          .in("id", idsChunk)
        if (tenantId) q = q.eq("tenant_id", tenantId)
        const { data: porIdsTenant, error: errPorIdsTenant } = await q
        if (errPorIdsTenant) throw errPorIdsTenant
        for (const v of (porIdsTenant || []) as Vida[]) {
          const idNorm = normalizarVidaId(v.id)
          if (!idsEncontradosPorChunk.has(idNorm)) {
            idsEncontradosPorChunk.add(idNorm)
            vidasPorIds.push(v)
          }
        }
      }

      const faltantes = beneficiarioIds.filter((id) => !idsEncontradosPorChunk.has(normalizarVidaId(id)))
      if (faltantes.length > 0) {
        for (const idsChunk of chunkArray(faltantes, CHUNK_IN)) {
          const { data: porIdsLegado, error: errPorIdsLegado } = await supabaseAdmin
            .from("vidas_importadas")
            .select("id, administradora_id, grupo_id, nome, cpf, cpf_titular, tipo, ativo, observacoes")
            .eq("administradora_id", administradoraId)
            .neq("ativo", false)
            .in("id", idsChunk)
          if (errPorIdsLegado) throw errPorIdsLegado
          for (const v of (porIdsLegado || []) as Vida[]) {
            const idNorm = normalizarVidaId(v.id)
            if (!idsEncontradosPorChunk.has(idNorm)) {
              idsEncontradosPorChunk.add(idNorm)
              vidasPorIds.push(v)
            }
          }
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
    const idsComSolicitacaoAberta = new Set<string>()
    for (const idsChunk of chunkArray(idsAfetar, CHUNK_IN)) {
      let qExist = supabaseAdmin
        .from("cancelamentos_beneficiarios")
        .select("vida_id")
        .eq("administradora_id", administradoraId)
        .eq("status_fluxo", "solicitado")
        .in("vida_id", idsChunk)
      if (tenantId) qExist = qExist.eq("tenant_id", tenantId)
      const { data: existentesSolicitados, error: errExist } = await qExist
      if (errExist) throw errExist
      for (const r of existentesSolicitados || []) {
        idsComSolicitacaoAberta.add(String((r as { vida_id: string }).vida_id))
      }
    }

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

    for (const lote of chunkArray(cancelamentos, CHUNK_INSERT)) {
      const { error: errInsert } = await supabaseAdmin.from("cancelamentos_beneficiarios").insert(lote)
      if (errInsert) throw errInsert
    }

    const carimbo = new Date().toLocaleString("pt-BR")
    const nota = `Cancelamento solicitado em lote em ${carimbo}.`
    const avisosAtualizacao: string[] = []
    let vidasAtualizadas = 0

    for (const vida of vidasParaSolicitar) {
      const res = await inativarVidaImportada({
        vidaId: vida.id,
        administradoraId,
        tenantId,
        notaObservacao: nota,
      })
      if (!res.ok) {
        avisosAtualizacao.push(`${vida.nome || vida.id}: ${res.error || "falha ao inativar"}`)
        continue
      }
      vidasAtualizadas += 1
    }

    const sync = await sincronizarVidasInativasPorCancelamentos({
      administradoraId,
      tenantId,
    })
    for (const e of sync.erros) {
      if (avisosAtualizacao.length < 15) avisosAtualizacao.push(e)
    }

    return NextResponse.json({
      success: true,
      solicitados: vidasParaSolicitar.length,
      vidas_atualizadas: vidasAtualizadas,
      vidas_sincronizadas: sync.atualizadas,
      ja_solicitados: jaSolicitados.length,
      ignorados,
      avisos: avisosAtualizacao.slice(0, 15),
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
