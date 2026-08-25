import { NextRequest, NextResponse } from "next/server"
import {
  ChamadosAdministradoraService,
  assuntoChamadoValido,
  labelAssuntoChamado,
  prioridadeChamadoValida,
  prazoChamadoDeInput,
  setorChamadoValido,
  type PrioridadeChamado,
  type SetorChamado,
  type StatusChamado,
} from "@/services/chamados-administradora-service"

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const status = request.nextUrl.searchParams.get("status") as StatusChamado | "todos" | null
    const prioridade = request.nextUrl.searchParams.get("prioridade") as PrioridadeChamado | "todos" | null
    const setor = request.nextUrl.searchParams.get("setor") as SetorChamado | "todos" | null
    const list = await ChamadosAdministradoraService.listar(administradoraId, {
      status: status || "todos",
      prioridade: prioridade || "todos",
      setor: setor || "todos",
    })
    return NextResponse.json(list)
  } catch (e: unknown) {
    console.error("Erro ao listar chamados:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar chamados" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      administradora_id,
      grupo_id,
      beneficiario_origem,
      vida_importada_id,
      cliente_administradora_id,
      cliente_nome,
      assunto_codigo,
      queixa,
    } = body

    if (
      !administradora_id ||
      !grupo_id ||
      !beneficiario_origem ||
      !cliente_nome?.trim() ||
      !assunto_codigo ||
      !queixa?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "administradora_id, grupo_id, beneficiário, cliente_nome, assunto e queixa são obrigatórios",
        },
        { status: 400 }
      )
    }

    if (!assuntoChamadoValido(String(assunto_codigo))) {
      return NextResponse.json({ error: "Assunto inválido" }, { status: 400 })
    }

    const assuntoLabel = labelAssuntoChamado(assunto_codigo)
    if (!assuntoLabel) {
      return NextResponse.json({ error: "Assunto inválido" }, { status: 400 })
    }

    if (beneficiario_origem === "vida_importada" && !vida_importada_id) {
      return NextResponse.json({ error: "vida_importada_id é obrigatório" }, { status: 400 })
    }

    if (beneficiario_origem === "cliente_administradora" && !cliente_administradora_id) {
      return NextResponse.json({ error: "cliente_administradora_id é obrigatório" }, { status: 400 })
    }

    const prioridadeRaw = body.prioridade ? String(body.prioridade) : "normal"
    if (!prioridadeChamadoValida(prioridadeRaw)) {
      return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 })
    }

    const setorRaw = body.setor_responsavel ? String(body.setor_responsavel) : ""
    if (!setorChamadoValido(setorRaw)) {
      return NextResponse.json({ error: "Setor responsável inválido" }, { status: 400 })
    }

    const created = await ChamadosAdministradoraService.criar({
      administradora_id,
      grupo_id,
      grupo_nome: body.grupo_nome?.trim(),
      beneficiario_origem,
      vida_importada_id: vida_importada_id ?? null,
      cliente_administradora_id: cliente_administradora_id ?? null,
      cliente_nome: cliente_nome.trim(),
      cliente_cpf: body.cliente_cpf?.trim(),
      cliente_telefone: body.cliente_telefone?.trim(),
      cliente_email: body.cliente_email?.trim(),
      assunto_codigo,
      assunto: assuntoLabel,
      queixa: queixa.trim(),
      prioridade: prioridadeRaw,
      prazo: prazoChamadoDeInput(body.prazo),
      setor_responsavel: setorRaw,
      aberto_por_usuario_id: body.aberto_por_usuario_id ?? null,
      aberto_por_nome: body.aberto_por_nome?.trim() ?? null,
    })
    return NextResponse.json(created)
  } catch (e: unknown) {
    console.error("Erro ao criar chamado:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar chamado" },
      { status: 500 }
    )
  }
}
