import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * PATCH /api/administradora/clientes/[id]
 * Atualiza apenas o corretor vinculado ao cliente.
 * Body: { administradora_id: string, corretor_id: string | null }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { administradora_id, corretor_id } = body

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

    let queryClienteAtual = supabaseAdmin
      .from("clientes_administradoras")
      .select("id, corretor_id")
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
      .update({
        corretor_id: corretorIdFinal,
      })
      .eq("id", id)
      .eq("administradora_id", administradora_id)
    if (tenantId) queryUpdateCliente = queryUpdateCliente.eq("tenant_id", tenantId)
    const { data, error } = await queryUpdateCliente.select("id, corretor_id").single()

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
    if ((clienteAtual?.corretor_id || null) !== (corretorIdFinal || null)) {
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
