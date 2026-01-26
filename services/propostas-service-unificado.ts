import { supabase } from "@/lib/supabase"
import { validarCPF, removerFormatacaoCPF } from "@/utils/validacoes"

// Interfaces para tipagem
interface PropostaUnificada {
  id: string
  origem: "propostas" | "propostas_corretores"
  tabela_origem?: string
  nome_cliente?: string
  email_cliente?: string
  telefone_cliente?: string
  status: string
  created_at: string
  updated_at?: string
  valor_total?: number
  corretor_nome?: string
  corretor_email?: string
  comissao?: number
  email_validacao_enviado?: boolean
  email_enviado_em?: string
  [key: string]: any
}

interface DependenteData {
  id: string
  nome: string
  cpf?: string
  parentesco: string
  data_nascimento?: string
  sexo?: string
  valor_individual?: number
  [key: string]: any
}

interface QuestionarioSaudeData {
  id: string
  pergunta_id: number
  pergunta_texto?: string
  resposta: "sim" | "nao"
  detalhes?: string
  [key: string]: any
}

/**
 * Busca todas as propostas da tabela unificada 'propostas'
 * Agora todas as propostas (diretas e de corretores) estão na mesma tabela
 */
export async function buscarPropostas(): Promise<PropostaUnificada[]> {
  try {

    // Buscar todas as propostas da tabela unificada (sem JOIN)
    const { data: propostas, error } = await supabase
      .from("propostas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar propostas:", error)
      throw error
    }


    // Buscar dados dos corretores separadamente se necessário
    const corretoresIds = propostas
      ?.filter((p) => p.corretor_id)
      .map((p) => p.corretor_id)
      .filter((id, index, arr) => arr.indexOf(id) === index) // IDs únicos

    let corretoresData: any[] = []
    if (corretoresIds && corretoresIds.length > 0) {

      const { data: corretores, error: corretoresError } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .in("id", corretoresIds)

      if (corretoresError) {
        console.warn("⚠️ Erro ao buscar corretores:", corretoresError)
        // Não falhar por causa dos corretores
      } else {
        corretoresData = corretores || []
      }
    }

    // Processar e padronizar os dados
    const propostasProcessadas: PropostaUnificada[] = (propostas || []).map((proposta) => {
      // Determinar origem baseado na presença do corretor_id
      const origem = proposta.corretor_id ? "propostas_corretores" : "propostas"

      // Buscar dados do corretor
      const corretor = corretoresData.find((c) => c.id === proposta.corretor_id)

      return {
        ...proposta,
        origem,
        tabela_origem: "propostas", // Sempre propostas agora
        nome_cliente: obterNomeCliente(proposta),
        email_cliente: obterEmailCliente(proposta),
        telefone_cliente: obterTelefoneCliente(proposta),
        valor_total: obterValorProposta(proposta),
        corretor_nome: corretor?.nome || proposta.corretor_nome || null,
        corretor_email: corretor?.email || proposta.corretor_email || null,
        comissao: proposta.comissao || 0,
        email_validacao_enviado: proposta.email_validacao_enviado || false,
        email_enviado_em: proposta.email_enviado_em || null,
      }
    })


    return propostasProcessadas
  } catch (error) {
    console.error("❌ ERRO GERAL ao buscar propostas:", error)
    throw error
  }
}

/**
 * Busca uma proposta completa por ID
 * Agora sempre busca na tabela 'propostas'
 */
