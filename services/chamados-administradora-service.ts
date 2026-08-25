import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"

export type BeneficiarioChamadoBusca = {
  chave: string
  origem: "vida_importada" | "cliente_administradora"
  vida_importada_id: string | null
  cliente_administradora_id: string | null
  grupo_id: string
  grupo_nome: string
  nome: string
  cpf: string
  email: string | null
  telefone: string | null
  tipo: string | null
}

export type StatusChamado = "aberto" | "em_andamento" | "resolvido" | "fechado"

export type PrioridadeChamado = "baixa" | "normal" | "alta" | "urgente"

export type SetorChamado = "implantacao" | "cadastro_boletos"

export const PRIORIDADES_CHAMADO: PrioridadeChamado[] = ["baixa", "normal", "alta", "urgente"]

export const SETORES_CHAMADO: SetorChamado[] = ["implantacao", "cadastro_boletos"]

export const PRIORIDADE_CHAMADO_LABELS: Record<PrioridadeChamado, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
}

export const SETOR_CHAMADO_LABELS: Record<SetorChamado, string> = {
  implantacao: "Setor de Implantação",
  cadastro_boletos: "Setor de Cadastro e Boletos",
}

export function prioridadeChamadoValida(valor: string): valor is PrioridadeChamado {
  return PRIORIDADES_CHAMADO.includes(valor as PrioridadeChamado)
}

export function setorChamadoValido(valor: string): valor is SetorChamado {
  return SETORES_CHAMADO.includes(valor as SetorChamado)
}

export function prazoChamadoVencido(prazo: string | null | undefined, status?: StatusChamado): boolean {
  if (!prazo || status === "resolvido" || status === "fechado") return false
  return new Date(prazo).getTime() < Date.now()
}

export function formatarPrazoChamado(prazo: string | null | undefined): string {
  if (!prazo) return "—"
  try {
    return new Date(prazo).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return prazo
  }
}

