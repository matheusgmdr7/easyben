"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, ArrowLeft, FileText, User, Calendar, DollarSign, Users } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface PropostaData {
  id: string
  nome: string
  email: string
  telefone: string
  produto_nome?: string
  valor_mensal: number
  valor?: number // Adicionado para cálculo correto
  status: string
  created_at: string
  pdf_url?: string
  dependentes_dados?: any[] // Adicionado para suportar o novo cálculo
  dependentes?: any[] // Adicionado para suportar o novo cálculo
}

export default function SucessoPage() {
  const searchParams = useSearchParams()
  const propostaId = searchParams.get("id")
  const [proposta, setProposta] = useState<PropostaData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [valorTotalMensal, setValorTotalMensal] = useState<number>(0)
  const [detalhesValores, setDetalhesValores] = useState<any[]>([])
  const [dependentes, setDependentes] = useState<any[]>([])

  useEffect(() => {
    if (propostaId) {
      carregarProposta()
    } else {
      setCarregando(false)
    }
  }, [propostaId])

  useEffect(() => {
    if (proposta) {
      // Sempre tentar carregar dependentes, mesmo se tem_dependentes for false
      let dependentesArr: any[] = []
      if (proposta.dependentes_dados && Array.isArray(proposta.dependentes_dados) && proposta.dependentes_dados.length > 0) {
        dependentesArr = proposta.dependentes_dados
      } else if (typeof proposta.dependentes === "string" && proposta.dependentes && (proposta.dependentes as string).length > 0) {
        try {
          dependentesArr = JSON.parse(proposta.dependentes as string)
        } catch {}
      } else if (Array.isArray(proposta.dependentes) && proposta.dependentes && (proposta.dependentes as any[]).length > 0) {
        dependentesArr = proposta.dependentes
      }
      setDependentes(dependentesArr)

      // Calcular valor total
      let total = 0
      const detalhes: any[] = []
      // Valor do titular
      let valorTitular = proposta.valor_mensal || proposta.valor || 0
      if (typeof valorTitular !== "number") {
        const valorStr = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".")
        valorTitular = Number.parseFloat(valorStr)
      }
      if (!isNaN(valorTitular) && valorTitular > 0) {
        total += valorTitular
        detalhes.push({ nome: proposta.nome, valor: valorTitular, tipo: "titular" })
      }
      // Valores dos dependentes
      if (dependentesArr && dependentesArr.length > 0) {
        dependentesArr.forEach((dep, idx) => {
          let valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
          if (typeof valorDep !== "number") {
            valorDep = String(valorDep).replace(/[^\d,\.]/g, "").replace(",", ".")
            valorDep = Number.parseFloat(valorDep)
          }
          if (!isNaN(valorDep) && valorDep > 0) {
            total += valorDep
            detalhes.push({ nome: dep.nome || `Dependente ${idx + 1}`, valor: valorDep, tipo: "dependente", parentesco: dep.parentesco })
          }
        })
      }
      setValorTotalMensal(total)
      setDetalhesValores(detalhes)
    }
  }, [proposta])

  const carregarProposta = async () => {
    try {
      console.log("🔍 Carregando proposta:", propostaId)

      const { data, error } = await supabase.from("propostas").select("*").eq("id", propostaId).single()

      if (error) {
        console.error("❌ Erro ao carregar proposta:", error)
        toast.error("Erro ao carregar dados da proposta")
        return
      }

      if (data) {
        console.log("✅ Proposta carregada:", data)
        setProposta(data)
      }
    } catch (error) {
      console.error("❌ Erro geral:", error)
      toast.error("Erro ao carregar proposta")
    } finally {
      setCarregando(false)
    }
  }

  const handleDownloadPDF = () => {
    if (proposta?.pdf_url) {
      window.open(proposta.pdf_url, "_blank")
    } else {
      toast.error("PDF não disponível")
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da proposta...</p>
        </div>
      </div>
    )
  }

  if (!propostaId || !proposta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-6">
            <div className="text-red-500 mb-4">
              <FileText className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Proposta não encontrada</h1>
            <p className="text-gray-600 mb-4">
              Não foi possível encontrar os dados da proposta. Verifique o link ou entre em contato conosco.
            </p>
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header de Sucesso - Mobile Optimized */}
          <Card className="mb-4 sm:mb-6 border-[#7BD9F6] border-opacity-30 bg-[#7BD9F6] bg-opacity-20">
            <CardContent className="text-center p-4 sm:p-6 lg:p-8">
              <div className="text-[#0F172A] mb-3 sm:mb-4">
                <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">Proposta Finalizada!</h1>
              <p className="text-[#0F172A] text-base sm:text-lg">Sua proposta foi enviada com sucesso e está sendo analisada.</p>
            </CardContent>
          </Card>

          {/* Informações da Proposta - Mobile Optimized */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Detalhes da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Cliente</p>
                    <p className="font-semibold text-sm sm:text-base truncate">{proposta.nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Data</p>
                    <p className="font-semibold text-sm sm:text-base">{new Date(proposta.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Valor Mensal</p>
                    <p className="font-semibold text-sm sm:text-base lg:text-lg text-[#0F172A]">
                      R$ {valorTotalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Status</p>
                    <p className="font-semibold text-sm sm:text-base text-blue-600 capitalize">{proposta.status}</p>
                  </div>
                </div>
              </div>

              {proposta.produto_nome && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600">Produto Selecionado</p>
                  <p className="font-semibold text-sm sm:text-base">{proposta.produto_nome}</p>
                </div>
              )}

              {/* Exibir detalhamento dos valores se houver dependentes - Mobile Optimized */}
              {detalhesValores.length > 1 && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-[#7BD9F6] bg-opacity-20 rounded-lg">
                  <p className="text-xs sm:text-sm text-[#0F172A] font-semibold mb-2 flex items-center">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
                    Detalhamento dos valores
                  </p>
                  <ul className="text-xs sm:text-sm text-[#0F172A] space-y-1">
                    {detalhesValores.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-start gap-2">
                        <span className="flex-1 min-w-0">
                          <span className="block sm:inline">
                            {item.tipo === "titular" ? "Titular" : item.nome}
                          </span>
                          {item.tipo === "dependente" && item.parentesco ? (
                            <span className="text-xs text-gray-500 block sm:inline sm:ml-1">
                              ({item.parentesco})
                            </span>
                          ) : null}
                        </span>
                        <span className="font-semibold flex-shrink-0">
                          R$ {Number(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações - Mobile Optimized */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">O que acontece agora?</h3>
                <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                  <li>• Sua proposta será analisada pela nossa equipe</li>
                  <li>• Você receberá atualizações por email</li>
                  <li>• O processo de análise pode levar até 2 dias úteis</li>
                  <li>• Em caso de aprovação, você receberá o contrato para assinatura</li>
                </ul>
              </div>

              {proposta.pdf_url && (
                <div className="flex gap-3">
                  <Button 
                    onClick={handleDownloadPDF} 
                    className="flex-1 bg-[#0F172A] hover:bg-[#0F172A] min-h-[44px] sm:min-h-[40px] text-sm sm:text-base"
                  >
                    <Download className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Visualizar PDF da Proposta</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações de Contato - Mobile Optimized */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Precisa de Ajuda?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2 sm:space-y-3">
                <p className="text-gray-600 text-xs sm:text-sm">Se você tiver dúvidas sobre sua proposta, entre em contato conosco:</p>
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    asChild 
                    className="min-h-[44px] sm:min-h-[40px] text-xs sm:text-sm"
                  >
                    <a href="mailto:contato@contratandoplanos.com.br">
                      Email: contato@contratandoplanos.com.br
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botão Voltar - Mobile Optimized */}
          <div className="text-center mt-6 sm:mt-8">
            <Link href="/">
              <Button 
                variant="outline" 
                size="lg" 
                className="min-h-[44px] sm:min-h-[40px] text-sm sm:text-base px-6 sm:px-8"
              >
                <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Voltar ao Início</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
