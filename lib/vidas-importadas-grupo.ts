import { supabaseAdmin } from "@/lib/supabase-admin"

type RegistroGenerico = Record<string, unknown>

const PAGE_VIDAS_IMPORTADAS = 1000

/**
 * Vidas do grupo (`vidas_importadas`) filtradas só por `grupo_id` + `administradora_id`.
 * Pagina em lotes (PostgREST ~1000 linhas por resposta sem range).
 */
export async function carregarVidasImportadasDoGrupo(
  grupoId: string,
  administradoraId: string
): Promise<Array<RegistroGenerico>> {
  const filtrosBase = (query: any) => query.eq("grupo_id", grupoId).eq("administradora_id", administradoraId)

  async function todasPaginas(selectCols: string): Promise<{ rows: Array<RegistroGenerico>; error: unknown }> {
    const rows: Array<RegistroGenerico> = []
    let from = 0
    for (;;) {
      const { data, error } = await filtrosBase(
        supabaseAdmin.from("vidas_importadas").select(selectCols).range(from, from + PAGE_VIDAS_IMPORTADAS - 1)
      )
      if (error) return { rows: [], error }
      const chunk = (data || []) as Array<RegistroGenerico>
      rows.push(...chunk)
      if (chunk.length < PAGE_VIDAS_IMPORTADAS) break
      from += PAGE_VIDAS_IMPORTADAS
    }
    return { rows, error: null }
  }

  let r = await todasPaginas(
    "id, nome, cpf, valor_mensal, emails, dados_adicionais, cliente_administradora_id, tipo, cpf_titular, produto_id, plano, idade, acomodacao, ativo"
  )
  if (!r.error) return r.rows

  r = await todasPaginas(
    "id, nome, cpf, tipo, cpf_titular, valor_mensal, cliente_administradora_id, dados_adicionais, emails, produto_id, ativo"
  )
  if (!r.error) return r.rows

  r = await todasPaginas("*")
  if (!r.error) return r.rows

  return []
}
