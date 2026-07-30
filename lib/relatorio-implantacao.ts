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
  implantado: boolean
  numero_carteirinha: string | null
  data_vinculacao: string | null
}

export type ResultadoRelatorioImplantacao = {
  linhas: LinhaRelatorioImplantacao[]
  total_registros: number
  total_primeiro_boleto: number
  total_aguardando_implantacao: number
  periodo: { inicio: string; fim: string }
}

const FATURAS_SELECT =
  "id, cliente_administradora_id, cliente_nome, cliente_telefone, numero_fatura, valor, vencimento, pagamento_data, pagamento_valor, status, created_at"

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

/** Implantado = flag explícita ou número de carteirinha preenchido. */
export function clienteEstaImplantado(params: {
  implantado?: boolean | null
  numero_carteirinha?: string | null
}): boolean {
  if (params.implantado === true) return true
  return Boolean(String(params.numero_carteirinha || "").trim())
}

/** Cliente já tinha outra fatura paga antes desta data (exclui a fatura atual). */
function tinhaPagamentoAnterior(
  clienteId: string,
  faturaId: string,
  pagamentoData: string,
  pagasPorCliente: Map<string, Array<{ id: string; pagamento_data: string }>>
): boolean {
  const lista = pagasPorCliente.get(clienteId) || []
  return lista.some(
    (f) =>
      f.id !== faturaId &&
      f.pagamento_data &&
      f.pagamento_data < pagamentoData
  )
}

export async function gerarRelatorioImplantacao(params: {
  administradoraId: string
  tenantId?: string | null
  ano: number
  mes: number
  /** @deprecated Preferir dataInicio/dataFim */
  dia?: number | null
  dataInicio?: string | null
  dataFim?: string | null
  grupoId?: string | null
  corretorId?: string | null
  somentePrimeiroBoleto?: boolean
  implantado?: "todos" | "sim" | "nao"
}): Promise<ResultadoRelatorioImplantacao> {
  const { administradoraId, tenantId, ano, mes } = params
  const inicioInformado = dataPagamentoIso(params.dataInicio)
  const fimInformado = dataPagamentoIso(params.dataFim)

  let inicio: string
  let fim: string
  if (inicioInformado && fimInformado) {
    inicio = inicioInformado <= fimInformado ? inicioInformado : fimInformado
    fim = inicioInformado <= fimInformado ? fimInformado : inicioInformado
  } else if (params.dia) {
    inicio = `${ano}-${String(mes).padStart(2, "0")}-${String(params.dia).padStart(2, "0")}`
    fim = inicio
  } else {
    inicio = primeiroDiaMes(ano, mes)
    fim = ultimoDiaMes(ano, mes)
  }

  let query = supabaseAdmin
    .from("faturas")
    .select(FATURAS_SELECT)
    .eq("administradora_id", administradoraId)
    .gte("pagamento_data", inicio)
    .lte("pagamento_data", fim)
    .order("pagamento_data", { ascending: false })

  const { data: faturasRaw, error } = await query
  if (error) throw new Error(error.message)

  const faturasPagas = (faturasRaw || []).filter((f) =>
    faturaEstaPaga(String(f.status || ""), f.pagamento_data)
  )

  let clienteIdsGrupo: Set<string> | null = null
  if (params.grupoId?.trim()) {
    clienteIdsGrupo = await listarClienteIdsDoGrupo(
      params.grupoId.trim(),
      administradoraId,
      tenantId
    )
  }

  const clienteIds = Array.from(
    new Set(
      faturasPagas
        .map((f) => String(f.cliente_administradora_id || "").trim())
        .filter(Boolean)
    )
  )

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
          .select("id, cpf")
          .in("id", propostaIds)
        for (const p of propostas || []) {
          if (p.id && p.cpf) cpfPorProposta.set(String(p.id), String(p.cpf))
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
  const grupoNomePorCliente = new Map<string, string>()
  if (clienteIds.length > 0) {
    let qVidas = supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, telefones, dados_adicionais, tipo, grupo_id")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", clienteIds)

    if (tenantId) qVidas = qVidas.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)

    const { data: vidas } = await qVidas
    const grupoIds = new Set<string>()
    for (const v of vidas || []) {
      const cid = String(v.cliente_administradora_id || "").trim()
      if (!cid) continue
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

  const pagasPorCliente = new Map<string, Array<{ id: string; pagamento_data: string }>>()
  if (clienteIds.length > 0) {
    const { data: historicoPagas } = await supabaseAdmin
      .from("faturas")
      .select("id, cliente_administradora_id, pagamento_data, status")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", clienteIds)
      .not("pagamento_data", "is", null)

    for (const f of historicoPagas || []) {
      if (!faturaEstaPaga(String(f.status || ""), f.pagamento_data)) continue
      const cid = String(f.cliente_administradora_id || "").trim()
      const pd = dataPagamentoIso(f.pagamento_data)
      if (!cid || !pd) continue
      const arr = pagasPorCliente.get(cid) || []
      arr.push({ id: String(f.id), pagamento_data: pd })
      pagasPorCliente.set(cid, arr)
    }
  }

  const linhas: LinhaRelatorioImplantacao[] = []

  for (const f of faturasPagas) {
    const clienteId = String(f.cliente_administradora_id || "").trim()
    if (!clienteId) continue

    if (clienteIdsGrupo && !clienteIdsGrupo.has(clienteId)) continue

    const corretorIdCliente = mapaCorretor.get(clienteId) ?? null
    if (params.corretorId?.trim() && params.corretorId !== "todos") {
      if (corretorIdCliente !== params.corretorId.trim()) continue
    }

    const pagamentoData = dataPagamentoIso(f.pagamento_data)
    if (!pagamentoData) continue

    const primeiroBoleto = !tinhaPagamentoAnterior(
      clienteId,
      String(f.id),
      pagamentoData,
      pagasPorCliente
    )

    if (params.somentePrimeiroBoleto !== false && !primeiroBoleto) continue

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
      cpf: cliente?.cpf || null,
      telefone: resolverTelefoneClienteCobranca(telVida, null, telFatura),
      grupo_nome: grupoNomePorCliente.get(clienteId) || null,
      corretora: corretorIdCliente ? corretorNomes.get(corretorIdCliente) || "—" : "—",
      numero_fatura: f.numero_fatura ? String(f.numero_fatura) : null,
      valor: f.valor != null ? Number(f.valor) : null,
      vencimento: f.vencimento ? String(f.vencimento).slice(0, 10) : null,
      pagamento_data: pagamentoData,
      pagamento_valor: f.pagamento_valor != null ? Number(f.pagamento_valor) : null,
      primeiro_boleto: primeiroBoleto,
      implantado,
      numero_carteirinha: cliente?.numero_carteirinha || null,
      data_vinculacao: cliente?.data_vinculacao || null,
    })
  }

  linhas.sort((a, b) => {
    const d = (b.pagamento_data || "").localeCompare(a.pagamento_data || "")
    if (d !== 0) return d
    return a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR")
  })

  return {
    linhas,
    total_registros: linhas.length,
    total_primeiro_boleto: linhas.filter((l) => l.primeiro_boleto).length,
    total_aguardando_implantacao: linhas.filter((l) => !l.implantado).length,
    periodo: { inicio, fim },
  }
}
