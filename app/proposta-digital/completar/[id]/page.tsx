"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Info,
  Heart,
  ArrowRight,
  ArrowLeft,
  PenTool,
  User,
  Camera,
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Step5HealthQuestionnaire from "@/components/proposta-digital/steps/step5-health-questionnaire"
import Step6Photos from "@/components/proposta-digital/steps/step6-photos"
import Step7Signature from "@/components/proposta-digital/steps/step7-signature"
import { useForm, FormProvider } from "react-hook-form"
import { salvarQuestionarioSaude } from "@/services/questionario-service"

interface Proposta {
  id: string
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  endereco: string
  cep: string
  cidade: string
  estado: string
  produto_nome?: string
  sigla_plano?: string
  valor_total: number
  quantidade_dependentes?: number
  dependentes_dados?: any[]
  observacoes?: string
  caracteristicas_plano?: string
  observacao?: string
  produto_descricao?: string
  status: string
  created_at: string
  assinado_em?: string
  assinatura_imagem?: string
  assinatura?: string
  questionario_completo?: boolean
  ip_assinatura?: string
  user_agent?: string
  status_assinatura?: string
  tem_dependentes?: boolean
  cobertura?: string
  acomodacao?: string
  valor?: string
  valor_mensal?: string
  corretor_id?: string
  produto_id?: string
  foto_rosto?: string
  foto_corpo_inteiro?: string
}

const ETAPAS = [
  { id: 1, nome: "Dados do Titular", descricao: "Informações pessoais", icon: User },
  { id: 2, nome: "Dependentes", descricao: "Dados dos dependentes", icon: Users },
  { id: 3, nome: "Informações do Plano", descricao: "Detalhes do plano escolhido", icon: FileText },
  { id: 4, nome: "Questionário de Saúde", descricao: "Declaração de saúde", icon: Heart },
  { id: 5, nome: "Captura de Fotos", descricao: "Foto de rosto e corpo inteiro", icon: Camera },
  { id: 6, nome: "Assinatura Digital", descricao: "Finalização da proposta", icon: PenTool },
]

