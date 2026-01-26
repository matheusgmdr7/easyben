"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Spinner } from "@/components/ui/spinner"
import { signOutAdmin } from "@/lib/supabase-auth"

export default function AguardandoAprovacaoAnalistaPage() {
  const router = useRouter()
  const [analista, setAnalista] = useState<{ nome: string; email: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se o analista está logado
    const adminUsuario = localStorage.getItem("admin_usuario")
    if (!adminUsuario) {
      router.push("/analista/login")
      return
    }

    try {
      const usuarioData = JSON.parse(adminUsuario)

      // Verificar status do analista no Supabase
      const checkAnalistaStatus = async () => {
        try {
          const { data, error } = await supabase
            .from("usuarios_admin")
            .select("nome, email, status")
            .eq("email", usuarioData.email)
            .single()

          if (error) throw error

          if (data) {
            setAnalista(data)

            // Se o analista já estiver ativo, redirecionar para o portal
            if (data.status === "ativo") {
              router.push("/analista")
              return
            }
          } else {
            throw new Error("Analista não encontrado")
          }
        } catch (error) {
          console.error("Erro ao verificar status do analista:", error)
          localStorage.removeItem("admin_usuario")
          router.push("/analista/login")
        } finally {
          setLoading(false)
        }
      }

      checkAnalistaStatus()

      // Verificar status a cada 30 segundos
      const interval = setInterval(checkAnalistaStatus, 30000)

      return () => clearInterval(interval)
    } catch (error) {
      console.error("Erro ao processar dados do analista:", error)
      localStorage.removeItem("admin_usuario")
      router.push("/analista/login")
    }
  }, [router])

  const handleLogout = async () => {
    await signOutAdmin()
    localStorage.removeItem("admin_usuario")
    router.push("/analista/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
        <span className="ml-2 text-gray-600">Verificando status...</span>
      </div>
    )
  }

  if (!analista) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-center">Seu cadastro está sendo analisado pela nossa equipe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {analista.status === "pendente" ? (
              <Clock className="h-24 w-24 text-yellow-500" />
            ) : analista.status === "bloqueado" ? (
              <XCircle className="h-24 w-24 text-red-500" />
            ) : (
              <CheckCircle className="h-24 w-24 text-[#0F172A]" />
            )}
          </div>

          <div className="text-center space-y-2">
            <h3 className="font-medium text-lg">Olá, {analista.nome}</h3>

            {analista.status === "pendente" ? (
              <p className="text-gray-600">
                Seu cadastro está em análise. Assim que for aprovado, você terá acesso completo ao Portal do Analista. Esta
                página será atualizada automaticamente quando seu cadastro for aprovado.
              </p>
            ) : analista.status === "bloqueado" ? (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">Seu cadastro foi bloqueado.</p>
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
              <p className="text-[#0F172A]">Seu cadastro foi aprovado! Você já pode acessar o Portal do Analista.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>

          {analista.status === "ativo" && (
            <Button onClick={() => router.push("/analista")}>Acessar Portal</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
