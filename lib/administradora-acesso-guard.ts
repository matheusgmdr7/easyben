import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  normalizarPermissoesAdministradora,
  type ModuloAdministradora,
} from "@/lib/administradora-permissoes"
import { montarUsuarioSessaoFromRow } from "@/services/usuarios-administradora-service"

export type ContextoSolicitanteAdministradora = {
  administradora_id: string
  solicitante_usuario_id?: string | null
  solicitante_email?: string | null
}

export async function assertPodeGerenciarAcesso(ctx: ContextoSolicitanteAdministradora) {
  const admId = String(ctx.administradora_id || "").trim()
  if (!admId) throw new Error("administradora_id é obrigatório")

  const usuarioId = String(ctx.solicitante_usuario_id || "").trim()
  if (usuarioId) {
    const { data: usuario, error } = await supabaseAdmin
      .from("usuarios_administradora")
      .select("id, administradora_id, is_master, status, permissoes")
      .eq("id", usuarioId)
      .eq("administradora_id", admId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!usuario || String(usuario.status) !== "ativo") {
      throw new Error("Usuário solicitante não autorizado")
    }

    const permissoes = normalizarPermissoesAdministradora(usuario.permissoes)
    if (usuario.is_master || permissoes.includes("gerenciar_acesso")) {
      return montarUsuarioSessaoFromRow({
        id: usuario.id,
        nome: "",
        email: "",
        is_master: usuario.is_master,
        perfil: "customizado",
        permissoes,
      })
    }
    throw new Error("Sem permissão para gerenciar acesso")
  }

  const email = String(ctx.solicitante_email || "")
    .trim()
    .toLowerCase()
  if (!email) throw new Error("Sessão inválida para esta operação")

  const { data: adm, error: errAdm } = await supabaseAdmin
    .from("administradoras")
    .select("id, email_login, status, status_login")
    .eq("id", admId)
    .maybeSingle()

  if (errAdm) throw new Error(errAdm.message)
  if (!adm) throw new Error("Administradora não encontrada")
  if (String(adm.email_login || "").trim().toLowerCase() !== email) {
    throw new Error("Sem permissão para gerenciar acesso")
  }
  if (String(adm.status) !== "ativa" || String(adm.status_login) !== "ativo") {
    throw new Error("Conta master inativa")
  }

  return null
}

export function mapUsuarioAdministradoraRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    administradora_id: String(row.administradora_id),
    tenant_id: row.tenant_id ? String(row.tenant_id) : null,
    nome: String(row.nome || ""),
    email: String(row.email || ""),
    perfil: String(row.perfil || "customizado"),
    is_master: row.is_master === true,
    status: (String(row.status || "ativo") as "ativo" | "inativo"),
    permissoes: normalizarPermissoesAdministradora(row.permissoes) as ModuloAdministradora[],
    criado_em: row.criado_em ? String(row.criado_em) : undefined,
    atualizado_em: row.atualizado_em ? String(row.atualizado_em) : undefined,
    ultimo_acesso: row.ultimo_acesso ? String(row.ultimo_acesso) : null,
  }
}
