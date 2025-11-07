import { supabase } from "@/lib/supabase"
import type { ModeloProposta, ModeloPropostaFormData } from "@/types/modelos-propostas"

// Função para listar todos os modelos de propostas
export async function listarModelosPropostas(): Promise<ModeloProposta[]> {
  try {
    const { data, error } = await supabase
      .from("modelos_propostas")
      .select(`
       *,
       produtos:produto_id (nome)
     `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao listar modelos de propostas:", error)
      throw error
    }

    // Formatar os dados para incluir o nome do produto
    return data.map((item: any) => ({
      ...item,
      produto_nome: item.produtos?.nome || "Sem produto associado",
    }))
  } catch (error) {
    console.error("Erro ao listar modelos de propostas:", error)
    throw error
  }
}

// Função para listar modelos de propostas ativos
export async function listarModelosPropostasAtivos(): Promise<ModeloProposta[]> {
  try {
    const { data, error } = await supabase
      .from("modelos_propostas")
      .select(`
       *,
       produtos:produto_id (nome)
     `)
      .eq("ativo", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao listar modelos de propostas ativos:", error)
      throw error
    }

    // Formatar os dados para incluir o nome do produto
    return data.map((item: any) => ({
      ...item,
      produto_nome: item.produtos?.nome || "Sem produto associado",
    }))
  } catch (error) {
    console.error("Erro ao listar modelos de propostas ativos:", error)
    throw error
  }
}

export const buscarModelosPropostasAtivos = listarModelosPropostasAtivos

// Função para obter um modelo de proposta por ID
export async function obterModeloProposta(id: string): Promise<ModeloProposta | null> {
  try {
    const { data, error } = await supabase
      .from("modelos_propostas")
      .select(`
       *,
       produtos:produto_id (nome)
     `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Erro ao obter modelo de proposta:", error)
      throw error
    }

    if (!data) return null

    return {
      ...data,
      produto_nome: data.produtos?.nome || "Sem produto associado",
    }
  } catch (error) {
    console.error("Erro ao obter modelo de proposta:", error)
    throw error
  }
}

// Função para criar um novo modelo de proposta
export async function criarModeloProposta(formData: ModeloPropostaFormData): Promise<ModeloProposta> {
  try {
    // Upload do arquivo para o Storage
    let arquivo_url = ""
    let arquivo_nome = ""

    if (formData.arquivo) {
      const fileExt = formData.arquivo.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `modelos-propostas/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arquivos")
        .upload(filePath, formData.arquivo)

      if (uploadError) {
        console.error("Erro ao fazer upload do arquivo:", uploadError)
        throw uploadError
      }

      // Obter URL pública do arquivo
      const { data: urlData } = await supabase.storage.from("arquivos").getPublicUrl(filePath)

      arquivo_url = urlData.publicUrl
      arquivo_nome = formData.arquivo.name
    }

    // Inserir registro no banco de dados
    const { data, error } = await supabase
      .from("modelos_propostas")
      .insert({
        titulo: formData.titulo,
        produto_id: formData.produto_id || null,
        descricao: formData.descricao || null,
        arquivo_url,
        arquivo_nome,
        ativo: formData.ativo !== undefined ? formData.ativo : true,
      })
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar modelo de proposta:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Erro ao criar modelo de proposta:", error)
    throw error
  }
}

// Função para atualizar um modelo de proposta
export async function atualizarModeloProposta(id: string, formData: ModeloPropostaFormData): Promise<ModeloProposta> {
  try {
    // Obter modelo atual para verificar se precisa atualizar o arquivo
    const modeloAtual = await obterModeloProposta(id)
    if (!modeloAtual) {
      throw new Error("Modelo de proposta não encontrado")
    }

    let arquivo_url = modeloAtual.arquivo_url
    let arquivo_nome = modeloAtual.arquivo_nome

    // Se um novo arquivo foi enviado, fazer upload
    if (formData.arquivo) {
      // Excluir arquivo antigo se existir
      if (modeloAtual.arquivo_url) {
        const oldFilePath = modeloAtual.arquivo_url.split("/").pop()
        if (oldFilePath) {
          await supabase.storage.from("arquivos").remove([`modelos-propostas/${oldFilePath}`])
        }
      }

      // Upload do novo arquivo
      const fileExt = formData.arquivo.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `modelos-propostas/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arquivos")
        .upload(filePath, formData.arquivo)

      if (uploadError) {
        console.error("Erro ao fazer upload do arquivo:", uploadError)
        throw uploadError
      }

      // Obter URL pública do arquivo
      const { data: urlData } = await supabase.storage.from("arquivos").getPublicUrl(filePath)

      arquivo_url = urlData.publicUrl
      arquivo_nome = formData.arquivo.name
    }

    // Atualizar registro no banco de dados
    const { data, error } = await supabase
      .from("modelos_propostas")
      .update({
        titulo: formData.titulo,
        produto_id: formData.produto_id || null,
        descricao: formData.descricao || null,
        arquivo_url,
        arquivo_nome,
        ativo: formData.ativo !== undefined ? formData.ativo : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar modelo de proposta:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Erro ao atualizar modelo de proposta:", error)
    throw error
  }
}

// Função para excluir um modelo de proposta
export async function excluirModeloProposta(id: string): Promise<void> {
  try {
    // Obter modelo para excluir o arquivo
    const modelo = await obterModeloProposta(id)
    if (!modelo) {
      throw new Error("Modelo de proposta não encontrado")
    }

    // Excluir arquivo do Storage se existir
    if (modelo.arquivo_url) {
      const filePath = modelo.arquivo_url.split("/").pop()
      if (filePath) {
        await supabase.storage.from("arquivos").remove([`modelos-propostas/${filePath}`])
      }
    }

    // Excluir registro do banco de dados
    const { error } = await supabase.from("modelos_propostas").delete().eq("id", id)

    if (error) {
      console.error("Erro ao excluir modelo de proposta:", error)
      throw error
    }
  } catch (error) {
    console.error("Erro ao excluir modelo de proposta:", error)
    throw error
  }
}

// Função para alternar o status ativo/inativo de um modelo
export async function alternarStatusModeloProposta(id: string, ativo: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from("modelos_propostas")
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("Erro ao alternar status do modelo de proposta:", error)
      throw error
    }
  } catch (error) {
    console.error("Erro ao alternar status do modelo de proposta:", error)
    throw error
  }
}
