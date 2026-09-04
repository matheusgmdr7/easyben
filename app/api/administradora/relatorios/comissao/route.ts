import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { CorretoresAdministradoraService } from "@/services/corretores-administradora-service"
import { FinanceirasService } from "@/services/financeiras-service"
import { faturaEstaPaga, normalizarStatusFatura } from "@/lib/fatura-status"
import { faturaPertenceAFinanceira } from "@/lib/fatura-filtro-financeira"
import {
  carregarNomesCorretoresLegado,
  corretorCombinaComFiltro,
  montarMapaCorretorPorCliente,
} from "@/lib/corretor-cliente-vinculo"

type FaturaRow = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  valor: number | null
  status: string | null
  vencimento: string | null
  numero_fatura: string | null
  pagamento_data?: string | null
  gateway_nome?: string | null
  financeira_id?: string | null
}

const OR_FILTRO_PAGA_NO_BANCO =
  "status.in.(paga,pago),and(pagamento_data.not.is.null,status.not.in.(cancelada,canceled,cancelled))"

const TODAS_CORRETORAS = "todas"

/** PostgREST/Supabase limitam ~1000 linhas por request; paginar para trazer o mês inteiro. */
const PAGE_SIZE_FATURAS = 1000

function primeiroDiaMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`
}

function ultimoDiaMes(ano: number, mes: number): string {
  const data = new Date(Date.UTC(ano, mes, 0))
  return `${ano}-${String(mes).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`
}

function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message?: unknown }).message)
  }
  return String(e)
}

/**
 * GET /api/administradora/relatorios/comissao
 * Faturas pagas no período (vencimento no mês/ano), clientes vinculados ao corretor informado.
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim() || ""
    const anoStr = request.nextUrl.searchParams.get("ano")?.trim() || ""
    const mesStr = request.nextUrl.searchParams.get("mes")?.trim() || ""
    const corretorIdParam = request.nextUrl.searchParams.get("corretor_id")?.trim() || ""
    const financeiraIdParam = request.nextUrl.searchParams.get("financeira_id")?.trim() || ""
    const pctRaw = request.nextUrl.searchParams.get("percentual")

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }
    if (!corretorIdParam) {
      return NextResponse.json({ error: "corretor_id é obrigatório (ou use \"todas\")." }, { status: 400 })
    }

    const ano = Number(anoStr)
    const mes = Number(mesStr)
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Informe ano e mês válidos (mês 1–12)." }, { status: 400 })
    }

    let percentual = pctRaw != null && pctRaw !== "" ? Number(String(pctRaw).replace(",", ".")) : 10
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      return NextResponse.json({ error: "percentual deve ser um número entre 0 e 100." }, { status: 400 })
    }

    const todasCorretoras =
      corretorIdParam.toLowerCase() === TODAS_CORRETORAS || corretorIdParam === "__todas__"

    const { data: administradora } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()

    const tenantAtual = await getCurrentTenantId()
    const tenantId = administradora?.tenant_id || tenantAtual

    const corretoresLista = await CorretoresAdministradoraService.listar(administradoraId)
    const nomePorCorretorId = new Map<string, string>()
    for (const c of corretoresLista) {
      nomePorCorretorId.set(c.id, c.nome)
    }

    let corretorFiltro: { id: string; nome: string } | null = null
    if (!todasCorretoras) {
      const corretor = await CorretoresAdministradoraService.buscarPorId(corretorIdParam, administradoraId)
      if (!corretor) {
        return NextResponse.json({ error: "Corretor não encontrado para esta administradora." }, { status: 404 })
      }
      corretorFiltro = { id: corretor.id, nome: corretor.nome }
    }

    let nomeFinanceiraPorId = ""
    if (financeiraIdParam) {
      const fin = await FinanceirasService.buscarPorId(financeiraIdParam, administradoraId)
      if (!fin) {
        return NextResponse.json(
          { error: "Financeira não encontrada para esta administradora." },
          { status: 404 }
        )
      }
      nomeFinanceiraPorId = String(fin.nome).trim() || "Financeira"
    }

    const inicio = primeiroDiaMes(ano, mes)
    const fim = ultimoDiaMes(ano, mes)

    const faturas: FaturaRow[] = []
    let from = 0
    while (true) {
      const { data: chunk, error: errFaturas } = await supabaseAdmin
        .from("faturas")
        .select(
          "id, cliente_administradora_id, cliente_nome, valor, status, vencimento, numero_fatura, pagamento_data, gateway_nome, financeira_id"
        )
        .eq("administradora_id", administradoraId)
        .gte("vencimento", inicio)
        .lte("vencimento", fim)
        .or(OR_FILTRO_PAGA_NO_BANCO)
        .order("vencimento", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE_FATURAS - 1)

      if (errFaturas) {
        console.error("relatório comissão — faturas:", errFaturas)
        return NextResponse.json(
          { error: errFaturas.message || "Erro ao buscar faturas" },
          { status: 500 }
        )
      }

      const lista = (chunk || []) as FaturaRow[]
      faturas.push(...lista)
      if (lista.length < PAGE_SIZE_FATURAS) break
      from += PAGE_SIZE_FATURAS
    }
    const clienteIds = Array.from(
      new Set(
        faturas
          .map((f) => String(f.cliente_administradora_id || "").trim())
          .filter(Boolean)
      )
    )

    const mapaCorretorCliente = await montarMapaCorretorPorCliente(
      clienteIds,
      administradoraId,
      tenantId
    )

    const idsCorretorSemNome = Array.from(
      new Set(
        Array.from(mapaCorretorCliente.values()).filter(
          (id): id is string => Boolean(id) && !nomePorCorretorId.has(id!)
        ) as string[]
      )
    )
    const nomesLegado = await carregarNomesCorretoresLegado(idsCorretorSemNome)
    for (const [id, nome] of nomesLegado) {
      nomePorCorretorId.set(id, nome)
    }

    const linhas: Array<{
      fatura_id: string
      cliente_administradora_id: string
      cliente_nome: string
      corretor_id: string | null
      corretor_nome: string
      numero_fatura: string | null
      valor_fatura: number
      vencimento: string | null
      status_boleto: string
      percentual_comissao: number
      valor_comissao: number
    }> = []

    for (const f of faturas) {
      const cid = String(f.cliente_administradora_id || "").trim()
      if (!cid) continue
      if (
        financeiraIdParam &&
        !faturaPertenceAFinanceira(
          f.financeira_id,
          f.gateway_nome,
          financeiraIdParam,
          nomeFinanceiraPorId
        )
      ) {
        continue
      }
      const corretorClienteId = mapaCorretorCliente.get(cid) ?? null
      if (!corretorClienteId) continue
      if (!todasCorretoras && !corretorCombinaComFiltro(corretorClienteId, corretorFiltro!, nomePorCorretorId)) {
        continue
      }

      const nomeCor =
        nomePorCorretorId.get(corretorClienteId) ||
        `Corretor ${String(corretorClienteId).slice(0, 8)}…`

      const valor = Number(f.valor ?? 0)
      const valorComissao = Number(((valor * percentual) / 100).toFixed(2))
      const statusBoleto = faturaEstaPaga(String(f.status || ""), f.pagamento_data)
        ? "paga"
        : normalizarStatusFatura(String(f.status || ""))

      linhas.push({
        fatura_id: f.id,
        cliente_administradora_id: cid,
        cliente_nome: String(f.cliente_nome || "Cliente"),
        corretor_id: corretorClienteId,
        corretor_nome: nomeCor,
        numero_fatura: f.numero_fatura ?? null,
        valor_fatura: valor,
        vencimento: f.vencimento ?? null,
        status_boleto: statusBoleto || "pendente",
        percentual_comissao: percentual,
        valor_comissao: valorComissao,
      })
    }

    const totalFaturas = linhas.reduce((s, l) => s + l.valor_fatura, 0)
    const totalComissao = Number(linhas.reduce((s, l) => s + l.valor_comissao, 0).toFixed(2))

    return NextResponse.json({
      corretor: todasCorretoras
        ? { id: TODAS_CORRETORAS, nome: "Todas as corretoras" }
        : corretorFiltro!,
      periodo: { ano, mes, inicio, fim },
      percentual,
      financeira: financeiraIdParam
        ? { id: financeiraIdParam, nome: nomeFinanceiraPorId }
        : null,
      criterio:
        "Faturas quitadas (paga/pago ou com pagamento_data), vencimento no mês/ano, filtro opcional por financeira, e cliente com corretor no contrato, na proposta ou na vida importada.",
      total_registros: linhas.length,
      total_clientes_distintos: new Set(linhas.map((l) => l.cliente_administradora_id)).size,
      total_valor_faturas: Number(totalFaturas.toFixed(2)),
      total_comissao: totalComissao,
      linhas,
    })
  } catch (e: unknown) {
    console.error("Erro relatório de comissão:", e)
    return NextResponse.json(
      { error: mensagemErro(e) || "Erro ao montar relatório de comissão" },
      { status: 500 }
    )
  }
}
