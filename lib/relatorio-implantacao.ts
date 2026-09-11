import { supabaseAdmin } from "@/lib/supabase-admin"
import { montarMapaCorretorPorCliente } from "@/lib/corretor-cliente-vinculo"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"
import { faturaEstaPaga } from "@/lib/fatura-status"
import { extrairMatriculaDeDados } from "@/lib/matricula-beneficiario"
import { primeiroTelefoneDeVida, resolverTelefoneClienteCobranca } from "@/lib/telefone-cliente-cobranca"

export type LinhaRelatorioImplantacao = {
  fatura_id: string
  vida_id: string | null
  tipo_beneficiario: "titular" | "dependente"
  titular_nome: string | null
  cliente_administradora_id: string
  cliente_nome: string
  cpf: string | null
  telefone: string | null
  grupo_nome: string | null
  corretora: string | null
  numero_fatura: string | null
  valor: number | null
  vencimento: string | null
  pagamento_data: string | null
  pagamento_valor: number | null
  primeiro_boleto: boolean
  pago: boolean
  implantado: boolean
  numero_carteirinha: string | null
  data_vinculacao: string | null
  fatura_created_at: string | null
  vida_created_at: string | null
}

export type ResultadoRelatorioImplantacao = {
  linhas: LinhaRelatorioImplantacao[]
  total_registros: number
  total_titulares: number
  total_dependentes: number
  total_pagos: number
  total_aguardando_pagamento: number
  total_implantados: number
  total_aguardando_implantacao: number
  /** @deprecated Use total_registros */
  total_primeiro_boleto: number
  periodo: { inicio: string; fim: string }
}

const FATURAS_SELECT =
  "id, cliente_administradora_id, cliente_nome, cliente_telefone, cliente_id, numero_fatura, valor, vencimento, pagamento_data, pagamento_valor, status, created_at"

const VIDAS_SELECT =
  "id, nome, cpf, cpf_titular, tipo, grupo_id, corretor_id, cliente_administradora_id, telefones, dados_adicionais, ativo, created_at"

type VidaRow = {
  id: string
  nome: string | null
  cpf: string | null
  cpf_titular: string | null
  tipo: string | null
  grupo_id: string | null
  corretor_id: string | null
  cliente_administradora_id: string | null
  telefones: unknown
  dados_adicionais: unknown
  ativo: boolean | null
  created_at: string | null
}

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  cliente_telefone: string | null
  cliente_id?: string | null
  numero_fatura: string | null
  valor: number | null
  vencimento: string | null
  pagamento_data: string | null
  pagamento_valor: number | null
  status: string | null
  created_at: string | null
}

function primeiroDiaMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`
}

function ultimoDiaMes(ano: number, mes: number): string {
  const data = new Date(Date.UTC(ano, mes, 0))
  return `${ano}-${String(mes).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`
}

function dataPagamentoIso(raw: unknown): string | null {
  const s = String(raw || "").trim()
  if (!s) return null
  return s.slice(0, 10)
}

function normalizarCpf(raw: unknown): string | null {
  const digits = String(raw || "").replace(/\D/g, "")
  if (digits.length === 11) return digits
  if (digits.length >= 10) return digits.slice(-11).padStart(11, "0")
  return null
}

function tipoVida(v: VidaRow): "titular" | "dependente" {
  return String(v.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular"
}

/** Implantado = flag explícita ou número de carteirinha preenchido. */
export function clienteEstaImplantado(params: {
  implantado?: boolean | null
  numero_carteirinha?: string | null
}): boolean {
  if (params.implantado === true) return true
  return Boolean(String(params.numero_carteirinha || "").trim())
}

function vidaEstaImplantada(vida: VidaRow, cliente?: { implantado?: boolean; numero_carteirinha?: string | null }) {
  const matriculaVida = extrairMatriculaDeDados(vida as Record<string, unknown>)
  if (matriculaVida) return true
  if (cliente) return clienteEstaImplantado(cliente)
  return false
}

async function carregarPaginado<T>(
  fetchPage: (offset: number, pageSize: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await fetchPage(offset, pageSize)
    if (error) throw new Error(error.message)
    const chunk = data || []
    rows.push(...chunk)
    if (chunk.length < pageSize) break
    offset += pageSize
    if (offset > 100_000) break
  }
  return rows
}

async function carregarVidasInseridasNoMes(
  administradoraId: string,
  inicioMes: string,
  fimMes: string,
  tenantId?: string | null
): Promise<VidaRow[]> {
  return carregarPaginado(async (offset, pageSize) => {
    let q = supabaseAdmin
      .from("vidas_importadas")
      .select(VIDAS_SELECT)
      .eq("administradora_id", administradoraId)
      .gte("created_at", `${inicioMes}T00:00:00.000Z`)
      .lte("created_at", `${fimMes}T23:59:59.999Z`)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    return q
  })
}

async function carregarCpfsComVidaAnterior(
  administradoraId: string,
  cpfs: string[],
  inicioMes: string,
  tenantId?: string | null
): Promise<Set<string>> {
  const anteriores = new Set<string>()
  if (!cpfs.length) return anteriores

  const CHUNK = 100
  for (let i = 0; i < cpfs.length; i += CHUNK) {
    const chunk = cpfs.slice(i, i + CHUNK)
    let q = supabaseAdmin
      .from("vidas_importadas")
      .select("cpf")
      .eq("administradora_id", administradoraId)
      .in("cpf", chunk)
      .lt("created_at", `${inicioMes}T00:00:00.000Z`)
    if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data } = await q
    for (const row of data || []) {
      const cpf = normalizarCpf((row as { cpf?: string }).cpf)
      if (cpf) anteriores.add(cpf)
    }
  }
  return anteriores
}

async function carregarFaturasGeradasNoPeriodo(
  administradoraId: string,
  inicio: string,
  fim: string
): Promise<FaturaRow[]> {
  return carregarPaginado(async (offset, pageSize) => {
    return supabaseAdmin
      .from("faturas")
      .select(FATURAS_SELECT)
      .eq("administradora_id", administradoraId)
      .gte("created_at", `${inicio}T00:00:00.000Z`)
      .lte("created_at", `${fim}T23:59:59.999Z`)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1)
  })
}

async function clientesComFaturaAnterior(
  administradoraId: string,
  clienteIds: string[],
  inicioMes: string
): Promise<Set<string>> {
  const comAnterior = new Set<string>()
  if (!clienteIds.length) return comAnterior

  const CHUNK = 200
  for (let i = 0; i < clienteIds.length; i += CHUNK) {
    const chunk = clienteIds.slice(i, i + CHUNK)
    const { data } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", chunk)
      .lt("created_at", `${inicioMes}T00:00:00.000Z`)

    for (const row of data || []) {
      const cid = String(row.cliente_administradora_id || "").trim()
      if (cid) comAnterior.add(cid)
    }
  }
  return comAnterior
}

/**
 * Relatório de implantação: beneficiários inseridos no mês (vidas_importadas).
 * Titular: 1ª vida no mês + no máximo 1 fatura no mês, sem fatura anterior.
 * Dependente: vida inserida no mês vinculada a titular também novo no mês.
 */
export async function gerarRelatorioImplantacao(params: {
  administradoraId: string
  tenantId?: string | null
  ano: number
  mes: number
  dia?: number | null
  dataInicio?: string | null
  dataFim?: string | null
  grupoId?: string | null
  corretorId?: string | null
  somentePrimeiroBoleto?: boolean
  implantado?: "todos" | "sim" | "nao"
}): Promise<ResultadoRelatorioImplantacao> {
  const { administradoraId, tenantId, ano, mes } = params
  const inicioMes = primeiroDiaMes(ano, mes)
  const fimMes = ultimoDiaMes(ano, mes)

  const inicioInformado = dataPagamentoIso(params.dataInicio)
  const fimInformado = dataPagamentoIso(params.dataFim)
  let inicioPagamento: string | null = null
  let fimPagamento: string | null = null
  if (inicioInformado && fimInformado) {
    inicioPagamento = inicioInformado <= fimInformado ? inicioInformado : fimInformado
    fimPagamento = inicioInformado <= fimInformado ? fimInformado : inicioInformado
  } else if (params.dia) {
    inicioPagamento = `${ano}-${String(mes).padStart(2, "0")}-${String(params.dia).padStart(2, "0")}`
    fimPagamento = inicioPagamento
  }

  const vidasNoMes = (await carregarVidasInseridasNoMes(
    administradoraId,
    inicioMes,
    fimMes,
    tenantId
  )).filter((v) => v.ativo !== false)

  const cpfsNoMes = Array.from(
    new Set(vidasNoMes.map((v) => normalizarCpf(v.cpf)).filter(Boolean) as string[])
  )
  const cpfsComVidaAnterior = await carregarCpfsComVidaAnterior(
    administradoraId,
    cpfsNoMes,
    inicioMes,
    tenantId
  )

  const faturasNoMes = await carregarFaturasGeradasNoPeriodo(administradoraId, inicioMes, fimMes)
  const faturasPorCliente = new Map<string, FaturaRow[]>()
  for (const f of faturasNoMes) {
    const cid = String(f.cliente_administradora_id || "").trim()
    if (!cid) continue
    const arr = faturasPorCliente.get(cid) || []
    arr.push(f)
    faturasPorCliente.set(cid, arr)
  }

  const clienteIdsTitulares = Array.from(
    new Set(
      vidasNoMes
        .filter((v) => tipoVida(v) === "titular")
        .map((v) => String(v.cliente_administradora_id || "").trim())
        .filter(Boolean)
    )
  )
  const comFaturaAnterior = await clientesComFaturaAnterior(
    administradoraId,
    clienteIdsTitulares,
    inicioMes
  )

  let grupoIdsFiltro: Set<string> | null = null
  if (params.grupoId?.trim()) {
    grupoIdsFiltro = new Set([params.grupoId.trim()])
  }

  const titularesNovos = new Map<string, VidaRow>()
  for (const vida of vidasNoMes) {
    if (tipoVida(vida) !== "titular") continue
    const cpf = normalizarCpf(vida.cpf)
    if (!cpf || cpfsComVidaAnterior.has(cpf)) continue
    if (grupoIdsFiltro && !grupoIdsFiltro.has(String(vida.grupo_id || ""))) continue

    const caId = String(vida.cliente_administradora_id || "").trim()
    const faturasCliente = caId ? faturasPorCliente.get(caId) || [] : []
    if (caId && comFaturaAnterior.has(caId)) continue
    if (faturasCliente.length > 1) continue

    titularesNovos.set(cpf, vida)
  }

  const cpfsTitularesNovos = new Set(titularesNovos.keys())

  const dependentesNovos: VidaRow[] = []
  for (const vida of vidasNoMes) {
    if (tipoVida(vida) !== "dependente") continue
    const cpf = normalizarCpf(vida.cpf)
    if (!cpf || cpfsComVidaAnterior.has(cpf)) continue
    const cpfTit = normalizarCpf(vida.cpf_titular)
    if (!cpfTit || !cpfsTitularesNovos.has(cpfTit)) continue
    if (grupoIdsFiltro && !grupoIdsFiltro.has(String(vida.grupo_id || ""))) continue
    dependentesNovos.push(vida)
  }

  const clienteIds = Array.from(
    new Set(
      [...titularesNovos.values()]
        .map((v) => String(v.cliente_administradora_id || "").trim())
        .filter(Boolean)
    )
  )

  const mapaCorretor = await montarMapaCorretorPorCliente(clienteIds, administradoraId, tenantId)

  const corretorIdsVida = Array.from(
    new Set(
      [...titularesNovos.values(), ...dependentesNovos]
        .map((v) => String(v.corretor_id || "").trim())
        .filter(Boolean)
    )
  )
  const corretorNomes = new Map<string, string>()
  const todosCorretorIds = Array.from(
    new Set([...corretorIdsVida, ...Array.from(mapaCorretor.values()).filter(Boolean)])
  )
  if (todosCorretorIds.length > 0) {
    const { data: corretores } = await supabaseAdmin
      .from("corretores_administradora")
      .select("id, nome")
      .in("id", todosCorretorIds)
    for (const c of corretores || []) {
      corretorNomes.set(String(c.id), String(c.nome || "—"))
    }
  }

  const clientesMap = new Map<
    string,
    { implantado: boolean; numero_carteirinha: string | null; data_vinculacao: string | null }
  >()
  if (clienteIds.length > 0) {
    for (let i = 0; i < clienteIds.length; i += 500) {
      const lote = clienteIds.slice(i, i + 500)
      const { data: clientes } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, implantado, numero_carteirinha, data_vinculacao")
        .in("id", lote)
      for (const c of clientes || []) {
        clientesMap.set(String(c.id), {
          implantado: Boolean(c.implantado),
          numero_carteirinha: c.numero_carteirinha ? String(c.numero_carteirinha) : null,
          data_vinculacao: c.data_vinculacao ? String(c.data_vinculacao).slice(0, 10) : null,
        })
      }
    }
  }

  const grupoIds = new Set<string>()
  for (const v of [...titularesNovos.values(), ...dependentesNovos]) {
    const gid = String(v.grupo_id || "").trim()
    if (gid) grupoIds.add(gid)
  }
  const nomeGrupoPorId = new Map<string, string>()
  if (grupoIds.size > 0) {
    const { data: grupos } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .in("id", Array.from(grupoIds))
    for (const g of grupos || []) {
      nomeGrupoPorId.set(String(g.id), String(g.nome || ""))
    }
  }

  function resolverCorretor(vida: VidaRow, caId: string | null): string {
    const corVida = String(vida.corretor_id || "").trim()
    if (corVida && corretorNomes.has(corVida)) return corretorNomes.get(corVida)!
    if (caId) {
      const corCa = mapaCorretor.get(caId)
      if (corCa && corretorNomes.has(corCa)) return corretorNomes.get(corCa)!
    }
    return "—"
  }

  function passaFiltrosPagamento(pago: boolean, pagamentoData: string | null): boolean {
    if (params.somentePrimeiroBoleto === true && !pago) return false
    if (inicioPagamento && fimPagamento) {
      if (!pagamentoData || pagamentoData < inicioPagamento || pagamentoData > fimPagamento) {
        return false
      }
    }
    return true
  }

  const linhas: LinhaRelatorioImplantacao[] = []

  for (const [cpfTit, vidaTit] of titularesNovos) {
    const caId = String(vidaTit.cliente_administradora_id || "").trim()
    if (params.corretorId?.trim() && params.corretorId !== "todos") {
      const corId = String(vidaTit.corretor_id || mapaCorretor.get(caId) || "")
      if (corId !== params.corretorId.trim()) continue
    }

    const faturasCliente = caId ? faturasPorCliente.get(caId) || [] : []
    const fatura = faturasCliente[0]
    const pagamentoData = fatura ? dataPagamentoIso(fatura.pagamento_data) : null
    const pago = fatura ? faturaEstaPaga(String(fatura.status || ""), fatura.pagamento_data) : false

    if (!passaFiltrosPagamento(pago, pagamentoData)) continue

    const cliente = caId ? clientesMap.get(caId) : undefined
    const matriculaVida = extrairMatriculaDeDados(vidaTit as Record<string, unknown>)
    const implantado = vidaEstaImplantada(vidaTit, cliente)
    const numeroCarteirinha =
      matriculaVida || cliente?.numero_carteirinha || null

    if (params.implantado === "sim" && !implantado) continue
    if (params.implantado === "nao" && implantado) continue

    const telVida = primeiroTelefoneDeVida(vidaTit as Record<string, unknown>)
    const telFatura = fatura ? String(fatura.cliente_telefone || "").trim() || null : null

    linhas.push({
      fatura_id: fatura ? String(fatura.id) : `vida-titular-${vidaTit.id}`,
      vida_id: String(vidaTit.id),
      tipo_beneficiario: "titular",
      titular_nome: null,
      cliente_administradora_id: caId || `vida:${vidaTit.id}`,
      cliente_nome: String(vidaTit.nome || fatura?.cliente_nome || "Titular"),
      cpf: cpfTit,
      telefone: resolverTelefoneClienteCobranca(telVida, null, telFatura),
      grupo_nome: nomeGrupoPorId.get(String(vidaTit.grupo_id || "")) || null,
      corretora: resolverCorretor(vidaTit, caId || null),
      numero_fatura: fatura?.numero_fatura ? String(fatura.numero_fatura) : null,
      valor: fatura?.valor != null ? Number(fatura.valor) : null,
      vencimento: fatura?.vencimento ? String(fatura.vencimento).slice(0, 10) : null,
      pagamento_data: pagamentoData,
      pagamento_valor: fatura?.pagamento_valor != null ? Number(fatura.pagamento_valor) : null,
      primeiro_boleto: true,
      pago,
      implantado,
      numero_carteirinha: numeroCarteirinha,
      data_vinculacao: cliente?.data_vinculacao || null,
      fatura_created_at: fatura?.created_at ? String(fatura.created_at) : null,
      vida_created_at: vidaTit.created_at ? String(vidaTit.created_at) : null,
    })
  }

  const titularPorCpf = new Map<string, { nome: string; pago: boolean; pagamentoData: string | null; caId: string | null }>()
  for (const linha of linhas.filter((l) => l.tipo_beneficiario === "titular")) {
    const cpf = normalizarCpf(linha.cpf)
    if (cpf) {
      titularPorCpf.set(cpf, {
        nome: linha.cliente_nome,
        pago: linha.pago,
        pagamentoData: linha.pagamento_data,
        caId: linha.cliente_administradora_id.startsWith("vida:") ? null : linha.cliente_administradora_id,
      })
    }
  }

  for (const vidaDep of dependentesNovos) {
    const cpfTit = normalizarCpf(vidaDep.cpf_titular)
    const titularInfo = cpfTit ? titularPorCpf.get(cpfTit) : undefined
    if (!titularInfo) continue

    if (params.corretorId?.trim() && params.corretorId !== "todos") {
      const caId = titularInfo.caId || ""
      const corId = String(vidaDep.corretor_id || (caId ? mapaCorretor.get(caId) : "") || "")
      if (corId !== params.corretorId.trim()) continue
    }

    const pago = titularInfo.pago
    const pagamentoData = titularInfo.pagamentoData
    if (!passaFiltrosPagamento(pago, pagamentoData)) continue

    const matriculaDep = extrairMatriculaDeDados(vidaDep as Record<string, unknown>)
    const implantado = Boolean(matriculaDep)

    if (params.implantado === "sim" && !implantado) continue
    if (params.implantado === "nao" && implantado) continue

    const caIdTit = titularInfo.caId

    linhas.push({
      fatura_id: `vida-dependente-${vidaDep.id}`,
      vida_id: String(vidaDep.id),
      tipo_beneficiario: "dependente",
      titular_nome: titularInfo.nome,
      cliente_administradora_id: caIdTit || `vida:${vidaDep.id}`,
      cliente_nome: String(vidaDep.nome || "Dependente"),
      cpf: normalizarCpf(vidaDep.cpf),
      telefone: primeiroTelefoneDeVida(vidaDep as Record<string, unknown>) || null,
      grupo_nome: nomeGrupoPorId.get(String(vidaDep.grupo_id || "")) || null,
      corretora: resolverCorretor(vidaDep, caIdTit),
      numero_fatura: null,
      valor: null,
      vencimento: null,
      pagamento_data: pagamentoData,
      pagamento_valor: null,
      primeiro_boleto: true,
      pago,
      implantado,
      numero_carteirinha: matriculaDep || null,
      data_vinculacao: null,
      fatura_created_at: null,
      vida_created_at: vidaDep.created_at ? String(vidaDep.created_at) : null,
    })
  }

  linhas.sort((a, b) => {
    const ta = a.titular_nome || a.cliente_nome
    const tb = b.titular_nome || b.cliente_nome
    const g = ta.localeCompare(tb, "pt-BR")
    if (g !== 0) return g
    if (a.tipo_beneficiario !== b.tipo_beneficiario) {
      return a.tipo_beneficiario === "titular" ? -1 : 1
    }
    return a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR")
  })

  const totalTitulares = linhas.filter((l) => l.tipo_beneficiario === "titular").length
  const totalDependentes = linhas.filter((l) => l.tipo_beneficiario === "dependente").length
  const totalPagos = linhas.filter((l) => l.pago).length
  const totalImplantados = linhas.filter((l) => l.implantado).length

  return {
    linhas,
    total_registros: linhas.length,
    total_titulares: totalTitulares,
    total_dependentes: totalDependentes,
    total_pagos: totalPagos,
    total_aguardando_pagamento: linhas.length - totalPagos,
    total_implantados: totalImplantados,
    total_aguardando_implantacao: linhas.length - totalImplantados,
    total_primeiro_boleto: linhas.length,
    periodo: { inicio: inicioMes, fim: fimMes },
  }
}
