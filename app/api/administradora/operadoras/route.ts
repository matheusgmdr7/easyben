import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * GET /api/administradora/operadoras?query=...
 * Busca operadoras por nome, fantasia ou CNPJ para autocomplete no cadastro de contrato.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("query") || "").trim()

    if (query.length < 2) {
      return NextResponse.json([])
    }

    const queryDigits = query.replace(/\D/g, "")
    let qb = supabaseAdmin
      .from("operadoras")
      .select("id, nome, fantasia, cnpj")
      .order("fantasia", { ascending: true })
      .limit(10)

    if (queryDigits.length >= 2) {
      qb = qb.or(
        `nome.ilike.%${query}%,fantasia.ilike.%${query}%,cnpj.ilike.%${queryDigits}%`
      )
    } else {
      qb = qb.or(`nome.ilike.%${query}%,fantasia.ilike.%${query}%`)
    }

    const { data, error } = await qb
    if (error) {
      console.error("Erro ao buscar operadoras:", error)
      return NextResponse.json({ error: "Erro ao buscar operadoras." }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e: unknown) {
    console.error("Erro /api/administradora/operadoras:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar operadoras." },
      { status: 500 }
    )
  }
}
