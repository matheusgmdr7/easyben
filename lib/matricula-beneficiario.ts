/**
 * Matrícula do beneficiário = Carteirinha saúde (contrato / dados_adicionais da vida).
 */
export function extrairMatriculaDeDados(dados: Record<string, unknown> | null | undefined): string {
  if (!dados) return ""
  const direto = String(dados.numero_carteirinha || "").trim()
  if (direto) return direto
  const adic =
    dados.dados_adicionais && typeof dados.dados_adicionais === "object"
      ? (dados.dados_adicionais as Record<string, unknown>)
      : {}
  return String(
    adic.numero_carteirinha ??
      adic["Número da carteirinha"] ??
      adic["Numero da carteirinha"] ??
      adic.carteirinha ??
      ""
  ).trim()
}

export async function carregarMatriculasPorClienteAdministradora(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  clienteAdmIds: string[]
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  const ids = [...new Set(clienteAdmIds.map((id) => String(id || "").trim()).filter(Boolean))]
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { data } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id, numero_carteirinha")
      .in("id", chunk)
    for (const row of (data || []) as Array<{ id: string; numero_carteirinha?: string | null }>) {
      const m = String(row.numero_carteirinha || "").trim()
      if (m) mapa.set(String(row.id), m)
    }
  }
  return mapa
}

export function resolverMatriculaVida(
  vida: Record<string, unknown>,
  matriculaPorClienteAdm: Map<string, string>
): string {
  const daVida = extrairMatriculaDeDados(vida)
  if (daVida) return daVida
  const caId = String(vida.cliente_administradora_id || "").trim()
  if (caId && matriculaPorClienteAdm.has(caId)) {
    return matriculaPorClienteAdm.get(caId) || ""
  }
  return ""
}
