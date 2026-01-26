import { supabaseClient } from "@/lib/supabase-client"
import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import type { TabelaPreco, TabelaPrecoFaixa, TabelaPrecoDetalhada, TabelaProduto } from "@/types/tabelas"

/**
 * TABELAS DO SUPABASE UTILIZADAS:
 *
 * 1. tabelas_precos - Armazena as tabelas de preços principais
 *    Colunas: id (UUID), titulo (TEXT), descricao (TEXT), operadora (TEXT),
 *             tipo_plano (TEXT), segmentacao (TEXT), corretora (TEXT), ativo (BOOLEAN), created_at, updated_at
 *
 * 2. tabelas_precos_faixas - Armazena as faixas etárias de cada tabela
 *    Colunas: id (SERIAL), tabela_id (UUID), faixa_etaria (TEXT), valor (DECIMAL), created_at
 *
 * 3. produto_tabela_relacao - Vincula produtos às tabelas de preços
 *    Colunas: id (SERIAL), produto_id (INTEGER), tabela_id (UUID), segmentacao (TEXT), descricao (TEXT), created_at
 *
 * 4. produtos_corretores - Tabela de produtos dos corretores
 *    Colunas: id (SERIAL), nome (TEXT), operadora (TEXT), tipo (TEXT), comissao (TEXT), descricao (TEXT), disponivel (BOOLEAN)
 */

/**
 * Busca todas as tabelas de preços da tabela 'tabelas_precos'
 */
export async function buscarTabelasPrecos(): Promise<TabelaPreco[]> {
  try {
    console.log("🔍 [tabelas_precos] Buscando todas as tabelas de preços...")

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabaseClient
      .from("tabelas_precos")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("titulo", { ascending: true })

    if (error) {
      console.error("❌ [tabelas_precos] Erro ao buscar tabelas:", error)
      throw new Error(`Erro ao buscar tabelas: ${error.message}`)
    }

    console.log(`✅ [tabelas_precos] ${data?.length || 0} tabelas encontradas`)
    return data || []
  } catch (error) {
    console.error("❌ [tabelas_precos] Erro no serviço:", error)
    throw error
  }
}

export const obterTabelasPrecos = buscarTabelasPrecos

/**
 * Busca uma tabela específica com suas faixas etárias
 * Usa as tabelas 'tabelas_precos' + 'tabelas_precos_faixas'
 */
export async function buscarTabelaPrecoDetalhada(id: string | number): Promise<TabelaPrecoDetalhada> {
  try {
    console.log("🔍 [tabelas_precos] Buscando tabela detalhada:", id)

    const tenantId = await getCurrentTenantId()

    // Buscar a tabela principal, filtrando por tenant
    const { data: tabela, error: tabelaError } = await supabaseClient
      .from("tabelas_precos")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single()

    if (tabelaError || !tabela) {
      console.error("❌ [tabelas_precos] Tabela não encontrada:", tabelaError)
      throw new Error(`Tabela com ID ${id} não encontrada`)
    }

    // Buscar faixas etárias da tabela, filtrando por tenant
    const { data: faixas, error: faixasError } = await supabaseClient
      .from("tabelas_precos_faixas")
      .select("*")
      .eq("tabela_id", tabela.id)
      .eq("tenant_id", tenantId)
      .order("faixa_etaria", { ascending: true })

    if (faixasError) {
      console.error(`❌ [tabelas_precos_faixas] Erro ao buscar faixas da tabela ${id}:`, faixasError)
      throw new Error(faixasError.message)
    }

    console.log(`✅ [tabelas_precos] Tabela detalhada carregada com ${faixas?.length || 0} faixas etárias`)

    return {
      tabela,
      faixas: faixas || [],
    }
  } catch (error) {
    console.error(`❌ [tabelas_precos] Erro ao buscar tabela detalhada ${id}:`, error)
    throw error
  }
}

/**
 * Busca tabelas vinculadas a um produto
 * Usa as tabelas 'produto_tabela_relacao' + 'tabelas_precos'
 */
