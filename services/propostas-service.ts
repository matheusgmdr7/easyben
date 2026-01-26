import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

// CORREÇÃO: Usar a mesma tabela que "Propostas Digitais" usa (que está funcionando corretamente)
const TABELA_PROPOSTAS = "propostas" // Mudança: era "propostas_corretores", agora é "propostas"

export async function buscarPropostas() {
  try {
    console.log("🔍 BUSCANDO PROPOSTAS DA TABELA CORRETA")
    console.log("=".repeat(50))
    console.log("📋 Tabela configurada:", TABELA_PROPOSTAS)

    // Obter tenant_id atual
    const tenantId = await getCurrentTenantId()
    console.log("🏢 Tenant ID:", tenantId)

    // Buscar da mesma tabela que "Propostas Digitais" usa, filtrando por tenant
    const { data, error } = await supabase
      .from(TABELA_PROPOSTAS)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar propostas:", error)
      throw new Error(`Erro ao buscar propostas: ${error.message}`)
    }

    console.log("✅ Propostas encontradas:", data?.length || 0)

    if (data && data.length > 0) {
      console.log("📊 Distribuição de Status:")
      const statusCount = {}
      data.forEach((proposta) => {
        const status = proposta.status || "sem_status"
        statusCount[status] = (statusCount[status] || 0) + 1
      })

      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} proposta(s)`)
      })

      console.log("📋 Primeiras 3 propostas:")
      data.slice(0, 3).forEach((proposta, index) => {
        console.log(`   ${index + 1}. Cliente: ${proposta.nome_cliente || proposta.nome || "N/A"}`)
        console.log(`      Status: ${proposta.status || "N/A"}`)
        console.log(`      Email: ${proposta.email || "N/A"}`)
        console.log("      ---")
      })
    }

    return data || []
  } catch (error) {
    console.error("❌ Erro ao buscar propostas:", error)
    throw error
  }
}

// Função para buscar propostas de corretores (mantida para compatibilidade)
export async function buscarPropostasCorretores() {
  try {
    const tenantId = await getCurrentTenantId()
    
    const { data, error } = await supabase
      .from("propostas_corretores")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar propostas de corretores:", error)
      throw new Error(`Erro ao buscar propostas de corretores: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Erro ao buscar propostas de corretores:", error)
    throw error
  }
}

// CORREÇÃO: Função melhorada para buscar dependentes com logs detalhados
export async function buscarDependentesProposta(propostaId: string) {
  try {
    console.log("👨‍👩‍👧‍👦 BUSCANDO DEPENDENTES - DEBUG DETALHADO")
    console.log("=".repeat(60))
    console.log("📋 Proposta ID:", propostaId)

    // Tentar buscar em diferentes tabelas possíveis
    const tabelasPossiveisDependendes = [
      "dependentes",
      "dependentes_propostas",
      "dependentes_propostas_corretores",
      "proposta_dependentes",
    ]

    let dependentesEncontrados = []
    let tabelaUsada = null

    for (const tabela of tabelasPossiveisDependendes) {
      try {
        console.log(`🔍 Tentando buscar na tabela: ${tabela}`)

        const { data, error } = await supabase
          .from(tabela)
          .select("*")
          .eq("proposta_id", propostaId)
          .order("created_at", { ascending: true })

        if (error) {
          console.log(`⚠️ Erro na tabela ${tabela}:`, error.message)
          continue
        }

        if (data && data.length > 0) {
          console.log(`✅ Dependentes encontrados na tabela ${tabela}:`, data.length)
          dependentesEncontrados = data
          tabelaUsada = tabela
          break
        } else {
          console.log(`ℹ️ Nenhum dependente na tabela ${tabela}`)
        }
      } catch (err) {
        console.log(`❌ Erro ao acessar tabela ${tabela}:`, err.message)
        continue
      }
    }

    if (dependentesEncontrados.length > 0) {
      console.log(`🎯 DEPENDENTES ENCONTRADOS NA TABELA: ${tabelaUsada}`)
      console.log("📊 Quantidade:", dependentesEncontrados.length)

      dependentesEncontrados.forEach((dep, index) => {
        console.log(`📋 Dependente ${index + 1}:`)
        console.log(`   Nome: ${dep.nome}`)
        console.log(`   CPF: ${dep.cpf}`)
        console.log(`   Parentesco: ${dep.parentesco}`)
        console.log(`   ID: ${dep.id}`)

        // Verificar documentos em diferentes campos possíveis
        const camposDocumentos = ["documentos_urls", "documentos", "anexos", "arquivos"]
        let temDocumentos = false

        camposDocumentos.forEach((campo) => {
          if (dep[campo]) {
            console.log(`   📎 Documentos em ${campo}:`, Object.keys(dep[campo]).length)
            temDocumentos = true
          }
        })

        if (!temDocumentos) {
          console.log(`   📎 Nenhum documento encontrado`)
        }
        console.log("   ---")
      })
    } else {
      console.log("❌ NENHUM DEPENDENTE ENCONTRADO EM NENHUMA TABELA")
    }

    return dependentesEncontrados || []
  } catch (error) {
    console.error("❌ Erro geral ao buscar dependentes:", error)
    return []
  }
}

