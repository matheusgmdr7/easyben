import { supabase } from "@/lib/supabase"
// Import condicional de supabaseAdmin apenas quando necessário (servidor)
// No cliente, usamos APIs para operações que requerem service role

// Tipos de permissões disponíveis
export type Permissao =
  | "dashboard"
  | "propostas"
  | "cadastrados"
  | "em_analise"
  | "contratos"
  | "tabelas"
  | "produtos"
  | "clientes"
  | "clientes_ativos"
  | "corretores"
  | "leads"
  | "vendas"
  | "modelos_propostas"
  | "administradoras"
  | "financeiro"
  | "usuarios"
  | "configuracoes"

export interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  senha_hash?: string
  perfil: "super_admin" | "admin" | "financeiro" | "vendas" | "atendimento" | "readonly" | "master" | "assistente"
  status: "ativo" | "inativo" | "bloqueado" | "pendente"
  permissoes: Permissao[] | any
  criado_em?: string
  atualizado_em?: string
  ultimo_acesso?: string
  criado_por?: string
  ativo: boolean
  auth_user_id?: string
}

export interface CriarUsuarioData {
  nome: string
  email: string
  senha: string
  perfil: UsuarioAdmin["perfil"]
  permissoes?: Permissao[]
  status?: UsuarioAdmin["status"]
}

export interface AtualizarUsuarioData {
  nome?: string
  email?: string
  senha?: string
  perfil?: UsuarioAdmin["perfil"]
  permissoes?: Permissao[]
  status?: UsuarioAdmin["status"]
  ativo?: boolean
}

// Perfis pré-definidos com suas permissões
export const PERFIS_PERMISSOES: Record<UsuarioAdmin["perfil"], Permissao[]> = {
  master: [
    "dashboard",
    "propostas",
    "cadastrados",
    "em_analise",
    "contratos",
    "tabelas",
    "produtos",
    "clientes",
    "clientes_ativos",
    "corretores",
    "leads",
    "vendas",
    "modelos_propostas",
    "administradoras",
    "financeiro",
    "usuarios",
    "configuracoes",
  ],
  super_admin: [
    "dashboard",
    "propostas",
    "cadastrados",
    "em_analise",
    "contratos",
    "tabelas",
    "produtos",
    "clientes",
    "clientes_ativos",
    "corretores",
    "leads",
    "vendas",
    "modelos_propostas",
    "administradoras",
    "financeiro",
    "usuarios",
    "configuracoes",
  ],
  admin: [
    "dashboard",
    "propostas",
    "cadastrados",
    "em_analise",
    "contratos",
    "tabelas",
    "produtos",
    "clientes",
    "clientes_ativos",
    "corretores",
    "leads",
    "vendas",
    "modelos_propostas",
    "administradoras",
    "financeiro",
  ],
  assistente: [
    "dashboard",
    "propostas",
    "cadastrados",
    "em_analise",
    "clientes",
    "clientes_ativos",
  ],
  financeiro: [
    "dashboard",
    "cadastrados",
    "clientes",
    "clientes_ativos",
    "administradoras",
    "financeiro",
  ],
  vendas: [
    "dashboard",
    "propostas",
    "em_analise",
    "contratos",
    "clientes",
    "leads",
    "vendas",
  ],
  atendimento: [
    "dashboard",
    "propostas",
    "cadastrados",
    "em_analise",
    "clientes",
    "clientes_ativos",
  ],
  readonly: ["dashboard"],
}

// Labels para exibição
export const PERMISSOES_LABELS: Record<Permissao, string> = {
  dashboard: "Dashboard",
  propostas: "Propostas",
  cadastrados: "Cadastrados",
  em_analise: "Em Análise",
  contratos: "Contratos",
  tabelas: "Tabelas",
  produtos: "Produtos",
  clientes: "Clientes",
  clientes_ativos: "Clientes Ativos",
  corretores: "Corretores",
  leads: "Leads",
  vendas: "Vendas",
  modelos_propostas: "Modelos de Propostas",
  administradoras: "Administradoras",
  financeiro: "Financeiro",
  usuarios: "Usuários",
  configuracoes: "Configurações",
}

