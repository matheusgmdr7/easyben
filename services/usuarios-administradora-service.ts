import {
  type ModuloAdministradora,
  normalizarPermissoesAdministradora,
  PERFIS_ADMINISTRADORA,
  TODOS_MODULOS_ADMINISTRADORA,
} from "@/lib/administradora-permissoes"

export type PerfilAdministradoraUsuario = keyof typeof PERFIS_ADMINISTRADORA | "customizado" | "master"

export interface UsuarioAdministradoraSessao {
  id: string | null
  nome: string
  email: string
  is_master: boolean
  perfil: PerfilAdministradoraUsuario
  permissoes: ModuloAdministradora[]
}

export interface UsuarioAdministradora {
  id: string
  administradora_id: string
  tenant_id?: string | null
  nome: string
  email: string
  perfil: string
  is_master: boolean
  status: "ativo" | "inativo"
  permissoes: ModuloAdministradora[]
  criado_em?: string
  atualizado_em?: string
  ultimo_acesso?: string | null
}

export interface CriarUsuarioAdministradoraData {
  administradora_id: string
  nome: string
  email: string
  senha: string
  perfil?: string
  permissoes: ModuloAdministradora[]
  status?: "ativo" | "inativo"
  solicitante_usuario_id?: string | null
  solicitante_email?: string | null
}

export interface AtualizarUsuarioAdministradoraData {
  administradora_id: string
  nome?: string
  email?: string
  senha?: string
  perfil?: string
  permissoes?: ModuloAdministradora[]
  status?: "ativo" | "inativo"
  solicitante_usuario_id?: string | null
  solicitante_email?: string | null
}

export function montarUsuarioMasterSessao(administradora: {
  nome?: string | null
  nome_fantasia?: string | null
  email_login?: string | null
}): UsuarioAdministradoraSessao {
  return {
    id: null,
    nome: String(administradora.nome_fantasia || administradora.nome || "Master").trim(),
    email: String(administradora.email_login || "").trim(),
    is_master: true,
    perfil: "master",
    permissoes: [...TODOS_MODULOS_ADMINISTRADORA],
  }
}

export function montarUsuarioSessaoFromRow(row: {
  id: string
  nome: string
  email: string
  is_master?: boolean | null
  perfil?: string | null
  permissoes?: unknown
}): UsuarioAdministradoraSessao {
  const isMaster = row.is_master === true
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    is_master: isMaster,
    perfil: (row.perfil as PerfilAdministradoraUsuario) || "customizado",
    permissoes: isMaster
      ? [...TODOS_MODULOS_ADMINISTRADORA]
      : normalizarPermissoesAdministradora(row.permissoes),
  }
}

export function obterPermissoesDoPerfil(perfil: string): ModuloAdministradora[] {
  const preset = PERFIS_ADMINISTRADORA[perfil]
  return preset ? [...preset.permissoes] : []
}

export async function listarUsuariosAdministradora(
  administradoraId: string,
  ctx?: { solicitante_usuario_id?: string | null; solicitante_email?: string | null }
): Promise<UsuarioAdministradora[]> {
  const params = new URLSearchParams({ administradora_id: administradoraId })
  if (ctx?.solicitante_usuario_id) params.set("solicitante_usuario_id", ctx.solicitante_usuario_id)
  if (ctx?.solicitante_email) params.set("solicitante_email", ctx.solicitante_email)

  const res = await fetch(`/api/administradora/usuarios?${params.toString()}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Erro ao listar usuários")
  return Array.isArray(data) ? data : []
}

export async function criarUsuarioAdministradora(payload: CriarUsuarioAdministradoraData) {
  const res = await fetch("/api/administradora/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Erro ao criar usuário")
  return data as UsuarioAdministradora
}

export async function atualizarUsuarioAdministradora(
  id: string,
  payload: AtualizarUsuarioAdministradoraData
) {
  const res = await fetch(`/api/administradora/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Erro ao atualizar usuário")
  return data as UsuarioAdministradora
}

export async function excluirUsuarioAdministradora(
  id: string,
  payload: { administradora_id: string; solicitante_usuario_id?: string | null; solicitante_email?: string | null }
) {
  const res = await fetch(`/api/administradora/usuarios/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Erro ao excluir usuário")
  return data
}