export default function CompletarPropostaPage() {
  const params = useParams()
  const router = useRouter()
  const propostaId = params.id as string

  const [proposta, setProposta] = useState<Proposta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFinalizando, setIsFinalizando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [formData, setFormData] = useState<any>({
    assinatura_imagem: "",
    declaracao_veracidade: false,
  })
  const [descricaoPlano, setDescricaoPlano] = useState<string>("")
  const [nomePlano, setNomePlano] = useState<string>("")

  const methods = useForm({
    defaultValues: {
      questionario_saude: {},
      assinatura: "",
      dependentes: [],
    },
  })

  const obterCaracteristicasPlano = (proposta: Proposta): string => {
    if (proposta.caracteristicas_plano?.trim()) return proposta.caracteristicas_plano.trim()
    if (proposta.produto_descricao?.trim()) return proposta.produto_descricao.trim()
    if (proposta.observacoes?.trim()) return proposta.observacoes.trim()
    return "Informações do plano não disponíveis"
  }

  const formatarDataNascimento = (dataString: string): string => {
    try {
      if (dataString.includes("-") && dataString.length === 10) {
        const [ano, mes, dia] = dataString.split("-")
        return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`
      }

      const data = new Date(dataString)
      if (isNaN(data.getTime())) {
        return dataString
      }

      data.setDate(data.getDate() + 1)
      return data.toLocaleDateString("pt-BR")
    } catch (error) {
      console.error("Erro ao formatar data:", error)
      return dataString
    }
  }

  const carregarProposta = async () => {
    try {
      console.log("Carregando proposta:", propostaId)
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("propostas")
        .select(`
          id,
          nome,
          email,
          telefone,
          cpf,
          data_nascimento,
          endereco,
          cep,
          cidade,
          estado,
          produto_nome,
          sigla_plano,
          valor_total,
          quantidade_dependentes,
          dependentes_dados,
          dependentes,
          produto_descricao,
          observacoes,
          status,
          created_at,
          assinado_em,
          assinatura_imagem,
          assinatura,
          questionario_completo,
          ip_assinatura,
          user_agent,
          status_assinatura,
          tem_dependentes,
          cobertura,
          acomodacao,
          valor_mensal,
          corretor_id,
          produto_id,
          foto_rosto,
          foto_corpo_inteiro
        `)
        .eq("id", propostaId)
        .single()

      if (error) {
        console.error("Erro ao carregar proposta:", error)
        throw new Error(`Erro ao carregar proposta: ${error.message}`)
      }

      if (!data) {
        throw new Error("Proposta não encontrada")
      }

      // Garantir que dependentes_dados seja array, buscando também o campo 'dependentes' se necessário
      let dependentes = data.dependentes_dados || data.dependentes || []
      if (typeof dependentes === "string") {
        try {
          dependentes = JSON.parse(dependentes)
        } catch (e) {
          console.log("Erro ao fazer parse dos dependentes:", e)
          dependentes = []
        }
      }
      
      // Se dependentes_dados estiver vazio mas dependentes não, usar dependentes
      if ((!data.dependentes_dados || data.dependentes_dados.length === 0) && data.dependentes) {
        if (typeof data.dependentes === "string") {
          try {
            dependentes = JSON.parse(data.dependentes)
          } catch (e) {
            console.log("Erro ao fazer parse do campo dependentes:", e)
            dependentes = []
          }
        } else {
          dependentes = data.dependentes
        }
      }
      
      console.log("Dependentes carregados:", dependentes)
      
      // Verificar se a proposta já foi finalizada/assinada
      if (data.assinado_em || data.status_assinatura === "assinada" || data.status === "finalizada") {
        console.log("Proposta já finalizada, redirecionando para página de sucesso")
        toast.info("Esta proposta já foi finalizada!")
        router.push(`/proposta-digital/sucesso?id=${data.id}`)
        return
      }
      
      setProposta({ ...data, dependentes_dados: dependentes })
      methods.setValue("dependentes", dependentes || [])

      // Usar diretamente os dados da proposta para nome e características do plano
      const nomePlano = data.produto_nome || data.sigla_plano || "Não informado"
      const descricaoPlano = data.produto_descricao || data.observacoes || "Informações do plano não disponíveis"
      
      setDescricaoPlano(descricaoPlano)
      setNomePlano(nomePlano)

      // Determinar etapa inicial baseado no progresso
      if (data.status_assinatura === "assinada") {
        setEtapaAtual(6) // Já finalizada
      } else if (data.foto_rosto && data.foto_corpo_inteiro) {
        setEtapaAtual(6) // Ir para assinatura
      } else if (data.questionario_completo) {
        setEtapaAtual(5) // Ir para captura de fotos
      } else {
        setEtapaAtual(1) // Começar do início
      }
    } catch (error) {
      console.error("Erro ao carregar proposta:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setIsLoading(false)
    }
  }

  const salvarQuestionarioSaudeHandler = async (questionarioData: any) => {
    if (!proposta) return false

    try {
      console.log("Salvando questionário de saúde...")
      console.log("DEBUG questionarioData:", questionarioData)
      await salvarQuestionarioSaude(proposta.id, questionarioData, proposta.dependentes_dados || [])

      const { error: updateError } = await supabase
        .from("propostas")
        .update({ questionario_completo: true })
        .eq("id", proposta.id)

      if (updateError) {
        console.error("Erro ao atualizar proposta:", updateError)
        throw new Error(`Erro ao atualizar proposta: ${updateError.message}`)
      }

      return true
    } catch (error) {
      console.error("Erro ao salvar questionário:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao salvar questionário")
      return false
    }
  }

  const finalizarProposta = async () => {
    if (!proposta) return

    try {
      console.log("Iniciando finalização da proposta:", proposta.id)
      setIsFinalizando(true)

      const userAgent = navigator.userAgent
      const ipAddress = await fetch("https://api.ipify.org?format=json")
        .then((res) => res.json())
        .then((data) => data.ip)
        .catch(() => "Não disponível")

      const assinatura = formData.assinatura_imagem

      if (!assinatura) {
        toast.error("Assinatura é obrigatória para finalizar a proposta")
        return
      }

      const { error: updateError } = await supabase
        .from("propostas")
        .update({
          status: "pendente",
          status_assinatura: "assinada",
          assinado_em: new Date().toISOString(),
          assinatura: assinatura,
          assinatura_imagem: assinatura,
          ip_assinatura: ipAddress,
          user_agent: userAgent,
        })
        .eq("id", proposta.id)

      if (updateError) {
        console.error("Erro ao atualizar proposta:", updateError)
        throw new Error(`Erro ao finalizar proposta: ${updateError.message}`)
      }

      console.log("Proposta finalizada com sucesso")
      toast.success("Proposta finalizada com sucesso!")
      router.push(`/proposta-digital/sucesso?id=${proposta.id}`)
    } catch (error) {
      console.error("Erro ao finalizar proposta:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao finalizar proposta")
    } finally {
      setIsFinalizando(false)
    }
  }

  const proximaEtapa = async () => {
    // Validação obrigatória da declaração de saúde
    if (etapaAtual === 4) {
      const questionarioData = methods.getValues("questionario_saude")
      
      // Verificar se o questionário foi preenchido
      if (!questionarioData || Object.keys(questionarioData).length === 0) {
        toast.error("⚠️ A Declaração de Saúde é obrigatória e deve ser preenchida completamente!")
        return
      }

      // Verificar se todas as perguntas foram respondidas
      const respostasVazias = Object.values(questionarioData).some((resposta: any) => 
        resposta === undefined || resposta === null || resposta === ""
      )
      
      if (respostasVazias) {
        toast.error("⚠️ Por favor, responda todas as perguntas da Declaração de Saúde antes de continuar!")
        return
      }

      // Salvar questionário de saúde
      const sucesso = await salvarQuestionarioSaudeHandler(questionarioData)
      if (!sucesso) {
        toast.error("❌ Erro ao salvar a Declaração de Saúde. Tente novamente.")
        return
      }
      
      toast.success("✅ Declaração de Saúde salva com sucesso!")
    }

    // Nota: A etapa 5 (captura de fotos) tem sua própria validação no componente Step6Photos
    // que garante que ambas as fotos sejam capturadas antes de chamar onNext()

    if (etapaAtual < ETAPAS.length) {
      setEtapaAtual(etapaAtual + 1)
    }
  }

  const etapaAnterior = () => {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  // Função para atualizar formData
  const updateFormData = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }))
  }

  useEffect(() => {
    carregarProposta()
  }, [propostaId])

  // Atualizar formData quando proposta for carregada
  useEffect(() => {
    if (proposta) {
      setFormData({
        assinatura_imagem: proposta.assinatura_imagem || "",
        declaracao_veracidade: proposta.status_assinatura === "assinada",
      })
    }
  }, [proposta])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="text-center">
            <div className="loading-corporate mx-auto"></div>
            <span className="block mt-4 loading-text-corporate">Carregando proposta...</span>
            <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!proposta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Proposta não encontrada.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const caracteristicasPlano = obterCaracteristicasPlano(proposta)
  const progressoAtual = (etapaAtual / ETAPAS.length) * 100
  const etapaAtualData = ETAPAS[etapaAtual - 1]
  const Icon = etapaAtualData.icon

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gray-100">
        {/* Header Corporativo - Otimizado para Mobile */}
        <div className="bg-gradient-to-r from-white to-gray-50 shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight font-sans truncate">Finalizar Proposta</h1>
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base font-medium mt-1 line-clamp-2 sm:line-clamp-1">Complete os dados para finalizar sua proposta de plano de saúde</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 sm:p-4 w-full sm:w-auto">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Proposta</p>
                <p className="font-mono text-sm font-bold text-[#168979] break-all sm:break-normal">{propostaId.slice(0, 8)}...</p>
              </div>
            </div>

            {/* Progress Corporativo - Otimizado para Mobile */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-xs sm:text-sm font-medium">
                  <span className="text-gray-700">Progresso da Proposta</span>
                  <span className="text-[#168979] font-bold">{Math.round(progressoAtual)}% completo</span>
                </div>
                <Progress value={progressoAtual} className="h-2 sm:h-3 bg-gray-200" />
                
                {/* Current Step - Mobile Optimized */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-[#168979] to-[#13786a] px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-lg text-white w-full sm:w-auto">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <div className="min-w-0 flex-1 sm:flex-none">
                      <p className="font-bold text-xs sm:text-sm lg:text-base">
                        Etapa {etapaAtual} de {ETAPAS.length}
                      </p>
                      <p className="text-gray-100 text-xs sm:text-sm font-medium truncate">{etapaAtualData.nome}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps indicator - Mobile Optimized */}
            <div className="flex justify-center mt-3 sm:mt-4 lg:mt-6 overflow-x-auto pb-2">
              <div className="flex space-x-1 sm:space-x-2 px-2">
                {ETAPAS.map((etapa, index) => {
                  const StepIcon = etapa.icon
                  const isActive = etapa.id === etapaAtual
                  const isCompleted = etapa.id < etapaAtual

                  return (
                    <div key={etapa.id} className="flex flex-col items-center min-w-0 flex-shrink-0">
                      <div
                        className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                            : isCompleted
                              ? "border-green-600 bg-green-600 text-white shadow-md"
                              : "border-gray-300 bg-white text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                        ) : (
                          <StepIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                        )}
                      </div>
                      <span
                        className={`mt-1 text-[9px] sm:text-[10px] lg:text-xs font-medium text-center max-w-[60px] sm:max-w-[80px] lg:max-w-none leading-tight ${
                          isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {etapa.nome.split(' ').map((palavra, i) => (
                          <span key={i} className="block sm:inline sm:mr-1">{palavra}</span>
                        ))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content - Mobile Optimized */}
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Etapa 1: Dados do Titular */}
          {etapaAtual === 1 && (
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-900 font-sans">
                  <div className="w-10 h-10 bg-[#168979] rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  Dados do Titular
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nome</p>
                    <p className="font-medium">{proposta.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium">{proposta.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                    <p className="font-medium">{proposta.telefone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CPF</p>
                    <p className="font-medium">{proposta.cpf}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                    <p className="font-medium">{formatarDataNascimento(proposta.data_nascimento)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cidade/Estado</p>
                    <p className="font-medium">
                      {proposta.cidade}/{proposta.estado}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Endereço Completo</p>
                  <p className="font-medium text-xs sm:text-base">{proposta.endereco}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">CEP: {proposta.cep}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Etapa 2: Dependentes */}
          {etapaAtual === 2 && (
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-900 font-sans">
                  <div className="w-10 h-10 bg-[#168979] rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Dependentes ({proposta.dependentes_dados?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proposta.dependentes_dados &&
                Array.isArray(proposta.dependentes_dados) &&
                proposta.dependentes_dados.length > 0 ? (
                  <div className="space-y-4">
                    {proposta.dependentes_dados.map((dependente, index) => (
                      <div key={index} className="p-3 sm:p-4 border rounded-lg">
                        <h4 className="font-medium mb-2 text-sm sm:text-base">Dependente {index + 1}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-muted-foreground">Nome</p>
                            <p className="font-medium">{dependente.nome || "Não informado"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Data de Nascimento</p>
                            <p className="font-medium">
                              {dependente.data_nascimento
                                ? formatarDataNascimento(dependente.data_nascimento)
                                : "Não informado"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Parentesco</p>
                            <p className="font-medium">{dependente.parentesco || "Não informado"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CPF</p>
                            <p className="font-medium">{dependente.cpf || "Não informado"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CNS</p>
                            <p className="font-medium">{dependente.cns || "Não informado"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Valor Individual</p>
                            <p className="font-medium text-green-600">
                              {dependente.valor_individual || "Não informado"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Users className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-xs sm:text-sm">Nenhum dependente cadastrado nesta proposta</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Etapa 3: Informações do Plano */}
          {etapaAtual === 3 && (
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-gray-900 font-sans">
                  <div className="w-10 h-10 bg-[#168979] rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  Informações do Plano
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plano</p>
                    <p className="font-medium">{proposta.produto_nome || proposta.sigla_plano || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Mensal</p>
                    <p className="font-medium text-lg text-green-600">
                      R$ {proposta.valor_total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cobertura</p>
                    <p className="font-medium">{proposta.cobertura || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Acomodação</p>
                    <p className="font-medium">{proposta.acomodacao || "Não informado"}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Características do Plano</p>
                  </div>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg">
                    <p className="whitespace-pre-line text-xs sm:text-sm">{proposta.produto_descricao || proposta.observacoes || "Informações do plano não disponíveis"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Etapa 4: Questionário de Saúde */}
          {etapaAtual === 4 && <Step5HealthQuestionnaire onNext={proximaEtapa} onBack={etapaAnterior} />}

          {/* Etapa 5: Captura de Fotos */}
          {etapaAtual === 5 && proposta && (
            <Step6Photos
              onNext={proximaEtapa}
              onBack={etapaAnterior}
              propostaId={proposta.id}
              onPhotosSaved={(fotoRosto, fotoCorpoInteiro) => {
                // Atualizar proposta com as URLs das fotos
                setProposta(prev => prev ? {
                  ...prev,
                  foto_rosto: fotoRosto,
                  foto_corpo_inteiro: fotoCorpoInteiro
                } : null)
              }}
            />
          )}

          {/* Etapa 6: Assinatura Digital */}
          {etapaAtual === 6 && (
            <Step7Signature 
              onNext={proximaEtapa}
              onPrev={etapaAnterior}
              onFinalizar={finalizarProposta}
              formData={formData}
              updateFormData={updateFormData}
              proposta={proposta}
            />
          )}

          {/* Navegação Corporativa */}
          {etapaAtual < 5 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6 mt-6">
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4">
                <Button 
                  variant="outline" 
                  onClick={etapaAnterior} 
                  disabled={etapaAtual === 1} 
                  className="w-full sm:w-auto btn-corporate min-h-[44px] sm:min-h-[40px]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Anterior</span>
                </Button>

                <Button 
                  onClick={proximaEtapa} 
                  disabled={etapaAtual === ETAPAS.length} 
                  className="w-full sm:w-auto bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate shadow-corporate min-h-[44px] sm:min-h-[40px]"
                >
                  <span className="truncate">{etapaAtual === 4 ? "Salvar Declaração" : "Próxima"}</span>
                  <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                </Button>
              </div>
              
              {etapaAtual === 4 && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-xs sm:text-sm font-medium text-amber-800 leading-relaxed">
                      ⚠️ A Declaração de Saúde é obrigatória e deve ser preenchida completamente antes de prosseguir.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  )
}