export const PERFIS_LABELS: Record<UsuarioAdmin["perfil"], string> = {
  master: "Master",
  super_admin: "Super Admin",
  admin: "Administrador",
  assistente: "Assistente",
  financeiro: "Financeiro",
  vendas: "Vendas",
  atendimento: "Atendimento",
  readonly: "Somente Leitura",
}

class UsuariosAdminService {
  /**
   * Obtém as permissões padrão de um perfil
   */
  obterPermissoesPadrao(perfil: UsuarioAdmin["perfil"]): Permissao[] {
    return PERFIS_PERMISSOES[perfil] || []
  }

  /**
   * Lista todos os usuários admin
   */
  async listar(): Promise<UsuarioAdmin[]> {
    const { data, error } = await supabase
        .from("usuarios_admin")
      .select("*")
      .order("criado_em", { ascending: false })

    if (error) throw error
    return data || []
  }

/**
   * Busca um usuário por ID
   */
  async buscarPorId(id: string): Promise<UsuarioAdmin | null> {
    const { data, error } = await supabase
        .from("usuarios_admin")
        .select("*")
      .eq("id", id)
        .single()

    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data
  }

/**
   * Busca um usuário por email
   */
  async buscarPorEmail(email: string): Promise<UsuarioAdmin | null> {
    const { data, error } = await supabase
        .from("usuarios_admin")
      .select("*")
      .eq("email", email)
      .single()

      if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data
  }

/**
   * Cria um novo usuário admin
   */
  async criar(dados: CriarUsuarioData): Promise<UsuarioAdmin> {
    try {
      let authUserId: string

      // Se estiver no cliente, usar API route
      if (typeof window !== "undefined") {
        const response = await fetch("/api/admin/usuarios/auth/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: dados.email,
            password: dados.senha,
            nome: dados.nome,
            perfil: dados.perfil,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Erro ao criar usuário no Auth")
        }

        const result = await response.json()
        authUserId = result.user.id
      } else {
        // Se estiver no servidor, usar supabaseAdmin diretamente
        const { supabaseAdmin } = await import("@/lib/supabase-admin")
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: dados.email,
          password: dados.senha,
          email_confirm: true,
          user_metadata: {
            role: "admin",
            nome: dados.nome,
            perfil: dados.perfil,
          },
        })

        if (authError) {
          throw new Error(`Erro ao criar usuário no Supabase Auth: ${authError.message}`)
        }

        if (!authData.user) {
          throw new Error("Falha ao criar usuário no Supabase Auth")
        }

        authUserId = authData.user.id
      }

      // 2. Hash da senha para nossa tabela
      const senhaHash = await this.hashSenha(dados.senha)

      // 3. Definir permissões baseadas no perfil se não fornecidas
      // Garantir que sempre seja um array
      let permissoes: string[] = []
      if (dados.permissoes && Array.isArray(dados.permissoes) && dados.permissoes.length > 0) {
        permissoes = dados.permissoes
      } else {
        permissoes = PERFIS_PERMISSOES[dados.perfil] || []
      }
      
      console.log("💾 Salvando usuário com permissões:", {
        email: dados.email,
        perfil: dados.perfil,
        permissoesRecebidas: dados.permissoes,
        permissoesFinais: permissoes,
      })

      // 4. Criar usuário na nossa tabela usuarios_admin
      const { data, error } = await supabase
        .from("usuarios_admin")
        .insert({
            nome: dados.nome,
          email: dados.email,
          senha_hash: senhaHash,
          perfil: dados.perfil,
          permissoes: permissoes,
          status: dados.status || "ativo",
            ativo: true,
          auth_user_id: authUserId, // Link com Supabase Auth
        })
        .select()
        .single()

