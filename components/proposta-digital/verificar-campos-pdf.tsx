"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PDFService } from "@/services/pdf-service"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, CheckCircle, FileText } from "lucide-react"

export function VerificarCamposPDF() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{
    temCampos: boolean
    totalCampos: number
    campos: string[]
    erro?: string
  } | null>(null)

  const verificarCampos = async () => {
    if (!url) return

    setLoading(true)
    setResultado(null)

    try {
      const resultado = await PDFService.verificarCamposFormulario(url)
      setResultado(resultado)
    } catch (error) {
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
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <h2 className="text-lg font-medium">Verificar Campos de Formulário PDF</h2>
      <p className="text-sm text-gray-600">
        Insira a URL de um PDF para verificar se ele contém campos de formulário preenchíveis.
      </p>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="URL do PDF"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={verificarCampos} disabled={loading || !url}>
          {loading ? <Spinner className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
          Verificar
        </Button>
      </div>

      {resultado && (
        <div className={`p-4 rounded-lg ${resultado.temCampos ? "bg-[#7BD9F6] bg-opacity-20" : "bg-yellow-50"}`}>
          <div className="flex items-start">
            {resultado.temCampos ? (
              <CheckCircle className="h-5 w-5 text-[#0F172A] mt-0.5 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            )}

            <div>
              {resultado.erro ? (
                <p className="text-red-700">{resultado.erro}</p>
              ) : (
                <>
                  <h3 className="font-medium">
                    {resultado.temCampos
                      ? `PDF contém ${resultado.totalCampos} campos de formulário`
                      : "PDF não contém campos de formulário"}
                  </h3>

                  {resultado.temCampos && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Campos encontrados:</p>
                      <ul className="text-xs space-y-1 max-h-40 overflow-y-auto bg-white p-2 rounded border">
                        {resultado.campos.map((campo, index) => (
                          <li key={index} className="font-mono">
                            {campo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!resultado.temCampos && (
                    <p className="text-sm mt-1">
                      Este PDF não pode ser preenchido automaticamente. Você precisa criar um PDF com campos de
                      formulário.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
