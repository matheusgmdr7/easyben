"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { criarCorretor } from "@/services/corretores-service"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Eye, EyeOff, Users } from "lucide-react"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
]

export default function CadastroCorretorEquipe() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [gestorInfo, setGestorInfo] = useState<{ nome: string; email: string } | null>(null)
  const [loadingGestor, setLoadingGestor] = useState(true)
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    cidade: "",
    estado: "",
    cpf: "",
    data_nascimento: "",
    senha: "",
    confirmarSenha: "",
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

  useEffect(() => {
    carregarGestor()
  }, [token])

  const carregarGestor = async () => {
    try {
      setLoadingGestor(true)
      const tenantId = await getCurrentTenantId()
      
      // Buscar gestor pelo link_cadastro_equipe (formato: corretores/equipe/{token})
      const { data: gestor, error } = await supabase
        .from("corretores")
        .select("id, nome, email")
        .eq("link_cadastro_equipe", `corretores/equipe/${token}`)
        .eq("tenant_id", tenantId)
        .eq("is_gestor", true)
        .single()

      if (error || !gestor) {
        toast.error("Link de cadastro inválido ou expirado")
        router.push("/corretores")
        return
      }

      setGestorInfo(gestor)
    } catch (error: any) {
      console.error("Erro ao carregar gestor:", error)
      toast.error("Erro ao validar link de cadastro")
      router.push("/corretores")
    } finally {
      setLoadingGestor(false)
    }
  }

  function validarCPF(cpf: string) {
    cpf = cpf.replace(/\D/g, "")
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let soma = 0
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i)
    let resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.charAt(9))) return false
    soma = 0
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i)
    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.charAt(10))) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setErro(null)
    setSucesso(false)

    if (!validarCPF(formData.cpf)) {
      setErro("CPF inválido. Por favor, verifique o número digitado.")
      setCarregando(false)
      return
    }

    if (formData.senha !== formData.confirmarSenha) {
      setErro("As senhas não coincidem")
      setCarregando(false)
      return
    }

    try {
      const tenantId = await getCurrentTenantId()
      
      // Buscar gestor novamente para obter o ID (formato: corretores/equipe/{token})
      const { data: gestor } = await supabase
        .from("corretores")
        .select("id")
        .eq("link_cadastro_equipe", `corretores/equipe/${token}`)
        .eq("tenant_id", tenantId)
        .eq("is_gestor", true)
        .single()

      if (!gestor) {
        setErro("Link de cadastro inválido")
        setCarregando(false)
        return
      }

      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            role: "corretor",
            nome: formData.nome,
          },
        },
      })

      if (authError) {
        setErro(`Erro ao criar conta: ${authError.message}`)
        setCarregando(false)
        return
      }

      // 2. Criar corretor vinculado ao gestor
      const corretor = await criarCorretor({
        nome: formData.nome,
        email: formData.email,
        whatsapp: formData.whatsapp,
        cidade: formData.cidade,
        estado: formData.estado,
        cpf: formData.cpf,
        data_nascimento: formData.data_nascimento,
        status: "pendente",
        ativo: true,
        gestor_id: gestor.id, // Vincular ao gestor
      })

      toast.success("Cadastro realizado com sucesso! Você será vinculado à equipe após aprovação.")
      setSucesso(true)
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/corretor/login")
      }, 2000)
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error)
      setErro(error.message || "Erro ao realizar cadastro")
    } finally {
      setCarregando(false)
    }
  }

  if (loadingGestor) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validando link de cadastro...</p>
        </div>
      </div>
    )
  }

  if (!gestorInfo) {
    return null
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-[#7BD9F6] bg-opacity-30 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-[#0F172A]" />
            </div>
            <CardTitle className="text-2xl">Cadastro Realizado!</CardTitle>
            <CardDescription>
              Você será vinculado à equipe de {gestorInfo.nome} após aprovação.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/corretor/login")}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6" />
              Cadastro na Equipe
            </CardTitle>
            <CardDescription>
              Você está se cadastrando na equipe de <strong>{gestorInfo.nome}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    required
                    maxLength={14}
                  />
                </div>

                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                  <Input
                    id="data_nascimento"
                    name="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      name="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      name="confirmarSenha"
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      value={formData.confirmarSenha}
                      onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {mostrarConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {erro}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Cadastrando..." : "Cadastrar na Equipe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

