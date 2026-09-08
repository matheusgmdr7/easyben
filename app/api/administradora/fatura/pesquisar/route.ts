import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"
import { carregarVidasImportadasDoGrupo } from "@/lib/vidas-importadas-grupo"
import {
  carregarNomesCorretoresLegado,
  montarMapaCorretorPorCliente,
} from "@/lib/corretor-cliente-vinculo"
import { CorretoresAdministradoraService } from "@/services/corretores-administradora-service"
import {
  faturaCombinaFiltroStatus,
  faturaEstaPaga,
  normalizarStatusFatura,
} from "@/lib/fatura-status"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  numero_fatura: string | null
  valor: number | null
  status: string | null
  vencimento: string | null
  pagamento_data?: string | null
  pagamento_valor?: number | null
}

/** Colunas presentes em produção (sem `referencia`; derivada do vencimento). */
const FATURAS_SELECT_BASE =
  "id, cliente_administradora_id, cliente_nome, numero_fatura, valor, status, vencimento, pagamento_data"
const FATURAS_SELECT_COM_PAGAMENTO_VALOR = `${FATURAS_SELECT_BASE}, pagamento_valor`

const PAGE_SIZE = 1000

const STATUS_UI_PARA_CANONICO: Record<string, string> = {
  liquidado: "paga",
  baixado: "paga",
  cancelado: "cancelada",
  faturado: "pendente",
  processado: "pendente",
  paga: "paga",
  pendente: "pendente",
  atrasada: "atrasada",
  vencida: "vencida",
}

function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message?: unknown }).message)
  }
  return String(e)
}

function referenciaDeVencimento(vencimento: string | null | undefined): string | null {
  const iso = String(vencimento || "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [ano, mes] = iso.split("-")
  return `${mes}/${ano}`
}

function temFiltroPreenchido(params: {
  grupoId?: string
  beneficiario?: string
  corretorId?: string
  referencia?: string
  dataInicio?: string
  dataFim?: string
  pagamentoInicio?: string
  pagamentoFim?: string
  vencimentoInicio?: string
  vencimentoFim?: string
  statusFatura?: string[]
  statusBeneficiario?: string
  somenteVencidas?: boolean
}): boolean {
  if (params.grupoId) return true
  if (params.beneficiario?.trim()) return true
  if (params.corretorId) return true
  if (params.referencia?.trim()) return true
  if (params.dataInicio || params.dataFim) return true
  if (params.pagamentoInicio || params.pagamentoFim) return true
  if (params.vencimentoInicio || params.vencimentoFim) return true
  if (params.statusFatura && params.statusFatura.length > 0) return true
  if (params.statusBeneficiario && params.statusBeneficiario !== "todos") return true
  if (params.somenteVencidas) return true
  return false
}

async function listarClienteIdsDoGrupo(
  grupoId: string,
  administradoraId: string,
  tenantId: string | null | undefined
): Promise<Set<string>> {
  const ids = new Set<string>()
  if (tenantId) {
    const { ids: doGrupo } = await listarClienteAdministradoraIdsENomesDoGrupo(
      grupoId,
      administradoraId,
      tenantId
    )
    for (const id of doGrupo) ids.add(id)
  }
  const vidas = await carregarVidasImportadasDoGrupo(grupoId, administradoraId)
  for (const vida of vidas) {
    const id = String(vida.cliente_administradora_id || "").trim()
    if (id) ids.add(id)
  }
  return ids
}

async function listarClienteIdsPorCorretor(
  corretorId: string,
  administradoraId: string,
  tenantId: string | null | undefined
): Promise<Set<string>> {
  const ids = new Set<string>()
  const CHUNK = 100

  let qCa = supabaseAdmin
    .from("clientes_administradoras")
    .select("id")
    .eq("administradora_id", administradoraId)
    .eq("corretor_id", corretorId)
  if (tenantId) qCa = qCa.eq("tenant_id", tenantId)
  const { data: cas } = await qCa
  for (const row of cas || []) {
    if (row.id) ids.add(String(row.id))
  }

  const { data: propostas } = await supabaseAdmin
    .from("propostas")
    .select("id")
    .eq("corretor_id", corretorId)
  const propostaIds = (propostas || []).map((p) => String(p.id)).filter(Boolean)
  for (let i = 0; i < propostaIds.length; i += CHUNK) {
    const chunk = propostaIds.slice(i, i + CHUNK)
    let qProp = supabaseAdmin
      .from("clientes_administradoras")
      .select("id")
      .eq("administradora_id", administradoraId)
      .in("proposta_id", chunk)
    if (tenantId) qProp = qProp.eq("tenant_id", tenantId)
    const { data: clientesProp } = await qProp
    for (const row of clientesProp || []) {
      if (row.id) ids.add(String(row.id))
    }
  }

  let qV = supabaseAdmin
    .from("vidas_importadas")
    .select("cliente_administradora_id")
    .eq("administradora_id", administradoraId)
    .eq("corretor_id", corretorId)
  if (tenantId) qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  const { data: vidas } = await qV
  for (const row of vidas || []) {
    const id = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
    if (id) ids.add(id)
  }

  return ids
}

async function buscarClienteIdsPorBeneficiario(
  termo: string,
  administradoraId: string,
  tenantId: string | null | undefined
): Promise<Set<string> | null> {
  const t = termo.trim()
  if (!t) return null

  const digitos = t.replace(/\D/g, "")
  const ids = new Set<string>()

  if (digitos.length >= 3) {
    let qV = supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, cpf")
      .eq("administradora_id", administradoraId)
    if (tenantId) qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data: vidas } = await qV
    for (const v of vidas || []) {
      const cpf = String((v as { cpf?: string }).cpf || "").replace(/\D/g, "")
      const cid = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      if (cid && cpf.includes(digitos)) ids.add(cid)
    }
  }

  return ids.size > 0 ? ids : null
}

