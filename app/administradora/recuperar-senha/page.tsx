"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { toast } from "sonner"
import { Mail, ArrowLeft } from "lucide-react"

export default function RecuperarSenhaAdministradoraPage() {
  const [email, setEmail] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [logoUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)

    try {
      const response = await fetch("/api/administradora/recuperar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setEnviado(true)
        toast.success("Email de recuperação enviado com sucesso!")
      } else {
        toast.error(data.error || "Erro ao enviar email. Tente novamente.")
      }
    } catch (error) {
      console.error("Erro ao enviar email de recuperação:", error)
      toast.error("Erro ao enviar email. Tente novamente.")
    } finally {
      setCarregando(false)
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Recuperar Senha</h1>
          </div>
          <p className="text-gray-600 mt-2">
            {enviado
              ? "Enviamos um email com instruções para recuperar sua senha."
              : "Digite seu email para receber instruções de recuperação de senha."}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {enviado ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#7BD9F6] bg-opacity-30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-[#0F172A]" />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Verifique sua caixa de entrada e siga as instruções enviadas para o email:
                </p>
                <p className="text-sm font-medium text-gray-900 mb-6">{email}</p>
              </div>
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={() => {
                    setEnviado(false)
                    setEmail("")
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Tentar com outro email
                </Button>
                <Link href="/administradora/login">
                  <Button className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Login
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 w-full"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Digite o email usado para fazer login no portal
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={carregando}
              >
                {carregando ? "Enviando..." : "Recuperar Senha"}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Lembrou sua senha?{" "}
                <Link href="/administradora/login" className="text-[#0F172A] hover:underline font-medium">
                  Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