export function prazoChamadoParaInput(prazo: string | null | undefined): string {
  if (!prazo) return ""
  try {
    return new Date(prazo).toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

export function prazoChamadoDeInput(valor: string): string | null {
  const data = String(valor || "").trim()
  if (!data) return null
  const d = new Date(`${data}T23:59:59.999`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export type AssuntoChamadoCodigo =
  | "implantacao_pendente"
  | "uso_do_plano"
  | "cobertura"
  | "pagamento"
  | "cancelamento"
  | "alteracao_cadastral"
  | "dependentes"
  | "reembolso"
  | "documentos"
  | "reclamacao"
  | "outros"

export const ASSUNTOS_CHAMADO: Array<{
  id: AssuntoChamadoCodigo
  label: string
  descricao: string
}> = [
  {
    id: "implantacao_pendente",
    label: "Implantação pendente",
    descricao: "Cliente ainda não implantado ou sem acesso ao plano",
  },
  {
    id: "uso_do_plano",
    label: "Uso do plano",
    descricao: "Rede credenciada, autorização, carteirinha ou atendimento",
  },
  {
    id: "cobertura",
    label: "Cobertura",
    descricao: "Procedimento negado, carência ou dúvida sobre o que está coberto",
  },
  {
    id: "pagamento",
    label: "Pagamento",
    descricao: "Boleto, fatura, cobrança indevida ou inadimplência",
  },
  {
    id: "cancelamento",
    label: "Cancelamento",
    descricao: "Solicitação, dúvida ou acompanhamento de cancelamento do plano",
  },
  {
    id: "alteracao_cadastral",
    label: "Alteração cadastral",
    descricao: "Atualização de dados pessoais, endereço, telefone ou e-mail",
  },
  {
    id: "dependentes",
    label: "Dependentes",
    descricao: "Inclusão, exclusão ou alteração de dependentes no plano",
  },
  {
    id: "reembolso",
    label: "Reembolso",
    descricao: "Solicitação, documentação ou status de pedido de reembolso",
  },
  {
    id: "documentos",
    label: "Documentos",
    descricao: "2ª via de boleto, carteirinha, contrato ou comprovantes",
  },
  {
    id: "reclamacao",
    label: "Reclamação",
    descricao: "Insatisfação com atendimento, operadora ou qualidade do serviço",
  },
  {
    id: "outros",
    label: "Outros",
    descricao: "Motivo não listado — descreva com detalhes no campo de queixa",
  },
]

export function labelAssuntoChamado(codigo: string): string | null {
  const item = ASSUNTOS_CHAMADO.find((a) => a.id === codigo)
  return item?.label ?? null
}

export function assuntoChamadoValido(codigo: string): codigo is AssuntoChamadoCodigo {
  return ASSUNTOS_CHAMADO.some((a) => a.id === codigo)
}

export interface ChamadoHistorico {
  id: string
  chamado_id: string
  tipo: "abertura" | "status" | "observacao" | "fechamento" | "prioridade" | "prazo" | "setor"
  status_anterior: string | null
  status_novo: string | null
  descricao: string | null
  usuario_id: string | null
  usuario_nome: string | null
  criado_em: string
}

export interface ChamadoAdministradora {
  id: string
  administradora_id: string
  tenant_id: string | null
  numero: number
  cliente_nome: string
  cliente_telefone: string | null
  cliente_email: string | null
  cliente_cpf: string | null
  grupo_id: string | null
  grupo_nome: string | null
  beneficiario_origem: string | null
  vida_importada_id: string | null
  cliente_administradora_id: string | null
  assunto: string
  assunto_codigo: string | null
  queixa: string
  status: StatusChamado
  prioridade: PrioridadeChamado
  prazo: string | null
  setor_responsavel: SetorChamado
  aberto_por_usuario_id: string | null
  aberto_por_nome: string | null
  fechado_por_usuario_id: string | null
  fechado_por_nome: string | null
  resolucao: string | null
  aberto_em: string
  fechado_em: string | null
  created_at?: string
  updated_at?: string
  historico?: ChamadoHistorico[]
}

export interface CriarChamadoData {
  administradora_id: string
  grupo_id: string
  grupo_nome?: string
  beneficiario_origem: "vida_importada" | "cliente_administradora"
  vida_importada_id?: string | null
  cliente_administradora_id?: string | null
  cliente_nome: string
  cliente_cpf?: string
  cliente_telefone?: string
  cliente_email?: string
  assunto_codigo: AssuntoChamadoCodigo
  assunto: string
  queixa: string
  prioridade?: PrioridadeChamado
  prazo?: string | null
  setor_responsavel: SetorChamado
  aberto_por_usuario_id?: string | null
  aberto_por_nome?: string | null
}

export interface AtualizarChamadoData {
  status?: StatusChamado
  prioridade?: PrioridadeChamado
  prazo?: string | null
  setor_responsavel?: SetorChamado
  resolucao?: string
  observacao?: string
  usuario_id?: string | null
  usuario_nome?: string | null
}

export const STATUS_CHAMADO_LABELS: Record<StatusChamado, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
}

function mensagemErroSupabase(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message?: unknown }).message || "").trim()
    if (msg) return msg
  }
  return "Erro desconhecido"
}

function erroColunaInexistente(error: unknown, coluna: string): boolean {
  const msg = mensagemErroSupabase(error).toLowerCase()
  const alvo = coluna.toLowerCase()
  return msg.includes(alvo) && (msg.includes("does not exist") || msg.includes("column"))
}

async function normalizarUsuarioAbertura(
  administradoraId: string,
  usuarioId: string | null | undefined
): Promise<string | null> {
  const id = String(usuarioId || "").trim()
  if (!id) return null

  const { data, error } = await supabaseAdmin
    .from("usuarios_administradora")
    .select("id")
    .eq("id", id)
    .eq("administradora_id", administradoraId)
    .maybeSingle()

  if (error || !data?.id) return null
  return String(data.id)
}

