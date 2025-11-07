"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, Download, FileText } from "lucide-react"
import { obterUrlDocumento } from "@/services/storage-service"

interface VisualizadorDocumentosProps {
  propostaId: string
  documentos: Array<{
    id: string
    nome: string
    tipo: string
    url?: string
  }>
}

export default function VisualizadorDocumentos({ propostaId, documentos }: VisualizadorDocumentosProps) {
  const [docsComUrl, setDocsComUrl] = useState<Array<{ id: string; nome: string; tipo: string; url: string }>>([])
  const [carregando, setCarregando] = useState(true)
  const [documentoAtivo, setDocumentoAtivo] = useState<string | null>(null)

  useEffect(() => {
    const carregarUrls = async () => {
      try {
        setCarregando(true)

        // Para cada documento, obter a URL pública
        const docsProcessados = await Promise.all(
          documentos.map(async (doc) => {
            try {
              // Se já tiver URL, usar a existente
              if (doc.url) return { ...doc, url: doc.url }

              // Caso contrário, obter do storage
              const url = await obterUrlDocumento(propostaId, doc.nome)
              return { ...doc, url }
            } catch (error) {
              console.error(`Erro ao obter URL para documento ${doc.nome}:`, error)
              return { ...doc, url: "" }
            }
          }),
        )

        setDocsComUrl(docsProcessados.filter((doc) => doc.url) as any)

        // Definir o primeiro documento como ativo, se houver
        if (docsProcessados.length > 0 && docsProcessados[0].url) {
          setDocumentoAtivo(docsProcessados[0].id)
        }
      } catch (error) {
        console.error("Erro ao carregar URLs dos documentos:", error)
      } finally {
        setCarregando(false)
      }
    }

    if (documentos && documentos.length > 0) {
      carregarUrls()
    } else {
      setCarregando(false)
    }
  }, [documentos, propostaId])

  // Função para obter o documento ativo
  const getDocumentoAtivo = () => {
    return docsComUrl.find((doc) => doc.id === documentoAtivo)
  }

  // Função para baixar o documento
  const baixarDocumento = (url: string, nome: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = nome
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Lista de documentos */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : docsComUrl.length > 0 ? (
              <div className="space-y-2">
                {docsComUrl.map((doc) => (
                  <Button
                    key={doc.id}
                    variant={documentoAtivo === doc.id ? "default" : "outline"}
                    className="w-full justify-start text-left"
                    onClick={() => setDocumentoAtivo(doc.id)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="truncate">{doc.nome}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum documento disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visualizador de documento */}
      <div className="md:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-row flex items-center justify-between">
            <CardTitle className="text-lg">{getDocumentoAtivo()?.nome || "Visualizador de Documento"}</CardTitle>
            {getDocumentoAtivo() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => baixarDocumento(getDocumentoAtivo()!.url, getDocumentoAtivo()!.nome)}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {carregando ? (
              <div className="w-full h-[400px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : getDocumentoAtivo() ? (
              <div className="w-full h-[400px] overflow-hidden flex items-center justify-center">
                {getDocumentoAtivo()?.tipo?.includes("image") ? (
                  <img
                    src={getDocumentoAtivo()?.url || "/placeholder.svg"}
                    alt={getDocumentoAtivo()?.nome}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : getDocumentoAtivo()?.tipo?.includes("pdf") ? (
                  <iframe src={getDocumentoAtivo()?.url} className="w-full h-full" title={getDocumentoAtivo()?.nome} />
                ) : (
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p>Este tipo de arquivo não pode ser visualizado diretamente.</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => baixarDocumento(getDocumentoAtivo()!.url, getDocumentoAtivo()!.nome)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Arquivo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>Selecione um documento para visualizar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { VisualizadorDocumentos as VisualizarDocumentos }
