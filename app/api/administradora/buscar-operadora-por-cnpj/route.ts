import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * GET /api/administradora/buscar-operadora-por-cnpj?cnpj=XXX
 * Busca operadora por CNPJ (com ou sem formatação), sem filtrar por tenant.
 * Assim é possível reaproveitar dados de operadoras já cadastradas e, quando
 * não houver resultado, cadastrar novas operadoras diretamente na página de contrato.
 * Usa supabaseAdmin para evitar problemas de RLS/sessão no contexto da administradora.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get("cnpj")?.trim() || ""

    const cnpjLimpo = cnpj.replace(/\D/g, "")
    if (cnpjLimpo.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ deve conter 14 dígitos." },
        { status: 400 }
      )
    }

    const { data: rows, error } = await supabaseAdmin
      .from("operadoras")
      .select("id, nome, fantasia, cnpj")
      .eq("cnpj", cnpjLimpo)
      .limit(1)

    if (error) {
      console.error("Erro ao buscar operadora por CNPJ:", error)
      return NextResponse.json({ error: "Erro ao buscar operadora." }, { status: 500 })
    }

    const data = Array.isArray(rows) ? rows[0] : rows

    if (!data) {
      return NextResponse.json(
        { error: "Operadora não encontrada. Preencha Razão Social e Nome Fantasia e salve para cadastrar." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: data.id,
      nome: data.nome,
      fantasia: data.fantasia,
      cnpj: data.cnpj,
    })
  } catch (e: unknown) {
    console.error("Erro buscar-operadora-por-cnpj:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar operadora." },
      { status: 500 }
    )
  }
}