export class ChamadosAdministradoraService {
  private static async resolverTenantId(administradoraId: string): Promise<string> {
    return resolveTenantIdForAdministradora(administradoraId)
  }

  private static aplicarFiltroTenant<T extends { eq: (col: string, val: string) => T; or: (filtro: string) => T }>(
    query: T,
    tenantId: string
  ): T {
    if (!tenantId) return query
    return query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  }

  static async listar(
    administradoraId: string,
    filtros?: {
      status?: StatusChamado | "todos"
      prioridade?: PrioridadeChamado | "todos"
      setor?: SetorChamado | "todos"
    }
  ): Promise<ChamadoAdministradora[]> {
    const tenantId = await this.resolverTenantId(administradoraId)
    let query = supabaseAdmin
      .from("chamados_administradora")
      .select("*")
      .eq("administradora_id", administradoraId)
      .order("prazo", { ascending: true, nullsFirst: false })
      .order("aberto_em", { ascending: false })

    query = this.aplicarFiltroTenant(query, tenantId)

    if (filtros?.status && filtros.status !== "todos") {
      query = query.eq("status", filtros.status)
    }

    if (filtros?.prioridade && filtros.prioridade !== "todos") {
      query = query.eq("prioridade", filtros.prioridade)
    }

    if (filtros?.setor && filtros.setor !== "todos") {
      query = query.eq("setor_responsavel", filtros.setor)
    }

    const { data, error } = await query
    if (error) throw new Error(mensagemErroSupabase(error))
    return (data || []) as ChamadoAdministradora[]
  }

  static async buscarPorId(
    id: string,
    administradoraId: string,
    comHistorico = true
  ): Promise<ChamadoAdministradora | null> {
    const tenantId = await this.resolverTenantId(administradoraId)
    let query = supabaseAdmin
      .from("chamados_administradora")
      .select("*")
      .eq("id", id)
      .eq("administradora_id", administradoraId)

    query = this.aplicarFiltroTenant(query, tenantId)

    const { data, error } = await query.maybeSingle()

    if (error) throw new Error(mensagemErroSupabase(error))
    if (!data) return null

    const chamado = data as ChamadoAdministradora
    if (comHistorico) {
      const { data: historico, error: errHist } = await supabaseAdmin
        .from("chamados_historico")
        .select("*")
        .eq("chamado_id", id)
        .order("criado_em", { ascending: true })

      if (errHist) throw new Error(mensagemErroSupabase(errHist))
      chamado.historico = (historico || []) as ChamadoHistorico[]
    }

    return chamado
  }

  private static async registrarHistorico(payload: {
    chamado_id: string
    tipo: ChamadoHistorico["tipo"]
    status_anterior?: string | null
    status_novo?: string | null
    descricao?: string | null
    usuario_id?: string | null
    usuario_nome?: string | null
    administradora_id?: string
  }) {
    let usuarioId: string | null = null
    if (payload.administradora_id && payload.usuario_id) {
      usuarioId = await normalizarUsuarioAbertura(payload.administradora_id, payload.usuario_id)
    }

    const { error } = await supabaseAdmin.from("chamados_historico").insert({
      chamado_id: payload.chamado_id,
      tipo: payload.tipo,
      status_anterior: payload.status_anterior ?? null,
      status_novo: payload.status_novo ?? null,
      descricao: payload.descricao?.trim() || null,
      usuario_id: usuarioId,
      usuario_nome: payload.usuario_nome?.trim() || null,
    })
    if (error) throw new Error(mensagemErroSupabase(error))
  }

