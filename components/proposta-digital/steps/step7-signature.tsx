"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, PenTool, RotateCcw, AlertCircle, Smartphone, Mouse, Lock, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Step7SignatureProps {
  onNext: () => void
  onPrev: () => void
  onFinalizar: () => void
  formData: any
  updateFormData: (data: any) => void
  proposta?: any // Adicionar dados da proposta
}

export default function Step7Signature({ onNext, onPrev, onFinalizar, formData, updateFormData, proposta }: Step7SignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [declaracaoAceita, setDeclaracaoAceita] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  useEffect(() => {
    // Detectar se é dispositivo móvel
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevenir scroll quando modal estiver aberto no mobile
  useEffect(() => {
    if (showSignatureModal && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [showSignatureModal, isMobile])

  // Bloquear scroll/zoom do body enquanto o modal está aberto no mobile
  useEffect(() => {
    if (showSignatureModal && isMobile) {
      document.body.style.overflow = 'hidden'
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) e.preventDefault()
      }
      document.addEventListener('touchmove', preventZoom, { passive: false })
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('touchmove', preventZoom)
      }
    }
  }, [showSignatureModal, isMobile])

  // Ajustar e resetar o canvas ao abrir o modal
  useEffect(() => {
    if (!showSignatureModal) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight * 0.6
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    if (signaturePreview) {
      const img = new window.Image()
      img.onload = () => ctx?.drawImage(img, 0, 0, width, height)
      img.src = signaturePreview
    }
  }, [showSignatureModal])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setupCanvas = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Obter dimensões do container
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      // Configurar dimensões físicas do canvas
      canvas.width = rect.width * dpr
      canvas.height = (isMobile ? 120 : 150) * dpr

      // Configurar dimensões CSS
      canvas.style.width = rect.width + 'px'
      canvas.style.height = (isMobile ? 120 : 150) + 'px'

      // Escalar contexto para alta resolução
      ctx.scale(dpr, dpr)

      // Configurar estilo de desenho otimizado
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = isMobile ? 2.5 : 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.globalCompositeOperation = "source-over"

      // Fundo branco
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, rect.width, isMobile ? 120 : 150)

      console.log("🎨 Canvas configurado:", {
        width: canvas.width,
        height: canvas.height,
        dpr,
        isMobile,
        rect: { width: rect.width, height: rect.height }
      })
    }

    // Aguardar um frame para garantir que o canvas está renderizado
    requestAnimationFrame(setupCanvas)

    // Carregar assinatura existente se houver
    if (formData && formData.assinatura_imagem) {
      setSignaturePreview(formData.assinatura_imagem)
      setHasSignature(true)
    }

    if (formData && formData.declaracao_veracidade) {
      setDeclaracaoAceita(true)
    }

    // Reconfigurar canvas quando redimensionar
    const handleResize = () => {
      setTimeout(setupCanvas, 100)
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [formData?.assinatura_imagem, formData?.declaracao_veracidade, isMobile])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if ("touches" in e) {
      e.preventDefault() // Prevenir scroll no mobile
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Calcular coordenadas precisas
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (clientX - rect.left) * scaleX / (window.devicePixelRatio || 1)
    const y = (clientY - rect.top) * scaleY / (window.devicePixelRatio || 1)

    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    
    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(x, y)
    
    console.log("🖊️ Iniciando desenho em:", { x, y })
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.stroke()

    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    
    // Limpar com dimensões corretas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, isMobile ? 120 : 150)
    
    setHasSignature(false)
    
    console.log("🧹 Canvas limpo")
  }

  const saveSignature = async (fromModal = false) => {
    // Salvar assinatura de canvas e coletar IP/user agent
    const canvas = canvasRef.current
    if (!canvas) return

    const dataURL = canvas.toDataURL("image/png")
    let ipAddress = ""
    try {
      const res = await fetch("https://api.ipify.org?format=json")
      const data = await res.json()
      ipAddress = data.ip
    } catch (e) {
      ipAddress = "Não disponível"
    }
    const userAgent = navigator.userAgent
    updateFormData({
      assinatura_imagem: dataURL,
      declaracao_veracidade: declaracaoAceita,
      ip_assinatura: ipAddress,
      user_agent: userAgent,
    })
    if (fromModal) {
      setSignaturePreview(dataURL)
      setShowSignatureModal(false)
    }
  }

  const handleSubmit = async () => {
    if (!hasSignature) {
      toast.error("Por favor, complete sua assinatura")
      return
    }

    if (!declaracaoAceita) {
      toast.error("Você deve aceitar a declaração de veracidade")
      return
    }

    setIsSubmitting(true)

    try {
      // Salvar assinatura
      await saveSignature()

      // Aguardar um momento para garantir que os dados foram salvos
      await new Promise((resolve) => setTimeout(resolve, 500))

      toast.success("Assinatura registrada com sucesso!")
      onFinalizar()
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error)
      toast.error("Erro ao salvar assinatura. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-900 font-sans">
            <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <PenTool className="h-5 w-5 text-white" />
            </div>
            Assinatura Digital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Declaração de Veracidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Declaração de Veracidade</h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm text-gray-700 leading-relaxed">
                Declaro que todas as informações prestadas nesta proposta são verdadeiras e completas. Estou ciente de
                que a omissão ou falsidade de informações pode resultar na perda do direito à cobertura ou no
                cancelamento do contrato. Autorizo a operadora a verificar as informações prestadas e a solicitar exames
                médicos complementares, se necessário.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="declaracao"
                checked={declaracaoAceita}
                onCheckedChange={(checked) => setDeclaracaoAceita(checked as boolean)}
              />
              <label
                htmlFor="declaracao"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Li e aceito a declaração de veracidade acima
              </label>
            </div>
          </div>

          {/* Campo de Assinatura Manual (canvas) - ocupa toda a tela no mobile */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sua Assinatura</h3>
              <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
            {isMobile ? (
              <>
                {signaturePreview ? (
                  <div className="flex flex-col items-center">
                    <img src={signaturePreview} alt="Prévia da assinatura" className="border rounded w-full max-w-xs bg-white" />
                    <Button className="mt-2" onClick={() => setShowSignatureModal(true)}>
                      Refazer Assinatura
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowSignatureModal(true)}>
                    Assinar
                  </Button>
                )}
                <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
                  <DialogContent className="p-0 max-w-full w-screen h-screen flex items-center justify-center bg-white !rounded-none !shadow-none">
                    <DialogTitle className="sr-only">Assinatura Digital</DialogTitle>
                    <DialogDescription className="sr-only">
                      Área para assinar digitalmente o documento usando o dedo ou caneta
                    </DialogDescription>
                    <div className="w-full h-full flex flex-col">
                      {/* Header do modal */}
                      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Assine aqui</h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Use o dedo ou caneta para assinar no espaço abaixo
                        </p>
                      </div>

                      {/* Área de assinatura */}
                      <div className="flex-1 relative">
                        <canvas
                          ref={canvasRef}
                          className="assinatura-canvas"
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            padding: 0,
                            margin: 0,
                            border: 'none',
                            background: '#fff',
                            touchAction: 'none',
                            boxSizing: 'content-box',
                          }}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        
                        {/* Overlay de instruções (visível apenas se não houver assinatura) */}
                        {!hasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white bg-opacity-90 p-4 rounded-lg border border-gray-200 text-center">
                              <PenTool className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600">Toque e arraste para assinar</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botões de ação */}
                      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            onClick={clearSignature}
                            className="flex-1 max-w-[140px] py-4 text-base"
                          >
                            <RotateCcw className="h-5 w-5 mr-2" />
                            Limpar
                          </Button>
                          <Button 
                            onClick={() => saveSignature(true)}
                            className="flex-1 max-w-[140px] py-4 text-base"
                            disabled={!hasSignature}
                          >
                            Salvar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowSignatureModal(false)}
                            className="flex-1 max-w-[140px] py-4 text-base"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white shadow-sm hover:border-[#0F172A] transition-colors">
                <div className="p-4 sm:p-6">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                      {isMobile ? (
                        <>
                          <Smartphone className="h-4 w-4 text-[#0F172A]" />
                          <span>Assine com o dedo na área abaixo</span>
                        </>
                      ) : (
                        <>
                          <Mouse className="h-4 w-4 text-[#0F172A]" />
                          <span>Assine com o mouse na área abaixo</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-2">
                    <canvas
                      ref={canvasRef}
                      className="assinatura-canvas w-full"
                      style={{
                        height: isMobile ? '120px' : '150px',
                        display: 'block',
                        background: '#ffffff',
                        touchAction: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'crosshair'
                      }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearSignature}
                      className="btn-corporate-sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                    
                    {hasSignature && (
                      <div className="flex items-center gap-2 text-sm text-[#0F172A] font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Assinatura capturada
                      </div>
                    )}
                  </div>
                  
                  {!hasSignature && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Como assinar:</p>
                          <ul className="text-xs space-y-1">
                            {isMobile ? (
                              <>
                                <li>• Use o dedo para desenhar sua assinatura</li>
                                <li>• Mantenha o dispositivo estável</li>
                                <li>• Assine de forma legível</li>
                              </>
                            ) : (
                              <>
                                <li>• Clique e arraste para desenhar</li>
                                <li>• Use movimentos suaves</li>
                                <li>• Assine de forma legível</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!hasSignature && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sua assinatura é obrigatória para finalizar a proposta. Por favor, complete sua assinatura no campo acima.
              </AlertDescription>
            </Alert>
          )}

          {/* Informações sobre Assinatura Digital */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Sobre a Assinatura Digital</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Sua assinatura digital tem a mesma validade jurídica de uma assinatura manuscrita</li>
              <li>• Os dados são criptografados e armazenados com segurança</li>
              <li>• A assinatura será anexada ao documento final da proposta</li>
              <li>• Você receberá uma cópia da proposta assinada por email</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Navegação Corporativos */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev} 
            className="w-full sm:w-auto btn-corporate"
          >
            Voltar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasSignature || !declaracaoAceita || isSubmitting}
            className="w-full sm:w-auto bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold btn-corporate shadow-corporate disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="loading-corporate-small mr-2"></div>
                Finalizando...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Finalizar Proposta
              </>
            )}
          </Button>
        </div>
        
        {(!hasSignature || !declaracaoAceita) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                {!hasSignature && !declaracaoAceita 
                  ? "⚠️ Complete sua assinatura e aceite a declaração para finalizar"
                  : !hasSignature 
                  ? "⚠️ Sua assinatura é obrigatória para finalizar a proposta"
                  : "⚠️ Aceite a declaração de veracidade para continuar"
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
