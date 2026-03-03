import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"

function normalizarCpf(cpf: string | null): string {
  return String(cpf || "").replace(/\D/g, "")
}

function formatarCpfMascara(cpf: string): string {
  const d = normalizarCpf(cpf)
  if (d.length !== 11) return d
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function isUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim())
}

async function buscarProdutoNome(produtoId: string | null | undefined, tenantId: string): Promise<string | null> {
  if (!produtoId) return null
  const { data } = await supabaseAdmin
    .from("produtos_contrato_administradora")
    .select("nome")
    .eq("id", produtoId)
    .eq("tenant_id", tenantId)
    .maybeSingle()
  return data?.nome || null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = String(searchParams.get("tenant_slug") || "").trim().toLowerCase()
    const cpf = normalizarCpf(searchParams.get("cpf"))

    if (!tenantSlug) {
      return NextResponse.json({ error: "tenant_slug é obrigatório." }, { status: 400 })
    }
    if (cpf.length !== 11) {
      return NextResponse.json({ error: "CPF inválido. Informe 11 dígitos." }, { status: 400 })
    }

    const slugSemHifen = tenantSlug.replace(/-/g, "")
    const slugComHifenNormalizado = tenantSlug
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    const slugsCandidatos = Array.from(new Set([tenantSlug, slugSemHifen, slugComHifenNormalizado].filter(Boolean)))

    const { data: tenantRows, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, nome, nome_marca, slug, status")
      .in("slug", slugsCandidatos)
      .eq("status", "ativo")
      .limit(1)

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message || "Erro ao validar plataforma." }, { status: 500 })
    }
    const tenant = Array.isArray(tenantRows) ? tenantRows[0] : null
    if (!tenant?.id) {
      return NextResponse.json({ error: "Plataforma não encontrada." }, { status: 404 })
    }

    const tenantId = tenant.id as string

    const [{ data: vida }, { data: propostaDireta }] = await Promise.all([
      supabaseAdmin
        .from("vidas_importadas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("cpf", cpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("propostas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("cpf", cpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!vida && !propostaDireta) {
      return NextResponse.json({ error: "Cliente não encontrado para este CPF nesta plataforma." }, { status: 404 })
    }

    let proposta = propostaDireta || null
    let clienteAdm: any = null
    let clienteAdmId: string | null = null

    if (vida?.cliente_administradora_id) {
      clienteAdmId = String(vida.cliente_administradora_id)
    }

    if (!proposta) {
      const { data: propostaPorCpf } = await supabaseAdmin
        .from("propostas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("cpf", cpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      proposta = propostaPorCpf || null
    }

    if (!clienteAdmId && proposta?.id) {
      const { data: clienteAdmPorProposta } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, administradora_id, proposta_id, status, valor_mensal, numero_contrato, data_vigencia")
        .eq("tenant_id", tenantId)
        .eq("proposta_id", proposta.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (clienteAdmPorProposta?.id) {
        clienteAdmId = String(clienteAdmPorProposta.id)
        clienteAdm = clienteAdmPorProposta
      }
    }

    if (clienteAdmId && !clienteAdm) {
      const { data: clienteAdmDireto } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, administradora_id, proposta_id, status, valor_mensal, numero_contrato, data_vigencia")
        .eq("tenant_id", tenantId)
        .eq("id", clienteAdmId)
        .maybeSingle()
      clienteAdm = clienteAdmDireto || null
    }

    let grupoNome: string | null = null
    if (vida?.grupo_id) {
      const { data: grupo } = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("nome")
        .eq("tenant_id", tenantId)
        .eq("id", vida.grupo_id)
        .maybeSingle()
      grupoNome = grupo?.nome || null
    }

    const produtoId = (vida?.produto_id || proposta?.produto_id || null) as string | null
    const produtoNomeDb = await buscarProdutoNome(produtoId, tenantId)
    const produtoNome =
      produtoNomeDb ||
      proposta?.produto ||
      proposta?.plano ||
      proposta?.produto_nome ||
      null

    // Busca de faturas alinhada ao fluxo administrativo:
    // - usa cliente_administradora_id válido (UUID)
    // - considera múltiplos vínculos possíveis do mesmo CPF no tenant
    let faturas: any[] = []
    const idsFatura = new Set<string>()
    if (isUuid(clienteAdmId)) idsFatura.add(String(clienteAdmId))

    const cpfMascarado = formatarCpfMascara(cpf)
    const [{ data: vidasCpfRows }, { data: clientesAdmCpfRows }] = await Promise.all([
      supabaseAdmin
        .from("vidas_importadas")
        .select("id, cliente_administradora_id")
        .eq("tenant_id", tenantId)
        .in("cpf", [cpf, cpfMascarado])
        .limit(200),
      supabaseAdmin
        .from("vw_clientes_administradoras_completo")
        .select("id, administradora_id")
        .eq("tenant_id", tenantId)
        .in("cliente_cpf", [cpf, cpfMascarado])
        .limit(200),
    ])

    const administradoraIdsFatura = new Set<string>()
    if (clienteAdm?.administradora_id) administradoraIdsFatura.add(String(clienteAdm.administradora_id))

    for (const v of vidasCpfRows || []) {
      // Mantém apenas IDs UUID para evitar erro quando a coluna é do tipo uuid.
      if (isUuid(v?.cliente_administradora_id)) idsFatura.add(String(v.cliente_administradora_id))
    }
    for (const ca of clientesAdmCpfRows || []) {
      if (isUuid(ca?.id)) idsFatura.add(String(ca.id))
      if (ca?.administradora_id) administradoraIdsFatura.add(String(ca.administradora_id))
    }

    if (idsFatura.size > 0) {
      let query = supabaseAdmin
        .from("faturas")
        .select(
          "id, numero_fatura, valor, vencimento, status, pagamento_data, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id, cliente_administradora_id, administradora_id"
        )
        .eq("tenant_id", tenantId)
        .in("cliente_administradora_id", Array.from(idsFatura))
        .order("vencimento", { ascending: false })
        .limit(100)

      if (administradoraIdsFatura.size > 0) {
        query = query.in("administradora_id", Array.from(administradoraIdsFatura))
      }

      const { data: dataFaturas, error: faturasError } = await query
      if (faturasError) {
        console.error("Erro ao buscar faturas no dashboard cliente:", faturasError)
      } else {
        faturas = (dataFaturas || []).map((f: any) => ({
          id: f.id,
          numero_fatura: f.numero_fatura,
          valor: f.valor,
          valor_total: Number(f.valor ?? 0),
          vencimento: f.vencimento,
          data_vencimento: f.vencimento,
          status: f.status,
          pagamento_data: f.pagamento_data,
          asaas_boleto_url: f.asaas_boleto_url,
          boleto_url: f.boleto_url,
          boleto_link: getBoletoLinkFromFatura(f),
          cliente_administradora_id: f.cliente_administradora_id,
          administradora_id: f.administradora_id,
        }))
      }
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        nome_marca: tenant.nome_marca,
        slug: tenant.slug,
      },
      cliente: {
        cpf,
        nome: vida?.nome || proposta?.nome || null,
        tipo: vida?.tipo || "titular",
        produto: produtoNome,
        grupo_nome: grupoNome,
        numero_contrato: clienteAdm?.numero_contrato || null,
        data_vigencia: clienteAdm?.data_vigencia || null,
        valor_mensal: clienteAdm?.valor_mensal ?? null,
        status: clienteAdm?.status || proposta?.status || (vida?.ativo === false ? "cancelado" : "ativo"),
      },
      faturas,
    })
  } catch (e: unknown) {
    console.error("Erro no dashboard do cliente:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao consultar cliente." },
      { status: 500 }
    )
  }
}