async function buscarFaturasPaginado(
  administradoraId: string,
  selectCols: string,
  aplicar: (q: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>
): Promise<FaturaRow[]> {
  const acumulado: FaturaRow[] = []
  let from = 0
  while (true) {
    let q = supabaseAdmin
      .from("faturas")
      .select(selectCols)
      .eq("administradora_id", administradoraId)
      .order("vencimento", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    q = aplicar(q) as typeof q
    const { data, error } = await q
    if (error) throw error
    const lista = (data || []) as FaturaRow[]
    acumulado.push(...lista)
    if (lista.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return acumulado
}

function aplicarFiltrosDb(
  q: ReturnType<typeof supabaseAdmin.from>,
  opcoes: {
    vencimentoInicio?: string
    vencimentoFim?: string
    pagamentoInicio?: string
    pagamentoFim?: string
    beneficiario?: string
  }
) {
  if (opcoes.vencimentoInicio) q = q.gte("vencimento", opcoes.vencimentoInicio)
  if (opcoes.vencimentoFim) q = q.lte("vencimento", opcoes.vencimentoFim)
  if (opcoes.pagamentoInicio) q = q.gte("pagamento_data", opcoes.pagamentoInicio)
  if (opcoes.pagamentoFim) q = q.lte("pagamento_data", `${opcoes.pagamentoFim}T23:59:59`)
  if (opcoes.beneficiario) {
    const termo = opcoes.beneficiario
    q = q.or(`cliente_nome.ilike.%${termo}%,numero_fatura.ilike.%${termo}%`)
  }
  return q
}

async function buscarFaturasFiltradas(
  administradoraId: string,
  opcoes: {
    vencimentoInicio?: string
    vencimentoFim?: string
    pagamentoInicio?: string
    pagamentoFim?: string
    beneficiario?: string
    clienteIds?: string[] | null
  }
): Promise<FaturaRow[]> {
  const dbOpts = {
    vencimentoInicio: opcoes.vencimentoInicio,
    vencimentoFim: opcoes.vencimentoFim,
    pagamentoInicio: opcoes.pagamentoInicio,
    pagamentoFim: opcoes.pagamentoFim,
    beneficiario: opcoes.beneficiario,
  }

  async function buscarComSelect(selectCols: string): Promise<FaturaRow[]> {
    if (opcoes.clienteIds && opcoes.clienteIds.length > 0) {
      const CHUNK = 100
      const acumulado: FaturaRow[] = []
      for (let i = 0; i < opcoes.clienteIds.length; i += CHUNK) {
        const chunk = opcoes.clienteIds.slice(i, i + CHUNK)
        try {
          const parte = await buscarFaturasPaginado(administradoraId, selectCols, (q) =>
            aplicarFiltrosDb(q.in("cliente_administradora_id", chunk), dbOpts)
          )
          acumulado.push(...parte)
        } catch (e) {
          const msg = mensagemErro(e)
          if (/column/i.test(msg)) {
            const parte = await buscarFaturasPaginado(administradoraId, FATURAS_SELECT_BASE, (q) => {
              let qq = q.in("cliente_administradora_id", chunk)
              if (dbOpts.vencimentoInicio) qq = qq.gte("vencimento", dbOpts.vencimentoInicio)
              if (dbOpts.vencimentoFim) qq = qq.lte("vencimento", dbOpts.vencimentoFim)
              if (dbOpts.pagamentoInicio) qq = qq.gte("pagamento_data", dbOpts.pagamentoInicio)
              if (dbOpts.pagamentoFim) qq = qq.lte("pagamento_data", `${dbOpts.pagamentoFim}T23:59:59`)
              if (dbOpts.beneficiario) qq = qq.ilike("cliente_nome", `%${dbOpts.beneficiario}%`)
              return qq
            })
            acumulado.push(...parte)
          } else {
            throw e
          }
        }
      }
      return acumulado
    }

    return buscarFaturasPaginado(administradoraId, selectCols, (q) => aplicarFiltrosDb(q, dbOpts))
  }

  const tentativas = [FATURAS_SELECT_COM_PAGAMENTO_VALOR, FATURAS_SELECT_BASE]
  let ultimoErro = ""
  for (const cols of tentativas) {
    try {
      return await buscarComSelect(cols)
    } catch (e) {
      ultimoErro = mensagemErro(e)
      if (!/column/i.test(ultimoErro)) throw e
    }
  }
  throw new Error(ultimoErro || "Erro ao buscar faturas")
}

/**
 * GET /api/administradora/fatura/pesquisar
 * Pesquisa faturas com ao menos um filtro preenchido.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const administradoraId = sp.get("administradora_id")?.trim() || ""
    const grupoId = sp.get("grupo_id")?.trim() || ""
    const beneficiario = sp.get("beneficiario")?.trim() || ""
    const corretorId = sp.get("corretor_id")?.trim() || ""
    const referencia = sp.get("referencia")?.trim() || ""
    const dataInicio = sp.get("data_inicio")?.trim() || ""
    const dataFim = sp.get("data_fim")?.trim() || ""
    const pagamentoInicio = sp.get("pagamento_inicio")?.trim() || ""
    const pagamentoFim = sp.get("pagamento_fim")?.trim() || ""
    const vencimentoInicio = sp.get("vencimento_inicio")?.trim() || dataInicio
    const vencimentoFim = sp.get("vencimento_fim")?.trim() || dataFim
    const statusFatura = (sp.get("status_fatura") || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const statusBeneficiario = sp.get("status_beneficiario")?.trim() || ""
    const somenteVencidas = sp.get("somente_vencidas") === "1"
    const page = Math.max(1, Number(sp.get("page") || 1))
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 50)))

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    if (
      !temFiltroPreenchido({
        grupoId: grupoId && grupoId !== "todos" ? grupoId : "",
        beneficiario,
        corretorId: corretorId && corretorId !== "todos" ? corretorId : "",
        referencia,
        dataInicio,
        dataFim,
        pagamentoInicio,
        pagamentoFim,
        vencimentoInicio,
        vencimentoFim,
        statusFatura,
        statusBeneficiario,
        somenteVencidas,
      })
    ) {
      return NextResponse.json(
        { error: "Preencha ao menos um filtro para pesquisar." },
        { status: 400 }
      )
    }

    const { data: administradora } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantId = administradora?.tenant_id || (await getCurrentTenantId())

    let clienteIdsRestricao: Set<string> | null = null

    if (grupoId && grupoId !== "todos") {
      clienteIdsRestricao = await listarClienteIdsDoGrupo(grupoId, administradoraId, tenantId)
      if (clienteIdsRestricao.size === 0) {
        return NextResponse.json({
          linhas: [],
          total_registros: 0,
          total_valor: 0,
          page,
          total_pages: 0,
        })
      }
    }

    if (corretorId && corretorId !== "todos") {
      const idsCorretor = await listarClienteIdsPorCorretor(corretorId, administradoraId, tenantId)
      if (idsCorretor.size === 0) {
        return NextResponse.json({
          linhas: [],
          total_registros: 0,
          total_valor: 0,
          page,
          total_pages: 0,
        })
      }
      clienteIdsRestricao = clienteIdsRestricao
        ? new Set([...clienteIdsRestricao].filter((id) => idsCorretor.has(id)))
        : idsCorretor
      if (clienteIdsRestricao.size === 0) {
        return NextResponse.json({
          linhas: [],
          total_registros: 0,
          total_valor: 0,
          page,
          total_pages: 0,
        })
      }
    }

    const idsBeneficiario = beneficiario
      ? await buscarClienteIdsPorBeneficiario(beneficiario, administradoraId, tenantId)
      : null

    let faturas: FaturaRow[] = await buscarFaturasFiltradas(administradoraId, {
      vencimentoInicio,
      vencimentoFim,
      pagamentoInicio,
      pagamentoFim,
      beneficiario: beneficiario || undefined,
      clienteIds: clienteIdsRestricao ? Array.from(clienteIdsRestricao) : null,
    })

    if (clienteIdsRestricao) {
      faturas = faturas.filter((f) => {
        const cid = String(f.cliente_administradora_id || "").trim()
        return cid && clienteIdsRestricao!.has(cid)
      })
    }

    if (idsBeneficiario && idsBeneficiario.size > 0) {
      faturas = faturas.filter((f) => {
        const cid = String(f.cliente_administradora_id || "").trim()
        if (cid && idsBeneficiario.has(cid)) return true
        const nome = String(f.cliente_nome || "").toLowerCase()
        return nome.includes(beneficiario.toLowerCase())
      })
    }

    if (referencia) {
      const refNorm = referencia.toLowerCase().replace(/\s/g, "")
      faturas = faturas.filter((f) => {
        const ref = String(referenciaDeVencimento(f.vencimento) || "").toLowerCase().replace(/\s/g, "")
        return ref.includes(refNorm)
      })
    }

    const statusCanonicoFiltro = statusFatura.map((s) => STATUS_UI_PARA_CANONICO[s] || s)
    if (statusCanonicoFiltro.length > 0) {
      faturas = faturas.filter((f) => {
        for (const alvo of statusCanonicoFiltro) {
          if (faturaCombinaFiltroStatus(String(f.status || ""), f.pagamento_data, alvo)) return true
        }
        return false
      })
    }

    if (somenteVencidas) {
      const hoje = new Date().toISOString().slice(0, 10)
      faturas = faturas.filter((f) => {
        const venc = String(f.vencimento || "").slice(0, 10)
        return venc && venc < hoje && !faturaEstaPaga(String(f.status || ""), f.pagamento_data)
      })
    }

    const clienteIds = Array.from(
      new Set(
        faturas.map((f) => String(f.cliente_administradora_id || "").trim()).filter(Boolean)
      )
    )

    const mapaCorretor = await montarMapaCorretorPorCliente(clienteIds, administradoraId, tenantId)
    const corretoresLista = await CorretoresAdministradoraService.listar(administradoraId)
    const nomePorCorretorId = new Map<string, string>()
    for (const c of corretoresLista) nomePorCorretorId.set(c.id, c.nome)

    const idsLegado = Array.from(
      new Set(
        Array.from(mapaCorretor.values()).filter(
          (id): id is string => Boolean(id) && !nomePorCorretorId.has(id!)
        ) as string[]
      )
    )
    const nomesLegado = await carregarNomesCorretoresLegado(idsLegado)
    for (const [id, nome] of nomesLegado) nomePorCorretorId.set(id, nome)

    const mapaAtivoBeneficiario = new Map<string, boolean>()
    if (statusBeneficiario && statusBeneficiario !== "todos" && clienteIds.length > 0) {
      const CHUNK = 100
      for (let i = 0; i < clienteIds.length; i += CHUNK) {
        const chunk = clienteIds.slice(i, i + CHUNK)
        let qV = supabaseAdmin
          .from("vidas_importadas")
          .select("cliente_administradora_id, ativo")
          .eq("administradora_id", administradoraId)
          .in("cliente_administradora_id", chunk)
        if (tenantId) qV = qV.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        const { data: vidas } = await qV
        for (const v of vidas || []) {
          const cid = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
          if (!cid) continue
          const ativo = (v as { ativo?: boolean }).ativo !== false
          const prev = mapaAtivoBeneficiario.get(cid)
          if (prev === undefined) mapaAtivoBeneficiario.set(cid, ativo)
          else if (ativo) mapaAtivoBeneficiario.set(cid, true)
        }
      }
      faturas = faturas.filter((f) => {
        const cid = String(f.cliente_administradora_id || "").trim()
        if (!cid) return statusBeneficiario === "inativo"
        const ativo = mapaAtivoBeneficiario.get(cid)
        if (ativo === undefined) return statusBeneficiario === "ativo"
        return statusBeneficiario === "ativo" ? ativo : !ativo
      })
    }

    const hojeMs = Date.now()
    const linhasCompletas = faturas.map((f) => {
      const cid = String(f.cliente_administradora_id || "").trim()
      const corretorClienteId = cid ? mapaCorretor.get(cid) ?? null : null
      const corretorNome = corretorClienteId
        ? nomePorCorretorId.get(String(corretorClienteId)) || "—"
        : "—"
      const valor = Number(f.valor ?? 0)
      const valorPago = Number(f.pagamento_valor ?? 0)
      const statusNorm = faturaEstaPaga(String(f.status || ""), f.pagamento_data)
        ? "paga"
        : normalizarStatusFatura(String(f.status || ""))
      const vencimento = f.vencimento ? String(f.vencimento).slice(0, 10) : null
      let diasAtraso = 0
      if (vencimento && statusNorm !== "paga") {
        const diff = hojeMs - new Date(`${vencimento}T12:00:00`).getTime()
        diasAtraso = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
      }
      return {
        id: f.id,
        cliente_administradora_id: cid,
        cliente_nome: f.cliente_nome || "Cliente",
        titular: f.cliente_nome || "—",
        beneficiario: f.cliente_nome || "—",
        corretor: corretorNome,
        numero_fatura: f.numero_fatura,
        referencia: referenciaDeVencimento(f.vencimento),
        status: statusNorm || "pendente",
        data_vencimento: vencimento,
        valor_total: valor,
        valor_pago: valorPago,
        coparticipacao: 0,
        valor_liquidado: valorPago > 0 ? valorPago : statusNorm === "paga" ? valor : 0,
        variacao: (valorPago > 0 ? valorPago : statusNorm === "paga" ? valor : 0) - valor,
        data_pagamento: f.pagamento_data ? String(f.pagamento_data).slice(0, 10) : null,
        data_liquidacao: f.pagamento_data ? String(f.pagamento_data).slice(0, 10) : null,
        dias_atraso: diasAtraso,
      }
    })

    const totalRegistros = linhasCompletas.length
    const totalValor = linhasCompletas.reduce((s, l) => s + Number(l.valor_total || 0), 0)
    const totalLiquidado = linhasCompletas.reduce((s, l) => s + Number(l.valor_liquidado || 0), 0)
    const totalPages = Math.max(1, Math.ceil(totalRegistros / limit))
    const offset = (page - 1) * limit
    const linhas = linhasCompletas.slice(offset, offset + limit)

    return NextResponse.json({
      linhas,
      total_registros: totalRegistros,
      total_valor: Number(totalValor.toFixed(2)),
      total_liquidado: Number(totalLiquidado.toFixed(2)),
      page,
      total_pages: totalRegistros === 0 ? 0 : totalPages,
    })
  } catch (e: unknown) {
    console.error("Erro pesquisa faturas:", e)
    return NextResponse.json(
      { error: mensagemErro(e) || "Erro ao pesquisar faturas" },
      { status: 500 }
    )
  }
}