  static async criar(payload: CriarChamadoData): Promise<ChamadoAdministradora> {
    const tenantId = await this.resolverTenantId(payload.administradora_id)
    const agora = new Date().toISOString()
    const abertoPorUsuarioId = await normalizarUsuarioAbertura(
      payload.administradora_id,
      payload.aberto_por_usuario_id
    )

    const insertBase: Record<string, unknown> = {
      administradora_id: payload.administradora_id,
      tenant_id: tenantId,
      grupo_id: payload.grupo_id,
      grupo_nome: payload.grupo_nome?.trim() || null,
      beneficiario_origem: payload.beneficiario_origem,
      vida_importada_id: payload.vida_importada_id ?? null,
      cliente_administradora_id: payload.cliente_administradora_id ?? null,
      cliente_nome: payload.cliente_nome.trim(),
      cliente_cpf: payload.cliente_cpf?.replace(/\D/g, "") || null,
      cliente_telefone: payload.cliente_telefone?.trim() || null,
      cliente_email: payload.cliente_email?.trim().toLowerCase() || null,
      assunto: payload.assunto.trim(),
      queixa: payload.queixa.trim(),
      status: "aberto",
      prioridade: payload.prioridade || "normal",
      prazo: payload.prazo ?? null,
      setor_responsavel: payload.setor_responsavel,
      aberto_por_usuario_id: abertoPorUsuarioId,
      aberto_por_nome: payload.aberto_por_nome?.trim() || null,
      aberto_em: agora,
    }

    let insertPayload: Record<string, unknown> = {
      ...insertBase,
      assunto_codigo: payload.assunto_codigo,
    }

    let { data, error } = await supabaseAdmin
      .from("chamados_administradora")
      .insert(insertPayload)
      .select()
      .single()

    for (const coluna of ["assunto_codigo", "prioridade", "prazo", "setor_responsavel"]) {
      if (!error) break
      if (!erroColunaInexistente(error, coluna)) break
      delete insertPayload[coluna]
      ;({ data, error } = await supabaseAdmin
        .from("chamados_administradora")
        .insert(insertPayload)
        .select()
        .single())
    }

    if (error) throw new Error(mensagemErroSupabase(error))

    const chamado = data as ChamadoAdministradora
    await this.registrarHistorico({
      chamado_id: chamado.id,
      tipo: "abertura",
      status_novo: "aberto",
      descricao: "Chamado aberto",
      usuario_id: payload.aberto_por_usuario_id ?? null,
      usuario_nome: payload.aberto_por_nome ?? null,
      administradora_id: payload.administradora_id,
    })

    return chamado
  }

