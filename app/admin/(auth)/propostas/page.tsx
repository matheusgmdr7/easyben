"use client"

import { useState, useEffect } from "react"
import {
  buscarPropostas,
  atualizarStatusProposta,
  enviarValidacaoEmail,
  buscarDependentesProposta,
  buscarQuestionarioSaude,
  buscarPropostaCompleta,
  obterDocumentosInteligente,
  obterNomeCliente,
  obterEmailCliente,
  obterTelefoneCliente,
  obterValorProposta,
  cancelarProposta,
} from "@/services/propostas-service-unificado"
import { downloadPropostaComDocumentos } from "@/services/download-service"
import { buscarCorretores } from "@/services/corretores-service"
import { gerarPDFCompleto, gerarPDFSimples } from "@/services/pdf-completo-service"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Heart, Clock, Search, User, UserCheck, Edit, Save, CheckCircle, X, XCircle, Building, Camera, Filter, RefreshCw, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatarMoeda } from "@/utils/formatters"
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

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [corretorFiltro, setCorretorFiltro] = useState("todos")
  const [corretores, setCorretores] = useState<any[]>([])
  const [propostaDetalhada, setPropostaDetalhada] = useState<any>(null)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionariosSaude, setQuestionariosSaude] = useState<any[]>([])
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [showModalRejeicao, setShowModalRejeicao] = useState(false)
  const [showModalDetalhes, setShowModalDetalhes] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(null)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [downloadingDoc, setDownloadingDoc] = useState(null)
  const [showModalPDF, setShowModalPDF] = useState(false)
  const [modelosProposta, setModelosProposta] = useState<any[]>([])
  const [modeloSelecionado, setModeloSelecionado] = useState("")
  const [pdfUrlGerado, setPdfUrlGerado] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<any>({})

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(25)

  const [documentosParte, setDocumentosParte] = useState<any>({})

  useModalOverlay(showModalDetalhes)
  useModalOverlay(showModalRejeicao)
  useModalOverlay(showModalPDF)

  useEffect(() => {
    carregarPropostas()
    carregarModelosProposta()
    carregarCorretores()
  }, [])

  async function carregarCorretores() {
    try {
      const data = await buscarCorretores()
      setCorretores(data)
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    }
  }

  async function carregarPropostas() {
    try {
      setLoading(true)
      console.log("🔄 Carregando propostas UNIFICADAS...")
      const data = await buscarPropostas()
      console.log("📊 Propostas carregadas:", data.length)
      setPropostas(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function carregarModelosProposta() {
    try {
      const { PDFService } = await import("@/services/pdf-service")
      const modelos = await PDFService.buscarModelos()
      
      setModelosProposta(modelos)
      if (modelos && modelos.length > 0) {
        setModeloSelecionado(modelos[0].id)
      }
    } catch (error) {
      console.error("Erro ao carregar modelos:", error)
      toast.error("Erro ao carregar modelos de proposta")
    }
  }

  // NOVO: Função para parsear dependentes igual à página de sucesso
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

  // NOVO: Função para calcular valor total mensal (titular + dependentes)
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
    
    console.log(`🔍 DEBUG calcularValorTotalMensal - Proposta ${proposta.id}:`, {
      valorTitular: proposta.valor_mensal || proposta.valor || proposta.valor_total,
      dependentes: dependentesArr?.length || 0,
      totalCalculado: total
    })
    
    return total
  }

  async function carregarDetalhesCompletos(proposta: any) {
    try {
      setLoadingDetalhes(true)
      console.log("🔍 CARREGANDO DETALHES COMPLETOS - UNIFICADO")
      console.log("=".repeat(60))
      console.log("📋 Proposta ID:", proposta.id)
      console.log("📋 Origem:", proposta.origem)

      // 1. Buscar dados completos da proposta
      const propostaCompleta = await buscarPropostaCompleta(proposta.id)
      setPropostaDetalhada(propostaCompleta as any)

      // 2. Carregar dependentes
      let dependentesData = await buscarDependentesProposta(proposta.id)
      if (!dependentesData || dependentesData.length === 0) {
        // Tentar parsear do campo dependentes
        dependentesData = parseDependentes(proposta)
      }
      setDependentes(dependentesData)

      // 3. Buscar questionários de saúde (centralizado)
      let questionariosData = []
      
      // Primeiro tentar buscar na tabela questionario_respostas
      const { data: questionariosRespostas, error: errorQuestionariosRespostas } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", proposta.id)
      
      if (!errorQuestionariosRespostas && questionariosRespostas && questionariosRespostas.length > 0) {
        console.log("✅ Questionário encontrado em questionario_respostas:", questionariosRespostas.length)
        questionariosData = questionariosRespostas
        
        // Extrair peso e altura do questionário do titular
        const questionarioTitular = questionariosRespostas.find(q => q.pessoa_tipo === "titular")
        if (questionarioTitular && propostaCompleta) {
          console.log("📏 Dados físicos do titular encontrados:", {
            peso: questionarioTitular.peso,
            altura: questionarioTitular.altura
          })
          // Adicionar peso e altura à proposta
          propostaCompleta.peso = questionarioTitular.peso || propostaCompleta.peso
          propostaCompleta.altura = questionarioTitular.altura || propostaCompleta.altura
          setPropostaDetalhada(propostaCompleta)
        }
        
        // Extrair peso e altura dos questionários dos dependentes
        if (dependentesData && dependentesData.length > 0) {
          dependentesData.forEach((dependente, index) => {
            const questionarioDependente = questionariosRespostas.find(q => 
              q.pessoa_tipo === "dependente" && q.pessoa_nome === dependente.nome
            )
            if (questionarioDependente) {
              console.log(`📏 Dados físicos do dependente ${dependente.nome}:`, {
                peso: questionarioDependente.peso,
                altura: questionarioDependente.altura
              })
              dependente.peso = questionarioDependente.peso || dependente.peso
              dependente.altura = questionarioDependente.altura || dependente.altura
            }
          })
          setDependentes([...dependentesData])
        }
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
          questionariosData = questionariosSaude
        } else {
          console.log("ℹ️ Nenhum questionário encontrado em nenhuma tabela")
        }
      }
      
      // REMOVIDO: Busca duplicada de questionários dos dependentes
      // Os questionários dos dependentes já são carregados na busca principal acima
      // Esta lógica estava causando duplicação dos dados
      
      setQuestionariosSaude(questionariosData)

      console.log("🎉 CARREGAMENTO COMPLETO FINALIZADO!")
    } catch (error: any) {
      console.error("❌ ERRO GERAL AO CARREGAR DETALHES:", error)
      toast.error("Erro ao carregar detalhes da proposta: " + error.message)
    } finally {
      setLoadingDetalhes(false)
    }
  }

  async function baixarDocumentoIndividual(url: any, nomeArquivo: any) {
    try {
      setDownloadingDoc(nomeArquivo)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erro ao baixar arquivo: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      toast.success(`${nomeArquivo} baixado com sucesso!`)
    } catch (error: any) {
      console.error("❌ Erro ao baixar documento:", error)
      toast.error(`Erro ao baixar ${nomeArquivo}`)
    } finally {
      setDownloadingDoc(null)
    }
  }

  async function baixarTudoZip() {
    if (!propostaDetalhada) return

    try {
      setDownloadingZip(true)
      const nomeCliente = obterNomeCliente(propostaDetalhada)
      const documentosUrls = obterDocumentosInteligente(propostaDetalhada, "titular")
      const pdfUrl = propostaDetalhada.pdf_url

      const documentosDependentes: Record<string, any> = {}
      dependentes.forEach((dep: any, index: number) => {
        const docsDependendente = obterDocumentosInteligente(dep, "dependente")
        Object.entries(docsDependendente).forEach(([tipo, url]) => {
          documentosDependentes[`dependente_${index + 1}_${tipo}`] = url
        })
      })

      const todosDocumentos = { ...documentosUrls, ...documentosDependentes }

      if (!pdfUrl && Object.keys(todosDocumentos).length === 0) {
        toast.error("Nenhum documento disponível para download")
        return
      }

      await downloadPropostaComDocumentos(propostaDetalhada.id, nomeCliente, todosDocumentos, pdfUrl)
      toast.success("Download ZIP iniciado com sucesso!")
    } catch (error: any) {
      console.error("❌ Erro ao baixar ZIP:", error)
      toast.error("Erro ao gerar arquivo ZIP: " + error.message)
    } finally {
      setDownloadingZip(false)
    }
  }

  async function gerarPDFCompletoAction() {
    if (!propostaDetalhada) return

    try {
      setGeneratingPdf(true)
      const nomeCliente = obterNomeCliente(propostaDetalhada)
      const documentosUrls = obterDocumentosInteligente(propostaDetalhada, "titular")
      const pdfUrl = propostaDetalhada.pdf_url

      if (!pdfUrl) {
        toast.error("PDF da proposta não disponível")
        return
      }

      let pdfBlob
      try {
        pdfBlob = await gerarPDFCompleto(propostaDetalhada.id, nomeCliente, documentosUrls, pdfUrl)
      } catch (error) {
        console.warn("⚠️ Falha na geração completa, tentando PDF simples...")
        pdfBlob = await gerarPDFSimples(propostaDetalhada.id, nomeCliente, documentosUrls, pdfUrl)
      }

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Proposta_Completa_${nomeCliente.replace(/[^a-zA-Z0-9]/g, "_")}_${obterIdSeguro(propostaDetalhada).substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("PDF completo gerado com sucesso!")
    } catch (error: any) {
      console.error("❌ Erro ao gerar PDF completo:", error)
      toast.error("Erro ao gerar PDF completo: " + error.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function gerarPDFComModelo() {
    if (!propostaDetalhada || !modeloSelecionado) {
      toast.error("Selecione um modelo de proposta")
      return
    }

    try {
      setGeneratingPdf(true)
      setShowModalPDF(false)

      // Importar o serviço de PDF
      const { PDFService } = await import("@/services/pdf-service")

      // Preparar dados da proposta para o PDF
      const dadosParaPreenchimento = prepararDadosParaPreenchimento(propostaDetalhada, dependentes, questionariosSaude)

      // Gerar o nome do arquivo
      const nomeCliente = obterNomeCliente(propostaDetalhada)

      // Gerar PDF usando o modelo selecionado
      const pdfUrl = await PDFService.gerarPDFComModelo(
        modeloSelecionado,
        dadosParaPreenchimento,
        nomeCliente
      )

      if (!pdfUrl) {
        throw new Error("Falha ao gerar URL do PDF")
      }

      // Atualizar a URL do PDF na proposta
      await supabase.from("propostas").update({ pdf_url: pdfUrl }).eq("id", propostaDetalhada.id)

      setPdfUrlGerado(pdfUrl)

      toast.success("PDF gerado com sucesso!")
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error)
      toast.error("Erro ao gerar PDF: " + error.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  function prepararDadosParaPreenchimento(proposta: any, dependentes: any[] = [], questionario: any[] = []) {
    // Função auxiliar para calcular idade
    function calcularIdade(dataNascimento: any) {
      if (!dataNascimento) return ""
      const hoje = new Date()
      const nascimento = new Date(dataNascimento)
      let idade = hoje.getFullYear() - nascimento.getFullYear()
      const mes = hoje.getMonth() - nascimento.getMonth()
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--
      }
      return idade
    }

    // Função auxiliar para formatar moeda
    function formatarMoeda(valor: any) {
      if (!valor) return ""
      try {
        return typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : valor
      } catch (e) {
        return valor
      }
    }

    // Função auxiliar para pegar valor total mensal
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
      
      console.log("💰 Admin - Valor total mensal calculado:", total, "para proposta:", proposta.id)
      return total
    }

    // Montar objeto base
    const dadosPDF: any = {
      // Titular
      nome: proposta.nome || proposta.nome_cliente || "",
      cpf: proposta.cpf || "",
      rg: proposta.rg || "",
      data_nascimento: proposta.data_nascimento ? proposta.data_nascimento.split("T")[0].split("-").reverse().join("/") : "",
      email: proposta.email || proposta.email_cliente || "",
      telefone: proposta.telefone || proposta.telefone_cliente || proposta.celular || "",
      cns: proposta.cns || proposta.cns_cliente || "",
      nome_mae: proposta.nome_mae || proposta.nome_mae_cliente || "",
      sexo: proposta.sexo || proposta.sexo_cliente || "",
      estado_civil: proposta.estado_civil || proposta.estado_civil_cliente || "",
      naturalidade: proposta.naturalidade || "",
      nome_pai: proposta.nome_pai || "",
      nacionalidade: proposta.nacionalidade || "",
      profissao: proposta.profissao || "",
      orgao_expedidor: proposta.orgao_expedidor || proposta.orgao_emissor || proposta.orgao_emissor_cliente || "",
      uf_nascimento: proposta.uf_nascimento || proposta.uf || proposta.estado_nascimento || proposta.estado || proposta.uf_cliente || "",
      endereco: proposta.endereco || proposta.endereco_cliente || "",
      numero: proposta.numero || "",
      complemento: proposta.complemento || "",
      bairro: proposta.bairro || "",
      cidade: proposta.cidade || proposta.cidade_cliente || "",
      estado: proposta.estado || proposta.estado_cliente || "",
      cep: proposta.cep || proposta.cep_cliente || "",
      plano: proposta.produto_nome || proposta.plano_nome || proposta.sigla_plano || proposta.codigo_plano || "",
      cobertura: proposta.cobertura || proposta.tipo_cobertura || "",
      acomodacao: proposta.acomodacao || proposta.tipo_acomodacao || "",
      valor: (() => {
        let valorTitular = proposta.valor_plano || proposta.valor_mensal || proposta.valor || 0;
        if (typeof valorTitular !== "number") {
          valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".");
          valorTitular = Number.parseFloat(valorTitular);
        }
        return `R$ ${(!isNaN(valorTitular) && valorTitular > 0 ? valorTitular : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      })(),
      valor_total: formatarMoeda(calcularValorTotalMensal(proposta)), // Total mensal (titular + dependentes)
      peso: proposta.peso || "",
      altura: proposta.altura || "",
      corretor_nome: proposta.corretor_nome || "",
      corretor_codigo: proposta.corretor_codigo || "",
      data_criacao: proposta.created_at ? proposta.created_at.split("T")[0].split("-").reverse().join("/") : "",
      data_atualizacao: proposta.updated_at ? proposta.updated_at.split("T")[0].split("-").reverse().join("/") : "",
      status: proposta.status || "pendente",
      assinatura: `Assinado digitalmente por: ${proposta.nome || proposta.nome_cliente || ""}\nCPF: ${proposta.cpf || ""}\nE-mail: ${proposta.email || proposta.email_cliente || ""}\nIP: ${proposta.ip_assinatura || "Não disponível"}\nData/Hora: ${proposta.assinado_em ? new Date(proposta.assinado_em).toLocaleString("pt-BR") : "Não disponível"}\nNavegador: ${proposta.user_agent || "Não disponível"}\nEste documento foi assinado digitalmente conforme a legislação vigente.`,
      idade_titular: calcularIdade(proposta.data_nascimento),
    }

    // Adicionar até 4 dependentes
    let dependentesArr = dependentes && dependentes.length > 0 ? dependentes : (proposta.dependentes_dados || proposta.dependentes || [])
    if (typeof dependentesArr === "string") {
      try { dependentesArr = JSON.parse(dependentesArr) } catch { dependentesArr = [] }
    }
    dependentesArr.slice(0, 4).forEach((dep: any, idx: number) => {
      const prefixo = `dependente${idx + 1}_`
      dadosPDF[`${prefixo}nome`] = dep.nome || ""
      dadosPDF[`${prefixo}cpf`] = dep.cpf || ""
      dadosPDF[`${prefixo}rg`] = dep.rg || ""
      dadosPDF[`${prefixo}data_nascimento`] = dep.data_nascimento ? dep.data_nascimento.split("T")[0].split("-").reverse().join("/") : ""
      dadosPDF[`${prefixo}parentesco`] = dep.parentesco || ""
      dadosPDF[`${prefixo}cns`] = dep.cns || ""
      dadosPDF[`${prefixo}sexo`] = dep.sexo || ""
      dadosPDF[`${prefixo}estado_civil`] = dep.estado_civil || ""
      dadosPDF[`${prefixo}naturalidade`] = dep.naturalidade || ""
      dadosPDF[`${prefixo}idade`] = calcularIdade(dep.data_nascimento)
      dadosPDF[`${prefixo}valor_individual`] = dep.valor_individual || dep.valor || dep.valor_plano || ""
      dadosPDF[`${prefixo}peso`] = dep.peso || ""
      dadosPDF[`${prefixo}altura`] = dep.altura || ""
      dadosPDF[`${prefixo}assinatura`] = dep.assinatura || ""
      dadosPDF[`${prefixo}nome_mae`] = dep.nome_mae || ""
    })

    // Adicionar respostas do questionário de saúde (se houver)
    if (questionario && questionario.length > 0) {
      console.log("🔍 DEBUG - Processando questionário:", questionario.length, "registros")
      
      // Separar questionários por tipo de pessoa
      const questionariosTitular = questionario.filter(q => q.pessoa_tipo === "titular" || !q.pessoa_tipo)
      const questionariosDependentes = questionario.filter(q => q.pessoa_tipo === "dependente")
      
      console.log(`📊 Questionários encontrados: ${questionariosTitular.length} titular, ${questionariosDependentes.length} dependentes`)
      
      // Processar questionário do titular primeiro
      questionariosTitular.forEach((q: any, idx: number) => {
        // Verificar se é da estrutura questionario_respostas + respostas_questionario
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          console.log(`📝 Processando questionário titular ${idx + 1} (estrutura respostas_questionario):`, q.respostas_questionario.length, "respostas")
          
          q.respostas_questionario.forEach((resposta: any, respIdx: number) => {
            const pergunta = resposta.pergunta_texto || resposta.pergunta || `Pergunta ${resposta.pergunta_id || respIdx + 1}`
            const respostaValor = resposta.resposta || ""
            const observacao = resposta.observacao || ""
            
            dadosPDF[`pergunta${respIdx + 1}`] = pergunta
            dadosPDF[`resposta${respIdx + 1}`] = respostaValor
            if (observacao) {
              dadosPDF[`observacao${respIdx + 1}`] = observacao
            }
            
            // Adicionar também variações de nomes de campos para compatibilidade
            dadosPDF[`pergunta_${respIdx + 1}`] = pergunta
            dadosPDF[`resposta_${respIdx + 1}`] = respostaValor
            dadosPDF[`questao${respIdx + 1}`] = pergunta
            dadosPDF[`resp${respIdx + 1}`] = respostaValor
          })
        } else {
          // Estrutura direta (questionario_saude)
          console.log(`📝 Processando questionário titular ${idx + 1} (estrutura direta):`, q)
          
          const pergunta = q.pergunta || q.pergunta_texto || `Pergunta ${q.pergunta_id || idx + 1}`
          const resposta = q.resposta || q.resposta_texto || ""
          const observacao = q.observacao || q.detalhes || ""
          
          dadosPDF[`pergunta${idx + 1}`] = pergunta
          dadosPDF[`resposta${idx + 1}`] = resposta
          if (observacao) {
            dadosPDF[`observacao${idx + 1}`] = observacao
          }
          
          // Adicionar também variações de nomes de campos para compatibilidade
          dadosPDF[`pergunta_${idx + 1}`] = pergunta
          dadosPDF[`resposta_${idx + 1}`] = resposta
          dadosPDF[`questao${idx + 1}`] = pergunta
          dadosPDF[`resp${idx + 1}`] = resposta
        }
      })
      
      // Processar questionários dos dependentes
      questionariosDependentes.forEach((q: any, idx: number) => {
        const dependenteNome = q.pessoa_nome || `Dependente ${idx + 1}`
        console.log(`📝 Processando questionário do dependente: ${dependenteNome}`)
        
        // Verificar se é da estrutura questionario_respostas + respostas_questionario
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          console.log(`📝 Processando questionário dependente ${dependenteNome} (estrutura respostas_questionario):`, q.respostas_questionario.length, "respostas")
          
          q.respostas_questionario.forEach((resposta: any, respIdx: number) => {
            const pergunta = resposta.pergunta_texto || resposta.pergunta || `Pergunta ${resposta.pergunta_id || respIdx + 1}`
            const respostaValor = resposta.resposta || ""
            const observacao = resposta.observacao || ""
            
            // Adicionar campos no formato que o modelo PDF espera
            dadosPDF[`resposta${respIdx + 1}_dependente${idx + 1}`] = respostaValor
            if (observacao) {
              dadosPDF[`observacao${respIdx + 1}_dependente${idx + 1}`] = observacao
            }
            
            // Adicionar também variações de nomes de campos para compatibilidade
            dadosPDF[`dependente_${idx + 1}_pergunta${respIdx + 1}`] = pergunta
            dadosPDF[`dependente_${idx + 1}_resposta${respIdx + 1}`] = respostaValor
            dadosPDF[`dep${idx + 1}_pergunta${respIdx + 1}`] = pergunta
            dadosPDF[`dep${idx + 1}_resposta${respIdx + 1}`] = respostaValor
            dadosPDF[`dep${idx + 1}_questao${respIdx + 1}`] = pergunta
            dadosPDF[`dep${idx + 1}_resp${respIdx + 1}`] = respostaValor
          })
        } else {
          // Estrutura direta (questionario_saude)
          console.log(`📝 Processando questionário dependente ${dependenteNome} (estrutura direta):`, q)
          
          const pergunta = q.pergunta || q.pergunta_texto || `Pergunta ${q.pergunta_id || idx + 1}`
          const resposta = q.resposta || q.resposta_texto || ""
          const observacao = q.observacao || q.detalhes || ""
          
          // Adicionar campos no formato que o modelo PDF espera
          dadosPDF[`resposta${idx + 1}_dependente${idx + 1}`] = resposta
          if (observacao) {
            dadosPDF[`observacao${idx + 1}_dependente${idx + 1}`] = observacao
          }
          
          // Adicionar também variações de nomes de campos para compatibilidade
          dadosPDF[`dependente_${idx + 1}_pergunta${idx + 1}`] = pergunta
          dadosPDF[`dependente_${idx + 1}_resposta${idx + 1}`] = resposta
          dadosPDF[`dep${idx + 1}_pergunta${idx + 1}`] = pergunta
          dadosPDF[`dep${idx + 1}_resposta${idx + 1}`] = resposta
          dadosPDF[`dep${idx + 1}_questao${idx + 1}`] = pergunta
          dadosPDF[`dep${idx + 1}_resp${idx + 1}`] = resposta
        }
      })
    }

    console.log("Dados preparados para preenchimento do PDF:", dadosPDF)
    
    // DEBUG: Log detalhado dos campos que podem estar faltando
    console.log("🔍 DEBUG - Campos específicos que podem estar faltando:")
    console.log("   CNS:", dadosPDF.cns)
    console.log("   UF Nascimento:", dadosPDF.uf_nascimento)
    console.log("   Idade Titular:", dadosPDF.idade_titular)
    console.log("   Estado Civil:", dadosPDF.estado_civil)
    console.log("   Naturalidade:", dadosPDF.naturalidade)
    console.log("   Nome da Mãe:", dadosPDF.nome_mae)
    console.log("   Nome do Pai:", dadosPDF.nome_pai)
    console.log("   Nacionalidade:", dadosPDF.nacionalidade)
    console.log("   Profissão:", dadosPDF.profissao)
    console.log("   Órgão Expedidor:", dadosPDF.orgao_expedidor)
    console.log("   Acomodação:", dadosPDF.acomodacao)
    console.log("   Assinatura:", dadosPDF.assinatura ? "Presente" : "Ausente")
    console.log("   Peso Titular:", dadosPDF.peso, "(origem: proposta.peso =", proposta.peso, ")")
    console.log("   Altura Titular:", dadosPDF.altura, "(origem: proposta.altura =", proposta.altura, ")")
    console.log("   Valor Total:", dadosPDF.valor_total)
    
    // DEBUG: Verificar dados dos dependentes
    if (dependentesArr && dependentesArr.length > 0) {
      console.log("🔍 DEBUG - Dados dos dependentes:")
      dependentesArr.forEach((dep: any, idx: number) => {
        console.log(`   Dependente ${idx + 1} (${dep.nome}):`)
        console.log(`     CNS: ${dadosPDF[`dependente${idx + 1}_cns`]}`)
        console.log(`     Idade: ${dadosPDF[`dependente${idx + 1}_idade`]}`)
        console.log(`     UF Nascimento: ${dadosPDF[`dependente${idx + 1}_uf_nascimento`]}`)
        console.log(`     Peso: ${dadosPDF[`dependente${idx + 1}_peso`]} (origem: dep.peso = ${dep.peso})`)
        console.log(`     Altura: ${dadosPDF[`dependente${idx + 1}_altura`]} (origem: dep.altura = ${dep.altura})`)
      })
    }
    
    // DEBUG: Verificar questionário
    if (questionario && questionario.length > 0) {
      console.log("🔍 DEBUG - Questionário de saúde:")
      console.log(`   Total de respostas: ${questionario.length}`)
      questionario.forEach((q: any, idx: number) => {
        console.log(`   Pergunta ${idx + 1}: ${dadosPDF[`pergunta${idx + 1}`]} = ${dadosPDF[`resposta${idx + 1}`]}`)
      })
    }
    
    // DEBUG: Verificar campos dos dependentes
    console.log("🔍 DEBUG - Campos dos dependentes gerados:")
    if (dependentesArr && dependentesArr.length > 0) {
      dependentesArr.forEach((dep: any, idx: number) => {
        console.log(`   Dependente ${idx + 1} (${dep.nome}):`)
        // Verificar campos básicos
        console.log(`     Nome: ${dadosPDF[`dependente${idx + 1}_nome`]}`)
        console.log(`     CPF: ${dadosPDF[`dependente${idx + 1}_cpf`]}`)
        console.log(`     Peso: ${dadosPDF[`dependente${idx + 1}_peso`]}`)
        console.log(`     Altura: ${dadosPDF[`dependente${idx + 1}_altura`]}`)
        
        // Verificar campos de questionário
        for (let i = 1; i <= 21; i++) {
          const campoResposta = `resposta${i}_dependente${idx + 1}`
          if (dadosPDF[campoResposta]) {
            console.log(`     ${campoResposta}: ${dadosPDF[campoResposta]}`)
          }
        }
      })
    }
    
    return dadosPDF
  }

  function formatarData(dataString: any) {
    if (!dataString) return ""
    try {
      const data = new Date(dataString)
      return data.toLocaleDateString("pt-BR")
    } catch (e) {
      return dataString
    }
  }

  function formatarMoeda(valor: any) {
    if (!valor) return ""
    try {
      return typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : valor
    } catch (e) {
      return valor
    }
  }

  async function aprovarProposta(id: any) {
    try {
      await atualizarStatusProposta(id, "aprovada")

      // Buscar dados da proposta para enviar email ao corretor
      const proposta = propostas.find((p) => p.id === id)
      if (proposta && proposta.origem === "propostas_corretores" && proposta.corretor_email) {
        const { enviarEmailPropostaAprovada } = await import("@/services/email-service")

        try {
          await enviarEmailPropostaAprovada(
            proposta.corretor_email,
            proposta.corretor_nome || "Corretor",
            obterNomeCliente(proposta),
            String(proposta.id),
            obterValorProposta(proposta),
            proposta.comissao || 0,
          )
          console.log("✅ Email de aprovação enviado ao corretor")
        } catch (emailError) {
          console.warn("⚠️ Erro ao enviar email ao corretor:", emailError)
          // Não falhar a aprovação por causa do email
        }
      }

      toast.success("Proposta aprovada com sucesso")
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

      // Enviar email ao corretor se for proposta de corretor
      if (propostaDetalhada.origem === "propostas_corretores" && propostaDetalhada.corretor_email) {
        const { enviarEmailPropostaRejeitada } = await import("@/services/email-service")

        try {
          await enviarEmailPropostaRejeitada(
            propostaDetalhada.corretor_email,
            propostaDetalhada.corretor_nome || "Corretor",
            obterNomeCliente(propostaDetalhada),
            String(propostaDetalhada.id),
            motivoRejeicao,
          )
          console.log("✅ Email de rejeição enviado ao corretor")
        } catch (emailError) {
          console.warn("⚠️ Erro ao enviar email ao corretor:", emailError)
          // Não falhar a rejeição por causa do email
        }
      }

      toast.success("Proposta rejeitada com sucesso")
      setShowModalRejeicao(false)
      setMotivoRejeicao("")
      setPropostaDetalhada(null)
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao rejeitar proposta:", error)
      toast.error("Erro ao rejeitar proposta")
    }
  }

  async function enviarEmailValidacao(proposta: any) {
    try {
      if (!proposta.id) {
        throw new Error("Proposta sem ID")
      }

      const emailCliente = obterEmailCliente(proposta)
      const nomeCliente = obterNomeCliente(proposta)

      if (!emailCliente || emailCliente === "Email não informado") {
        throw new Error("Proposta sem email válido")
      }

      setEnviandoEmail(proposta.id)

      const sucesso = await enviarValidacaoEmail(proposta.id, emailCliente, nomeCliente)

      if (sucesso) {
        toast.success("Email de validação enviado com sucesso!")
        carregarPropostas()
      } else {
        throw new Error("Falha no envio do email")
      }
    } catch (error: any) {
      console.error("❌ Erro completo:", error)
      toast.error(error.message || "Erro ao enviar email de validação")
    } finally {
      setEnviandoEmail(null)
    }
  }

  async function enviarParaAnalise(id: any) {
    try {
      await atualizarStatusProposta(id, "pendente")
      toast.success("Proposta enviada para análise com sucesso!")
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao enviar proposta para análise:", error)
      toast.error("Erro ao enviar proposta para análise")
    }
  }

  function abrirModalRejeicao(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalRejeicao(true)
  }

  async function abrirModalDetalhes(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalDetalhes(true)
    setEditMode(false)
    setEditData({})
    await carregarDetalhesCompletos(proposta)
  }

  function iniciarEdicao() {
    console.log("🔧 INICIANDO EDIÇÃO - Dados da proposta detalhada:", propostaDetalhada)
    console.log("📅 Debug - Data nascimento original:", propostaDetalhada.data_nascimento)
    console.log("🏛️ Debug - UF nascimento original:", propostaDetalhada.uf_nascimento)
    
    const nomeInicial = obterNomeCliente(propostaDetalhada)
    const emailInicial = obterEmailCliente(propostaDetalhada)
    const telefoneInicial = obterTelefoneCliente(propostaDetalhada)
    
    console.log("🔍 Nome inicial:", nomeInicial)
    console.log("🔍 Email inicial:", emailInicial)
    console.log("🔍 Telefone inicial:", telefoneInicial)
    
    // Determinar campos válidos baseado na origem da proposta
    const camposValidosParaEdicao = propostaDetalhada.origem === 'corretor' ? 
      ['nome', 'email', 'telefone', 'cpf', 'rg', 'orgao_emissor', 'cns', 'data_nascimento', 'sexo', 'estado_civil', 'naturalidade', 'uf_nascimento', 'nome_mae', 'nome_pai', 'nacionalidade', 'profissao', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] :
      ['nome', 'email', 'telefone', 'cpf', 'rg', 'orgao_emissor', 'cns', 'data_nascimento', 'sexo', 'estado_civil', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado']
    
    const dadosIniciais = {
      nome: nomeInicial,
      email: emailInicial,
      telefone: telefoneInicial,
      cpf: propostaDetalhada.cpf || "",
      rg: propostaDetalhada.rg || "",
      orgao_emissor: propostaDetalhada.orgao_emissor || propostaDetalhada.orgao_expedidor || "",
      cns: propostaDetalhada.cns || propostaDetalhada.cns_cliente || "",
      data_nascimento: propostaDetalhada.data_nascimento || "",
      sexo: propostaDetalhada.sexo || propostaDetalhada.sexo_cliente || "",
      estado_civil: propostaDetalhada.estado_civil || propostaDetalhada.estado_civil_cliente || "",
      // Campos de endereço
      cep: propostaDetalhada.cep || "",
      endereco: propostaDetalhada.endereco || "",
      numero: propostaDetalhada.numero || "",
      complemento: propostaDetalhada.complemento || "",
      bairro: propostaDetalhada.bairro || "",
      cidade: propostaDetalhada.cidade || "",
      estado: propostaDetalhada.estado || ""
    }
    
    // Adicionar campos extras apenas se a proposta for de corretor
    if (propostaDetalhada.origem === 'corretor') {
      (dadosIniciais as any).naturalidade = propostaDetalhada.naturalidade || "";
      (dadosIniciais as any).uf_nascimento = propostaDetalhada.uf_nascimento || "";
      (dadosIniciais as any).nome_mae = propostaDetalhada.nome_mae || propostaDetalhada.nome_mae_cliente || "";
      (dadosIniciais as any).nome_pai = propostaDetalhada.nome_pai || "";
      (dadosIniciais as any).nacionalidade = propostaDetalhada.nacionalidade || "";
      (dadosIniciais as any).profissao = propostaDetalhada.profissao || "";
    }
    
    console.log("🔧 Dados iniciais para edição:", dadosIniciais)
    
    setEditMode(true)
    setEditData(dadosIniciais)
  }

  async function salvarEdicao(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    console.log("🔧 FUNÇÃO SALVAR - VERSÃO CORRIGIDA")
    console.log("🔧 Cache limpo, servidor reiniciado")
    
    try {
      console.log("ID da proposta:", propostaDetalhada.id)
      console.log("Origem da proposta:", propostaDetalhada.origem)
      console.log("Tipo da origem:", typeof propostaDetalhada.origem)
      console.log("Origem === 'corretor':", propostaDetalhada.origem === 'corretor')
      console.log("Origem === 'admin':", propostaDetalhada.origem === 'admin')
      console.log("🔍 PROPOSTA DETALHADA COMPLETA:", propostaDetalhada)
      console.log("🔍 CORRETOR_ID:", propostaDetalhada.corretor_id)
      
      // Primeiro, verificar em qual tabela o registro existe
      console.log("🔍 Verificando em qual tabela o registro existe...")
      
      // Tentar primeiro na tabela propostas_corretores
      let tabelaDestino = 'propostas_corretores'
      let { data: existingRecord, error: checkError } = await supabase
        .from(tabelaDestino)
        .select("id")
        .eq("id", propostaDetalhada.id)
        .single()
      
      // Se não encontrou na propostas_corretores, tentar na propostas
      if (checkError) {
        console.log("🔍 Não encontrado em propostas_corretores, tentando propostas...")
        tabelaDestino = 'propostas'
        const { data: existingRecord2, error: checkError2 } = await supabase
          .from(tabelaDestino)
          .select("id")
          .eq("id", propostaDetalhada.id)
          .single()
        
        existingRecord = existingRecord2
        checkError = checkError2
      }
      
      if (checkError) {
        console.error("❌ Erro ao verificar registro:", checkError)
        console.error("❌ Registro não existe em nenhuma tabela")
        toast.error(`Registro não encontrado: ${checkError.message}`)
        return
      }
      
      console.log("✅ Registro encontrado na tabela:", tabelaDestino)
      console.log("✅ Registro encontrado:", existingRecord)
      
      // Campos baseados na tabela encontrada - SALVANDO APENAS CAMPOS QUE EXISTEM
      const dadosCompletos = tabelaDestino === 'propostas_corretores' ? {
        nome_cliente: editData.nome || propostaDetalhada.nome || propostaDetalhada.nome_cliente || "",
        email_cliente: editData.email || propostaDetalhada.email || propostaDetalhada.email_cliente || "",
        telefone_cliente: editData.telefone || propostaDetalhada.telefone || propostaDetalhada.telefone_cliente || "",
        cpf: editData.cpf || propostaDetalhada.cpf || "",
        rg: editData.rg || propostaDetalhada.rg || "",
        orgao_emissor: editData.orgao_emissor || propostaDetalhada.orgao_emissor || propostaDetalhada.orgao_expedidor || "",
        cns: editData.cns || propostaDetalhada.cns || propostaDetalhada.cns_cliente || "",
        data_nascimento: editData.data_nascimento || propostaDetalhada.data_nascimento || "",
        sexo: editData.sexo || propostaDetalhada.sexo || propostaDetalhada.sexo_cliente || "",
        estado_civil: editData.estado_civil || propostaDetalhada.estado_civil || propostaDetalhada.estado_civil_cliente || "",
        naturalidade: editData.naturalidade || propostaDetalhada.naturalidade || "",
        uf_nascimento: editData.uf_nascimento || propostaDetalhada.uf_nascimento || "",
        nome_mae: editData.nome_mae || propostaDetalhada.nome_mae || propostaDetalhada.nome_mae_cliente || "",
        nome_pai: editData.nome_pai || propostaDetalhada.nome_pai || "",
        nacionalidade: editData.nacionalidade || propostaDetalhada.nacionalidade || "",
        profissao: editData.profissao || propostaDetalhada.profissao || "",
        cep: editData.cep || propostaDetalhada.cep || "",
        endereco: editData.endereco || propostaDetalhada.endereco || "",
        numero: editData.numero || propostaDetalhada.numero || "",
        complemento: editData.complemento || propostaDetalhada.complemento || "",
        bairro: editData.bairro || propostaDetalhada.bairro || "",
        cidade: editData.cidade || propostaDetalhada.cidade || "",
        estado: editData.estado || propostaDetalhada.estado || ""
      } : {
        // Campos básicos que existem na tabela 'propostas'
        nome: editData.nome || propostaDetalhada.nome || propostaDetalhada.nome_cliente || "",
        // Salvar email em AMBOS os campos para garantir compatibilidade
        email: editData.email || propostaDetalhada.email || propostaDetalhada.email_cliente || "",
        email_cliente: editData.email || propostaDetalhada.email || propostaDetalhada.email_cliente || "",
        // Salvar telefone em AMBOS os campos para garantir compatibilidade
        telefone: editData.telefone || propostaDetalhada.telefone || propostaDetalhada.telefone_cliente || "",
        telefone_cliente: editData.telefone || propostaDetalhada.telefone || propostaDetalhada.telefone_cliente || "",
        cpf: editData.cpf || propostaDetalhada.cpf || "",
        rg: editData.rg || propostaDetalhada.rg || "",
        orgao_emissor: editData.orgao_emissor || propostaDetalhada.orgao_emissor || propostaDetalhada.orgao_expedidor || "",
        cns: editData.cns || propostaDetalhada.cns || propostaDetalhada.cns_cliente || "",
        data_nascimento: editData.data_nascimento || propostaDetalhada.data_nascimento || "",
        sexo: editData.sexo || propostaDetalhada.sexo || propostaDetalhada.sexo_cliente || "",
        estado_civil: editData.estado_civil || propostaDetalhada.estado_civil || propostaDetalhada.estado_civil_cliente || "",
        // Campos de endereço que existem na tabela 'propostas'
        cep: editData.cep || propostaDetalhada.cep || "",
        endereco: editData.endereco || propostaDetalhada.endereco || "",
        numero: editData.numero || propostaDetalhada.numero || "",
        complemento: editData.complemento || propostaDetalhada.complemento || "",
        bairro: editData.bairro || propostaDetalhada.bairro || "",
        cidade: editData.cidade || propostaDetalhada.cidade || "",
        estado: editData.estado || propostaDetalhada.estado || ""
        // Removidos campos que não existem na tabela 'propostas':
        // - naturalidade, uf_nascimento, nome_mae, nome_pai, nacionalidade, profissao
      }
      
      // Filtrar apenas campos que existem na tabela de destino
      const camposValidos = tabelaDestino === 'propostas_corretores' ? 
        ['nome', 'email', 'telefone', 'cpf', 'rg', 'orgao_emissor', 'cns', 'data_nascimento', 'sexo', 'estado_civil', 'naturalidade', 'uf_nascimento', 'nome_mae', 'nome_pai', 'nacionalidade', 'profissao', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] :
        ['nome', 'email', 'email_cliente', 'telefone', 'telefone_cliente', 'cpf', 'rg', 'orgao_emissor', 'cns', 'data_nascimento', 'sexo', 'estado_civil', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado']
      
      // Filtrar dadosCompletos para incluir apenas campos válidos
      const dadosFiltrados = Object.keys(dadosCompletos)
        .filter(key => camposValidos.includes(key))
        .reduce((obj, key) => {
          (obj as any)[key] = (dadosCompletos as any)[key]
          return obj
        }, {} as any)
      
      console.log("🔍 Dados completos para salvar:", dadosCompletos)
      console.log("🔍 Campos válidos para tabela:", tabelaDestino, camposValidos)
      console.log("🔍 Dados filtrados (apenas campos válidos):", dadosFiltrados)
      console.log("🔍 EditData completo:", editData)
      console.log("🔍 Email no editData:", editData.email)
      console.log("🔍 Email na propostaDetalhada:", propostaDetalhada.email)
      
      // Verificar se ainda há campos inválidos
      const camposInvalidos = Object.keys(dadosFiltrados).filter(key => !camposValidos.includes(key))
      if (camposInvalidos.length > 0) {
        console.error("❌ CAMPOS INVÁLIDOS AINDA PRESENTES:", camposInvalidos)
      } else {
        console.log("✅ Todos os campos são válidos para a tabela:", tabelaDestino)
      }
      
      // Debug adicional para ver exatamente o que está sendo enviado
      console.log("🔍 DEBUG - Chaves dos dadosFiltrados:", Object.keys(dadosFiltrados))
      console.log("🔍 DEBUG - Verificando se nacionalidade está presente:", 'nacionalidade' in dadosFiltrados)
      console.log("🔍 DEBUG - Verificando se naturalidade está presente:", 'naturalidade' in dadosFiltrados)
      
      const { data, error } = await supabase
        .from(tabelaDestino)
        .update(dadosFiltrados)
        .eq("id", propostaDetalhada.id)
        .select()

      if (error) {
        console.error("❌ Erro do Supabase:", error)
        console.error("❌ Detalhes completos do erro:", JSON.stringify(error, null, 2))
        console.error("❌ Código do erro:", error.code)
        console.error("❌ Mensagem do erro:", error.message)
        console.error("❌ Detalhes do erro:", error.details)
        console.error("❌ Hint do erro:", error.hint)
        toast.error(`Erro ao salvar: ${error.message}`)
        return
      }

      console.log("✅ Dados salvos com sucesso:", data)
      console.log("🔍 Email salvo no banco:", data?.[0]?.email || data?.[0]?.email_cliente)
      console.log("🔍 Nome salvo no banco:", data?.[0]?.nome || data?.[0]?.nome_cliente)
      console.log("🔍 Telefone salvo no banco:", data?.[0]?.telefone || data?.[0]?.telefone_cliente)
      
      toast.success("Dados atualizados com sucesso!")
      setEditMode(false)
      
      // Atualizar os dados da proposta detalhada com os dados salvos
      const dadosAtualizados = data?.[0] || {}
      setPropostaDetalhada({ ...propostaDetalhada, ...dadosAtualizados })
      
      // Recarregar a lista de propostas
      carregarPropostas()
      
    } catch (error: any) {
      console.error("❌ Erro geral:", error)
      toast.error(`Erro ao salvar: ${error.message}`)
    }
  }

  function cancelarEdicao() {
    setEditMode(false)
    setEditData({})
  }

  const handleCancelarProposta = async () => {
    if (!propostaDetalhada) return

    const motivo = prompt("Digite o motivo do cancelamento (opcional):")
    if (motivo === null) return // Usuário cancelou

    try {
      const sucesso = await cancelarProposta(propostaDetalhada.id, motivo || undefined)
      
      if (sucesso) {
        toast.success("Proposta cancelada com sucesso!")
        setShowModalDetalhes(false)
        carregarPropostas() // Recarregar lista
      } else {
        toast.error("Erro ao cancelar proposta")
      }
    } catch (error) {
      console.error("Erro ao cancelar proposta:", error)
      toast.error("Erro ao cancelar proposta")
    }
  }

  function getStatusBadge(status: any) {
    if (status === "parcial") {
      return {
        label: "AGUARDANDO VALIDAÇÃO",
        color: "bg-gray-100 text-blue-600",
        icon: Clock
      }
    } else if (status === "aguardando_cliente") {
      return {
        label: "AGUARDANDO CLIENTE",
        color: "bg-gray-100 text-amber-600",
        icon: Clock
      }
    } else if (status === "pendente") {
      return {
        label: "AGUARDANDO ANÁLISE",
        color: "bg-gray-100 text-yellow-600",
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
        color: "bg-gray-100 text-red-600",
        icon: X
      }
    } else if (status === "cancelada") {
      return {
        label: "CANCELADA",
        color: "bg-gray-100 text-orange-600",
        icon: X
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
        color: "bg-gray-100 text-amber-600",
        icon: RotateCcw
      }
    } else if (status === "transmitida") {
      return {
        label: "TRANSMITIDA",
        color: "bg-gray-100 text-green-600",
        icon: CheckCircle
      }
    } else {
      return {
        label: status || "INDEFINIDO",
        color: "bg-gray-100 text-gray-600",
        icon: CheckCircle
      }
    }
  }


  function obterIdSeguro(proposta: any) {
    if (!proposta || !proposta.id) return "N/A"
    return String(proposta.id)
  }

  function getTipoArquivo(url: any) {
    const extensao = url.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extensao)) {
      return "imagem"
    } else if (extensao === "pdf") {
      return "pdf"
    }
    return "documento"
  }

  function getNomeDocumento(key: any) {
    const nomes = {
      rg_frente: "RG (Frente)",
      rg_verso: "RG (Verso)",
      cpf: "CPF",
      comprovante_residencia: "Comprovante de Residência",
      cns: "Cartão Nacional de Saúde",
      foto_3x4: "Foto 3x4",
      certidao_nascimento: "Certidão de Nascimento",
      comprovante_renda: "Comprovante de Renda",
    }
    return nomes[key as keyof typeof nomes] || (key.replace(/_/g, " ").replace(/\b\w/g, (l: any) => l.toUpperCase()))
  }

  function getParentescoAmigavel(parentesco: any) {
    const parentescos = {
      conjuge: "Cônjuge",
      filho: "Filho(a)",
      pai: "Pai",
      mae: "Mãe",
      irmao: "Irmão(ã)",
      sogro: "Sogro(a)",
      genro: "Genro/Nora",
      neto: "Neto(a)",
      outro: "Outro",
    }
    return parentescos[parentesco as keyof typeof parentescos] || parentesco
  }

  function calcularIdade(dataNascimento: any) {
    if (!dataNascimento) return "N/A"
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return `${idade} anos`
  }

  function formatarDataSegura(dataString: any) {
    if (!dataString) return "N/A"

    try {
      // Se a data está no formato YYYY-MM-DD, vamos tratá-la como data local
      if (typeof dataString === 'string' && dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = dataString.split('-')
        const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
        return data.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit", 
          year: "numeric",
        })
      }

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

  function formatarDataHoraSegura(dataString: any) {
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

  function renderDeclaracaoSaudeUnificada() {
    // Mostrar fotos do titular se existirem
    const temFotos = propostaDetalhada?.foto_rosto || propostaDetalhada?.foto_corpo_inteiro
    const titularQuestionario = questionariosSaude?.find((q: any) => q.pessoa_tipo === "titular")
    
    if (!questionariosSaude || questionariosSaude.length === 0) {
      return (
        <div className="space-y-4 sm:space-y-6">
          {/* Fotos do Cliente - Mostrar mesmo se não houver questionário */}
          {temFotos && (
            <Card className="border-2 border-gray-200 shadow-sm rounded-none">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
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
          
          <Card className="border-2 border-gray-200 shadow-sm rounded-none">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
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
    return (
      <div className="space-y-4 sm:space-y-6">
        {questionariosSaude.map((q, idx) => {
          const isTitular = q.pessoa_tipo === "titular"
          const mostrarFotos = isTitular && temFotos
          
          return (
            <Card key={q.id || idx} className="border-2 border-gray-200 shadow-sm rounded-none">
              <CardHeader className={`bg-gradient-to-r ${isTitular ? 'from-blue-50 to-blue-100/50' : 'from-red-50 to-red-100/50'} border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none`}>
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

  function renderDocumentos(documentos: any, titulo: any = "Documentos", pessoa: any = "titular") {
    const isTitular = pessoa === "titular"
    if (!documentos || Object.keys(documentos).length === 0) {
      return (
        <Card className="border-2 border-gray-200 shadow-sm rounded-none">
          <CardHeader className={`bg-gradient-to-r ${isTitular ? 'from-blue-50 to-blue-100/50' : 'from-green-50 to-green-100/50'} border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none`}>
            <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              {titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
            <p className="text-gray-500">Nenhum documento encontrado</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="border-2 border-gray-200 shadow-sm rounded-none">
        <CardHeader className={`bg-gradient-to-r ${isTitular ? 'from-blue-50 to-blue-100/50' : 'from-green-50 to-green-100/50'} border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none`}>
          <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            {titulo}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(documentos as any).map(([tipo, url]: [any, any]) => {
              const nomeDoc = getNomeDocumento(tipo)
              const tipoArquivo = getTipoArquivo(url)
              const nomeArquivo = `${nomeDoc.replace(/[^a-zA-Z0-9]/g, "_")}.${url.split(".").pop()?.toLowerCase() || "pdf"}`

              return (
                <div key={tipo} className="border-2 border-gray-200 rounded-none p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">{nomeDoc}</div>
                      <div className="text-xs text-gray-500 capitalize mt-1">{tipoArquivo}</div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(url, "_blank")}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        title="Visualizar"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => baixarDocumentoIndividual(url, nomeArquivo)}
                        disabled={downloadingDoc === nomeArquivo}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                        title="Baixar"
                      >
                        {downloadingDoc === nomeArquivo ? (
                          <div className="loading-corporate-small"></div>
                        ) : (
                          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  function obterNomeCorretor(proposta: any) {
    if (!proposta.corretor_id) {
      return "Cliente Direto"
    }
    const corretor = corretores.find(c => c.id === proposta.corretor_id)
    return corretor ? corretor.nome : "Corretor não encontrado"
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    const nomeCliente = obterNomeCliente(proposta).toLowerCase()
    const emailCliente = obterEmailCliente(proposta).toLowerCase()
    const matchesFiltro = nomeCliente.includes(filtro.toLowerCase()) || emailCliente.includes(filtro.toLowerCase())
    const matchesStatus = statusFiltro === "todos" || proposta.status === statusFiltro
    const matchesCorretor = corretorFiltro === "todos" || 
      (corretorFiltro === "direto" && (proposta.origem === "propostas" || !proposta.corretor_id)) ||
      (corretorFiltro !== "direto" && corretorFiltro !== "todos" && proposta.corretor_id === corretorFiltro)

    return matchesFiltro && matchesStatus && matchesCorretor
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
  }, [filtro, statusFiltro, corretorFiltro])

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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-sans">Propostas Recebidas</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base font-medium">Gerencie todas as propostas do sistema</p>
          </div>
        <button
          onClick={carregarPropostas}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-4 sm:px-6 py-2 text-sm sm:text-base btn-corporate shadow-corporate flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <span>Atualizar Lista</span>
        </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{propostas.length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total de propostas</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Aguardando</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{propostas.filter((p) => p.status === "parcial").length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Aguardando validação</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Análise</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{propostas.filter((p) => p.status === "pendente").length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Em análise</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Corretores</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{propostas.filter((p) => p.origem === "propostas_corretores").length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Propostas via corretores</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm rounded-lg">
        <div className="bg-gray-50 rounded-t-lg p-3 sm:p-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 font-sans">Filtros de Busca</h3>
          <p className="text-gray-600 text-xs sm:text-sm font-medium mt-1">Refine sua pesquisa</p>
        </div>
        <div className="p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Nome ou email..."
              className="w-full px-3 py-2 sm:px-2 sm:py-1 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full px-3 py-2 sm:px-2 sm:py-1 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
            >
              <option value="todos">Todos</option>
              <option value="parcial">Aguardando Validação</option>
              <option value="aguardando_cliente">Aguardando Cliente</option>
              <option value="pendente">Aguardando Análise</option>
              <option value="aprovada">Aprovada</option>
              <option value="rejeitada">Rejeitada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Corretor</label>
            <select
              value={corretorFiltro}
              onChange={(e) => setCorretorFiltro(e.target.value)}
              className="w-full px-3 py-2 sm:px-2 sm:py-1 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A]"
            >
              <option value="todos">Todos os Corretores</option>
              <option value="direto">Clientes Diretos</option>
              {corretores.map((corretor) => (
                <option key={corretor.id} value={corretor.id}>
                  {corretor.nome}
                </option>
              ))}
            </select>
          </div>
          </div>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Lista de Propostas</h2>
            <div className="text-xs sm:text-sm text-gray-600">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} propostas
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
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
              {propostasExibidas.map((proposta) => {
                const statusConfig = getStatusBadge(proposta.status)
                return (
                  <tr key={`${proposta.origem}-${proposta.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-gray-900" title={obterNomeCliente(proposta)}>
                        {obterNomeCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500">ID: {obterIdSeguro(proposta)}</div>
                      {(proposta.produto_nome || proposta.produto) && (
                        <div className="text-xs text-gray-600 mt-1">Produto: {proposta.produto_nome || proposta.produto}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-900" title={obterEmailCliente(proposta)}>
                        {obterEmailCliente(proposta)}
                      </div>
                      <div className="text-xs text-gray-500" title={obterTelefoneCliente(proposta)}>
                        {obterTelefoneCliente(proposta)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500" title={proposta.corretor_nome ? `Corretor: ${proposta.corretor_nome}` : "Envio Direto"}>
                        {proposta.corretor_nome ? (
                          <span className="text-gray-900 font-normal">{proposta.corretor_nome}</span>
                        ) : (
                          <span className="text-gray-400">Envio Direto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {calcularValorTotalMensal(proposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">{formatarDataSegura(proposta.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatarHoraSegura(proposta.created_at)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => abrirModalDetalhes(proposta)}
                          className="text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs transition-colors"
                        >
                          Ver
                        </button>

                        {proposta.status === "parcial" && (
                          <button
                            onClick={() => enviarEmailValidacao(proposta)}
                            disabled={enviandoEmail === proposta.id}
                            className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded disabled:opacity-50 transition-colors text-xs"
                          >
                            {enviandoEmail === proposta.id ? "..." : "Email"}
                          </button>
                        )}

                        {proposta.status === "pendente" && (
                            <button
                            onClick={() => enviarParaAnalise(proposta.id)}
                            className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors text-xs"
                            >
                            Enviar para Análise
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {propostasExibidas.map((proposta) => {
            const statusConfig = getStatusBadge(proposta.status)
            return (
              <div key={`${proposta.origem}-${proposta.id}`} className="p-4 hover:bg-gray-50">
                <div className="space-y-3">
                  {/* Cliente */}
                  <div>
                    <div className="text-sm font-bold text-gray-900" title={obterNomeCliente(proposta)}>
                      {obterNomeCliente(proposta)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ID: {obterIdSeguro(proposta)}</div>
                    {(proposta.produto_nome || proposta.produto) && (
                      <div className="text-xs text-gray-600 mt-1">Produto: {proposta.produto_nome || proposta.produto}</div>
                    )}
                  </div>

                  {/* Contato */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Email:</div>
                    <div className="text-xs text-gray-900" title={obterEmailCliente(proposta)}>
                      {obterEmailCliente(proposta)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Telefone:</div>
                    <div className="text-xs text-gray-900" title={obterTelefoneCliente(proposta)}>
                      {obterTelefoneCliente(proposta)}
                    </div>
                  </div>

                  {/* Status e Origem */}
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    <div className="text-xs text-gray-600 mt-1" title={proposta.corretor_nome ? `Corretor: ${proposta.corretor_nome}` : "Envio Direto"}>
                      {proposta.corretor_nome ? (
                        <span className="text-gray-900 font-normal">{proposta.corretor_nome}</span>
                      ) : (
                        <span className="text-gray-400">Envio Direto</span>
                      )}
                    </div>
                  </div>

                  {/* Valor e Data */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Valor:</div>
                    <div className="text-sm font-semibold text-gray-900">
                      R$ {calcularValorTotalMensal(proposta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatarDataSegura(proposta.created_at)}</div>
                    <div className="text-xs text-gray-500">{formatarHoraSegura(proposta.created_at)}</div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => abrirModalDetalhes(proposta)}
                      className="flex-1 text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-xs font-medium transition-colors"
                    >
                      Ver Detalhes
                    </button>

                    {proposta.status === "parcial" && (
                      <button
                        onClick={() => enviarEmailValidacao(proposta)}
                        disabled={enviandoEmail === proposta.id}
                        className="flex-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded disabled:opacity-50 transition-colors text-xs font-medium"
                      >
                        {enviandoEmail === proposta.id ? "Enviando..." : "Enviar Email"}
                      </button>
                    )}

                    {proposta.status === "pendente" && (
                      <button
                        onClick={() => enviarParaAnalise(proposta.id)}
                        className="flex-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors text-xs font-medium"
                      >
                        Enviar para Análise
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {propostasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Nenhuma proposta encontrada</div>
            <div className="text-gray-400 text-sm mt-2">
              {filtro || statusFiltro !== "todos" || corretorFiltro !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Aguardando novas propostas"}
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

      {/* Modal de Detalhes */}
      {showModalDetalhes && propostaDetalhada && (
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
                      {editMode && <span className="ml-2 text-xs sm:text-sm text-orange-300 font-normal">(Modo de Edição)</span>}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">Cliente: <strong>{obterNomeCliente(propostaDetalhada)}</strong></p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
                  {editMode ? (
                    <>
                      <Button
                        onClick={(e) => salvarEdicao(e)}
                        className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                        size="sm"
                      >
                        Salvar
                      </Button>
                      <Button
                        onClick={cancelarEdicao}
                        className="bg-gray-500/80 hover:bg-gray-500 text-white border border-gray-400/50 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={iniciarEdicao}
                        className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                        size="sm"
                      >
                        <span className="hidden sm:inline">Editar</span>
                        <Edit className="sm:hidden h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setShowModalPDF(true)}
                        disabled={generatingPdf}
                        className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 disabled:opacity-50"
                        size="sm"
                      >
                        <span className="hidden sm:inline">{generatingPdf ? "Gerando PDF..." : "Gerar PDF"}</span>
                        <FileText className="sm:hidden h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {pdfUrlGerado && (
                    <Button
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = pdfUrlGerado
                        link.download = `Proposta_${obterNomeCliente(propostaDetalhada).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
                        link.target = '_blank'
                        link.rel = 'noopener noreferrer'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                      className="bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                      size="sm"
                    >
                      <span className="hidden sm:inline">Baixar PDF</span>
                      <Download className="sm:hidden h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={handleCancelarProposta}
                    className="bg-red-500/80 hover:bg-red-500 text-white border border-red-400/50 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                    size="sm"
                  >
                    <span className="hidden sm:inline">Cancelar Proposta</span>
                    <span className="sm:hidden">Cancelar Prop.</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setShowModalDetalhes(false)
                      setPdfUrlGerado(null)
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 sm:h-9 w-8 sm:w-9 p-0"
                  >
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">

              {loadingDetalhes ? (
                <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-center">
                    <div className="loading-corporate mx-auto"></div>
                    <span className="block mt-4 loading-text-corporate">Carregando detalhes...</span>
                    <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
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
                        value="documentos" 
                        className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=inactive]:text-gray-500 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent hover:text-gray-700 hover:border-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-none transition-all font-medium border-b-2 border-transparent"
                      >
                        Documentos
                      </TabsTrigger>
                      <TabsTrigger 
                        value="saude" 
                        className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=inactive]:text-gray-500 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent hover:text-gray-700 hover:border-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-none transition-all font-medium border-b-2 border-transparent"
                      >
                        <span className="hidden sm:inline">Declaração de Saúde</span>
                        <span className="sm:hidden">Saúde</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="dependentes" 
                        className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=inactive]:text-gray-500 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent hover:text-gray-700 hover:border-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-none transition-all font-medium border-b-2 border-transparent"
                      >
                        Dependentes
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="dados" className="space-y-4 sm:space-y-6 mt-0">
                    {/* Dados do Titular */}
                    <Card className="border-2 border-gray-200 shadow-sm rounded-none">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <User className="h-4 w-4 sm:h-5 sm:w-5" />
                          Dados do Titular
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome Completo</label>
                            {editMode ? (
                              <Input
                                value={editData.nome || ""}
                                onChange={(e) => setEditData({...editData, nome: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900 font-medium">{obterNomeCliente(propostaDetalhada)}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Email</label>
                            {editMode ? (
                              <Input
                                type="email"
                                value={editData.email || ""}
                                onChange={(e) => setEditData({...editData, email: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{obterEmailCliente(propostaDetalhada)}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Telefone</label>
                            {editMode ? (
                              <Input
                                value={editData.telefone || ""}
                                onChange={(e) => setEditData({...editData, telefone: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{obterTelefoneCliente(propostaDetalhada)}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF</label>
                            {editMode ? (
                              <Input
                                value={editData.cpf || ""}
                                onChange={(e) => setEditData({...editData, cpf: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{propostaDetalhada.cpf || "Não informado"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG</label>
                            {editMode ? (
                              <Input
                                value={editData.rg || ""}
                                onChange={(e) => setEditData({...editData, rg: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{propostaDetalhada.rg || "Não informado"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Órgão Emissor</label>
                            {editMode ? (
                              <Input
                                value={editData.orgao_emissor || ""}
                                onChange={(e) => setEditData({...editData, orgao_emissor: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{propostaDetalhada.orgao_emissor || propostaDetalhada.orgao_expedidor || "Não informado"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CNS</label>
                            {editMode ? (
                              <Input
                                value={editData.cns || ""}
                                onChange={(e) => setEditData({...editData, cns: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{propostaDetalhada.cns || propostaDetalhada.cns_cliente || "Não informado"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Nascimento</label>
                            {editMode ? (
                              <Input
                                type="date"
                                value={editData.data_nascimento || ""}
                                onChange={(e) => setEditData({...editData, data_nascimento: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">
                              {propostaDetalhada.data_nascimento
                                ? formatarDataSegura(propostaDetalhada.data_nascimento)
                                : "Não informado"}
                            </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Idade</label>
                            <p className="text-gray-900">{calcularIdade(propostaDetalhada.data_nascimento)}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Sexo</label>
                            <p className="text-gray-900">{propostaDetalhada.sexo || propostaDetalhada.sexo_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Estado Civil</label>
                            <p className="text-gray-900">{propostaDetalhada.estado_civil || propostaDetalhada.estado_civil_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Naturalidade</label>
                            <p className="text-gray-900">{propostaDetalhada.naturalidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">UF de Nascimento</label>
                            {editMode ? (
                              <Input
                                value={editData.uf_nascimento || ""}
                                onChange={(e) => setEditData({...editData, uf_nascimento: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                                placeholder="Ex: SP, RJ, MG..."
                              />
                            ) : (
                            <p className="text-gray-900">{propostaDetalhada.uf_nascimento || "Não informado"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome da Mãe</label>
                            {editMode ? (
                              <Input
                                value={editData.nome_mae || ""}
                                onChange={(e) => setEditData({...editData, nome_mae: e.target.value})}
                                className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-none text-sm sm:text-base"
                              />
                            ) : (
                            <p className="text-gray-900">{propostaDetalhada.nome_mae || propostaDetalhada.nome_mae_cliente || "Não informado"}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome do Pai</label>
                            <p className="text-gray-900">{propostaDetalhada.nome_pai || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nacionalidade</label>
                            <p className="text-gray-900">{propostaDetalhada.nacionalidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Profissão</label>
                            <p className="text-gray-900">{propostaDetalhada.profissao || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Assinatura</label>
                            {propostaDetalhada.assinatura || propostaDetalhada.assinatura_imagem ? (
                              <img
                                src={propostaDetalhada.assinatura || propostaDetalhada.assinatura_imagem}
                                alt="Assinatura"
                                className="max-w-full sm:max-w-[200px] border-2 border-gray-200 rounded-lg p-2 bg-white"
                              />
                            ) : (
                              <p className="text-gray-900">Não informado</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Endereço */}
                    <Card className="border-2 border-gray-200 shadow-sm rounded-none">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <Building className="h-4 w-4 sm:h-5 sm:w-5" />
                          Endereço
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Logradouro</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.endereco || "Não informado"}
                              {propostaDetalhada.numero && `, ${propostaDetalhada.numero}`}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Complemento</label>
                            <p className="text-gray-900">{propostaDetalhada.complemento || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Bairro</label>
                            <p className="text-gray-900">{propostaDetalhada.bairro || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Cidade</label>
                            <p className="text-gray-900">{propostaDetalhada.cidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Estado</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.estado || propostaDetalhada.uf || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CEP</label>
                            <p className="text-gray-900">{propostaDetalhada.cep || "Não informado"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Informações do Plano */}
                    <Card className="border-2 border-gray-200 shadow-sm rounded-none">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                          Informações do Plano
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Produto</label>
                            <p className="text-gray-900 font-medium">
                              {propostaDetalhada.produto_nome || propostaDetalhada.produto || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Plano</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.plano_nome || propostaDetalhada.sigla_plano || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Cobertura</label>
                            <p className="text-gray-900">{propostaDetalhada.cobertura || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Acomodação</label>
                            <p className="text-gray-900">{propostaDetalhada.acomodacao || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Valor Mensal</label>
                            <p className="text-2xl font-bold text-[#0F172A]">
                              R$ {calcularValorTotalMensal(propostaDetalhada).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            {/* Detalhamento dos valores se houver dependentes */}
                            {(() => {
                              const dependentesArr = parseDependentes(propostaDetalhada)
                              if (dependentesArr && dependentesArr.length > 0) {
                                return (
                                  <div className="mt-2 text-xs text-gray-600">
                                    <div><b>{propostaDetalhada.nome}</b>: R$ {((typeof propostaDetalhada.valor_mensal !== "number" ? String(propostaDetalhada.valor_mensal).replace(/[^\d,\.]/g, "").replace(",", ".") : propostaDetalhada.valor_mensal) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                    {dependentesArr.map((dep: any, idx: number) => {
                                      let valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
                                      if (typeof valorDep !== "number") {
                                        valorDep = String(valorDep).replace(/[^\d,\.]/g, "").replace(",", ".")
                                        valorDep = Number.parseFloat(valorDep)
                                      }
                                      return (
                                        <div key={idx}><b>{dep.nome}</b>: R$ {(!isNaN(valorDep) && valorDep > 0 ? valorDep : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                      )
                                    })}
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Status</label>
                            <Badge className={`${getStatusBadge(propostaDetalhada.status).color} inline-flex items-center gap-1`}>
                              {(() => {
                                const statusInfo = getStatusBadge(propostaDetalhada.status)
                                const IconComponent = statusInfo.icon
                                return <IconComponent className="w-3 h-3" />
                              })()}
                              {getStatusBadge(propostaDetalhada.status).label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documentos" className="space-y-4 sm:space-y-6 mt-0">
                    {/* Documentos do Titular */}
                    {renderDocumentos(
                      obterDocumentosInteligente(propostaDetalhada, "titular"),
                      "Documentos do Titular",
                      "titular",
                    )}

                    {/* Documentos dos Dependentes */}
                    {dependentes.map((dependente: any, index: any) => {
                      const documentosDep = obterDocumentosInteligente(dependente, "dependente", propostaDetalhada, index)
                      if (Object.keys(documentosDep).length > 0) {
                        return renderDocumentos(
                          documentosDep,
                          `Documentos - ${dependente.nome} (${getParentescoAmigavel(dependente.parentesco)})`,
                          "dependente",
                        )
                      }
                      return null
                    })}
                  </TabsContent>

                  <TabsContent value="saude" className="space-y-4 sm:space-y-6 mt-0">
                    {renderDeclaracaoSaudeUnificada()}
                  </TabsContent>

                  <TabsContent value="dependentes" className="space-y-4 sm:space-y-6 mt-0">
                    {dependentes.length === 0 ? (
                      <Card className="border-2 border-gray-200 shadow-sm rounded-none">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
                          <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                            <User className="h-4 w-4 sm:h-5 sm:w-5" />
                            Dependentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 text-center">
                          <p className="text-gray-500">Nenhum dependente cadastrado</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {dependentes.map((dependente: any, index: any) => (
                          <Card key={dependente.id || index} className="border-2 border-gray-200 shadow-sm rounded-none">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 rounded-none">
                              <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="truncate">{dependente.nome} - {getParentescoAmigavel(dependente.parentesco)}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome Completo</label>
                                  <p className="text-gray-900">{dependente.nome || "Não informado"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF</label>
                                  <p className="text-gray-900">{dependente.cpf || "Não informado"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Nascimento</label>
                                  <p className="text-gray-900">
                                    {dependente.data_nascimento
                                      ? formatarDataSegura(dependente.data_nascimento)
                                      : "Não informado"}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Idade</label>
                                  <p className="text-gray-900">{calcularIdade(dependente.data_nascimento)}</p>
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Sexo</label>
                                  <p className="text-gray-900">{dependente.sexo || "Não informado"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Parentesco</label>
                                  <p className="text-gray-900">{getParentescoAmigavel(dependente.parentesco)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {showModalRejeicao && propostaDetalhada && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-100 to-pink-100 border-b border-red-200 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Rejeitar Proposta</h3>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da rejeição:</label>
                <textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  rows={4}
                  placeholder="Descreva o motivo da rejeição..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModalRejeicao(false)
                    setMotivoRejeicao("")
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={rejeitarProposta}
                  disabled={!motivoRejeicao.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirmar Rejeição
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal PDF */}
      {showModalPDF && propostaDetalhada && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header com Gradiente */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Gerar PDF</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Escolha o modelo que será usado para gerar o PDF da proposta
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo <span className="text-red-500">*</span>
                </label>
                <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelosProposta.map((modelo) => (
                      <SelectItem key={modelo.id} value={modelo.id}>
                        {modelo.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModalPDF(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={gerarPDFComModelo}
                  disabled={generatingPdf || !modeloSelecionado}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {generatingPdf ? (
                    <>
                      <div className="loading-corporate-small mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      Gerar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
