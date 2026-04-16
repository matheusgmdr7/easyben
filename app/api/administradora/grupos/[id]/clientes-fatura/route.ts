import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export const maxDuration = 60

type RegistroGenerico = Record<string, unknown>

async function carregarVidasGrupo(
  grupoId: string,
  administradoraId: string,
  tenantId?: string
): Promise<Array<RegistroGenerico>> {
  const filtrosBase = (query: any) => query.eq("grupo_id", grupoId).eq("administradora_id", administradoraId)
  const filtrosComTenant = (query: any) => (tenantId ? filtrosBase(query).eq("tenant_id", tenantId) : filtrosBase(query))

  // 1) Select completo
  let fullSelect = await filtrosComTenant(
    supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, cpf, valor_mensal, emails, dados_adicionais, cliente_administradora_id, tipo, cpf_titular, produto_id, plano, idade, acomodacao, ativo")
  )
  if (!fullSelect.error) return (fullSelect.data || []) as Array<RegistroGenerico>

  // 2) Select mínimo com tenant
  let minimalSelect = await filtrosComTenant(
    supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, cpf, tipo, cpf_titular, valor_mensal, cliente_administradora_id, dados_adicionais, emails, produto_id, ativo")
  )
  if (!minimalSelect.error) return (minimalSelect.data || []) as Array<RegistroGenerico>

  // 3) Select mínimo sem tenant
  minimalSelect = await filtrosBase(
    supabaseAdmin
      .from("vidas_importadas")
      .select("id, nome, cpf, tipo, cpf_titular, valor_mensal, cliente_administradora_id, dados_adicionais, emails, produto_id, ativo")
  )
  if (!minimalSelect.error) return (minimalSelect.data || []) as Array<RegistroGenerico>

  // 4) Último fallback: tudo sem depender de colunas específicas
  const starSelect = await filtrosBase(supabaseAdmin.from("vidas_importadas").select("*"))
  if (!starSelect.error) return (starSelect.data || []) as Array<RegistroGenerico>

  return []
}

/**
 * A view vw_clientes_administradoras_completo exige JOIN em propostas; clientes sem proposta ou
 * fora da view precisam de nome vindo direto da proposta ou da vida importada (mesmo cliente_administradora_id).
 */