// NOVA FUNÇÃO: Buscar dados completos da proposta com debug
export async function buscarPropostaCompleta(propostaId: string) {
  try {
    console.log("🔍 BUSCANDO PROPOSTA COMPLETA - DEBUG")
    console.log("=".repeat(50))
    console.log("📋 Proposta ID:", propostaId)

    // Obter tenant_id atual
    const tenantId = await getCurrentTenantId()
    
    // Buscar proposta principal, filtrando por tenant
    const { data: proposta, error } = await supabase
      .from(TABELA_PROPOSTAS)
      .select("*")
      .eq("id", propostaId)
      .eq("tenant_id", tenantId)
      .single()

    if (error) {
      console.error("❌ Erro ao buscar proposta:", error)
      throw error
    }

    if (!proposta) {
      console.error("❌ Proposta não encontrada")
      throw new Error("Proposta não encontrada")
    }

    console.log("✅ Proposta encontrada:")
    console.log("   Nome:", proposta.nome_cliente || proposta.nome)
    console.log("   Email:", proposta.email)
    console.log("   Status:", proposta.status)

    // Verificar documentos do titular em diferentes campos
    const camposDocumentosTitular = ["documentos_urls", "documentos", "anexos", "arquivos"]
    let documentosTitular = null

    camposDocumentosTitular.forEach((campo) => {
      if (proposta[campo] && Object.keys(proposta[campo]).length > 0) {
        console.log(`   📎 Documentos titular em ${campo}:`, Object.keys(proposta[campo]).length)
        documentosTitular = proposta[campo]
      }
    })

    if (!documentosTitular) {
      console.log("   📎 Nenhum documento do titular encontrado")
    }

    return proposta
  } catch (error) {
    console.error("❌ Erro ao buscar proposta completa:", error)
    throw error
  }
}

// CORREÇÃO: Melhorar função de buscar questionário com debug
export async function buscarQuestionarioSaude(propostaId: string, dependenteId?: string) {
  try {
    console.log("🏥 BUSCANDO QUESTIONÁRIO DE SAÚDE - DEBUG")
    console.log("📋 Proposta ID:", propostaId)
    if (dependenteId) {
      console.log("👤 Dependente ID:", dependenteId)
    }

    const tabelasQuestionario = [
      "questionario_saude",
      "questionario_saude_propostas",
      "saude_questionario",
      "proposta_questionario_saude",
    ]

    let questionarioEncontrado = []
    let tabelaUsada = null

    for (const tabela of tabelasQuestionario) {
      try {
        console.log(`🔍 Tentando buscar questionário na tabela: ${tabela}`)

        let query = supabase.from(tabela).select("*").eq("proposta_id", propostaId)

        if (dependenteId) {
          query = query.eq("dependente_id", dependenteId)
        } else {
          // Para o titular, buscar onde dependente_id é null ou não existe
          query = query.or("dependente_id.is.null,dependente_id.eq.")
        }

        const { data, error } = await query.order("pergunta_id", { ascending: true })

        if (error) {
          console.log(`⚠️ Erro na tabela ${tabela}:`, error.message)
          continue
        }

        if (data && data.length > 0) {
          console.log(`✅ Questionário encontrado na tabela ${tabela}:`, data.length, "respostas")
          questionarioEncontrado = data
          tabelaUsada = tabela
          break
        } else {
          console.log(`ℹ️ Nenhum questionário na tabela ${tabela}`)
        }
      } catch (err) {
        console.log(`❌ Erro ao acessar tabela ${tabela}:`, err.message)
        continue
      }
    }

    if (questionarioEncontrado.length > 0) {
      console.log(`🎯 QUESTIONÁRIO ENCONTRADO NA TABELA: ${tabelaUsada}`)
      const respostasPositivas = questionarioEncontrado.filter((q) => q.resposta === "Sim")
      console.log(`📊 Total de respostas: ${questionarioEncontrado.length}`)
      console.log(`⚠️ Respostas "Sim": ${respostasPositivas.length}`)
    } else {
      console.log("❌ NENHUM QUESTIONÁRIO ENCONTRADO")
    }

    return questionarioEncontrado || []
  } catch (error) {
    console.error("❌ Erro ao buscar questionário de saúde:", error)
    return []
  }
}

// Função para buscar questionário de saúde dos dependentes
export async function buscarQuestionarioSaudeDependentes(propostaId: string) {
  try {
    console.log("🏥 Buscando questionário de saúde dos dependentes...")

    // Primeiro buscar os dependentes
    const dependentes = await buscarDependentesProposta(propostaId)

    if (!dependentes || dependentes.length === 0) {
      console.log("ℹ️ Nenhum dependente encontrado para esta proposta")
      return []
    }

    // Buscar questionários de saúde para cada dependente
    const questionarios = []

    for (const dependente of dependentes) {
      try {
        // Tentar buscar na tabela questionario_saude usando dependente_id
        const questionario = await buscarQuestionarioSaude(propostaId, dependente.id)

        if (questionario && questionario.length > 0) {
          questionarios.push({
            dependente_id: dependente.id,
            dependente_nome: dependente.nome,
            dependente_parentesco: dependente.parentesco,
            questionario: questionario,
          })
        }
      } catch (err) {
        console.log(`⚠️ Erro ao processar dependente ${dependente.nome}:`, err)
        continue
      }
    }

    console.log("✅ Questionários de dependentes processados:", questionarios.length)
    return questionarios
  } catch (error) {
    console.error("Erro ao buscar questionário de saúde dos dependentes:", error)
    return []
  }
}