export async function buscarTabelasPrecosPorProduto(produtoId: string): Promise<TabelaProduto[]> {
  try {
    console.log("🔍 [produto_tabela_relacao] Buscando tabelas vinculadas ao produto:", produtoId)

    const tenantId = await getCurrentTenantId()

    const { data: relacoes, error: relacoesError } = await supabase
      .from("produto_tabela_relacao")
      .select(`
        id,
        segmentacao,
        descricao,
        tabela_id,
        tabelas_precos (
          titulo
        )
      `)
      .eq("produto_id", produtoId)
      .eq("tenant_id", tenantId)
      .order("segmentacao", { ascending: true })

    if (relacoesError) {
      console.error(`❌ [produto_tabela_relacao] Erro ao buscar relações para produto ${produtoId}:`, relacoesError)
      throw relacoesError
    }

    if (!relacoes || relacoes.length === 0) {
      console.log("⚠️ [produto_tabela_relacao] Nenhuma tabela vinculada encontrada")
      return []
    }

    console.log(`✅ [produto_tabela_relacao] ${relacoes.length} tabelas vinculadas encontradas`)

    return relacoes.map((relacao) => ({
      relacao_id: relacao.id,
      tabela_id: relacao.tabela_id,
      tabela_titulo: relacao.tabelas_precos?.titulo || "Tabela sem título",
      segmentacao: relacao.segmentacao || "Padrão",
      descricao: relacao.descricao || "",
    }))
  } catch (error) {
    console.error("❌ [produto_tabela_relacao] Erro no serviço:", error)
    throw error
  }
}

/**
 * Vincula uma tabela a um produto
 * Insere na tabela 'produto_tabela_relacao'
 */
export async function vincularTabelaProduto(
  produtoId: string | number,
  tabelaId: string | number,
  segmentacao: string,
  descricao = "",
): Promise<{ id: string | number }> {
  try {
    console.log("🔗 [produto_tabela_relacao] Vinculando tabela ao produto:", {
      produtoId,
      tabelaId,
      segmentacao,
      descricao,
    })

    const tenantId = await getCurrentTenantId()

    // Verificar se a vinculação já existe
    const { data: vinculacaoExistente } = await supabaseClient
      .from("produto_tabela_relacao")
      .select("id")
      .eq("produto_id", produtoId)
      .eq("tabela_id", tabelaId)
      .eq("segmentacao", segmentacao)
      .eq("tenant_id", tenantId)
      .single()

    if (vinculacaoExistente) {
      throw new Error(`Já existe uma vinculação desta tabela com o produto para a segmentação "${segmentacao}"`)
    }

    // Inserir nova relação
    const { data, error } = await supabaseClient
      .from("produto_tabela_relacao")
      .insert({
        produto_id: produtoId,
        tabela_id: tabelaId,
        segmentacao,
        descricao,
        tenant_id: tenantId, // Adicionar tenant_id automaticamente
      })
      .select("id")
      .single()

    if (error) {
      console.error(`❌ [produto_tabela_relacao] Erro ao vincular:`, error)
      throw new Error(`Erro ao vincular tabela: ${error.message}`)
    }

    console.log("✅ [produto_tabela_relacao] Tabela vinculada com sucesso:", data)
    return { id: data.id }
  } catch (error) {
    console.error(`❌ [produto_tabela_relacao] Erro no serviço:`, error)
    throw error
  }
}

/**
 * Desvincula uma tabela de um produto
 * Remove da tabela 'produto_tabela_relacao'
 */
export async function desvincularTabelaProduto(relacaoId: string | number): Promise<void> {
  try {
    console.log("🔓 [produto_tabela_relacao] Desvinculando tabela:", relacaoId)

    const tenantId = await getCurrentTenantId()
    
    const { error } = await supabaseClient
      .from("produto_tabela_relacao")
      .delete()
      .eq("id", relacaoId)
      .eq("tenant_id", tenantId) // Garantir que só deleta do tenant correto

    if (error) {
      console.error(`❌ [produto_tabela_relacao] Erro ao desvincular:`, error)
      throw new Error(`Erro ao desvincular tabela: ${error.message}`)
    }

    console.log("✅ [produto_tabela_relacao] Tabela desvinculada com sucesso")
  } catch (error) {
    console.error(`❌ [produto_tabela_relacao] Erro no serviço:`, error)
    throw error
  }
}

