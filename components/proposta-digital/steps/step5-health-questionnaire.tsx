"use client"

import { useState, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Heart, AlertTriangle, ArrowLeft, ArrowRight, Scale, Ruler } from "lucide-react"

interface Step5HealthQuestionnaireProps {
  onNext: () => void
  onBack: () => void
}

// 21 perguntas do questionário de saúde
const healthQuestions = [
  {
    id: 1,
    question: "Teve alguma doença que resultou em internação nos últimos 2 anos? (qual?)",
  },
  {
    id: 2,
    question:
      "Foi submetido(a) a internações clínicas, cirúrgicas ou psiquiátricas nos últimos 5 anos? Caso positivo, informe quando e qual doença.",
  },
  {
    id: 3,
    question: "Possui alguma doença hereditária ou congênita? (qual?)",
  },
  {
    id: 4,
    question: "É portador de alguma doença que desencadeou sequela física? (qual?)",
  },
  {
    id: 5,
    question: "É portador de alguma doença que necessitará de transplante?",
  },
  {
    id: 6,
    question: "É portador de doença renal que necessite diálise e/ou hemodiálise?",
  },
  {
    id: 7,
    question: "É portador de câncer? (informar a localização)",
  },
  {
    id: 8,
    question:
      "Tem ou teve alguma doença oftalmológica, como catarata, glaucoma, astigmatismo, miopia, hipermetropia ou outra? Fez cirurgia refrativa?",
  },
  {
    id: 9,
    question:
      "Tem ou teve alguma doença do ouvido, nariz ou garganta, como sinusite, desvio de septo, amigdalite, otite ou outra?",
  },
  {
    id: 10,
    question:
      "É portador de alguma doença do aparelho digestivo, como gastrite, úlcera, colite, doença da vesícula biliar ou outras?",
  },
  {
    id: 11,
    question: "É portador de alguma doença ortopédica como hérnia de disco, osteoporose ou outros?",
  },
  {
    id: 12,
    question:
      "É portador de alguma doença neurológica como mal de Parkinson, doenças de Alzheimer, epilepsia ou outros?",
  },
  {
    id: 13,
    question: "É portador de alguma doença cardíaca, circulatória (varizes e outras), hipertensiva ou diabetes?",
  },
  {
    id: 14,
    question: "É portador de alguma doença ginecológica / urológica?",
  },
  {
    id: 15,
    question: "É portador de hérnia inguinal, umbilical, incisional ou outras?",
  },
  {
    id: 16,
    question: "É portador de alguma doença infectocontagiosa, inclusive AIDS ou hepatite?",
  },
  {
    id: 17,
    question:
      "É portador de alguma doença psiquiátrica, como depressão, esquizofrenia, demência, alcoolismo, dependência de drogas ou outra?",
  },
  {
    id: 18,
    question: "Teve alguma patologia que necessitou de tratamento psicológico ou psicoterápico? (qual?)",
  },
  {
    id: 19,
    question:
      "É portador ou já sofreu de alguma doença do aparelho respiratório, como asma, doença pulmonar obstrutiva crônica, bronquite, enfisema ou outra?",
  },
  {
    id: 20,
    question: "Tem ou teve alguma doença não relacionada nas perguntas anteriores?",
  },
  {
    id: 21,
    question: "É gestante?",
  },
]

