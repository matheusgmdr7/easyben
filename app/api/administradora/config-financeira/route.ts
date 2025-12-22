import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * API Route para buscar e salvar configuração financeira de uma administradora
 * Usa supabaseAdmin para contornar RLS
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const administradoraId = searchParams.get("administradora_id")

    if (!administradoraId) {
      return NextResponse.json(
        { success: false, error: "ID da administradora é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar configuração financeira usando supabaseAdmin (contorna RLS)
    const { data, error } = await supabaseAdmin
      .from("administradoras_config_financeira")
      .select("*")
      .eq("administradora_id", administradoraId)
      .maybeSingle()

    if (error) {
      console.error("❌ Erro ao buscar configuração financeira:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config: data || null,
    })
  } catch (error: any) {
    console.error("❌ Erro na API de configuração financeira:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { administradora_id, ...config } = body

    if (!administradora_id) {
      return NextResponse.json(
        { success: false, error: "ID da administradora é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se já existe configuração
    const { data: configExistente } = await supabaseAdmin
      .from("administradoras_config_financeira")
      .select("id")
      .eq("administradora_id", administradora_id)
      .maybeSingle()

    let data
    let error

    if (configExistente) {
      // Atualizar configuração existente
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("administradoras_config_financeira")
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq("administradora_id", administradora_id)
        .select()
        .single()

      data = updated
      error = updateError
    } else {
      // Criar nova configuração
      const { data: created, error: createError } = await supabaseAdmin
        .from("administradoras_config_financeira")
        .insert([
          {
            administradora_id,
            ...config,
          },
        ])
        .select()
        .single()

      data = created
      error = createError
    }

    if (error) {
      console.error("❌ Erro ao salvar configuração financeira:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config: data,
    })
  } catch (error: any) {
    console.error("❌ Erro na API de configuração financeira:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
}





