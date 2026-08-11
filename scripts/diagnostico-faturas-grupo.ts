/**
 * Diagnóstico: titulares vs faturas vs boletos-grupo (cap 500).
 * Uso: npx tsx --env-file=.env.local scripts/diagnostico-faturas-grupo.ts "APTI VENDAS" 2026-08
 */
import { supabaseAdmin } from "../lib/supabase-admin"
import { carregarVidasImportadasDoGrupo } from "../lib/vidas-importadas-grupo"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "../lib/grupo-cliente-administradora-ids"
import { buscarFaturasPorClienteIdsChunks, CHUNK_IN_CLIENTE_IDS } from "../lib/boletos-grupo-faturas"
import { resolveTenantIdForAdministradora } from "../lib/resolve-tenant-administradora"

const GRUPO_NOME = process.argv[2] || "APTI VENDAS"
const MES = process.argv[3] || "2026-08"

function limiteMes(mes: string) {
  const [y, m] = mes.split("-").map(Number)
  const inicio = `${mes}-01`
  const fimExclusivo = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
  return { inicio, fimExclusivo }
}

function mesCompetenciaParaDia(dia: string, ref: Date): string {
  const diaNorm = dia.replace(/\D/g, "").padStart(2, "0").slice(-2)
  if (diaNorm !== "01" && diaNorm !== "10") {
    return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
  }
  const diaNum = Number(diaNorm)
  const mesRef = ref.getDate() <= diaNum ? ref.getMonth() : ref.getMonth() + 1
  const data = new Date(ref.getFullYear(), mesRef, diaNum)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
}

