import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { assertPodeGerenciarAcesso, mapUsuarioAdministradoraRow } from "@/lib/administradora-acesso-guard"
import {
  normalizarPermissoesAdministradora,
  type ModuloAdministradora,
} from "@/lib/administradora-permissoes"
import { obterPermissoesDoPerfil } from "@/services/usuarios-administradora-service"

type RouteContext = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const id = String(params.id || "").trim()
    const body = await request.json()
    const administradoraId = String(body.administradora_id || "").trim()

    if (!id || !administradoraId) {
      return NextResponse.json({ error: "ID e administradora_id são obrigatórios" }, { status: 400 })
    }

    await assertPodeGerenciarAcesso({
      administradora_id: administradoraId,
      solicitante_usuario_id: body.solicitante_usuario_id,
      solicitante_email: body.solicitante_email,
    })

    const { data: existente, error: errExistente } = await supabaseAdmin
      .from("usuarios_administradora")
      .select("id, is_master")
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .maybeSingle()

    if (errExistente) throw errExistente
    if (!existente) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    if (existente.is_master) {
      return NextResponse.json({ error: "Não é possível editar o usuário master por aqui" }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (body.nome != null) update.nome = String(body.nome).trim()
    if (body.email != null) update.email = String(body.email).trim().toLowerCase()
    if (body.status != null) update.status = body.status === "inativo" ? "inativo" : "ativo"
    if (body.perfil != null) update.perfil = String(body.perfil).trim()

    if (body.permissoes != null) {
      const permissoes = normalizarPermissoesAdministradora(body.permissoes) as ModuloAdministradora[]
      update.permissoes = permissoes
    } else if (body.perfil != null) {
      update.permissoes = obterPermissoesDoPerfil(String(body.perfil))
    }

    if (body.senha) {
      const senha = String(body.senha)
      if (senha.length < 6) {
        return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
      }
      update.senha_hash = await bcrypt.hash(senha, 10)
    }

    const { data, error } = await supabaseAdmin
      .from("usuarios_administradora")
      .update(update)
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .select(
        "id, administradora_id, tenant_id, nome, email, perfil, is_master, status, permissoes, criado_em, atualizado_em, ultimo_acesso"
      )
      .single()

    if (error) throw error
    return NextResponse.json(mapUsuarioAdministradoraRow(data as Record<string, unknown>))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar usuário"
    const status = msg.includes("permissão") || msg.includes("autorizado") || msg.includes("Sessão") ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const id = String(params.id || "").trim()
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body.administradora_id || "").trim()

    if (!id || !administradoraId) {
      return NextResponse.json({ error: "ID e administradora_id são obrigatórios" }, { status: 400 })
    }

    await assertPodeGerenciarAcesso({
      administradora_id: administradoraId,
      solicitante_usuario_id: body.solicitante_usuario_id,
      solicitante_email: body.solicitante_email,
    })

    const { data: existente } = await supabaseAdmin
      .from("usuarios_administradora")
      .select("id, is_master")
      .eq("id", id)
      .eq("administradora_id", administradoraId)
      .maybeSingle()

    if (!existente) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    if (existente.is_master) {
      return NextResponse.json({ error: "Não é possível excluir o usuário master" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("usuarios_administradora")
      .delete()
      .eq("id", id)
      .eq("administradora_id", administradoraId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao excluir usuário"
    const status = msg.includes("permissão") || msg.includes("autorizado") || msg.includes("Sessão") ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
