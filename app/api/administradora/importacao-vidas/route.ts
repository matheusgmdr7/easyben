import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { obterValorProdutoPorIdade, calcularIdade } from "@/lib/calcular-valor-produto"

/**
 * Normaliza data de nascimento para yyyy-MM-dd.
 * - null/undefined/"": null
 * - number: serial Excel (ex.: 44927) → yyyy-MM-dd
 * - string numérico (ex.: "44927", "44927.5"): serial Excel
 * - dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy: barras, hífens e pontos (Unicode normalizado)
 * - yyyy-MM-dd: devolve como está
 */
function parseDataNascimento(s: string | number | null | undefined): string | null {
  if (s == null || s === "") return null
  let t = (typeof s === "string" ? s : String(s)).trim()
  const sp = t.indexOf(" ")
  if (sp > 0) t = t.slice(0, sp)
  if (!t) return null
  const t2 = t.replace(/[\u2044\u2215\\]/g, "/").replace(/[\u2013\u2014\u2212]/g, "-")
  // Serial Excel: number ou string 4–6 dígitos (opcional .dec)
  if (typeof s === "number") {
    const n = Math.floor(Number(s))
    if (n >= 1 && n <= 50000) {
      const d = new Date((n - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
    return null
  }
  const serialM = /^(\d{4,6})(\.\d+)?$/.exec(t2)
  if (serialM) {
    const n = parseInt(serialM[1], 10)
    if (n >= 1 && n <= 50000) {
      const d = new Date((n - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }
  // dd/MM/yyyy
  const d1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t2)
  if (d1) {
    const d = new Date(parseInt(d1[3], 10), parseInt(d1[2], 10) - 1, parseInt(d1[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // yyyy-MM-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t2)) return t2
  // dd-MM-yyyy
  const d3 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t2)
  if (d3) {
    const d = new Date(parseInt(d3[3], 10), parseInt(d3[2], 10) - 1, parseInt(d3[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // dd.MM.yyyy
  const d4 = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t2)
  if (d4) {
    const d = new Date(parseInt(d4[3], 10), parseInt(d4[2], 10) - 1, parseInt(d4[1], 10))
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { administradora_id, grupo_id, produto_id, linhas } = body as {
      administradora_id?: string
      grupo_id?: string
      produto_id?: string | null
      linhas?: Array<{
        nome?: string
        cpf?: string
        nome_mae?: string
        nome_pai?: string
        tipo?: string
        data_nascimento?: string
        idade?: number | null
        sexo?: string
        estado_civil?: string
        parentesco?: string
        cpf_titular?: string
        identidade?: string
        cns?: string
        acomodacao?: string
        cep?: string
        logradouro?: string
        numero?: string
        complemento?: string
        bairro?: string
        cidade?: string
        estado?: string
        telefone?: string
        email?: string
        observacoes?: string
        corretor?: string
        plano?: string
        dados_adicionais?: Record<string, string>
      }>
    }

    if (!administradora_id || !grupo_id) {
      return NextResponse.json({ error: "administradora_id e grupo_id são obrigatórios" }, { status: 400 })
    }
    if (!Array.isArray(linhas) || linhas.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha para importar" }, { status: 400 })
    }

    const errosDependente: { linha: number; nome: string }[] = []
    linhas.forEach((l, idx) => {
      const tipo = (l.tipo || "titular").toString().toLowerCase()
      if (tipo === "dependente") {
        const cpfTit = l.cpf_titular ? String(l.cpf_titular).replace(/\D/g, "").trim() : ""
        if (!cpfTit || cpfTit.length < 11) {
          errosDependente.push({ linha: idx + 1, nome: String(l.nome ?? "").trim() || "(sem nome)" })
        }
      }
    })
    if (errosDependente.length > 0) {
      const msg = `CPF do titular é obrigatório para dependentes. Linhas sem CPF do titular: ${errosDependente.map((e) => `${e.linha} (${e.nome})`).join("; ")}`
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const tenantId = await getCurrentTenantId()

    const acomodacaoNorm = (s: string | undefined): "Enfermaria" | "Apartamento" => {
      const t = String(s ?? "").trim().toLowerCase()
      return t === "apartamento" ? "Apartamento" : "Enfermaria"
    }

    const corretorPorNome = new Map<string, string>()
    try {
      const { data: corretores } = await supabaseAdmin
        .from("corretores_administradora")
        .select("id, nome")
        .eq("administradora_id", administradora_id)
        .eq("tenant_id", tenantId)
      for (const c of corretores || []) {
        const n = String(c.nome ?? "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ")
        if (n) corretorPorNome.set(n, c.id)
      }
    } catch {
      // Tabela pode não existir; segue sem vincular corretor
    }

    const resolved = await Promise.all(
      linhas.map(async (l) => {
        const dataNasc = parseDataNascimento(l.data_nascimento)
        const idade = typeof l.idade === "number" && !isNaN(l.idade)
          ? l.idade
          : calcularIdade(dataNasc)
        const acomodacao = acomodacaoNorm(l.acomodacao)
        let valor_mensal: number | null = null
        if (produto_id && idade != null) {
          valor_mensal = await obterValorProdutoPorIdade(produto_id, idade, tenantId, acomodacao)
        }
        const telefoneStr = l.telefone ? String(l.telefone).trim().replace(/\D/g, "") : ""
        const emailStr = l.email ? String(l.email).trim() : ""
        const telefonesJson = telefoneStr ? [{ tipo: "celular", numero: telefoneStr }] : []
        const emailsJson = emailStr ? [emailStr] : []

        const corretorNome = String(l.corretor ?? "").trim().toLowerCase().replace(/\s+/g, " ")
        const corretor_id = corretorNome ? corretorPorNome.get(corretorNome) || null : null

        return {
          administradora_id,
          grupo_id,
          produto_id: produto_id || null,
          nome: String(l.nome ?? "").trim(),
          cpf: l.cpf ? String(l.cpf).replace(/\D/g, "").slice(0, 14) || null : null,
          nome_mae: l.nome_mae ? String(l.nome_mae).trim() || null : null,
          nome_pai: l.nome_pai ? String(l.nome_pai).trim().slice(0, 255) || null : null,
          tipo: (l.tipo || "titular").toLowerCase() === "dependente" ? "dependente" : "titular",
          data_nascimento: dataNasc,
          idade,
          sexo: l.sexo ? String(l.sexo).trim().slice(0, 20) || null : null,
          estado_civil: l.estado_civil ? String(l.estado_civil).trim().slice(0, 50) || null : null,
          parentesco: l.parentesco ? String(l.parentesco).trim().slice(0, 50) || null : null,
          cpf_titular: l.cpf_titular ? String(l.cpf_titular).replace(/\D/g, "").slice(0, 14) || null : null,
          identidade: l.identidade ? String(l.identidade).trim().slice(0, 20) || null : null,
          cns: l.cns ? String(l.cns).trim().slice(0, 20) || null : null,
          acomodacao,
          cep: l.cep ? String(l.cep).replace(/\D/g, "").slice(0, 9) || null : null,
          logradouro: l.logradouro ? String(l.logradouro).trim().slice(0, 255) || null : null,
          numero: l.numero ? String(l.numero).trim().slice(0, 20) || null : null,
          complemento: l.complemento ? String(l.complemento).trim().slice(0, 100) || null : null,
          bairro: l.bairro ? String(l.bairro).trim().slice(0, 100) || null : null,
          cidade: l.cidade ? String(l.cidade).trim().slice(0, 100) || null : null,
          estado: l.estado ? String(l.estado).trim().slice(0, 2).toUpperCase() || null : null,
          telefones: telefonesJson,
          emails: emailsJson,
          observacoes: l.observacoes ? String(l.observacoes).trim().slice(0, 2000) || null : null,
          dados_adicionais:
            l.dados_adicionais && typeof l.dados_adicionais === "object"
              ? Object.fromEntries(
                  Object.entries(l.dados_adicionais)
                    .filter(([, v]) => v != null && String(v).trim() !== "")
                    .map(([k, v]) => [k.slice(0, 100), String(v).trim().slice(0, 500)])
                )
              : {},
          plano: (l.plano ? String(l.plano).trim().slice(0, 150) : null) || (l.dados_adicionais && typeof l.dados_adicionais === "object" && (l.dados_adicionais.Plano ?? l.dados_adicionais.plano) ? String((l.dados_adicionais.Plano ?? l.dados_adicionais.plano)).trim().slice(0, 150) : null) || null,
          corretor_id,
          tenant_id: tenantId,
          valor_mensal,
        }
      })
    )
    const toInsert = resolved.filter((r) => r.nome.length > 0)

    if (toInsert.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha com Nome válido para importar" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from("vidas_importadas").insert(toInsert).select("id")

    if (error) {
      console.error("Erro ao inserir vidas_importadas:", error)
      return NextResponse.json(
        { error: "Erro ao salvar no banco. Confirme que a tabela vidas_importadas existe (veja scripts/criar-tabela-vidas-importadas.sql). " + error.message },
        { status: 500 }
      )
    }

    const importadas = (data || []).length
    return NextResponse.json({
      success: true,
      importadas,
      ignoradas: linhas.length - toInsert.length,
    })
  } catch (e: unknown) {
    console.error("Erro importacao-vidas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao importar vidas" },
      { status: 500 }
    )
  }
}
