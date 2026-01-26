"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Copy, ExternalLink, Share2, QrCode, Eye, Users, FileText, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { verificarAutenticacao } from "@/services/auth-corretores-simples"

export default function MeuLinkPage() {
  const [corretor, setCorretor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [estatisticas, setEstatisticas] = useState({
    total_propostas: 0,
    propostas_pendentes: 0,
    propostas_aprovadas: 0,
    ultimo_acesso: null,
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Verificar autenticação
      const { autenticado, corretor: corretorAuth } = verificarAutenticacao()

      if (!autenticado || !corretorAuth) {
        toast.error("Erro de autenticação")
        return
      }

      // Buscar dados do corretor
      const { data: corretorData, error: corretorError } = await supabase
        .from("corretores")
        .select("*")
        .eq("id", corretorAuth.id)
        .single()

      if (corretorError) {
        console.error("Erro ao carregar dados do corretor:", corretorError)
        toast.error("Erro ao carregar dados")
        return
      }

      setCorretor(corretorData)

      // Buscar estatísticas de propostas (simplificado)
      const { data: propostas, error: propostasError } = await supabase
        .from("propostas")
        .select("status, created_at")
        .eq("corretor_id", corretorAuth.id)

      if (!propostasError && propostas) {
        const stats = {
          total_propostas: propostas.length,
          propostas_pendentes: propostas.filter((p) => p.status === "pendente").length,
          propostas_aprovadas: propostas.filter((p) => p.status === "aprovada").length,
          ultimo_acesso:
            propostas.length > 0 ? new Date(Math.max(...propostas.map((p) => new Date(p.created_at).getTime()))) : null,
        }
        setEstatisticas(stats)
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  const copiarLink = () => {
    if (!corretor) return

    const link = `${window.location.origin}/proposta/${corretor.id}`
    navigator.clipboard.writeText(link)
    toast.success("Link copiado para a área de transferência!")
  }

  const compartilharLink = async () => {
    if (!corretor) return

    const link = `${window.location.origin}/proposta/${corretor.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Proposta de Seguro Saúde",
          text: `Faça sua proposta de seguro saúde comigo: ${corretor.nome}`,
          url: link,
        })
      } catch (error) {
        console.log("Erro ao compartilhar:", error)
        copiarLink()
      }
    } else {
      copiarLink()
    }
  }

  const abrirLink = () => {
    if (!corretor) return

    const link = `${window.location.origin}/proposta/${corretor.id}`
    window.open(link, "_blank")
  }

  const gerarQRCode = () => {
    if (!corretor) return

    const link = `${window.location.origin}/proposta/${corretor.id}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`

    // Abrir QR Code em nova aba
    window.open(qrUrl, "_blank")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#0F172A] border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!corretor) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">Erro ao carregar dados do corretor</p>
            <Button onClick={carregarDados} className="mt-4">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const linkProposta = `${window.location.origin}/proposta/${corretor.id}`

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center border-b pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Meu Link Exclusivo</h1>
        <Badge variant="outline" className="text-[#0F172A] border-[#0F172A] text-xs font-medium">
          Ativo
        </Badge>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 text-[#0F172A] mx-auto mb-2 opacity-80" />
            <p className="text-xl font-semibold">{estatisticas.total_propostas}</p>
            <p className="text-xs text-gray-600 mt-1">Total de Propostas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-amber-500 mx-auto mb-2 opacity-80" />
            <p className="text-xl font-semibold">{estatisticas.propostas_pendentes}</p>
            <p className="text-xs text-gray-600 mt-1">Pendentes</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 text-[#0F172A] mx-auto mb-2 opacity-80" />
            <p className="text-xl font-semibold">{estatisticas.propostas_aprovadas}</p>
            <p className="text-xs text-gray-600 mt-1">Aprovadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 text-center">
            <Eye className="h-5 w-5 text-blue-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-medium">Último Acesso</p>
            <p className="text-xs text-gray-600 mt-1">
              {estatisticas.ultimo_acesso ? estatisticas.ultimo_acesso.toLocaleDateString("pt-BR") : "Nenhum acesso"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Link Principal */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center text-base font-medium">
            <Share2 className="mr-2 h-4 w-4" />
            Seu Link Exclusivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link" className="text-sm">
              Link para Propostas
            </Label>
            <div className="flex space-x-2">
              <Input id="link" value={linkProposta} readOnly className="font-mono text-sm" />
              <Button onClick={copiarLink} variant="outline" size="icon" className="h-9 w-9">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={abrirLink} variant="outline" size="icon" className="h-9 w-9">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={copiarLink} className="bg-[#0F172A] hover:bg-[#1E293B] h-8 text-xs">
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copiar Link
            </Button>
            <Button onClick={compartilharLink} variant="outline" className="h-8 text-xs">
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Compartilhar
            </Button>
            <Button onClick={abrirLink} variant="outline" className="h-8 text-xs">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Visualizar
            </Button>
            <Button onClick={gerarQRCode} variant="outline" className="h-8 text-xs">
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              QR Code
            </Button>
          </div>

          <Separator className="my-2" />

          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
            <h4 className="font-medium text-blue-900 text-sm mb-1.5">Como usar seu link:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Envie este link para seus clientes via WhatsApp, email ou redes sociais</li>
              <li>• O cliente será direcionado para uma página personalizada com seu nome</li>
              <li>• Todas as propostas feitas através deste link serão automaticamente associadas a você</li>
              <li>• Você receberá notificações quando uma proposta for enviada</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Corretor e Mensagens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Informações do Corretor */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base font-medium">Suas Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nome</Label>
              <p className="font-medium text-sm">{corretor.nome}</p>
            </div>

            {corretor.email && (
              <div>
                <Label className="text-xs font-medium text-gray-600">Email</Label>
                <p className="font-medium text-sm">{corretor.email}</p>
              </div>
            )}

            {corretor.whatsapp && (
              <div>
                <Label className="text-xs font-medium text-gray-600">WhatsApp</Label>
                <p className="font-medium text-sm">{corretor.whatsapp}</p>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-gray-600">Status</Label>
              <p className="font-medium text-sm text-[#0F172A]">Ativo</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">ID do Corretor</Label>
              <p className="font-mono text-xs">{corretor.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Mensagens Sugeridas */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base font-medium">Mensagens para WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                <Label className="text-xs font-medium">Mensagem Simples:</Label>
                <p className="text-xs mt-1 text-gray-700">
                  "Olá! Faça sua proposta de seguro saúde de forma rápida e segura através do meu link exclusivo:{" "}
                  {linkProposta}"
                </p>
                <Button
                  onClick={() => {
                    const mensagem = `Olá! Faça sua proposta de seguro saúde de forma rápida e segura através do meu link exclusivo: ${linkProposta}`
                    navigator.clipboard.writeText(mensagem)
                    toast.success("Mensagem copiada!")
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copiar
                </Button>
              </div>

              <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                <Label className="text-xs font-medium">Mensagem Detalhada:</Label>
                <p className="text-xs mt-1 text-gray-700">
                  "🏥 Seguro Saúde com as melhores condições! ✅ Processo 100% digital ✅ Aprovação rápida ✅ Sem
                  burocracia Faça sua proposta agora: {linkProposta}
                  Qualquer dúvida, estou à disposição!"
                </p>
                <Button
                  onClick={() => {
                    const mensagem = `🏥 Seguro Saúde com as melhores condições! 

✅ Processo 100% digital
✅ Aprovação rápida  
✅ Sem burocracia

Faça sua proposta agora: ${linkProposta}

Qualquer dúvida, estou à disposição!`
                    navigator.clipboard.writeText(mensagem)
                    toast.success("Mensagem copiada!")
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
