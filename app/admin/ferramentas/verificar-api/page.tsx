"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { verificarChavesAPI, testarConexaoSupabase } from "@/lib/supabase"

export default function VerificarAPIPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")

  useEffect(() => {
    // Carregar as variáveis de ambiente do navegador
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    // Mostrar apenas os primeiros caracteres da chave por segurança
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    setSupabaseKey(key ? `${key.substring(0, 10)}...${key.substring(key.length - 5)}` : "")

    // Verificar as chaves de API ao carregar a página
    verificarAPI()
  }, [])

  const verificarAPI = async () => {
    setLoading(true)
    try {
      const resultado = await verificarChavesAPI()
      setStatus(resultado)
    } catch (error) {
      setStatus({
        success: false,
        message: error.message,
        details: { error },
      })
    } finally {
      setLoading(false)
    }
  }

  const testarConexao = async () => {
    setLoading(true)
    try {
      const resultado = await testarConexaoSupabase()
      setStatus({
        ...status,
        conexaoTestada: true,
        conexaoSucesso: resultado,
        conexaoMensagem: resultado ? "Conexão bem-sucedida" : "Falha na conexão",
      })
    } catch (error) {
      setStatus({
        ...status,
        conexaoTestada: true,
        conexaoSucesso: false,
        conexaoMensagem: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Verificação de API Supabase</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Supabase</CardTitle>
            <CardDescription>Verifique se as variáveis de ambiente estão configuradas corretamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">NEXT_PUBLIC_SUPABASE_URL</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted p-2 rounded text-sm flex-1 overflow-x-auto">
                    {supabaseUrl || "Não configurado"}
                  </code>
                  {supabaseUrl ? (
                    <Badge variant="outline" className="bg-[#7BD9F6] bg-opacity-20 text-[#0F172A] border-[#7BD9F6] border-opacity-30">
                      <CheckCircle className="h-3 w-3 mr-1" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" /> Não configurado
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted p-2 rounded text-sm flex-1 overflow-x-auto">
                    {supabaseKey || "Não configurado"}
                  </code>
                  {supabaseKey ? (
                    <Badge variant="outline" className="bg-[#7BD9F6] bg-opacity-20 text-[#0F172A] border-[#7BD9F6] border-opacity-30">
                      <CheckCircle className="h-3 w-3 mr-1" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" /> Não configurado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da API</CardTitle>
            <CardDescription>Resultado da verificação das chaves de API</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2">Verificando...</span>
              </div>
            ) : status ? (
              <div className="space-y-4">
                <Alert variant={status.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{status.success ? "Sucesso" : "Erro"}</AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>

                {status.details && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Detalhes:</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(status.details, null, 2)}
                    </pre>
                  </div>
                )}

                {status.conexaoTestada && (
                  <Alert variant={status.conexaoSucesso ? "default" : "destructive"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Teste de Conexão</AlertTitle>
                    <AlertDescription>{status.conexaoMensagem}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <p>Nenhuma verificação realizada ainda</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={verificarAPI} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Verificar Chaves API
            </Button>
            <Button onClick={testarConexao} disabled={loading} variant="outline">
              Testar Conexão
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solução de Problemas</CardTitle>
            <CardDescription>Passos para resolver problemas comuns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Erro "Invalid API key"</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li>Verifique se a chave de API está correta no arquivo .env.local</li>
                  <li>Certifique-se de que a chave não expirou no console do Supabase</li>
                  <li>Reinicie o servidor de desenvolvimento</li>
                  <li>Limpe o cache do navegador</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium">Erro de Conexão</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li>Verifique se a URL do Supabase está correta</li>
                  <li>Confirme se o projeto Supabase está ativo</li>
                  <li>Verifique se há restrições de CORS no projeto</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium">Configuração Local</h3>
                <p className="text-sm mt-1">
                  Crie um arquivo <code>.env.local</code> na raiz do projeto com as seguintes variáveis:
                </p>
                <pre className="bg-muted p-3 rounded text-xs mt-2 overflow-x-auto">
                  {`NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
