"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, User, UserCircle, AlertCircle, CheckCircle, RotateCcw, X, ArrowLeft, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface Step6PhotosProps {
  onNext: () => void
  onBack: () => void
  propostaId: string
  onPhotosSaved?: (fotoRosto: string, fotoCorpoInteiro: string) => void
}

export default function Step6Photos({ onNext, onBack, propostaId, onPhotosSaved }: Step6PhotosProps) {
  const [fotoRosto, setFotoRosto] = useState<string | null>(null)
  const [fotoCorpoInteiro, setFotoCorpoInteiro] = useState<string | null>(null)
  const [fotoRostoUrl, setFotoRostoUrl] = useState<string | null>(null)
  const [fotoCorpoInteiroUrl, setFotoCorpoInteiroUrl] = useState<string | null>(null)
  const [capturando, setCapturando] = useState<"rosto" | "corpo" | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [erroCamera, setErroCamera] = useState<string | null>(null)
  const [carregandoFotos, setCarregandoFotos] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Carregar fotos existentes quando o componente for montado
  useEffect(() => {
    const carregarFotosExistentes = async () => {
      try {
        setCarregandoFotos(true)
        const { data, error } = await supabase
          .from("propostas")
          .select("foto_rosto, foto_corpo_inteiro")
          .eq("id", propostaId)
          .single()

        if (error) {
          console.error("Erro ao carregar fotos existentes:", error)
          setCarregandoFotos(false)
          return
        }

        if (data) {
          if (data.foto_rosto) {
            setFotoRostoUrl(data.foto_rosto)
            setFotoRosto(data.foto_rosto) // Usar URL como preview se já existir
          }
          if (data.foto_corpo_inteiro) {
            setFotoCorpoInteiroUrl(data.foto_corpo_inteiro)
            setFotoCorpoInteiro(data.foto_corpo_inteiro) // Usar URL como preview se já existir
          }
        }
      } catch (error) {
        console.error("Erro ao carregar fotos:", error)
      } finally {
        setCarregandoFotos(false)
      }
    }

    if (propostaId) {
      carregarFotosExistentes()
    }
  }, [propostaId])

  // Limpar stream ao desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const pararCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCapturando(null)
  }

  const iniciarCamera = async (tipo: "rosto" | "corpo") => {
    try {
      setErroCamera(null)
      setCapturando(tipo)

      // Parar stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // Solicitar acesso à câmera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: tipo === "rosto" ? "user" : { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (error: any) {
      console.error("Erro ao acessar câmera:", error)
      setErroCamera(
        error.name === "NotAllowedError"
          ? "Permissão para usar a câmera foi negada. Por favor, permita o acesso à câmera nas configurações do navegador."
          : error.name === "NotFoundError"
          ? "Nenhuma câmera encontrada. Por favor, conecte uma câmera e tente novamente."
          : "Erro ao acessar a câmera. Por favor, tente novamente."
      )
      setCapturando(null)
      toast.error("Erro ao acessar a câmera: " + error.message)
    }
  }

  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Configurar dimensões do canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Desenhar frame do vídeo no canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Converter para base64
    const dataURL = canvas.toDataURL("image/jpeg", 0.9)

    if (capturando === "rosto") {
      setFotoRosto(dataURL)
    } else if (capturando === "corpo") {
      setFotoCorpoInteiro(dataURL)
    }

    // Parar câmera
    pararCamera()
    toast.success("Foto capturada com sucesso!")
  }

  const removerFoto = (tipo: "rosto" | "corpo") => {
    if (tipo === "rosto") {
      setFotoRosto(null)
      setFotoRostoUrl(null)
    } else {
      setFotoCorpoInteiro(null)
      setFotoCorpoInteiroUrl(null)
    }
  }

  const salvarFotos = async () => {
    // Se já temos URLs (fotos já salvas), apenas continuar
    if (fotoRostoUrl && fotoCorpoInteiroUrl && !fotoRosto?.startsWith('data:') && !fotoCorpoInteiro?.startsWith('data:')) {
      console.log("✅ Fotos já estão salvas, continuando...")
      if (onPhotosSaved) {
        onPhotosSaved(fotoRostoUrl, fotoCorpoInteiroUrl)
      }
      onNext()
      return
    }

    if (!fotoRosto || !fotoCorpoInteiro) {
      toast.error("Por favor, capture ambas as fotos antes de continuar")
      return
    }

    // Se as fotos são URLs (já salvas), não fazer upload novamente
    if (fotoRosto.startsWith('http') && fotoCorpoInteiro.startsWith('http')) {
      console.log("✅ Fotos já são URLs, atualizando apenas no banco...")
      const { error: updateError } = await supabase
        .from("propostas")
        .update({
          foto_rosto: fotoRosto,
          foto_corpo_inteiro: fotoCorpoInteiro,
        })
        .eq("id", propostaId)

      if (updateError) {
        console.error("Erro ao atualizar proposta com URLs das fotos:", updateError)
        toast.error("Erro ao salvar informações: " + updateError.message)
        setSalvando(false)
        return
      }

      setFotoRostoUrl(fotoRosto)
      setFotoCorpoInteiroUrl(fotoCorpoInteiro)
      toast.success("Fotos salvas com sucesso!")
      
      if (onPhotosSaved) {
        onPhotosSaved(fotoRosto, fotoCorpoInteiro)
      }
      onNext()
      return
    }

    setSalvando(true)

    try {
      // Converter base64 para File
      const dataURLtoFile = (dataurl: string, filename: string): File => {
        const arr = dataurl.split(",")
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg"
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        return new File([u8arr], filename, { type: mime })
      }

      // Preparar arquivos apenas se forem base64
      const fileRosto = fotoRosto.startsWith('data:') ? dataURLtoFile(fotoRosto, `foto-rosto-${propostaId}.jpg`) : null
      const fileCorpo = fotoCorpoInteiro.startsWith('data:') ? dataURLtoFile(fotoCorpoInteiro, `foto-corpo-${propostaId}.jpg`) : null

      // Fazer upload para Supabase Storage apenas se os arquivos foram criados
      let urlRosto = fotoRostoUrl || fotoRosto
      let urlCorpo = fotoCorpoInteiroUrl || fotoCorpoInteiro

      if (fileRosto && fileCorpo) {
        const timestamp = Date.now()
        const pathRosto = `propostas/${propostaId}/fotos/foto-rosto-${timestamp}.jpg`
        const pathCorpo = `propostas/${propostaId}/fotos/foto-corpo-${timestamp}.jpg`

        // Upload foto rosto
        const { data: dataRosto, error: errorRosto } = await supabase.storage
          .from("documentos_propostas")
          .upload(pathRosto, fileRosto, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          })

        if (errorRosto) {
          console.error("Erro ao fazer upload da foto de rosto:", errorRosto)
          throw new Error(`Erro ao salvar foto de rosto: ${errorRosto.message}`)
        }

        // Upload foto corpo inteiro
        const { data: dataCorpo, error: errorCorpo } = await supabase.storage
          .from("documentos_propostas")
          .upload(pathCorpo, fileCorpo, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          })

        if (errorCorpo) {
          console.error("Erro ao fazer upload da foto de corpo inteiro:", errorCorpo)
          throw new Error(`Erro ao salvar foto de corpo inteiro: ${errorCorpo.message}`)
        }

        // Obter URLs públicas
        const { data: urlDataRosto } = supabase.storage
          .from("documentos_propostas")
          .getPublicUrl(pathRosto)

        const { data: urlDataCorpo } = supabase.storage
          .from("documentos_propostas")
          .getPublicUrl(pathCorpo)

        urlRosto = urlDataRosto.publicUrl
        urlCorpo = urlDataCorpo.publicUrl
      }

      // Salvar URLs no banco de dados
      const { error: updateError } = await supabase
        .from("propostas")
        .update({
          foto_rosto: urlRosto,
          foto_corpo_inteiro: urlCorpo,
        })
        .eq("id", propostaId)

      if (updateError) {
        console.error("Erro ao atualizar proposta com URLs das fotos:", updateError)
        throw new Error(`Erro ao salvar informações: ${updateError.message}`)
      }

      setFotoRostoUrl(urlRosto)
      setFotoCorpoInteiroUrl(urlCorpo)

      toast.success("Fotos salvas com sucesso!")
      
      if (onPhotosSaved) {
        onPhotosSaved(urlRosto, urlCorpo)
      }

      // Continuar para próxima etapa
      onNext()
    } catch (error: any) {
      console.error("Erro ao salvar fotos:", error)
      toast.error(error.message || "Erro ao salvar fotos. Tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-900 font-sans">
            <div className="w-10 h-10 bg-[#168979] rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            Captura de Fotos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por favor, capture duas fotos: uma foto de rosto e uma foto de corpo inteiro. 
              Estas fotos serão utilizadas para identificação e análise da proposta.
            </AlertDescription>
          </Alert>

          {/* Foto de Rosto */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-[#168979]" />
                Foto de Rosto
              </h3>
              {fotoRosto && !capturando && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removerFoto("rosto")}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>

            {!fotoRosto && !capturando && (
              <Button
                type="button"
                onClick={() => iniciarCamera("rosto")}
                className="w-full bg-[#168979] hover:bg-[#13786a] text-white"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto de Rosto
              </Button>
            )}

            {capturando === "rosto" && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto max-h-[400px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={capturarFoto}
                    className="flex-1 bg-[#168979] hover:bg-[#13786a] text-white"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capturar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={pararCamera}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {fotoRosto && !capturando && (
              <div className="space-y-2">
                <img
                  src={fotoRosto}
                  alt="Foto de rosto"
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-200"
                />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => iniciarCamera("rosto")}
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refazer Foto
                  </Button>
                </div>
              </div>
            )}

            {erroCamera && capturando === "rosto" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{erroCamera}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6"></div>

          {/* Foto de Corpo Inteiro */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-[#168979]" />
                Foto de Corpo Inteiro
              </h3>
              {fotoCorpoInteiro && !capturando && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removerFoto("corpo")}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>

            {!fotoCorpoInteiro && !capturando && (
              <Button
                type="button"
                onClick={() => iniciarCamera("corpo")}
                className="w-full bg-[#168979] hover:bg-[#13786a] text-white"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto de Corpo Inteiro
              </Button>
            )}

            {capturando === "corpo" && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto max-h-[600px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={capturarFoto}
                    className="flex-1 bg-[#168979] hover:bg-[#13786a] text-white"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capturar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={pararCamera}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {fotoCorpoInteiro && !capturando && (
              <div className="space-y-2">
                <img
                  src={fotoCorpoInteiro}
                  alt="Foto de corpo inteiro"
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-200"
                />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => iniciarCamera("corpo")}
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refazer Foto
                  </Button>
                </div>
              </div>
            )}

            {erroCamera && capturando === "corpo" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{erroCamera}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Canvas oculto para captura */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto btn-corporate"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={salvarFotos}
            disabled={(!fotoRosto || !fotoCorpoInteiro) && (!fotoRostoUrl || !fotoCorpoInteiroUrl) || salvando || carregandoFotos}
            className="w-full sm:w-auto bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate shadow-corporate disabled:opacity-50"
          >
            {carregandoFotos ? (
              <>
                <div className="loading-corporate-small mr-2"></div>
                Carregando...
              </>
            ) : salvando ? (
              <>
                <div className="loading-corporate-small mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {fotoRostoUrl && fotoCorpoInteiroUrl ? "Continuar" : "Salvar Fotos e Continuar"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {carregandoFotos && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Carregando fotos existentes...
              </p>
            </div>
          </div>
        )}

        {!carregandoFotos && (!fotoRosto || !fotoCorpoInteiro) && (!fotoRostoUrl || !fotoCorpoInteiroUrl) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                ⚠️ Por favor, capture ambas as fotos antes de continuar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

