import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

/**
 * GET /api/administradora/grupos/[id]/clientes-fatura?administradora_id=xxx
 * Retorna apenas TITULARES do grupo para geração de fatura (dependentes ficam vinculados ao titular).
 * Para vidas importadas: valor_mensal = titular + soma dos dependentes vinculados (cpf_titular).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grupoId = params.id
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId || !grupoId) {
      return NextResponse.json(
        { error: "administradora_id e grupo_id são obrigatórios" },
        { status: 400 }
      )
    }

    // Priorizar tenant da administradora (garante contexto correto em multi-tenant)
    let tenantId: string
    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()
    if (adm?.tenant_id) {
      tenantId = adm.tenant_id
    } else {
      tenantId = await getCurrentTenantId()
    }

    // Garantir que o grupo pertence à administradora
    const { data: grupo, error: errGrupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .eq("id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (errGrupo || !grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    const { data: vinculos } = await supabaseAdmin
      .from("clientes_grupos")
      .select("id, cliente_id, cliente_tipo")
      .eq("grupo_id", grupoId)
      .eq("tenant_id", tenantId)

    const resultado: Array<{
      id: string
      cliente_nome: string
      cliente_email?: string
      cliente_cpf?: string
      valor_mensal: number
      cliente_administradora_id: string
      produto_nome?: string
      dependentes_nomes?: string[]
      dia_vencimento?: string
    }> = []

    // Vidas importadas: apenas TITULARES; valor = titular + dependentes vinculados (cpf_titular)
    let vidasGrupo: Array<Record<string, unknown>> | null = null
    const fullSelect = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, cpf, valor_mensal, emails, dados_adicionais, cliente_administradora_id, tipo, cpf_titular, produto_id, plano, idade, acomodacao, ativo")
      .eq("grupo_id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
    if (!fullSelect.error) {
      vidasGrupo = fullSelect.data as Array<Record<string, unknown>>
    } else {
      const minimalSelect = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, nome, cpf, tipo, cpf_titular, valor_mensal, cliente_administradora_id, plano, idade, acomodacao, produto_id, ativo")
        .eq("grupo_id", grupoId)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
      if (!minimalSelect.error) vidasGrupo = minimalSelect.data as Array<Record<string, unknown>>
    }

    const vidas = (vidasGrupo || []).filter((v) => (v as Record<string, unknown>)?.ativo !== false)
    const tipo = (v: Record<string, unknown>) => String((v.tipo ?? "titular") ?? "").toLowerCase()
    const cpfNorm = (v: Record<string, unknown>) => (v.cpf ? String(v.cpf).replace(/\D/g, "") : "")

    // Só listar titulares (dependentes entram no valor/descrição do titular)
    for (const vida of vidas) {
      const vidaAny = vida as Record<string, unknown>
      if (tipo(vidaAny) === "dependente") continue

      const nome = (vidaAny.nome as string) || "Beneficiário"
      const cpf = cpfNorm(vidaAny) || undefined
      let email: string | undefined
      const emls = vidaAny.emails
      if (Array.isArray(emls) && emls[0]) email = String(emls[0])
      else {
        const adic = vidaAny.dados_adicionais
        if (adic && typeof adic === "object") {
          const rec = adic as Record<string, unknown>
          const e = rec["E-mail"] ?? rec.E_mail ?? rec.Email ?? rec.email
          if (e != null) email = String(e)
        }
      }
      let valorMensal = Number(vidaAny.valor_mensal ?? 0)
      const dependentesNomes: string[] = []
      if (cpf) {
        for (const d of vidas) {
          const dAny = d as Record<string, unknown>
          if (tipo(dAny) !== "dependente") continue
          const cpfTit = String((dAny.cpf_titular ?? "")).replace(/\D/g, "")
          if (cpfTit === cpf) {
            valorMensal += Number(dAny.valor_mensal ?? 0)
            const nm = (dAny.nome as string) || ""
            if (nm) dependentesNomes.push(nm)
          }
        }
      }
      const caId = vidaAny.cliente_administradora_id
      const clienteAdministradoraId = caId != null && caId !== "" ? String(caId) : `vida:${vida.id}`

      // Plano: usar coluna nativa "plano" (cadastrado na importação) ou Dados adicionais > Plano; fallback para nome do produto do contrato
      let planoOuProdutoNome: string | undefined
      let diaVencimento: string | undefined
      if (vidaAny.plano != null && String(vidaAny.plano).trim() !== "") {
        planoOuProdutoNome = String(vidaAny.plano).trim()
      } else {
        const adic = vidaAny.dados_adicionais
        if (adic && typeof adic === "object") {
          const rec = adic as Record<string, unknown>
          const pl = rec["Plano"] ?? rec.plano
          if (pl != null && String(pl).trim() !== "") planoOuProdutoNome = String(pl).trim()
        }
      }
      if (!planoOuProdutoNome) {
        const produtoId = vidaAny.produto_id
        if (produtoId) {
          const { data: prod } = await supabaseAdmin
            .from("produtos_contrato_administradora")
            .select("nome")
            .eq("id", produtoId)
            .maybeSingle()
          if (prod && (prod as any).nome) planoOuProdutoNome = (prod as any).nome
        }
      }
      {
        const adic = vidaAny.dados_adicionais
        if (adic && typeof adic === "object") {
          const rec = adic as Record<string, unknown>
          const diaRaw = rec["dia_vencimento"] ?? rec["Dia Vencimento"] ?? rec["diaVencimento"]
          const diaNorm = String(diaRaw || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
          if (diaNorm === "01" || diaNorm === "10") diaVencimento = diaNorm
        }
      }

      resultado.push({
        id: vida.id as string,
        cliente_administradora_id: clienteAdministradoraId,
        cliente_nome: nome,
        cliente_email: email,
        cliente_cpf: cpf,
        valor_mensal: valorMensal,
        produto_nome: planoOuProdutoNome,
        dependentes_nomes: dependentesNomes.length > 0 ? dependentesNomes : undefined,
        dia_vencimento: diaVencimento,
      })
    }

    for (const v of vinculos || []) {
      if (v.cliente_tipo === "cliente_administradora") {
        const { data: ca } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, valor_mensal, dia_vencimento")
          .eq("id", v.cliente_id)
          .eq("tenant_id", tenantId)
          .maybeSingle()

        const { data: vw } = await supabaseAdmin
          .from("vw_clientes_administradoras_completo")
          .select("cliente_nome, cliente_email, cliente_cpf, valor_mensal")
          .eq("id", v.cliente_id)
          .eq("tenant_id", tenantId)
          .maybeSingle()

        if (ca) {
          resultado.push({
            id: ca.id,
            cliente_administradora_id: ca.id,
            cliente_nome: (vw as any)?.cliente_nome || "Cliente",
            cliente_email: (vw as any)?.cliente_email,
            cliente_cpf: (vw as any)?.cliente_cpf,
            valor_mensal: Number((vw as any)?.valor_mensal ?? ca.valor_mensal ?? 0),
            dia_vencimento: (ca as any)?.dia_vencimento ? String((ca as any).dia_vencimento).padStart(2, "0") : undefined,
          })
        }
        continue
      }

      if (v.cliente_tipo === "proposta") {
        const { data: clienteAdm } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, valor_mensal, dia_vencimento")
          .eq("proposta_id", v.cliente_id)
          .eq("tenant_id", tenantId)
          .maybeSingle()

        if (!clienteAdm) continue

        const { data: vw } = await supabaseAdmin
          .from("vw_clientes_administradoras_completo")
          .select("cliente_nome, cliente_email, cliente_cpf, valor_mensal")
          .eq("id", clienteAdm.id)
          .eq("tenant_id", tenantId)
          .maybeSingle()

        resultado.push({
          id: clienteAdm.id,
          cliente_administradora_id: clienteAdm.id,
          cliente_nome: (vw as any)?.cliente_nome || "Cliente",
          cliente_email: (vw as any)?.cliente_email,
          cliente_cpf: (vw as any)?.cliente_cpf,
          valor_mensal: Number((vw as any)?.valor_mensal ?? clienteAdm.valor_mensal ?? 0),
          dia_vencimento: (clienteAdm as any)?.dia_vencimento ? String((clienteAdm as any).dia_vencimento).padStart(2, "0") : undefined,
        })
        continue
      }
    }

    return NextResponse.json(resultado)
  } catch (e: unknown) {
    console.error("Erro clientes-fatura grupo:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar clientes do grupo" },
      { status: 500 }
    )
  }
}