export default function Step5HealthQuestionnaire({ onNext, onBack }: Step5HealthQuestionnaireProps) {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [mostrarDadosFisicos, setMostrarDadosFisicos] = useState(true)

  const dependentes = watch("dependentes") || []
  const temDependentes = dependentes.length > 0
  const [pessoaAtual, setPessoaAtual] = useState(0) // 0 = titular, 1+ = dependentes
  const [questionarioCompleto, setQuestionarioCompleto] = useState<
    Record<
      number,
      {
        peso?: string
        altura?: string
        respostas: Record<number, { resposta: string; observacao?: string }>
      }
    >
  >({})

  const totalPessoas = 1 + (temDependentes ? dependentes.length : 0)
  const totalQuestions = healthQuestions.length
  const progress = mostrarDadosFisicos ? 0 : ((currentQuestionIndex + 1) / totalQuestions) * 100

  const pessoaAtualNome =
    pessoaAtual === 0 ? "Titular" : `Dependente ${pessoaAtual}: ${dependentes[pessoaAtual - 1]?.nome || "Sem nome"}`

  useEffect(() => {
    // Inicializar questionário para todas as pessoas
    const questionarioInicial: Record<
      number,
      {
        peso?: string
        altura?: string
        respostas: Record<number, { resposta: string; observacao?: string }>
      }
    > = {}

    for (let pessoa = 0; pessoa < totalPessoas; pessoa++) {
      questionarioInicial[pessoa] = {
        peso: "",
        altura: "",
        respostas: {},
      }
    }
    setQuestionarioCompleto(questionarioInicial)
  }, [totalPessoas])

  const handleDadosFisicos = (campo: "peso" | "altura", valor: string) => {
    const novoQuestionario = { ...questionarioCompleto }
    if (!novoQuestionario[pessoaAtual]) {
      novoQuestionario[pessoaAtual] = { peso: "", altura: "", respostas: {} }
    }
    novoQuestionario[pessoaAtual][campo] = valor
    setQuestionarioCompleto(novoQuestionario)
  }

  const handleResposta = (questionId: number, resposta: string) => {
    const novoQuestionario = { ...questionarioCompleto }
    if (!novoQuestionario[pessoaAtual]) {
      novoQuestionario[pessoaAtual] = { peso: "", altura: "", respostas: {} }
    }
    if (!novoQuestionario[pessoaAtual].respostas) {
      novoQuestionario[pessoaAtual].respostas = {}
    }
    novoQuestionario[pessoaAtual].respostas[questionId] = {
      resposta,
      observacao: novoQuestionario[pessoaAtual].respostas[questionId]?.observacao || "",
    }
    setQuestionarioCompleto(novoQuestionario)
  }

  const handleObservacao = (questionId: number, observacao: string) => {
    const novoQuestionario = { ...questionarioCompleto }
    if (novoQuestionario[pessoaAtual]?.respostas?.[questionId]) {
      novoQuestionario[pessoaAtual].respostas[questionId].observacao = observacao
    }
    setQuestionarioCompleto(novoQuestionario)
  }

  const proximaEtapa = () => {
    if (mostrarDadosFisicos) {
      // Validar peso e altura
      const dadosAtual = questionarioCompleto[pessoaAtual]
      if (!dadosAtual?.peso || !dadosAtual?.altura) {
        alert("Por favor, preencha peso e altura antes de continuar.")
        return
      }
      setMostrarDadosFisicos(false)
      setCurrentQuestionIndex(0)
    } else if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Terminou as perguntas para a pessoa atual
      if (pessoaAtual < totalPessoas - 1) {
        // Próxima pessoa
        setPessoaAtual(pessoaAtual + 1)
        setMostrarDadosFisicos(true)
        setCurrentQuestionIndex(0)
      } else {
        // Terminou para todas as pessoas - ir direto para assinatura
        finalizarQuestionario()
      }
    }
  }

  const etapaAnterior = () => {
    if (!mostrarDadosFisicos && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    } else if (!mostrarDadosFisicos && currentQuestionIndex === 0) {
      setMostrarDadosFisicos(true)
    } else if (mostrarDadosFisicos && pessoaAtual > 0) {
      // Voltar para a pessoa anterior
      setPessoaAtual(pessoaAtual - 1)
      setMostrarDadosFisicos(false)
      setCurrentQuestionIndex(totalQuestions - 1)
    }
  }

  const finalizarQuestionario = () => {
    // Salvar todas as respostas no formulário
    setValue("questionario_saude", questionarioCompleto)
    onNext()
  }

  const dadosAtual = questionarioCompleto[pessoaAtual]
  const currentQuestion = healthQuestions[currentQuestionIndex]
  const respostaAtual = dadosAtual?.respostas?.[currentQuestion?.id]
  const temResposta = respostaAtual?.resposta

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Heart className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">Declaração de Saúde</h2>
        </div>
        <p className="text-gray-600 mb-4">
          {pessoaAtualNome} -{" "}
          {mostrarDadosFisicos ? "Dados Físicos" : `Pergunta ${currentQuestionIndex + 1} de ${totalQuestions}`}
        </p>
        <Progress value={progress} className="w-full max-w-md mx-auto" />
      </div>

      {/* Indicador de pessoas */}
      {totalPessoas > 1 && (
        <div className="flex justify-center space-x-2 mb-6">
          {Array.from({ length: totalPessoas }, (_, index) => (
            <div
              key={index}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                index === pessoaAtual
                  ? "bg-blue-600 text-white"
                  : index < pessoaAtual
                    ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {index === 0 ? "Titular" : `Dep. ${index}`}
            </div>
          ))}
        </div>
      )}

      {/* Dados físicos */}
      {mostrarDadosFisicos && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Dados Físicos - {pessoaAtualNome}
            </CardTitle>
            <CardDescription>Informe seu peso e altura atuais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="peso" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Peso (kg)
                </Label>
                <Input
                  id="peso"
                  type="number"
                  placeholder="Ex: 70"
                  value={dadosAtual?.peso || ""}
                  onChange={(e) => handleDadosFisicos("peso", e.target.value)}
                  min="1"
                  max="300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Altura (cm)
                </Label>
                <Input
                  id="altura"
                  type="number"
                  placeholder="Ex: 175"
                  value={dadosAtual?.altura || ""}
                  onChange={(e) => handleDadosFisicos("altura", e.target.value)}
                  min="50"
                  max="250"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pergunta atual */}
      {!mostrarDadosFisicos && currentQuestion && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
            <CardDescription>
              Responda com sinceridade. Informações incorretas podem invalidar o contrato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Opções de resposta */}
            <RadioGroup
              value={respostaAtual?.resposta || ""}
              onValueChange={(value) => handleResposta(currentQuestion.id, value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="nao" />
                <Label htmlFor="nao" className="cursor-pointer">
                  Não
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="sim" />
                <Label htmlFor="sim" className="cursor-pointer">
                  Sim
                </Label>
              </div>
            </RadioGroup>

            {/* Campo de observação (sempre disponível) */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observações (opcional):</Label>
              <Textarea
                id="observacao"
                placeholder="Adicione detalhes ou observações sobre esta pergunta..."
                value={respostaAtual?.observacao || ""}
                onChange={(e) => handleObservacao(currentQuestion.id, e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegação */}
      <div className="flex justify-between max-w-2xl mx-auto">
        <Button variant="outline" onClick={etapaAnterior} disabled={mostrarDadosFisicos && pessoaAtual === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

          <Button
            onClick={proximaEtapa}
            disabled={mostrarDadosFisicos ? !dadosAtual?.peso || !dadosAtual?.altura : !temResposta}
          >
            {mostrarDadosFisicos
              ? "Continuar para Perguntas"
              : !mostrarDadosFisicos && currentQuestionIndex === totalQuestions - 1 && pessoaAtual === totalPessoas - 1
                ? "Finalizar Questionário"
                : "Próxima"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
      </div>

      {/* Informação sobre obrigatoriedade */}
      <Alert className="max-w-2xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> A declaração de saúde é obrigatória e deve ser preenchida com veracidade.
          Informações falsas podem resultar na negativa de cobertura ou cancelamento do contrato.
        </AlertDescription>
      </Alert>
    </div>
  )
}
