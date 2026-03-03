import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 120

/**
 * POST /api/administradora/fatura/gerar-boletos-lote
 * Body: {
 *   administradora_id, financeira_id, vencimento, taxa_administracao,
 *   clientes: Array<{ cliente_administradora_id, valor, cliente_nome?, cliente_email?, descricao? }>
 * }
 * Gera um boleto por cliente usando os mesmos critérios do gerar-boleto (valor/descrição por cliente).
 * Financeira, vencimento e taxa de administração são únicos para todos.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      administradora_id,
      financeira_id,
      vencimento,
      taxa_administracao,
      clientes,
    } = body

    if (
      !administradora_id ||
      !financeira_id ||
      !vencimento ||
      !Array.isArray(clientes) ||
      clientes.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "administradora_id, financeira_id, vencimento e clientes (array não vazio) são obrigatórios",
        },
        { status: 400 }
      )
    }

    const origin =
      request.nextUrl?.origin ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const url = `${origin}/api/administradora/fatura/gerar-boleto`
    const cookieHeader = request.headers.get("cookie") || ""

    const results: Array<{
      success: boolean
      cliente_administradora_id: string
      cliente_nome?: string
      boleto_url?: string
      invoice_url?: string
      fatura_id?: string
      numero_fatura?: string
      valor?: number
      error?: string
    }> = []

    for (const c of clientes) {
      const valor = Number(c.valor ?? c.valor_mensal ?? 0)
      if (isNaN(valor) || valor <= 0) {
        results.push({
          success: false,
          cliente_administradora_id: c.cliente_administradora_id,
          cliente_nome: c.cliente_nome,
          error: "Valor inválido",
        })
        continue
      }

      const payload = {
        administradora_id,
        financeira_id,
        cliente_administradora_id: c.cliente_administradora_id,
        valor,
        vencimento: String(vencimento).slice(0, 10),
        taxa_administracao:
          taxa_administracao != null && taxa_administracao !== ""
            ? Number(taxa_administracao)
            : undefined,
        descricao: c.descricao || undefined,
        cliente_nome: c.cliente_nome || undefined,
        cliente_email: c.cliente_email || undefined,
      }

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
          },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          results.push({
            success: true,
            cliente_administradora_id: data.cliente_administradora_id || c.cliente_administradora_id,
            cliente_nome: c.cliente_nome,
            boleto_url: data.boleto_url,
            invoice_url: data.invoice_url,
            fatura_id: data.fatura_id,
            numero_fatura: data.numero_fatura,
            valor: data.valor,
          })
        } else {
          results.push({
            success: false,
            cliente_administradora_id: c.cliente_administradora_id,
            cliente_nome: c.cliente_nome,
            error: data?.error || `HTTP ${res.status}`,
          })
        }
      } catch (err) {
        results.push({
          success: false,
          cliente_administradora_id: c.cliente_administradora_id,
          cliente_nome: c.cliente_nome,
          error: err instanceof Error ? err.message : "Erro ao gerar boleto",
        })
      }
    }

    const ok = results.filter((r) => r.success).length
    const fail = results.filter((r) => !r.success).length
    return NextResponse.json({
      results,
      resumo: { total: results.length, sucesso: ok, erro: fail },
    })
  } catch (e: unknown) {
    console.error("[gerar-boletos-lote] Erro:", e)
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Erro ao gerar boletos em lote",
      },
      { status: 500 }
    )
  }
}
