"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Users,
  FileText,
  RefreshCw,
  Building
} from "lucide-react"
import { toast } from "sonner"

export default function ImportarAsaasPage() {
  const router = useRouter()
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  const administradoraId = "a7b5b2d5-0e8f-4905-8917-4b95dc98d20f" // clube ben

  const handleImportar = async () => {
    try {
      setImportando(true)
      
      console.log("🚀 Iniciando importação do Asaas...")
      console.log("📋 Administradora ID:", administradoraId)
      
      toast.info("Iniciando importação... Isso pode levar alguns minutos")

      // Chamar API route do servidor (evita CORS)
      console.log("📡 Chamando API /api/importar-asaas...")
      const response = await fetch('/api/importar-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          administradora_id: administradoraId
        })
      })

      console.log("📊 Status da resposta:", response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error("❌ Erro na resposta:", error)
        throw new Error(error.error || 'Erro ao importar')
      }

      const resultado = await response.json()
      
      console.log("✅ Resultado da importação:", resultado)
      
      setResultado(resultado)

      if (resultado.clientes_importados > 0) {
        console.log(`✅ ${resultado.clientes_importados} clientes e ${resultado.faturas_importadas} faturas importadas`)
        toast.success(
          `✅ Importação concluída! ${resultado.clientes_importados} clientes e ${resultado.faturas_importadas} faturas importadas`
        )
      } else if (resultado.erros && resultado.erros.length > 0) {
        console.error("❌ Erros na importação:", resultado.erros)
        toast.error(`❌ Importação com erros: ${resultado.erros[0]}`)
      } else {
        console.warn("⚠️ Nenhum cliente foi importado")
        console.log("📊 Detalhes:", {
          clientes_importados: resultado.clientes_importados,
          clientes_nao_encontrados: resultado.clientes_nao_encontrados,
          faturas_importadas: resultado.faturas_importadas
        })
        toast.warning("⚠️ Nenhum cliente foi importado. Veja o console para mais detalhes.")
      }
    } catch (error: any) {
      console.error("❌ Erro ao importar:", error)
      toast.error(`Erro: ${error.message}`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/admin/financeiro")}
              variant="outline"
              className="border-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Download className="h-6 w-6 text-[#168979]" />
                Importar Dados do Asaas
              </h1>
              <p className="text-gray-600 mt-1">
                Sincronize clientes e faturas existentes no Asaas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Como Funciona a Importação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-3">📋 Processo de Importação:</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Busca todos os <strong>customers</strong> cadastrados no Asaas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Faz <strong>match com clientes do banco</strong> usando CPF</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Salva o <strong>customer_id</strong> do Asaas no banco</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Busca todas as <strong>cobranças (faturas/boletos)</strong> de cada cliente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">5.</span>
                <span>Importa faturas para o banco com <strong>status e links dos boletos</strong></span>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-yellow-900 mb-2">⚠️ Atenção:</h3>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• Este processo pode levar alguns minutos</li>
              <li>• Não duplica clientes ou faturas (verifica antes de importar)</li>
              <li>• Match é feito por CPF (deve ser exatamente igual)</li>
              <li>• Clientes sem CPF não serão importados</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-900 mb-2">✅ Após a Importação:</h3>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• Todos os boletos aparecerão na página Financeiro</li>
              <li>• Status de pagamento sincronizado</li>
              <li>• Links dos boletos disponíveis</li>
              <li>• Histórico completo de faturas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Importação */}
      <Card>
        <CardHeader>
          <CardTitle>Executar Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <Button
              onClick={handleImportar}
              disabled={importando}
              className="h-14 px-8 bg-gradient-to-r from-[#168979] to-[#13786a] hover:from-[#13786a] hover:to-[#0f6b5c] text-white font-bold shadow-lg text-lg"
            >
              {importando ? (
                <div className="flex items-center gap-3">
                  <div className="loading-corporate-small"></div>
                  Importando...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5" />
                  Importar Clientes e Faturas do Asaas
                </div>
              )}
            </Button>

            <p className="text-sm text-gray-500 text-center">
              Clique para iniciar a importação dos dados existentes no Asaas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {resultado.clientes_importados}
                      </p>
                      <p className="text-sm text-green-700">Clientes Importados</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        {resultado.faturas_importadas}
                      </p>
                      <p className="text-sm text-blue-700">Faturas Importadas</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {resultado.clientes_nao_encontrados}
                      </p>
                      <p className="text-sm text-yellow-700">Não Encontrados</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Erros */}
              {resultado.erros.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Erros Encontrados ({resultado.erros.length})
                  </h4>
                  <div className="space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto">
                    {resultado.erros.slice(0, 10).map((erro: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span>{erro}</span>
                      </div>
                    ))}
                    {resultado.erros.length > 10 && (
                      <p className="text-red-600 font-semibold mt-2">
                        ... e mais {resultado.erros.length - 10} erros
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem de Sucesso */}
              {resultado.clientes_importados > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-900 font-semibold">
                    ✅ Importação concluída com sucesso!
                  </p>
                  <p className="text-sm text-green-700 mt-2">
                    Acesse a <strong>página Financeiro</strong> para ver todas as faturas importadas.
                  </p>
                  <Button
                    onClick={() => router.push("/admin/financeiro")}
                    className="mt-4 bg-[#168979] hover:bg-[#13786a]"
                  >
                    Ver Faturas
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
