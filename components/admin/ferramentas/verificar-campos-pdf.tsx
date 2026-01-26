"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PDFService } from "@/services/pdf-service"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, CheckCircle, FileText, Search } from "lucide-react"

export function VerificarCamposPDF() {
  const [pdfUrl, setPdfUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{
    temCampos: boolean
    totalCampos: number
    campos: string[]
    erro?: string
  } | null>(null)

  const verificarCampos = async () => {
    if (!pdfUrl) {
      alert("Por favor, insira a URL do PDF")
      return
    }

    try {
      setLoading(true)
      setResultado(null)

      const resultado = await PDFService.verificarCamposFormulario(pdfUrl)
      setResultado(resultado)
    } catch (error) {
      console.error("Erro ao verificar campos:", error)
      setResultado({
        temCampos: false,
        totalCampos: 0,
        campos: [],
        erro: error.message || "Erro desconhecido ao verificar campos",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Verificar Campos de Formulário PDF</CardTitle>
        <CardDescription>
          Esta ferramenta verifica se um PDF tem campos de formulário e lista os campos disponíveis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pdf-url" className="text-sm font-medium">
              URL do PDF
            </label>
            <div className="flex gap-2">
              <Input
                id="pdf-url"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://exemplo.com/modelo.pdf"
                className="flex-1"
              />
              <Button onClick={verificarCampos} disabled={loading || !pdfUrl}>
                {loading ? <Spinner className="h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Verificar
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Insira a URL completa do PDF que deseja verificar. A URL deve ser acessível publicamente.
            </p>
          </div>

          {resultado && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Resultado da Verificação</h3>

              {resultado.erro ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Erro ao verificar PDF</h4>
                      <p className="text-sm text-red-700 mt-1">{resultado.erro}</p>
                    </div>
                  </div>
                </div>
              ) : resultado.temCampos ? (
                <div className="space-y-4">
                  <div className="bg-[#7BD9F6] bg-opacity-20 border border-[#7BD9F6] border-opacity-30 rounded-md p-4">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-[#0F172A] mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-[#0F172A]">PDF tem campos de formulário</h4>
                        <p className="text-sm text-[#0F172A] mt-1">
                          Este PDF contém {resultado.totalCampos} campos de formulário que podem ser preenchidos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Campos disponíveis:</h4>
                    <div className="bg-gray-50 border rounded-md p-4 max-h-60 overflow-y-auto">
                      <ul className="space-y-1">
                        {resultado.campos.map((campo, index) => (
                          <li key={index} className="text-sm font-mono">
                            {campo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <FileText className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Próximos passos</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Verifique se os nomes dos campos correspondem aos nomes esperados pelo sistema. Se necessário,
                          atualize o PDF ou o código para garantir a compatibilidade.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">PDF sem campos de formulário</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Este PDF não contém campos de formulário que possam ser preenchidos. Considere criar um novo PDF
                        com campos de formulário ou usar o PDF alternativo gerado pelo sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">Esta ferramenta usa a biblioteca pdf-lib para analisar o PDF.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Reiniciar
        </Button>
      </CardFooter>
    </Card>
  )
}
