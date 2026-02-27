import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * PATCH /api/administradora/clientes/[id]
 * Atualiza apenas o corretor vinculado ao cliente.
 * Body: { administradora_id: string, corretor_id: string | null }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { administradora_id, corretor_id } = body

    if (!administradora_id) {
      return NextResponse.json(
        { error: "administradora_id é obrigatório" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("clientes_administradoras")
      .update({
        corretor_id: corretor_id === "" || corretor_id === undefined ? null : corretor_id,
      })
      .eq("id", id)
      .eq("administradora_id", administradora_id)
      .select("id, corretor_id")
      .single()

    if (error) {
      console.error("Erro ao atualizar corretor do cliente:", error)
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar" },
        { status: 500 }
      )
    }
    if (!data) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error("Erro PATCH cliente:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar" },
      { status: 500 }
    )
  }
}
