"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { PDFService } from "@/services/pdf-service"
import { PropostaHTMLService } from "@/services/proposta-html-service"
import { supabase } from "@/lib/supabase"
import { FileText, AlertCircle, RefreshCw, Info } from "lucide-react"
import { obterProposta } from "@/services/propostas-digital-service"
import { obterModeloProposta } from "@/services/proposta-modelos-service"

interface PDFGeneratorProps {
  propostaId?: string
  modeloId?: string
  onPDFGenerated?: (url: string) => void
  onError?: (error: string) => void
  className?: string
  valorTotalMensal?: string // NOVO: Valor total mensal calculado no frontend
}

export default function PDFGenerator({ 
  propostaId, 
  modeloId, 
  onPDFGenerated, 
  onError, 
  className,
  valorTotalMensal 
}: PDFGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [htmlLoading, setHtmlLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [proposta, setProposta] = useState<any>(null)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionario, setQuestionario] = useState<any[]>([])
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"html" | "pdf">("html")
  const [htmlError, setHtmlError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [modeloProposta, setModeloProposta] = useState<any>(null)
  const [modeloError, setModeloError] = useState<string | null>(null)

  const carregarDadosProposta = useCallback(async () => {
    if (!propostaId) {
      setError("ID da proposta não fornecido")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setHtmlError(null)
      setPdfError(null)
      setModeloError(null)

      console.log("Carregando dados da proposta:", propostaId)

      // Carregar dados da proposta
      const proposta = await obterProposta(propostaId)

      if (!proposta) {
        throw new Error("Proposta não encontrada")
      }

      console.log("Proposta carregada:", proposta)
      setProposta(proposta)

      // Verificar se já existe uma URL de PDF
      if (proposta.pdf_url) {
        console.log("PDF já existe:", proposta.pdf_url)
        setPdfUrl(proposta.pdf_url)
      }

      // Verificar se a proposta tem modelo_id (campo no banco de dados)
      // ou template_id (campo usado no frontend)
      const templateId = proposta.modelo_id || proposta.template_id

      // Carregar modelo da proposta
      if (templateId) {
        try {
          console.log("Buscando modelo de proposta com ID:", templateId)
          const modelo = await obterModeloProposta(templateId)

          if (modelo) {
            console.log("Modelo de proposta carregado:", modelo)
            setModeloProposta(modelo)

            // Verificar se o modelo tem URL de arquivo
            if (!modelo.arquivo_url) {
              setModeloError("O modelo de proposta não possui URL de arquivo definida")
              console.error("Modelo sem URL de arquivo:", modelo)
            } else {
              console.log("URL do arquivo do modelo:", modelo.arquivo_url)

              // Verificar se é o modelo TEST1 e corrigir a URL se necessário
              if (
                modelo.titulo &&
                modelo.titulo.includes("TEST1") &&
                !modelo.arquivo_url.includes("PROPOSTA%20TEST1.pdf")
              ) {
                console.log("Corrigindo URL para o modelo TEST1")
                modelo.arquivo_url =
                  "https://jtzbuxoslaotpnwsphqv.supabase.co/storage/v1/object/public/modelos/PROPOSTA%20TEST1.pdf"
              }
            }
          } else {
            console.warn("Modelo de proposta não encontrado, buscando todos os modelos ativos")
            setModeloError("Modelo de proposta não encontrado com o ID especificado")

            // Buscar modelos ativos
            const { data: modelos } = await supabase.from("modelos_propostas").select("*").eq("ativo", true)

            if (modelos && modelos.length > 0) {
              console.log(`Encontrados ${modelos.length} modelos ativos, usando o primeiro`)

              // Verificar se há um modelo TEST1 e priorizá-lo
              const modeloTEST1 = modelos.find((m) => m.titulo && m.titulo.includes("TEST1"))
              if (modeloTEST1) {
                console.log("Encontrado modelo TEST1, usando-o como prioridade")
                setModeloProposta(modeloTEST1)

                // Corrigir URL se necessário
                if (!modeloTEST1.arquivo_url.includes("PROPOSTA%20TEST1.pdf")) {
                  console.log("Corrigindo URL para o modelo TEST1")
                  modeloTEST1.arquivo_url =
                    "https://jtzbuxoslaotpnwsphqv.supabase.co/storage/v1/object/public/modelos/PROPOSTA%20TEST1.pdf"
                }
              } else {
                console.log("Usando o primeiro modelo ativo encontrado")
                setModeloProposta(modelos[0])
              }
            } else {
              console.error("Nenhum modelo de proposta ativo encontrado")
              setModeloError("Nenhum modelo de proposta ativo encontrado no sistema")
            }
          }
        } catch (modeloError) {
          console.error("Erro ao carregar modelo de proposta:", modeloError)
          setModeloError(`Erro ao carregar modelo de proposta: ${(modeloError as Error).message || "Erro desconhecido"}`)
        }
      } else {
        console.warn("Proposta sem modelo_id/template_id. Buscando modelos ativos...")

        // Buscar modelos ativos
        const { data: modelos } = await supabase.from("modelos_propostas").select("*").eq("ativo", true)

        if (modelos && modelos.length > 0) {
          console.log(`Encontrados ${modelos.length} modelos ativos, usando o primeiro`)

          // Verificar se há um modelo TEST1 e priorizá-lo
          const modeloTEST1 = modelos.find((m) => m.titulo && m.titulo.includes("TEST1"))
          if (modeloTEST1) {
            console.log("Encontrado modelo TEST1, usando-o como prioridade")
            setModeloProposta(modeloTEST1)

            // Corrigir URL se necessário
            if (!modeloTEST1.arquivo_url.includes("PROPOSTA%20TEST1.pdf")) {
              console.log("Corrigindo URL para o modelo TEST1")
              modeloTEST1.arquivo_url =
                "https://jtzbuxoslaotpnwsphqv.supabase.co/storage/v1/object/public/modelos/PROPOSTA%20TEST1.pdf"
            }
          } else {
            console.log("Usando o primeiro modelo ativo encontrado")
            setModeloProposta(modelos[0])
          }
        } else {
          console.error("Nenhum modelo de proposta ativo encontrado")
          setModeloError("Nenhum modelo de proposta ativo encontrado no sistema")
        }
      }

      // Carregar dependentes
      const { data: dependentesData, error: dependentesError } = await supabase
        .from("dependentes")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("created_at", { ascending: true })

      if (dependentesError) {
        console.error("Erro ao carregar dependentes:", dependentesError)
      } else {
        console.log("Dependentes carregados:", dependentesData?.length || 0)
        setDependentes(dependentesData || [])
      }
      
      // Carregar questionário de saúde
      const { data: questionarioData, error: questionarioError } = await supabase
        .from("questionario_saude")
        .select("*")
        .eq("proposta_id", propostaId)
        .order("pergunta_id", { ascending: true })

      if (questionarioError) {
        console.error("Erro ao carregar questionário:", questionarioError)
      } else {
        console.log("Questionário carregado:", questionarioData?.length || 0)
        setQuestionario(questionarioData || [])
      }
      
      // Buscar questionários dos dependentes também
      if (dependentesData && dependentesData.length > 0) {
        console.log("🔍 PDFGenerator - Buscando questionários dos dependentes...")
        
        for (const dependente of dependentesData) {
          try {
            console.log(`🔍 PDFGenerator - Buscando questionário para dependente: ${dependente.nome} (ID: ${dependente.id})`)
            
            // Buscar na tabela questionario_saude com dependente_id
            const { data: questionarioDependente, error: errorQuestionarioDependente } = await supabase
              .from("questionario_saude")
              .select("*")
              .eq("proposta_id", propostaId)
              .eq("dependente_id", dependente.id)
              .order("pergunta_id", { ascending: true })
            
            if (!errorQuestionarioDependente && questionarioDependente && questionarioDependente.length > 0) {
              console.log(`✅ PDFGenerator - Questionário do dependente ${dependente.nome} encontrado em questionario_saude:`, questionarioDependente.length, "respostas")
              console.log("📋 Detalhes do questionário:", questionarioDependente)
              setQuestionario(prev => [...prev, ...questionarioDependente])
            } else {
              console.log(`ℹ️ PDFGenerator - Nenhum questionário encontrado em questionario_saude para dependente ${dependente.nome}`)
            }
            
            // Buscar também na tabela questionario_respostas para dependentes
            const { data: questionarioRespostasDependente, error: errorQuestionarioRespostasDependente } = await supabase
              .from("questionario_respostas")
              .select("*, respostas_questionario(*)")
              .eq("proposta_id", propostaId)
              .eq("pessoa_tipo", "dependente")
              .eq("pessoa_nome", dependente.nome)
            
            if (!errorQuestionarioRespostasDependente && questionarioRespostasDependente && questionarioRespostasDependente.length > 0) {
              console.log(`✅ PDFGenerator - Questionário do dependente ${dependente.nome} encontrado em questionario_respostas:`, questionarioRespostasDependente.length, "registros")
              console.log("📋 Detalhes do questionário:", questionarioRespostasDependente)
              setQuestionario(prev => [...prev, ...questionarioRespostasDependente])
            } else {
              console.log(`ℹ️ PDFGenerator - Nenhum questionário encontrado em questionario_respostas para dependente ${dependente.nome}`)
            }
          } catch (err) {
            console.log(`⚠️ PDFGenerator - Erro ao buscar questionário do dependente ${dependente.nome}:`, err)
          }
        }
      }

      // Buscar questionários na tabela questionario_respostas para extrair peso e altura
      const { data: questionariosRespostas, error: errorQuestionariosRespostas } = await supabase
        .from("questionario_respostas")
        .select("*, respostas_questionario(*)")
        .eq("proposta_id", propostaId)
      
      if (!errorQuestionariosRespostas && questionariosRespostas && questionariosRespostas.length > 0) {
        console.log("✅ PDFGenerator - Questionários encontrados em questionario_respostas:", questionariosRespostas.length)
        
        // Extrair peso e altura do questionário do titular
        const questionarioTitular = questionariosRespostas.find(q => q.pessoa_tipo === "titular")
        if (questionarioTitular && proposta) {
          console.log("📏 PDFGenerator - Dados físicos do titular encontrados:", {
            peso: questionarioTitular.peso,
            altura: questionarioTitular.altura
          })
          // Adicionar peso e altura à proposta
          proposta.peso = questionarioTitular.peso || proposta.peso
          proposta.altura = questionarioTitular.altura || proposta.altura
          setProposta(proposta)
        }
        
        // Extrair peso e altura dos questionários dos dependentes
        if (dependentesData && dependentesData.length > 0) {
          dependentesData.forEach((dependente) => {
            const questionarioDependente = questionariosRespostas.find(q => 
              q.pessoa_tipo === "dependente" && q.pessoa_nome === dependente.nome
            )
            if (questionarioDependente) {
              console.log(`📏 PDFGenerator - Dados físicos do dependente ${dependente.nome}:`, {
                peso: questionarioDependente.peso,
                altura: questionarioDependente.altura
              })
              dependente.peso = questionarioDependente.peso || dependente.peso
              dependente.altura = questionarioDependente.altura || dependente.altura
            }
          })
          setDependentes([...dependentesData])
        }
        
        // Adicionar questionários de questionario_respostas ao estado
        setQuestionario(prev => [...prev, ...questionariosRespostas])
      }

      // Gerar HTML da proposta
      await gerarHTML(proposta, dependentesData || [], questionarioData || [])
    } catch (error) {
      console.error("Erro ao carregar dados da proposta:", error)
      setError(`Não foi possível carregar os dados da proposta: ${(error as Error).message || "Erro desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }, [propostaId])

  const gerarHTML = async (propostaData: any, dependentesData: any, questionarioData: any) => {
    try {
      setHtmlLoading(true)
      setHtmlError(null)

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
      setHtmlError(`Não foi possível gerar a visualização HTML: ${(error as Error).message || "Erro desconhecido"}`)
      return null
    } finally {
      setHtmlLoading(false)
    }
  }

  const gerarPDF = async () => {
    if (!propostaId) {
      setPdfError("ID da proposta não fornecido")
      return
    }

    try {
      setPdfLoading(true)
      setPdfError(null)

      console.log("Iniciando geração de PDF")

      if (!proposta) {
        throw new Error("Dados da proposta não disponíveis")
      }

      // Verificar se temos o modelo de proposta
      if (!modeloProposta || !modeloProposta.arquivo_url) {
        const errorMsg = !modeloProposta
          ? "Modelo de proposta não disponível"
          : "Modelo de proposta não possui URL de arquivo"

        console.error(errorMsg, modeloProposta)
        throw new Error(errorMsg)
      }

      console.log("Usando modelo de proposta:", modeloProposta.titulo, modeloProposta.arquivo_url)

      // Preparar os dados para preencher o PDF
      const dadosParaPreenchimento = prepararDadosParaPreenchimento(proposta, dependentes, questionario)

      // Gerar o nome do arquivo
      const fileName = `proposta_${propostaId}_${proposta.nome_cliente?.replace(/\s+/g, "_") || propostaId}`

      // Preencher o modelo de PDF com os dados
      console.log("Preenchendo modelo de PDF com dados do formulário")

      let pdfUrl
      try {
        pdfUrl = await PDFService.gerarPDFComModelo(modeloProposta.arquivo_url, dadosParaPreenchimento, fileName)
      } catch (pdfError) {
        console.error("Erro ao preencher modelo PDF, tentando URL alternativa:", pdfError)

        // Se o modelo for TEST1 e a URL estiver errada, tentar com a URL correta
        if (modeloProposta.titulo && modeloProposta.titulo.includes("TEST1")) {
          const urlCorreta =
            "https://jtzbuxoslaotpnwsphqv.supabase.co/storage/v1/object/public/modelos/PROPOSTA%20TEST1.pdf"
          console.log("Tentando com URL correta para TEST1:", urlCorreta)

          try {
            pdfUrl = await PDFService.gerarPDFComModelo(urlCorreta, dadosParaPreenchimento, fileName)
          } catch (alternativeError) {
            console.error("Erro ao usar URL alternativa:", alternativeError)
            throw pdfError // Lançar o erro original
          }
        } else {
          throw pdfError
        }
      }

      if (!pdfUrl) {
        throw new Error("Falha ao gerar URL do PDF")
      }

      console.log("PDF gerado com sucesso:", pdfUrl)

      // Atualizar a URL do PDF na proposta
      const { error: updateError } = await supabase.from("propostas").update({ pdf_url: pdfUrl }).eq("id", propostaId)

      if (updateError) {
        console.error("Erro ao atualizar URL do PDF na proposta:", updateError)
        // Não falhar completamente se apenas a atualização falhar
      }

      setPdfUrl(pdfUrl)

      // Notificar o componente pai
      if (onPDFGenerated) {
        onPDFGenerated(pdfUrl)
      }

      return pdfUrl
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      setPdfError(`Não foi possível gerar o PDF: ${(error as Error).message || "Erro desconhecido"}`)
      return null
    } finally {
      setPdfLoading(false)
    }
  }

  // Função para preparar os dados para preenchimento do PDF
  const prepararDadosParaPreenchimento = (proposta: any, dependentes: any[], questionario: any[]): any => {
    // Objeto para armazenar os dados formatados para o PDF
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
      valor: formatarMoeda(proposta.valor_plano || proposta.valor),
      // CORRIGIDO: Usar o valor total mensal do frontend se disponível, senão calcular
      valor_total: valorTotalMensal || formatarMoeda(calcularValorTotalMensalNumero(proposta, dependentes)),
      valor_total_formatado: valorTotalMensal || formatarMoeda(calcularValorTotalMensalNumero(proposta, dependentes)),

      // Dados físicos
      peso: proposta.peso || "",
      altura: proposta.altura || "",

      // Dados do corretor
      corretor_nome: proposta.corretor_nome || "",
      corretor_codigo: proposta.corretor_codigo || "",

      // Data de criação
      data_criacao: formatarData(proposta.created_at),
      data_atualizacao: formatarData(proposta.updated_at),
      
      // Assinatura
      assinatura: proposta.assinatura || proposta.assinatura_imagem || "",
      
      // Dados da assinatura digital
      assinado_em: proposta.assinado_em ? formatarData(proposta.assinado_em) : "",
      ip_assinatura: proposta.ip_assinatura || "",
      user_agent: proposta.user_agent || "",
      
      // Status
      status: proposta.status || "pendente",
    }

    // Função para calcular valor total mensal (retorna número)
    function calcularValorTotalMensalNumero(proposta, dependentes) {
      let total = 0
      let valorTitular = proposta.valor_plano || proposta.valor_mensal || proposta.valor || 0
      if (typeof valorTitular !== "number") {
        valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".")
        valorTitular = Number.parseFloat(valorTitular)
      }
      if (!isNaN(valorTitular) && valorTitular > 0) {
        total += valorTitular
      }
      if (dependentes && dependentes.length > 0) {
        dependentes.forEach((dep) => {
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

    // Adicionar dependentes (até 5)
    if (dependentes && dependentes.length > 0) {
      dependentes.slice(0, 5).forEach((dep, index) => {
        const prefixo = `dependente${index + 1}_`
        dadosPDF[`${prefixo}nome`] = dep.nome || ""
        dadosPDF[`${prefixo}cpf`] = dep.cpf || ""
        dadosPDF[`${prefixo}data_nascimento`] = formatarData(dep.data_nascimento)
        dadosPDF[`${prefixo}parentesco`] = dep.parentesco || ""
        dadosPDF[`${prefixo}rg`] = dep.rg || ""
        dadosPDF[`${prefixo}cns`] = dep.cns || ""
        dadosPDF[`${prefixo}idade`] = calcularIdade(dep.data_nascimento)
        dadosPDF[`${prefixo}uf_nascimento`] = dep.uf_nascimento || ""
        dadosPDF[`${prefixo}valor_individual`] = dep.valor_individual || dep.valor || dep.valor_plano || ""

        // Campos adicionais para dependentes
        dadosPDF[`${prefixo}sexo`] = dep.sexo || ""
        dadosPDF[`${prefixo}estado_civil`] = dep.estado_civil || ""
        dadosPDF[`${prefixo}naturalidade`] = dep.naturalidade || ""
        dadosPDF[`${prefixo}nome_mae`] = dep.nome_mae || ""
        dadosPDF[`${prefixo}peso`] = dep.peso || ""
        dadosPDF[`${prefixo}altura`] = dep.altura || ""
        dadosPDF[`${prefixo}assinatura`] = dep.assinatura || ""
      })
    }

    // Adicionar respostas do questionário
    if (questionario && questionario.length > 0) {
      console.log("🔍 DEBUG PDFGenerator - Processando questionário:", questionario.length, "registros")
      
      // Separar questionários por tipo de pessoa
      const questionariosTitular = questionario.filter(q => q.pessoa_tipo === "titular" || !q.pessoa_tipo)
      const questionariosDependentes = questionario.filter(q => q.pessoa_tipo === "dependente")
      
      console.log(`📊 Questionários encontrados: ${questionariosTitular.length} titular, ${questionariosDependentes.length} dependentes`)
      
      // Processar questionário do titular primeiro
      questionariosTitular.forEach((q, index) => {
        // Verificar se é da estrutura questionario_respostas + respostas_questionario
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          console.log(`📝 PDFGenerator - Processando questionário titular ${index + 1} (estrutura respostas_questionario):`, q.respostas_questionario.length, "respostas")
          
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
          console.log(`📝 PDFGenerator - Processando questionário titular ${index + 1} (estrutura direta):`, q)
          
          const pergunta = q.pergunta || q.pergunta_texto || `Pergunta ${q.pergunta_id || index + 1}`
          const resposta = q.resposta || q.resposta_texto || ""
          const observacao = q.observacao || q.detalhes || ""
          
          dadosPDF[`pergunta${index + 1}`] = pergunta
          dadosPDF[`resposta${index + 1}`] = resposta
          if (observacao) {
            dadosPDF[`observacao${index + 1}`] = observacao
          }
          
          // Adicionar também variações de nomes de campos para compatibilidade
          dadosPDF[`pergunta_${index + 1}`] = pergunta
          dadosPDF[`resposta_${index + 1}`] = resposta
          dadosPDF[`questao${index + 1}`] = pergunta
          dadosPDF[`resp${index + 1}`] = resposta
        }
      })
      
      // Processar questionários dos dependentes SEM DUPLICIDADE
      const respostasDependentesMap: Record<string, Record<number, any>> = {} // {nome_dependente: {pergunta_id: resposta}}
      questionariosDependentes.forEach((q) => {
        const idx = dependentes.findIndex((d) => d.nome === q.pessoa_nome)
        if (idx === -1) return
        const nome = q.pessoa_nome
        if (!respostasDependentesMap[nome]) respostasDependentesMap[nome] = {}
        if (q.respostas_questionario && Array.isArray(q.respostas_questionario)) {
          q.respostas_questionario.forEach((resposta: any, respIdx: number) => {
            const perguntaId = resposta.pergunta_id || respIdx + 1
            if (!respostasDependentesMap[nome][perguntaId]) {
              respostasDependentesMap[nome][perguntaId] = resposta
            }
          })
        } else {
          const perguntaId = q.pergunta_id || 1
          if (!respostasDependentesMap[nome][perguntaId]) {
            respostasDependentesMap[nome][perguntaId] = q
          }
        }
      })
      // Preencher os campos do PDF sem duplicidade
      Object.entries(respostasDependentesMap).forEach(([nome, respostas]) => {
        const idx = dependentes.findIndex((d) => d.nome === nome)
        if (idx === -1) return
        Object.entries(respostas).forEach(([perguntaIdStr, respostaObj]) => {
          const perguntaId = Number(perguntaIdStr)
          const pergunta = respostaObj.pergunta_texto || respostaObj.pergunta || `Pergunta ${perguntaId}`
          const respostaValor = respostaObj.resposta || respostaObj.resposta_texto || ""
          const observacao = respostaObj.observacao || respostaObj.detalhes || ""
          const campoResposta = `resposta${perguntaId}_dependente${idx + 1}`
          if (!dadosPDF[campoResposta]) {
            dadosPDF[campoResposta] = respostaValor
            if (observacao) {
              dadosPDF[`observacao${perguntaId}_dependente${idx + 1}`] = observacao
            }
          }
          // Campos alternativos para compatibilidade
          dadosPDF[`dependente_${idx + 1}_pergunta${perguntaId}`] = pergunta
          dadosPDF[`dependente_${idx + 1}_resposta${perguntaId}`] = respostaValor
          dadosPDF[`dep${idx + 1}_pergunta${perguntaId}`] = pergunta
          dadosPDF[`dep${idx + 1}_resposta${perguntaId}`] = respostaValor
          dadosPDF[`dep${idx + 1}_questao${perguntaId}`] = pergunta
          dadosPDF[`dep${idx + 1}_resp${perguntaId}`] = respostaValor
        })
      })
    }

    console.log("Dados preparados para preenchimento do PDF:", dadosPDF)
    
    // DEBUG: Log detalhado dos campos que podem estar faltando
    console.log("🔍 DEBUG PDFGenerator - Campos específicos que podem estar faltando:")
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
    
    // DEBUG: Verificar dados dos dependentes
    if (dependentes && dependentes.length > 0) {
      console.log("�� DEBUG PDFGenerator - Dados dos dependentes:")
      dependentes.forEach((dep: any, idx: number) => {
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
      console.log("🔍 DEBUG PDFGenerator - Questionário de saúde:")
      console.log(`   Total de respostas: ${questionario.length}`)
      questionario.forEach((q, idx) => {
        console.log(`   Pergunta ${idx + 1}: ${dadosPDF[`pergunta${idx + 1}`]} = ${dadosPDF[`resposta${idx + 1}`]}`)
      })
    }
    
    // DEBUG: Verificar campos dos dependentes
    console.log("🔍 DEBUG PDFGenerator - Campos dos dependentes gerados:")
    if (dependentes && dependentes.length > 0) {
      dependentes.forEach((dep: any, idx: number) => {
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

  // Adicionar esta função após a função prepararDadosParaPreenchimento
  const forcarGeracaoPDF = async () => {
    if (!propostaId) {
      setPdfError("ID da proposta não fornecido")
      return null
    }

    try {
      setPdfLoading(true)
      setPdfError(null)

      console.log("🔄 Forçando geração de PDF...")

      if (!proposta) {
        throw new Error("Dados da proposta não disponíveis")
      }

      // Verificar se temos o modelo de proposta
      if (!modeloProposta || !modeloProposta.arquivo_url) {
        const errorMsg = !modeloProposta
          ? "Modelo de proposta não disponível"
          : "Modelo de proposta não possui URL de arquivo"

        console.error(errorMsg, modeloProposta)
        throw new Error(errorMsg)
      }

      console.log("Usando modelo de proposta:", modeloProposta.titulo, modeloProposta.arquivo_url)

      // Preparar os dados para preencher o PDF
      const dadosParaPreenchimento = prepararDadosParaPreenchimento(proposta, dependentes, questionario)

      // Gerar o nome do arquivo
      const fileName = `proposta_${propostaId}_${proposta.nome_cliente?.replace(/\s+/g, "_") || propostaId}`

      // Preencher o modelo de PDF com os dados
      console.log("Preenchendo modelo de PDF com dados do formulário")

      let pdfUrl
      try {
        pdfUrl = await PDFService.gerarPDFComModelo(modeloProposta.arquivo_url, dadosParaPreenchimento, fileName)
      } catch (pdfError) {
        console.error("Erro ao preencher modelo PDF, tentando URL alternativa:", pdfError)

        // Se o modelo for TEST1 e a URL estiver errada, tentar com a URL correta
        if (modeloProposta.titulo && modeloProposta.titulo.includes("TEST1")) {
          const urlCorreta =
            "https://jtzbuxoslaotpnwsphqv.supabase.co/storage/v1/object/public/modelos/PROPOSTA%20TEST1.pdf"
          console.log("Tentando com URL correta para TEST1:", urlCorreta)

          try {
            pdfUrl = await PDFService.gerarPDFComModelo(urlCorreta, dadosParaPreenchimento, fileName)
          } catch (alternativeError) {
            console.error("Erro ao usar URL alternativa:", alternativeError)
            throw pdfError // Lançar o erro original
          }
        } else {
          throw pdfError
        }
      }

      if (!pdfUrl) {
        throw new Error("Falha ao gerar URL do PDF")
      }

      console.log("PDF gerado com sucesso:", pdfUrl)

      // Atualizar a URL do PDF na proposta
      const { error: updateError } = await supabase.from("propostas").update({ pdf_url: pdfUrl }).eq("id", propostaId)

      if (updateError) {
        console.error("Erro ao atualizar URL do PDF na proposta:", updateError)
        // Não falhar completamente se apenas a atualização falhar
      }

      setPdfUrl(pdfUrl)

      // Notificar o componente pai
      if (onPDFGenerated) {
        onPDFGenerated(pdfUrl)
      }

      return pdfUrl
    } catch (error) {
      console.error("Erro ao forçar geração de PDF:", error)
      setPdfError(`Não foi possível gerar o PDF: ${(error as Error).message || "Erro desconhecido"}`)
      return null
    } finally {
      setPdfLoading(false)
    }
  }

  // Expor a função para uso externo
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).forcarGeracaoPDF = forcarGeracaoPDF
    }
  }, [])

  // Funções auxiliares para formatação
  const formatarData = (dataString: string) => {
    if (!dataString) return ""
    try {
      const data = new Date(dataString)
      return data.toLocaleDateString("pt-BR")
    } catch (e) {
      return dataString
    }
  }

  const formatarMoeda = (valor: number | string) => {
    if (!valor) return ""
    try {
      return typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : valor
    } catch (e) {
      return valor
    }
  }

  const calcularIdade = (dataNascimento: string) => {
    if (!dataNascimento) return ""
    try {
      const dataAtual = new Date()
      const dataNasc = new Date(dataNascimento)
      let idade = dataAtual.getFullYear() - dataNasc.getFullYear()
      const mesAtual = dataAtual.getMonth()
      const mesNasc = dataNasc.getMonth()

      if (mesAtual < mesNasc || (mesAtual === mesNasc && dataAtual.getDate() < dataNasc.getDate())) {
        idade--
      }
      return idade
    } catch (e) {
      return ""
    }
  }

  // Função pública para forçar geração do PDF (pode ser chamada externamente)
  const handleForceGeneratePDF = useCallback(async () => {
    return await forcarGeracaoPDF()
  }, [forcarGeracaoPDF])

  // Expor a função através de uma ref ou callback
  useEffect(() => {
    if (onPDFGenerated && typeof onPDFGenerated === "function") {
      // Nenhuma atribuição extra, apenas manter a referência
    }
  }, [onPDFGenerated, handleForceGeneratePDF])

  useEffect(() => {
    if (propostaId) {
      carregarDadosProposta()
    } else {
      setError("ID da proposta não fornecido")
    }
  }, [propostaId, carregarDadosProposta])

  // Quando o modo de visualização muda para PDF, gerar o PDF se necessário
  useEffect(() => {
    if (viewMode === "pdf" && !pdfUrl && !pdfLoading && modeloProposta && modeloProposta.arquivo_url) {
      gerarPDF().catch((err) => {
        console.error("Erro ao gerar PDF ao mudar para visualização PDF:", err)
      })
    }
  }, [viewMode, pdfUrl, pdfLoading, modeloProposta])

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
  const ErrorDisplay = ({ message, onRetry, isRetrying = false }: { message: string, onRetry?: (() => void) | null, isRetrying?: boolean }) => (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4 text-center">
      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
      <h3 className="text-lg font-medium text-red-800 mb-2">Erro</h3>
      <p className="text-red-700 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} disabled={isRetrying} variant="outline" size="sm">
          {isRetrying ? (
            <>
              <Spinner className="h-4 w-4 mr-2" />
              Tentando novamente...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </>
          )}
        </Button>
      )}
    </div>
  )

  // Renderização quando não há ID de proposta
  if (!propostaId) {
    return <ErrorDisplay message="Não foi possível carregar a proposta. ID da proposta não fornecido." onRetry={null} />
  }

  // Renderização principal do componente
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <Spinner className="mb-4" />
        <p className="text-gray-500">Carregando dados da proposta...</p>
      </div>
    )
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={carregarDadosProposta} isRetrying={loading} />
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center mb-4 w-full">
        <div className="bg-gray-100 p-1 rounded-md">
          <button
            data-testid="html-button"
            onClick={() => setViewMode("html")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              viewMode === "html" ? "bg-white shadow-sm text-gray-800" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Pré-visualização HTML
          </button>
          <button
            data-testid="pdf-button"
            onClick={() => setViewMode("pdf")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              viewMode === "pdf" ? "bg-white shadow-sm text-gray-800" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Documento PDF
          </button>
        </div>
      </div>

      {modeloError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4 w-full">
          <div className="flex">
            <Info className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Problema com o modelo de proposta</h4>
              <p className="text-sm text-yellow-700 mt-1">{modeloError}</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === "html" ? (
        <div className="w-full">
          {htmlLoading ? (
            <div className="flex flex-col items-center justify-center p-6">
              <Spinner className="mb-4" />
              <p className="text-gray-500">Gerando visualização HTML...</p>
            </div>
          ) : htmlError ? (
            <ErrorDisplay
              message={htmlError}
              onRetry={() => gerarHTML(proposta, dependentes, questionario)}
              isRetrying={htmlLoading}
            />
          ) : htmlContent ? (
            <HTMLViewer html={htmlContent} />
          ) : (
            <div className="text-center p-6">
              <p className="text-gray-500 mb-4">Não foi possível carregar a visualização HTML.</p>
              <Button onClick={() => gerarHTML(proposta, dependentes, questionario)} disabled={htmlLoading}>
                {htmlLoading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Visualização HTML
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          {pdfLoading ? (
            <div className="flex flex-col items-center justify-center p-6">
              <Spinner className="mb-4" />
              <p className="text-gray-500">Gerando documento PDF...</p>
              <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns instantes</p>
            </div>
          ) : pdfError ? (
            <ErrorDisplay message={pdfError} onRetry={gerarPDF} isRetrying={pdfLoading} />
          ) : pdfUrl ? (
            <div className="w-full flex flex-col items-center">
              <iframe src={pdfUrl} className="w-full h-[70vh] border rounded-md" title="Documento PDF da Proposta" />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {!modeloProposta || !modeloProposta.arquivo_url ? (
                <div className="text-center p-6">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Modelo de proposta não disponível</h3>
                  <p className="text-gray-500 mb-4">
                    Não foi possível encontrar um modelo de proposta válido para gerar o PDF.
                  </p>
                  <Button onClick={carregarDadosProposta} className="mt-2">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <Button onClick={gerarPDF} disabled={pdfLoading} className="bg-[#0F172A] hover:bg-[#1E293B]">
                  {pdfLoading ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Documento PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
