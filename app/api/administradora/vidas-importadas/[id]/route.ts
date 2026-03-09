import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { obterValorProdutoPorIdade, calcularIdade } from "@/lib/calcular-valor-produto"

const CAMPOS_EDITAVEIS = [
  "nome", "cpf", "nome_mae", "nome_pai", "tipo", "data_nascimento", "idade", "parentesco",
  "cpf_titular", "produto_id", "plano", "acomodacao", "ativo", "sexo", "estado_civil", "identidade", "cns", "observacoes", "corretor_id",
  "cep", "cidade", "estado", "bairro", "logradouro", "numero", "complemento", "telefones", "emails",
] as const

/**
 * GET /api/administradora/vidas-importadas/[id]
 * Busca detalhes de uma vida importada.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabaseAdmin
      .from("vidas_importadas")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar vida importada:", error)
      return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error("Erro GET vida importada:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/administradora/vidas-importadas/[id]
 * Atualiza uma vida importada e registra histórico.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}
    for (const k of CAMPOS_EDITAVEIS) {
      if (k in body) updates[k] = body[k]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    // Sanitize: avoid NaN/invalid types that break Postgres
    if ("idade" in updates && updates.idade != null) {
      const n = typeof updates.idade === "number" ? updates.idade : parseInt(String(updates.idade), 10)
      updates.idade = typeof n === "number" && !isNaN(n) ? n : null
    }
    if ("ativo" in updates) {
      updates.ativo = updates.ativo === true || String(updates.ativo).toLowerCase() === "true"
    }
    if ("produto_id" in updates && (updates.produto_id === "" || updates.produto_id === "_nenhum")) {
      updates.produto_id = null
    }
    if ("cpf_titular" in updates) {
      const v = updates.cpf_titular
      const str = v != null && String(v).trim() !== "" ? String(v).replace(/\D/g, "").slice(0, 14) : ""
      updates.cpf_titular = str.length >= 11 ? str : null
    }
    if ("telefones" in updates && !Array.isArray(updates.telefones)) {
      updates.telefones = Array.isArray(body.telefones) ? body.telefones : []
    }
    if ("emails" in updates && !Array.isArray(updates.emails)) {
      updates.emails = Array.isArray(body.emails) ? body.emails : []
    }

    const administradoraId = typeof body?.administradora_id === "string" ? body.administradora_id : ""
    let tenantId: string | null = null
    if (administradoraId) {
      const { data: adm } = await supabaseAdmin
        .from("administradoras")
        .select("tenant_id")
        .eq("id", administradoraId)
        .maybeSingle()
      tenantId = adm?.tenant_id || null
    }
    if (!tenantId) {
      tenantId = await getCurrentTenantId()
    }

    let queryAtual = supabaseAdmin
      .from("vidas_importadas")
      .select("*")
      .eq("id", id)
    if (tenantId) queryAtual = queryAtual.eq("tenant_id", tenantId)
    if (administradoraId) queryAtual = queryAtual.eq("administradora_id", administradoraId)
    const { data: atual } = await queryAtual.maybeSingle()

    if (!atual) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const alteracoes: Record<string, { antes: unknown; depois: unknown }> = {}
    for (const k of Object.keys(updates) as (typeof CAMPOS_EDITAVEIS)[number][]) {
      const vAtual = atual[k]
      const vNovo = updates[k]
      if (JSON.stringify(vAtual) !== JSON.stringify(vNovo)) {
        alteracoes[k] = { antes: vAtual ?? null, depois: vNovo ?? null }
      }
    }

    const precisaRecalcularValor = "produto_id" in updates || "data_nascimento" in updates || "idade" in updates || "acomodacao" in updates
    if (precisaRecalcularValor) {
      try {
        const merge = { ...atual, ...updates }
        const pid = merge.produto_id
        const dataNasc = merge.data_nascimento
        const idadeInput = merge.idade
        const idade = typeof idadeInput === "number" && !isNaN(idadeInput)
          ? idadeInput
          : idadeInput != null && String(idadeInput).trim() !== ""
            ? parseInt(String(idadeInput), 10)
            : calcularIdade(dataNasc)
        const acomodacao = (merge.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria") as "Enfermaria" | "Apartamento"
        if (pid && idade != null && !isNaN(idade)) {
          const novoValor = await obterValorProdutoPorIdade(String(pid), idade, tenantId, acomodacao)
          updates.valor_mensal = novoValor
        } else {
          updates.valor_mensal = null
        }
      } catch (err) {
        console.error("Recálculo de valor_mensal ignorado:", err)
        // Segue com o update sem alterar valor_mensal
      }
    }

    let queryUpdate = supabaseAdmin
      .from("vidas_importadas")
      .update(updates)
      .eq("id", id)
    if (tenantId) queryUpdate = queryUpdate.eq("tenant_id", tenantId)
    if (administradoraId) queryUpdate = queryUpdate.eq("administradora_id", administradoraId)
    const { data, error } = await queryUpdate.select().maybeSingle()

    if (error) {
      console.error("Erro ao atualizar vida importada:", error)
      const msg = error?.message ?? "Erro ao atualizar"
      if (typeof msg === "string" && (msg.includes("Could not find the") || msg.includes("column") && msg.includes("schema cache"))) {
        return NextResponse.json(
          {
            error: "Coluna inexistente na tabela vidas_importadas. Execute no Supabase (SQL Editor) o script: scripts/adicionar-colunas-completas-vidas-importadas.sql ou scripts/adicionar-coluna-bairro-vidas-importadas.sql",
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    if (Object.keys(alteracoes).length > 0) {
      try {
        await supabaseAdmin.from("vidas_importadas_historico").insert({
          vida_id: id,
          tenant_id: tenantId,
          alteracoes,
        })
      } catch {
        // Tabela historico pode não existir; não quebra a atualização
      }
    }

    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error("Erro PUT vida importada:", e)
    const msg = e instanceof Error ? e.message : "Erro ao atualizar"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * DELETE /api/administradora/vidas-importadas/[id]
 * Remove uma vida importada.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    }

    const tenantId = await getCurrentTenantId()

    const { error } = await supabaseAdmin
      .from("vidas_importadas")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)

    if (error) {
      console.error("Erro ao remover vida importada:", error)
      return NextResponse.json({ error: "Erro ao remover" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Erro DELETE vida importada:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao remover" },
      { status: 500 }
    )
  }
}
