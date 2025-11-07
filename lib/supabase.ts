import { createClient } from "@supabase/supabase-js"

// Valores padrão para desenvolvimento (substitua pelos seus valores reais em produção)
const defaultUrl = "https://jtzbuxoslaotpnwsphqv.supabase.co"
const defaultAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0emJ1eG9zbGFvdHBud3NwaHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDU5MDEsImV4cCI6MjA1ODA4MTkwMX0.jmI-h8pKW00TN5uNpo3Q16GaZzOpFAnPUVO0yyNq54U"

// Usar valores do ambiente se disponíveis, caso contrário usar os padrões
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Exportar também como default
export default supabase

// Função para testar conexão (nome original mantido para compatibilidade)
export async function testarConexaoSupabase() {
  try {
    console.log("🔍 Testando conexão com Supabase...")
    console.log("URL:", supabaseUrl)
    console.log("Key (primeiros 10 caracteres):", supabaseAnonKey.substring(0, 10) + "...")

    // Teste simples de conexão
    const { data, error } = await supabase.from("propostas").select("id").limit(1)

    if (error) {
      console.error("❌ Erro ao testar conexão Supabase:", error)
      return false
    }

    console.log("✅ Conexão Supabase funcionando! Dados recebidos:", data)
    return true
  } catch (error) {
    console.error("❌ Erro inesperado ao testar Supabase:", error)
    return false
  }
}

// Função alternativa para testar conexão
export async function testarConexao() {
  try {
    const { data, error } = await supabase.from("produtos_corretores").select("id").limit(1)

    if (error) {
      console.error("❌ Erro ao testar conexão:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Conexão Supabase OK")
    return { success: true, data }
  } catch (error) {
    console.error("❌ Erro inesperado:", error)
    return { success: false, error: error.message }
  }
}

// Função para verificar explicitamente as chaves de API
export async function verificarChavesAPI() {
  try {
    console.log("🔍 Verificando chaves de API...")

    // Verificar se as chaves estão definidas
    if (!supabaseUrl || supabaseUrl.trim() === "") {
      console.error("❌ URL do Supabase não definida")
      return {
        success: false,
        message: "URL do Supabase não definida",
        details: { url: false, key: false },
      }
    }

    if (!supabaseAnonKey || supabaseAnonKey.trim() === "") {
      console.error("❌ Chave anônima do Supabase não definida")
      return {
        success: false,
        message: "Chave anônima do Supabase não definida",
        details: { url: true, key: false },
      }
    }

    // Testar a conexão
    const { data, error } = await supabase.from("produtos_corretores").select("id").limit(1)

    if (error) {
      console.error("❌ Erro ao verificar chaves de API:", error)
      return {
        success: false,
        message: error.message,
        details: { url: true, key: false, error },
      }
    }

    console.log("✅ Chaves de API verificadas com sucesso")
    return {
      success: true,
      message: "Chaves de API válidas",
      details: { url: true, key: true },
    }
  } catch (error) {
    console.error("❌ Erro inesperado ao verificar chaves de API:", error)
    return {
      success: false,
      message: error.message,
      details: { error },
    }
  }
}

// Função para obter as variáveis de ambiente do Supabase
export function getSupabaseEnv() {
  return {
    url: supabaseUrl,
    key: supabaseAnonKey,
    isUsingDefaults: !process.env.NEXT_PUBLIC_SUPABASE_URL,
  }
}

// Exportar outras funções necessárias
export async function getFieldMapping() {
  return null
}

export async function uploadFile(file: File, bucket = "documentos_propostas", path: string) {
  try {
    console.log(`📤 UPLOAD SIMPLES - Arquivo: ${file.name}`)
    console.log(`📁 Bucket: ${bucket}`)
    console.log(`📍 Path: ${path}`)

    // Validar arquivo
    if (!file) {
      throw new Error("Arquivo não fornecido")
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB em bytes
    if (file.size > maxSize) {
      throw new Error("O arquivo excede o tamanho máximo permitido de 5MB")
    }

    // Validar tipo do arquivo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de arquivo não permitido. Use PDF, JPEG ou PNG")
    }

    // Upload direto
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("❌ Erro no upload:", error)
      throw error
    }

    if (!data?.path) {
      throw new Error("Upload falhou: nenhum path retornado")
    }

    // Obter URL pública
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path)

    if (!publicUrl?.publicUrl) {
      throw new Error("Não foi possível obter a URL pública do arquivo")
    }

    console.log(`✅ Upload concluído: ${publicUrl.publicUrl}`)
    return publicUrl.publicUrl
  } catch (error) {
    console.error("❌ Erro no upload:", error)
    throw error
  }
}

