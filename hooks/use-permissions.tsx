"use client"

import { useState, useEffect } from "react"
import type { UsuarioAdmin } from "@/services/usuarios-admin-service"
import { supabase } from "@/lib/supabase-auth"

interface Permissions {
  podeVisualizar: (recurso: string) => boolean
  isMaster: boolean
}

export function usePermissions(): Permissions {
  const [isMaster, setIsMaster] = useState(false)
  const [permissoes, setPermissoes] = useState<string[]>([])
  const [usuario, setUsuario] = useState<UsuarioAdmin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarPermissoes = async () => {
      console.log("🔄 usePermissions: Iniciando carregamento de permissões...")
      setLoading(true)
      
      // Buscar usuário logado do localStorage
      const usuarioSalvo = localStorage.getItem("admin_usuario")
      console.log("📦 localStorage 'admin_usuario':", usuarioSalvo ? "EXISTE" : "NÃO EXISTE")
      
      if (usuarioSalvo) {
        try {
          const usuarioData: UsuarioAdmin = JSON.parse(usuarioSalvo)
          console.log("📋 Usuário parseado do localStorage:", {
            id: usuarioData.id,
            nome: usuarioData.nome,
            email: usuarioData.email,
            perfil: usuarioData.perfil,
            permissoes: usuarioData.permissoes,
            tipoPermissoes: typeof usuarioData.permissoes,
            isArray: Array.isArray(usuarioData.permissoes),
          })
          
          setUsuario(usuarioData)
          
          // Verificar se é master (comparação case-insensitive)
          const perfilLower = String(usuarioData.perfil || "").toLowerCase().trim()
          const master = perfilLower === "master"
          
          console.log("🔍 Verificação de master:", {
            perfilOriginal: usuarioData.perfil,
            perfilLower,
            master,
          })
          
          setIsMaster(master)
          
          // Extrair permissões do usuário
          let permissoesUsuario: string[] = []
          
          if (Array.isArray(usuarioData.permissoes)) {
            // Se for array de strings (formato correto)
            permissoesUsuario = usuarioData.permissoes
            console.log("✅ Permissões encontradas como array:", permissoesUsuario)
          } else if (usuarioData.permissoes && typeof usuarioData.permissoes === "object") {
            // Se for objeto, extrair as chaves (módulos)
            permissoesUsuario = Object.keys(usuarioData.permissoes)
            console.log("⚠️ Permissões encontradas como objeto, convertendo para array:", permissoesUsuario)
          } else {
            console.log("⚠️ Permissões não encontradas ou em formato inválido:", usuarioData.permissoes)
          }
          
          console.log("🔐 Permissões carregadas:", {
            perfil: usuarioData.perfil,
            perfilLower,
            isMaster: master,
            permissoes: permissoesUsuario,
            totalPermissoes: permissoesUsuario.length,
          })
          
          // Log adicional para debug do master
          if (master) {
            console.log("✅ USUÁRIO MASTER DETECTADO - Deve ter acesso a tudo!")
          } else {
            console.log("⚠️ Usuário NÃO é master. Perfil:", usuarioData.perfil)
          }
          
          setPermissoes(permissoesUsuario)
          setLoading(false)
        } catch (error) {
          console.error("❌ Erro ao carregar permissões:", error)
          setIsMaster(false)
          setPermissoes([])
          setLoading(false)
        }
      } else {
        // Se não há dados no localStorage, buscar do banco via sessão do Supabase
        console.log("⚠️ Nenhum usuário encontrado no localStorage, buscando do banco...")
        
        try {
          // Obter sessão do Supabase Auth
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !session?.user?.email) {
            console.log("⚠️ Sem sessão válida do Supabase")
            setIsMaster(false)
            setPermissoes([])
            setLoading(false)
            return
          }
          
          const email = session.user.email
          console.log("🔍 Buscando dados do usuário por email:", email)
          
          // Buscar dados do usuário via API
          const response = await fetch("/api/admin/auth/user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          })
          
          if (!response.ok) {
            console.error("❌ Erro ao buscar usuário:", response.statusText)
            setIsMaster(false)
            setPermissoes([])
            setLoading(false)
            return
          }
          
          const { usuario: usuarioData } = await response.json()
          
          if (!usuarioData) {
            console.log("⚠️ Usuário não encontrado no banco")
            setIsMaster(false)
            setPermissoes([])
            setLoading(false)
            return
          }
          
          console.log("✅ Usuário encontrado do banco:", {
            id: usuarioData.id,
            nome: usuarioData.nome,
            email: usuarioData.email,
            perfil: usuarioData.perfil,
            permissoes: usuarioData.permissoes,
          })
          
          // Salvar no localStorage para próximas vezes
          localStorage.setItem("admin_usuario", JSON.stringify(usuarioData))
          console.log("💾 Usuário salvo no localStorage")
          
          setUsuario(usuarioData)
          
          // Verificar se é master
          const perfilLower = String(usuarioData.perfil || "").toLowerCase().trim()
          const master = perfilLower === "master"
          
          setIsMaster(master)
          
          // Extrair permissões
          let permissoesUsuario: string[] = []
          if (Array.isArray(usuarioData.permissoes)) {
            permissoesUsuario = usuarioData.permissoes
          } else if (usuarioData.permissoes && typeof usuarioData.permissoes === "object") {
            permissoesUsuario = Object.keys(usuarioData.permissoes)
          }
          
          console.log("🔐 Permissões carregadas do banco:", {
            perfil: usuarioData.perfil,
            perfilLower,
            isMaster: master,
            permissoes: permissoesUsuario,
          })
          
          if (master) {
            console.log("✅ USUÁRIO MASTER DETECTADO - Deve ter acesso a tudo!")
          }
          
          setPermissoes(permissoesUsuario)
          setLoading(false)
        } catch (error) {
          console.error("❌ Erro ao buscar usuário do banco:", error)
          setIsMaster(false)
          setPermissoes([])
          setLoading(false)
        }
      }
    }
    
    // Listener para mudanças no localStorage
    const handleStorageChange = () => {
      const usuarioSalvo = localStorage.getItem("admin_usuario")
      if (usuarioSalvo) {
        try {
          const usuarioData: UsuarioAdmin = JSON.parse(usuarioSalvo)
          setUsuario(usuarioData)
          const perfilLower = String(usuarioData.perfil || "").toLowerCase().trim()
          setIsMaster(perfilLower === "master")
          
          let permissoesUsuario: string[] = []
          if (Array.isArray(usuarioData.permissoes)) {
            permissoesUsuario = usuarioData.permissoes
          } else if (usuarioData.permissoes && typeof usuarioData.permissoes === "object") {
            permissoesUsuario = Object.keys(usuarioData.permissoes)
          }
          setPermissoes(permissoesUsuario)
        } catch (error) {
          console.error("Erro ao atualizar permissões:", error)
        }
      }
    }
    
    // Carregar permissões e configurar listener
    carregarPermissoes()
    window.addEventListener("storage", handleStorageChange)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const podeVisualizar = (recurso: string): boolean => {
    // Verificar master no estado OU no localStorage (fallback síncrono)
    let isMasterCheck = isMaster
    
    // Se ainda não foi carregado do estado, verificar diretamente no localStorage
    if (!isMasterCheck && typeof window !== "undefined") {
      try {
        const usuarioSalvo = localStorage.getItem("admin_usuario")
        if (usuarioSalvo) {
          const usuarioData: UsuarioAdmin = JSON.parse(usuarioSalvo)
          // Verificação case-insensitive
          const perfilLower = String(usuarioData.perfil || "").toLowerCase().trim()
          isMasterCheck = perfilLower === "master"
          if (isMasterCheck) {
            console.log(`🔍 Master detectado via localStorage fallback para: ${recurso}`, {
              perfilOriginal: usuarioData.perfil,
              perfilLower,
            })
          }
        }
      } catch (error) {
        // Ignorar erros de parsing
      }
    }
    
    // Master sempre tem acesso a tudo
    if (isMasterCheck) {
      console.log(`✅ Master detectado - Permitindo acesso a: ${recurso}`)
      return true
    }
    
    // Dashboard sempre deve ser visível (mesmo sem permissões)
    if (recurso.toLowerCase() === "dashboard") {
      return true
    }
    
    // Se não há usuário carregado ainda, aguardar (mas não bloquear master)
    if (!usuario && !isMasterCheck) {
      // Tentar verificar no localStorage uma última vez
      if (typeof window !== "undefined") {
        try {
          const usuarioSalvo = localStorage.getItem("admin_usuario")
          if (usuarioSalvo) {
            const usuarioData: UsuarioAdmin = JSON.parse(usuarioSalvo)
            if (usuarioData.perfil === "master") {
              return true
            }
          }
        } catch (error) {
          // Ignorar erros
        }
      }
      return false
    }
    
    // Normalizar o nome do recurso (converter hífens em underscores e vice-versa)
    const normalizarNome = (nome: string): string => {
      return nome.toLowerCase().trim().replace(/-/g, "_")
    }
    
    const recursoNormalizado = normalizarNome(recurso)
    
    // Verificar se está no array de permissões
    // Tenta correspondência exata primeiro
    let temPermissao = permissoes.some(perm => 
      normalizarNome(perm) === recursoNormalizado
    )
    
    // Se não encontrou, tenta correspondência parcial (para casos como "cadastrado" vs "cadastrados")
    if (!temPermissao) {
      temPermissao = permissoes.some(perm => {
        const permNormalizado = normalizarNome(perm)
        return permNormalizado.includes(recursoNormalizado) || 
               recursoNormalizado.includes(permNormalizado)
      })
    }
    
    return temPermissao
  }

  return {
    podeVisualizar,
    isMaster
  }
}
