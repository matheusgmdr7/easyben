import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"
import {
  contarFaturasAtrasadasPorCliente,
  filtrarTitularesAtivosParaInadimplencia,
  percentual,
} from "@/lib/inadimplencia-grupo"

export const maxDuration = 60

export type ClienteAtrasoPayload = {
  cliente_administradora_id: string
  cliente_nome: string
  quantidadeFaturasAtrasadas: number
  vencimentos: string[]
}

/**
 * GET ?grupo_id=&administradora_id=
 * Situação atual: titulares ativos com faturas atrasadas, segmentados em 1 boleto vs 2+ boletos.
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

    const clienteIdsAtivos = await filtrarTitularesAtivosParaInadimplencia(
      clienteIds,
      grupoId,
      administradoraId,
      tenantId
    )

    const counts = await contarFaturasAtrasadasPorCliente(clienteIdsAtivos, administradoraId, tenantId)

    function montarCliente(id: string): ClienteAtrasoPayload {
      const info = counts.get(id)!
      return {
        cliente_administradora_id: id,
        cliente_nome: nomePorId[id] || "Cliente",
        quantidadeFaturasAtrasadas: info.quantidade,
        vencimentos: info.vencimentos,
      }
    }

    const umBoleto: ClienteAtrasoPayload[] = []
    const doisOuMais: ClienteAtrasoPayload[] = []

    for (const id of counts.keys()) {
      const n = counts.get(id)?.quantidade ?? 0
      if (n === 1) umBoleto.push(montarCliente(id))
      else if (n >= 2) doisOuMais.push(montarCliente(id))
    }

    const sortPorQtd = (a: ClienteAtrasoPayload, b: ClienteAtrasoPayload) =>
      b.quantidadeFaturasAtrasadas - a.quantidadeFaturasAtrasadas ||
      a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR")

    umBoleto.sort(sortPorQtd)
    doisOuMais.sort(sortPorQtd)

    const baseTitulares = clienteIdsAtivos.length
    const totalComAtraso = umBoleto.length + doisOuMais.length

    const resumo = {
      baseTitulares,
      titularesComFaturaAtrasada: totalComAtraso,
      percentualInadimplencia: percentual(totalComAtraso, baseTitulares),
      comUmBoleto: umBoleto.length,
      comDoisOuMaisBoletos: doisOuMais.length,
      percentualUmBoleto: percentual(umBoleto.length, baseTitulares),
      percentualDoisOuMais: percentual(doisOuMais.length, baseTitulares),
    }

    return NextResponse.json({
      grupo: { id: grupo.id, nome: grupo.nome },
      criterio:
        "Somente titulares ativos: status ativo em clientes_administradoras e, quando há vida importada no grupo, " +
        "ao menos uma vida ativa vinculada. Faturas em status atrasada (todas em aberto, sem filtro de mês). " +
        "1 boleto = exatamente uma fatura atrasada (~1 mês de atraso). " +
        "2+ boletos = duas ou mais faturas atrasadas (dois ou mais meses/competências em aberto).",
      resumo,
      clientesUmBoleto: umBoleto,
      clientesDoisOuMaisBoletos: doisOuMais,
      /** @deprecated use clientesDoisOuMaisBoletos */
      clientes: doisOuMais,
    })
  } catch (e: unknown) {
    console.error("clientes-multi-atraso:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro na consulta" }, { status: 500 })
  }
}
