"use client"

import { useState, useEffect } from "react"
import { 
  buscarPropostas, 
  atualizarStatusProposta,
  buscarDependentesProposta,
  buscarQuestionarioSaude,
  buscarPropostaCompleta,
  obterDocumentosInteligente,
  obterNomeCliente,
  obterEmailCliente,
  obterTelefoneCliente,
  cancelarProposta
} from "@/services/propostas-service-unificado"
import { criarProposta } from "@/services/propostas-service-unificado"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, CheckCircle, Calendar, Building, Search, Filter, RefreshCw, UserCheck, ChevronLeft, ChevronRight, Mail, DollarSign, Heart, FileText, Download, X, XCircle, User, Loader2, Clock, Plus, Trash2, Camera, Upload } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { UploadService } from "@/services/upload-service"
import { buscarCorretores } from "@/services/corretores-service"
import { Textarea } from "@/components/ui/textarea"
// XLSX será importado dinamicamente quando necessário
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { ClientesAdministradorasService } from "@/services/clientes-administradoras-service"
import { WizardCadastroCliente } from "@/components/admin/wizard-cadastro-cliente"
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

export default function CadastradoPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [produtoFiltro, setProdutoFiltro] = useState("todos")
  const [filtroTempo, setFiltroTempo] = useState("todos")
  const [propostaDetalhada, setPropostaDetalhada] = useState<any>(null)
  const [showModalDetalhes, setShowModalDetalhes] = useState(false)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionariosSaude, setQuestionariosSaude] = useState<any[]>([])
  // Removido: editMode e editData - função de edição removida
  const [showModalCadastro, setShowModalCadastro] = useState(false)
  const [propostaCadastro, setPropostaCadastro] = useState<any>(null)

  // Campos para cadastro
  const [administradora, setAdministradora] = useState("")
  const [dataVencimento, setDataVencimento] = useState("")
  const [dataVigencia, setDataVigencia] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Opções de integração com Asaas
  const [integrarAsaas, setIntegrarAsaas] = useState(false)
  const [criarAssinatura, setCriarAssinatura] = useState(false)
  
  // Lista de administradoras disponíveis
  const [administradoras, setAdministradoras] = useState<Administradora[]>([])

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(25)

  useEffect(() => {
    carregarPropostas()
    carregarAdministradoras()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      console.log("🔄 Carregando propostas aprovadas e cadastradas...")
      const data = await buscarPropostas()
      // Filtrar propostas com status "aprovada", "transmitida", "cadastrada" ou "cadastrado"
      const propostasParaCadastro = data.filter((p: any) => 
        p.status === "aprovada" || 
        p.status === "transmitida" || 
        p.status === "cadastrada" || 
        p.status === "cadastrado"
      )
      console.log("📊 Propostas para cadastro:", propostasParaCadastro.length)
      console.log("📋 Status encontrados:", [...new Set(data.map((p: any) => p.status))])
      console.log("💰 Debug valores:", propostasParaCadastro.slice(0, 3).map(p => ({
        id: p.id,
        valor: p.valor,
        valor_total: p.valor_total,
        valor_mensal: p.valor_mensal
      })))
      setPropostas(propostasParaCadastro)
    } catch (error: any) {
      console.error("❌ Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function carregarAdministradoras() {
    try {
      const data = await AdministradorasService.buscarTodas({ status: "ativa" })
      setAdministradoras(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar administradoras:", error)
      toast.error("Erro ao carregar administradoras")
    }
  }

  async function transmitirProposta() {
    if (!propostaCadastro || !administradora || !dataVencimento || !dataVigencia) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    try {
      setSaving(true)
      
      // Calcular valor mensal (titular + dependentes)
      let valorMensal = propostaCadastro.valor_mensal || propostaCadastro.valor || propostaCadastro.valor_total || 0
      
      // Se for string, converter para número
      if (typeof valorMensal === 'string') {
        valorMensal = parseFloat(valorMensal.replace(/[^\d,\.]/g, '').replace(',', '.'))
      }

      // Vincular cliente à administradora usando o novo service
      await ClientesAdministradorasService.vincularCliente({
        administradora_id: administradora,
        proposta_id: propostaCadastro.id,
        data_vencimento: dataVencimento,
        data_vigencia: dataVigencia,
        valor_mensal: valorMensal,
        integrar_asaas: integrarAsaas,
        criar_assinatura: criarAssinatura,
      })

      // Atualizar status da proposta para "transmitida"
      await atualizarStatusProposta(propostaCadastro.id, "transmitida")

      toast.success("Proposta transmitida com sucesso!")
      setShowModalCadastro(false)
      setPropostaCadastro(null)
      setAdministradora("")
      setDataVencimento("")
      setDataVigencia("")
      setIntegrarAsaas(false)
      setCriarAssinatura(false)
      carregarPropostas()
    } catch (error: any) {
      console.error("Erro ao finalizar cadastro:", error)
      toast.error("Erro ao finalizar cadastro: " + error.message)
    } finally {
      setSaving(false)
    }
  }


  function abrirModalCadastro(proposta: any) {
    setPropostaCadastro(proposta)
    // Pré-preencher data de vencimento se já existir na proposta
    if (proposta.data_vencimento) {
      setDataVencimento(proposta.data_vencimento)
    } else {
      setDataVencimento("")
    }
    setShowModalCadastro(true)
  }

  async function abrirModalDetalhes(proposta: any) {
    setPropostaDetalhada(proposta)
    setShowModalDetalhes(true)
    await carregarDetalhesCompletos(proposta)
  }

  function parseDependentes(proposta: any) {
    try {
      if (proposta.dependentes && typeof proposta.dependentes === 'string') {
        return JSON.parse(proposta.dependentes)
      } else if (Array.isArray(proposta.dependentes)) {
        return proposta.dependentes
      }
      return []
    } catch {
      return []
    }
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
      
      setQuestionariosSaude(questionariosData)
      
      console.log("🎯 RESUMO DO CARREGAMENTO:")
      console.log("📋 Proposta completa:", !!propostaCompleta)
      console.log("👨‍👩‍👧‍👦 Dependentes:", dependentesData?.length || 0)
      console.log("🏥 Questionários:", questionariosData?.length || 0)
      console.log("🔍 Debug questionários detalhado:", questionariosData?.map(q => ({
        id: q.id,
        pessoa_tipo: q.pessoa_tipo,
        pessoa_nome: q.pessoa_nome,
        respostas: q.respostas_questionario?.length || 0
      })))
      console.log("=".repeat(60))

    } catch (error) {
      console.error("❌ Erro ao carregar detalhes:", error)
      toast.error("Erro ao carregar detalhes da proposta")
    } finally {
      setLoadingDetalhes(false)
    }
  }

  // Função de edição removida - apenas visualização

  // Funções de edição removidas - apenas visualização

  // Função de teste removida


  function verificarCadastroCompleto(proposta: any) {
    return proposta.administradora && proposta.data_vencimento && proposta.data_vigencia
  }

  function obterStatusProposta(proposta: any) {
    if (proposta.status === "transmitida") {
      return {
        label: "TRANSMITIDA",
        color: "bg-gray-100 text-[#0F172A]"
      }
    } else if (proposta.status === "cadastrada" || proposta.status === "cadastrado") {
      return {
        label: "CADASTRADO",
        color: "bg-gray-100 text-[#0F172A]"
      }
    } else if (proposta.status === "aprovada") {
      return {
        label: "APROVADO",
        color: "bg-gray-100 text-[#0F172A]"
      }
    } else if (proposta.status === "cancelada") {
      return {
        label: "CANCELADA",
        color: "bg-gray-50 text-gray-500"
      }
    } else if (proposta.status === "devolvida") {
      return {
        label: "DEVOLVIDA",
        color: "bg-gray-50 text-gray-500"
      }
    } else {
      return {
        label: proposta.status || "INDEFINIDO",
        color: "bg-gray-50 text-gray-500"
      }
    }
  }

  function formatarDataSegura(dataString: any) {
    if (!dataString) return null

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

  function calcularIdade(dataNascimento: any) {
    if (!dataNascimento) return "N/A"
    try {
      const hoje = new Date()
      const nascimento = new Date(dataNascimento)
      let idade = hoje.getFullYear() - nascimento.getFullYear()
      const diferencaMes = hoje.getMonth() - nascimento.getMonth()
      if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--
      }
      return `${idade} anos`
    } catch {
      return "N/A"
    }
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

  // Função para gerar relatório Excel
  async function gerarRelatorioExcel() {
    try {
      console.log("📊 Gerando relatório Excel...")
      
      // Preparar dados para o Excel
      const dadosExcel = propostasFiltradas.map((proposta, index) => {
        const nomeCliente = obterNomeCliente(proposta)
        const emailCliente = obterEmailCliente(proposta)
        const telefoneCliente = obterTelefoneCliente(proposta)
        const valorTotal = calcularValorTotalMensal(proposta)
        const statusCompleto = verificarCadastroCompleto(proposta) ? "Completo" : "Pendente"
        
        return {
          "Nº": index + 1,
          "Nome do Cliente": nomeCliente,
          "Email": emailCliente,
          "Telefone": telefoneCliente,
          "CPF": proposta.cpf || "N/A",
          "Data de Nascimento": proposta.data_nascimento || "N/A",
          "Produto": proposta.produto_nome || proposta.produto || proposta.sigla_plano || proposta.plano_nome || "N/A",
          "Operadora": proposta.operadora || "N/A",
          "Valor Mensal": formatarMoeda(valorTotal),
          "Status Cadastro": statusCompleto,
          "Administradora": proposta.administradora || "N/A",
          "Data Vencimento": proposta.data_vencimento || "N/A",
          "Data Vigência": proposta.data_vigencia || "N/A",
          "Data Criação": formatarDataSegura(proposta.created_at) || "N/A",
          "Origem": proposta.origem === "propostas_corretores" ? "Corretor" : "Admin",
          "Qtd Dependentes": proposta.dependentes ? proposta.dependentes.length : 0,
          "Observações": proposta.observacoes || "N/A"
        }
      })

      // Importar XLSX dinamicamente
      const XLSX = await import('xlsx')
      
      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosExcel)

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 5 },   // Nº
        { wch: 25 },  // Nome do Cliente
        { wch: 30 },  // Email
        { wch: 15 },  // Telefone
        { wch: 15 },  // CPF
        { wch: 15 },  // Data de Nascimento
        { wch: 30 },  // Produto
        { wch: 20 },  // Operadora
        { wch: 15 },  // Valor Mensal
        { wch: 15 },  // Status Cadastro
        { wch: 20 },  // Administradora
        { wch: 15 },  // Data Vencimento
        { wch: 15 },  // Data Vigência
        { wch: 15 },  // Data Criação
        { wch: 10 },  // Origem
        { wch: 15 },  // Qtd Dependentes
        { wch: 30 }   // Observações
      ]
      ws['!cols'] = colWidths

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Relatório Cadastrados")

      // Gerar nome do arquivo com data e filtros
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      const filtroTexto = filtro ? `_filtro-${filtro.replace(/\s+/g, '_')}` : ""
      const produtoTexto = produtoFiltro !== "todos" ? `_produto-${produtoFiltro.replace(/\s+/g, '_')}` : ""
      const nomeArquivo = `relatorio_cadastrados_${dataAtual}${filtroTexto}${produtoTexto}.xlsx`

      // Fazer download
      XLSX.writeFile(wb, nomeArquivo)
      
      toast.success(`Relatório Excel gerado com sucesso! (${dadosExcel.length} registros)`)
      console.log("✅ Relatório Excel gerado:", nomeArquivo)
      
    } catch (error) {
      console.error("❌ Erro ao gerar relatório Excel:", error)
      toast.error("Erro ao gerar relatório Excel")
    }
  }

  // Função para cancelar proposta
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

  // Extrair produtos únicos para o filtro
  const produtosUnicos = Array.from(new Set(
    propostas.map(p => p.produto_nome || p.produto || p.sigla_plano || p.plano_nome)
      .filter(produto => produto && produto.trim() !== "")
  )).sort()

  const propostasFiltradas = propostas.filter((proposta) => {
    const nomeCliente = obterNomeCliente(proposta).toLowerCase()
    const emailCliente = obterEmailCliente(proposta).toLowerCase()
    const matchesFiltro = nomeCliente.includes(filtro.toLowerCase()) || emailCliente.includes(filtro.toLowerCase())
    
    // Filtro por produto
    const nomeProduto = proposta.produto_nome || proposta.produto || proposta.sigla_plano || proposta.plano_nome || ""
    const matchesProduto = produtoFiltro === "todos" || nomeProduto === produtoFiltro

    // Filtro por tempo
    let matchesTempo = true
    if (filtroTempo !== "todos") {
      const hoje = new Date()
      const dataProposta = new Date(proposta.created_at || proposta.data_cadastro || proposta.data || hoje)
      const diffTime = Math.abs(hoje.getTime() - dataProposta.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      switch (filtroTempo) {
        case "hoje":
          matchesTempo = diffDays === 0
          break
        case "esta-semana":
          matchesTempo = diffDays <= 7
          break
        case "este-mes":
          matchesTempo = diffDays <= 30
          break
        case "este-ano":
          matchesTempo = diffDays <= 365
          break
      }
    }

    return matchesFiltro && matchesProduto && matchesTempo
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
  }, [filtro, produtoFiltro, filtroTempo])

  useModalOverlay(showModalCadastro)
  useModalOverlay(showModalDetalhes)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando clientes...</span>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Propostas para Transmissão</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie propostas aprovadas e transmita para administradoras</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Select value={filtroTempo} onValueChange={setFiltroTempo}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os períodos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="esta-semana">Esta semana</SelectItem>
                <SelectItem value="este-mes">Este mês</SelectItem>
                <SelectItem value="este-ano">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={carregarPropostas}
              className="bg-gray-700 hover:bg-gray-800 text-white font-bold px-4 py-2 btn-corporate shadow-corporate flex items-center gap-2 h-10"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{propostasFiltradas.length}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Total de cadastros</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Completos</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{propostasFiltradas.filter((p) => verificarCadastroCompleto(p)).length}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Cadastros completos</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Pendentes</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{propostasFiltradas.filter((p) => !verificarCadastroCompleto(p)).length}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Cadastros pendentes</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Corretores</h3>
              </div>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{propostasFiltradas.filter((p) => p.origem === "propostas_corretores").length}</div>
            </div>
          </div>
          <div className="pb-6 px-6">
            <p className="text-xs text-gray-500 font-medium">Cadastros via corretores</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar por Nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
                placeholder="Nome ou email do cliente..."
                className="pl-10 w-full corporate-rounded"
            />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Filtrar por Produto</label>
            <Select value={produtoFiltro} onValueChange={setProdutoFiltro}>
              <SelectTrigger className="corporate-rounded">
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Produtos</SelectItem>
                {produtosUnicos.map((produto) => (
                  <SelectItem key={produto} value={produto}>
                    {produto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Propostas */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Propostas (Aprovadas e Transmitidas)</h2>
            <div className="text-sm text-gray-600">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} clientes
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
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
                  Valor/Data
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Administradora/Vigência
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Cadastro
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {propostasExibidas.map((proposta, index) => {
                const bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50"
                return (
                <tr key={proposta.id} className={`${bgColor} hover:bg-gray-100`}>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-gray-900">
                        {obterNomeCliente(proposta)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {proposta.produto_nome || proposta.produto || proposta.sigla_plano || proposta.plano_nome || "Produto não informado"}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{obterEmailCliente(proposta)}</div>
                    <div className="text-sm text-gray-500">
                      {proposta.telefone || proposta.celular || "Telefone não informado"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {(() => {
                        // Sempre usar o valor total (incluindo dependentes)
                        const valorTotal = calcularValorTotalMensal(proposta)
                        return valorTotal > 0 ? formatarMoeda(valorTotal) : "Valor não informado"
                      })()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                    <div className="text-sm text-gray-900">
                      {(() => {
                        // Buscar nome da administradora pelo ID
                        if (!proposta.administradora) {
                          return <span className="text-gray-400">-</span>
                        }
                        const admin = administradoras.find(a => a.id === proposta.administradora)
                        return admin ? admin.nome : proposta.administradora
                      })()}
                    </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {proposta.data_vigencia ? `Vigência: ${formatarDataSegura(proposta.data_vigencia) || 'Data inválida'}` : ""}
                    </div>
                    <div className="text-xs text-gray-500">
                        {proposta.data_vencimento ? `Venc.: ${formatarDataSegura(proposta.data_vencimento) || 'Data inválida'}` : ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const status = obterStatusProposta(proposta)
                      return (
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${status.color}`}>
                          {status.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    {verificarCadastroCompleto(proposta) ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]">
                        Completo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-gray-50 text-gray-500">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirModalDetalhes(proposta)}
                        className="hover:bg-[#0F172A]/10"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {!verificarCadastroCompleto(proposta) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirModalCadastro(proposta)}
                          className="hover:bg-[#0F172A]/10"
                          title="Transmitir proposta"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
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
        <div className="lg:hidden space-y-4">
          {propostasExibidas.map((proposta, index) => {
            const bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50"
            return (
            <div key={proposta.id} className={`${bgColor} border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 font-sans">
                    {obterNomeCliente(proposta)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {proposta.produto_nome || proposta.produto || proposta.sigla_plano || proposta.plano_nome || "Produto não informado"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {(() => {
                    const status = obterStatusProposta(proposta)
                    return (
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${status.color}`}>
                        {status.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* Informações do Card */}
              <div className="grid grid-cols-1 gap-3 text-sm">
                {/* Contato */}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-gray-900">{obterEmailCliente(proposta)}</div>
                    <div className="text-xs text-gray-500">
                      {proposta.telefone || proposta.celular || "Telefone não informado"}
                    </div>
                  </div>
                </div>

                {/* Valor e Data */}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-gray-900 font-medium">
                      {(() => {
                        // Sempre usar o valor total (incluindo dependentes)
                        const valorTotal = calcularValorTotalMensal(proposta)
                        return valorTotal > 0 ? formatarMoeda(valorTotal) : "Valor não informado"
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>

                {/* Administradora */}
                {proposta.administradora && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-gray-900">
                        {(() => {
                          // Buscar nome da administradora pelo ID
                          const admin = administradoras.find(a => a.id === proposta.administradora)
                          return admin ? admin.nome : proposta.administradora
                        })()}
                      </div>
                      {proposta.data_vigencia && (
                        <div className="text-xs text-gray-500">
                          Vigência: {formatarDataSegura(proposta.data_vigencia) || 'Data inválida'}
                        </div>
                      )}
                      {proposta.data_vencimento && (
                        <div className="text-xs text-gray-500">
                          Venc.: {formatarDataSegura(proposta.data_vencimento) || 'Data inválida'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status do Cadastro */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">Status do Cadastro:</span>
                  </div>
                  {verificarCadastroCompleto(proposta) ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Pendente
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrirModalDetalhes(proposta)}
                  className="hover:bg-[#0F172A]/10"
                  title="Ver detalhes"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {!verificarCadastroCompleto(proposta) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirModalCadastro(proposta)}
                    className="hover:bg-[#0F172A]/10"
                    title="Transmitir proposta"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
          })}
        </div>

        {propostasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Nenhum cliente aprovado encontrado</div>
            <div className="text-gray-400 text-sm mt-2">
              {filtro || produtoFiltro !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Nenhuma proposta foi aprovada ainda"}
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

      {/* Modal de Cadastro - Wizard */}
      {showModalCadastro && propostaCadastro && (
        <WizardCadastroCliente
          proposta={propostaCadastro}
          administradoras={administradoras}
          onClose={() => {
            setShowModalCadastro(false)
            setPropostaCadastro(null)
          }}
          onSuccess={() => {
            carregarPropostas()
          }}
        />
      )}

      {/* Modal de Detalhes */}
      {showModalDetalhes && propostaDetalhada && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header com Gradiente */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <Eye className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-xl font-bold text-white truncate">Detalhes da Proposta</h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">Cliente: <strong>{obterNomeCliente(propostaDetalhada)}</strong></p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                  {!verificarCadastroCompleto(propostaDetalhada) && (
                    <Button
                      onClick={() => {
                        setShowModalDetalhes(false)
                        abrirModalCadastro(propostaDetalhada)
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                      size="sm"
                    >
                      <span className="hidden sm:inline">Transmitir Proposta</span>
                      <span className="sm:hidden">Transmitir</span>
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
                    onClick={() => setShowModalDetalhes(false)}
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
                  <Card className="border-2 border-gray-200 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <User className="h-4 w-4 sm:h-5 sm:w-5" />
                          Dados do Titular
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome Completo</label>
                            <p className="text-gray-900 font-medium">{obterNomeCliente(propostaDetalhada)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Email</label>
                          <p className="text-gray-900">{obterEmailCliente(propostaDetalhada)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Telefone</label>
                            <p className="text-gray-900">{obterTelefoneCliente(propostaDetalhada)}</p>
                        </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF</label>
                            <p className="text-gray-900">{propostaDetalhada.cpf || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG</label>
                            <p className="text-gray-900">{propostaDetalhada.rg || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Órgão Emissor</label>
                            <p className="text-gray-900">{propostaDetalhada.orgao_emissor || propostaDetalhada.orgao_expedidor || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CNS</label>
                            <p className="text-gray-900">{propostaDetalhada.cns || propostaDetalhada.cns_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Nascimento</label>
                          <p className="text-gray-900">
                                {propostaDetalhada.data_nascimento
                                  ? formatarDataSegura(propostaDetalhada.data_nascimento)
                                  : "Não informado"}
                          </p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Idade</label>
                            <p className="text-gray-900">{calcularIdade(propostaDetalhada.data_nascimento)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Sexo</label>
                            <p className="text-gray-900">{propostaDetalhada.sexo || propostaDetalhada.sexo_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Estado Civil</label>
                            <p className="text-gray-900">{propostaDetalhada.estado_civil || propostaDetalhada.estado_civil_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">UF de Nascimento</label>
                            <p className="text-gray-900">{propostaDetalhada.uf_nascimento || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome da Mãe</label>
                            <p className="text-gray-900">{propostaDetalhada.nome_mae || propostaDetalhada.nome_mae_cliente || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome do Pai</label>
                            <p className="text-gray-900">{propostaDetalhada.nome_pai || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nacionalidade</label>
                            <p className="text-gray-900">{propostaDetalhada.nacionalidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Profissão</label>
                            <p className="text-gray-900">{propostaDetalhada.profissao || "Não informado"}</p>
                        </div>
                      </div>
                      </CardContent>
                    </Card>

                    {/* Endereço */}
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <Building className="h-4 w-4 sm:h-5 sm:w-5" />
                          Endereço
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Logradouro</label>
                          <p className="text-gray-900">
                              {propostaDetalhada.endereco || "Não informado"}
                              {propostaDetalhada.numero && `, ${propostaDetalhada.numero}`}
                          </p>
                        </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Complemento</label>
                            <p className="text-gray-900">{propostaDetalhada.complemento || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Bairro</label>
                            <p className="text-gray-900">{propostaDetalhada.bairro || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Cidade</label>
                            <p className="text-gray-900">{propostaDetalhada.cidade || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Estado</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.estado || propostaDetalhada.uf || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CEP</label>
                            <p className="text-gray-900">{propostaDetalhada.cep || "Não informado"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Informações do Plano */}
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                          Informações do Plano
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Produto</label>
                            <p className="text-gray-900 font-medium">
                              {propostaDetalhada.produto_nome || propostaDetalhada.produto || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Plano</label>
                            <p className="text-gray-900">
                              {propostaDetalhada.plano_nome || propostaDetalhada.sigla_plano || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Cobertura</label>
                            <p className="text-gray-900">{propostaDetalhada.cobertura || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Acomodação</label>
                            <p className="text-gray-900">{propostaDetalhada.acomodacao || "Não informado"}</p>
                          </div>
                          {propostaDetalhada.data_vencimento && (
                            <div>
                              <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Vencimento</label>
                              <p className="text-gray-900 font-medium">
                                {formatarDataSegura(propostaDetalhada.data_vencimento) || "Não informado"}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                ✓ Preenchida na proposta
                              </p>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Valor Mensal Total</label>
                            <p className="text-2xl font-bold text-[#0F172A]">
                              R$ {calcularValorTotalMensal(propostaDetalhada).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            {/* Detalhamento dos valores se houver dependentes */}
                            {(() => {
                              const dependentesArr = parseDependentes(propostaDetalhada)
                              if (dependentesArr && dependentesArr.length > 0) {
                                return (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xs font-medium text-gray-700 mb-2">Detalhamento:</div>
                                    <div className="text-sm text-gray-700">
                                      <div className="flex justify-between">
                                        <span><b>Titular</b> ({obterNomeCliente(propostaDetalhada)}):</span>
                                        <span>R$ {(() => {
                                          let valorTitular = propostaDetalhada.valor_mensal || propostaDetalhada.valor || propostaDetalhada.valor_total || 0
                                          if (typeof valorTitular !== "number") {
                                            valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".")
                                            valorTitular = Number.parseFloat(valorTitular)
                                          }
                                          return (!isNaN(valorTitular) && valorTitular > 0 ? valorTitular : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                                        })()}</span>
                                      </div>
                                      {dependentesArr.map((dep: any, idx: number) => {
                                        let valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
                                        if (typeof valorDep !== "number") {
                                          valorDep = String(valorDep).replace(/[^\d,\.]/g, "").replace(",", ".")
                                          valorDep = Number.parseFloat(valorDep)
                                        }
                                        return (
                                          <div key={idx} className="flex justify-between">
                                            <span><b>Dependente</b> ({dep.nome || `Dependente ${idx + 1}`}):</span>
                                            <span>R$ {(!isNaN(valorDep) && valorDep > 0 ? valorDep : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                          </div>
                                        )
                                      })}
                                      <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold">
                                        <span>Total Mensal:</span>
                                        <span>R$ {calcularValorTotalMensal(propostaDetalhada).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dados de Cadastro */}
                  {verificarCadastroCompleto(propostaDetalhada) && (
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          Dados de Cadastro
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Administradora</label>
                            <p className="text-gray-900">
                              {(() => {
                                const admin = administradoras.find(a => a.id === propostaDetalhada.administradora)
                                return admin ? admin.nome : propostaDetalhada.administradora
                              })()}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Vencimento</label>
                            <p className="text-gray-900">
                                {formatarDataSegura(propostaDetalhada.data_vencimento) || 'Data inválida'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Vigência</label>
                            <p className="text-gray-900">
                                {formatarDataSegura(propostaDetalhada.data_vigencia) || 'Data inválida'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  </TabsContent>

                  <TabsContent value="documentos" className="space-y-4 sm:space-y-6 mt-0">
                    {/* Documentos do Titular */}
                    <Card className="border-2 border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                        <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                          Documentos do Titular
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                        {(() => {
                          const documentos = obterDocumentosInteligente(propostaDetalhada, "titular")
                          if (!documentos || Object.keys(documentos).length === 0) {
                            return <p className="text-gray-500">Nenhum documento encontrado</p>
                          }
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              {Object.entries(documentos).map(([tipo, url]) => {
                                if (!url) return null
                                const nomeArquivo = `${tipo.replace(/_/g, " ").toUpperCase()}`
                                return (
                                  <div key={tipo} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700">{nomeArquivo}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(url as string, '_blank')}
                                        className="h-8 w-8 p-0"
                                        title="Visualizar"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>

                    {/* Documentos dos Dependentes */}
                    {dependentes && dependentes.length > 0 && (
                      <Card className="border-2 border-gray-200 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                          <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                            Documentos dos Dependentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                          <div className="space-y-4">
                            {dependentes.map((dependente, index) => {
                              const documentosDependente = obterDocumentosInteligente(propostaDetalhada, "dependente")
                              return (
                                <div key={dependente.id || index} className="border border-gray-200 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 mb-3">
                                    {dependente.nome || `Dependente ${index + 1}`}
                                  </h4>
                                  {documentosDependente && Object.keys(documentosDependente).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {Object.entries(documentosDependente).map(([tipo, url]) => {
                                        if (!url) return null
                                        const nomeArquivo = `${tipo.replace(/_/g, " ").toUpperCase()}`
                                        return (
                                          <div key={tipo} className="border border-gray-200 rounded-lg p-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-gray-700">{nomeArquivo}</span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(url as string, '_blank')}
                                                className="h-6 w-6 p-0"
                                                title="Visualizar"
                                              >
                                                <Eye className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-sm">Nenhum documento encontrado</p>
                    )}
                  </div>
                              )
                            })}
                </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="saude" className="space-y-4 sm:space-y-6 mt-0">
                    {/* Fotos do Cliente */}
                    {(propostaDetalhada?.foto_rosto || propostaDetalhada?.foto_corpo_inteiro) && (
                      <Card className="border-2 border-gray-200 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                          <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                            Fotos do Cliente
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
                    {/* Declaração de Saúde */}
                    {questionariosSaude && questionariosSaude.length > 0 ? (
                      questionariosSaude.map((q, idx) => (
                        <Card key={q.id || idx} className="border-2 border-gray-200 shadow-sm">
                          <CardHeader className="bg-gradient-to-r from-red-50 to-red-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                            <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                              <span className="truncate">{q.pessoa_tipo === "titular"
                                ? "Declaração de Saúde - Titular"
                                : `Declaração de Saúde - ${q.pessoa_nome}`}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                            <div className="mb-2 text-sm text-gray-700">
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
                          </CardContent>
                        </Card>
                      ))
                    ) : (
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
                    )}
                  </TabsContent>

                  <TabsContent value="dependentes" className="space-y-4 sm:space-y-6 mt-0">
                    {/* Dependentes */}
                    {dependentes && dependentes.length > 0 ? (
                      dependentes.map((dependente, idx) => (
                        <Card key={dependente.id || idx} className="border-2 border-gray-200 shadow-sm">
                          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                            <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                              <User className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="truncate">Dependente {idx + 1}: {dependente.nome || "Nome não informado"}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome Completo</label>
                                <p className="text-gray-900">{dependente.nome || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF</label>
                                <p className="text-gray-900">{dependente.cpf || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Nascimento</label>
                                <p className="text-gray-900">
                                  {dependente.data_nascimento
                                    ? formatarDataSegura(dependente.data_nascimento)
                                    : "Não informado"}
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Idade</label>
                                <p className="text-gray-900">{calcularIdade(dependente.data_nascimento)}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Parentesco</label>
                                <p className="text-gray-900">{dependente.parentesco || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Sexo</label>
                                <p className="text-gray-900">{dependente.sexo || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG</label>
                                <p className="text-gray-900">{dependente.rg || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CNS</label>
                                <p className="text-gray-900">{dependente.cns || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome da Mãe</label>
                                <p className="text-gray-900">{dependente.nome_mae || "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Peso</label>
                                <p className="text-gray-900">{dependente.peso ? `${dependente.peso} kg` : "Não informado"}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Altura</label>
                                <p className="text-gray-900">{dependente.altura ? `${dependente.altura} cm` : "Não informado"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card className="border-2 border-gray-200 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                          <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                            <User className="h-4 w-4 sm:h-5 sm:w-5" />
                            Dependentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                          <p className="text-gray-500">Nenhum dependente cadastrado</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de cadastro manual - REMOVIDO */}
      {false && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-xl font-bold text-white truncate">Cadastro Manual de Cliente</h3>
                    <p className="text-white/80 text-xs sm:text-sm">Preencha todos os dados do cliente</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowModalCadastroManual(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 flex-shrink-0 ml-2 h-8 sm:h-9 w-8 sm:w-9 p-0"
                  disabled={uploading}
                >
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <form onSubmit={handleCadastroManual} className="space-y-4 sm:space-y-6">
              {/* Dados do Titular */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Dados do Titular
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome <span className="text-red-500">*</span></label>
                      <Input value={formManual.nome} onChange={e => setFormManual({ ...formManual, nome: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF <span className="text-red-500">*</span></label>
                      <Input value={formManual.cpf} onChange={e => setFormManual({ ...formManual, cpf: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Nascimento <span className="text-red-500">*</span></label>
                      <Input type="date" value={formManual.data_nascimento} onChange={e => setFormManual({ ...formManual, data_nascimento: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">E-mail <span className="text-red-500">*</span></label>
                      <Input type="email" value={formManual.email} onChange={e => setFormManual({ ...formManual, email: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Telefone <span className="text-red-500">*</span></label>
                      <Input value={formManual.telefone} onChange={e => setFormManual({ ...formManual, telefone: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CNS <span className="text-red-500">*</span></label>
                      <Input value={formManual.cns} onChange={e => setFormManual({ ...formManual, cns: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG <span className="text-red-500">*</span></label>
                      <Input value={formManual.rg} onChange={e => setFormManual({ ...formManual, rg: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Órgão Emissor <span className="text-red-500">*</span></label>
                      <Input value={formManual.orgao_emissor} onChange={e => setFormManual({ ...formManual, orgao_emissor: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome da Mãe <span className="text-red-500">*</span></label>
                      <Input value={formManual.nome_mae} onChange={e => setFormManual({ ...formManual, nome_mae: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Sexo <span className="text-red-500">*</span></label>
                      <Select value={formManual.sexo} onValueChange={v => setFormManual({ ...formManual, sexo: v })} required>
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">UF de Nascimento <span className="text-red-500">*</span></label>
                      <Input value={formManual.uf_nascimento} onChange={e => setFormManual({ ...formManual, uf_nascimento: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CEP <span className="text-red-500">*</span></label>
                      <Input value={formManual.cep} onChange={e => setFormManual({ ...formManual, cep: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Endereço <span className="text-red-500">*</span></label>
                      <Input value={formManual.endereco} onChange={e => setFormManual({ ...formManual, endereco: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Número <span className="text-red-500">*</span></label>
                      <Input value={formManual.numero} onChange={e => setFormManual({ ...formManual, numero: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Complemento</label>
                      <Input value={formManual.complemento} onChange={e => setFormManual({ ...formManual, complemento: e.target.value })} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Bairro <span className="text-red-500">*</span></label>
                      <Input value={formManual.bairro} onChange={e => setFormManual({ ...formManual, bairro: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Cidade <span className="text-red-500">*</span></label>
                      <Input value={formManual.cidade} onChange={e => setFormManual({ ...formManual, cidade: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Estado <span className="text-red-500">*</span></label>
                      <Input value={formManual.estado} onChange={e => setFormManual({ ...formManual, estado: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Plano */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Dados do Plano
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Produto <span className="text-red-500">*</span></label>
                      <Input value={formManual.produto_id} onChange={e => setFormManual({ ...formManual, produto_id: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Tabela de Preços</label>
                      <Input value={formManual.tabela_id} onChange={e => setFormManual({ ...formManual, tabela_id: e.target.value })} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Cobertura <span className="text-red-500">*</span></label>
                      <Select value={formManual.cobertura} onValueChange={v => setFormManual({ ...formManual, cobertura: v })} required>
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nacional">Nacional</SelectItem>
                          <SelectItem value="Estadual">Estadual</SelectItem>
                          <SelectItem value="Regional">Regional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Acomodação <span className="text-red-500">*</span></label>
                      <Select value={formManual.acomodacao} onValueChange={v => setFormManual({ ...formManual, acomodacao: v })} required>
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                          <SelectItem value="Apartamento">Apartamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Código do Plano <span className="text-red-500">*</span></label>
                      <Input value={formManual.sigla_plano} onChange={e => setFormManual({ ...formManual, sigla_plano: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Valor <span className="text-red-500">*</span></label>
                      <Input value={formManual.valor} onChange={e => setFormManual({ ...formManual, valor: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Anexos do Titular */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Anexos do Titular
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG - Frente</label>
                      <Input type="file" accept="image/*,.pdf" onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormManual({
                            ...formManual,
                            anexos: { ...formManual.anexos, rg_frente: e.target.files[0] }
                          })
                        }
                      }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG - Verso</label>
                      <Input type="file" accept="image/*,.pdf" onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormManual({
                            ...formManual,
                            anexos: { ...formManual.anexos, rg_verso: e.target.files[0] }
                          })
                        }
                      }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF</label>
                      <Input type="file" accept="image/*,.pdf" onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormManual({
                            ...formManual,
                            anexos: { ...formManual.anexos, cpf: e.target.files[0] }
                          })
                        }
                      }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Comprovante de Residência</label>
                      <Input type="file" accept="image/*,.pdf" onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormManual({
                            ...formManual,
                            anexos: { ...formManual.anexos, comprovante_residencia: e.target.files[0] }
                          })
                        }
                      }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CNS</label>
                      <Input type="file" accept="image/*,.pdf" onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormManual({
                            ...formManual,
                            anexos: { ...formManual.anexos, cns: e.target.files[0] }
                          })
                        }
                      }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dependentes */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      Dependentes
                    </CardTitle>
                    <Button
                      type="button"
                      onClick={() => {
                        const novoDependente = {
                          nome: "",
                          cpf: "",
                          rg: "",
                          data_nascimento: "",
                          cns: "",
                          parentesco: "",
                          nome_mae: "",
                          sexo: "Masculino",
                          uf_nascimento: "SP",
                          orgao_emissor: "",
                          anexos: {
                            rg_frente: null,
                            rg_verso: null,
                            comprovante_residencia: null,
                          }
                        }
                        setFormManual({
                          ...formManual,
                          dependentes: [...formManual.dependentes, novoDependente],
                          anexosDependentes: [...formManual.anexosDependentes, {}]
                        })
                      }}
                      className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#0f6b5c] text-white font-medium text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10"
                    >
                      + Adicionar Dependente
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-4">
                    {formManual.dependentes.map((dependente, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Dependente {index + 1}</h4>
                          <Button
                            type="button"
                            onClick={() => {
                              const novosDependentes = formManual.dependentes.filter((_, i) => i !== index)
                              const novosAnexos = formManual.anexosDependentes.filter((_, i) => i !== index)
                              setFormManual({
                                ...formManual,
                                dependentes: novosDependentes,
                                anexosDependentes: novosAnexos
                              })
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 w-full sm:w-auto"
                          >
                            Remover
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome <span className="text-red-500">*</span></label>
                            <Input value={dependente.nome} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].nome = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CPF <span className="text-red-500">*</span></label>
                            <Input value={dependente.cpf} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].cpf = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG <span className="text-red-500">*</span></label>
                            <Input value={dependente.rg} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].rg = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Nascimento <span className="text-red-500">*</span></label>
                            <Input type="date" value={dependente.data_nascimento} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].data_nascimento = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">CNS <span className="text-red-500">*</span></label>
                            <Input value={dependente.cns} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].cns = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Parentesco <span className="text-red-500">*</span></label>
                            <Input value={dependente.parentesco} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].parentesco = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Nome da Mãe <span className="text-red-500">*</span></label>
                            <Input value={dependente.nome_mae} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].nome_mae = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Sexo <span className="text-red-500">*</span></label>
                            <Select value={dependente.sexo} onValueChange={v => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].sexo = v
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required>
                              <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Masculino">Masculino</SelectItem>
                                <SelectItem value="Feminino">Feminino</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">UF de Nascimento <span className="text-red-500">*</span></label>
                            <Input value={dependente.uf_nascimento} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].uf_nascimento = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Órgão Emissor <span className="text-red-500">*</span></label>
                            <Input value={dependente.orgao_emissor} onChange={e => {
                              const novosDependentes = [...formManual.dependentes]
                              novosDependentes[index].orgao_emissor = e.target.value
                              setFormManual({ ...formManual, dependentes: novosDependentes })
                            }} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                          </div>
                        </div>
                        {/* Anexos do Dependente */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Anexos do Dependente</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG - Frente</label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  const novosAnexos = [...formManual.anexosDependentes]
                                  if (!novosAnexos[index]) novosAnexos[index] = {}
                                  novosAnexos[index].rg_frente = e.target.files[0]
                                  setFormManual({ ...formManual, anexosDependentes: novosAnexos })
                                }
                              }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">RG - Verso</label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  const novosAnexos = [...formManual.anexosDependentes]
                                  if (!novosAnexos[index]) novosAnexos[index] = {}
                                  novosAnexos[index].rg_verso = e.target.files[0]
                                  setFormManual({ ...formManual, anexosDependentes: novosAnexos })
                                }
                              }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Comprovante de Residência</label>
                              <Input type="file" accept="image/*,.pdf" onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  const novosAnexos = [...formManual.anexosDependentes]
                                  if (!novosAnexos[index]) novosAnexos[index] = {}
                                  novosAnexos[index].comprovante_residencia = e.target.files[0]
                                  setFormManual({ ...formManual, anexosDependentes: novosAnexos })
                                }
                              }} className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0F172A]/10 file:text-[#0F172A] hover:file:bg-[#0F172A]/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formManual.dependentes.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        Nenhum dependente adicionado. Clique em "Adicionar Dependente" para começar.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dados de Cadastro */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    Dados de Cadastro
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Corretor Responsável <span className="text-red-500">*</span></label>
                      <Select value={formManual.corretor_id} onValueChange={v => setFormManual({ ...formManual, corretor_id: v })} required>
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base">
                          <SelectValue placeholder="Selecione o corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          {corretoresDisponiveis.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome} ({c.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Administradora <span className="text-red-500">*</span></label>
                      <Input value={formManual.administradora} onChange={e => setFormManual({ ...formManual, administradora: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Vigência <span className="text-red-500">*</span></label>
                      <Input type="date" value={formManual.data_vigencia} onChange={e => setFormManual({ ...formManual, data_vigencia: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Vencimento <span className="text-red-500">*</span></label>
                      <Input type="date" value={formManual.data_vencimento} onChange={e => setFormManual({ ...formManual, data_vencimento: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Data de Cadastro <span className="text-red-500">*</span></label>
                      <Input type="date" value={formManual.data_cadastro} onChange={e => setFormManual({ ...formManual, data_cadastro: e.target.value })} required className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Status <span className="text-red-500">*</span></label>
                      <Select value={formManual.status} onValueChange={v => setFormManual({ ...formManual, status: v })} required>
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cadastrado">Cadastrado</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              <Card className="border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="flex items-center gap-2 text-[#0F172A] text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <Textarea
                    value={formManual.observacoes}
                    onChange={e => setFormManual({ ...formManual, observacoes: e.target.value })}
                    placeholder="Digite observações adicionais..."
                    rows={4}
                    className="border-2 border-gray-200 focus:border-[#0F172A] rounded-lg text-sm sm:text-base resize-none"
                  />
                </CardContent>
              </Card>
            </form>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowModalCadastroManual(false)}
                  disabled={uploading}
                  className="w-full sm:w-auto h-11 sm:h-12 px-4 sm:px-6 border-2 border-gray-300 hover:border-gray-400 text-sm sm:text-base"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={uploading}
                  className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#0f6b5c] text-white font-bold shadow-lg text-sm sm:text-base"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Salvar Cadastro
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}