"use client"

import { useState } from "react"
import TenantLayout from "@/components/tenant/tenant-layout"
import { useTenantTheme } from "@/components/tenant/tenant-theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"
import { toast } from "sonner"

interface ContatoPageProps {
  params: {
    "tenant-slug": string
  }
}

export default function ContatoPage({ params }: ContatoPageProps) {
  const { theme } = useTenantTheme()
  const tenantSlug = params["tenant-slug"]
  const primaryColor = theme.colors.primary

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    mensagem: "",
  })
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)

    try {
      // Aqui você pode implementar o envio do formulário
      // Por exemplo, enviar para uma API route
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulação

      toast.success("Mensagem enviada com sucesso!")
      setFormData({ nome: "", email: "", telefone: "", mensagem: "" })
    } catch (error) {
      toast.error("Erro ao enviar mensagem. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TenantLayout tenantSlug={tenantSlug} initialTenant={theme.tenant || undefined}>
      <div className="py-16 bg-white">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: primaryColor }}>
                Entre em Contato
              </h1>
              <p className="text-lg text-gray-600">
                Estamos prontos para ajudar você a encontrar o plano ideal
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Formulário */}
              <Card>
                <CardHeader>
                  <CardTitle>Envie sua mensagem</CardTitle>
                  <CardDescription>Preencha o formulário e entraremos em contato</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="mensagem">Mensagem</Label>
                      <Textarea
                        id="mensagem"
                        value={formData.mensagem}
                        onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                        rows={5}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={enviando}
                      style={{ backgroundColor: primaryColor }}
                      className="w-full text-white"
                    >
                      {enviando ? "Enviando..." : "Enviar mensagem"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Informações de Contato */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Mail className="h-5 w-5 mr-2" style={{ color: primaryColor }} />
                      Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={`mailto:${theme.contact.email || "contato@contratandoplanos.com.br"}`}
                      className="text-gray-600 hover:underline"
                    >
                      {theme.contact.email || "contato@contratandoplanos.com.br"}
                    </a>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Phone className="h-5 w-5 mr-2" style={{ color: primaryColor }} />
                      Telefone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Entre em contato pelo email acima</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}