      if (error) {
        // Se falhar na nossa tabela, remover do Supabase Auth
        if (typeof window !== "undefined") {
          // Cliente: usar API
          await fetch("/api/admin/usuarios/auth/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: authUserId }),
          })
        } else {
          // Servidor: usar diretamente
          const { supabaseAdmin } = await import("@/lib/supabase-admin")
          await supabaseAdmin.auth.admin.deleteUser(authUserId)
        }
        throw new Error(`Erro ao criar usuário na tabela admin: ${error.message}`)
      }

      // 5. Remover senha_hash do retorno
      const { senha_hash, ...usuarioSemSenha } = data
      return usuarioSemSenha as UsuarioAdmin

    } catch (error) {
      console.error("Erro ao criar usuário admin:", error)
      throw error
    }
  }

/**
   * Atualiza um usuário
   */
  async atualizar(id: string, dados: AtualizarUsuarioData): Promise<UsuarioAdmin> {
    try {
      // 1. Buscar usuário atual para obter auth_user_id
      const { data: usuarioAtual, error: buscaError } = await supabase
        .from("usuarios_admin")
        .select("auth_user_id, email")
        .eq("id", id)
        .single()

      if (buscaError || !usuarioAtual) {
        throw new Error("Usuário não encontrado")
      }

      // 2. Se tem auth_user_id, atualizar no Supabase Auth também
      if (usuarioAtual.auth_user_id) {
        const authUpdateData: any = {
          user_metadata: {
            nome: dados.nome,
            perfil: dados.perfil,
          },
        }

        // Se mudou email, atualizar no Supabase Auth
        if (dados.email && dados.email !== usuarioAtual.email) {
          authUpdateData.email = dados.email
        }

        // Se forneceu nova senha, atualizar no Supabase Auth
        if (dados.senha) {
          authUpdateData.password = dados.senha
        }

        // Se estiver no cliente, usar API route
        if (typeof window !== "undefined") {
          const response = await fetch("/api/admin/usuarios/auth/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: usuarioAtual.auth_user_id,
              email: authUpdateData.email,
              password: authUpdateData.password,
              nome: dados.nome,
              perfil: dados.perfil,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Erro ao atualizar usuário no Auth")
          }
        } else {
          // Se estiver no servidor, usar supabaseAdmin diretamente
          const { supabaseAdmin } = await import("@/lib/supabase-admin")
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            usuarioAtual.auth_user_id,
            authUpdateData
          )

          if (authError) {
            throw new Error(`Erro ao atualizar usuário no Supabase Auth: ${authError.message}`)
          }
        }
      }

      // 3. Atualizar na nossa tabela
      const updateData: any = {
        nome: dados.nome,
        email: dados.email,
        atualizado_em: new Date().toISOString(),
      }

      // Se forneceu novo perfil, atualizar
      if (dados.perfil) {
        updateData.perfil = dados.perfil
      }

      // Se forneceu novo status, atualizar
      if (dados.status !== undefined) {
        updateData.status = dados.status
      }

      // Se forneceu novo ativo, atualizar
      if (dados.ativo !== undefined) {
        updateData.ativo = dados.ativo
      }

      // Se forneceu nova senha, fazer hash
      if (dados.senha) {
        updateData.senha_hash = await this.hashSenha(dados.senha)
      }

      // Tratar permissões
      // IMPORTANTE: Se permissões foram explicitamente fornecidas (mesmo que array vazio), usar elas
      // Só usar permissões do perfil se permissões NÃO foram fornecidas
      if (dados.permissoes !== undefined) {
        // Sempre salvar as permissões fornecidas (mesmo que seja array vazio)
        if (Array.isArray(dados.permissoes)) {
          updateData.permissoes = dados.permissoes
          console.log("💾 Atualizando com permissões fornecidas:", dados.permissoes)
        }
      } else if (dados.perfil) {
        // Se mudou apenas o perfil SEM especificar permissões, usar permissões padrão do perfil
        updateData.permissoes = PERFIS_PERMISSOES[dados.perfil] || []
        console.log("💾 Atualizando com permissões padrão do perfil:", updateData.permissoes)
      }

      console.log("💾 Dados para atualizar:", {
        id,
        updateData: {
          ...updateData,
          senha_hash: updateData.senha_hash ? "[HASH]" : undefined,
        },
      })

      const { data, error } = await supabase
        .from("usuarios_admin")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // 4. Remover senha_hash do retorno
      const { senha_hash, ...usuarioSemSenha } = data
      return usuarioSemSenha as UsuarioAdmin

    } catch (error) {
      console.error("Erro ao atualizar usuário admin:", error)
      throw error
    }
  }

