"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

export default function CadastroAnalista() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  // Logo será carregada da configuração do sistema/tenant (configurada no painel EasyBen)
  const [logoUrl] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    setLoading(true)

    try {
      // Validações
      if (!formData.nome || !formData.email || !formData.senha || !formData.confirmarSenha) {
        setErro("Por favor, preencha todos os campos")
        setLoading(false)
        return
      }

      if (formData.senha.length < 6) {
        setErro("A senha deve ter no mínimo 6 caracteres")
        setLoading(false)
        return
      }

      if (formData.senha !== formData.confirmarSenha) {
        setErro("As senhas não coincidem")
        setLoading(false)
        return
      }

      // Verificar se o email já está cadastrado
      const { data: usuarioExistente } = await supabase
        .from("usuarios_admin")
        .select("*")
        .eq("email", formData.email)
        .single()

      if (usuarioExistente) {
        setErro("Este email já está cadastrado. Tente fazer login ou recuperar sua senha.")
        setLoading(false)
        return
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            role: "admin",
            nome: formData.nome,
            perfil: "assistente", // Perfil padrão para analista
          },
        },
      })

      if (authError) {
        console.error("Erro ao criar usuário no Auth:", authError)
        setErro(`Erro ao criar conta: ${authError.message}`)
        setLoading(false)
        return
      }

      // Criar registro na tabela usuarios_admin usando o serviço
      const { UsuariosAdminService } = await import("@/services/usuarios-admin-service")
      
      const usuario = await UsuariosAdminService.criar({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        perfil: "assistente",
        permissoes: ["propostas", "em_analise", "cadastrado"],
      })
      
      // Atualizar status para pendente
      await UsuariosAdminService.atualizar(usuario.id, {
        status: "pendente",
      })

      // Buscar usuário atualizado
      const usuarioAtualizado = await UsuariosAdminService.buscarPorEmail(formData.email)
      
      // Salvar dados do usuário no localStorage
      if (usuarioAtualizado) {
        localStorage.setItem(
          "admin_usuario",
          JSON.stringify({
            ...usuarioAtualizado,
            session: authData.session,
          }),
        )
      }

      toast.success("Cadastro realizado com sucesso! Aguardando aprovação.")
      router.push("/analista/aguardando-aprovacao")
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error)
      setErro(error.message || "Ocorreu um erro ao cadastrar. Tente novamente.")
      toast.error(error.message || "Erro ao cadastrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 mb-4">
            {logoUrl && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex-shrink-0">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Cadastro de Analista</h1>
          </div>
          <p className="text-gray-600 mt-2">Preencha os dados para se cadastrar</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{erro}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha *
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={formData.senha}
                  onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha *
              </label>
              <div className="relative">
                <input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  tabIndex={-1}
                >
                  {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] text-white py-2 px-4 rounded-md hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-opacity-50 transition-colors disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Spinner className="h-4 w-4 mr-2" />
                  Cadastrando...
                </span>
              ) : (
                "Cadastrar"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link href="/analista/login" className="text-[#0F172A] hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
