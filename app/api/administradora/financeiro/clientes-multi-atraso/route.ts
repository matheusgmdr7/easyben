import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"
import { CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"

export const maxDuration = 60

/**
 * GET ?grupo_id=&administradora_id=
 * Titulares do grupo com mais de duas faturas com status atrasada e cadastro ativo.
 */
export async function GET(request: NextRequest) {
  try {
    const grupoId = request.nextUrl.searchParams.get("grupo_id")
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")

    if (!grupoId || !administradoraId) {
      return NextResponse.json({ error: "grupo_id e administradora_id são obrigatórios" }, { status: 400 })
    }

    const tenantId = await resolveTenantIdForAdministradora(administradoraId)

    let { data: grupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .eq("id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!grupo) {
      const fb = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome")
        .eq("id", grupoId)
        .eq("administradora_id", administradoraId)
        .maybeSingle()
      grupo = fb.data
    }
    if (!grupo) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })

    const { ids: clienteIds, nomePorId } = await listarClienteAdministradoraIdsENomesDoGrupo(
      grupoId,
      administradoraId,
      tenantId
    )

    const counts = new Map<string, number>()
    if (clienteIds.length > 0) {
      for (let i = 0; i < clienteIds.length; i += CHUNK_IN_CLIENTE_IDS) {
        const chunk = clienteIds.slice(i, i + CHUNK_IN_CLIENTE_IDS)
        let { data, error } = await supabaseAdmin
          .from("faturas")
          .select("cliente_administradora_id")
          .in("cliente_administradora_id", chunk)
          .eq("administradora_id", administradoraId)
          .eq("status", "atrasada")

        if (error) {
          const fb = await supabaseAdmin
            .from("faturas")
            .select("cliente_administradora_id")
            .in("cliente_administradora_id", chunk)
            .eq("administradora_id", administradoraId)
            .eq("status", "atrasada")
          data = fb.data
          error = fb.error as typeof error
        }
        if (error) {
          console.error("[clientes-multi-atraso] faturas:", error)
          return NextResponse.json({ error: "Erro ao consultar faturas" }, { status: 500 })
        }
        for (const row of data || []) {
          const ca = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
          if (!ca) continue
          counts.set(ca, (counts.get(ca) || 0) + 1)
        }
      }
    }

    const candidatos = [...counts.entries()]
      .filter(([, n]) => n > 2)
      .map(([id]) => id)

    if (candidatos.length === 0) {
      return NextResponse.json({
        grupo: { id: grupo.id, nome: grupo.nome },
        criterio:
          "Clientes administradora do grupo com mais de 2 faturas em status atrasada (todas, sem filtro de data) e status cadastral ativo.",
        clientes: [],
      })
    }

    const ativos = new Set<string>()
    for (let i = 0; i < candidatos.length; i += CHUNK_IN_CLIENTE_IDS) {
      const chunk = candidatos.slice(i, i + CHUNK_IN_CLIENTE_IDS)
      let { data, error } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, status")
        .in("id", chunk)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)

      if (error) {
        const fb = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, status")
          .in("id", chunk)
          .eq("administradora_id", administradoraId)
        data = fb.data
        error = fb.error as typeof error
      }
      if (error) {
        console.error("[clientes-multi-atraso] clientes:", error)
        return NextResponse.json({ error: "Erro ao consultar status dos clientes" }, { status: 500 })
      }
      for (const row of data || []) {
        const id = String((row as { id?: string }).id || "").trim()
        const st = String((row as { status?: string }).status || "").toLowerCase()
        if (id && st === "ativo") ativos.add(id)
      }
    }

    const clientes = candidatos
      .filter((id) => ativos.has(id))
      .map((id) => ({
        cliente_administradora_id: id,
        cliente_nome: nomePorId[id] || "Cliente",
        quantidadeFaturasAtrasadas: counts.get(id) ?? 0,
      }))
      .sort((a, b) => (b.quantidadeFaturasAtrasadas || 0) - (a.quantidadeFaturasAtrasadas || 0))

    return NextResponse.json({
      grupo: { id: grupo.id, nome: grupo.nome },
      criterio:
        "Titulares do grupo (vínculo de faturamento) com mais de 2 faturas em status atrasada e status cadastral ativo em clientes_administradoras.",
      clientes,
    })
  } catch (e: unknown) {
    console.error("clientes-multi-atraso:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro na consulta" }, { status: 500 })
  }
}