/**
   * Atualiza permissões de um usuário
   */
  async atualizarPermissoes(id: string, permissoes: Permissao[]): Promise<UsuarioAdmin> {
    const { data, error } = await supabase
        .from("usuarios_admin")
        .update({
        permissoes: permissoes,
        atualizado_em: new Date().toISOString(),
        })
        .eq("id", id)
      .select()
        .single()

    if (error) throw error
    return data
  }

/**
   * Ativa/desativa um usuário
   */
  async toggleAtivo(id: string, ativo: boolean): Promise<UsuarioAdmin> {
    try {
      // 1. Buscar usuário para obter auth_user_id
      const { data: usuarioAtual, error: buscaError } = await supabase
        .from("usuarios_admin")
        .select("auth_user_id")
        .eq("id", id)
        .single()

      if (buscaError) {
        throw new Error("Usuário não encontrado")
      }

      // 2. Atualizar na nossa tabela
      const { data, error } = await supabase
        .from("usuarios_admin")
        .update({
          ativo: ativo,
          status: ativo ? "ativo" : "inativo",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // 3. Sincronizar com Supabase Auth se tem auth_user_id
      if (usuarioAtual?.auth_user_id) {
        const statusAuth = ativo ? "ativo" : "bloqueado"
        
        // Se estiver no cliente, usar API route
        if (typeof window !== "undefined") {
          const response = await fetch("/api/admin/usuarios/auth/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: usuarioAtual.auth_user_id,
              status: statusAuth,
            }),
          })

          if (!response.ok) {
            console.warn("Aviso: Erro ao sincronizar com Supabase Auth, mas usuário foi atualizado na tabela")
          }
        } else {
          // Se estiver no servidor, usar supabaseAdmin diretamente
          const { supabaseAdmin } = await import("@/lib/supabase-admin")
          if (ativo) {
            await supabaseAdmin.auth.admin.updateUserById(usuarioAtual.auth_user_id, {
              ban_duration: "none",
            })
          } else {
            await supabaseAdmin.auth.admin.updateUserById(usuarioAtual.auth_user_id, {
              ban_duration: "876000h", // ~100 anos
            })
          }
        }
      }

      return data

    } catch (error) {
      console.error("Erro ao ativar/desativar usuário admin:", error)
      throw error
    }
  }

/**
   * Desativa um usuário (soft delete)
   */
  async desativar(id: string): Promise<void> {
    try {
      // 1. Buscar usuário para obter auth_user_id
      const { data: usuario, error: buscaError } = await supabase
        .from("usuarios_admin")
        .select("auth_user_id")
        .eq("id", id)
        .single()

      if (buscaError) {
        throw new Error("Usuário não encontrado")
      }

      // 2. Desativar na nossa tabela
      const { error } = await supabase
        .from("usuarios_admin")
        .update({
          ativo: false,
          status: "inativo",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      // 3. Se tem auth_user_id, também desativar no Supabase Auth
      if (usuario?.auth_user_id) {
        if (typeof window !== "undefined") {
          // Cliente: usar API
          await fetch("/api/admin/usuarios/auth/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: usuario.auth_user_id,
              status: "bloqueado",
            }),
          })
        } else {
          // Servidor: usar diretamente
          const { supabaseAdmin } = await import("@/lib/supabase-admin")
          await supabaseAdmin.auth.admin.updateUserById(usuario.auth_user_id, {
            ban_duration: "876000h", // ~100 anos (efetivamente permanente)
          })
        }
      }

    } catch (error) {
      console.error("Erro ao desativar usuário admin:", error)
      throw error
    }
  }

