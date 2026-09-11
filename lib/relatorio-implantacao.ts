import { supabaseAdmin } from "@/lib/supabase-admin"
import { montarMapaCorretorPorCliente } from "@/lib/corretor-cliente-vinculo"
import { faturaEstaPaga } from "@/lib/fatura-status"
import { extrairMatriculaDeDados } from "@/lib/matricula-beneficiario"
import { primeiroTelefoneDeVida, resolverTelefoneClienteCobranca } from "@/lib/telefone-cliente-cobranca"

export type ModoReferenciaImplantacao = "importacao" | "primeira_fatura" | "pagamento"

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
  pago: boolean
  implantado: boolean
  numero_carteirinha: string | null
}

export type DiagnosticoExclusao = {
  vidas_bruto: number
  titulares_candidatos: number
  dependentes_candidatos: number
  motivos: Record<string, number>
  total_excluidos: number
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
  modo_referencia: ModoReferenciaImplantacao
  diagnostico: DiagnosticoExclusao
}

const FATURAS_SELECT =
  "id, cliente_administradora_id, cliente_nome, cliente_telefone, numero_fatura, valor, vencimento, pagamento_data, pagamento_valor, status, created_at"

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

export function normalizarCpf(raw: unknown): string | null {
  const digits = String(raw || "").replace(/\D/g, "")
  if (digits.length === 11) return digits
  if (digits.length >= 10) return digits.slice(-11).padStart(11, "0")
  return null
}

function tipoVida(v: VidaRow): "titular" | "dependente" {
  return String(v.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular"
}

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

function escolherFaturaPrincipal(faturas: FaturaRow[]): FaturaRow | undefined {
  if (!faturas.length) return undefined
  const pagas = faturas.filter((f) => faturaEstaPaga(String(f.status || ""), f.pagamento_data))
  if (pagas.length) {
    return pagas.sort((a, b) =>
      String(b.pagamento_data || b.created_at || "").localeCompare(
        String(a.pagamento_data || a.created_at || "")
      )
    )[0]
  }
  return faturas.sort((a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || ""))
  )[0]
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

async function carregarVidasPorClienteIds(
  administradoraId: string,
  clienteIds: string[],
  tenantId?: string | null
): Promise<Map<string, VidaRow>> {
  const mapa = new Map<string, VidaRow>()
  if (!clienteIds.length) return mapa

  const CHUNK = 200
  for (let i = 0; i < clienteIds.length; i += CHUNK) {
    const chunk = clienteIds.slice(i, i + CHUNK)
    let q = supabaseAdmin
      .from("vidas_importadas")
      .select(VIDAS_SELECT)
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", chunk)
      .order("created_at", { ascending: true })
    if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data } = await q
    for (const row of data || []) {
      const vida = row as VidaRow
      if (tipoVida(vida) !== "titular") continue
      const caId = String(vida.cliente_administradora_id || "").trim()
      if (caId && !mapa.has(caId)) mapa.set(caId, vida)
    }
  }
  return mapa
}

