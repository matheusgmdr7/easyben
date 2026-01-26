import { supabase, testarConexaoSupabase } from "@/lib/supabase"
import { uploadFile } from "@/utils/supabase"
import { v4 as uuidv4 } from "uuid"
import { validarCPF, removerFormatacaoCPF } from "@/utils/validacoes"

/**
 * Função auxiliar para tratar erros de API key
 */
async function tratarErroAPIKey(funcao: string, error: any) {
  console.error(`❌ ${funcao} - Erro de API key detectado:`, error)

  // Tentar reconectar
  const reconectado = await testarConexaoSupabase()
  if (reconectado) {
    console.log(`✅ ${funcao} - Reconexão bem-sucedida após erro de API key`)
    return true
  }

  console.error(`❌ ${funcao} - Falha na reconexão após erro de API key`)
  return false
}

export async function criarPropostaDigital(dadosProposta: any) {
  try {
    console.log("Criando proposta digital:", dadosProposta)

    // Validar e formatar CPF antes de inserir
    let cpfFormatado = dadosProposta.cpf
    if (dadosProposta.cpf) {
      const cpfNumerico = removerFormatacaoCPF(dadosProposta.cpf)
      console.log("CPF original:", dadosProposta.cpf)
      console.log("CPF numérico:", cpfNumerico)

      if (!validarCPF(cpfNumerico)) {
        throw new Error("CPF inválido. Por favor, verifique e tente novamente.")
      }

      cpfFormatado = cpfNumerico
      console.log("CPF formatado para inserção:", cpfFormatado)
    }

    // Combinar endereço completo se necessário
    let enderecoCompleto = dadosProposta.endereco || ""
    if (dadosProposta.numero) {
      enderecoCompleto += `, ${dadosProposta.numero}`
    }
    if (dadosProposta.complemento) {
      enderecoCompleto += `, ${dadosProposta.complemento}`
    }

    // Converter valor para número se for string
    let valorNumerico = dadosProposta.valor
    if (typeof valorNumerico === "string") {
      valorNumerico = Number.parseFloat(valorNumerico.replace(/[^\d.,]/g, "").replace(",", "."))
    }

    // Tratar produto_id - se for número, converter para string, se for string UUID manter
    let produtoIdTratado = null
    if (dadosProposta.produto_id) {
      // Se for um número (como "4"), não é UUID válido, então deixar null ou buscar UUID real
      if (/^\d+$/.test(dadosProposta.produto_id.toString())) {
        console.warn("produto_id é um número, não UUID. Deixando null por segurança.")
        produtoIdTratado = null
      } else {
        produtoIdTratado = dadosProposta.produto_id
      }
    }

    // Converter nomes para maiúsculas para padronização
    const nomeCliente = dadosProposta.nome ? dadosProposta.nome.toUpperCase() : dadosProposta.nome
    const nomeMae = dadosProposta.nome_mae ? dadosProposta.nome_mae.toUpperCase() : dadosProposta.nome_mae
    const corretorNome = dadosProposta.corretor_nome ? dadosProposta.corretor_nome.toUpperCase() : dadosProposta.corretor_nome
    
    // Converter nomes dos dependentes se houver
    let dependentesDados = dadosProposta.dependentes || []
    if (Array.isArray(dependentesDados)) {
      dependentesDados = dependentesDados.map((dep: any) => ({
        ...dep,
        nome: dep.nome ? dep.nome.toUpperCase() : dep.nome,
        nome_mae: dep.nome_mae ? dep.nome_mae.toUpperCase() : dep.nome_mae,
      }))
    }

    const dadosParaInserir = {
      id: dadosProposta.id,
      corretor_id: dadosProposta.corretor_id,
      corretor_nome: corretorNome,
      modelo_id: dadosProposta.template_id,
      template_titulo: dadosProposta.template_titulo,
      nome_cliente: nomeCliente,
      email: dadosProposta.email,
      telefone: dadosProposta.telefone,
      whatsapp: dadosProposta.whatsapp || dadosProposta.telefone,
      cpf: cpfFormatado, // CPF já validado e formatado
      rg: dadosProposta.rg,
      orgao_emissor: dadosProposta.orgao_emissor,
      data_nascimento: dadosProposta.data_nascimento,
      cns: dadosProposta.cns,
      nome_mae: nomeMae,
      sexo: dadosProposta.sexo,
      endereco: enderecoCompleto,
      numero: dadosProposta.numero,
      complemento: dadosProposta.complemento,
      bairro: dadosProposta.bairro,
      cidade: dadosProposta.cidade,
      estado: dadosProposta.estado,
      cep: dadosProposta.cep,
      tipo_cobertura: dadosProposta.cobertura,
      tipo_acomodacao: dadosProposta.acomodacao,
      codigo_plano: dadosProposta.sigla_plano,
      valor_plano: valorNumerico,
      produto_id: produtoIdTratado, // Usar o valor tratado
      produto_nome: dadosProposta.produto_nome,
      status: dadosProposta.status || "parcial",
      tem_dependentes: dadosProposta.tem_dependentes || false,
      dependentes_dados: dependentesDados ? JSON.stringify(dependentesDados) : "[]",
      peso: dadosProposta.peso ? Number.parseFloat(dadosProposta.peso) : null,
      altura: dadosProposta.altura ? Number.parseFloat(dadosProposta.altura) : null,
      observacoes: dadosProposta.observacoes,
      acomodacao: dadosProposta.acomodacao,
      caracteristicas_plano: dadosProposta.caracteristicas_plano || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("Dados preparados para inserção:", dadosParaInserir)

    const { data, error } = await supabase.from("propostas").insert([dadosParaInserir]).select().single()

    if (error) {
      console.error("Erro ao criar proposta digital:", error)

      // Tratamento específico para erro de CPF inválido
      if (error.message && error.message.includes("cpf_valido")) {
        throw new Error("CPF inválido. Por favor, verifique e tente novamente.")
      }

      throw new Error(`Erro ao criar proposta: ${error.message}`)
    }

    console.log("Proposta criada com sucesso:", data)
    return data
  } catch (error) {
    console.error("Erro ao criar proposta digital:", error)
    throw error
  }
}

/**
 * Atualiza uma proposta existente
 */
export async function atualizarProposta(id: string, dadosAtualizacao: any) {
  try {
    // Validar CPF se estiver sendo atualizado
    if (dadosAtualizacao.cpf) {
      const cpfNumerico = removerFormatacaoCPF(dadosAtualizacao.cpf)

      if (!validarCPF(cpfNumerico)) {
        throw new Error("CPF inválido. Por favor, verifique e tente novamente.")
      }

      dadosAtualizacao.cpf = cpfNumerico
    }

    const { data, error } = await supabase
      .from("propostas")
      .update({
        ...dadosAtualizacao,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar proposta digital:", error)

      // Tratamento específico para erro de CPF inválido
      if (error.message && error.message.includes("cpf_valido")) {
        throw new Error("CPF inválido. Por favor, verifique e tente novamente.")
      }

      throw new Error(`Erro ao atualizar proposta: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Erro ao atualizar proposta digital:", error)
    throw error
  }
}

/**
 * Salva os dependentes de uma proposta
 */
export async function salvarDependentes(dependentes: any[], propostaId: string) {
  try {
    console.log(`🔍 SALVAR DEPENDENTES - Iniciando para proposta ${propostaId}`)
    console.log(`🔍 SALVAR DEPENDENTES - Quantidade: ${dependentes.length}`)
    console.log(`🔍 SALVAR DEPENDENTES - Dados:`, dependentes)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique sua conexão.")
    }

    if (!dependentes || dependentes.length === 0) {
      console.log("ℹ️ SALVAR DEPENDENTES - Nenhum dependente para salvar")
      return []
    }

    // Preparar os dados dos dependentes
    const dependentesData = dependentes.map((dep, index) => {
      console.log(`🔍 SALVAR DEPENDENTES - Processando dependente ${index + 1}:`, dep)

      // Validar e formatar CPF do dependente
      let cpfFormatado = dep.cpf
      if (dep.cpf) {
        const cpfNumerico = removerFormatacaoCPF(dep.cpf)
        console.log(`CPF dependente ${index + 1} original:`, dep.cpf)
        console.log(`CPF dependente ${index + 1} numérico:`, cpfNumerico)

        if (!validarCPF(cpfNumerico)) {
          throw new Error(`CPF inválido para o dependente ${dep.nome}. Por favor, verifique e tente novamente.`)
        }
        cpfFormatado = cpfNumerico
        console.log(`CPF dependente ${index + 1} formatado:`, cpfFormatado)
      }

      return {
        id: uuidv4(),
        proposta_id: propostaId,
        nome: dep.nome,
        cpf: cpfFormatado,
        rg: dep.rg,
        data_nascimento: dep.data_nascimento,
        cns: dep.cns,
        parentesco: dep.parentesco,
        uf_nascimento: dep.uf_nascimento || "",
        nome_mae: dep.nome_mae || "",
        peso: dep.peso || null,
        altura: dep.altura || null,
        valor_individual: dep.valor_individual
          ? Number.parseFloat(dep.valor_individual.replace(/[^\d.,]/g, "").replace(",", "."))
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    console.log(`🔍 SALVAR DEPENDENTES - Dados preparados para inserção:`, dependentesData)

    // Inserir os dependentes no banco de dados
    const { data, error } = await supabase.from("dependentes").insert(dependentesData).select()

    if (error) {
      console.error("❌ SALVAR DEPENDENTES - Erro ao salvar dependentes:", error)

      // Tratamento específico para erro de API key
      if (error.message && error.message.includes("Invalid API key")) {
        const reconectado = await tratarErroAPIKey("SALVAR DEPENDENTES", error)
        if (reconectado) {
          // Tentar novamente após reconexão
          return await salvarDependentes(dependentes, propostaId)
        }
      }

      // Tratamento específico para erro de CPF inválido
      if (error.message && error.message.includes("dependente_cpf_valido")) {
        throw new Error("CPF inválido em um dos dependentes. Por favor, verifique e tente novamente.")
      }

      throw error
    }

    console.log("✅ SALVAR DEPENDENTES - Dependentes salvos com sucesso:", data)
    return data
  } catch (error) {
    console.error("❌ SALVAR DEPENDENTES - Erro ao salvar dependentes:", error)
    throw error
  }
}

/**
 * Salva as respostas do questionário de saúde
 */
export async function salvarQuestionarioSaude(questionario: any, propostaId: string) {
  try {
    console.log(`🔍 SALVAR QUESTIONARIO - Salvando ${questionario.length} respostas para proposta ${propostaId}`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique sua conexão.")
    }

    // Preparar os dados das respostas
    const respostasData = questionario.map((resp: any) => ({
      id: uuidv4(),
      proposta_id: propostaId,
      pergunta_id: resp.pergunta_id,
      pergunta: resp.pergunta,
      resposta: resp.resposta,
      observacao: resp.observacao || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    // Inserir as respostas no banco de dados
    const { data, error } = await supabase.from("questionario_saude").insert(respostasData).select()

    if (error) {
      console.error("❌ SALVAR QUESTIONARIO - Erro ao salvar questionário de saúde:", error)

      // Tratamento específico para erro de API key
      if (error.message && error.message.includes("Invalid API key")) {
        const reconectado = await tratarErroAPIKey("SALVAR QUESTIONARIO", error)
        if (reconectado) {
          // Tentar novamente após reconexão
          return await salvarQuestionarioSaude(questionario, propostaId)
        }
      }

      throw error
    }

    console.log("✅ SALVAR QUESTIONARIO - Questionário de saúde salvo com sucesso:", data)
    return data
  } catch (error) {
    console.error("❌ SALVAR QUESTIONARIO - Erro ao salvar questionário de saúde:", error)
    throw error
  }
}

/**
 * Salva os documentos usando EXATAMENTE a mesma estrutura que funciona em app/proposta/page.tsx
 */
export async function salvarDocumentos(propostaId: string, documentos: any, documentos_dependentes?: any) {
  console.log("📄 PROCESSANDO DOCUMENTOS - USANDO LÓGICA QUE FUNCIONA")

  const documentosUrls: Record<string, string> = {}

  // Processar documentos do titular - MESMA LÓGICA QUE FUNCIONA
  for (const [key, file] of Object.entries(documentos || {})) {
    if (file) {
      try {
        console.log(`🔄 Processando ${key}:`, (file as File).name)

        // Usar o mesmo padrão de path que funciona na página original
        const path = `${propostaId}/${key}_${Date.now()}`
        console.log("📁 Path:", path)

        // Usar a função uploadFile que JÁ FUNCIONA - SEM TENTATIVAS
        const url = await uploadFile(file as File, "documentos_propostas", path)

        if (!url) {
          throw new Error(`Erro ao fazer upload do documento ${key}`)
        }

        documentosUrls[key] = url
        console.log(`✅ ${key} salvo com sucesso`)
      } catch (uploadError) {
        console.error(`❌ Erro no upload de ${key}:`, uploadError)
        throw new Error(
          uploadError instanceof Error
            ? uploadError.message
            : `Erro ao fazer upload do documento ${key}. Tente novamente.`,
        )
      }
    }
  }

  // Processar documentos dos dependentes
  if (documentos_dependentes && Array.isArray(documentos_dependentes)) {
    for (let i = 0; i < documentos_dependentes.length; i++) {
      const docsDependente = documentos_dependentes[i]
      if (docsDependente) {
        for (const [key, file] of Object.entries(docsDependente)) {
          if (file) {
            try {
              console.log(`🔄 Processando dependente ${i} - ${key}:`, (file as File).name)

              const path = `${propostaId}/dependente_${i}_${key}_${Date.now()}`
              const url = await uploadFile(file as File, "documentos_propostas", path)

              if (!url) {
                throw new Error(`Erro ao fazer upload do documento ${key} do dependente ${i}`)
              }

              documentosUrls[`dependente_${i}_${key}`] = url
              console.log(`✅ Dependente ${i} - ${key} salvo com sucesso`)
            } catch (uploadError) {
              console.error(`❌ Erro no upload do dependente ${i} - ${key}:`, uploadError)
              throw new Error(
                uploadError instanceof Error
                  ? uploadError.message
                  : `Erro ao fazer upload do documento ${key} do dependente ${i}. Tente novamente.`,
              )
            }
          }
        }
      }
    }
  }

  console.log("✅ TODOS OS DOCUMENTOS PROCESSADOS COM SUCESSO!")
  return documentosUrls
}

/**
 * Salva o PDF de uma proposta
 */
export async function salvarPDF(propostaId: string, pdfBytes: Uint8Array): Promise<string> {
  try {
    console.log(`🔍 SALVAR PDF - Salvando PDF para proposta ${propostaId}`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique sua conexão.")
    }

    // Gerar um nome de arquivo único
    const nomeArquivo = `proposta_${propostaId}_${uuidv4()}.pdf`

    // Fazer upload do PDF para o Supabase Storage
    const { data, error } = await supabase.storage.from("arquivos").upload(`propostas/${nomeArquivo}`, pdfBytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("❌ SALVAR PDF - Erro ao fazer upload do PDF:", error)
      throw error
    }

    // Obter a URL pública do arquivo
    const { data: urlData } = supabase.storage.from("arquivos").getPublicUrl(`propostas/${nomeArquivo}`)

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Não foi possível obter a URL pública do PDF")
    }

    console.log("✅ SALVAR PDF - PDF salvo com sucesso:", urlData.publicUrl)
    return urlData.publicUrl
  } catch (error) {
    console.error("❌ SALVAR PDF - Erro ao salvar PDF:", error)
    throw error
  }
}

/**
 * Busca uma proposta pelo ID
 */
export async function buscarPropostaDigitalPorId(id: string) {
  try {
    const { data, error } = await supabase.from("propostas").select("*").eq("id", id).single()

    if (error) {
      console.error("Erro ao buscar proposta digital:", error)
      throw new Error(`Erro ao buscar proposta: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Erro ao buscar proposta digital:", error)
    throw error
  }
}

/**
 * Busca uma proposta pelo ID
 */
export async function obterProposta(id: string): Promise<any> {
  try {
    console.log(`🔍 OBTER PROPOSTA - Buscando proposta com ID ${id}`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique sua conexão.")
    }

    // Primeiro tentar buscar da tabela propostas_corretores (nova estrutura)
    let { data, error } = await supabase.from("propostas_corretores").select("*").eq("id", id).single()

    // Se não encontrar, tentar na tabela propostas (estrutura antiga)
    if (error && error.code === "PGRST116") {
      console.log("🔍 OBTER PROPOSTA - Não encontrado em propostas_corretores, tentando em propostas...")

      const result = await supabase.from("propostas").select("*").eq("id", id).single()

      data = result.data
      error = result.error
    }

    if (error) {
      console.error("❌ OBTER PROPOSTA - Erro ao buscar proposta:", error)

      // Tratamento específico para erro de API key
      if (error.message && error.message.includes("Invalid API key")) {
        const reconectado = await tratarErroAPIKey("OBTER PROPOSTA", error)
        if (reconectado) {
          // Tentar novamente após reconexão
          return await obterProposta(id)
        }
      }

      throw error
    }

    if (!data) {
      throw new Error("Proposta não encontrada")
    }

    // Mapear campos para compatibilidade
    if (data) {
      // Mapear campos da tabela propostas_corretores para o formato esperado
      const propostaMapeada = {
        ...data,
        nome: data.cliente || data.nome_cliente || data.nome,
        email: data.email_cliente || data.email,
        telefone: data.whatsapp_cliente || data.telefone,
        produto_nome: data.produto_nome,
        valor: data.valor_proposta || data.valor_plano,
        template_id: data.modelo_id || data.template_id,
        corretor_nome: data.corretor_nome,
        status: data.status,
      }

      console.log("✅ OBTER PROPOSTA - Proposta encontrada e mapeada:", propostaMapeada)
      return propostaMapeada
    }

    console.log("✅ OBTER PROPOSTA - Proposta encontrada:", data)
    return data
  } catch (error) {
    console.error("❌ OBTER PROPOSTA - Erro ao buscar proposta:", error)
    throw error
  }
}

/**
 * Busca os dependentes de uma proposta
 */
export async function obterDependentes(propostaId: string): Promise<any[]> {
  try {
    console.log(`🔍 OBTER DEPENDENTES - Buscando dependentes da proposta ${propostaId}`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique sua conexão.")
    }

    const { data, error } = await supabase
      .from("dependentes")
      .select("*")
      .eq("proposta_id", propostaId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ OBTER DEPENDENTES - Erro ao buscar dependentes:", error)

      // Tratamento específico para erro de API key
      if (error.message && error.message.includes("Invalid API key")) {
        const reconectado = await tratarErroAPIKey("OBTER DEPENDENTES", error)
        if (reconectado) {
          // Tentar novamente após reconexão
          return await obterDependentes(propostaId)
        }
      }

      throw error
    }

    console.log(`✅ OBTER DEPENDENTES - Encontrados ${data?.length || 0} dependentes:`, data)
    return data || []
  } catch (error) {
    console.error("❌ OBTER DEPENDENTES - Erro ao buscar dependentes:", error)
    throw error
  }
}

/**
 * Busca as respostas do questionário de saúde de uma proposta
 */
export async function obterQuestionarioSaude(propostaId: string): Promise<any[]> {
  try {
    console.log(`🔍 OBTER QUESTIONARIO - Buscando questionário de saúde da proposta ${propostaId}`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      throw new Error("Não foi possível conectar ao banco de dados. Verifique sua conexão.")
    }

    const { data, error } = await supabase
      .from("questionario_saude")
      .select("*")
      .eq("proposta_id", propostaId)
      .order("pergunta_id", { ascending: true })

    if (error) {
      console.error("❌ OBTER QUESTIONARIO - Erro ao buscar questionário de saúde:", error)

      // Tratamento específico para erro de API key
      if (error.message && error.message.includes("Invalid API key")) {
        const reconectado = await tratarErroAPIKey("OBTER QUESTIONARIO", error)
        if (reconectado) {
          // Tentar novamente após reconexão
          return await obterQuestionarioSaude(propostaId)
        }
      }

      throw error
    }

    console.log(`✅ OBTER QUESTIONARIO - Encontradas ${data?.length || 0} respostas no questionário`)
    return data || []
  } catch (error) {
    console.error("❌ OBTER QUESTIONARIO - Erro ao buscar questionário de saúde:", error)
    throw error
  }
}

/**
 * Verifica se os documentos de uma proposta já foram salvos
 */
export async function verificarDocumentosSalvos(propostaId: string): Promise<boolean> {
  try {
    console.log(`🔍 VERIFICAR DOCUMENTOS - Verificando se documentos da proposta ${propostaId} já foram salvos`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      console.error("❌ VERIFICAR DOCUMENTOS - Erro de conexão")
      return false
    }

    const { data, error } = await supabase.from("propostas").select("documentos_urls").eq("id", propostaId).single()

    if (error) {
      console.error("❌ VERIFICAR DOCUMENTOS - Erro ao verificar documentos salvos:", error)
      return false
    }

    const documentosUrls = data?.documentos_urls
    if (!documentosUrls || typeof documentosUrls !== "object") {
      console.log("ℹ️ VERIFICAR DOCUMENTOS - Nenhum documento salvo encontrado")
      return false
    }

    // Verificar se os documentos obrigatórios estão presentes
    const documentosObrigatorios = ["rg_frente", "rg_verso", "cpf", "comprovante_residencia"]
    const documentosPresentes = documentosObrigatorios.filter((doc) => documentosUrls[doc])

    const todosSalvos = documentosPresentes.length === documentosObrigatorios.length
    console.log(
      `✅ VERIFICAR DOCUMENTOS - Documentos obrigatórios salvos: ${documentosPresentes.length}/${documentosObrigatorios.length}`,
    )

    return todosSalvos
  } catch (error) {
    console.error("❌ VERIFICAR DOCUMENTOS - Erro ao verificar documentos salvos:", error)
    return false
  }
}

/**
 * Verifica se o PDF de uma proposta já foi gerado
 */
export async function verificarPDFGerado(propostaId: string): Promise<string | null> {
  try {
    console.log(`🔍 VERIFICAR PDF - Verificando se PDF da proposta ${propostaId} já foi gerado`)

    // Testar conexão antes de prosseguir
    const conexaoOk = await testarConexaoSupabase()
    if (!conexaoOk) {
      console.error("❌ VERIFICAR PDF - Erro de conexão")
      return null
    }

    const { data, error } = await supabase.from("propostas").select("pdf_url").eq("id", propostaId).single()

    if (error) {
      console.error("❌ VERIFICAR PDF - Erro ao verificar PDF gerado:", error)
      return null
    }

    const pdfUrl = data?.pdf_url
    if (pdfUrl && typeof pdfUrl === "string" && pdfUrl.trim() !== "") {
      console.log("✅ VERIFICAR PDF - PDF já foi gerado:", pdfUrl)
      return pdfUrl
    }

    console.log("ℹ️ VERIFICAR PDF - PDF ainda não foi gerado")
    return null
  } catch (error) {
    console.error("❌ VERIFICAR PDF - Erro ao verificar PDF gerado:", error)
    return null
  }
}