/**
   * Exclui permanentemente um usuário (hard delete)
   */
  async excluir(id: string): Promise<void> {
    try {
      // 1. Buscar usuário para obter auth_user_id
      const { data: usuario, error: buscaError } = await supabase
        .from("usuarios_admin")
        .select("auth_user_id, nome, email")
        .eq("id", id)
        .single()

      if (buscaError) {
        throw new Error("Usuário não encontrado")
      }

      // 2. Excluir da nossa tabela
      const { error: deleteError } = await supabase
        .from("usuarios_admin")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw new Error(`Erro ao excluir usuário da tabela: ${deleteError.message}`)
      }

      // 3. Se tem auth_user_id, também excluir do Supabase Auth
      if (usuario?.auth_user_id) {
        try {
          if (typeof window !== "undefined") {
            // Cliente: usar API
            const response = await fetch("/api/admin/usuarios/auth/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: usuario.auth_user_id }),
            })
            if (!response.ok) {
              throw new Error("Erro ao excluir do Auth")
            }
          } else {
            // Servidor: usar diretamente
            const { supabaseAdmin } = await import("@/lib/supabase-admin")
            await supabaseAdmin.auth.admin.deleteUser(usuario.auth_user_id)
          }
        } catch (authError: any) {
          console.warn(`Aviso: Erro ao excluir do Supabase Auth: ${authError?.message}`)
          // Não falha a operação se não conseguir excluir do Supabase Auth
        }
      }

      console.log(`Usuário ${usuario.nome} (${usuario.email}) excluído permanentemente`)

    } catch (error) {
      console.error("Erro ao excluir usuário admin:", error)
      throw error
    }
  }

/**
   * Deleta um usuário (alias para desativar - mantém compatibilidade)
   */
  async deletar(id: string): Promise<void> {
    return this.desativar(id)
  }

/**
   * Verifica se um usuário tem uma permissão específica
   */
  async temPermissao(userId: string, permissao: Permissao): Promise<boolean> {
    const usuario = await this.buscarPorId(userId)
    if (!usuario) return false

    // Super admin tem todas as permissões
    if (usuario.perfil === "super_admin") return true

    // Verificar se tem a permissão específica
    return usuario.permissoes?.includes(permissao) || false
  }

/**
   * Lista permissões de um usuário
   */
  async listarPermissoes(userId: string): Promise<Permissao[]> {
    const usuario = await this.buscarPorId(userId)
    if (!usuario) return []

    return usuario.permissoes || []
  }

/**
   * Registra último acesso do usuário
   */
  async registrarAcesso(userId: string): Promise<void> {
    await supabase
        .from("usuarios_admin")
      .update({
        ultimo_acesso: new Date().toISOString(),
      })
      .eq("id", userId)
  }

