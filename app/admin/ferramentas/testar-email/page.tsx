"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { verificarServicoEmail, debugEnvioEmail, enviarEmailPropostaCliente } from "@/services/email-service"

export default function TestarEmailPage() {
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  const testarServico = async () => {
    setTestando(true)
    try {
      console.log("🧪 Iniciando teste do serviço de email...")

      // Debug completo
      await debugEnvioEmail()

      // Verificar status
      const status = await verificarServicoEmail()
      setResultado(status)

      console.log("✅ Teste concluído!")
    } catch (error) {
      console.error("❌ Erro no teste:", error)
      setResultado({
        disponivel: false,
        detalhes: `Erro: ${error.message}`,
        ambiente: "erro",
        recomendacao: "Verifique o console para mais detalhes",
      })
    } finally {
      setTestando(false)
    }
  }

  const testarEnvioReal = async () => {
    setTestando(true)
    try {
      console.log("📧 Testando envio real de email...")

      const sucesso = await enviarEmailPropostaCliente(
        "teste@exemplo.com",
        "Cliente Teste",
        "https://exemplo.com/proposta/123",
        "Corretor Teste",
      )

      console.log(`Resultado do teste: ${sucesso ? "Sucesso" : "Falha"}`)

      // Atualizar resultado
      await testarServico()
    } catch (error) {
      console.error("❌ Erro no teste de envio:", error)
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Teste do Serviço de Email</h1>
        <p className="text-gray-600">Verifique se o sistema de envio de emails está funcionando</p>
      </div>

      <div className="grid gap-6">
        {/* Card de Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Status do Serviço
            </CardTitle>
            <CardDescription>Verificação do sistema de envio de emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultado ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {resultado.disponivel ? (
                    <CheckCircle className="h-5 w-5 text-[#0F172A]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {resultado.disponivel ? "Serviço Disponível" : "Serviço Indisponível"}
                  </span>
                  <Badge variant={resultado.disponivel ? "default" : "destructive"}>{resultado.ambiente}</Badge>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Detalhes:</strong> {resultado.detalhes}
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Recomendação:</strong> {resultado.recomendacao}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Clique em "Testar Serviço" para verificar o status</p>
            )}

            <div className="flex gap-2">
              <Button onClick={testarServico} disabled={testando} className="flex items-center gap-2">
                {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Testar Serviço
              </Button>

              <Button
                onClick={testarEnvioReal}
                disabled={testando}
                variant="outline"
                className="flex items-center gap-2"
              >
                {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Teste de Envio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card de Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">🔧 Desenvolvimento</h4>
              <p className="text-sm text-gray-600">Emails são simulados e exibidos no console do navegador</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">🚀 Produção</h4>
              <p className="text-sm text-gray-600">
                Tenta enviar via Edge Function do Supabase. Se falhar, registra para envio manual
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">📱 Fallback</h4>
              <p className="text-sm text-gray-600">
                Quando o email automático falha, o sistema oferece opções para envio via WhatsApp
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card de Debug */}
        <Card>
          <CardHeader>
            <CardTitle>Debug e Logs</CardTitle>
            <CardDescription>Abra o console do navegador (F12) para ver logs detalhados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-gray-900 text-[#7BD9F6] rounded-lg font-mono text-sm">
              <p>💡 Para ver logs detalhados:</p>
              <p>1. Abra o Console (F12 → Console)</p>
              <p>2. Clique em "Testar Serviço"</p>
              <p>3. Observe as mensagens detalhadas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
