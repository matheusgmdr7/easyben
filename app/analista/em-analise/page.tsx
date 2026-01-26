"use client"

import { useState, useEffect } from "react"
import { 
  buscarPropostas, 
  atualizarStatusProposta, 
  buscarPropostaCompleta,
  buscarDependentesProposta,
  obterNomeCliente,
  obterEmailCliente,
  obterTelefoneCliente
} from "@/services/propostas-service-unificado"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, CheckCircle, XCircle, Search, Filter, RefreshCw, Heart, Clock, User, UserCheck, FileText, Camera, Building, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { supabase } from "@/lib/supabase"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

// Função para obter o texto da pergunta por ID
function obterTextoPergunta(perguntaId: number): string {
  const perguntas = {
    1: "Teve alguma doença que resultou em internação nos últimos 2 anos? (qual?)",
    2: "Foi submetido(a) a internações clínicas, cirúrgicas ou psiquiátricas nos últimos 5 anos? Caso positivo, informe quando e qual doença.",
    3: "Possui alguma doença hereditária ou congênita? (qual?)",
    4: "É portador de alguma doença que desencadeou sequela física? (qual?)",
    5: "É portador de alguma doença que necessitará de transplante?",
    6: "É portador de doença renal que necessite diálise e/ou hemodiálise?",
    7: "É portador de câncer? (informar a localização)",
    8: "Tem ou teve alguma doença oftalmológica, como catarata, glaucoma, astigmatismo, miopia, hipermetropia ou outra? Fez cirurgia refrativa?",
    9: "Tem ou teve alguma doença do ouvido, nariz ou garganta, como sinusite, desvio de septo, amigdalite, otite ou outra?",
    10: "É portador de alguma doença do aparelho digestivo, como gastrite, úlcera, colite, doença da vesícula biliar ou outras?",
    11: "É portador de alguma doença ortopédica como hérnia de disco, osteoporose ou outros?",
    12: "É portador de alguma doença neurológica como mal de Parkinson, doenças de Alzheimer, epilepsia ou outros?",
    13: "É portador de alguma doença cardíaca, circulatória (varizes e outras), hipertensiva ou diabetes?",
    14: "É portador de alguma doença ginecológica / urológica?",
    15: "É portador de hérnia inguinal, umbilical, incisional ou outras?",
    16: "É portador de alguma doença infectocontagiosa, inclusive AIDS ou hepatite?",
    17: "É portador de alguma doença psiquiátrica, como depressão, esquizofrenia, demência, alcoolismo, dependência de drogas ou outra?",
    18: "Teve alguma patologia que necessitou de tratamento psicológico ou psicoterápico? (qual?)",
    19: "É portador ou já sofreu de alguma doença do aparelho respiratório, como asma, doença pulmonar obstrutiva crônica, bronquite, enfisema ou outra?",
    20: "Tem ou teve alguma doença não relacionada nas perguntas anteriores?",
    21: "É gestante?"
  }
  
  return perguntas[perguntaId as keyof typeof perguntas] || "Pergunta não disponível"
}

