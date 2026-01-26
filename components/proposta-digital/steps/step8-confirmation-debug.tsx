"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Copy, ExternalLink, MessageCircle, Mail, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Step8ConfirmationDebugProps {
  propostaId: string
  nomeCliente: string
  emailCliente: string
  telefoneCliente?: string
  nomeCorretor?: string
  linkProposta: string
  emailEnviado?: boolean
  statusVerificado?: boolean
  onEnviarEmail?: () => Promise<boolean>
}

export default function Step8ConfirmationDebug({
  propostaId,
  nomeCliente,
  emailCliente,
  telefoneCliente,
  nomeCorretor = "Sistema",
  linkProposta,
  emailEnviado = false,
  statusVerificado = false,
  onEnviarEmail,
}: Step8ConfirmationDebugProps) {
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [renderCount, setRenderCount] = useState(0)
  const [propsHistory, setPropsHistory] = useState<any[]>([])
  const [estadoInterno, setEstadoInterno] = useState({
    emailEnviadoInterno: false,
    statusVerificadoInterno: false,
  })

  // MONITORAR TODAS AS RENDERIZAÇÕES E MUDANÇAS DE PROPS
  useEffect(() => {
    const novaRenderizacao = renderCount + 1
    setRenderCount(novaRenderizacao)

    const propsAtuais = {
      renderizacao: novaRenderizacao,
      timestamp: new Date().toLocaleTimeString(),
      props: {
        propostaId,
        nomeCliente,
        emailCliente,
        emailEnviado,
        statusVerificado,
        telefoneCliente,
        nomeCorretor,
      },
    }

    console.log(`🎯 STEP8 DEBUG - RENDERIZAÇÃO ${novaRenderizacao}:`)
    console.log("   Props recebidas:", propsAtuais.props)

    setPropsHistory((prev) => [...prev.slice(-9), propsAtuais]) // Manter últimas 10
  }, [
    propostaId,
    nomeCliente,
    emailCliente,
    emailEnviado,
    statusVerificado,
    telefoneCliente,
    nomeCorretor,
    renderCount,
  ])

  // EFEITO ESPECÍFICO PARA MONITORAR emailEnviado
  useEffect(() => {
    console.log(`📧 STEP8 DEBUG - MUDANÇA EM emailEnviado:`)
    console.log(`   Valor atual: ${emailEnviado}`)
    console.log(`   Tipo: ${typeof emailEnviado}`)
    console.log(`   É true?: ${emailEnviado === true}`)
    console.log(`   É truthy?: ${!!emailEnviado}`)

    // Atualizar estado interno
    setEstadoInterno((prev) => ({
      ...prev,
      emailEnviadoInterno: emailEnviado === true,
    }))
  }, [emailEnviado])

  // EFEITO ESPECÍFICO PARA MONITORAR statusVerificado
  useEffect(() => {
    console.log(`🔍 STEP8 DEBUG - MUDANÇA EM statusVerificado:`)
    console.log(`   Valor atual: ${statusVerificado}`)
    console.log(`   Tipo: ${typeof statusVerificado}`)

    // Atualizar estado interno
    setEstadoInterno((prev) => ({
      ...prev,
      statusVerificadoInterno: statusVerificado === true,
    }))
  }, [statusVerificado])

  // ENVIO MANUAL DE EMAIL
  async function tentarEnviarEmail() {
    if (!onEnviarEmail) {
      toast.error("Função de envio não disponível")
      return
    }

    try {
      setEnviandoEmail(true)
      console.log("📧 STEP8 DEBUG - ENVIO MANUAL INICIADO...")

      const sucesso = await onEnviarEmail()

      console.log("📧 STEP8 DEBUG - RESULTADO DO ENVIO MANUAL:", sucesso)

      if (sucesso) {
        toast.success("Email enviado com sucesso!")
        // Atualizar estado interno
        setEstadoInterno((prev) => ({
          ...prev,
          emailEnviadoInterno: true,
          statusVerificadoInterno: true,
        }))
      } else {
        toast.error("Erro ao enviar email")
      }
    } catch (error) {
      console.error("❌ STEP8 DEBUG - EXCEÇÃO NO ENVIO MANUAL:", error)
      toast.error("Erro ao enviar email: " + error.message)
    } finally {
      setEnviandoEmail(false)
    }
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkProposta)
    toast.success("Link copiado para a área de transferência!")
  }

  // LÓGICA DE DECISÃO PARA MOSTRAR STATUS
  const mostrarComoEnviado = emailEnviado === true
  const mostrarComoVerificado = statusVerificado === true

  console.log(`🎯 STEP8 DEBUG - LÓGICA DE RENDERIZAÇÃO:`)
  console.log(`   emailEnviado prop: ${emailEnviado} (${typeof emailEnviado})`)
  console.log(`   statusVerificado prop: ${statusVerificado} (${typeof statusVerificado})`)
  console.log(`   mostrarComoEnviado: ${mostrarComoEnviado}`)
  console.log(`   mostrarComoVerificado: ${mostrarComoVerificado}`)
  console.log(`   estadoInterno:`, estadoInterno)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header de Debug */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-800">🔧 Step8 Debug Mode - Status do Email</CardTitle>
          <div className="text-sm text-purple-600">
            <p>
              Renderização #{renderCount} | Props History: {propsHistory.length} entradas
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Análise das Props */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Análise das Props Recebidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📧 Email Enviado</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Valor:</strong> {String(emailEnviado)}
                </p>
                <p>
                  <strong>Tipo:</strong> {typeof emailEnviado}
                </p>
                <p>
                  <strong>É true?:</strong> {String(emailEnviado === true)}
                </p>
                <p>
                  <strong>É truthy?:</strong> {String(!!emailEnviado)}
                </p>
                <p>
                  <strong>Mostrar como enviado?:</strong> {String(mostrarComoEnviado)}
                </p>
                <p>
                  <strong>Estado interno:</strong> {String(estadoInterno.emailEnviadoInterno)}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔍 Status Verificado</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Valor:</strong> {String(statusVerificado)}
                </p>
                <p>
                  <strong>Tipo:</strong> {typeof statusVerificado}
                </p>
                <p>
                  <strong>É true?:</strong> {String(statusVerificado === true)}
                </p>
                <p>
                  <strong>É truthy?:</strong> {String(!!statusVerificado)}
                </p>
                <p>
                  <strong>Mostrar como verificado?:</strong> {String(mostrarComoVerificado)}
                </p>
                <p>
                  <strong>Estado interno:</strong> {String(estadoInterno.statusVerificadoInterno)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header de Sucesso */}
      <Card className="border-[#7BD9F6] border-opacity-30 bg-[#7BD9F6] bg-opacity-20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-[#0F172A]" />
          </div>
          <CardTitle className="text-2xl text-[#0F172A]">Proposta Criada com Sucesso! 🎉</CardTitle>
          <p className="text-[#0F172A] mt-2">
            A proposta foi criada para <strong>{nomeCliente}</strong>
          </p>
          <div className="mt-4">
            <Badge variant="outline" className="text-sm">
              ID da Proposta: {propostaId}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Status do Email - VERSÃO DEBUG COM COMPARAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Status do Email (Debug Comparativo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Indicador Visual do Status Atual */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Status Atual Detectado:</h4>
              <div className="text-lg font-bold text-center">
                {mostrarComoEnviado ? (
                  <span className="text-[#0F172A]">✅ EMAIL ENVIADO</span>
                ) : (
                  <span className="text-red-600">❌ EMAIL NÃO ENVIADO</span>
                )}
              </div>
              <p className="text-sm text-blue-600 text-center mt-2">
                Baseado em: emailEnviado === true ({String(emailEnviado === true)})
              </p>
            </div>

            {/* Cenário 1: Email Enviado */}
            <div
              className={`p-4 rounded-lg border-2 ${mostrarComoEnviado ? "border-green-500 bg-[#7BD9F6] bg-opacity-20" : "border-gray-300 bg-gray-50"}`}
            >
              <h4 className="font-semibold mb-2">
                ✅ Cenário: Email Enviado {mostrarComoEnviado ? "(ATIVO)" : "(INATIVO)"}
              </h4>
              {mostrarComoEnviado ? (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[#0F172A]" />
                  <div>
                    <p className="font-medium text-[#0F172A]">✅ Email enviado com sucesso!</p>
                    <p className="text-sm text-[#0F172A]">
                      O cliente {nomeCliente} recebeu o link por email em: {emailCliente}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Este cenário seria mostrado se emailEnviado === true</p>
              )}
            </div>

            {/* Cenário 2: Email NÃO Enviado */}
            <div
              className={`p-4 rounded-lg border-2 ${!mostrarComoEnviado ? "border-amber-500 bg-amber-50" : "border-gray-300 bg-gray-50"}`}
            >
              <h4 className="font-semibold mb-2">
                ⚠️ Cenário: Email NÃO Enviado {!mostrarComoEnviado ? "(ATIVO)" : "(INATIVO)"}
              </h4>
              {!mostrarComoEnviado ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">⚠️ Email não foi enviado automaticamente</p>
                      <p className="text-sm text-amber-600">
                        Você precisará enviar o link manualmente para {emailCliente}
                      </p>
                    </div>
                  </div>

                  {onEnviarEmail && (
                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={tentarEnviarEmail}
                        disabled={enviandoEmail}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {enviandoEmail ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Enviando Email...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Tentar Enviar Email
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Este cenário seria mostrado se emailEnviado !== true</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações Manuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ações Manuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={copiarLink} variant="outline" className="h-12 bg-transparent">
              <Copy className="h-5 w-5 mr-2" />
              Copiar Link
            </Button>

            <Button
              onClick={() => window.open(linkProposta, "_blank")}
              variant="outline"
              className="h-12 bg-transparent"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Abrir Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Props */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Histórico de Props (Últimas {propsHistory.length} renderizações)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-xs">
            {propsHistory.map((entry, index) => (
              <div key={index} className="mb-2 border-b border-gray-700 pb-2">
                <div className="text-yellow-400 font-bold">
                  Renderização #{entry.renderizacao} - {entry.timestamp}
                </div>
                <div className="text-green-400 mt-1">
                  emailEnviado: {String(entry.props.emailEnviado)} ({typeof entry.props.emailEnviado})
                </div>
                <div className="text-green-400">
                  statusVerificado: {String(entry.props.statusVerificado)} ({typeof entry.props.statusVerificado})
                </div>
                <div className="text-green-400">propostaId: {entry.props.propostaId}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Link da Proposta */}
      <Card>
        <CardHeader>
          <CardTitle>🔗 Link da Proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Link para o cliente:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white p-2 rounded border text-sm break-all">{linkProposta}</code>
              <Button onClick={copiarLink} size="sm" variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Detalhado */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-sm text-red-600">🚨 Debug Crítico - Status do Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-red-500 space-y-2">
            <div className="bg-red-50 p-3 rounded">
              <p>
                <strong>PROBLEMA:</strong> Email é enviado com sucesso mas Step8 não mostra como enviado
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <p>
                <strong>ANÁLISE:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>
                  emailEnviado prop: {String(emailEnviado)} ({typeof emailEnviado})
                </li>
                <li>emailEnviado === true: {String(emailEnviado === true)}</li>
                <li>Condição para mostrar enviado: {String(mostrarComoEnviado)}</li>
                <li>Estado interno: {String(estadoInterno.emailEnviadoInterno)}</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p>
                <strong>TESTE:</strong> Use os botões Toggle no topo para testar mudanças de estado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
