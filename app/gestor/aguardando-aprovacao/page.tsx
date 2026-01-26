"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Spinner } from "@/components/ui/spinner"

export default function AguardandoAprovacaoGestorPage() {
  const router = useRouter()
  const [gestor, setGestor] = useState<{ nome: string; email: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se o gestor está logado
    const corretorLogado = localStorage.getItem("corretorLogado")
    if (!corretorLogado) {
      router.push("/gestor/login")
      return
    }

    try {
      const gestorData = JSON.parse(corretorLogado)

      // Verificar status do gestor no Supabase
      const checkGestorStatus = async () => {
        try {
          const { data, error } = await supabase
            .from("corretores")
            .select("nome, email, status, is_gestor")
            .eq("email", gestorData.email)
            .single()

          if (error) throw error

          if (data) {
            // Verificar se é realmente gestor
            if (!data.is_gestor) {
              router.push("/corretor/dashboard")
              return
            }

            setGestor(data)

            // Se o gestor já estiver aprovado, redirecionar para o dashboard
            if (data.status === "aprovado") {
              router.push("/gestor")
              return
            }
          } else {
            throw new Error("Gestor não encontrado")
          }
        } catch (error) {
          console.error("Erro ao verificar status do gestor:", error)
          localStorage.removeItem("corretorLogado")
          router.push("/gestor/login")
        } finally {
          setLoading(false)
        }
      }

      checkGestorStatus()

      // Verificar status a cada 30 segundos
      const interval = setInterval(checkGestorStatus, 30000)

      return () => clearInterval(interval)
    } catch (error) {
      console.error("Erro ao processar dados do gestor:", error)
      localStorage.removeItem("corretorLogado")
      router.push("/gestor/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("corretorLogado")
    router.push("/gestor/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-gray-600">Verificando status...</span>
      </div>
    )
  }

  if (!gestor) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-center">Seu cadastro como gestor está sendo analisado pela nossa equipe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {gestor.status === "pendente" ? (
              <Clock className="h-24 w-24 text-yellow-500" />
            ) : gestor.status === "rejeitado" ? (
              <XCircle className="h-24 w-24 text-red-500" />
            ) : (
              <CheckCircle className="h-24 w-24 text-[#0F172A]" />
            )}
          </div>

          <div className="text-center space-y-2">
            <h3 className="font-medium text-lg">Olá, {gestor.nome}</h3>

            {gestor.status === "pendente" ? (
              <p className="text-gray-600">
                Seu cadastro como gestor está em análise. Assim que for aprovado, você terá acesso completo ao Portal do Gestor e poderá gerenciar sua equipe. Esta página será atualizada automaticamente quando seu cadastro for aprovado.
              </p>
            ) : gestor.status === "rejeitado" ? (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">Seu cadastro foi rejeitado.</p>
                <p className="text-gray-600">
                  Entre em contato com nossa equipe para mais informações e para entender os próximos passos.
                </p>
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-800">
                    Se você acredita que houve um erro, entre em contato pelo email: suporte@contratandoplanos.com.br
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[#0F172A]">Seu cadastro foi aprovado! Você já pode acessar o Portal do Gestor.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>

          {gestor.status === "aprovado" && (
            <Button onClick={() => router.push("/gestor")}>Acessar Portal do Gestor</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

