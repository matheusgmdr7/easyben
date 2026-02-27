"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Key, Clock } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export default function RedefinirSenhaAnalistaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [linkInvalido, setLinkInvalido] = useState<boolean | null>(null)
  const tokensRef = useRef<{ access_token: string; refresh_token: string } | null>(null)

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")
    const type = hashParams.get("type")
    const errorCode = hashParams.get("error_code")
    const errorDesc = hashParams.get("error_description")

    if (type === "recovery" && accessToken) {
      tokensRef.current = { access_token: accessToken, refresh_token: refreshToken || "" }
      setLinkInvalido(false)
      return
    }
    const tokenQuery = searchParams.get("access_token")
    const refreshQuery = searchParams.get("refresh_token")
    if (tokenQuery) {
      tokensRef.current = { access_token: tokenQuery, refresh_token: refreshQuery || "" }
      setLinkInvalido(false)
      return
    }

    tokensRef.current = null
    setLinkInvalido(true)
    if (errorCode === "otp_expired" || (errorDesc && errorDesc.toLowerCase().includes("expired"))) {
      setErro(
        "Este link expirou. Os links de recuperação são válidos por 1 hora e servem para um único uso. Solicite uma nova redefinição de senha."
      )
    } else if (errorCode || hashParams.get("error")) {
      setErro(
        "Link inválido ou já utilizado. Cada link serve apenas uma vez. Solicite uma nova redefinição de senha."
      )
    } else {
      setErro("Link inválido ou expirado. Solicite uma nova redefinição de senha.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")

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
      let finalAccessToken = tokensRef.current?.access_token
      let finalRefreshToken = tokensRef.current?.refresh_token ?? ""

      if (!finalAccessToken) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        finalAccessToken = hashParams.get("access_token") ?? searchParams.get("access_token")
        finalRefreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token") ?? ""
      }

      if (!finalAccessToken) {
        throw new Error("Token não encontrado. Solicite uma nova redefinição de senha.")
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: finalAccessToken,
        refresh_token: finalRefreshToken || "",
      })

      if (sessionError) {
        throw new Error("Token inválido ou expirado. Solicite uma nova redefinição de senha.")
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      })

      if (updateError) {
        throw new Error(updateError.message || "Erro ao atualizar senha")
      }

      tokensRef.current = null
      toast.success("Senha redefinida com sucesso!")
      router.push("/analista/login")
    } catch (error: any) {
      console.error("❌ Erro ao redefinir senha:", error)
      setErro(error.message || "Erro ao redefinir senha. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (linkInvalido === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-[#0F172A] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Verificando link...</p>
        </div>
      </div>
    )
  }

  if (linkInvalido === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0F172A] mb-2">Link expirado ou inválido</h1>
            <p className="text-gray-600 text-sm mb-6">{erro}</p>
            <div className="flex flex-col gap-3">
              <Link href="/analista/recuperar-senha">
                <Button className="w-full bg-[#0F172A] hover:bg-[#1E293B]">
                  Solicitar nova redefinição de senha
                </Button>
              </Link>
              <Link href="/analista/login" className="text-[#0F172A] hover:underline text-sm font-medium">
                Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Redefinir Senha</h1>
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
              <Link href="/analista/login" className="text-[#0F172A] hover:underline font-medium">
                Voltar para o login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
