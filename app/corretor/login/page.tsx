"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { autenticarCorretor } from "@/services/auth-corretores-simples"
import { Spinner } from "@/components/ui/spinner"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function CorretorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  // Logo será carregada da configuração do sistema/tenant (configurada no painel EasyBen)
  const [logoUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("🚀 Iniciando login para:", email)
      console.log("📧 Email:", email)
      console.log("🔐 Senha fornecida:", senha ? "***" : "não fornecida")

      // Usar o módulo de autenticação simplificado
      const result = await autenticarCorretor({ email, senha })

      console.log("📊 Resultado da autenticação:", {
        success: result.success,
        message: result.message,
        corretorId: result.corretor?.id,
        corretorNome: result.corretor?.nome,
        corretorStatus: result.corretor?.status,
      })

      if (result.success) {
        console.log("✅ Login bem-sucedido!")
        toast.success("Login realizado com sucesso!")
        
        // Redirecionar com base no status do corretor
        if (result.corretor?.status === "aprovado") {
          console.log("✅ Corretor aprovado, redirecionando para dashboard")
          router.push("/corretor/dashboard")
        } else {
          console.log("⚠️ Corretor não aprovado, redirecionando para aguardando aprovação")
          router.push("/corretor/aguardando-aprovacao")
        }
      } else {
        console.error("❌ Login falhou:", result.message)
        toast.error(result.message || "Erro ao fazer login. Verifique suas credenciais.")
      }
    } catch (error: any) {
      console.error("❌ Erro ao fazer login:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      toast.error(error.message || "Ocorreu um erro ao fazer login. Tente novamente.")
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Área do Corretor</h1>
          </div>
          <p className="text-gray-600 mt-2">Faça login para acessar sua conta</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                required
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0F172A] focus:border-[#0F172A]"
                  required
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link href="/corretor/recuperar-senha" className="text-sm text-[#0F172A] hover:underline">
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] text-white py-2 px-4 rounded-md hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-opacity-50 transition-colors disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Spinner className="h-4 w-4 mr-2" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ainda não tem uma conta?{" "}
              <Link href="/corretor/cadastro" className="text-[#0F172A] hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
