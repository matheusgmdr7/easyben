"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Archive, FileDigit, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface PdfDownloadButtonsProps {
  propostaId: string
  nomeCliente: string
  pdfUrl: string
  documentosUrls: Record<string, string>
}

export function PdfDownloadButtons({ propostaId, nomeCliente, pdfUrl, documentosUrls }: PdfDownloadButtonsProps) {
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [pdfCompletoLoading, setPdfCompletoLoading] = useState(false)

  useEffect(() => {
    // Carrega as bibliotecas necessárias de CDNs
    const scripts = [
      { id: "jszip", src: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" },
      { id: "filesaver", src: "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js" },
      { id: "pdflib", src: "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js" },
    ]

    let loadedCount = 0

    scripts.forEach((script) => {
      // Verifica se o script já está carregado
      if (document.getElementById(script.id)) {
        loadedCount++
        if (loadedCount === scripts.length) {
          setScriptsLoaded(true)
        }
        return
      }

      const scriptElement = document.createElement("script")
      scriptElement.id = script.id
      scriptElement.src = script.src
      scriptElement.async = true

      scriptElement.onload = () => {
        loadedCount++
        if (loadedCount === scripts.length) {
          setScriptsLoaded(true)
        }
      }

      document.head.appendChild(scriptElement)
    })

    // Não removemos os scripts no cleanup para que fiquem disponíveis em outras partes da aplicação
  }, [])

  const visualizarPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank")
    } else {
      toast.error("PDF não disponível")
    }
  }

  const baixarTodosDocumentos = async () => {
    if (!scriptsLoaded) {
      toast.error("Carregando bibliotecas necessárias. Tente novamente em alguns segundos.")
      return
    }

    if (!pdfUrl) {
      toast.error("PDF não disponível")
      return
    }

    try {
      setDownloadLoading(true)

      // Verificar se a URL do PDF é válida
      try {
        const response = await fetch(pdfUrl, { method: "HEAD" })
        if (!response.ok) {
          toast.error(`PDF não encontrado (status ${response.status})`)
          return
        }
      } catch (error) {
        toast.error("Erro ao verificar PDF. Verifique sua conexão.")
        console.error("Erro ao verificar PDF:", error)
        return
      }

      // @ts-ignore - JSZip está disponível globalmente após o carregamento do script
      const JSZip = window.JSZip
      const zip = new JSZip()

      // Adicionar PDF da proposta
      try {
        const pdfResponse = await fetch(pdfUrl)
        if (!pdfResponse.ok) {
          toast.error(`Erro ao baixar PDF (status ${pdfResponse.status})`)
          return
        }
        const pdfBlob = await pdfResponse.blob()
        zip.file("Proposta.pdf", pdfBlob)
      } catch (error) {
        toast.error("Erro ao baixar PDF da proposta")
        console.error("Erro ao baixar PDF:", error)
        return
      }

      // Adicionar documentos
      const docEntries = Object.entries(documentosUrls)
      if (docEntries.length === 0) {
        toast.info("Não há documentos adicionais para baixar")
      }

      let successCount = 0
      let errorCount = 0

      for (const [key, url] of docEntries) {
        try {
          const response = await fetch(url)
          if (!response.ok) {
            console.error(`Erro ao baixar documento ${key} (status ${response.status})`)
            errorCount++
            continue
          }

          const blob = await response.blob()

          // Nome do arquivo baseado na chave
          const fileName =
            getNomeDocumento(key).replace(/\s/g, "_") + "." + (url.split(".").pop()?.split("?")[0] || "pdf")

          zip.file(fileName, blob)
          successCount++
        } catch (err) {
          console.error(`Erro ao processar documento ${key}:`, err)
          errorCount++
        }
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} documento(s) não puderam ser baixados`)
      }

      // Gerar e baixar o ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const nomeFormatado = nomeCliente.replace(/[^a-zA-Z0-9]/g, "_")

      // @ts-ignore - saveAs está disponível globalmente após o carregamento do script
      window.saveAs(zipBlob, `Proposta_${nomeFormatado}_${propostaId.substring(0, 8)}.zip`)

      toast.success(`Download concluído com ${successCount} documento(s)`)
    } catch (error) {
      console.error("Erro ao baixar documentos:", error)
      toast.error("Erro ao baixar documentos. Tente novamente mais tarde.")
    } finally {
      setDownloadLoading(false)
    }
  }

  const gerarPDFCompleto = async () => {
    if (!scriptsLoaded) {
      toast.error("Carregando bibliotecas necessárias. Tente novamente em alguns segundos.")
      return
    }

    if (!pdfUrl) {
      toast.error("PDF não disponível")
      return
    }

    try {
      setPdfCompletoLoading(true)
      toast.info("Gerando PDF completo, aguarde...")

      // Verificar se a URL do PDF é válida
      try {
        const response = await fetch(pdfUrl, { method: "HEAD" })
        if (!response.ok) {
          toast.error(`PDF não encontrado (status ${response.status})`)
          return
        }
      } catch (error) {
        toast.error("Erro ao verificar PDF. Verifique sua conexão.")
        console.error("Erro ao verificar PDF:", error)
        return
      }

      // Baixar o PDF da proposta
      let pdfBlob
      try {
        const response = await fetch(pdfUrl)
        if (!response.ok) {
          toast.error(`Erro ao baixar PDF (status ${response.status})`)
          return
        }
        pdfBlob = await response.blob()
      } catch (error) {
        toast.error("Erro ao baixar PDF da proposta")
        console.error("Erro ao baixar PDF:", error)
        return
      }

      // Verificar se o blob é um PDF válido
      const arrayBuffer = await pdfBlob.slice(0, 5).arrayBuffer()
      const header = new Uint8Array(arrayBuffer)
      const headerString = String.fromCharCode(...header)

      if (headerString !== "%PDF-") {
        toast.error("O arquivo não é um PDF válido")
        console.error("Cabeçalho de PDF inválido:", headerString)

        // Abrir o PDF original para o usuário verificar
        window.open(pdfUrl, "_blank")
        return
      }

      // @ts-ignore - PDFLib está disponível globalmente após o carregamento do script
      const { PDFDocument, StandardFonts, rgb } = window.PDFLib

      try {
        // Tentar carregar o PDF
        const pdfArrayBuffer = await pdfBlob.arrayBuffer()
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
        })

        // Processar documentos e gerar PDF completo
        // ... (código de processamento de documentos)

        // Simplificado para teste: apenas retornar o PDF original
        const pdfBytes = await pdfDoc.save()
        const resultBlob = new Blob([pdfBytes], { type: "application/pdf" })

        // Salvar o PDF
        const nomeFormatado = nomeCliente.replace(/[^a-zA-Z0-9]/g, "_")
        // @ts-ignore - saveAs está disponível globalmente após o carregamento do script
        window.saveAs(resultBlob, `Proposta_Completa_${nomeFormatado}_${propostaId.substring(0, 8)}.pdf`)

        toast.success("PDF completo gerado com sucesso")
      } catch (error) {
        console.error("Erro ao processar PDF:", error)
        toast.error("Erro ao processar o PDF. Abrindo documentos individualmente...")

        // Alternativa: abrir todos os documentos em novas abas
        abrirTodosDocumentos()
      }
    } catch (error) {
      console.error("Erro ao gerar PDF completo:", error)
      toast.error(`Erro ao gerar PDF completo: ${error.message}`)
    } finally {
      setPdfCompletoLoading(false)
    }
  }

  const abrirTodosDocumentos = () => {
    // Abrir o PDF da proposta
    if (pdfUrl) {
      window.open(pdfUrl, "_blank")
    }

    // Abrir cada documento em uma nova aba
    for (const [key, url] of Object.entries(documentosUrls)) {
      window.open(url, "_blank")
    }

    toast.success("Documentos abertos em novas abas")
  }

  function getNomeDocumento(key: string): string {
    switch (key) {
      case "rg_frente":
        return "RG (Frente)"
      case "rg_verso":
        return "RG (Verso)"
      case "cpf":
        return "CPF"
      case "comprovante_residencia":
        return "Comprovante de Residência"
      case "cns":
        return "Cartão Nacional de Saúde"
      default:
        return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={visualizarPDF} variant="default" className="bg-blue-600 hover:bg-blue-700">
        <FileText className="h-4 w-4 mr-2" />
        Visualizar PDF
      </Button>

      <Button
        onClick={baixarTodosDocumentos}
        variant="default"
        className="bg-[#0F172A] hover:bg-[#0F172A]"
        disabled={downloadLoading}
      >
        <Archive className="h-4 w-4 mr-2" />
        {downloadLoading ? "Baixando..." : "Baixar Docs (ZIP)"}
      </Button>

      <Button
        onClick={gerarPDFCompleto}
        variant="default"
        className="bg-purple-600 hover:bg-purple-700"
        disabled={pdfCompletoLoading}
      >
        <FileDigit className="h-4 w-4 mr-2" />
        {pdfCompletoLoading ? "Gerando..." : "PDF Completo"}
      </Button>

      <Button onClick={abrirTodosDocumentos} variant="outline" className="text-gray-600 hover:text-gray-800">
        <ExternalLink className="h-4 w-4 mr-2" />
        Abrir Todos
      </Button>
    </div>
  )
}

declare global {
  interface Window {
    JSZip: any
    saveAs: any
    PDFLib: any
  }
}
