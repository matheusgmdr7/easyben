"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Check, XCircle, Package } from "lucide-react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"
import Step1DetalhesProduto from "./steps/step1-detalhes-produto"
import Step2TabelaPrecos from "./steps/step2-tabela-precos"
import Step3Bonificacao from "./steps/step3-bonificacao"
import Step4Comissionamento from "./steps/step4-comissionamento"
import { toast } from "sonner"
import { criarProdutoCorretor, atualizarProdutoCorretor } from "@/services/produtos-corretores-service"
import { criarTabelaPreco, adicionarFaixaEtaria } from "@/services/tabelas-service"

interface NovoProdutoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto?: any
  onSuccess: () => void
}

export default function NovoProdutoModal({
  open,
  onOpenChange,
  produto,
  onSuccess,
}: NovoProdutoModalProps) {
  useModalOverlay(open)
  
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const totalSteps = 4

  // Dados do formulário
  const [formData, setFormData] = useState({
    // Step 1 - Detalhes do Produto
    codigo: "",
    codigo_externo: "",
    nome: "",
    operadora: "",
    operadora_id: "",
    segmentacao: "",
    contratacao: "",
    acomodacoes: "",
    coparticipacao: "",
    abrangencia: "",
    area_comercializacao: "",
    descricao: "",
    disponivel: true,

    // Step 2 - Tabela de Preços
    tabela_id: null as string | null,
    faixasEtarias: [
      { faixa_etaria: "0-18", valor: "" },
      { faixa_etaria: "19-23", valor: "" },
      { faixa_etaria: "24-28", valor: "" },
      { faixa_etaria: "29-33", valor: "" },
      { faixa_etaria: "34-38", valor: "" },
      { faixa_etaria: "39-43", valor: "" },
      { faixa_etaria: "44-48", valor: "" },
      { faixa_etaria: "49-53", valor: "" },
      { faixa_etaria: "54-58", valor: "" },
      { faixa_etaria: "59+", valor: "" },
    ] as { faixa_etaria: string; valor: string }[],

    // Step 3 - Bonificação
    bonificacao_tipo: "porcentagem" as "porcentagem" | "valor",
    bonificacao_valor: "",
    bonificacao_periodo: "",

    // Step 4 - Comissionamento
    comissionamento_porcentagem: "",
    comissionamento_periodo: "",
    comissionamento_vitalicia: false,
  })

  // Carregar dados do produto se estiver editando
  useEffect(() => {
    if (produto && open) {
      setFormData({
        codigo: produto.codigo || "",
        codigo_externo: produto.codigo_externo || "",
        nome: produto.nome || "",
        operadora: produto.operadora || "",
        operadora_id: produto.operadora_id || "",
        segmentacao: produto.segmentacao || "",
        contratacao: produto.contratacao || "",
        acomodacoes: produto.acomodacoes || "",
        coparticipacao: produto.coparticipacao || "",
        abrangencia: produto.abrangencia || "",
        area_comercializacao: produto.area_comercializacao || "",
        descricao: produto.descricao || "",
        disponivel: produto.disponivel !== false,
        tabela_id: produto.tabela_id || null,
        faixasEtarias: [
          { faixa_etaria: "0-18", valor: "" },
          { faixa_etaria: "19-23", valor: "" },
          { faixa_etaria: "24-28", valor: "" },
          { faixa_etaria: "29-33", valor: "" },
          { faixa_etaria: "34-38", valor: "" },
          { faixa_etaria: "39-43", valor: "" },
          { faixa_etaria: "44-48", valor: "" },
          { faixa_etaria: "49-53", valor: "" },
          { faixa_etaria: "54-58", valor: "" },
          { faixa_etaria: "59+", valor: "" },
        ],
        bonificacao_tipo: produto.bonificacao_tipo || "porcentagem",
        bonificacao_valor: produto.bonificacao_valor?.toString() || "",
        bonificacao_periodo: produto.bonificacao_periodo?.toString() || "",
        comissionamento_porcentagem: produto.comissionamento_porcentagem?.toString() || "",
        comissionamento_periodo: produto.comissionamento_periodo?.toString() || "",
        comissionamento_vitalicia: produto.comissionamento_vitalicia || false,
      })
      setCurrentStep(1)
    } else if (!produto && open) {
      // Resetar formulário para novo produto
      setFormData({
        codigo: "",
        codigo_externo: "",
        nome: "",
        operadora: "",
        operadora_id: "",
        segmentacao: "",
        contratacao: "",
        acomodacoes: "",
        coparticipacao: "",
        abrangencia: "",
        area_comercializacao: "",
        descricao: "",
        disponivel: true,
        tabela_id: null,
        faixasEtarias: [
          { faixa_etaria: "0-18", valor: "" },
          { faixa_etaria: "19-23", valor: "" },
          { faixa_etaria: "24-28", valor: "" },
          { faixa_etaria: "29-33", valor: "" },
          { faixa_etaria: "34-38", valor: "" },
          { faixa_etaria: "39-43", valor: "" },
          { faixa_etaria: "44-48", valor: "" },
          { faixa_etaria: "49-53", valor: "" },
          { faixa_etaria: "54-58", valor: "" },
          { faixa_etaria: "59+", valor: "" },
        ],
        bonificacao_tipo: "porcentagem",
        bonificacao_valor: "",
        bonificacao_periodo: "",
        comissionamento_porcentagem: "",
        comissionamento_periodo: "",
        comissionamento_vitalicia: false,
      })
      setCurrentStep(1)
    }
  }, [produto, open])

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validar campos obrigatórios do Step 1
      if (!formData.nome || !formData.operadora) {
        toast.error("Preencha os campos obrigatórios do produto")
        setCurrentStep(1)
        return
      }

      // Criar ou atualizar tabela de preços
      let tabelaId = formData.tabela_id

      // Se não houver tabela selecionada e houver faixas etárias, criar nova tabela
      if (!tabelaId && formData.faixasEtarias.some((f) => f.faixa_etaria && f.valor)) {
        const faixasValidas = formData.faixasEtarias.filter((f) => f.faixa_etaria && f.valor)

        if (faixasValidas.length > 0) {
          // Criar nova tabela de preços
          const novaTabela = await criarTabelaPreco({
            titulo: formData.nome,
            operadora: formData.operadora,
            segmentacao: formData.segmentacao,
            abrangencia: formData.abrangencia,
            descricao: formData.descricao,
            ativo: formData.disponivel,
          })

          tabelaId = novaTabela.id

          // Adicionar faixas etárias
          for (const faixa of faixasValidas) {
            await adicionarFaixaEtaria({
              tabela_id: tabelaId,
              faixa_etaria: faixa.faixa_etaria,
              valor: Number.parseFloat(faixa.valor),
            })
          }
        }
      }

      // Preparar dados do produto
      const dadosProduto: any = {
        codigo: formData.codigo || null,
        codigo_externo: formData.codigo_externo || null,
        nome: formData.nome,
        operadora: formData.operadora,
        operadora_id: formData.operadora_id || null,
        segmentacao: formData.segmentacao || null,
        contratacao: formData.contratacao || null,
        acomodacoes: formData.acomodacoes || null,
        coparticipacao: formData.coparticipacao || null,
        abrangencia: formData.abrangencia || null,
        area_comercializacao: formData.area_comercializacao || null,
        descricao: formData.descricao || null,
        disponivel: formData.disponivel,
        tabela_id: tabelaId || formData.tabela_id,
        bonificacao_tipo: formData.bonificacao_tipo || null,
        bonificacao_valor: formData.bonificacao_valor ? Number.parseFloat(formData.bonificacao_valor) : null,
        bonificacao_periodo: formData.bonificacao_periodo ? Number.parseInt(formData.bonificacao_periodo) : null,
        comissionamento_porcentagem: formData.comissionamento_porcentagem
          ? Number.parseFloat(formData.comissionamento_porcentagem)
          : null,
        comissionamento_periodo: formData.comissionamento_periodo
          ? Number.parseInt(formData.comissionamento_periodo)
          : null,
        comissionamento_vitalicia: formData.comissionamento_vitalicia,
      }

      if (produto) {
        // Atualizar produto existente
        await atualizarProdutoCorretor(produto.id, dadosProduto)
        toast.success("Produto atualizado com sucesso!")
      } else {
        // Criar novo produto
        await criarProdutoCorretor(dadosProduto)
        toast.success("Produto criado com sucesso!")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error)
      toast.error(`Erro ao salvar produto: ${error.message || "Erro desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }

  const progress = (currentStep / totalSteps) * 100

  const steps = [
    { number: 1, title: "Detalhes do Produto", completed: currentStep > 1 },
    { number: 2, title: "Tabela de Preços", completed: currentStep > 2 },
    { number: 3, title: "Bonificação", completed: currentStep > 3 },
    { number: 4, title: "Comissionamento", completed: false },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">{produto ? "Editar Produto" : "Novo Produto"}</h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-300 mt-2">
            Preencha todas as informações do produto em {totalSteps} etapas
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Progress Bar */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="font-semibold">Etapa {currentStep} de {totalSteps}</span>
              <span className="font-semibold">{Math.round(progress)}% concluído</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      step.completed
                        ? "bg-[#0F172A] border-[#0F172A] text-white"
                        : currentStep === step.number
                          ? "bg-[#0F172A] border-[#0F172A] text-white"
                          : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {step.completed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{step.number}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center ${
                      currentStep === step.number ? "font-semibold text-[#0F172A]" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      step.completed ? "bg-[#0F172A]" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <Step1DetalhesProduto formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 2 && (
              <Step2TabelaPrecos formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 3 && (
              <Step3Bonificacao formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 4 && (
              <Step4Comissionamento formData={formData} updateFormData={updateFormData} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || loading}
              className="border-2"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            {currentStep < totalSteps ? (
              <Button onClick={nextStep} className="bg-[#0F172A] hover:bg-[#1E293B]">
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[#0F172A] hover:bg-[#1E293B]"
              >
                {loading ? "Salvando..." : produto ? "Atualizar" : "Criar Produto"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


