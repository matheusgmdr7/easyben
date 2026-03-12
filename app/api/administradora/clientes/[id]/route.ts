import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * PATCH /api/administradora/clientes/[id]
 * Atualiza corretor e campos contratuais do cliente.
 * Body: {
 *   administradora_id: string,
 *   corretor_id?: string | null,
 *   valor_mensal?: number | string | null,
 *   data_vigencia?: string | null,
 *   dia_vencimento?: string | number | null,
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { administradora_id, corretor_id, valor_mensal, data_vigencia, dia_vencimento } = body

    if (!administradora_id) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }

    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradora_id)
      .maybeSingle()
    const tenantId = adm?.tenant_id || null
    const corretorIdFinal = corretor_id === "" || corretor_id === undefined ? null : corretor_id
    const atualizacoes: Record<string, unknown> = {}

    if ("corretor_id" in body) {
      atualizacoes.corretor_id = corretorIdFinal
    }
    if ("valor_mensal" in body) {
      if (valor_mensal === "" || valor_mensal == null) {
        atualizacoes.valor_mensal = null
      } else {
        const n = typeof valor_mensal === "number" ? valor_mensal : parseFloat(String(valor_mensal).replace(",", "."))
        if (isNaN(n) || n < 0) {
          return NextResponse.json({ error: "valor_mensal inválido" }, { status: 400 })
        }
        atualizacoes.valor_mensal = n
      }
    }
    if ("data_vigencia" in body) {
      const vig = String(data_vigencia || "").trim()
      atualizacoes.data_vigencia = vig || null
    }
    if ("dia_vencimento" in body) {
      const dia = String(dia_vencimento || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
      if (dia && !["01", "10"].includes(dia)) {
        return NextResponse.json({ error: "dia_vencimento deve ser 01 ou 10" }, { status: 400 })
      }
      atualizacoes.dia_vencimento = dia ? Number(dia) : null
    }
    if (Object.keys(atualizacoes).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    let queryClienteAtual = supabaseAdmin
      .from("clientes_administradoras")
      .select("id, corretor_id, valor_mensal, data_vigencia, dia_vencimento")
      .eq("id", id)
      .eq("administradora_id", administradora_id)
    if (tenantId) queryClienteAtual = queryClienteAtual.eq("tenant_id", tenantId)
    const { data: clienteAtual, error: erroClienteAtual } = await queryClienteAtual.maybeSingle()

    if (erroClienteAtual) {
      console.error("Erro ao buscar cliente atual:", erroClienteAtual)
      return NextResponse.json(
        { error: erroClienteAtual.message || "Erro ao buscar cliente" },
        { status: 500 }
      )
    }
    if (!clienteAtual) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    let queryUpdateCliente = supabaseAdmin
      .from("clientes_administradoras")
      .update(atualizacoes)
      .eq("id", id)
      .eq("administradora_id", administradora_id)
    if (tenantId) queryUpdateCliente = queryUpdateCliente.eq("tenant_id", tenantId)
    const { data, error } = await queryUpdateCliente.select("id, corretor_id, valor_mensal, data_vigencia, dia_vencimento").single()

    if (error) {
      console.error("Erro ao atualizar corretor do cliente:", error)
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar" },
        { status: 500 }
      )
    }
    if (!data) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    // Sincroniza corretor nas vidas importadas vinculadas ao cliente e registra histórico.
    // Isso mantém a exibição por grupo consistente quando o grupo usa vidas_importadas como fonte principal.
    if ("corretor_id" in atualizacoes && (clienteAtual?.corretor_id || null) !== (corretorIdFinal || null)) {
      let queryVidasRelacionadas = supabaseAdmin
        .from("vidas_importadas")
        .select("id, corretor_id")
        .eq("cliente_administradora_id", id)
        .eq("administradora_id", administradora_id)
      if (tenantId) queryVidasRelacionadas = queryVidasRelacionadas.eq("tenant_id", tenantId)
      const { data: vidasRelacionadas } = await queryVidasRelacionadas

      if ((vidasRelacionadas || []).length > 0) {
        let queryUpdateVidas = supabaseAdmin
          .from("vidas_importadas")
          .update({ corretor_id: corretorIdFinal })
          .eq("cliente_administradora_id", id)
          .eq("administradora_id", administradora_id)
        if (tenantId) queryUpdateVidas = queryUpdateVidas.eq("tenant_id", tenantId)
        await queryUpdateVidas

        try {
          if (tenantId) {
            const historicoPayload = (vidasRelacionadas || []).map((vida) => ({
              vida_id: vida.id,
              tenant_id: tenantId,
              alteracoes: {
                corretor_id: {
                  antes: vida.corretor_id ?? null,
                  depois: corretorIdFinal ?? null,
                },
              },
            }))
            if (historicoPayload.length > 0) {
              await supabaseAdmin.from("vidas_importadas_historico").insert(historicoPayload)
            }
          }
        } catch {
          // Histórico é complementar; não bloqueia a atualização do vínculo.
        }
      }
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error("Erro PATCH cliente:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar" },
      { status: 500 }
    )
  }
}