function resolveClienteNomeECampos(
  ca: RegistroGenerico,
  vw: RegistroGenerico | undefined,
  propostaById: Map<string, RegistroGenerico>,
  nomePorVidaClienteAdmId: Map<string, string>
): { nome: string; email?: string; cpf?: string } {
  const pid = ca.proposta_id != null && String(ca.proposta_id).trim() !== "" ? String(ca.proposta_id) : ""
  const prop = pid ? propostaById.get(pid) : undefined

  let nome = ""
  if (vw?.cliente_nome != null && String(vw.cliente_nome).trim()) {
    nome = String(vw.cliente_nome).trim()
  } else if (prop?.nome != null && String((prop as RegistroGenerico).nome).trim()) {
    nome = String((prop as RegistroGenerico).nome).trim()
  } else {
    const caId = String(ca.id || "")
    if (caId && nomePorVidaClienteAdmId.has(caId)) {
      nome = nomePorVidaClienteAdmId.get(caId) || ""
    }
  }
  if (!nome) nome = "Cliente"

  let email: string | undefined
  if (vw?.cliente_email != null && String(vw.cliente_email).trim()) {
    email = String(vw.cliente_email).trim()
  } else if (prop && (prop as RegistroGenerico).email != null && String((prop as RegistroGenerico).email).trim()) {
    email = String((prop as RegistroGenerico).email).trim()
  }

  let cpf: string | undefined
  if (vw?.cliente_cpf != null && String(vw.cliente_cpf).trim()) {
    cpf = String(vw.cliente_cpf).replace(/\D/g, "")
  } else if (prop && (prop as RegistroGenerico).cpf != null && String((prop as RegistroGenerico).cpf).trim()) {
    cpf = String((prop as RegistroGenerico).cpf).replace(/\D/g, "")
  }

  return { nome, email, cpf }
}

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
    let { data: grupo, error: errGrupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .eq("id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (errGrupo || !grupo) {
      const fallbackGrupo = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome")
        .eq("id", grupoId)
        .eq("administradora_id", administradoraId)
        .maybeSingle()
      grupo = fallbackGrupo.data
      errGrupo = fallbackGrupo.error as any
    }

    if (errGrupo || !grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    let { data: vinculos } = await supabaseAdmin
      .from("clientes_grupos")
      .select("id, cliente_id, cliente_tipo")
      .eq("grupo_id", grupoId)
      .eq("tenant_id", tenantId)

    if (!vinculos || vinculos.length === 0) {
      const fallbackVinculos = await supabaseAdmin
        .from("clientes_grupos")
        .select("id, cliente_id, cliente_tipo")
        .eq("grupo_id", grupoId)
      vinculos = fallbackVinculos.data || []
    }

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

    /** Evita duplicar o mesmo titular: a linha via `vidas_importadas` já soma dependentes; a via vínculo CA só traz valor do cadastro/view. */
    const clienteAdmIdsJaListadosPorVida = new Set<string>()

    const vidas = (await carregarVidasGrupo(grupoId, administradoraId, tenantId)).filter((v) => v?.ativo !== false)
    const tipo = (v: RegistroGenerico) => String((v.tipo ?? "titular") ?? "").toLowerCase()
    const cpfNorm = (v: RegistroGenerico) => (v.cpf ? String(v.cpf).replace(/\D/g, "") : "")

    const produtoIds = Array.from(
      new Set(
        vidas
          .map((v) => String(v?.produto_id || "").trim())
          .filter(Boolean)
      )
    )
    const produtosMap = new Map<string, string>()
    if (produtoIds.length > 0) {
      let produtosRes = await supabaseAdmin
        .from("produtos_contrato_administradora")
        .select("id, nome")
        .in("id", produtoIds)
        .eq("tenant_id", tenantId)
      if (produtosRes.error) {
        produtosRes = await supabaseAdmin
          .from("produtos_contrato_administradora")
          .select("id, nome")
          .in("id", produtoIds)
      }
      for (const p of produtosRes.data || []) {
        produtosMap.set(String((p as any).id), String((p as any).nome || ""))
      }
    }

    /** Nome do titular na vida importada por UUID de clientes_administradoras (fallback quando a view não traz a linha). */
    const nomePorVidaClienteAdmId = new Map<string, string>()
    for (const v of vidas) {
      const va = v as RegistroGenerico
      if (tipo(va) === "dependente") continue
      const caIdRaw = va.cliente_administradora_id
      if (caIdRaw == null || String(caIdRaw).trim() === "") continue
      const key = String(caIdRaw).trim()
      const nm = typeof va.nome === "string" ? va.nome.trim() : ""
      if (nm) nomePorVidaClienteAdmId.set(key, nm)
    }

    // Só listar titulares (dependentes entram no valor/descrição do titular)
    for (const vida of vidas) {
      const vidaAny = vida as RegistroGenerico
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
          const dAny = d as RegistroGenerico
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
      if (!String(clienteAdministradoraId).startsWith("vida:")) {
        clienteAdmIdsJaListadosPorVida.add(String(clienteAdministradoraId))
      }

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
          const nomeProduto = produtosMap.get(String(produtoId))
          if (nomeProduto) planoOuProdutoNome = nomeProduto
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

    const idsClienteAdm = Array.from(
      new Set((vinculos || []).filter((v) => v.cliente_tipo === "cliente_administradora").map((v) => String(v.cliente_id || "")))
    ).filter(Boolean)
    const idsPropostas = Array.from(
      new Set((vinculos || []).filter((v) => v.cliente_tipo === "proposta").map((v) => String(v.cliente_id || "")))
    ).filter(Boolean)

    const carregarClientesAdm = async () => {
      if (idsClienteAdm.length === 0) return [] as Array<RegistroGenerico>
      let res = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, proposta_id, valor_mensal, dia_vencimento")
        .in("id", idsClienteAdm)
        .eq("tenant_id", tenantId)
      if (res.error) {
        res = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id, valor_mensal, dia_vencimento")
          .in("id", idsClienteAdm)
      }
      if (res.error) {
        const fallback = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id, valor_mensal")
          .in("id", idsClienteAdm)
        return (fallback.data || []) as Array<RegistroGenerico>
      }
      return (res.data || []) as Array<RegistroGenerico>
    }

    const carregarClientesAdmPorProposta = async () => {
      if (idsPropostas.length === 0) return [] as Array<RegistroGenerico>
      let res = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, proposta_id, valor_mensal, dia_vencimento")
        .in("proposta_id", idsPropostas)
        .eq("tenant_id", tenantId)
      if (res.error) {
        res = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id, valor_mensal, dia_vencimento")
          .in("proposta_id", idsPropostas)
      }
      if (res.error) {
        const fallback = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, proposta_id, valor_mensal")
          .in("proposta_id", idsPropostas)
        return (fallback.data || []) as Array<RegistroGenerico>
      }
      return (res.data || []) as Array<RegistroGenerico>
    }

    const [clientesAdmDireto, clientesAdmPorProposta] = await Promise.all([
      carregarClientesAdm(),
      carregarClientesAdmPorProposta(),
    ])
    const todosClientesAdm = [...clientesAdmDireto, ...clientesAdmPorProposta]

    const clientesAdmMap = new Map<string, RegistroGenerico>()
    const clientesAdmPorPropostaMap = new Map<string, RegistroGenerico>()
    for (const item of todosClientesAdm) {
      const id = String(item.id || "")
      if (id && !clientesAdmMap.has(id)) clientesAdmMap.set(id, item)
      const propostaId = String(item.proposta_id || "")
      if (propostaId && !clientesAdmPorPropostaMap.has(propostaId)) clientesAdmPorPropostaMap.set(propostaId, item)
    }

    for (const row of resultado) {
      if (row.dia_vencimento) continue
      const key = String(row.cliente_administradora_id || "")
      if (!key || key.startsWith("vida:")) continue
      const ca = clientesAdmMap.get(key)
      const diaRaw = ca?.dia_vencimento
      if (diaRaw == null || String(diaRaw).trim() === "") continue
      const diaNorm = String(diaRaw).replace(/\D/g, "").padStart(2, "0").slice(-2)
      if (diaNorm === "01" || diaNorm === "10") row.dia_vencimento = diaNorm
    }

    const idsParaView = Array.from(clientesAdmMap.keys())
    const viewMap = new Map<string, RegistroGenerico>()
    if (idsParaView.length > 0) {
      const vwRes = await supabaseAdmin
        .from("vw_clientes_administradoras_completo")
        .select("id, cliente_nome, cliente_email, cliente_cpf, valor_mensal")
        .in("id", idsParaView)
      for (const row of vwRes.data || []) {
        const id = String((row as any).id || "")
        if (id) viewMap.set(id, row as RegistroGenerico)
      }
    }

    const propostaIdsUnicos = Array.from(
      new Set(
        todosClientesAdm
          .map((x) => x.proposta_id)
          .filter((x) => x != null && String(x).trim() !== "")
          .map((x) => String(x))
      )
    )
    const propostaById = new Map<string, RegistroGenerico>()
    if (propostaIdsUnicos.length > 0) {
      let pr = await supabaseAdmin
        .from("propostas")
        .select("id, nome, email, cpf")
        .in("id", propostaIdsUnicos)
      if (pr.error) {
        pr = await supabaseAdmin.from("propostas").select("id, nome, email, cpf").in("id", propostaIdsUnicos)
      }
      for (const row of pr.data || []) {
        const id = String((row as RegistroGenerico).id || "")
        if (id) propostaById.set(id, row as RegistroGenerico)
      }
    }

    for (const v of vinculos || []) {
      if (v.cliente_tipo === "cliente_administradora") {
        const ca = clientesAdmMap.get(String(v.cliente_id || ""))
        if (!ca) continue
        const caIdStr = String(ca.id || "")
        if (caIdStr && clienteAdmIdsJaListadosPorVida.has(caIdStr)) continue
        const vw = viewMap.get(String(ca.id || ""))
        const r = resolveClienteNomeECampos(ca, vw, propostaById, nomePorVidaClienteAdmId)
        resultado.push({
          id: String(ca.id || ""),
          cliente_administradora_id: String(ca.id || ""),
          cliente_nome: r.nome,
          cliente_email: r.email,
          cliente_cpf: r.cpf,
          valor_mensal: Number(vw?.valor_mensal ?? ca.valor_mensal ?? 0),
          dia_vencimento: ca.dia_vencimento ? String(ca.dia_vencimento).padStart(2, "0") : undefined,
        })
      }

      if (v.cliente_tipo === "proposta") {
        const ca = clientesAdmPorPropostaMap.get(String(v.cliente_id || ""))
        if (!ca) continue
        const caIdStr = String(ca.id || "")
        if (caIdStr && clienteAdmIdsJaListadosPorVida.has(caIdStr)) continue
        const vw = viewMap.get(String(ca.id || ""))
        const r = resolveClienteNomeECampos(ca, vw, propostaById, nomePorVidaClienteAdmId)
        resultado.push({
          id: String(ca.id || ""),
          cliente_administradora_id: String(ca.id || ""),
          cliente_nome: r.nome,
          cliente_email: r.email,
          cliente_cpf: r.cpf,
          valor_mensal: Number(vw?.valor_mensal ?? ca.valor_mensal ?? 0),
          dia_vencimento: ca.dia_vencimento ? String(ca.dia_vencimento).padStart(2, "0") : undefined,
        })
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