/**
 * Cria uma nova tabela de preços
 * Insere na tabela 'tabelas_precos'
 */
export async function criarTabelaPreco(dadosTabela: {
  titulo: string
  operadora?: string
  operadora_id?: string
  produto_id?: string
  tipo_plano?: string
  segmentacao?: string
  corretora?: string
  descricao?: string
  ativo?: boolean
  abrangencia?: string
  data?: string
  data_fechamento?: string
  data_vencimento?: string
  data_vigencia?: string
}): Promise<TabelaPreco> {
  try {
    console.log("📝 [tabelas_precos] Criando nova tabela:", dadosTabela)

    // Validar dados obrigatórios
    if (!dadosTabela.titulo || !dadosTabela.titulo.trim()) {
      throw new Error("O título da tabela é obrigatório")
    }

    // Preparar dados para inserção - incluindo todos os campos possíveis
    const dadosParaInserir: any = {
      titulo: dadosTabela.titulo.trim(),
      descricao: dadosTabela.descricao?.trim() || null,
      operadora: dadosTabela.operadora?.trim() || null,
      operadora_id: dadosTabela.operadora_id || null,
      tipo_plano: dadosTabela.tipo_plano?.trim() || null,
      segmentacao: dadosTabela.segmentacao?.trim() || null,
      corretora: dadosTabela.corretora?.trim() || null,
      abrangencia: dadosTabela.abrangencia?.trim() || null,
      ativo: dadosTabela.ativo !== undefined ? dadosTabela.ativo : true,
      data: dadosTabela.data || dadosTabela.data_fechamento || null,
      data_fechamento: dadosTabela.data_fechamento || null,
      data_vencimento: dadosTabela.data_vencimento || null,
      data_vigencia: dadosTabela.data_vigencia || null,
      updated_at: new Date().toISOString(),
    }

    console.log("📝 [tabelas_precos] Dados preparados para inserção:", dadosParaInserir)

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabaseClient
      .from("tabelas_precos")
      .insert({
        ...dadosParaInserir,
        tenant_id: tenantId, // Adicionar tenant_id automaticamente
      })
      .select()
      .single()

    if (error) {
      console.error("❌ [tabelas_precos] Erro ao criar tabela:", error)
      throw new Error(`Erro ao criar tabela: ${error.message}`)
    }

    console.log("✅ [tabelas_precos] Tabela criada com sucesso:", data)
    return data
  } catch (error) {
    console.error("❌ [tabelas_precos] Erro no serviço:", error)
    throw error
  }
}

/**
 * Atualiza uma tabela de preços
 * Atualiza na tabela 'tabelas_precos'
 */
export async function atualizarTabelaPreco(
  id: string | number,
  dadosTabela: {
    titulo?: string
    operadora?: string
    tipo_plano?: string
    segmentacao?: string
    corretora?: string // Adicionado campo corretora
    descricao?: string
    ativo?: boolean
    abrangencia?: string
  },
): Promise<TabelaPreco> {
  try {
    console.log("📝 [tabelas_precos] Atualizando tabela:", id, dadosTabela)

    // Preparar dados para atualização - incluindo todos os campos possíveis
    const dadosParaAtualizar: any = {
      updated_at: new Date().toISOString(),
    }

    if (dadosTabela.titulo !== undefined) {
      dadosParaAtualizar.titulo = dadosTabela.titulo.trim()
    }
    if (dadosTabela.descricao !== undefined) {
      dadosParaAtualizar.descricao = dadosTabela.descricao?.trim() || null
    }
    if (dadosTabela.operadora !== undefined) {
      dadosParaAtualizar.operadora = dadosTabela.operadora?.trim() || null
    }
    if (dadosTabela.tipo_plano !== undefined) {
      dadosParaAtualizar.tipo_plano = dadosTabela.tipo_plano?.trim() || null
    }
    if (dadosTabela.segmentacao !== undefined) {
      dadosParaAtualizar.segmentacao = dadosTabela.segmentacao?.trim() || null
    }
    if (dadosTabela.corretora !== undefined) {
      // Incluído campo corretora
      dadosParaAtualizar.corretora = dadosTabela.corretora?.trim() || null
    }
    if (dadosTabela.ativo !== undefined) {
      dadosParaAtualizar.ativo = dadosTabela.ativo
    }
    if (dadosTabela.abrangencia !== undefined) {
      dadosParaAtualizar.abrangencia = dadosTabela.abrangencia?.trim() || null
    }

    console.log("📝 [tabelas_precos] Dados preparados para atualização:", dadosParaAtualizar)

    const tenantId = await getCurrentTenantId()
    
    // Remover tenant_id dos dados de atualização (não deve ser alterado)
    const { tenant_id, ...dadosSemTenant } = dadosParaAtualizar

    const { data, error } = await supabaseClient
      .from("tabelas_precos")
      .update(dadosSemTenant)
      .eq("id", id)
      .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
      .select()
      .single()

    if (error) {
      console.error(`❌ [tabelas_precos] Erro ao atualizar:`, error)
      throw new Error(`Erro ao atualizar tabela: ${error.message}`)
    }

    console.log("✅ [tabelas_precos] Tabela atualizada com sucesso:", data)
    return data
  } catch (error) {
    console.error(`❌ [tabelas_precos] Erro no serviço:`, error)
    throw error
  }
}

