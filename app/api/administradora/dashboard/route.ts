import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  valor: number | null
  status: string | null
  vencimento: string | null
  pagamento_data: string | null
}

type VidaMap = {
  grupo_id: string | null
  corretor_id: string | null
}

const ASAAS_TO_INTERNO: Record<string, string> = {
  PENDING: "pendente",
  RECEIVED: "paga",
  CONFIRMED: "paga",
  RECEIVED_IN_CASH: "paga",
  OVERDUE: "atrasada",
  REFUNDED: "cancelada",
  REFUND_REQUESTED: "cancelada",
  CHARGEBACK_REQUESTED: "cancelada",
  CHARGEBACK_DISPUTE: "cancelada",
  AWAITING_CHARGEBACK_REVERSAL: "cancelada",
  DELETED: "cancelada",
  CANCELED: "cancelada",
  CANCELLED: "cancelada",
  AWAITING_RISK_ANALYSIS: "pendente",
}

function normalizarStatus(status: string | null | undefined): string {
  const bruto = String(status || "").trim()
  if (!bruto) return ""
  const upper = bruto.toUpperCase()
  if (ASAAS_TO_INTERNO[upper]) return ASAAS_TO_INTERNO[upper]
  const lower = bruto.toLowerCase()
  if (lower === "paid") return "paga"
  if (lower === "overdue") return "atrasada"
  if (lower === "cancelled" || lower === "canceled") return "cancelada"
  return lower
}

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const anoParam = request.nextUrl.searchParams.get("ano")
    const mesParam = request.nextUrl.searchParams.get("mes")
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantId = adm?.tenant_id || (await getCurrentTenantId())

    const hoje = new Date()
    const ano = anoParam ? Number(anoParam) : hoje.getFullYear()
    const mes = mesParam ? Number(mesParam) : hoje.getMonth() + 1
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Período inválido. Informe ano/mes válidos." }, { status: 400 })
    }

    const inicioPeriodo = `${ano}-${String(mes).padStart(2, "0")}-01`
    const fimPeriodo = new Date(Date.UTC(ano, mes, 0))
    const fimPeriodoIso = `${ano}-${String(mes).padStart(2, "0")}-${String(fimPeriodo.getUTCDate()).padStart(2, "0")}`
    const periodoRef = `${ano}-${String(mes).padStart(2, "0")}`

    const [{ count: vidasCount }, { count: vinculosCount }, { data: grupos }, { data: corretores }] = await Promise.all([
      supabaseAdmin
        .from("vidas_importadas")
        .select("id", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("clientes_grupos")
        .select("id", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("corretores_administradora")
        .select("id, nome")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId),
    ])

    let faturas: FaturaRow[] = []
    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data: chunk, error } = await supabaseAdmin
        .from("faturas")
        .select("id, cliente_administradora_id, cliente_nome, valor, status, vencimento, pagamento_data")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .gte("vencimento", inicioPeriodo)
        .lte("vencimento", fimPeriodoIso)
        .order("vencimento", { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      const lista = (chunk || []) as FaturaRow[]
      faturas = faturas.concat(lista)
      if (lista.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    const clientesAtivos = (vidasCount || 0) > 0 ? Number(vidasCount || 0) : Number(vinculosCount || 0)

    const grupoNomeById = new Map<string, string>()
    for (const g of grupos || []) {
      grupoNomeById.set(String((g as any).id), String((g as any).nome || "—"))
    }

    const corretorNomeById = new Map<string, string>()
    for (const c of corretores || []) {
      corretorNomeById.set(String((c as any).id), String((c as any).nome || "—"))
    }

    const clienteAdmIds = Array.from(
      new Set(faturas.map((f) => String(f.cliente_administradora_id || "").trim()).filter(Boolean))
    )
    const vidaByClienteAdmId = new Map<string, VidaMap>()
    if (clienteAdmIds.length > 0) {
      for (let i = 0; i < clienteAdmIds.length; i += 500) {
        const lote = clienteAdmIds.slice(i, i + 500)
        const { data: vidasLote } = await supabaseAdmin
          .from("vidas_importadas")
          .select("cliente_administradora_id, grupo_id, corretor_id, tipo")
          .eq("administradora_id", administradoraId)
          .eq("tenant_id", tenantId)
          .in("cliente_administradora_id", lote)

        for (const v of vidasLote || []) {
          const clienteAdmId = String((v as any)?.cliente_administradora_id || "").trim()
          if (!clienteAdmId) continue
          const tipo = String((v as any)?.tipo || "").toLowerCase()
          const atual = vidaByClienteAdmId.get(clienteAdmId)
          if (!atual || tipo === "titular") {
            vidaByClienteAdmId.set(clienteAdmId, {
              grupo_id: (v as any)?.grupo_id || null,
              corretor_id: (v as any)?.corretor_id || null,
            })
          }
        }
      }
    }

    let faturasPendentes = 0
    let valorEmAberto = 0
    let recebidoMes = 0
    let valorFaturasAtrasadas = 0
    let valorAtrasado = 0

    const inadimplentesMap = new Map<
      string,
      {
        cliente_nome: string
        valor: number
        status: string
        grupo: string
        corretor: string
      }
    >()

    for (const f of faturas) {
      const status = normalizarStatus(f.status)
      const valor = Number(f.valor || 0)

      const isPaga = status === "paga"
      const isPendente = status === "pendente"
      const isAtrasada = status === "atrasada"
      const isVencida = status === "vencida"

      if (isPendente || isAtrasada || isVencida) {
        faturasPendentes += 1
      }

      if (!isPaga) {
        valorEmAberto += valor
      }

      if (isPaga) {
        const dataPagamento = String(f.pagamento_data || "")
        if (dataPagamento.slice(0, 7) === periodoRef) {
          recebidoMes += valor
        }
      }

      if (isAtrasada) {
        valorFaturasAtrasadas += valor
      }

      if (isAtrasada || isVencida) {
        valorAtrasado += valor
      }

      if (status === "cancelada") {
        const clienteAdmId = String(f.cliente_administradora_id || "").trim()
        const nome = String(f.cliente_nome || "Cliente")
        const key = clienteAdmId || nome

        const vidaCtx = clienteAdmId ? vidaByClienteAdmId.get(clienteAdmId) : undefined
        const grupoNome = vidaCtx?.grupo_id ? grupoNomeById.get(vidaCtx.grupo_id) || "—" : "—"
        const corretorNome = vidaCtx?.corretor_id ? corretorNomeById.get(vidaCtx.corretor_id) || "—" : "—"

        const atual = inadimplentesMap.get(key)
        if (!atual) {
          inadimplentesMap.set(key, {
            cliente_nome: nome,
            valor,
            status,
            grupo: grupoNome,
            corretor: corretorNome,
          })
        } else {
          atual.valor += valor
          atual.status = "cancelada"
        }
      }
    }

    const inadimplentes = Array.from(inadimplentesMap.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 100)

    return NextResponse.json({
      periodo: {
        ano,
        mes,
        inicio: inicioPeriodo,
        fim: fimPeriodoIso,
      },
      cards: {
        clientes_ativos: clientesAtivos,
        faturas_pendentes: faturasPendentes,
        valor_em_aberto: Number(valorEmAberto.toFixed(2)),
        valor_recebido_mes: Number(recebidoMes.toFixed(2)),
        clientes_inadimplentes: inadimplentes.length,
        faturas_atrasadas_valor: Number(valorFaturasAtrasadas.toFixed(2)),
        valor_atrasado: Number(valorAtrasado.toFixed(2)),
      },
      inadimplentes,
    })
  } catch (e: unknown) {
    console.error("Erro dashboard administradora:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao montar dashboard" },
      { status: 500 }
    )
  }
}

