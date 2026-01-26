import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

/**
 * API Route para criar/atualizar administradora de teste
 * 
 * Credenciais de teste:
 * Email: teste@administradora.com
 * Senha: teste123
 * 
 * Execute: POST /api/admin/criar-administradora-teste
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Criando/atualizando administradora de teste...")
    
    // Gerar hash da senha "teste123"
    const senha = "teste123"
    const senhaHash = await bcrypt.hash(senha, 10)
    console.log("✅ Hash da senha gerado")
    
    // Buscar tenant_id padrão
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("status", "ativo")
      .order("created_at", { ascending: true })
      .limit(1)
    
    if (tenantError) {
      console.error("❌ Erro ao buscar tenant:", tenantError)
    }
    
    const tenantId = tenants && tenants.length > 0 ? tenants[0].id : null
    console.log("🏢 Tenant ID:", tenantId || "Nenhum encontrado")
    
    // Verificar se já existe
    const { data: existente, error: checkError } = await supabaseAdmin
      .from("administradoras")
      .select("id")
      .eq("email_login", "teste@administradora.com")
      .maybeSingle()
    
    if (checkError && checkError.code !== "PGRST116") {
      console.error("❌ Erro ao verificar administradora:", checkError)
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500 }
      )
    }
    
    const dadosAdministradora: any = {
      nome: "Administradora de Teste",
      nome_fantasia: "Admin Teste",
      cnpj: "12.345.678/0001-90",
      email: "teste@administradora.com",
      email_login: "teste@administradora.com",
      telefone: "(11) 99999-9999",
      status: "ativa",
      status_login: "ativo",
      senha_hash: senhaHash,
      updated_at: new Date().toISOString(),
    }
    
    if (tenantId) {
      dadosAdministradora.tenant_id = tenantId
    }
    
    let administradora
    
    if (existente) {
      // Atualizar existente
      console.log("📝 Atualizando administradora existente...")
      const { data, error } = await supabaseAdmin
        .from("administradoras")
        .update(dadosAdministradora)
        .eq("id", existente.id)
        .select()
        .single()
      
      if (error) {
        console.error("❌ Erro ao atualizar:", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
      
      administradora = data
      console.log("✅ Administradora de teste atualizada com sucesso!")
    } else {
      // Criar nova
      console.log("➕ Criando nova administradora...")
      const { data, error } = await supabaseAdmin
        .from("administradoras")
        .insert([dadosAdministradora])
        .select()
        .single()
      
      if (error) {
        console.error("❌ Erro ao criar:", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
      
      administradora = data
      console.log("✅ Administradora de teste criada com sucesso!")
    }
    
    // Remover senha_hash da resposta
    const { senha_hash, ...administradoraRetorno } = administradora
    
    return NextResponse.json({
      success: true,
      message: "Administradora de teste criada/atualizada com sucesso!",
      administradora: administradoraRetorno,
      credenciais: {
        email: "teste@administradora.com",
        senha: "teste123",
        url: "/administradora/login"
      }
    })
  } catch (error: any) {
    console.error("❌ Erro ao criar administradora de teste:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro desconhecido" },
      { status: 500 }
    )
  }
}







