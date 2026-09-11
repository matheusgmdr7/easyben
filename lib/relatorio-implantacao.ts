import { supabaseAdmin } from "@/lib/supabase-admin"
import { montarMapaCorretorPorCliente } from "@/lib/corretor-cliente-vinculo"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"
import { carregarVidasImportadasDoGrupo } from "@/lib/vidas-importadas-grupo"
import { faturaEstaPaga } from "@/lib/fatura-status"
import { primeiroTelefoneDeVida, resolverTelefoneClienteCobranca } from "@/lib/telefone-cliente-cobranca"

export type LinhaRelatorioImplantacao = {
  fatura_id: string
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
}

export type ResultadoRelatorioImplantacao = {
  linhas: LinhaRelatorioImplantacao[]
  total_registros: number
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

function primeiroDiaMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`
}

function ultimoDiaMes(ano: number, mes: number): string {
  const data = new Date(Date.UTC(ano, mes, 0))
  return `${ano}-${String(mes).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`
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

function dataPagamentoIso(raw: unknown): string | null {
  const s = String(raw || "").trim()
  if (!s) return null
  return s.slice(0, 10)
}

function normalizarCpf(raw: unknown): string | null {
  const s = String(raw || "").trim()
  if (!s) return null
  const digits = s.replace(/\D/g, "")
  if (digits.length === 11) return digits
  if (digits.length > 0) return digits
  return s
}

function cpfDeVida(v: Record<string, unknown>): string | null {
  const direct = normalizarCpf(v.cpf)
  if (direct) return direct

  const da = v.dados_adicionais
  if (da && typeof da === "object") {
    for (const key of ["cpf", "CPF", "cpf_titular", "Cpf"]) {
      const cpf = normalizarCpf((da as Record<string, unknown>)[key])
      if (cpf) return cpf
    }
  }
  return null
}

function resolverCpfCliente(
  cpfVida: string | null | undefined,
  cpfProposta: string | null | undefined,
  clienteIdFatura: unknown
): string | null {
  return cpfVida || cpfProposta || normalizarCpf(clienteIdFatura)
}

/** Implantado = flag explícita ou número de carteirinha preenchido. */
export function clienteEstaImplantado(params: {
  implantado?: boolean | null
  numero_carteirinha?: string | null
}): boolean {
  if (params.implantado === true) return true
  return Boolean(String(params.numero_carteirinha || "").trim())
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

async function carregarFaturasGeradasNoPeriodo(
  administradoraId: string,
  inicio: string,
  fim: string
): Promise<FaturaRow[]> {
  const rows: FaturaRow[] = []
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("faturas")
      .select(FATURAS_SELECT)
      .eq("administradora_id", administradoraId)
      .gte("created_at", `${inicio}T00:00:00.000Z`)
      .lte("created_at", `${fim}T23:59:59.999Z`)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(error.message)
    const chunk = (data || []) as FaturaRow[]
    rows.push(...chunk)
    if (chunk.length < pageSize) break
    offset += pageSize
    if (offset > 100_000) break
  }

  return rows
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
 * Relatório de implantação: clientes inseridos no mês selecionado.
 * Critério: exatamente 1 fatura gerada (created_at) no mês e nenhuma fatura anterior.
 */
export async function gerarRelatorioImplantacao(params: {
  administradoraId: string
  tenantId?: string | null
  ano: number
  mes: number
  /** @deprecated Preferir dataInicio/dataFim para filtro de pagamento */
  dia?: number | null
  /** Filtro opcional de data de pagamento (subconjunto do mês). */
  dataInicio?: string | null
  dataFim?: string | null
  grupoId?: string | null
  corretorId?: string | null
  /** Se true, inclui só clientes cujo boleto do mês está pago. */
  somentePrimeiroBoleto?: boolean
  implantado?: "todos" | "sim" | "nao"
}): Promise<ResultadoRelatorioImplantacao> {
  const { administradoraId, tenantId, ano, mes } = params
  const inicioInformado = dataPagamentoIso(params.dataInicio)
  const fimInformado = dataPagamentoIso(params.dataFim)

  const inicioMes = primeiroDiaMes(ano, mes)
  const fimMes = ultimoDiaMes(ano, mes)

  let inicioPagamento: string | null = null
  let fimPagamento: string | null = null
  if (inicioInformado && fimInformado) {
    inicioPagamento = inicioInformado <= fimInformado ? inicioInformado : fimInformado
    fimPagamento = inicioInformado <= fimInformado ? fimInformado : inicioInformado
  } else if (params.dia) {
    inicioPagamento = `${ano}-${String(mes).padStart(2, "0")}-${String(params.dia).padStart(2, "0")}`
    fimPagamento = inicioPagamento
  }

  const faturasNoMes = await carregarFaturasGeradasNoPeriodo(
    administradoraId,
    inicioMes,
    fimMes
  )

  const faturasPorCliente = new Map<string, FaturaRow[]>()
  for (const f of faturasNoMes) {
    const clienteId = String(f.cliente_administradora_id || "").trim()
    if (!clienteId) continue
    const arr = faturasPorCliente.get(clienteId) || []
    arr.push(f)
    faturasPorCliente.set(clienteId, arr)
  }

  const candidatosUmaFatura = Array.from(faturasPorCliente.entries())
    .filter(([, lista]) => lista.length === 1)
    .map(([clienteId]) => clienteId)

  const comFaturaAnterior = await clientesComFaturaAnterior(
    administradoraId,
    candidatosUmaFatura,
    inicioMes
  )

  let clienteIdsGrupo: Set<string> | null = null
  if (params.grupoId?.trim()) {
    clienteIdsGrupo = await listarClienteIdsDoGrupo(
      params.grupoId.trim(),
      administradoraId,
      tenantId
    )
  }

  const clientesNovos: FaturaRow[] = []
  for (const clienteId of candidatosUmaFatura) {
    if (comFaturaAnterior.has(clienteId)) continue
    if (clienteIdsGrupo && !clienteIdsGrupo.has(clienteId)) continue
    const fatura = faturasPorCliente.get(clienteId)![0]
    clientesNovos.push(fatura)
  }

  const clienteIds = clientesNovos
    .map((f) => String(f.cliente_administradora_id || "").trim())
    .filter(Boolean)

  const mapaCorretor = await montarMapaCorretorPorCliente(
    clienteIds,
    administradoraId,
    tenantId
  )

  const corretorNomes = new Map<string, string>()
  if (clienteIds.length > 0) {
    const corretorIds = Array.from(new Set(Array.from(mapaCorretor.values()).filter(Boolean)))
    if (corretorIds.length > 0) {
      const { data: corretores } = await supabaseAdmin
        .from("corretores_administradora")
        .select("id, nome")
        .in("id", corretorIds)
      for (const c of corretores || []) {
        corretorNomes.set(String(c.id), String(c.nome || "—"))
      }
    }
  }

  const clientesMap = new Map<
    string,
    {
      implantado: boolean
      numero_carteirinha: string | null
      data_vinculacao: string | null
      cpf: string | null
    }
  >()

  if (clienteIds.length > 0) {
    for (let i = 0; i < clienteIds.length; i += 500) {
      const lote = clienteIds.slice(i, i + 500)
      const { data: clientes } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, implantado, numero_carteirinha, data_vinculacao, proposta_id")
        .in("id", lote)

      const propostaIds = (clientes || [])
        .map((c) => String((c as { proposta_id?: string }).proposta_id || "").trim())
        .filter(Boolean)

      const cpfPorProposta = new Map<string, string>()
      if (propostaIds.length > 0) {
        const { data: propostas } = await supabaseAdmin
          .from("propostas")
          .select("id, cpf, cpf_cliente")
          .in("id", propostaIds)
        for (const p of propostas || []) {
          const cpf = normalizarCpf(p.cpf) || normalizarCpf((p as { cpf_cliente?: string }).cpf_cliente)
          if (p.id && cpf) cpfPorProposta.set(String(p.id), cpf)
        }
      }

      for (const c of clientes || []) {
        const id = String(c.id)
        const propostaId = String((c as { proposta_id?: string }).proposta_id || "")
        clientesMap.set(id, {
          implantado: Boolean(c.implantado),
          numero_carteirinha: c.numero_carteirinha ? String(c.numero_carteirinha) : null,
          data_vinculacao: c.data_vinculacao ? String(c.data_vinculacao).slice(0, 10) : null,
          cpf: propostaId ? cpfPorProposta.get(propostaId) || null : null,
        })
      }
    }
  }

  const telefoneVidaPorCliente = new Map<string, string>()
  const cpfVidaPorCliente = new Map<string, string>()
  const grupoNomePorCliente = new Map<string, string>()
  if (clienteIds.length > 0) {
    let qVidas = supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, cpf, telefones, dados_adicionais, tipo, grupo_id")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", clienteIds)

    if (tenantId) qVidas = qVidas.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)

    const { data: vidas } = await qVidas
    const grupoIds = new Set<string>()
    for (const v of vidas || []) {
      const cid = String(v.cliente_administradora_id || "").trim()
      if (!cid) continue
      const cpf = cpfDeVida(v as Record<string, unknown>)
      if (cpf) {
        const tipo = String(v.tipo || "").toLowerCase()
        const atual = cpfVidaPorCliente.get(cid)
        if (!atual || tipo === "titular") cpfVidaPorCliente.set(cid, cpf)
      }
      const tel = primeiroTelefoneDeVida(v as Record<string, unknown>)
      if (tel) {
        const tipo = String(v.tipo || "").toLowerCase()
        const atual = telefoneVidaPorCliente.get(cid)
        if (!atual || tipo === "titular") telefoneVidaPorCliente.set(cid, tel)
      }
      const gid = String(v.grupo_id || "").trim()
      if (gid) {
        grupoIds.add(gid)
        if (!grupoNomePorCliente.has(cid)) grupoNomePorCliente.set(cid, gid)
      }
    }

    if (grupoIds.size > 0) {
      const { data: grupos } = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome")
        .in("id", Array.from(grupoIds))
      const nomeGrupo = new Map((grupos || []).map((g) => [String(g.id), String(g.nome || "")]))
      for (const [cid, gid] of grupoNomePorCliente) {
        grupoNomePorCliente.set(cid, nomeGrupo.get(gid) || gid)
      }
    }
  }

  const linhas: LinhaRelatorioImplantacao[] = []

  for (const f of clientesNovos) {
    const clienteId = String(f.cliente_administradora_id || "").trim()
    if (!clienteId) continue

    const corretorIdCliente = mapaCorretor.get(clienteId) ?? null
    if (params.corretorId?.trim() && params.corretorId !== "todos") {
      if (corretorIdCliente !== params.corretorId.trim()) continue
    }

    const pagamentoData = dataPagamentoIso(f.pagamento_data)
    const pago = faturaEstaPaga(String(f.status || ""), f.pagamento_data)

    if (inicioPagamento && fimPagamento) {
      if (!pagamentoData || pagamentoData < inicioPagamento || pagamentoData > fimPagamento) {
        continue
      }
    }

    if (params.somentePrimeiroBoleto !== false && !pago) continue

    const cliente = clientesMap.get(clienteId)
    const implantado = clienteEstaImplantado({
      implantado: cliente?.implantado,
      numero_carteirinha: cliente?.numero_carteirinha,
    })

    if (params.implantado === "sim" && !implantado) continue
    if (params.implantado === "nao" && implantado) continue

    const telVida = telefoneVidaPorCliente.get(clienteId)
    const telFatura = String(f.cliente_telefone || "").trim() || null

    linhas.push({
      fatura_id: String(f.id),
      cliente_administradora_id: clienteId,
      cliente_nome: String(f.cliente_nome || "Cliente"),
      cpf: resolverCpfCliente(
        cpfVidaPorCliente.get(clienteId),
        cliente?.cpf,
        f.cliente_id
      ),
      telefone: resolverTelefoneClienteCobranca(telVida, null, telFatura),
      grupo_nome: grupoNomePorCliente.get(clienteId) || null,
      corretora: corretorIdCliente ? corretorNomes.get(corretorIdCliente) || "—" : "—",
      numero_fatura: f.numero_fatura ? String(f.numero_fatura) : null,
      valor: f.valor != null ? Number(f.valor) : null,
      vencimento: f.vencimento ? String(f.vencimento).slice(0, 10) : null,
      pagamento_data: pagamentoData,
      pagamento_valor: f.pagamento_valor != null ? Number(f.pagamento_valor) : null,
      primeiro_boleto: true,
      pago,
      implantado,
      numero_carteirinha: cliente?.numero_carteirinha || null,
      data_vinculacao: cliente?.data_vinculacao || null,
      fatura_created_at: f.created_at ? String(f.created_at) : null,
    })
  }

  linhas.sort((a, b) => {
    const d = (b.fatura_created_at || "").localeCompare(a.fatura_created_at || "")
    if (d !== 0) return d
    return a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR")
  })

  const totalPagos = linhas.filter((l) => l.pago).length
  const totalImplantados = linhas.filter((l) => l.implantado).length

  return {
    linhas,
    total_registros: linhas.length,
    total_pagos: totalPagos,
    total_aguardando_pagamento: linhas.length - totalPagos,
    total_implantados: totalImplantados,
    total_aguardando_implantacao: linhas.length - totalImplantados,
    total_primeiro_boleto: linhas.length,
    periodo: { inicio: inicioMes, fim: fimMes },
  }
}