/**
   * Hash de senha (simplificado - usar bcrypt em produção)
   */
  private async hashSenha(senha: string): Promise<string> {
    // Em produção, usar bcrypt ou similar
    // Por enquanto, apenas um hash simples
    const encoder = new TextEncoder()
    const data = encoder.encode(senha)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

/**
   * Valida email e senha de um usuário admin
   */
  async validarSenha(email: string, senha: string): Promise<UsuarioAdmin | null> {
    try {
      // Buscar usuário por email
      const { data: usuario, error } = await supabase
        .from("usuarios_admin")
        .select("*")
        .eq("email", email)
        .eq("ativo", true)
        .single()

      if (error || !usuario) {
        return null
      }

      // Hash da senha fornecida
      const senhaHash = await this.hashSenha(senha)

      // Comparar com o hash armazenado
      if (usuario.senha_hash === senhaHash) {
        // Atualizar último acesso
        await this.atualizarUltimoAcesso(usuario.id)
        
        // Remover senha_hash do retorno
        const { senha_hash, ...usuarioSemSenha } = usuario
        return usuarioSemSenha as UsuarioAdmin
      }

      return null
    } catch (error) {
      console.error("Erro ao validar senha:", error)
      return null
    }
  }

/**
   * Atualiza o último acesso do usuário
   */
  private async atualizarUltimoAcesso(userId: string): Promise<void> {
    try {
      await supabase
        .from("usuarios_admin")
        .update({
          ultimo_acesso: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .eq("id", userId)
    } catch (error) {
      console.error("Erro ao atualizar último acesso:", error)
    }
  }

/**
   * Estatísticas de usuários
   */
  async estatisticas(): Promise<{
    total: number
    ativos: number
    inativos: number
    por_perfil: Record<string, number>
  }> {
    const usuarios = await this.listar()

    const stats = {
      total: usuarios.length,
      ativos: usuarios.filter((u) => u.ativo).length,
      inativos: usuarios.filter((u) => !u.ativo).length,
      por_perfil: {} as Record<string, number>,
    }

    // Contar por perfil
    usuarios.forEach((u) => {
      stats.por_perfil[u.perfil] = (stats.por_perfil[u.perfil] || 0) + 1
    })

    return stats
  }
}

export default new UsuariosAdminService()

/**
 * Vincular usuário existente do Supabase Auth
 */
export async function vincularUsuarioExistente(
    email: string,
    dados: {
      nome: string
      perfil?: string
      permissoes?: any
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔗 Vincular usuário existente: ${email}`)

      // Verificar se já existe na tabela
      const { data: usuarioExistente, error: checkError } = await supabase
        .from("usuarios_admin")
        .select("id")
        .eq("email", email.toLowerCase())
        .single()

      if (usuarioExistente) {
        return {
          success: false,
          message: "Usuário já existe na tabela de permissões",
        }
      }

      // Criar registro na tabela usuarios_admin (sem auth_user_id por enquanto)
      const { error: dbError } = await supabase
        .from("usuarios_admin")
        .insert({
          id: crypto.randomUUID(), // Gerar ID único
          nome: dados.nome,
          email: email.toLowerCase(),
          perfil: dados.perfil || "assistente",
          permissoes: dados.permissoes || {},
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (dbError) {
        return {
          success: false,
          message: "Erro ao vincular usuário: " + dbError.message,
        }
      }

      return {
        success: true,
        message: "Usuário vinculado com sucesso. Para vincular com Auth, use o Dashboard do Supabase.",
      }
    } catch (error: any) {
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

/**
 * Buscar usuário por ID
 */
export async function buscarUsuarioPorId(id: string): Promise<{ success: boolean; usuario?: UsuarioAdmin; message?: string }> {
    try {
      console.log("🔍 Buscando usuário por ID:", id)

      const { data: usuario, error } = await supabase
        .from("usuarios_admin")
        .select("id, nome, email, ativo, ultimo_login, created_at, updated_at, perfil, permissoes, auth_user_id")
        .eq("id", id)
        .single()

      if (error || !usuario) {
        console.log("❌ Usuário não encontrado")
        return {
          success: false,
          message: "Usuário não encontrado",
        }
      }

      console.log("✅ Usuário encontrado:", usuario.email)
      return {
        success: true,
        usuario: {
          ...usuario,
          perfil: usuario.perfil || "assistente",
          permissoes: usuario.permissoes || {},
        },
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao buscar usuário:", error)
      return {
        success: false,
        message: "Erro inesperado: " + error.message,
      }
    }
  }

/**
   * Verificar se existe pelo menos um usuário admin
   */
export async function verificarUsuariosExistentes(): Promise<{ success: boolean; existem: boolean; total: number }> {
    try {
      console.log("🔍 Verificando usuários existentes...")

      const { data: usuarios, error } = await supabase.from("usuarios_admin").select("id", { count: "exact" })

      if (error) {
        console.error("❌ Erro ao verificar usuários:", error)
        return {
          success: false,
          existem: false,
          total: 0,
        }
      }

      const total = usuarios?.length || 0
      console.log(`✅ ${total} usuários encontrados`)

      return {
        success: true,
        existem: total > 0,
        total,
      }
    } catch (error: any) {
      console.error("❌ Erro inesperado ao verificar usuários:", error)
      return {
        success: false,
        existem: false,
        total: 0,
      }
    }
  }

/**
   * Criar usuário admin padrão (para setup inicial)
   */
export async function criarUsuarioPadrao(): Promise<{ success: boolean; message: string; usuario?: UsuarioAdmin }> {
    try {
      console.log("🔧 Criando usuário admin padrão...")

      const dadosPadrao: CriarUsuarioData = {
        nome: "Administrador",
        email: "admin@contratandoplanos.com",
        senha: "admin123456",
      }

      const resultado = await this.criarUsuario(dadosPadrao)

      if (resultado.success) {
        console.log("✅ Usuário admin padrão criado com sucesso")
        console.log("📧 Email:", dadosPadrao.email)
        console.log("🔐 Senha:", dadosPadrao.senha)
        console.log("⚠️ IMPORTANTE: Altere a senha após o primeiro login!")
      }

      return resultado
    } catch (error: any) {
      console.error("❌ Erro ao criar usuário padrão:", error)
      return {
        success: false,
        message: "Erro ao criar usuário padrão: " + error.message,
      }
    }
  }

/**
   * Validar token de sessão (simulado - em produção usar JWT)
   */
export async function validarSessao(token: string): Promise<{ success: boolean; usuario?: UsuarioAdmin }> {
    try {
      // Em produção, implementar validação JWT real
      // Por enquanto, usar uma validação simples baseada no email
      const email = Buffer.from(token, "base64").toString("utf-8")

      const { data: usuario, error } = await supabase
        .from("usuarios_admin")
        .select("id, nome, email, ativo, ultimo_login, created_at, updated_at, perfil, permissoes, auth_user_id")
        .eq("email", email)
        .eq("ativo", true)
        .single()

      if (error || !usuario) {
        return { success: false }
      }

      return {
        success: true,
        usuario: {
          ...usuario,
          perfil: usuario.perfil || "assistente",
          permissoes: usuario.permissoes || {},
        },
      }
    } catch (error: any) {
      console.error("❌ Erro ao validar sessão:", error)
      return { success: false }
    }
  }

/**
   * Gerar token de sessão (simulado - em produção usar JWT)
   */
export function gerarToken(email: string): string {
    // Em produção, usar JWT com expiração e assinatura
    return Buffer.from(email).toString("base64")
  }

/**
   * Atualizar dados do usuário admin (nome, perfil, permissoes)
   */
export async function atualizarUsuario(id: string, dados: Partial<UsuarioAdmin>): Promise<{ error?: any }> {
    try {
      const { error } = await supabase
        .from("usuarios_admin")
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
      return { error }
    } catch (error: any) {
      return { error }
    }
}

// Exportar instância padrão
export const usuariosAdminService = UsuariosAdminService

export async function buscarUsuariosAdmin() {
  const res = await UsuariosAdminService.listarUsuarios()
  if (!res.success) throw new Error(res.message || "Erro ao buscar usuários")
  return res.usuarios
}

export async function inicializarSistemaUsuarios() {
  // Verifica se existe usuário master, e cria se não existir
  const res = await UsuariosAdminService.verificarUsuariosExistentes()
  if (!res.success) throw new Error("Erro ao verificar usuários")
  if (!res.existem) {
    const criado = await UsuariosAdminService.criarUsuarioPadrao()
    if (!criado.success) throw new Error(criado.message || "Erro ao criar usuário padrão")
  }
  return true
}

export async function criarUsuarioAdmin(dados: CriarUsuarioData) {
  return UsuariosAdminService.criarUsuario(dados)
}

export async function atualizarUsuarioAdmin(id: string, dados: Partial<UsuarioAdmin>) {
  // Atualiza apenas os campos enviados
  const { error } = await supabase
    .from("usuarios_admin")
    .update({
      nome: dados.nome,
      email: dados.email?.toLowerCase(),
      perfil: dados.perfil,
      permissoes: dados.permissoes,
      ativo: dados.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(error.message)
  return true
}

export async function excluirUsuarioAdmin(id: string): Promise<{ success: boolean; message: string }> {
  try {
    // Buscar usuário na tabela
    const { data: usuario, error: userError } = await supabase
      .from("usuarios_admin")
      .select("id")
      .eq("id", id)
      .single()

    if (userError || !usuario) {
      return {
        success: false,
        message: "Usuário não encontrado",
      }
    }

    // Excluir da tabela usuarios_admin
    const { error: dbError } = await supabase
      .from("usuarios_admin")
      .delete()
      .eq("id", id)

    if (dbError) {
      return {
        success: false,
        message: "Erro ao excluir usuário da tabela: " + dbError.message,
      }
    }

    // Não podemos excluir do Auth sem permissões admin, mas podemos marcar como inativo
    console.log("⚠️ Usuário removido da tabela. Para remover do Auth, use o Dashboard do Supabase.")
    
    console.log("✅ Usuário excluído com sucesso")
    return {
      success: true,
      message: "Usuário excluído da tabela de permissões. Para remover do Auth, use o Dashboard do Supabase.",
    }
  } catch (error: any) {
    console.error("❌ Erro inesperado ao excluir usuário:", error)
    return {
      success: false,
      message: "Erro inesperado: " + error.message,
    }
  }
}

export async function alterarStatusUsuarioAdmin(id: string, ativo: boolean) {
  return UsuariosAdminService.alterarStatusUsuario(id, ativo)
}

export async function buscarPermissoesPerfil() {
  throw new Error("Função de buscar permissões não implementada")
}

export async function validarSenhaUsuarioAdmin(email: string, senha: string): Promise<UsuarioAdmin | null> {
  try {
    console.log("🔐 Validando senha do usuário admin:", email)

    // Buscar usuário pelo email
    const { data: usuario, error } = await supabase
      .from("usuarios_admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("ativo", true)
      .single()

    if (error || !usuario) {
      console.log("❌ Usuário não encontrado ou inativo")
      return null
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)

    if (!senhaValida) {
      console.log("❌ Senha incorreta")
      return null
    }

    // Atualizar último login
    await supabase
      .from("usuarios_admin")
      .update({
        ultimo_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", usuario.id)

    console.log("✅ Login realizado com sucesso:", usuario.email)
    
    // Garantir que permissões seja sempre um array
    let permissoesArray: string[] = []
    if (Array.isArray(usuario.permissoes)) {
      permissoesArray = usuario.permissoes
    } else if (usuario.permissoes && typeof usuario.permissoes === "object") {
      // Se for objeto, converter para array das chaves
      permissoesArray = Object.keys(usuario.permissoes)
    }
    
    console.log("🔐 Permissões do usuário:", {
      email: usuario.email,
      perfil: usuario.perfil,
      permissoesOriginais: usuario.permissoes,
      permissoesArray,
    })
    
    return {
      ...usuario,
      senha_hash: undefined, // Não retornar o hash da senha
      perfil: usuario.perfil || "assistente",
      permissoes: permissoesArray,
    }
  } catch (error: any) {
    console.error("❌ Erro inesperado na validação:", error)
    return null
  }
}
