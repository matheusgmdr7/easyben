"use client"

import { useState, useEffect } from "react"
import { obterProposta } from "@/services/propostas-digital-service"
import { obterModeloProposta, obterModeloPropostaPorTitulo } from "@/services/proposta-modelos-service"
import { PropostaHTMLService } from "@/services/proposta-html-service"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import PDFGenerator from "@/components/proposta-digital/pdf-generator" // NOVO: Import do PDFGenerator

interface Step6PDFPreviewProps {
  propostaId: string | null
  onNext: () => void
  onBack: () => void
}

export default function Step6PDFPreview({ propostaId, onNext, onBack }: Step6PDFPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proposta, setProposta] = useState<any>(null)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionario, setQuestionario] = useState<any[]>([])
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [valorTotalMensal, setValorTotalMensal] = useState<string>("") // NOVO: Valor total mensal calculado

  // NOVA: Função para calcular valor total mensal igual ao ValorTotalDisplay
  const calcularValorTotalMensal = (proposta: any, dependentes: any[]) => {
    let total = 0
    
    // Valor do titular
    const valorPlano = proposta.valor_plano || proposta.valor_mensal || proposta.valor || "0,00"
    if (valorPlano) {
      const valorNumerico = Number.parseFloat(String(valorPlano).replace(/[^\d,]/g, "").replace(",", "."))
      if (!isNaN(valorNumerico)) {
        total += valorNumerico
      }
    }
    
    // Valores dos dependentes
    if (dependentes && dependentes.length > 0) {
      dependentes.forEach((dep: any) => {
        if (dep.valor_individual) {
          const valorDep = Number.parseFloat(String(dep.valor_individual).replace(/[^\d,]/g, "").replace(",", "."))
          if (!isNaN(valorDep)) {
            total += valorDep
          }
        }
      })
    }
    
    const valorTotalFormatado = total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    console.log("💰 Step6PDFPreview - Valor total mensal calculado:", valorTotalFormatado, "(total:", total, ")")
    return valorTotalFormatado
  }

  // Função para verificar e corrigir o template_id se necessário
  const verificarTemplateId = async () => {
    if (!propostaId) return

    try {
      setLoading(true)
      console.log("Verificando template_id/modelo_id da proposta:", propostaId)

      // Buscar a proposta
      const proposta = await obterProposta(propostaId)

      if (!proposta) {
        console.error("Proposta não encontrada")
        setError("Proposta não encontrada. Por favor, tente novamente.")
        return
      }

      console.log("Proposta carregada:", JSON.stringify(proposta))
      setProposta(proposta)

      // Verificar se a proposta tem modelo_id (campo no banco de dados)
      // ou template_id (campo usado no frontend)
      const templateId = proposta.modelo_id || proposta.template_id
      const templateTitulo = proposta.template_titulo

      if (!templateId && templateTitulo) {
        console.log("Proposta sem modelo_id/template_id, mas com título:", templateTitulo)

        // Buscar o modelo pelo título
        const modelo = await obterModeloPropostaPorTitulo(templateTitulo)

        if (modelo) {
          console.log("Modelo encontrado pelo título:", modelo.id)

          // Atualizar a proposta com o modelo_id correto
          const { error } = await supabase.from("propostas").update({ modelo_id: modelo.id }).eq("id", propostaId)

          if (error) {
            console.error("Erro ao atualizar modelo_id da proposta:", error)
          } else {
            console.log("Modelo_id da proposta atualizado com sucesso")
          }
        } else {
          console.warn("Não foi possível encontrar um modelo pelo título")
        }
      } else if (templateId) {
        console.log("Proposta já tem modelo_id/template_id:", templateId)

        // Verificar se o modelo existe
        const modelo = await obterModeloProposta(templateId)

        if (!modelo) {
          console.warn("Modelo não encontrado com o ID fornecido, tentando pelo título")

          if (templateTitulo) {
            const modeloPorTitulo = await obterModeloPropostaPorTitulo(templateTitulo)

            if (modeloPorTitulo) {
              console.log("Modelo encontrado pelo título:", modeloPorTitulo.id)

              // Atualizar a proposta com o modelo_id correto
              const { error } = await supabase
                .from("propostas")
                .update({ modelo_id: modeloPorTitulo.id })
                .eq("id", propostaId)

              if (error) {
                console.error("Erro ao atualizar modelo_id da proposta:", error)
              } else {
                console.log("Modelo_id da proposta atualizado com sucesso")
              }
            }
          }
        }
      } else {
        console.warn("Proposta sem modelo_id/template_id e sem título.")
      }

      // Carregar dependentes com mais detalhes
      console.log("🔍 Carregando dependentes para proposta:", propostaId)
      const { data: dependentesData, error: dependentesError } = await supabase
        .from("dependentes")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("created_at", { ascending: true })

      if (dependentesError) {
        console.error("❌ Erro ao carregar dependentes:", dependentesError)
      } else {
        console.log("✅ Dependentes carregados:", dependentesData?.length || 0, dependentesData)
        setDependentes(dependentesData || [])
        
        // NOVO: Calcular valor total mensal após carregar dependentes
        const valorTotal = calcularValorTotalMensal(proposta, dependentesData || [])
        setValorTotalMensal(valorTotal)
      }

      // Carregar questionário de saúde
      console.log("🔍 Carregando questionário de saúde para proposta:", propostaId)
      const { data: questionarioData, error: questionarioError } = await supabase
        .from("questionario_saude")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("pergunta_id", { ascending: true })

      if (questionarioError) {
        console.error("❌ Erro ao carregar questionário:", questionarioError)
      } else {
        console.log("✅ Questionário carregado:", questionarioData?.length || 0, questionarioData)
        setQuestionario(questionarioData || [])
      }

      // Gerar HTML da proposta
      await gerarHTML(proposta, dependentesData || [], questionarioData || [])
    } catch (error) {
      console.error("Erro ao carregar dados da proposta:", error)
      setError(`Não foi possível carregar os dados da proposta: ${error.message || "Erro desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }

  const gerarHTML = async (propostaData, dependentesData, questionarioData) => {
    try {
      console.log("Gerando HTML da proposta")

      // Verificar se temos todos os dados necessários
      if (!propostaData) {
        throw new Error("Dados da proposta não disponíveis para gerar HTML")
      }

      // Gerar HTML usando o serviço
      const html = PropostaHTMLService.generatePropostaHTML(propostaData, dependentesData, questionarioData, false)

      if (!html) {
        throw new Error("Falha ao gerar HTML da proposta")
      }

      console.log("HTML gerado com sucesso")
      setHtmlContent(html)
      return html
    } catch (error) {
      console.error("Erro ao gerar HTML:", error)
      setError(`Não foi possível gerar a visualização do resumo: ${error.message || "Erro desconhecido"}`)
      return null
    }
  }

  useEffect(() => {
    verificarTemplateId()
  }, [propostaId])

  // Componente para visualização HTML
  const HTMLViewer = ({ html }: { html: string }) => {
    if (!html) return null

    return (
      <div className="w-full">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    )
  }

  // Componente para visualização de erro
  const ErrorDisplay = ({ message }) => (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4 text-center">
      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
      <h3 className="text-lg font-medium text-red-800 mb-2">Erro</h3>
      <p className="text-red-700 mb-4">{message}</p>
      <Button onClick={verificarTemplateId} variant="outline" size="sm">
        Tentar novamente
      </Button>
    </div>
  )

  // Renderização quando não há ID de proposta
  if (!propostaId) {
    return <ErrorDisplay message="Não foi possível carregar a proposta. ID da proposta não fornecido." />
  }

  // Renderização principal do componente
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <Spinner className="mb-4" />
        <p className="text-gray-500">Carregando resumo da proposta...</p>
      </div>
    )
  }

  if (error) {
    return <ErrorDisplay message={error} />
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#7BD9F6] bg-opacity-30 mb-3">
          <CheckCircle className="h-6 w-6 text-[#0F172A]" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Resumo da Proposta</h3>
        <p className="text-gray-600 mt-1">Revise os detalhes da sua proposta antes de prosseguir para a assinatura.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {htmlContent ? (
          <HTMLViewer html={htmlContent} />
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <Spinner className="mb-4" />
            <p className="text-gray-500">Gerando resumo da proposta...</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
        <Button type="button" onClick={onBack} variant="outline">
          Voltar e revisar
        </Button>
        <Button type="button" onClick={onNext} className="bg-[#0F172A] hover:bg-[#1E293B]">
          Confirmar e prosseguir
        </Button>
      </div>

      {/* NOVO: Componente PDFGenerator com valor total mensal */}
      {propostaId && valorTotalMensal && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-4">Geração de PDF</h4>
          <PDFGenerator 
            propostaId={propostaId}
            valorTotalMensal={valorTotalMensal}
            onPDFGenerated={(url) => console.log("PDF gerado:", url)}
            onError={(error) => console.error("Erro ao gerar PDF:", error)}
          />
        </div>
      )}
    </div>
  )
}