async function carregarCpfsComVidaAnterior(
  administradoraId: string,
  cpfs: string[],
  inicioMes: string,
  tenantId?: string | null,
  ignorarInativos?: boolean
): Promise<Set<string>> {
  const anteriores = new Set<string>()
  if (!cpfs.length) return anteriores

  const CHUNK = 100
  for (let i = 0; i < cpfs.length; i += CHUNK) {
    const chunk = cpfs.slice(i, i + CHUNK)
    let q = supabaseAdmin
      .from("vidas_importadas")
      .select("cpf, ativo")
      .eq("administradora_id", administradoraId)
      .in("cpf", chunk)
      .lt("created_at", `${inicioMes}T00:00:00.000Z`)
    if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    const { data } = await q
    for (const row of data || []) {
      const r = row as { cpf?: string; ativo?: boolean | null }
      if (ignorarInativos && r.ativo === false) continue
      const cpf = normalizarCpf(r.cpf)
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

async function carregarFaturasPagasNoPeriodo(
  administradoraId: string,
  inicio: string,
  fim: string
): Promise<FaturaRow[]> {
  return carregarPaginado(async (offset, pageSize) => {
    return supabaseAdmin
      .from("faturas")
      .select(FATURAS_SELECT)
      .eq("administradora_id", administradoraId)
      .gte("pagamento_data", inicio)
      .lte("pagamento_data", fim)
      .order("pagamento_data", { ascending: true })
      .range(offset, offset + pageSize - 1)
  })
}

async function clientesComFaturaAnterior(
  administradoraId: string,
  clienteIds: string[],
  antesDe: string
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
      .lt("created_at", `${antesDe}T00:00:00.000Z`)

    for (const row of data || []) {
      const cid = String(row.cliente_administradora_id || "").trim()
      if (cid) comAnterior.add(cid)
    }
  }
  return comAnterior
}

async function clientesComPagamentoAnterior(
  administradoraId: string,
  clienteIds: string[],
  antesDe: string
): Promise<Set<string>> {
  const comAnterior = new Set<string>()
  if (!clienteIds.length) return comAnterior

  const CHUNK = 200
  for (let i = 0; i < clienteIds.length; i += CHUNK) {
    const chunk = clienteIds.slice(i, i + CHUNK)
    const { data } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, pagamento_data, status")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", chunk)
      .lt("pagamento_data", antesDe)

    for (const row of data || []) {
      const r = row as { cliente_administradora_id?: string; pagamento_data?: string; status?: string }
      if (!faturaEstaPaga(String(r.status || ""), r.pagamento_data)) continue
      const cid = String(r.cliente_administradora_id || "").trim()
      if (cid) comAnterior.add(cid)
    }
  }
  return comAnterior
}

/**
 * Relatório de implantação: beneficiários novos no período.
 * Modos: importação da vida, 1ª fatura gerada ou pagamento da 1ª fatura.
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
  modoReferencia?: ModoReferenciaImplantacao
  incluirDependentesInclusao?: boolean
  ignorarCpfAnteriorInativo?: boolean
}): Promise<ResultadoRelatorioImplantacao> {
  const { administradoraId, tenantId, ano, mes } = params
  const modoReferencia = params.modoReferencia || "importacao"
  const incluirDependentesInclusao = params.incluirDependentesInclusao === true
  const ignorarCpfAnteriorInativo = params.ignorarCpfAnteriorInativo !== false

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
  } else if (modoReferencia === "pagamento") {
    inicioPagamento = inicioMes
    fimPagamento = fimMes
  }

  const motivos: Record<string, number> = {}
  function inc(motivo: string) {
    motivos[motivo] = (motivos[motivo] || 0) + 1
  }

  let grupoIdsFiltro: Set<string> | null = null
  if (params.grupoId?.trim()) {
    grupoIdsFiltro = new Set([params.grupoId.trim()])
  }

  const vidasNoMesBruto = await carregarVidasInseridasNoMes(
    administradoraId,
    inicioMes,
    fimMes,
    tenantId
  )
  const vidasNoMes = vidasNoMesBruto.filter((v) => {
    if (v.ativo === false) {
      inc("inativo")
      return false
    }
    return true
  })

  const faturasNoMes = await carregarFaturasGeradasNoPeriodo(administradoraId, inicioMes, fimMes)
  const faturasPorCliente = new Map<string, FaturaRow[]>()
  for (const f of faturasNoMes) {
    const cid = String(f.cliente_administradora_id || "").trim()
    if (!cid) continue
    const arr = faturasPorCliente.get(cid) || []
    arr.push(f)
    faturasPorCliente.set(cid, arr)
  }

  type TitularCandidato = { vida: VidaRow; cpf: string; fatura?: FaturaRow }
  const titularesCandidatos: TitularCandidato[] = []

  if (modoReferencia === "importacao") {
    for (const vida of vidasNoMes) {
      if (tipoVida(vida) !== "titular") continue
      const cpf = normalizarCpf(vida.cpf)
      if (!cpf) {
        inc("sem_cpf")
        continue
      }
      if (grupoIdsFiltro && !grupoIdsFiltro.has(String(vida.grupo_id || ""))) {
        inc("fora_grupo")
        continue
      }
      titularesCandidatos.push({ vida, cpf })
    }
  } else if (modoReferencia === "primeira_fatura") {
    const clienteIdsFatura = Array.from(
      new Set(
        faturasNoMes
          .map((f) => String(f.cliente_administradora_id || "").trim())
          .filter(Boolean)
      )
    )
    const vidasPorCliente = await carregarVidasPorClienteIds(administradoraId, clienteIdsFatura, tenantId)

    for (const [caId, faturasCliente] of faturasPorCliente) {
      const vida = vidasPorCliente.get(caId)
      if (!vida || vida.ativo === false) {
        inc("sem_vida_titular")
        continue
      }
      const cpf = normalizarCpf(vida.cpf)
      if (!cpf) {
        inc("sem_cpf")
        continue
      }
      if (grupoIdsFiltro && !grupoIdsFiltro.has(String(vida.grupo_id || ""))) {
        inc("fora_grupo")
        continue
      }
      titularesCandidatos.push({ vida, cpf, fatura: escolherFaturaPrincipal(faturasCliente) })
    }
  } else {
    const inicioPag = inicioPagamento || inicioMes
    const fimPag = fimPagamento || fimMes
    const faturasPagas = (await carregarFaturasPagasNoPeriodo(administradoraId, inicioPag, fimPag)).filter(
      (f) => faturaEstaPaga(String(f.status || ""), f.pagamento_data)
    )

    const faturasPagasPorCliente = new Map<string, FaturaRow[]>()
    for (const f of faturasPagas) {
      const cid = String(f.cliente_administradora_id || "").trim()
      if (!cid) continue
      const arr = faturasPagasPorCliente.get(cid) || []
      arr.push(f)
      faturasPagasPorCliente.set(cid, arr)
    }

    const clienteIdsPagos = Array.from(faturasPagasPorCliente.keys())
    const vidasPorCliente = await carregarVidasPorClienteIds(administradoraId, clienteIdsPagos, tenantId)

    for (const [caId, faturasCliente] of faturasPagasPorCliente) {
      const vida = vidasPorCliente.get(caId)
      if (!vida || vida.ativo === false) {
        inc("sem_vida_titular")
        continue
      }
      const cpf = normalizarCpf(vida.cpf)
      if (!cpf) {
        inc("sem_cpf")
        continue
      }
      if (grupoIdsFiltro && !grupoIdsFiltro.has(String(vida.grupo_id || ""))) {
        inc("fora_grupo")
        continue
      }
      titularesCandidatos.push({ vida, cpf, fatura: escolherFaturaPrincipal(faturasCliente) })
    }
  }

  const cpfsCandidatos = Array.from(new Set(titularesCandidatos.map((t) => t.cpf)))
  const cpfsComVidaAnterior = await carregarCpfsComVidaAnterior(
    administradoraId,
    cpfsCandidatos,
    inicioMes,
    tenantId,
    ignorarCpfAnteriorInativo
  )

  const clienteIdsTitulares = Array.from(
    new Set(
      titularesCandidatos
        .map((t) => String(t.vida.cliente_administradora_id || "").trim())
        .filter(Boolean)
    )
  )

  const comFaturaAnterior =
    modoReferencia === "pagamento"
      ? await clientesComPagamentoAnterior(administradoraId, clienteIdsTitulares, inicioPagamento || inicioMes)
      : await clientesComFaturaAnterior(administradoraId, clienteIdsTitulares, inicioMes)

  const titularesNovos = new Map<string, TitularCandidato>()
  for (const cand of titularesCandidatos) {
    if (cpfsComVidaAnterior.has(cand.cpf)) {
      inc("cpf_anterior")
      continue
    }

    const caId = String(cand.vida.cliente_administradora_id || "").trim()
    if (caId && comFaturaAnterior.has(caId)) {
      inc("fatura_anterior")
      continue
    }

    if (modoReferencia === "importacao") {
      const faturasCliente = caId ? faturasPorCliente.get(caId) || [] : []
      cand.fatura = escolherFaturaPrincipal(faturasCliente)
    }

    if (!titularesNovos.has(cand.cpf)) {
      titularesNovos.set(cand.cpf, cand)
    }
  }

  const cpfsTitularesNovos = new Set(titularesNovos.keys())

  const dependentesCandidatos: VidaRow[] = []
  for (const vida of vidasNoMes) {
    if (tipoVida(vida) !== "dependente") continue
    const cpf = normalizarCpf(vida.cpf)
    if (!cpf) {
      inc("dependente_sem_cpf")
      continue
    }
    if (cpfsComVidaAnterior.has(cpf)) {
      inc("dependente_cpf_anterior")
      continue
    }
    if (grupoIdsFiltro && !grupoIdsFiltro.has(String(vida.grupo_id || ""))) {
      inc("dependente_fora_grupo")
      continue
    }

    const cpfTit = normalizarCpf(vida.cpf_titular)
    if (!cpfTit) {
      inc("dependente_sem_titular")
      continue
    }

    if (cpfsTitularesNovos.has(cpfTit)) {
      dependentesCandidatos.push(vida)
      continue
    }

    if (incluirDependentesInclusao) {
      dependentesCandidatos.push(vida)
      continue
    }

    inc("titular_nao_novo")
  }

  const clienteIds = Array.from(
    new Set(
      [...titularesNovos.values()]
        .map((t) => String(t.vida.cliente_administradora_id || "").trim())
        .filter(Boolean)
    )
  )

  const mapaCorretor = await montarMapaCorretorPorCliente(clienteIds, administradoraId, tenantId)

  const corretorIdsVida = Array.from(
    new Set(
      [...titularesNovos.values(), ...dependentesCandidatos]
        .flatMap((item) => {
          const vida = "vida" in item ? item.vida : item
          return [String(vida.corretor_id || "").trim()]
        })
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
    { implantado: boolean; numero_carteirinha: string | null }
  >()
  if (clienteIds.length > 0) {
    for (let i = 0; i < clienteIds.length; i += 500) {
      const lote = clienteIds.slice(i, i + 500)
      const { data: clientes } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, implantado, numero_carteirinha")
        .in("id", lote)
      for (const c of clientes || []) {
        clientesMap.set(String(c.id), {
          implantado: Boolean(c.implantado),
          numero_carteirinha: c.numero_carteirinha ? String(c.numero_carteirinha) : null,
        })
      }
    }
  }

  const grupoIds = new Set<string>()
  for (const t of titularesNovos.values()) {
    const gid = String(t.vida.grupo_id || "").trim()
    if (gid) grupoIds.add(gid)
  }
  for (const v of dependentesCandidatos) {
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
    if (inicioPagamento && fimPagamento && modoReferencia !== "pagamento") {
      if (!pagamentoData || pagamentoData < inicioPagamento || pagamentoData > fimPagamento) {
        return false
      }
    }
    return true
  }

  const linhas: LinhaRelatorioImplantacao[] = []

  for (const [cpfTit, cand] of titularesNovos) {
    const vidaTit = cand.vida
    const caId = String(vidaTit.cliente_administradora_id || "").trim()
    if (params.corretorId?.trim() && params.corretorId !== "todos") {
      const corId = String(vidaTit.corretor_id || mapaCorretor.get(caId) || "")
      if (corId !== params.corretorId.trim()) {
        inc("corretor")
        continue
      }
    }

    const fatura = cand.fatura
    const pagamentoData = fatura ? dataPagamentoIso(fatura.pagamento_data) : null
    const pago = fatura ? faturaEstaPaga(String(fatura.status || ""), fatura.pagamento_data) : false

    if (!passaFiltrosPagamento(pago, pagamentoData)) {
      inc(params.somentePrimeiroBoleto ? "somente_pago" : "pagamento_fora_periodo")
      continue
    }

    const cliente = caId ? clientesMap.get(caId) : undefined
    const matriculaVida = extrairMatriculaDeDados(vidaTit as Record<string, unknown>)
    const implantado = vidaEstaImplantada(vidaTit, cliente)
    const numeroCarteirinha = matriculaVida || cliente?.numero_carteirinha || null

    if (params.implantado === "sim" && !implantado) {
      inc("implantado_filtro")
      continue
    }
    if (params.implantado === "nao" && implantado) {
      inc("implantado_filtro")
      continue
    }

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
      pago,
      implantado,
      numero_carteirinha: numeroCarteirinha,
    })
  }

  const titularPorCpf = new Map<
    string,
    { nome: string; pago: boolean; pagamentoData: string | null; caId: string | null }
  >()
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

  for (const vidaDep of dependentesCandidatos) {
    const cpfTit = normalizarCpf(vidaDep.cpf_titular)
    const titularInfo = cpfTit ? titularPorCpf.get(cpfTit) : undefined

    if (!titularInfo && !incluirDependentesInclusao) continue

    if (params.corretorId?.trim() && params.corretorId !== "todos") {
      const caId = titularInfo?.caId || ""
      const corId = String(vidaDep.corretor_id || (caId ? mapaCorretor.get(caId) : "") || "")
      if (corId !== params.corretorId.trim()) {
        inc("dependente_corretor")
        continue
      }
    }

    const pago = titularInfo?.pago ?? false
    const pagamentoData = titularInfo?.pagamentoData ?? null

    if (titularInfo && !passaFiltrosPagamento(pago, pagamentoData)) {
      inc("dependente_pagamento")
      continue
    }

    if (!titularInfo && incluirDependentesInclusao) {
      if (params.somentePrimeiroBoleto) {
        inc("dependente_titular_nao_listado")
        continue
      }
    }

    const matriculaDep = extrairMatriculaDeDados(vidaDep as Record<string, unknown>)
    const implantado = Boolean(matriculaDep)

    if (params.implantado === "sim" && !implantado) {
      inc("dependente_implantado_filtro")
      continue
    }
    if (params.implantado === "nao" && implantado) {
      inc("dependente_implantado_filtro")
      continue
    }

    const caIdTit = titularInfo?.caId ?? null

    linhas.push({
      fatura_id: `vida-dependente-${vidaDep.id}`,
      vida_id: String(vidaDep.id),
      tipo_beneficiario: "dependente",
      titular_nome: titularInfo?.nome || null,
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
      pago,
      implantado,
      numero_carteirinha: matriculaDep || null,
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
  const totalExcluidos = Object.values(motivos).reduce((s, n) => s + n, 0)

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
    modo_referencia: modoReferencia,
    diagnostico: {
      vidas_bruto: vidasNoMesBruto.length,
      titulares_candidatos: titularesCandidatos.length,
      dependentes_candidatos: dependentesCandidatos.length,
      motivos,
      total_excluidos: totalExcluidos,
    },
  }
}