/**
 * Adiciona uma faixa etária a uma tabela
 * Insere na tabela 'tabelas_precos_faixas'
 */
export async function adicionarFaixaEtaria(
  faixa: Omit<TabelaPrecoFaixa, "id" | "created_at">,
): Promise<TabelaPrecoFaixa> {
  try {
    console.log("📝 [tabelas_precos_faixas] Adicionando faixa etária:", faixa)

    // Validar dados obrigatórios
    if (!faixa.tabela_id) {
      throw new Error("ID da tabela é obrigatório")
    }
    if (!faixa.faixa_etaria || !faixa.faixa_etaria.trim()) {
      throw new Error("Faixa etária é obrigatória")
    }
    if (faixa.valor < 0) {
      throw new Error("Valor não pode ser negativo")
    }

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabaseClient
      .from("tabelas_precos_faixas")
      .insert({
        tabela_id: faixa.tabela_id,
        faixa_etaria: faixa.faixa_etaria.trim(),
        valor: Number(faixa.valor) || 0,
        tenant_id: tenantId, // Adicionar tenant_id automaticamente
      })
      .select()
      .single()

    if (error) {
      console.error("❌ [tabelas_precos_faixas] Erro ao adicionar faixa:", error)
      throw new Error(`Erro ao adicionar faixa etária: ${error.message}`)
    }

    console.log("✅ [tabelas_precos_faixas] Faixa etária adicionada com sucesso:", data)
    return data
  } catch (error) {
    console.error("❌ [tabelas_precos_faixas] Erro no serviço:", error)
    throw error
  }
}

/**
 * Atualiza uma faixa etária
 * Atualiza na tabela 'tabelas_precos_faixas'
 */
export async function atualizarFaixaEtaria(
  id: string | number,
  faixa: Partial<Omit<TabelaPrecoFaixa, "id" | "created_at">>,
): Promise<TabelaPrecoFaixa> {
  try {
    console.log("📝 [tabelas_precos_faixas] Atualizando faixa etária:", id, faixa)

    const tenantId = await getCurrentTenantId()
    
    // Remover tenant_id dos dados de atualização (não deve ser alterado)
    const { tenant_id, ...dadosSemTenant } = faixa

    const { data, error } = await supabaseClient
      .from("tabelas_precos_faixas")
      .update(dadosSemTenant)
      .eq("id", id)
      .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
      .select()
      .single()

    if (error) {
      console.error(`❌ [tabelas_precos_faixas] Erro ao atualizar:`, error)
      throw new Error(`Erro ao atualizar faixa etária: ${error.message}`)
    }

    console.log("✅ [tabelas_precos_faixas] Faixa etária atualizada com sucesso:", data)
    return data
  } catch (error) {
    console.error(`❌ [tabelas_precos_faixas] Erro no serviço:`, error)
    throw error
  }
}

/**
 * Remove uma faixa etária
 * Remove da tabela 'tabelas_precos_faixas'
 */
