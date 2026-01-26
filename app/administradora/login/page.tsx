"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { autenticarAdministradora } from "@/services/auth-administradoras-service"
import { Spinner } from "@/components/ui/spinner"
import { Eye, EyeOff } from "lucide-react"

export default function AdministradoraLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  // Logo será carregada da configuração do sistema/tenant (configurada no painel EasyBen)
  const [logoUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    setLoading(true)

    try {
      console.log("🚀 Iniciando login para administradora:", email)

      // Usar o serviço de autenticação
      const result = await autenticarAdministradora({ email, senha })

      console.log("📊 Resultado da autenticação:", {
        success: result.success,
        message: result.message,
        administradoraId: result.administradora?.id,
        administradoraNome: result.administradora?.nome,
        statusLogin: result.administradora?.status_login,
      })

      if (result.success) {
        console.log("✅ Login bem-sucedido!")
        
        // Redirecionar com base no status de login
        if (result.administradora?.status_login === "ativo") {
          console.log("✅ Administradora ativa, redirecionando para dashboard")
          router.push("/administradora")
        } else {
          console.log("⚠️ Administradora não ativa, redirecionando para aguardando aprovação")
          router.push("/administradora/aguardando-aprovacao")
        }
      } else {
        console.error("❌ Login falhou:", result.message)
        setErro(result.message || "Erro ao fazer login. Verifique suas credenciais.")
      }
    } catch (error: any) {
      console.error("❌ Erro ao fazer login:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      setErro(error.message || "Ocorreu um erro ao fazer login. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // TODO: Carregar logo da configuração do sistema/tenant
  // useEffect(() => {
  //   // Buscar logo da configuração do tenant/administradora
  //   // setLogoUrl(logoDaConfiguracao)
  // }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Título com Logo ao lado */}
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Portal da Administradora</h1>
          </div>
          <p className="text-gray-600 mt-2">Faça login para acessar sua conta</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{erro}</div>
          )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Entrando...</span>
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-gray-600">
              <Link href="/administradora/recuperar-senha" className="text-[#0F172A] hover:underline font-medium">
                Esqueceu sua senha?
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Link href="/administradora/cadastro" className="text-[#0F172A] hover:underline font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