  static async atualizar(
    id: string,
    administradoraId: string,
    payload: AtualizarChamadoData
  ): Promise<ChamadoAdministradora> {
    const existente = await this.buscarPorId(id, administradoraId, false)
    if (!existente) throw new Error("Chamado não encontrado")

    if (existente.status === "fechado" || existente.status === "resolvido") {
      throw new Error("Chamados concluídos não podem ser alterados")
    }

    const update: Record<string, unknown> = {}
    const statusNovo = payload.status
    const fechando = statusNovo === "fechado" || statusNovo === "resolvido"
    const prioridadeNova = payload.prioridade
    const prazoNovo = payload.prazo !== undefined ? payload.prazo : undefined
    const setorNovo = payload.setor_responsavel

    if (statusNovo) {
      update.status = statusNovo
    }

    if (prioridadeNova && prioridadeNova !== (existente.prioridade || "normal")) {
      update.prioridade = prioridadeNova
    }

    if (prazoNovo !== undefined) {
      const prazoAtual = existente.prazo ?? null
      if (prazoNovo !== prazoAtual) {
        update.prazo = prazoNovo
      }
    }

    if (setorNovo && setorNovo !== (existente.setor_responsavel || "implantacao")) {
      update.setor_responsavel = setorNovo
    }

    if (fechando) {
      const resolucao = payload.resolucao?.trim()
      if (!resolucao) {
        throw new Error("Informe a resolução ao concluir o chamado")
      }
      update.resolucao = resolucao
      update.fechado_em = new Date().toISOString()
      update.fechado_por_usuario_id = payload.usuario_id ?? null
      update.fechado_por_nome = payload.usuario_nome?.trim() || null
      if (statusNovo === "resolvido") {
        update.status = "resolvido"
      }
    }

    if (Object.keys(update).length === 0 && !payload.observacao?.trim()) {
      throw new Error("Nenhuma alteração informada")
    }

    if (Object.keys(update).length > 0) {
      const tenantId = await this.resolverTenantId(administradoraId)
      let query = supabaseAdmin
        .from("chamados_administradora")
        .update(update)
        .eq("id", id)
        .eq("administradora_id", administradoraId)

      query = this.aplicarFiltroTenant(query, tenantId)

      const { data, error } = await query.select().single()

      if (error) throw new Error(mensagemErroSupabase(error))

      if (statusNovo && statusNovo !== existente.status) {
        await this.registrarHistorico({
          chamado_id: id,
          tipo: fechando ? "fechamento" : "status",
          status_anterior: existente.status,
          status_novo: statusNovo,
          descricao: fechando ? payload.resolucao?.trim() : payload.observacao?.trim() || null,
          usuario_id: payload.usuario_id ?? null,
          usuario_nome: payload.usuario_nome ?? null,
          administradora_id: administradoraId,
        })
      }

      if (prioridadeNova && prioridadeNova !== (existente.prioridade || "normal")) {
        await this.registrarHistorico({
          chamado_id: id,
          tipo: "prioridade",
          descricao: `Prioridade alterada de ${PRIORIDADE_CHAMADO_LABELS[existente.prioridade || "normal"]} para ${PRIORIDADE_CHAMADO_LABELS[prioridadeNova]}`,
          usuario_id: payload.usuario_id ?? null,
          usuario_nome: payload.usuario_nome ?? null,
          administradora_id: administradoraId,
        })
      }

      if (prazoNovo !== undefined && prazoNovo !== (existente.prazo ?? null)) {
        await this.registrarHistorico({
          chamado_id: id,
          tipo: "prazo",
          descricao: prazoNovo
            ? `Prazo definido para ${formatarPrazoChamado(prazoNovo)}`
            : "Prazo removido",
          usuario_id: payload.usuario_id ?? null,
          usuario_nome: payload.usuario_nome ?? null,
          administradora_id: administradoraId,
        })
      }

      if (setorNovo && setorNovo !== (existente.setor_responsavel || "implantacao")) {
        await this.registrarHistorico({
          chamado_id: id,
          tipo: "setor",
          descricao: `Setor alterado de ${SETOR_CHAMADO_LABELS[existente.setor_responsavel || "implantacao"]} para ${SETOR_CHAMADO_LABELS[setorNovo]}`,
          usuario_id: payload.usuario_id ?? null,
          usuario_nome: payload.usuario_nome ?? null,
          administradora_id: administradoraId,
        })
      }
    }

    if (payload.observacao?.trim() && !fechando) {
      await this.registrarHistorico({
        chamado_id: id,
        tipo: "observacao",
        descricao: payload.observacao.trim(),
        usuario_id: payload.usuario_id ?? null,
        usuario_nome: payload.usuario_nome ?? null,
        administradora_id: administradoraId,
      })
    }

    const atualizado = await this.buscarPorId(id, administradoraId, true)
    if (!atualizado) throw new Error("Chamado não encontrado após atualização")
    return atualizado
  }

  static async fechar(
    id: string,
    administradoraId: string,
    payload: { resolucao: string; usuario_id?: string | null; usuario_nome?: string | null }
  ): Promise<ChamadoAdministradora> {
    return this.atualizar(id, administradoraId, {
      status: "fechado",
      resolucao: payload.resolucao,
      usuario_id: payload.usuario_id,
      usuario_nome: payload.usuario_nome,
    })
  }
}
