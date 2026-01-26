"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Key } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export default function RedefinirSenhaAdministradoraPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [logoUrl] = useState<string | null>(null)

  useEffect(() => {
    // Verificar se há token na URL (Supabase adiciona automaticamente)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")

    if (type === "recovery" && accessToken) {
      // Token válido, pode prosseguir
      console.log("✅ Token de redefinição encontrado")
    } else {
      // Verificar se há token nos query params (fallback)
      const token = searchParams.get("token")
      if (!token && !accessToken) {
        setErro("Link inválido ou expirado. Solicite uma nova redefinição de senha.")
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")

    // Validações
    if (!senha || senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres")
      return
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem")
      return
    }

    setLoading(true)

    try {
      // Obter token da URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (!accessToken) {
        throw new Error("Token não encontrado. Solicite uma nova redefinição de senha.")
      }

      // Usar Supabase para atualizar a senha
      // Primeiro, fazer login com o token de recuperação
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      })

      if (sessionError) {
        throw new Error("Token inválido ou expirado. Solicite uma nova redefinição de senha.")
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      })

      if (updateError) {
        throw new Error(updateError.message || "Erro ao atualizar senha")
      }

      // Atualizar senha também na tabela administradoras (sincronizar)
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.email) {
        const response = await fetch("/api/administradora/sincronizar-senha", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userData.user.email,
            senha: senha,
          }),
        })

        if (!response.ok) {
          console.warn("⚠️ Erro ao sincronizar senha na tabela administradoras")
          // Não bloquear se falhar (senha já foi atualizada no Auth)
        }
      }

      toast.success("Senha redefinida com sucesso!")
      router.push("/administradora/login")
    } catch (error: any) {
      console.error("❌ Erro ao redefinir senha:", error)
      setErro(error.message || "Erro ao redefinir senha. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Redefinir Senha</h1>
          </div>
          <p className="text-gray-600 mt-2">Digite sua nova senha</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10 w-full"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">A senha deve ter no mínimo 6 caracteres</p>
            </div>

            <div>
              <Label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="confirmarSenha"
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10 w-full"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !senha || !confirmarSenha || senha !== confirmarSenha}
            >
              {loading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <Link href="/administradora/login" className="text-[#0F172A] hover:underline font-medium">
                Voltar para o login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