export default function EmAnalisePage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [origemFiltro, setOrigemFiltro] = useState("todas")
  const [propostaDetalhada, setPropostaDetalhada] = useState<any>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [motivoDevolucao, setMotivoDevolucao] = useState("")
  const [showModalRejeicao, setShowModalRejeicao] = useState(false)
  const [showModalDevolucao, setShowModalDevolucao] = useState(false)
  const [showModalDetalhes, setShowModalDetalhes] = useState(false)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionariosSaude, setQuestionariosSaude] = useState<any[]>([])
  const [corretoresData, setCorretoresData] = useState<Map<string, any>>(new Map())
  const [corretorasData, setCorretorasData] = useState<Map<string, any>>(new Map())

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(25)

  useEffect(() => {
    carregarPropostas()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      console.log("🔄 Carregando propostas em análise...")
      const data = await buscarPropostas()
      // Filtrar apenas propostas com status "pendente"
      const propostasEmAnalise = data.filter((p: any) => p.status === "pendente")
      console.log("📊 Propostas em análise:", propostasEmAnalise.length)
      setPropostas(propostasEmAnalise)

      // Buscar dados dos corretores e corretoras
      const corretoresIds = propostasEmAnalise
        .filter((p: any) => p.corretor_id)
        .map((p: any) => p.corretor_id)
        .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index)

      if (corretoresIds.length > 0) {
        const { data: corretores, error: corretoresError } = await supabase
          .from("corretores")
          .select("id, nome, gestor_id")
          .in("id", corretoresIds)

        if (!corretoresError && corretores) {
          const corretoresMap = new Map()
          corretores.forEach((c: any) => {
            corretoresMap.set(c.id, c)
          })
          setCorretoresData(corretoresMap)

          // Buscar corretoras (gestores)
          const gestoresIds = corretores
            .filter((c: any) => c.gestor_id)
            .map((c: any) => c.gestor_id)
            .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index)

          if (gestoresIds.length > 0) {
            const { data: gestores, error: gestoresError } = await supabase
              .from("corretores")
              .select("id, nome")
              .in("id", gestoresIds)
              .eq("is_gestor", true)

            if (!gestoresError && gestores) {
              const corretorasMap = new Map()
              gestores.forEach((g: any) => {
                corretorasMap.set(g.id, g)
              })
              setCorretorasData(corretorasMap)
            }
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function aprovarProposta(id: string) {
    try {
      await atualizarStatusProposta(id, "aprovada")
      toast.success("Proposta aprovada com sucesso!")
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao aprovar proposta:", error)
      toast.error("Erro ao aprovar proposta")
    }
  }

  async function rejeitarProposta() {
    if (!propostaDetalhada) return

    try {
      await atualizarStatusProposta(propostaDetalhada.id, "rejeitada", motivoRejeicao)
      toast.success("Proposta rejeitada com sucesso!")
      setShowModalRejeicao(false)
      setMotivoRejeicao("")
      setPropostaDetalhada(null)
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao rejeitar proposta:", error)
      toast.error("Erro ao rejeitar proposta")
    }
  }

  async function devolverProposta() {
    if (!propostaDetalhada) return

    try {
      await atualizarStatusProposta(propostaDetalhada.id, "devolvida", motivoDevolucao)
      toast.success("Proposta devolvida com sucesso! O cliente poderá preencher novamente a declaração de saúde e enviar fotos.")
      setShowModalDevolucao(false)
      setShowModalDetalhes(false)
      setMotivoDevolucao("")
      setPropostaDetalhada(null)
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao devolver proposta:", error)
      toast.error("Erro ao devolver proposta")
    }
  }

  function abrirModalRejeicao(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalRejeicao(true)
  }

  function abrirModalDevolucao(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalDevolucao(true)
  }

  async function abrirModalDetalhes(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalDetalhes(true)
    await carregarDetalhesCompletos(proposta)
  }

  async function carregarDetalhesCompletos(proposta: any) {
    try {
      setLoadingDetalhes(true)
      console.log("🔍 CARREGANDO DETALHES COMPLETOS - EM ANÁLISE")
      console.log("📋 Proposta ID:", proposta.id)

      // 1. Buscar dados completos da proposta
      const propostaCompleta = await buscarPropostaCompleta(proposta.id)
      setPropostaDetalhada(propostaCompleta as any)

      // 2. Carregar dependentes
      let dependentesData = await buscarDependentesProposta(proposta.id)
      if (!dependentesData || dependentesData.length === 0) {
        // Tentar parsear do campo dependentes
        try {
          if (proposta.dependentes && typeof proposta.dependentes === 'string') {
            dependentesData = JSON.parse(proposta.dependentes)
          } else if (Array.isArray(proposta.dependentes)) {
            dependentesData = proposta.dependentes
          }
        } catch {
          dependentesData = []
        }
      }
      setDependentes(dependentesData)

      // 3. Buscar questionários de saúde
      let questionariosData = []
      
      // Primeiro tentar buscar na tabela questionario_respostas
      const { data: questionariosRespostas, error: errorQuestionariosRespostas } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", proposta.id)
      
      if (!errorQuestionariosRespostas && questionariosRespostas && questionariosRespostas.length > 0) {
        console.log("✅ Questionário encontrado em questionario_respostas:", questionariosRespostas.length)
        
        // Agrupar por pessoa para evitar duplicatas
        const questionariosPorPessoa = new Map<string, any>()
        questionariosRespostas.forEach((q: any) => {
          const pessoaKey = q.pessoa_tipo === "titular" 
            ? "titular" 
            : `${q.pessoa_tipo}_${q.pessoa_nome || q.dependente_id || q.pessoa_id || "desconhecido"}`
          
          // Se já existe um questionário para esta pessoa, mesclar as respostas
          if (questionariosPorPessoa.has(pessoaKey)) {
            const existente = questionariosPorPessoa.get(pessoaKey)
            // Mesclar respostas_questionario se existirem
            if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
              if (!existente.respostas_questionario) {
                existente.respostas_questionario = []
              }
              // Adicionar apenas respostas que não existem (baseado em pergunta_id)
              const perguntasExistentes = new Set(existente.respostas_questionario.map((r: any) => r.pergunta_id))
              q.respostas_questionario.forEach((r: any) => {
                if (!perguntasExistentes.has(r.pergunta_id)) {
                  existente.respostas_questionario.push(r)
                }
              })
            }
            // Mesclar outros campos se necessário
            if (q.peso && !existente.peso) existente.peso = q.peso
            if (q.altura && !existente.altura) existente.altura = q.altura
          } else {
            questionariosPorPessoa.set(pessoaKey, { ...q })
          }
        })
        
        questionariosData = Array.from(questionariosPorPessoa.values())
        console.log("📊 Questionários únicos após agrupamento:", questionariosData.length)
      } else {
        console.log("ℹ️ Nenhum questionário em questionario_respostas, tentando questionario_saude...")
        
        // Fallback para a tabela questionario_saude
        const { data: questionariosSaude, error: errorQuestionariosSaude } = await supabase
          .from("questionario_saude")
          .select("*")
          .eq("proposta_id", proposta.id)
          .order("pergunta_id", { ascending: true })
        
        if (!errorQuestionariosSaude && questionariosSaude && questionariosSaude.length > 0) {
          console.log("✅ Questionário encontrado em questionario_saude:", questionariosSaude.length)
          
          // Agrupar por pessoa também para questionario_saude
          const questionariosPorPessoa = new Map<string, any>()
          questionariosSaude.forEach((q: any) => {
            const pessoaKey = q.pessoa_tipo === "titular" 
              ? "titular" 
              : `${q.pessoa_tipo}_${q.pessoa_nome || q.dependente_id || q.pessoa_id || "desconhecido"}`
            
            if (!questionariosPorPessoa.has(pessoaKey)) {
              questionariosPorPessoa.set(pessoaKey, { ...q })
            }
          })
          
          questionariosData = Array.from(questionariosPorPessoa.values())
          console.log("📊 Questionários únicos após agrupamento:", questionariosData.length)
        } else {
          console.log("ℹ️ Nenhum questionário encontrado em nenhuma tabela")
        }
      }
      
      setQuestionariosSaude(questionariosData)
      
      console.log("🎯 RESUMO DO CARREGAMENTO:")
      console.log("📋 Proposta completa:", !!propostaCompleta)
      console.log("👨‍👩‍👧‍👦 Dependentes:", dependentesData?.length || 0)
      console.log("🏥 Questionários:", questionariosData?.length || 0)

    } catch (error) {
      console.error("❌ Erro ao carregar detalhes:", error)
      toast.error("Erro ao carregar detalhes da proposta")
    } finally {
      setLoadingDetalhes(false)
    }
  }

  function renderDeclaracaoSaudeUnificada() {
    // Mostrar fotos do titular se existirem
    const temFotos = propostaDetalhada?.foto_rosto || propostaDetalhada?.foto_corpo_inteiro
    
    if (!questionariosSaude || questionariosSaude.length === 0) {
      return (
        <div className="space-y-4 sm:space-y-6">
          {/* Fotos do Cliente - Mostrar mesmo se não houver questionário */}
          {temFotos && (
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                  Fotos do Titular
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {propostaDetalhada?.foto_rosto && (
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Foto de Rosto
                      </label>
                      <div className="relative group">
                        <img
                          src={propostaDetalhada.foto_rosto}
                          alt="Foto de rosto"
                          className="w-full rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => window.open(propostaDetalhada.foto_rosto, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">Clique para ampliar</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {propostaDetalhada?.foto_corpo_inteiro && (
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Foto de Corpo Inteiro
                      </label>
                      <div className="relative group">
                        <img
                          src={propostaDetalhada.foto_corpo_inteiro}
                          alt="Foto de corpo inteiro"
                          className="w-full rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => window.open(propostaDetalhada.foto_corpo_inteiro, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">Clique para ampliar</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                Declaração de Saúde
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
              <p className="text-gray-500">Nenhuma resposta encontrada</p>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // Agrupar questionários por pessoa para evitar duplicações
    const questionariosPorPessoa = new Map<string, any>()
    questionariosSaude.forEach((q: any) => {
      const pessoaKey = q.pessoa_tipo === "titular" 
        ? "titular" 
        : `${q.pessoa_tipo}_${q.pessoa_nome || q.dependente_id || q.pessoa_id || "desconhecido"}`
      
      // Se já existe um questionário para esta pessoa, mesclar as respostas
      if (questionariosPorPessoa.has(pessoaKey)) {
        const existente = questionariosPorPessoa.get(pessoaKey)
        // Mesclar respostas_questionario se existirem
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          if (!existente.respostas_questionario) {
            existente.respostas_questionario = []
          }
          // Adicionar apenas respostas que não existem (baseado em pergunta_id)
          const perguntasExistentes = new Set(existente.respostas_questionario.map((r: any) => r.pergunta_id))
          q.respostas_questionario.forEach((r: any) => {
            if (!perguntasExistentes.has(r.pergunta_id)) {
              existente.respostas_questionario.push(r)
            }
          })
        }
      } else {
        questionariosPorPessoa.set(pessoaKey, q)
      }
    })
    
    const questionariosUnicos = Array.from(questionariosPorPessoa.values())
    
    return (
      <div className="space-y-4 sm:space-y-6">
        {questionariosUnicos.map((q, idx) => {
          const isTitular = q.pessoa_tipo === "titular"
          const mostrarFotos = isTitular && temFotos
          
          return (
            <Card key={`${q.pessoa_tipo}-${q.pessoa_nome || q.dependente_id || q.id || idx}`} className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  <span className="truncate">{isTitular
                      ? "Declaração de Saúde - Titular"
                      : `Declaração de Saúde - ${q.pessoa_nome}`}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 space-y-6">
                {/* Fotos do Titular - Mostrar apenas para o titular */}
                {mostrarFotos && (
                  <div className="border-b border-gray-200 pb-6">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Fotos do Titular
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {propostaDetalhada?.foto_rosto && (
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                            Foto de Rosto
                          </label>
                          <div className="relative group">
                            <img
                              src={propostaDetalhada.foto_rosto}
                              alt="Foto de rosto"
                              className="w-full rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => window.open(propostaDetalhada.foto_rosto, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">Clique para ampliar</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {propostaDetalhada?.foto_corpo_inteiro && (
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                            Foto de Corpo Inteiro
                          </label>
                          <div className="relative group">
                            <img
                              src={propostaDetalhada.foto_corpo_inteiro}
                              alt="Foto de corpo inteiro"
                              className="w-full rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => window.open(propostaDetalhada.foto_corpo_inteiro, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">Clique para ampliar</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Dados Físicos e Questionário */}
                <div>
                  <div className="mb-4 text-sm text-gray-700">
                    <span className="mr-4">Peso: <b>{q.peso || "-"} kg</b></span>
                    <span>Altura: <b>{q.altura || "-"} cm</b></span>
                  </div>
                  {q.respostas_questionario && q.respostas_questionario.length > 0 ? (
                    // Remover duplicatas baseado em pergunta_id
                    Array.from(new Map(q.respostas_questionario.map((r: any) => [r.pergunta_id, r])).values())
                      .map((resposta: any, i: any) => (
                        <div key={`${q.id}-${resposta.pergunta_id}-${i}`} className="border-l-4 border-blue-200 pl-4 py-2 mb-2">
                          <div className="font-medium text-gray-900 mb-1">Pergunta {resposta.pergunta_id}</div>
                          <div className="text-sm text-gray-600 mb-2">
                            {resposta.pergunta_texto || resposta.pergunta || obterTextoPergunta(resposta.pergunta_id)}
                          </div>
                          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${resposta.resposta === "sim" || resposta.resposta === true ? "bg-red-100 text-red-800" : "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"}`}>
                            {resposta.resposta === "sim" || resposta.resposta === true ? "SIM" : "NÃO"}
                          </div>
                          {resposta.observacao && (
                            <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              <strong>Observações:</strong> {resposta.observacao}
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-gray-500">Nenhuma resposta encontrada</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  function obterNomeCliente(proposta: any) {
    if (proposta.origem === "propostas") {
      return proposta.nome_cliente || proposta.nome || "Nome não informado"
    } else {
      return proposta.cliente || proposta.nome_cliente || "Nome não informado"
    }
  }

  function obterEmailCliente(proposta: any) {
    if (proposta.origem === "propostas") {
      return proposta.email || "Email não informado"
    } else {
      return proposta.email_cliente || proposta.email || "Email não informado"
    }
  }

  // Função para exibir badge de status (igual à /propostas)
  function getStatusBadge(status: any) {
    if (status === "parcial") {
      return {
        label: "AGUARDANDO VALIDAÇÃO",
        color: "bg-gray-50 text-gray-500",
        icon: Clock
      }
    } else if (status === "aguardando_cliente") {
      return {
        label: "AGUARDANDO CLIENTE",
        color: "bg-gray-50 text-gray-500",
        icon: Clock
      }
    } else if (status === "pendente") {
      return {
        label: "AGUARDANDO ANÁLISE",
        color: "bg-gray-50 text-gray-500",
        icon: Clock
      }
    } else if (status === "aprovada") {
      return {
        label: "APROVADA",
        color: "bg-gray-100 text-[#0F172A]",
        icon: CheckCircle
      }
    } else if (status === "rejeitada") {
      return {
        label: "REJEITADA",
        color: "bg-gray-50 text-gray-500",
        icon: XCircle
      }
    } else if (status === "cancelada") {
      return {
        label: "CANCELADA",
        color: "bg-gray-50 text-gray-500",
        icon: XCircle
      }
    } else if (status === "cadastrado" || status === "cadastrada") {
      return {
        label: "CADASTRADO",
        color: "bg-gray-100 text-[#0F172A]",
        icon: CheckCircle
      }
    } else if (status === "devolvida") {
      return {
        label: "DEVOLVIDA",
        color: "bg-gray-50 text-gray-500",
        icon: RotateCcw
      }
    } else if (status === "transmitida") {
      return {
        label: "TRANSMITIDA",
        color: "bg-gray-100 text-[#0F172A]",
        icon: CheckCircle
      }
    } else {
      return {
        label: status || "INDEFINIDO",
        color: "bg-gray-50 text-gray-500",
        icon: CheckCircle
      }
    }
  }

  // Função para exibir badge de origem (igual à /propostas)
  function getOrigemBadge(origem: any) {
    const origemConfig = {
      propostas: { label: "Cliente Direto", color: "bg-slate-50 text-slate-700 border border-slate-200" },
      propostas_corretores: { label: "Via Corretor", color: "bg-gray-50 text-gray-700 border border-gray-200" },
    }

    return origemConfig[origem as keyof typeof origemConfig] || { label: origem, color: "bg-gray-50 text-gray-700 border border-gray-200" }
  }

  // Função para parsear dependentes igual à página de propostas
  function parseDependentes(proposta: any) {
    let dependentesArr: any[] = []
    if (proposta.dependentes_dados && Array.isArray(proposta.dependentes_dados) && proposta.dependentes_dados.length > 0) {
      dependentesArr = proposta.dependentes_dados
    } else if (typeof proposta.dependentes === "string" && proposta.dependentes && proposta.dependentes.length > 0) {
      try {
        dependentesArr = JSON.parse(proposta.dependentes)
      } catch {}
    } else if (Array.isArray(proposta.dependentes) && proposta.dependentes && proposta.dependentes.length > 0) {
      dependentesArr = proposta.dependentes
    }
    return dependentesArr
  }

  // Função para calcular valor total mensal (titular + dependentes)
  function calcularValorTotalMensal(proposta: any) {
    let total = 0
    let valorTitular = proposta.valor_mensal || proposta.valor || proposta.valor_total || 0
    if (typeof valorTitular !== "number") {
      valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".")
      valorTitular = Number.parseFloat(valorTitular)
    }
    if (!isNaN(valorTitular) && valorTitular > 0) {
      total += valorTitular
    }
    const dependentesArr = parseDependentes(proposta)
    if (dependentesArr && dependentesArr.length > 0) {
      dependentesArr.forEach((dep: any) => {
        let valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
        if (typeof valorDep !== "number") {
          valorDep = String(valorDep).replace(/[^\d,\.]/g, "").replace(",", ".")
          valorDep = Number.parseFloat(valorDep)
        }
        if (!isNaN(valorDep) && valorDep > 0) {
          total += valorDep
        }
      })
    }
    return total
  }

  function formatarDataSegura(dataString: any) {
    if (!dataString) return "N/A"
    try {
      const data = new Date(dataString)
      if (isNaN(data.getTime())) {
        return "Data inválida"
      }
      return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      return "Erro na data"
    }
  }

  function formatarHoraSegura(dataString: any) {
    if (!dataString) return "N/A"
    try {
      const data = new Date(dataString)
      if (isNaN(data.getTime())) {
        return "Hora inválida"
      }
      return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Erro na hora"
    }
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    const nomeCliente = obterNomeCliente(proposta).toLowerCase()
    const emailCliente = obterEmailCliente(proposta).toLowerCase()
    const matchesFiltro = nomeCliente.includes(filtro.toLowerCase()) || emailCliente.includes(filtro.toLowerCase())
    const matchesOrigem = origemFiltro === "todas" || proposta.origem === origemFiltro

    return matchesFiltro && matchesOrigem
  })

  // Cálculos de paginação
  const totalItens = propostasFiltradas.length
  const totalPaginas = Math.ceil(totalItens / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const propostasExibidas = propostasFiltradas.slice(indiceInicio, indiceFim)

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1)
  }, [filtro, origemFiltro])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando propostas...</span>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Propostas Em Análise</h1>
        <button
          onClick={carregarPropostas}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar Lista
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total em Análise</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{propostas.length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total de propostas em análise</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Clientes Diretos</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">
                {propostas.filter((p) => p.origem === "propostas").length}
              </div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Propostas diretas</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Via Corretores</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">
                {propostas.filter((p) => p.origem === "propostas_corretores").length}
              </div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Propostas via corretores</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <Input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Nome ou email..."
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
            <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="propostas">Clientes Diretos</SelectItem>
                <SelectItem value="propostas_corretores">Via Corretores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Propostas em Análise</h2>
            <div className="text-sm text-gray-600">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} propostas
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origem/Status
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor/Data
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {propostasExibidas.map((proposta, index) => {
                // Configurações de status e origem (igual à /propostas)
                const statusConfig = getStatusBadge(proposta.status)
                const origemConfig = getOrigemBadge(proposta.origem)
                const bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50"
                return (
                  <tr key={proposta.id} className={`${bgColor} hover:bg-gray-100`}>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-gray-900" title={obterNomeCliente(proposta)}>
                        {obterNomeCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500">ID: {proposta.id}</div>
                      {(proposta.produto_nome || proposta.produto) && (
                        <div className="text-xs text-gray-600 mt-1">Produto: {proposta.produto_nome || proposta.produto}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-900" title={obterEmailCliente(proposta)}>
                        {obterEmailCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500" title={proposta.telefone || proposta.celular}>
                        {proposta.telefone || proposta.celular || "Telefone não informado"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${origemConfig.color}`}
                        >
                          {origemConfig.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${statusConfig.color}`}
                        >
                          {(() => {
                            const IconComponent = statusConfig.icon
                            return <IconComponent className="w-3 h-3" />
                          })()}
                          {statusConfig.label}
                        </span>
                      </div>
                      {proposta.origem === "propostas_corretores" && proposta.corretor_id ? (() => {
                        const corretor = corretoresData.get(proposta.corretor_id)
                        const corretora = corretor?.gestor_id ? corretorasData.get(corretor.gestor_id) : null
                        const nomeCorretor = proposta.corretor_nome || corretor?.nome || "Corretor não identificado"
                        const nomeCorretora = corretora?.nome?.toUpperCase() || null
                        
                        return (
                          <div className="text-xs mt-2 space-y-1">
                            {nomeCorretora && (
                              <div className="text-gray-900 font-bold">{nomeCorretora}</div>
                            )}
                            <div className="text-gray-600">{nomeCorretor.toUpperCase()}</div>
                          </div>
                        )
                      })() : (
                        <div className="text-xs text-gray-400 mt-2">Envio Direto</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {typeof calcularValorTotalMensal === 'function'
                          ? `R$ ${calcularValorTotalMensal(proposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : (proposta.valor ? formatarMoeda(proposta.valor) : "Valor não informado")}
                      </div>
                      <div className="text-xs text-gray-500">{typeof formatarDataSegura === 'function' ? formatarDataSegura(proposta.created_at) : new Date(proposta.created_at).toLocaleDateString("pt-BR")}</div>
                      <div className="text-xs text-gray-500">{typeof formatarHoraSegura === 'function' ? formatarHoraSegura(proposta.created_at) : new Date(proposta.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirModalDetalhes(proposta)}
                          className="hover:bg-[#0F172A]/10"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {propostasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Nenhuma proposta em análise encontrada</div>
            <div className="text-gray-400 text-sm mt-2">
              {filtro || origemFiltro !== "todas"
                ? "Tente ajustar os filtros de busca"
                : "Todas as propostas foram analisadas"}
            </div>
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-700">
                Página {paginaAtual} de {totalPaginas}
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                  disabled={paginaAtual === 1}
                  className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="ml-1">Anterior</span>
                </Button>

                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum
                    if (totalPaginas <= 5) {
                      pageNum = i + 1
                    } else if (paginaAtual <= 3) {
                      pageNum = i + 1
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pageNum = totalPaginas - 4 + i
                    } else {
                      pageNum = paginaAtual - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={paginaAtual === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaginaAtual(pageNum)}
                        className="h-8 sm:h-9 w-8 sm:w-9 p-0 text-xs sm:text-sm rounded-none"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                >
                  <span className="mr-1">Próxima</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Rejeição */}
      {showModalRejeicao && propostaDetalhada && (
        <>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md pointer-events-none" />
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Rejeitar Proposta</h3>
              </div>
            </div>
            <div className="p-3 sm:p-6">
              <p className="text-sm sm:text-base text-gray-700 mb-4">
                Tem certeza que deseja rejeitar a proposta de <strong className="text-gray-900">{obterNomeCliente(propostaDetalhada)}</strong>?
              </p>
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Motivo da Rejeição</label>
                <textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] text-sm sm:text-base"
                  rows={3}
                  placeholder="Informe o motivo da rejeição..."
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  onClick={() => setShowModalRejeicao(false)}
                  variant="outline"
                  className="w-full sm:w-auto rounded"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={rejeitarProposta}
                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto rounded"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Modal de Devolução */}
      {showModalDevolucao && propostaDetalhada && (
        <>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md pointer-events-none" />
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Devolver Proposta</h3>
              </div>
            </div>
            <div className="p-3 sm:p-6">
              <p className="text-sm sm:text-base text-gray-700 mb-4">
                Tem certeza que deseja devolver a proposta de <strong className="text-gray-900">{obterNomeCliente(propostaDetalhada)}</strong>?
              </p>
              <p className="text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <strong>⚠️ Atenção:</strong> O cliente poderá preencher novamente a declaração de saúde e enviar novas fotos dos documentos.
              </p>
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Motivo da Devolução</label>
                <textarea
                  value={motivoDevolucao}
                  onChange={(e) => setMotivoDevolucao(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm sm:text-base"
                  rows={4}
                  placeholder="Informe o motivo da devolução e o que o cliente precisa corrigir..."
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  onClick={() => {
                    setShowModalDevolucao(false)
                    setMotivoDevolucao("")
                  }}
                  variant="outline"
                  className="w-full sm:w-auto rounded"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={devolverProposta}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white w-full sm:w-auto rounded"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Devolver Proposta
                </Button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Modal de Detalhes */}
      {showModalDetalhes && propostaDetalhada && (
        <>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md pointer-events-none" />
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header com Gradiente */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <Eye className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-xl font-bold text-white truncate">
                      Detalhes da Proposta
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">Cliente: <strong>{obterNomeCliente(propostaDetalhada)}</strong></p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                  <Button
                    onClick={() => setShowModalDetalhes(false)}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                    size="sm"
                  >
                    <span className="hidden sm:inline">Fechar</span>
                    <XCircle className="sm:hidden h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {loadingDetalhes ? (
                <div className="flex justify-center items-center h-32 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-center">
                    <div className="loading-corporate mx-auto"></div>
                    <span className="block mt-4 loading-text-corporate">Carregando detalhes...</span>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="dados" className="w-full">
                  <div className="border-b border-gray-200 mb-4 sm:mb-6">
                    <TabsList className="inline-flex h-auto w-full bg-transparent p-0 gap-0 sm:gap-1">
                      <TabsTrigger 
                        value="dados" 
                        className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=inactive]:text-gray-500 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent hover:text-gray-700 hover:border-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-none transition-all font-medium border-b-2 border-transparent"
                      >
                        <span className="hidden sm:inline">Dados Pessoais</span>
                        <span className="sm:hidden">Dados</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="saude" 
                        className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=inactive]:text-gray-500 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent hover:text-gray-700 hover:border-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-none transition-all font-medium border-b-2 border-transparent"
                      >
                        <span className="hidden sm:inline">Declaração de Saúde</span>
                        <span className="sm:hidden">Saúde</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="dados" className="space-y-4 sm:space-y-6 mt-0">
                    {/* Dados do Cliente */}
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <User className="h-4 w-4 sm:h-5 sm:w-5" />
                          Dados do Cliente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome</label>
                            <p className="text-sm sm:text-base text-gray-700">{obterNomeCliente(propostaDetalhada)}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Email</label>
                            <p className="text-sm sm:text-base text-gray-700">{obterEmailCliente(propostaDetalhada)}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Telefone</label>
                            <p className="text-sm sm:text-base text-gray-700">
                              {propostaDetalhada.telefone || propostaDetalhada.celular || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Valor</label>
                            <p className="text-sm sm:text-base font-bold text-[#0F172A]">
                              {propostaDetalhada.valor ? formatarMoeda(propostaDetalhada.valor) : "Não informado"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                  </TabsContent>

                  <TabsContent value="saude" className="space-y-4 sm:space-y-6 mt-0">
                    {renderDeclaracaoSaudeUnificada()}
                    
                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 mt-6">
                      <Button
                        onClick={() => aprovarProposta(propostaDetalhada.id)}
                        className="bg-[#0F172A] hover:bg-[#1E293B] text-white w-full sm:w-auto rounded"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => {
                          setShowModalDetalhes(false)
                          abrirModalDevolucao(propostaDetalhada)
                        }}
                        variant="outline"
                        className="w-full sm:w-auto border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A]/10 rounded"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Devolver
                      </Button>
                      <Button
                        onClick={() => {
                          setShowModalDetalhes(false)
                          abrirModalRejeicao(propostaDetalhada)
                        }}
                        variant="destructive"
                        className="w-full sm:w-auto rounded"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reprovar
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
} 