export async function buscarPropostaCompleta(id: string): Promise<PropostaUnificada | null> {
  try {

    // Tentar buscar com retry em caso de erro de rede
    let proposta = null
    let error = null
    const maxTentativas = 3
    let tentativa = 0

    while (tentativa < maxTentativas && !proposta) {
      tentativa++
      console.log(`   Tentativa ${tentativa}/${maxTentativas}...`)
      
      try {
        const resultado = await supabase.from("propostas").select("*").eq("id", id).single()
        proposta = resultado.data
        error = resultado.error

        if (error) {
          console.error(`   ❌ Erro na tentativa ${tentativa}:`, error)
          
          // Se for erro de rede, tentar novamente
          if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
            if (tentativa < maxTentativas) {
              const delay = tentativa * 1000 // 1s, 2s, 3s
              console.log(`   ⏳ Aguardando ${delay}ms antes de tentar novamente...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          } else {
            // Se não for erro de rede, não tentar novamente
            break
          }
        }

        if (proposta) {
          break
        }
      } catch (err: any) {
        console.error(`   ❌ Exceção na tentativa ${tentativa}:`, err)
        error = err
        
        // Se for erro de rede, tentar novamente
        if (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('ECONNREFUSED')) {
          if (tentativa < maxTentativas) {
            const delay = tentativa * 1000
            console.log(`   ⏳ Aguardando ${delay}ms antes de tentar novamente...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        } else {
          break
        }
      }
    }

    if (error) {
      console.error("❌ Erro ao buscar proposta após todas as tentativas:", error)
      console.error("   Código:", error.code)
      console.error("   Mensagem:", error.message)
      console.error("   Detalhes:", error.details)
      return null
    }

    if (!proposta) {
      console.log("❌ Proposta não encontrada após todas as tentativas")
      console.log("   ID buscado:", id)
      return null
    }

    console.log("✅ Proposta encontrada na tabela unificada")

    // Buscar dados do corretor se existir
    let corretor = null
    if (proposta.corretor_id) {
      const { data: corretorData, error: corretorError } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .eq("id", proposta.corretor_id)
        .single()

      if (corretorError) {
        console.warn("⚠️ Erro ao buscar corretor:", corretorError)
      } else {
        corretor = corretorData
      }
    }

    // Determinar origem baseado na presença do corretor_id
    const origem = proposta.corretor_id ? "corretor" : "admin"

    return {
      ...proposta,
      origem,
      tabela_origem: "propostas",
      nome_cliente: obterNomeCliente(proposta),
      email_cliente: obterEmailCliente(proposta),
      telefone_cliente: obterTelefoneCliente(proposta),
      valor_total: obterValorProposta(proposta),
      corretor_nome: corretor?.nome || proposta.corretor_nome || null,
      corretor_email: corretor?.email || proposta.corretor_email || null,
      comissao: proposta.comissao || 0,
      email_validacao_enviado: proposta.email_validacao_enviado || false,
      email_enviado_em: proposta.email_enviado_em || null,
    }
  } catch (error) {
    console.error("❌ Erro ao buscar proposta completa:", error)
    return null
  }
}

/**
 * Busca dependentes de uma proposta
 * Agora sempre busca na tabela 'dependentes' (unificada)
 */
export async function buscarDependentesProposta(propostaId: string): Promise<DependenteData[]> {
  try {
    console.log(`🔍 Buscando dependentes da proposta: ${propostaId}`)

    const { data: dependentes, error } = await supabase
      .from("dependentes")
      .select("*")
      .eq("proposta_id", propostaId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Erro ao buscar dependentes:", error)
      return []
    }

    if (dependentes && dependentes.length > 0) {
      console.log(`✅ Encontrados ${dependentes.length} dependentes`)
      return dependentes
    }

    console.log("ℹ️ Nenhum dependente encontrado para esta proposta")
    return []
  } catch (error) {
    console.error("❌ Erro ao buscar dependentes:", error)
    return []
  }
}

/**
 * Busca questionário de saúde de uma proposta
 */
export async function buscarQuestionarioSaude(
  propostaId: string,
  dependenteId?: string,
): Promise<QuestionarioSaudeData[]> {
  try {
    console.log(
      `🔍 Buscando questionário de saúde - Proposta: ${propostaId}${dependenteId ? `, Dependente: ${dependenteId}` : " (titular)"}`,
    )

    let query = supabase.from("questionario_saude").select("*").eq("proposta_id", propostaId)

    if (dependenteId) {
      query = query.eq("dependente_id", dependenteId)
    } else {
      query = query.is("dependente_id", null)
    }

    const { data, error } = await query.order("pergunta_id", { ascending: true })

    if (error) {
      console.error("❌ Erro ao buscar questionário de saúde:", error)
      return []
    }

    if (data && data.length > 0) {
      console.log(`✅ Encontradas ${data.length} respostas do questionário`)
      return data
    }

    console.log("ℹ️ Nenhum questionário de saúde encontrado")
    return []
  } catch (error) {
    console.error("❌ Erro ao buscar questionário de saúde:", error)
    return []
  }
}

/**
 * Cancela uma proposta - NOVA FUNÇÃO
 * Atualiza o status para 'cancelada'
 */
export async function cancelarProposta(id: string, motivo?: string): Promise<boolean> {
  try {
    console.log(`🚫 Cancelando proposta ${id}`)
    
    const sucesso = await atualizarStatusProposta(id, "cancelada", motivo)
    
    if (sucesso) {
      console.log("✅ Proposta cancelada com sucesso")
    } else {
      console.error("❌ Erro ao cancelar proposta")
    }
    
    return sucesso
  } catch (error) {
    console.error("❌ Erro ao cancelar proposta:", error)
    return false
  }
}

/**
 * Atualiza o status de uma proposta - CORRIGIDO
 * Tenta atualizar em ambas as tabelas (propostas e propostas_corretores)
 */
export async function atualizarStatusProposta(id: string, status: string, motivo?: string): Promise<boolean> {
  try {
    console.log(`🔄 Atualizando status da proposta ${id} para: ${status}`)

    // Preparar dados de atualização
    const dadosAtualizacao: any = {
      status,
      motivo_rejeicao: motivo || null,
    }

    // Usar o status diretamente (assumindo que 'cancelada' foi adicionado à constraint)
    // Se necessário, podemos mapear 'cancelada' para 'rejeitada' como fallback
    if (status === 'cancelada') {
      dadosAtualizacao.status = 'cancelada'
    }

    // Tentar adicionar updated_at se a coluna existir
    try {
      dadosAtualizacao.updated_at = new Date().toISOString()
    } catch (error) {
      console.warn("⚠️ Campo updated_at pode não existir, continuando sem ele")
    }

    // Primeiro, tentar na tabela 'propostas'
    console.log("🔄 Tentando atualizar na tabela 'propostas'...")
    const { error: errorPropostas } = await supabase.from("propostas").update(dadosAtualizacao).eq("id", id)

    if (!errorPropostas) {
      console.log("✅ Status atualizado com sucesso na tabela 'propostas'")
      return true
    }

    console.log("⚠️ Falha na tabela 'propostas', tentando na tabela 'propostas_corretores'...")
    console.error("❌ Erro na tabela propostas:", errorPropostas)

    // Se falhar na tabela 'propostas', tentar na tabela 'propostas_corretores'
    const { error: errorCorretores } = await supabase.from("propostas_corretores").update(dadosAtualizacao).eq("id", id)

    if (!errorCorretores) {
      console.log("✅ Status atualizado com sucesso na tabela 'propostas_corretores'")
      return true
    }

    console.error("❌ Erro na tabela propostas_corretores:", errorCorretores)

    // Se falhar com updated_at, tentar sem ele em ambas as tabelas
    console.log("🔄 Tentando atualizar sem campo de timestamp...")
    
    const dadosSemTimestamp: any = {
      status: status, // Usar o status diretamente
      motivo_rejeicao: motivo || null,
    }

    // Tentar na tabela 'propostas' sem timestamp
    const { error: errorPropostasSemTimestamp } = await supabase
      .from("propostas")
      .update(dadosSemTimestamp)
      .eq("id", id)

    if (!errorPropostasSemTimestamp) {
      console.log("✅ Status atualizado com sucesso na tabela 'propostas' (sem timestamp)")
      return true
    }

    // Tentar na tabela 'propostas_corretores' sem timestamp
    const { error: errorCorretoresSemTimestamp } = await supabase
      .from("propostas_corretores")
      .update(dadosSemTimestamp)
      .eq("id", id)

    if (!errorCorretoresSemTimestamp) {
      console.log("✅ Status atualizado com sucesso na tabela 'propostas_corretores' (sem timestamp)")
      return true
    }

    console.error("❌ Falha em ambas as tabelas com e sem timestamp")
    console.error("❌ Erro propostas (sem timestamp):", errorPropostasSemTimestamp)
    console.error("❌ Erro corretores (sem timestamp):", errorCorretoresSemTimestamp)
    return false
  } catch (error) {
    console.error("❌ Erro ao atualizar status da proposta:", error)
    return false
  }
}

/**
 * Envia email de validação para o cliente - CORRIGIDO
 */
export async function enviarValidacaoEmail(
  propostaId: string,
  emailCliente: string,
  nomeCliente: string,
): Promise<boolean> {
  try {
    console.log(`📧 Enviando email de validação para: ${emailCliente}`)
    console.log(`📧 Proposta ID: ${propostaId}`)
    console.log(`📧 Cliente: ${nomeCliente}`)

    // Importar o serviço de email dinamicamente para evitar problemas de dependência circular
    const { enviarEmailValidacaoProposta } = await import("@/services/email-service")

    const sucesso = await enviarEmailValidacaoProposta(emailCliente, nomeCliente, propostaId)

    if (sucesso) {
      console.log("✅ Email de validação enviado com sucesso")
      console.log("📧 Flag de email será atualizada pelo serviço de email")
      return true
    }

    console.error("❌ Falha no envio do email de validação")
    return false
  } catch (error) {
    console.error("❌ Erro ao enviar email de validação:", error)
    return false
  }
}

/**
 * Cria uma nova proposta na tabela unificada com validação de CPF
 */
export async function criarProposta(dadosProposta: any): Promise<string | null> {
  try {
    console.log("🚀 Criando nova proposta na tabela unificada...")
    console.log("📋 Dados recebidos:", dadosProposta)

    // GARANTIR QUE O NOME DO CORRETOR SERÁ SALVO
    if (dadosProposta.corretor_id && !dadosProposta.corretor_nome) {
      const { data: corretor, error } = await supabase
        .from("corretores")
        .select("nome")
        .eq("id", dadosProposta.corretor_id)
        .single()
      if (corretor && corretor.nome) {
        dadosProposta.corretor_nome = corretor.nome
        console.log("✅ Nome do corretor preenchido automaticamente:", corretor.nome)
      } else {
        console.warn("⚠️ Não foi possível preencher o nome do corretor automaticamente.")
      }
    }

    // VALIDAR E FORMATAR CPF DO TITULAR
    if (dadosProposta.cpf) {
      const cpfLimpo = removerFormatacaoCPF(dadosProposta.cpf)
      console.log("🔍 Validando CPF do titular:", cpfLimpo)

      if (!validarCPF(cpfLimpo)) {
        throw new Error(`CPF do titular inválido: ${dadosProposta.cpf}`)
      }

      // Usar CPF sem formatação para salvar no banco
      dadosProposta.cpf = cpfLimpo
      dadosProposta.cpf_cliente = cpfLimpo
      console.log("✅ CPF do titular validado e formatado:", cpfLimpo)
    }

    // VALIDAR CPF DOS DEPENDENTES SE HOUVER
    if (dadosProposta.dependentes && Array.isArray(dadosProposta.dependentes)) {
      for (let i = 0; i < dadosProposta.dependentes.length; i++) {
        const dependente = dadosProposta.dependentes[i]
        if (dependente.cpf) {
          const cpfDependenteLimpo = removerFormatacaoCPF(dependente.cpf)
          console.log(`🔍 Validando CPF do dependente ${i + 1}:`, cpfDependenteLimpo)

          if (!validarCPF(cpfDependenteLimpo)) {
            throw new Error(`CPF do dependente ${i + 1} inválido: ${dependente.cpf}`)
          }

          // Usar CPF sem formatação
          dadosProposta.dependentes[i].cpf = cpfDependenteLimpo
          console.log(`✅ CPF do dependente ${i + 1} validado:`, cpfDependenteLimpo)
        }
      }
    }

    // Converter nomes para maiúsculas para padronização
    if (dadosProposta.nome) {
      dadosProposta.nome = dadosProposta.nome.toUpperCase()
      dadosProposta.nome_cliente = dadosProposta.nome
    }
    if (dadosProposta.nome_mae) {
      dadosProposta.nome_mae = dadosProposta.nome_mae.toUpperCase()
    }
    if (dadosProposta.corretor_nome) {
      dadosProposta.corretor_nome = dadosProposta.corretor_nome.toUpperCase()
    }
    // Converter nomes dos dependentes
    if (dadosProposta.dependentes && Array.isArray(dadosProposta.dependentes)) {
      dadosProposta.dependentes = dadosProposta.dependentes.map((dep: any) => ({
        ...dep,
        nome: dep.nome ? dep.nome.toUpperCase() : dep.nome,
        nome_mae: dep.nome_mae ? dep.nome_mae.toUpperCase() : dep.nome_mae,
      }))
    }

    // Preparar dados para inserção
    const dadosParaInserir = {
      ...dadosProposta,
      email_validacao_enviado: false, // CORRIGIDO: Inicializar como false
      created_at: new Date().toISOString(),
    }

    // Tentar adicionar updated_at se possível
    try {
      dadosParaInserir.updated_at = new Date().toISOString()
    } catch (error) {
      console.warn("⚠️ Campo updated_at pode não existir, continuando sem ele")
    }

    console.log("💾 Inserindo proposta na tabela...")
    console.log("📋 Status da proposta:", dadosParaInserir.status)
    console.log("📧 Email enviado inicializado como:", dadosParaInserir.email_validacao_enviado)

    const { data: novaProposta, error } = await supabase
      .from("propostas")
      .insert([dadosParaInserir])
      .select("id")
      .single()

    if (error) {
      console.error("❌ Erro detalhado ao inserir proposta:", error)
      console.error("❌ Código do erro:", error.code)
      console.error("❌ Mensagem do erro:", error.message)
      console.error("❌ Detalhes do erro:", error.details)

      // Se falhar com updated_at, tentar sem ele
      if (error.message?.includes("updated_at") || error.message?.includes("atualizado_em")) {
        console.log("🔄 Tentando inserir sem campo updated_at...")

        const dadosSemTimestamp = { ...dadosParaInserir }
        delete dadosSemTimestamp.updated_at

        const { data: novaProposta2, error: error2 } = await supabase
          .from("propostas")
          .insert([dadosSemTimestamp])
          .select("id")
          .single()

        if (error2) {
          console.error("❌ Erro na segunda tentativa:", error2)
          throw error2
        }

        if (!novaProposta2 || !novaProposta2.id) {
          throw new Error("Proposta não foi criada corretamente - ID não retornado")
        }

        console.log("✅ Proposta criada com sucesso (sem updated_at)!")
        console.log("🆔 ID da proposta:", novaProposta2.id)
        return novaProposta2.id.toString()
      }

      throw error
    }

    if (!novaProposta || !novaProposta.id) {
      console.error("❌ Proposta inserida mas ID não retornado")
      console.error("❌ Dados retornados:", novaProposta)
      throw new Error("Proposta não foi criada corretamente - ID não retornado")
    }

    console.log("✅ Proposta criada com sucesso!")
    console.log("🆔 ID da proposta:", novaProposta.id)

    return novaProposta.id.toString()
  } catch (error) {
    console.error("❌ Erro ao criar proposta:", error)

    // Log adicional para debug
    if (error instanceof Error) {
      console.error("❌ Mensagem do erro:", error.message)
      console.error("❌ Stack do erro:", error.stack)
    }

    return null
  }
}

/**
 * Busca propostas por corretor (para a página do corretor)
 */
export async function buscarPropostasPorCorretor(corretorId: string): Promise<PropostaUnificada[]> {
  try {
    console.log(`🔍 Buscando propostas do corretor: ${corretorId}`)

    const { data: propostas, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("corretor_id", corretorId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar propostas do corretor:", error)
      throw error
    }


    // Buscar dados do corretor
    let corretor = null
    if (corretorId) {
      const { data: corretorData, error: corretorError } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .eq("id", corretorId)
        .single()

      if (corretorError) {
        console.warn("⚠️ Erro ao buscar corretor:", corretorError)
      } else {
        corretor = corretorData
      }
    }

    // Processar dependentes que estão na coluna "dependentes" da tabela "propostas"
    const propostasComDependentes = (propostas || []).map((proposta) => {
      console.log(`🔍 Processando dependentes da proposta ${proposta.id}...`)
      console.log(`📋 Campo dependentes da proposta:`, proposta.dependentes)
      
      let dependentes = []
      
      try {
        // Verificar se existe o campo dependentes e se é uma string JSON
        if (proposta.dependentes && typeof proposta.dependentes === 'string') {
          console.log(`📝 Campo dependentes é string, fazendo parse...`)
          dependentes = JSON.parse(proposta.dependentes)
          console.log(`✅ Parse realizado, ${dependentes.length} dependentes encontrados`)
        } else if (proposta.dependentes && Array.isArray(proposta.dependentes)) {
          console.log(`📝 Campo dependentes já é array, ${proposta.dependentes.length} dependentes encontrados`)
          dependentes = proposta.dependentes
        } else {
          console.log(`📝 Campo dependentes vazio ou inválido para proposta ${proposta.id}`)
        }
        
        if (dependentes && dependentes.length > 0) {
          console.log(`📋 Dados dos dependentes:`, dependentes)
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao processar dependentes da proposta ${proposta.id}:`, error)
        dependentes = []
      }

      return {
        ...proposta,
        dependentes_dados: dependentes
      }
    })

    // Processar e padronizar os dados
    const propostasProcessadas: PropostaUnificada[] = propostasComDependentes.map((proposta) => {
      console.log(`🔍 DEBUG - Dados brutos da proposta ${proposta.id}:`, {
        valor_total: proposta.valor_total,
        valor_mensal: proposta.valor_mensal,
        valor_proposta: proposta.valor_proposta,
        valor: proposta.valor,
        dependentes_count: proposta.dependentes_dados?.length || 0,
        tipos: {
          valor_total: typeof proposta.valor_total,
          valor_mensal: typeof proposta.valor_mensal,
          valor_proposta: typeof proposta.valor_proposta,
          valor: typeof proposta.valor
        }
      })

      const valorProcessado = obterValorProposta(proposta)
      console.log(`🎯 Valor processado para proposta ${proposta.id}:`, valorProcessado)

      return {
      ...proposta,
      origem: "propostas_corretores",
      tabela_origem: "propostas",
      nome_cliente: obterNomeCliente(proposta),
      email_cliente: obterEmailCliente(proposta),
      telefone_cliente: obterTelefoneCliente(proposta),
        valor_total: valorProcessado,
      corretor_nome: corretor?.nome || proposta.corretor_nome || null,
      corretor_email: corretor?.email || proposta.corretor_email || null,
      comissao: proposta.comissao || 0,
      email_validacao_enviado: proposta.email_validacao_enviado || false,
      email_enviado_em: proposta.email_enviado_em || null,
      }
    })

    return propostasProcessadas
  } catch (error) {
    console.error("❌ Erro ao buscar propostas do corretor:", error)
    throw error
  }
}

/**
 * Funções auxiliares para obter dados de forma inteligente
 */
export function obterNomeCliente(proposta: any): string {
  return proposta?.nome_cliente || proposta?.nome || proposta?.cliente || "Nome não informado"
}

export function obterEmailCliente(proposta: any): string {
  return proposta?.email_cliente || proposta?.email || "Email não informado"
}

export function obterTelefoneCliente(proposta: any): string {
  return proposta?.telefone_cliente || proposta?.telefone || proposta?.whatsapp_cliente || "Telefone não informado"
}

export function obterValorProposta(proposta: any): number {
  // Tentar diferentes campos de valor
  const valorTotal = proposta?.valor_total
  const valorMensal = proposta?.valor_mensal
  const valorProposta = proposta?.valor_proposta
  const valor = proposta?.valor

  // Função para converter valor corretamente
  const converterValor = (valor: any): number => {
    if (valor === null || valor === undefined) return 0
    
    // Se for string, tratar separadores
    if (typeof valor === 'string') {
      // Verificar se é um valor com separador de milhar incorreto
      // Ex: "1.127" (deveria ser "1127") vs "748.75" (que está correto)
      
      if (valor.includes('.')) {
        const partes = valor.split('.')
        
        // Se a parte após o ponto tem 3 dígitos e não contém zeros, é separador de milhar
        if (partes[1] && partes[1].length === 3 && !partes[1].includes('0')) {
          const valorCorrigido = valor.replace('.', '')
          return parseFloat(valorCorrigido) || 0
        } else {
          // Trocar vírgula por ponto se houver
          const valorLimpo = valor.replace(',', '.')
          return parseFloat(valorLimpo) || 0
        }
      } else {
        // Sem ponto, só trocar vírgula por ponto se houver
        const valorLimpo = valor.replace(',', '.')
        return parseFloat(valorLimpo) || 0
      }
    }
    
    // Se for número, retornar diretamente
    if (typeof valor === 'number') {
      return valor
    }
    
    return 0
  }

  // Converter para número de forma segura
  let valorNumerico = 0

  if (valorTotal !== null && valorTotal !== undefined) {
    valorNumerico = converterValor(valorTotal)
  } else if (valorMensal !== null && valorMensal !== undefined) {
    valorNumerico = converterValor(valorMensal)
  } else if (valorProposta !== null && valorProposta !== undefined) {
    valorNumerico = converterValor(valorProposta)
  } else if (valor !== null && valor !== undefined) {
    valorNumerico = converterValor(valor)
  }

  // Garantir que o valor seja um número válido
  if (isNaN(valorNumerico)) {
    return 0
  }

  return valorNumerico
}

/**
 * Função inteligente para obter documentos de uma proposta ou dependente
 */
export function obterDocumentosInteligente(
  item: any,
  tipo: "titular" | "dependente" = "titular",
  propostaCompleta?: any, // Adicionar parâmetro para a proposta completa
  dependenteIndex?: number, // Adicionar índice do dependente
): Record<string, string> {
  const documentos: Record<string, string> = {}

  if (!item) return documentos

  // Se for dependente e temos a proposta completa, buscar documentos em documentos_dependentes_urls
  if (tipo === "dependente" && propostaCompleta && typeof dependenteIndex === "number") {
    const documentosDependentes = propostaCompleta.documentos_dependentes_urls
    if (documentosDependentes && typeof documentosDependentes === "object") {
      const dependenteKey = dependenteIndex.toString()
      const docsDependente = documentosDependentes[dependenteKey]
      
      if (docsDependente && typeof docsDependente === "object") {
        console.log(`📄 Documentos encontrados para dependente ${dependenteIndex}:`, Object.keys(docsDependente))
        
        // Mapear os documentos do dependente
        Object.entries(docsDependente).forEach(([tipoDoc, url]) => {
          if (url && typeof url === "string" && url.trim() !== "") {
            documentos[tipoDoc] = url
          }
        })
      } else {
        console.log(`⚠️ Nenhum documento encontrado para dependente ${dependenteIndex}`)
      }
    } else {
      console.log(`⚠️ Campo documentos_dependentes_urls não encontrado na proposta`)
    }
    
    return documentos
  }

  // Lista de possíveis campos de documentos (para titular)
  const camposDocumentos = [
    "rg_frente_url",
    "rg_verso_url",
    "cpf_url",
    "comprovante_residencia_url",
    "cns_url",
    "foto_3x4_url",
    "certidao_nascimento_url",
    "comprovante_renda_url",
    "documento_rg_frente",
    "documento_rg_verso",
    "documento_cpf",
    "documento_comprovante_residencia",
    "documento_cns",
    "documento_foto_3x4",
    "documento_certidao_nascimento",
    "documento_comprovante_renda",
  ]

  // Verificar cada campo possível
  camposDocumentos.forEach((campo) => {
    if (item[campo] && typeof item[campo] === "string" && item[campo].trim() !== "") {
      // Extrair o nome do documento do campo
      const nomeDoc = campo.replace("_url", "").replace("documento_", "")

      documentos[nomeDoc] = item[campo]
    }
  })

  console.log(`📄 Documentos encontrados para ${tipo}:`, Object.keys(documentos))
  return documentos
}
