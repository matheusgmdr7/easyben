"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, X, Check } from "lucide-react"
import { toast } from "sonner"

const documentosObrigatorios = [
  {
    key: "rg_frente",
    label: "RG (Frente)",
    description: "Foto ou digitalização da frente do RG",
    required: true,
  },
  {
    key: "rg_verso",
    label: "RG (Verso)",
    description: "Foto ou digitalização do verso do RG",
    required: true,
  },
  {
    key: "cpf",
    label: "CPF",
    description: "Foto ou digitalização do CPF",
    required: true,
  },
  {
    key: "comprovante_residencia",
    label: "Comprovante de Residência",
    description: "Conta de luz, água, telefone ou similar (máx. 3 meses)",
    required: true,
  },
  {
    key: "cns",
    label: "Cartão Nacional de Saúde (CNS)",
    description: "Opcional - se possuir",
    required: false,
  },
]

export default function Step4Documents() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  const documentos = watch("documentos") || {}

  const handleFileUpload = async (key: string, file: File) => {
    if (!file) return

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.")
      return
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB permitido.")
      return
    }

    try {
      setUploadingFiles((prev) => ({ ...prev, [key]: true }))

      // Apenas armazenar o arquivo no estado do formulário
      // O upload real será feito quando a proposta for salva
      setValue(`documentos.${key}`, file)

      toast.success(`${documentosObrigatorios.find((d) => d.key === key)?.label} carregado com sucesso!`)
    } catch (error) {
      console.error(`Erro ao processar arquivo ${key}:`, error)
      toast.error(`Erro ao processar ${documentosObrigatorios.find((d) => d.key === key)?.label}`)
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [key]: false }))
    }
  }

  const removeFile = (key: string) => {
    setValue(`documentos.${key}`, null)
    toast.success("Arquivo removido")
  }

  const getFileDisplayName = (file: File) => {
    if (file.name.length > 30) {
      return file.name.substring(0, 27) + "..."
    }
    return file.name
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Documentos Obrigatórios</h2>
        <p className="text-gray-600">Faça o upload dos documentos necessários para sua proposta</p>
      </div>

      <div className="grid gap-6">
        {documentosObrigatorios.map((doc) => {
          const file = documentos[doc.key]
          const isUploading = uploadingFiles[doc.key]
          const hasError = errors?.documentos?.[doc.key]

          return (
            <Card key={doc.key} className={`transition-all ${hasError ? "border-red-300 bg-red-50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {doc.label}
                      {doc.required && <span className="text-red-500">*</span>}
                    </CardTitle>
                    <CardDescription>{doc.description}</CardDescription>
                  </div>
                  {file && (
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Check className="h-5 w-5" />
                      <span className="text-sm font-medium">Carregado</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {!file ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Clique para selecionar ou arraste o arquivo aqui</p>
                        <p className="text-xs text-gray-500">JPG, PNG ou PDF (máx. 5MB)</p>
                      </div>
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0]
                          if (selectedFile) {
                            handleFileUpload(doc.key, selectedFile)
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                    </div>

                    {hasError && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <X className="h-4 w-4" />
                        {hasError.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-[#7BD9F6] bg-opacity-20 border border-[#7BD9F6] border-opacity-30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-[#0F172A]" />
                      <div>
                        <p className="font-medium text-[#0F172A]">{getFileDisplayName(file)}</p>
                        <p className="text-sm text-[#0F172A]">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(doc.key)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {isUploading && (
                  <div className="mt-2 flex items-center gap-2 text-blue-600">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Processando arquivo...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Dicas importantes:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Certifique-se de que os documentos estejam legíveis</li>
              <li>• Fotos devem ter boa iluminação e foco</li>
              <li>• Documentos digitalizados devem ter boa resolução</li>
              <li>• Todos os campos dos documentos devem estar visíveis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