export async function removerFaixaEtaria(id: string | number): Promise<void> {
  try {
    console.log("🗑️ [tabelas_precos_faixas] Removendo faixa etária:", id)

    const tenantId = await getCurrentTenantId()
    
    const { error } = await supabaseClient
      .from("tabelas_precos_faixas")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId) // Garantir que só deleta do tenant correto

    if (error) {
      console.error(`❌ [tabelas_precos_faixas] Erro ao remover:`, error)
      throw new Error(`Erro ao remover faixa etária: ${error.message}`)
    }

    console.log("✅ [tabelas_precos_faixas] Faixa etária removida com sucesso")
  } catch (error) {
    console.error(`❌ [tabelas_precos_faixas] Erro no serviço:`, error)
    throw error
  }
}

/**
 * Obtém o valor de uma tabela para uma idade específica
 * Consulta a tabela 'tabelas_precos_faixas'
 */
export async function obterValorPorIdade(tabelaId: string | number, idade: number): Promise<number> {
  try {
    console.log(`🔍 [tabelas_precos_faixas] Buscando valor para idade ${idade} na tabela ${tabelaId}`)

    const tenantId = await getCurrentTenantId()

    const { data: faixas, error } = await supabaseClient
      .from("tabelas_precos_faixas")
      .select("faixa_etaria, valor")
      .eq("tabela_id", tabelaId)
      .eq("tenant_id", tenantId)

    if (error) {
      console.error(`❌ [tabelas_precos_faixas] Erro ao buscar faixas:`, error)
      throw new Error(error.message)
    }

    if (!faixas || faixas.length === 0) {
      console.warn(`⚠️ [tabelas_precos_faixas] Nenhuma faixa encontrada para tabela ${tabelaId}`)
      return 0
    }

    // Encontrar a faixa etária correspondente
    let valorEncontrado = 0

    for (const faixa of faixas) {
      // Verificar se é uma faixa com formato "min-max"
      if (faixa.faixa_etaria.includes("-")) {
        const [minStr, maxStr] = faixa.faixa_etaria.split("-")
        const min = Number.parseInt(minStr.trim(), 10)
        const max = Number.parseInt(maxStr.trim(), 10)

        if (!isNaN(min) && !isNaN(max) && idade >= min && idade <= max) {
          valorEncontrado = Number(faixa.valor) || 0
          break
        }
      }
      // Verificar se é uma faixa com formato "min+" (idade mínima)
      else if (faixa.faixa_etaria.endsWith("+")) {
        const min = Number.parseInt(faixa.faixa_etaria.replace("+", "").trim(), 10)
        if (!isNaN(min) && idade >= min) {
          valorEncontrado = Number(faixa.valor) || 0
          break
        }
      }
      // Verificar se é uma idade específica
      else {
        const idadeExata = Number.parseInt(faixa.faixa_etaria.trim(), 10)
        if (!isNaN(idadeExata) && idade === idadeExata) {
          valorEncontrado = Number(faixa.valor) || 0
          break
        }
      }
    }

    console.log(`✅ [tabelas_precos_faixas] Valor encontrado: R$ ${valorEncontrado} para idade ${idade}`)
    return valorEncontrado
  } catch (error) {
    console.error(`❌ [tabelas_precos_faixas] Erro no serviço:`, error)
    throw error
  }
}

/**
 * Busca faixas etárias por tabela
 * Consulta a tabela 'tabelas_precos_faixas'
 */
export async function buscarFaixasEtariasPorTabela(tabelaId: string): Promise<TabelaPrecoFaixa[]> {
  try {
    console.log("🔍 [tabelas_precos_faixas] Buscando faixas etárias para tabela:", tabelaId)

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabase
      .from("tabelas_precos_faixas")
      .select("*")
      .eq("tabela_id", tabelaId)
      .eq("tenant_id", tenantId)
      .order("faixa_etaria", { ascending: true })

    if (error) {
      console.error("❌ [tabelas_precos_faixas] Erro ao buscar faixas:", error)
      throw error
    }

    console.log(`✅ [tabelas_precos_faixas] ${data?.length || 0} faixas etárias encontradas`)
    return data || []
  } catch (error) {
    console.error("❌ [tabelas_precos_faixas] Erro no serviço:", error)
    throw error
  }
}
