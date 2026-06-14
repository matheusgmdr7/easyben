import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { assertPodeGerenciarAcesso, mapUsuarioAdministradoraRow } from "@/lib/administradora-acesso-guard"
import {
  normalizarPermissoesAdministradora,
  type ModuloAdministradora,
} from "@/lib/administradora-permissoes"
import { obterPermissoesDoPerfil } from "@/services/usuarios-administradora-service"

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const solicitanteUsuarioId = request.nextUrl.searchParams.get("solicitante_usuario_id")
    const solicitanteEmail = request.nextUrl.searchParams.get("solicitante_email")

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    await assertPodeGerenciarAcesso({
      administradora_id: administradoraId,
      solicitante_usuario_id: solicitanteUsuarioId,
      solicitante_email: solicitanteEmail,
    })

    const { data, error } = await supabaseAdmin
      .from("usuarios_administradora")
      .select(
        "id, administradora_id, tenant_id, nome, email, perfil, is_master, status, permissoes, criado_em, atualizado_em, ultimo_acesso"
      )
      .eq("administradora_id", administradoraId)
      .order("criado_em", { ascending: false })

    if (error) {
      if (String(error.message || "").includes("usuarios_administradora")) {
        return NextResponse.json(
          { error: "Tabela de usuários não encontrada. Execute scripts/criar-usuarios-administradora.sql" },
          { status: 500 }
        )
      }
      throw error
    }

    return NextResponse.json((data || []).map((row) => mapUsuarioAdministradoraRow(row as Record<string, unknown>)))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao listar usuários"
    const status = msg.includes("permissão") || msg.includes("autorizado") || msg.includes("Sessão") ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const administradoraId = String(body.administradora_id || "").trim()
    const nome = String(body.nome || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const senha = String(body.senha || "")
    const perfil = String(body.perfil || "customizado").trim()
    const status = body.status === "inativo" ? "inativo" : "ativo"

    if (!administradoraId || !nome || !email || !senha) {
      return NextResponse.json({ error: "Nome, email, senha e administradora são obrigatórios" }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    await assertPodeGerenciarAcesso({
      administradora_id: administradoraId,
      solicitante_usuario_id: body.solicitante_usuario_id,
      solicitante_email: body.solicitante_email,
    })

    const permissoesBody = normalizarPermissoesAdministradora(body.permissoes)
    const permissoes: ModuloAdministradora[] =
      permissoesBody.length > 0 ? permissoesBody : obterPermissoesDoPerfil(perfil)

    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("id, tenant_id, email_login")
      .eq("id", administradoraId)
      .maybeSingle()

    if (!adm) return NextResponse.json({ error: "Administradora não encontrada" }, { status: 404 })
    if (String(adm.email_login || "").trim().toLowerCase() === email) {
      return NextResponse.json(
        { error: "Este email já é usado pela conta master da administradora" },
        { status: 409 }
      )
    }

    const senhaHash = await bcrypt.hash(senha, 10)
    const { data, error } = await supabaseAdmin
      .from("usuarios_administradora")
      .insert({
        administradora_id: administradoraId,
        tenant_id: adm.tenant_id || null,
        nome,
        email,
        senha_hash: senhaHash,
        perfil,
        is_master: false,
        status,
        permissoes,
        criado_por: body.solicitante_usuario_id || null,
      })
      .select(
        "id, administradora_id, tenant_id, nome, email, perfil, is_master, status, permissoes, criado_em, atualizado_em, ultimo_acesso"
      )
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Já existe um usuário com este email nesta administradora" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(mapUsuarioAdministradoraRow(data as Record<string, unknown>), { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao criar usuário"
    const status = msg.includes("permissão") || msg.includes("autorizado") || msg.includes("Sessão") ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