// Outras funções do arquivo...
export async function saveProposta(propostaData: any) {
  try {
    const { data: proposta, error: propostaError } = await supabase
      .from("propostas")
      .insert([propostaData])
      .select()
      .single()

    if (propostaError) {
      console.error("Erro ao salvar proposta:", propostaError)
      throw new Error("Erro ao salvar proposta: " + propostaError.message)
    }

    if (!proposta) {
      throw new Error("Proposta não foi salva corretamente")
    }

    return proposta
  } catch (error) {
    console.error("Erro ao salvar proposta:", error)
    throw error
  }
}

export async function saveDependente(dependenteData: any) {
  try {
    const { data: dependente, error: dependenteError } = await supabase
      .from("dependentes")
      .insert([dependenteData])
      .select()
      .single()

    if (dependenteError) {
      console.error("Erro ao salvar dependente:", dependenteError)
      throw new Error("Erro ao salvar dependente: " + dependenteError.message)
    }

    if (!dependente) {
      throw new Error("Dependente não foi salvo corretamente")
    }

    return dependente
  } catch (error) {
    console.error("Erro ao salvar dependente:", error)
    throw error
  }
}

export async function saveDocumento(documentoData: any) {
  try {
    const { data: documento, error: documentoError } = await supabase
      .from("documentos")
      .insert([documentoData])
      .select()
      .single()

    if (documentoError) {
      console.error("Erro ao salvar documento:", documentoError)
      throw new Error("Erro ao salvar documento: " + documentoError.message)
    }

    if (!documento) {
      throw new Error("Documento não foi salvo corretamente")
    }

    return documento
  } catch (error) {
    console.error("Erro ao salvar documento:", error)
    throw error
  }
}

export async function saveQuestionario(questionarioData: any) {
  try {
    const { data: questionario, error: questionarioError } = await supabase
      .from("questionario_saude")
      .insert([questionarioData])
      .select()
      .single()

    if (questionarioError) {
      console.error("Erro ao salvar questionário:", questionarioError)
      throw new Error("Erro ao salvar questionário: " + questionarioError.message)
    }

    if (!questionario) {
      throw new Error("Questionário não foi salvo corretamente")
    }

    return questionario
  } catch (error) {
    console.error("Erro ao salvar questionário:", error)
    throw error
  }
}

export async function getPropostas() {
  const { data: propostas, error } = await supabase
    .from("propostas")
    .select(`
     *,
     documentos (
       tipo,
       arquivo_url,
       arquivo_nome
     ),
     dependentes (
       *
     ),
     questionario_saude (
       *
     )
   `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar propostas:", error)
    throw error
  }

  return propostas
}

export async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error("Erro ao fazer download:", error)
    throw error
  }
}

export async function exportToExcel(propostas: any[]) {
  try {
    // Importar XLSX dinamicamente apenas no cliente
    if (typeof window === "undefined") {
      throw new Error("exportToExcel só pode ser usado no cliente")
    }
    
    const XLSX = await import("xlsx")
    
    // Preparar os dados para o Excel
    const data = propostas.map((proposta) => {
      const dependentes = proposta.dependentes?.map((dep: any) => `${dep.nome} (${dep.parentesco})`).join(", ") || ""

      const documentos = proposta.documentos?.map((doc: any) => doc.tipo).join(", ") || ""

      return {
        Nome: proposta.nome,
        CPF: proposta.cpf,
        Email: proposta.email,
        Telefone: proposta.telefone,
        Endereço: proposta.endereco,
        "Data de Nascimento": proposta.data_nascimento,
        Dependentes: dependentes,
        Documentos: documentos,
        "Data de Criação": new Date(proposta.created_at).toLocaleDateString(),
      }
    })

    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Propostas")

    // Gerar arquivo
    XLSX.writeFile(wb, "propostas.xlsx")
  } catch (error) {
    console.error("Erro ao exportar para Excel:", error)
    throw error
  }
}

// Teste de conexão automático quando o módulo é carregado
if (typeof window !== "undefined") {
  testarConexao().then((result) => {
    if (result.success) {
      console.log("🎉 Sistema pronto para uso!")
    } else {
      console.warn("⚠️ Problemas de conexão detectados. Verifique a configuração.")
    }
  })
}
