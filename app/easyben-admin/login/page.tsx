"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { signInAdmin } from "@/lib/supabase-auth"
import { supabase } from "@/lib/supabase-auth"
export default function EasyBenAdminLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'permission_denied') {
      setErrorMessage('Você não tem permissão para acessar a administração da EasyBen.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      console.log("Tentando fazer login no EasyBen Admin com:", formData.email)
      
      await signInAdmin(formData.email, formData.password)
      
      // Verificar se é master
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        const { data: usuario } = await supabase
          .from("usuarios_admin")
          .select("*")
          .eq("email", session.user.email.toLowerCase())
          .eq("ativo", true)
          .single()
        
        if (usuario) {
          const perfil = usuario.perfil || usuario.role
          if (perfil === 'master' || perfil === 'super_admin') {
            // Salvar no localStorage
            localStorage.setItem("admin_usuario", JSON.stringify({
              ...usuario,
              senha_hash: undefined,
            }))
            
            console.log("Login bem-sucedido no EasyBen Admin")
            toast.success("Login realizado com sucesso!")
            router.push("/easyben-admin")
          } else {
            await supabase.auth.signOut()
            setErrorMessage('Apenas usuários Master podem acessar a administração da EasyBen.')
            toast.error('Acesso negado. Apenas usuários Master podem acessar.')
          }
        } else {
          await supabase.auth.signOut()
          setErrorMessage('Usuário não encontrado ou inativo.')
          toast.error('Usuário não encontrado ou inativo.')
        }
      }
    } catch (error: any) {
      console.error("Erro de login:", error)
      setErrorMessage(error.message || "Erro ao fazer login")
      toast.error(error.message || "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="container mx-auto px-4 md:px-6">
        <Card className="w-full max-w-md mx-auto shadow-xl border border-gray-200">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="flex justify-center mb-4">
              <img
                src="https://i.ibb.co/M5KDz5k2/Easy-Ben-Logo-8-1.png"
                alt="EasyBen"
                className="h-16 md:h-20 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>
              EasyBen Admin
            </CardTitle>
            <CardDescription className="text-base" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>
              Administração Central da Plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#00C6FF] hover:bg-[#00B8E6] text-white font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", borderRadius: '8px' }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
                Sistema de administração central da plataforma EasyBen
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