export async function atualizarStatusProposta(id: string, status: string, motivo?: string) {
  try {
    const tenantId = await getCurrentTenantId()
    
    const updateData: any = { status }
    if (motivo) {
      updateData.motivo_rejeicao = motivo
    }

    const { data, error } = await supabase
      .from(TABELA_PROPOSTAS)
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto

    if (error) {
      console.error("Erro ao atualizar status da proposta:", error)
      throw new Error(`Erro ao atualizar status da proposta: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Erro ao atualizar status da proposta:", error)
    throw error
  }
}

export async function enviarValidacaoEmail(propostaId: string, emailCliente: string, nomeCliente: string) {
  try {
    console.log("📧 INICIANDO ENVIO DE EMAIL DE VALIDAÇÃO")
    console.log("=".repeat(50))
    console.log(`   Tabela usada: ${TABELA_PROPOSTAS}`)
    console.log(`   Proposta ID: ${propostaId}`)
    console.log(`   Email Cliente: "${emailCliente}"`)
    console.log(`   Nome Cliente: "${nomeCliente}"`)

    // Verificar se os dados básicos estão presentes
    if (!propostaId) {
      throw new Error("ID da proposta não fornecido")
    }

    if (!emailCliente || emailCliente.trim() === "") {
      throw new Error("Email do cliente não fornecido ou vazio")
    }

    // Se o nome estiver vazio, buscar dados completos da proposta
    let nomeClienteFinal = nomeCliente
    if (!nomeCliente || nomeCliente.trim() === "") {
      console.log("⚠️ Nome do cliente vazio, buscando dados completos da proposta...")

      const tenantId = await getCurrentTenantId()
      
      const { data: proposta, error } = await supabase
        .from(TABELA_PROPOSTAS)
        .select("*")
        .eq("id", propostaId)
        .eq("tenant_id", tenantId)
        .single()

      if (error) {
        console.error("❌ Erro ao buscar proposta:", error)
        throw new Error(`Erro ao buscar dados da proposta: ${error.message}`)
      }

      if (!proposta) {
        throw new Error("Proposta não encontrada")
      }

      // Usar campos da tabela "propostas"
      nomeClienteFinal = proposta.nome_cliente || proposta.nome || "Cliente"

      console.log(`📝 Nome encontrado: "${nomeClienteFinal}"`)

      // Se ainda estiver vazio, usar email como fallback
      if (!nomeClienteFinal || nomeClienteFinal.trim() === "") {
        nomeClienteFinal = emailCliente.split("@")[0]
        console.log(`📝 Usando email como fallback para nome: "${nomeClienteFinal}"`)
      }
    }

    // Validação final
    if (!nomeClienteFinal || nomeClienteFinal.trim() === "") {
      throw new Error("Não foi possível determinar o nome do cliente")
    }

    console.log(`✅ Dados validados:`)
    console.log(`   Email: "${emailCliente}"`)
    console.log(`   Nome: "${nomeClienteFinal}"`)

    // Criar link para o cliente completar a proposta
    const linkValidacao = `${window.location.origin}/proposta-digital/completar/${propostaId}`
    console.log(`   Link: ${linkValidacao}`)

    // Usar o serviço de email
    const { enviarEmailPropostaCliente } = await import("./email-service")

    const sucesso = await enviarEmailPropostaCliente(
      emailCliente.trim(),
      nomeClienteFinal.trim(),
      linkValidacao,
      "Sistema ContratandoPlanos",
    )

    if (sucesso) {
      console.log("✅ Email de validação enviado com sucesso!")

      // Atualizar status da proposta
      const updateData = {
        status: "aguardando_cliente",
        email_enviado_em: new Date().toISOString(),
        email_validacao_enviado: true,
        link_validacao: linkValidacao,
        ultimo_erro_email: null,
      }

      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from(TABELA_PROPOSTAS)
        .update(updateData)
        .eq("id", propostaId)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto

      if (error) {
        console.error("❌ Erro ao atualizar status da proposta:", error)
        // Tentar atualização básica
        const { error: basicError } = await supabase
          .from(TABELA_PROPOSTAS)
          .update({ status: "aguardando_cliente" })
          .eq("id", propostaId)

        if (basicError) {
          throw new Error(`Erro ao atualizar status básico: ${basicError.message}`)
        }
      }

      console.log("✅ Status da proposta atualizado para 'aguardando_cliente'")
      return true
    } else {
      throw new Error("Falha no envio do email")
    }
  } catch (error) {
    console.error("❌ Erro ao enviar email de validação:", error)
    throw error
  }
}