async function main() {
  const limites = limiteMes(MES)
  const refDate = new Date(`${MES}-15T12:00:00`)

  let { data: grupos } = await supabaseAdmin
    .from("grupos_beneficiarios")
    .select("id, nome, administradora_id")
    .ilike("nome", `%${GRUPO_NOME}%`)

  if (!grupos?.length) {
    const tokens = GRUPO_NOME.split(/\s+/).filter(Boolean)
    const token = tokens[0] || GRUPO_NOME
    const fb = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome, administradora_id")
      .ilike("nome", `%${token}%`)
      .limit(30)
    grupos = fb.data
  }

  if (!grupos?.length) {
    console.error("Grupo não encontrado:", GRUPO_NOME)
    process.exit(1)
  }

  if (grupos.length > 1) {
    console.log("Grupos encontrados:")
    for (const g of grupos) console.log(" -", g.nome, `(${g.id})`)
  }

  const grupo = grupos.length === 1 ? grupos[0] : grupos.find((g) => g.nome?.toUpperCase() === GRUPO_NOME.toUpperCase()) || grupos[0]
  const grupoId = grupo.id as string
  const administradoraId = grupo.administradora_id as string
  const tenantId = await resolveTenantIdForAdministradora(administradoraId)

  console.log("\n=== DIAGNÓSTICO FATURAS ===")
  console.log("Grupo:", grupo.nome, `(${grupoId})`)
  console.log("Administradora:", administradoraId)
  console.log("Mês auditado (vencimento):", MES, `[${limites.inicio}, ${limites.fimExclusivo})`)
  console.log("Data referência competência UI:", refDate.toISOString().slice(0, 10))

  const { data: vidasTenantCheck } = await supabaseAdmin
    .from("vidas_importadas")
    .select("id, tipo, ativo, tenant_id, cliente_administradora_id")
    .eq("grupo_id", grupoId)
    .eq("administradora_id", administradoraId)

  const vidasCheckAtivas = (vidasTenantCheck || []).filter((v) => v.ativo !== false)
  const titCheck = vidasCheckAtivas.filter((v) => String(v.tipo || "titular").toLowerCase() !== "dependente")
  const titComCa = titCheck.filter((v) => v.cliente_administradora_id)
  const titComTenantOk = titComCa.filter((v) => v.tenant_id === tenantId)
  const titSemTenant = titComCa.filter((v) => !v.tenant_id)
  const titTenantOutro = titComCa.filter((v) => v.tenant_id && v.tenant_id !== tenantId)

  console.log("\n--- TENANT EM VIDAS (causa provável boletos-grupo) ---")
  console.log("tenant_id administradora:", tenantId)
  console.log("Titulares com CA — com tenant correto:", titComTenantOk.length)
  console.log("Titulares com CA — sem tenant_id:", titSemTenant.length)
  const { data: vidasComTenantCount } = await supabaseAdmin
    .from("vidas_importadas")
    .select("id", { count: "exact", head: true })
    .eq("grupo_id", grupoId)
    .eq("administradora_id", administradoraId)
    .eq("tenant_id", tenantId)

  const { count: vidasTotalCount } = await supabaseAdmin
    .from("vidas_importadas")
    .select("id", { count: "exact", head: true })
    .eq("grupo_id", grupoId)
    .eq("administradora_id", administradoraId)

  console.log("Vidas total no grupo (count):", vidasTotalCount)
  console.log("Vidas com tenant_id da administradora (count):", vidasComTenantCount)

  const vidas = (await carregarVidasImportadasDoGrupo(grupoId, administradoraId)).filter((v) => v?.ativo !== false)
  const tipo = (v: Record<string, unknown>) => String((v.tipo ?? "titular") ?? "").toLowerCase()
  const titularesVidas = vidas.filter((v) => tipo(v) !== "dependente")
  const dependentesVidas = vidas.filter((v) => tipo(v) === "dependente")

  const titularesSemCa = titularesVidas.filter((v) => {
    const ca = v.cliente_administradora_id
    return ca == null || String(ca).trim() === ""
  })

  const titularesComCa = titularesVidas.filter((v) => {
    const ca = v.cliente_administradora_id
    return ca != null && String(ca).trim() !== ""
  })

  const uniqueCaVidas = new Set(
    titularesComCa.map((v) => String(v.cliente_administradora_id).trim()).filter(Boolean)
  )

  // Réplica simplificada de clientes-fatura (titulares emissão)
  type TitularEmissao = { cliente_administradora_id: string; cliente_nome: string; dia_vencimento?: string }
  const titularesEmissao: TitularEmissao[] = []
  const clienteAdmIdsJaListados = new Set<string>()
  const cpfNorm = (v: Record<string, unknown>) => (v.cpf ? String(v.cpf).replace(/\D/g, "") : "")

  for (const vida of titularesVidas) {
    const va = vida as Record<string, unknown>
    const caId = va.cliente_administradora_id
    const clienteAdministradoraId = caId != null && caId !== "" ? String(caId) : `vida:${vida.id}`
    if (!String(clienteAdministradoraId).startsWith("vida:")) {
      clienteAdmIdsJaListados.add(String(clienteAdministradoraId))
    }
    let diaVencimento: string | undefined
    const adic = va.dados_adicionais
    if (adic && typeof adic === "object") {
      const rec = adic as Record<string, unknown>
      const diaRaw = rec["dia_vencimento"] ?? rec["Dia Vencimento"] ?? rec["diaVencimento"]
      const diaNorm = String(diaRaw || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
      if (diaNorm === "01" || diaNorm === "10") diaVencimento = diaNorm
    }
    titularesEmissao.push({
      cliente_administradora_id: clienteAdministradoraId,
      cliente_nome: String(va.nome || "Beneficiário"),
      dia_vencimento: diaVencimento,
    })
  }

  let { data: vinculos } = await supabaseAdmin
    .from("clientes_grupos")
    .select("cliente_id, cliente_tipo")
    .eq("grupo_id", grupoId)
  vinculos = vinculos || []

  const idsClienteAdm = [...new Set(vinculos.filter((v) => v.cliente_tipo === "cliente_administradora").map((v) => String(v.cliente_id)))]
  const idsPropostas = [...new Set(vinculos.filter((v) => v.cliente_tipo === "proposta").map((v) => String(v.cliente_id)))]

  if (idsClienteAdm.length > 0) {
    const { data: cas } = await supabaseAdmin.from("clientes_administradoras").select("id, dia_vencimento").in("id", idsClienteAdm)
    for (const ca of cas || []) {
      const caIdStr = String(ca.id)
      if (clienteAdmIdsJaListados.has(caIdStr)) continue
      clienteAdmIdsJaListados.add(caIdStr)
      const diaNorm = ca.dia_vencimento != null ? String(ca.dia_vencimento).replace(/\D/g, "").padStart(2, "0").slice(-2) : ""
      titularesEmissao.push({
        cliente_administradora_id: caIdStr,
        cliente_nome: "(vínculo CA)",
        dia_vencimento: diaNorm === "01" || diaNorm === "10" ? diaNorm : undefined,
      })
    }
  }
  if (idsPropostas.length > 0) {
    const { data: cas } = await supabaseAdmin.from("clientes_administradoras").select("id, proposta_id, dia_vencimento").in("proposta_id", idsPropostas)
    for (const ca of cas || []) {
      const caIdStr = String(ca.id)
      if (clienteAdmIdsJaListados.has(caIdStr)) continue
      clienteAdmIdsJaListados.add(caIdStr)
      const diaNorm = ca.dia_vencimento != null ? String(ca.dia_vencimento).replace(/\D/g, "").padStart(2, "0").slice(-2) : ""
      titularesEmissao.push({
        cliente_administradora_id: caIdStr,
        cliente_nome: "(vínculo proposta)",
        dia_vencimento: diaNorm === "01" || diaNorm === "10" ? diaNorm : undefined,
      })
    }
  }

  const emissaoVidaPrefix = titularesEmissao.filter((t) => String(t.cliente_administradora_id).startsWith("vida:"))
  const emissaoComUuid = titularesEmissao.filter((t) => !String(t.cliente_administradora_id).startsWith("vida:"))

  const idsUuid = [...new Set(emissaoComUuid.map((t) => String(t.cliente_administradora_id).trim()).filter(Boolean))]

  // Faturas no mês (critério auditoria)
  const comFaturaVencimentoMes = new Set<string>()
  for (let i = 0; i < idsUuid.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = idsUuid.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data } = await supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id, vencimento")
      .in("cliente_administradora_id", chunk)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .gte("vencimento", limites.inicio)
      .lt("vencimento", limites.fimExclusivo)
    if (!data?.length) {
      const fb = await supabaseAdmin
        .from("faturas")
        .select("cliente_administradora_id, vencimento")
        .in("cliente_administradora_id", chunk)
        .eq("administradora_id", administradoraId)
        .gte("vencimento", limites.inicio)
        .lt("vencimento", limites.fimExclusivo)
      data = fb.data
    }
    for (const row of data || []) {
      const ca = String(row.cliente_administradora_id || "").trim()
      if (ca) comFaturaVencimentoMes.add(ca)
    }
  }

  // Competência (critério UI Gerar)
  const comFaturaCompetencia = new Set<string>()
  const competenciaPorTitular = new Map<string, string>()
  for (const t of titularesEmissao) {
    const ca = String(t.cliente_administradora_id || "").trim()
    if (!ca || ca.startsWith("vida:")) continue
    const comp = mesCompetenciaParaDia(String(t.dia_vencimento || ""), refDate)
    competenciaPorTitular.set(ca, comp)
  }

  const mesesCompetenciaUnicos = [...new Set(competenciaPorTitular.values())]
  for (const mesComp of mesesCompetenciaUnicos) {
    const lim = limiteMes(mesComp)
    const idsNoMesComp = [...competenciaPorTitular.entries()].filter(([, m]) => m === mesComp).map(([id]) => id)
    for (let i = 0; i < idsNoMesComp.length; i += CHUNK_IN_CLIENTE_IDS) {
      const chunk = idsNoMesComp.slice(i, i + CHUNK_IN_CLIENTE_IDS)
      const { data } = await supabaseAdmin
        .from("faturas")
        .select("cliente_administradora_id, vencimento")
        .in("cliente_administradora_id", chunk)
        .eq("administradora_id", administradoraId)
        .gte("vencimento", lim.inicio)
        .lt("vencimento", lim.fimExclusivo)
      for (const row of data || []) {
        const ca = String(row.cliente_administradora_id || "").trim()
        if (ca) comFaturaCompetencia.add(ca)
      }
    }
  }

  // boletos-grupo simulado
  const { ids: idsBoletosGrupo } = await listarClienteAdministradoraIdsENomesDoGrupo(grupoId, administradoraId, tenantId)
  const faturasRaw = await buscarFaturasPorClienteIdsChunks(
    supabaseAdmin,
    idsBoletosGrupo,
    administradoraId,
    "id, cliente_administradora_id, vencimento, created_at",
    { vencimentoGte: limites.inicio, vencimentoLt: limites.fimExclusivo }
  )
  const faturasMesTotal = faturasRaw
  const boletosMesCap500 = faturasMesTotal

  // Divergências
  const semFaturaVencMesComCa = emissaoComUuid.filter((t) => !comFaturaVencimentoMes.has(String(t.cliente_administradora_id)))
  const comFaturaCompetenciaSemVencMes = emissaoComUuid.filter(
    (t) => comFaturaCompetencia.has(String(t.cliente_administradora_id)) && !comFaturaVencimentoMes.has(String(t.cliente_administradora_id))
  )
  const comFaturaVencMesNaoNoCap500: typeof faturasMesTotal = []

  // Titulares com mesmo CA (duplicatas)
  const caCount = new Map<string, number>()
  for (const t of emissaoComUuid) {
    const ca = String(t.cliente_administradora_id)
    caCount.set(ca, (caCount.get(ca) || 0) + 1)
  }
  const casDuplicados = [...caCount.entries()].filter(([, n]) => n > 1)
  const titularesDuplicadosCa = casDuplicados.reduce((s, [, n]) => s + n - 1, 0)

  const idsBoletosSet = new Set(idsBoletosGrupo)
  const emissaoCaForaBoletosGrupo = emissaoComUuid.filter((t) => !idsBoletosSet.has(String(t.cliente_administradora_id)))
  const emissaoSemDiaVenc = emissaoComUuid.filter((t) => {
    const d = String(t.dia_vencimento || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
    return d !== "01" && d !== "10"
  })

  // Faturas agosto por CA único (não por linha)
  const faturasAgostoCaUnicos = new Set(faturasMesTotal.map((f) => String(f.cliente_administradora_id)))

  console.log("\n--- CONTAGENS ---")
  console.log("Beneficiários ativos (vidas):", vidas.length)
  console.log("Titulares ativos (vidas):", titularesVidas.length)
  console.log("Dependentes ativos:", dependentesVidas.length)
  console.log("Titulares vidas SEM cliente_administradora_id:", titularesSemCa.length)
  console.log("Titulares vidas COM cliente_administradora_id:", titularesComCa.length)
  console.log("UUID únicos de CA nas vidas titulares:", uniqueCaVidas.size)
  if (titularesEmissao.length) {
    console.log("Titulares lista emissão (réplica clientes-fatura):", titularesEmissao.length)
    console.log("  └ com UUID (podem faturar):", emissaoComUuid.length)
    console.log("  └ vida:… (sem CA — não faturam):", emissaoVidaPrefix.length)
  }
  console.log("Com fatura vencimento em", MES + ":", comFaturaVencimentoMes.size)
  console.log("Com fatura mês competência UI (ref", refDate.toISOString().slice(0, 10) + "):", comFaturaCompetencia.size)
  console.log("Meses competência encontrados:", mesesCompetenciaUnicos.join(", ") || "(nenhum)")
  console.log("\n--- BOLETOS-GRUPO (após correção) ---")
  console.log("IDs clientes no grupo (boletos-grupo):", idsBoletosGrupo.length)
  console.log("Faturas vencimento", MES + ":", faturasMesTotal.length)
  console.log("Card Boletos (vencimento) mostraria:", boletosMesCap500.length)
  console.log("Titulares emissão com CA duplicado (mesmo UUID):", titularesDuplicadosCa, "em", casDuplicados.length, "CAs")
  console.log("Titulares emissão sem dia 01/10 vinculado:", emissaoSemDiaVenc.length)
  console.log("CA únicos com fatura venc.", MES + ":", faturasAgostoCaUnicos.size)
  console.log("Titulares emissão cujo CA não está em boletos-grupo:", emissaoCaForaBoletosGrupo.length)

  if (emissaoVidaPrefix.length > 0) {
    console.log("\n--- TITULARES vida:… (sem CA) ---")
    for (const t of emissaoVidaPrefix.slice(0, 15)) {
      console.log(" ", t.cliente_nome, "|", t.cliente_administradora_id)
    }
    if (emissaoVidaPrefix.length > 15) console.log(" ... +", emissaoVidaPrefix.length - 15, "mais")
  }

  if (comFaturaCompetenciaSemVencMes.length > 0) {
    console.log("\n--- COM FATURA NA COMPETÊNCIA, MAS NÃO NO VENCIMENTO", MES, "---")
    console.log("(explica auditoria 'sem fatura' vs UI 'já faturado')")
    for (const t of comFaturaCompetenciaSemVencMes.slice(0, 10)) {
      console.log(" ", t.cliente_nome, "| competência:", competenciaPorTitular.get(String(t.cliente_administradora_id)))
    }
    if (comFaturaCompetenciaSemVencMes.length > 10) console.log(" ... +", comFaturaCompetenciaSemVencMes.length - 10, "mais")
  }

  if (semFaturaVencMesComCa.length > 0) {
    const compSet = new Set<string>()
    let compSept = 0
    let semDia = 0
    let compAgostoSemFat = 0
    for (const t of semFaturaVencMesComCa) {
      const ca = String(t.cliente_administradora_id)
      const comp = competenciaPorTitular.get(ca) || "?"
      compSet.add(comp)
      const d = String(t.dia_vencimento || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
      if (d !== "01" && d !== "10") semDia++
      if (comp === "2026-09") compSept++
      if (comp === MES && !comFaturaCompetencia.has(ca)) compAgostoSemFat++
    }
    console.log("\n--- ANÁLISE DOS SEM FATURA VENCIMENTO", MES, "---")
    console.log("Total:", semFaturaVencMesComCa.length)
    console.log("Competência setembro/2026 (venc. esperado 09, não 08):", compSept)
    console.log("Sem dia 01/10 vinculado:", semDia)
    console.log("Competência", MES, "e ainda sem fatura na competência:", compAgostoSemFat)
    console.log("\n--- SEM FATURA VENCIMENTO", MES, "(com CA, elegíveis auditoria) ---")
    for (const t of semFaturaVencMesComCa.slice(0, 20)) {
      console.log(" ", t.cliente_nome, "| dia:", t.dia_vencimento || "—", "| competência:", competenciaPorTitular.get(String(t.cliente_administradora_id)) || "?")
    }
    if (semFaturaVencMesComCa.length > 20) console.log(" ... +", semFaturaVencMesComCa.length - 20, "mais")
  }

  console.log("\n--- RECONCILIAÇÃO ---")
  console.log(
    "Auditoria esperada:",
    `${emissaoComUuid.length} na emissão (CA) → ${comFaturaVencimentoMes.size} com fatura venc. ${MES} → ${emissaoComUuid.length - comFaturaVencimentoMes.size} sem fatura`
  )
  console.log(
    "Card Boletos (vencimento) mostraria:",
    boletosMesCap500.length,
    `(esperado ~${comFaturaVencimentoMes.size} após fix de IDs)`
  )
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
