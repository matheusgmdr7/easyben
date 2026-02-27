"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Link from "next/link"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setErro("")

    try {
      const response = await fetch("/api/corretor/recuperar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => ({ success: false, error: "Resposta inválida" }))

      if (response.ok && data?.success) {
        setEnviado(true)
        toast.success("Email de recuperação enviado com sucesso!")
      } else {
        const msg = data?.error || "Erro ao enviar email. Tente novamente."
        setErro(msg)
        toast.error(msg)
      }
    } catch (error) {
      console.error("Erro ao enviar email de recuperação:", error)
      const msg = "Erro ao enviar email. Tente novamente."
      setErro(msg)
      toast.error(msg)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <Header />

      <main className="flex-grow py-8 md:py-10 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[#0F172A]">Recuperar Senha</h1>

            {erro && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Esqueceu sua senha?</CardTitle>
                <CardDescription>
                  {enviado
                    ? "Enviamos um email com instruções para recuperar sua senha."
                    : "Digite seu email para receber instruções de recuperação de senha."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enviado ? (
                  <div className="space-y-4">
                    <Alert className="border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle className="text-green-800">Email enviado com sucesso!</AlertTitle>
                      <AlertDescription>
                        Verifique sua caixa de entrada e a pasta de spam. O link para redefinir a senha foi enviado
                        para <strong>{email}</strong>.
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-col space-y-2">
                      <Button onClick={() => { setEnviado(false); setErro(""); }} variant="outline">
                        Tentar com outro email
                      </Button>
                      <Link href="/corretor/login">
                        <Button className="w-full bg-[#0F172A] hover:bg-[#1E293B]">Voltar para o login</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm md:text-base">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        className="text-sm md:text-base"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-sm md:text-base py-2 md:py-3"
                      disabled={carregando}
                    >
                      {carregando ? "Enviando..." : "Recuperar Senha"}
                    </Button>

                    <div className="text-center text-sm text-gray-500">
                      Lembrou sua senha?{" "}
                      <Link href="/corretor/login" className="text-[#0F172A] hover:underline">
                        Voltar para o login
                      </Link>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
