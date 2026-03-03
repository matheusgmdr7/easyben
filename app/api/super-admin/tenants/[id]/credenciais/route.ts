import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { PERFIS_PERMISSOES } from "@/services/usuarios-admin-service"

type CredencialTipo = "admin" | "analista" | "administradora"

function normalizarEmail(email: string): string {
  return String(email || "").trim().toLowerCase()
}

async function buscarAuthUserPorEmail(email: string) {
  const alvo = normalizarEmail(email)
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) throw error
  return (data?.users || []).find((u) => normalizarEmail(u.email || "") === alvo) || null
}

async function gerarCnpjUnico() {
  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    const base = `${Date.now()}${Math.floor(Math.random() * 10000)}`
      .replace(/\D/g, "")
      .slice(-14)
      .padStart(14, "0")
    const { data } = await supabaseAdmin
      .from("administradoras")
      .select("id")
      .eq("cnpj", base)
      .maybeSingle()
    if (!data?.id) return base
  }
  throw new Error("Não foi possível gerar um CNPJ único para a administradora.")
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id é obrigatório" }, { status: 400 })
    }

    const [{ data: usuarios }, { data: administradoras }] = await Promise.all([
      supabaseAdmin
        .from("usuarios_admin")
        .select("id, nome, email, perfil, status, ativo, tenant_id")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("updated_at", { ascending: false }),
      supabaseAdmin
        .from("administradoras")
        .select("id, nome, email_login, status_login, tenant_id")
        .eq("tenant_id", tenantId)
        .order("nome", { ascending: true }),
    ])

    const listaUsuarios = usuarios || []
    const admin = listaUsuarios.find((u) => ["admin", "master", "super_admin"].includes(String(u.perfil || "").toLowerCase()))
    const analista = listaUsuarios.find((u) => String(u.perfil || "").toLowerCase() === "assistente")

    return NextResponse.json({
      admin: admin
        ? { id: admin.id, nome: admin.nome || "", email: admin.email || "", perfil: admin.perfil || "admin" }
        : null,
      analista: analista
        ? { id: analista.id, nome: analista.nome || "", email: analista.email || "", perfil: analista.perfil || "assistente" }
        : null,
      administradora: (administradoras || []).length > 0
        ? {
            id: administradoras?.[0]?.id,
            nome: administradoras?.[0]?.nome || "-",
            email_login: administradoras?.[0]?.email_login || "",
            status_login: administradoras?.[0]?.status_login || "inativo",
          }
        : null,
    })
  } catch (e: unknown) {
    console.error("Erro ao carregar credenciais do tenant:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao carregar credenciais" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params
    const body = await request.json().catch(() => ({}))
    const tipo = String(body?.tipo || "") as CredencialTipo
    const acao = String(body?.acao || "")

    if (!tenantId) return NextResponse.json({ error: "tenant_id é obrigatório" }, { status: 400 })

    if (acao === "criar_vincular_administradora") {
      const { data: existente, error: errExistente } = await supabaseAdmin
        .from("administradoras")
        .select("id, nome, email_login, status_login")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true })
        .limit(1)
      if (errExistente) throw errExistente
      if ((existente || []).length > 0) {
        return NextResponse.json({
          success: true,
          administradora: existente?.[0],
          message: "Administradora já estava vinculada a esta plataforma.",
        })
      }

      const { data: tenant, error: errTenant } = await supabaseAdmin
        .from("tenants")
        .select("id, nome, email_remetente")
        .eq("id", tenantId)
        .maybeSingle()
      if (errTenant) throw errTenant
      if (!tenant?.id) {
        return NextResponse.json({ error: "Plataforma não encontrada." }, { status: 404 })
      }

      const cnpjGerado = await gerarCnpjUnico()
      const nomeBase = String(tenant.nome || "Administradora").trim()
      const { data: novaAdministradora, error: errInsert } = await supabaseAdmin
        .from("administradoras")
        .insert({
          tenant_id: tenantId,
          nome: nomeBase,
          nome_fantasia: nomeBase,
          razao_social: nomeBase,
          cnpj: cnpjGerado,
          email: tenant.email_remetente || null,
          status: "ativa",
          status_login: "pendente",
          observacoes: "Criada automaticamente pelo painel de plataforma (EasyBen Admin).",
        })
        .select("id, nome, email_login, status_login")
        .maybeSingle()
      if (errInsert) throw errInsert

      return NextResponse.json({
        success: true,
        administradora: novaAdministradora,
        message: "Administradora criada e vinculada à plataforma com sucesso.",
      })
    }

    if (!["admin", "analista", "administradora"].includes(tipo)) {
      return NextResponse.json({ error: "tipo inválido. Use admin, analista ou administradora." }, { status: 400 })
    }

    if (tipo === "administradora") {
      const emailLogin = normalizarEmail(String(body?.email || ""))
      const senha = String(body?.senha || "")
      if (!emailLogin) return NextResponse.json({ error: "email é obrigatório." }, { status: 400 })
      if (senha.length < 6) return NextResponse.json({ error: "senha deve ter no mínimo 6 caracteres." }, { status: 400 })

      const { data: adminRows, error: errAdminRows } = await supabaseAdmin
        .from("administradoras")
        .select("id, tenant_id, email_login, senha_hash")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true })
        .limit(1)
      if (errAdminRows) throw errAdminRows
      const administradoraId = adminRows?.[0]?.id
      const tinhaCredencial = Boolean(adminRows?.[0]?.email_login || adminRows?.[0]?.senha_hash)

      if (!administradoraId) {
        return NextResponse.json(
          { error: "Nenhuma administradora vinculada a esta plataforma. Cadastre a administradora primeiro." },
          { status: 400 }
        )
      }

      const { data: confl } = await supabaseAdmin
        .from("administradoras")
        .select("id")
        .ilike("email_login", emailLogin)
        .neq("id", administradoraId)
      if (confl && confl.length > 0) {
        return NextResponse.json({ error: "Este email já está em uso por outra administradora." }, { status: 400 })
      }

      const senhaHash = await bcrypt.hash(senha, 10)
      const authUser = await buscarAuthUserPorEmail(emailLogin)
      if (authUser) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          password: senha,
          user_metadata: {
            ...(authUser.user_metadata || {}),
            role: "administradora",
            tipo: "administradora",
          },
        })
      } else {
        await supabaseAdmin.auth.admin.createUser({
          email: emailLogin,
          password: senha,
          email_confirm: true,
          user_metadata: { role: "administradora", tipo: "administradora" },
        })
      }

      const { error: errUpd } = await supabaseAdmin
        .from("administradoras")
        .update({
          email_login: emailLogin,
          senha_hash: senhaHash,
          status_login: "ativo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", administradoraId)
      if (errUpd) throw errUpd

      return NextResponse.json({
        success: true,
        tipo,
        email: emailLogin,
        operation: tinhaCredencial ? "atualizada" : "criada",
      })
    }

    const email = normalizarEmail(String(body?.email || ""))
    const senha = String(body?.senha || "")
    const nome = String(body?.nome || "").trim() || (tipo === "admin" ? "Administrador da Plataforma" : "Analista da Plataforma")
    if (!email) return NextResponse.json({ error: "email é obrigatório." }, { status: 400 })
    if (senha.length < 6) return NextResponse.json({ error: "senha deve ter no mínimo 6 caracteres." }, { status: 400 })

    const perfil = tipo === "admin" ? "admin" : "assistente"
    const permissoes = tipo === "admin" ? PERFIS_PERMISSOES.admin : ["propostas", "em_analise", "cadastrado"]
    const senhaHash = await bcrypt.hash(senha, 10)

    const { data: existentePorEmail } = await supabaseAdmin
      .from("usuarios_admin")
      .select("id, tenant_id")
      .eq("email", email)
      .maybeSingle()

    if (existentePorEmail && existentePorEmail.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Já existe usuário com esse email em outra plataforma." }, { status: 400 })
    }

    const { data: existentesPorPerfil, error: errPerfil } = await supabaseAdmin
      .from("usuarios_admin")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("perfil", perfil)
      .order("created_at", { ascending: true })
      .limit(1)
    if (errPerfil) throw errPerfil

    const registroIdPreferencial = existentePorEmail?.id || existentesPorPerfil?.[0]?.id || null

    const authUser = await buscarAuthUserPorEmail(email)
    if (authUser) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: senha,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          role: "admin",
          perfil,
          nome,
        },
      })
    } else {
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          role: "admin",
          perfil,
          nome,
        },
      })
    }

    if (registroIdPreferencial) {
      const { error } = await supabaseAdmin
        .from("usuarios_admin")
        .update({
          nome,
          perfil,
          permissoes,
          status: "ativo",
          ativo: true,
          senha_hash: senhaHash,
          tenant_id: tenantId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registroIdPreferencial)
      if (error) throw error
    } else {
      const { error } = await supabaseAdmin.from("usuarios_admin").insert({
        nome,
        email,
        perfil,
        permissoes,
        status: "ativo",
        ativo: true,
        senha_hash: senhaHash,
        tenant_id: tenantId,
      })
      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      tipo,
      email,
      operation: registroIdPreferencial ? "atualizada" : "criada",
    })
  } catch (e: unknown) {
    console.error("Erro ao salvar credenciais do tenant:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar credenciais" }, { status: 500 })
  }
}
