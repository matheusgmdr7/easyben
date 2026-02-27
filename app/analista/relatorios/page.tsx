"use client"

import { useState, useEffect } from "react"
import { buscarPropostas, obterNomeCliente, buscarPropostaCompleta, buscarDependentesProposta } from "@/services/propostas-service-unificado"
import { buscarCorretores } from "@/services/corretores-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Download, Calendar } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"
import { supabase } from "@/lib/supabase"

interface LinhaRelatorio {
  proposta_id: string
  proposta_numero: string
  tipo: "Titular" | "Dependente"
  operadora: string
  entidade: string
  corretora: string
  supervisor: string
  corretor: string
  produto: string
  valor: string
  vigencia: string
  nome: string
  data_nascimento: string
  sexo: string
  estado_civil: string
  nome_pai: string
  nome_mae: string
  naturalidade: string
  rg: string
  cpf: string
  cns: string
  email: string
  endereco_rua_numero: string
  complemento: string
  bairro: string
  cep: string
  cidade: string
  estado: string
  uf: string
  telefone: string
  peso: string
  altura: string
  total_dependentes: number
}

export default function RelatoriosPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [linhasRelatorio, setLinhasRelatorio] = useState<LinhaRelatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroBusca, setFiltroBusca] = useState("")
  
  // Filtros
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [operadoraFiltro, setOperadoraFiltro] = useState("todas")
  const [vigenciaFiltro, setVigenciaFiltro] = useState("todas")
  const [corretoraFiltro, setCorretoraFiltro] = useState("todas")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  
  const [operadoras, setOperadoras] = useState<string[]>([])
  const [corretoras, setCorretoras] = useState<any[]>([])
  const [corretores, setCorretores] = useState<any[]>([])
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [propostasData, corretoresData] = await Promise.all([
        buscarPropostas(),
        buscarCorretores()
      ])
      
      setPropostas(propostasData || [])
      
      // Extrair operadoras únicas
      const operadorasUnicas = Array.from(new Set(
        propostasData
          ?.map(p => p.operadora || p.operadora_nome)
          .filter(Boolean)
      )).sort() as string[]
      setOperadoras(operadorasUnicas)
      
      // Buscar corretoras (gestores)
      const { data: gestoresData } = await supabase
        .from("gestores")
        .select("id, nome")
        .order("nome")
      
      setCorretoras(gestoresData || [])
      setCorretores(corretoresData || [])
      
      // Processar propostas para criar linhas do relatório
      console.log(`📊 Iniciando processamento de ${propostasData?.length || 0} propostas para relatório`)
      await processarPropostasParaRelatorio(propostasData || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  async function processarPropostasParaRelatorio(propostasData: any[]) {
    const linhas: LinhaRelatorio[] = []
    
    // Extrair dependentes diretamente da coluna 'dependentes' ou 'dependentes_dados' de cada proposta
    const dependentesPorProposta = new Map<string, any[]>()
    
    propostasData.forEach((proposta) => {
      let dependentes: any[] = []
      
      // Tentar extrair dependentes da coluna 'dependentes' ou 'dependentes_dados'
      const dependentesField = proposta.dependentes || proposta.dependentes_dados
      
      if (dependentesField) {
        try {
          // Se for string JSON, fazer parse
          if (typeof dependentesField === 'string') {
            const parsed = JSON.parse(dependentesField)
            if (Array.isArray(parsed)) {
              dependentes = parsed
            }
          } 
          // Se já for array, usar diretamente
          else if (Array.isArray(dependentesField)) {
            dependentes = dependentesField
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao processar dependentes da proposta ${proposta.id}:`, error)
        }
      }
      
      if (dependentes.length > 0) {
        const propostaIdStr = proposta.id?.toString()
        dependentesPorProposta.set(propostaIdStr, dependentes)
        console.log(`✅ Proposta ${propostaIdStr} tem ${dependentes.length} dependente(s) na coluna dependentes`)
        
        // Debug: verificar estrutura do primeiro dependente
        if (dependentes[0]) {
          console.log(`🔍 Estrutura do primeiro dependente [${propostaIdStr}]:`, {
            campos: Object.keys(dependentes[0]),
            valores: dependentes[0]
          })
        }
      }
    })
    
    console.log(`✅ Dependentes extraídos: ${dependentesPorProposta.size} propostas com dependentes`)
    
    // Também tentar buscar de tabelas separadas como fallback (caso alguns dependentes estejam lá)
    const propostaIds = propostasData.map(p => p.id)
    
    // Tentar tabela 'dependentes' como fallback
    const { data: dependentesData } = await supabase
      .from("dependentes")
      .select("*")
      .in("proposta_id", propostaIds)
    
    if (dependentesData && dependentesData.length > 0) {
      console.log(`✅ Encontrados ${dependentesData.length} dependentes adicionais na tabela 'dependentes'`)
      dependentesData.forEach((dep) => {
        const propostaId = dep.proposta_id?.toString()
        if (propostaId) {
          if (!dependentesPorProposta.has(propostaId)) {
            dependentesPorProposta.set(propostaId, [])
          }
          dependentesPorProposta.get(propostaId)!.push(dep)
        }
      })
    }
    
    // Buscar peso e altura de todos (titular e dependentes) da tabela questionario_respostas
    // Tentar diferentes tabelas possíveis
    let questionarios: any[] = []
    
    // Tentar questionario_respostas primeiro
    const { data: questionariosRespostas } = await supabase
      .from("questionario_respostas")
      .select("*")
      .in("proposta_id", propostaIds)
    
    if (questionariosRespostas && questionariosRespostas.length > 0) {
      questionarios = questionariosRespostas
    } else {
      // Tentar questionario_saude como fallback
      const { data: questionariosSaude } = await supabase
        .from("questionario_saude")
        .select("*")
        .in("proposta_id", propostaIds)
      
      if (questionariosSaude) {
        questionarios = questionariosSaude
      }
    }
    
    const questionariosPorProposta = new Map<string, Map<string, any>>()
    if (questionarios && questionarios.length > 0) {
      questionarios.forEach((q) => {
        if (!questionariosPorProposta.has(q.proposta_id)) {
          questionariosPorProposta.set(q.proposta_id, new Map())
        }
        const map = questionariosPorProposta.get(q.proposta_id)!
        
        // Tentar diferentes formas de identificar a pessoa
        let key = 'titular'
        if (q.pessoa_tipo === 'dependente' || q.dependente_id) {
          const depIndex = q.pessoa_index || q.dependente_id || q.pessoa_nome
          key = `dependente_${depIndex}`
        } else if (q.pessoa_tipo === 'titular' || !q.dependente_id) {
          key = 'titular'
        }
        
        map.set(key, q)
      })
    }
    
    for (const proposta of propostasData) {
      try {
        // Usar a proposta diretamente (já tem os dados básicos)
        const propostaCompleta = proposta
        
        // Buscar dependentes do mapa
        const propostaIdStr = proposta.id?.toString()
        const dependentes = dependentesPorProposta.get(propostaIdStr) || []
        
        // Buscar nome da corretora
        let nomeCorretora = "Independente"
        let supervisorNome = "-"
        if (propostaCompleta.corretora_id || propostaCompleta.gestor_id) {
          const corretoraId = propostaCompleta.corretora_id || propostaCompleta.gestor_id
          const corretora = corretoras.find(c => c.id === corretoraId)
          nomeCorretora = corretora?.nome?.toUpperCase() || "Independente"
          
          // Buscar supervisor (gestor da corretora)
          if (corretora?.gestor_id) {
            const supervisor = corretoras.find(c => c.id === corretora.gestor_id)
            supervisorNome = supervisor?.nome?.toUpperCase() || "-"
          }
        }
        
        // Buscar nome do corretor
        let nomeCorretor = "-"
        if (propostaCompleta.corretor_id) {
          const corretor = corretores.find(c => c.id === propostaCompleta.corretor_id)
          nomeCorretor = corretor?.nome?.toUpperCase() || propostaCompleta.corretor_nome?.toUpperCase() || "-"
        }
        
        const valorTotal = propostaCompleta.valor_total || propostaCompleta.valor_proposta || propostaCompleta.valor_mensal || 0
        const qtdDependentes = Array.isArray(dependentes) ? dependentes.length : 0
        
        // Buscar peso e altura do titular do questionário
        const questionarioTitular = questionariosPorProposta.get(propostaCompleta.id)?.get('titular')
        const pesoTitular = questionarioTitular?.peso || propostaCompleta.peso || "-"
        const alturaTitular = questionarioTitular?.altura || propostaCompleta.altura || "-"
        
        // Formatar data de nascimento
        const formatarData = (data: string | null | undefined) => {
          if (!data) return "-"
          try {
            const date = new Date(data)
            return date.toLocaleDateString('pt-BR')
          } catch {
            return data
          }
        }
        
        // Formatar peso e altura
        const formatarPeso = (peso: any) => {
          if (!peso) return "-"
          if (typeof peso === 'number') return `${peso} kg`
          if (typeof peso === 'string' && peso.trim()) return `${peso} kg`
          return "-"
        }
        
        const formatarAltura = (altura: any) => {
          if (!altura) return "-"
          if (typeof altura === 'number') return `${altura} cm`
          if (typeof altura === 'string' && altura.trim()) return `${altura} cm`
          return "-"
        }
        
        // Linha do TITULAR
        linhas.push({
          proposta_id: propostaCompleta.id,
          proposta_numero: propostaCompleta.numero || propostaCompleta.id?.substring(0, 8) || "-",
          tipo: "Titular",
          operadora: (propostaCompleta.operadora || propostaCompleta.operadora_nome || "-").toUpperCase(),
          entidade: propostaCompleta.entidade || propostaCompleta.entidade_nome || "-",
          corretora: nomeCorretora,
          supervisor: supervisorNome,
          corretor: nomeCorretor,
          produto: propostaCompleta.produto_nome || propostaCompleta.produto || propostaCompleta.sigla_plano || propostaCompleta.plano_nome || "-",
          valor: formatarMoeda(valorTotal),
          vigencia: formatarData(propostaCompleta.data_vigencia || propostaCompleta.vigencia),
          nome: obterNomeCliente(propostaCompleta).toUpperCase(),
          data_nascimento: formatarData(propostaCompleta.data_nascimento),
          sexo: propostaCompleta.sexo || propostaCompleta.genero || "-",
          estado_civil: propostaCompleta.estado_civil || "-",
          nome_pai: propostaCompleta.nome_pai?.toUpperCase() || "-",
          nome_mae: propostaCompleta.nome_mae?.toUpperCase() || "-",
          naturalidade: propostaCompleta.naturalidade?.toUpperCase() || "-",
          rg: propostaCompleta.rg || propostaCompleta.rg_titular || "-",
          cpf: propostaCompleta.cpf || propostaCompleta.cpf_cliente || "-",
          cns: propostaCompleta.cns || propostaCompleta.cns_titular || "-",
          email: propostaCompleta.email || propostaCompleta.email_cliente || propostaCompleta.email_titular || "-",
          endereco_rua_numero: `${propostaCompleta.endereco || propostaCompleta.rua || ""} ${propostaCompleta.numero || ""}`.trim() || "-",
          complemento: propostaCompleta.complemento || "-",
          bairro: propostaCompleta.bairro?.toUpperCase() || "-",
          cep: propostaCompleta.cep || "-",
          cidade: propostaCompleta.cidade?.toUpperCase() || "-",
          estado: propostaCompleta.estado?.toUpperCase() || "-",
          uf: propostaCompleta.uf?.toUpperCase() || propostaCompleta.estado?.toUpperCase() || "-",
          telefone: propostaCompleta.telefone || propostaCompleta.telefone_cliente || propostaCompleta.celular || propostaCompleta.whatsapp || "-",
          peso: formatarPeso(pesoTitular),
          altura: formatarAltura(alturaTitular),
          total_dependentes: qtdDependentes
        })
        
        // Linhas dos DEPENDENTES
        if (dependentes && Array.isArray(dependentes) && dependentes.length > 0) {
          dependentes.forEach((dependente, depIndex) => {
            // Buscar peso e altura do dependente do questionário
            // Tentar diferentes formas de correspondência
            const questionarioMap = questionariosPorProposta.get(propostaCompleta.id)
            let questionarioDep = null
            
            if (questionarioMap) {
              // Tentar por índice
              questionarioDep = questionarioMap.get(`dependente_${depIndex}`) ||
                               questionarioMap.get(`dependente_${depIndex + 1}`)
              
              // Se não encontrou, tentar por nome
              if (!questionarioDep && dependente.nome) {
                questionarioDep = questionarioMap.get(`dependente_${dependente.nome}`)
              }
              
              // Se ainda não encontrou, buscar qualquer dependente que não seja titular
              if (!questionarioDep) {
                for (const [key, value] of questionarioMap.entries()) {
                  if (key.startsWith('dependente_') && value.pessoa_tipo === 'dependente') {
                    // Verificar se corresponde ao dependente atual por nome ou índice
                    if (value.pessoa_nome === dependente.nome || 
                        value.pessoa_index === depIndex || 
                        value.pessoa_index === depIndex + 1) {
                      questionarioDep = value
                      break
                    }
                  }
                }
              }
            }
            
            const pesoDep = questionarioDep?.peso || dependente.peso || "-"
            const alturaDep = questionarioDep?.altura || dependente.altura || "-"
            
            // Extrair nome do dependente (pode estar em diferentes campos)
            const nomeDependente = dependente.nome || dependente.nome_dependente || dependente.nome_completo || "Dependente"
            
            // Extrair valor individual do dependente (tentar vários campos possíveis)
            let valorIndividual = dependente.valor_individual || 
                                 dependente.valor || 
                                 dependente.valor_mensal || 
                                 dependente.valor_plano ||
                                 dependente.valor_dependente ||
                                 dependente.valor_individual_dependente ||
                                 dependente.preco ||
                                 dependente.preco_mensal ||
                                 null
            
            // Converter para número se for string
            if (valorIndividual !== null && valorIndividual !== undefined) {
              if (typeof valorIndividual === 'string') {
                // Remover caracteres não numéricos exceto ponto e vírgula
                const valorLimpo = valorIndividual.replace(/[^\d,.-]/g, '').replace(',', '.')
                valorIndividual = parseFloat(valorLimpo) || 0
              } else {
                valorIndividual = Number(valorIndividual) || 0
              }
            } else {
              valorIndividual = 0
            }
            
            // Debug: log para verificar o que está vindo (apenas para o primeiro dependente de cada proposta)
            if (depIndex === 0) {
              console.log(`🔍 Debug dependente [${propostaCompleta.id}]:`, {
                nome: nomeDependente,
                valor_individual_original: dependente.valor_individual,
                valor_original: dependente.valor,
                valor_mensal_original: dependente.valor_mensal,
                todos_campos: Object.keys(dependente),
                valor_final_convertido: valorIndividual
              })
            }
            
            const valorFormatado = valorIndividual > 0 ? formatarMoeda(valorIndividual) : "-"
            
            linhas.push({
              proposta_id: propostaCompleta.id,
              proposta_numero: propostaCompleta.numero || propostaCompleta.id?.substring(0, 8) || "-",
              tipo: "Dependente",
              operadora: (propostaCompleta.operadora || propostaCompleta.operadora_nome || "-").toUpperCase(),
              entidade: propostaCompleta.entidade || propostaCompleta.entidade_nome || "-",
              corretora: nomeCorretora,
              supervisor: supervisorNome,
              corretor: nomeCorretor,
              produto: propostaCompleta.produto_nome || propostaCompleta.produto || propostaCompleta.sigla_plano || propostaCompleta.plano_nome || "-",
              valor: valorFormatado,
              vigencia: formatarData(propostaCompleta.data_vigencia || propostaCompleta.vigencia),
              nome: nomeDependente.toUpperCase(),
              data_nascimento: formatarData(dependente.data_nascimento || dependente.data_nasc || dependente.data_de_nascimento),
              sexo: dependente.sexo || dependente.genero || "-",
              estado_civil: dependente.estado_civil || "-",
              nome_pai: dependente.nome_pai?.toUpperCase() || dependente.pai?.toUpperCase() || "-",
              nome_mae: dependente.nome_mae?.toUpperCase() || dependente.mae?.toUpperCase() || "-",
              naturalidade: dependente.naturalidade?.toUpperCase() || dependente.cidade_nascimento?.toUpperCase() || "-",
              rg: dependente.rg || dependente.rg_dependente || dependente.numero_rg || "-",
              cpf: dependente.cpf || dependente.cpf_dependente || "-",
              cns: dependente.cns || dependente.cns_dependente || dependente.numero_cns || "-",
              email: dependente.email || dependente.email_dependente || "-",
              endereco_rua_numero: `${propostaCompleta.endereco || propostaCompleta.rua || ""} ${propostaCompleta.numero || ""}`.trim() || "-",
              complemento: propostaCompleta.complemento || "-",
              bairro: propostaCompleta.bairro?.toUpperCase() || "-",
              cep: propostaCompleta.cep || "-",
              cidade: propostaCompleta.cidade?.toUpperCase() || "-",
              estado: propostaCompleta.estado?.toUpperCase() || "-",
              uf: propostaCompleta.uf?.toUpperCase() || propostaCompleta.estado?.toUpperCase() || "-",
              telefone: propostaCompleta.telefone || propostaCompleta.telefone_cliente || propostaCompleta.celular || propostaCompleta.whatsapp || "-",
              peso: formatarPeso(pesoDep),
              altura: formatarAltura(alturaDep),
              total_dependentes: qtdDependentes
            })
          })
        }
      } catch (error) {
        console.error(`Erro ao processar proposta ${proposta.id}:`, error)
      }
    }
    
    console.log(`✅ Processamento concluído: ${linhas.length} linhas criadas (${linhas.filter(l => l.tipo === 'Titular').length} titulares + ${linhas.filter(l => l.tipo === 'Dependente').length} dependentes)`)
    setLinhasRelatorio(linhas)
  }

  // Relação entre valor do filtro e status no banco (alinhado à página de propostas)
  function statusMatchFiltro(propostaStatus: string | undefined, statusFiltro: string): boolean {
    const s = (propostaStatus || "").toLowerCase()
    switch (statusFiltro) {
      case "parcial": return ["parcial", "aguardando_validacao"].includes(s)
      case "aguardando_cliente": return s === "aguardando_cliente"
      case "pendente": return ["pendente", "em_analise"].includes(s)
      case "aprovada": return ["aprovada", "aprovado"].includes(s)
      case "cadastrado": return ["cadastrado", "cadastrada"].includes(s)
      case "transmitida": return s === "transmitida"
      case "rejeitada": return ["rejeitada", "rejeitado"].includes(s)
      case "cancelada": return ["cancelada", "cancelado"].includes(s)
      case "devolvida": return s === "devolvida"
      default: return false
    }
  }

  // Filtrar linhas do relatório
  const linhasFiltradas = linhasRelatorio.filter((linha) => {
    // Filtro de busca (nome do titular ou dependente)
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase()
      const nome = linha.nome.toLowerCase()
      if (!nome.includes(busca)) {
        return false
      }
    }
    
    // Filtro de data início (buscar pela proposta)
    if (dataInicio) {
      const proposta = propostas.find(p => p.id === linha.proposta_id)
      if (proposta) {
        const dataProposta = new Date(proposta.created_at)
        const dataInicioFiltro = new Date(dataInicio)
        if (dataProposta < dataInicioFiltro) {
          return false
        }
      }
    }
    
    // Filtro de data fim
    if (dataFim) {
      const proposta = propostas.find(p => p.id === linha.proposta_id)
      if (proposta) {
        const dataProposta = new Date(proposta.created_at)
        const dataFimFiltro = new Date(dataFim)
        dataFimFiltro.setHours(23, 59, 59, 999)
        if (dataProposta > dataFimFiltro) {
          return false
        }
      }
    }
    
    // Filtro de operadora
    if (operadoraFiltro !== "todas") {
      if (linha.operadora !== operadoraFiltro.toUpperCase()) {
        return false
      }
    }
    
    // Filtro de vigência
    if (vigenciaFiltro !== "todas") {
      const proposta = propostas.find(p => p.id === linha.proposta_id)
      if (proposta) {
        const dataVigencia = proposta.data_vigencia || proposta.vigencia
        if (!dataVigencia) return false
        
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const vigencia = new Date(dataVigencia)
        vigencia.setHours(0, 0, 0, 0)
        
        if (vigenciaFiltro === "ativa" && vigencia < hoje) return false
        if (vigenciaFiltro === "vencida" && vigencia >= hoje) return false
      }
    }
    
    // Filtro de corretora
    if (corretoraFiltro !== "todas") {
      const proposta = propostas.find(p => p.id === linha.proposta_id)
      if (proposta) {
        const corretoraId = proposta.corretora_id || proposta.gestor_id
        if (corretoraId !== corretoraFiltro) {
          return false
        }
      }
    }
    
    // Filtro de status (mesmos valores e agrupamentos da página de propostas)
    if (statusFiltro !== "todos") {
      const proposta = propostas.find(p => p.id === linha.proposta_id)
      if (proposta && !statusMatchFiltro(proposta.status, statusFiltro)) {
        return false
      }
    }
    
    return true
  })

  // Função para exportar Excel
  async function exportarExcel() {
    if (linhasFiltradas.length === 0) {
      toast.error("Nenhum registro para exportar")
      return
    }

    try {
      setExportandoExcel(true)
      const XLSX = await import('xlsx')
      
      const dadosExcel = linhasFiltradas.map((linha) => ({
        "Proposta": linha.proposta_numero,
        "Tipo": linha.tipo,
        "Operadora": linha.operadora,
        "Entidade": linha.entidade,
        "Corretora": linha.corretora,
        "Supervisor": linha.supervisor,
        "Corretor": linha.corretor,
        "Produto": linha.produto,
        "Valor": linha.valor,
        "Vigência": linha.vigencia,
        "Nome": linha.nome,
        "Data de Nascimento": linha.data_nascimento,
        "Sexo": linha.sexo,
        "Estado Civil": linha.estado_civil,
        "Nome do Pai": linha.nome_pai,
        "Nome da Mãe": linha.nome_mae,
        "Naturalidade": linha.naturalidade,
        "RG": linha.rg,
        "CPF": linha.cpf,
        "CNS": linha.cns,
        "E-mail": linha.email,
        "Endereço (Rua e Número)": linha.endereco_rua_numero,
        "Complemento": linha.complemento,
        "Bairro": linha.bairro,
        "CEP": linha.cep,
        "Cidade": linha.cidade,
        "Estado": linha.estado,
        "UF": linha.uf,
        "Telefone": linha.telefone,
        "Peso": linha.peso,
        "Altura": linha.altura,
        "Total Dependentes": linha.total_dependentes
      }))
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosExcel)
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 },  // Proposta
        { wch: 10 },  // Tipo
        { wch: 20 },  // Operadora
        { wch: 20 },  // Entidade
        { wch: 25 },  // Corretora
        { wch: 25 },  // Supervisor
        { wch: 25 },  // Corretor
        { wch: 30 },  // Produto
        { wch: 15 },  // Valor
        { wch: 12 },  // Vigência
        { wch: 30 },  // Nome
        { wch: 15 },  // Data de Nascimento
        { wch: 8 },   // Sexo
        { wch: 12 },  // Estado Civil
        { wch: 25 },  // Nome do Pai
        { wch: 25 },  // Nome da Mãe
        { wch: 20 },  // Naturalidade
        { wch: 15 },  // RG
        { wch: 15 },  // CPF
        { wch: 15 },  // CNS
        { wch: 30 },  // E-mail
        { wch: 30 },  // Endereço
        { wch: 20 },  // Complemento
        { wch: 20 },  // Bairro
        { wch: 10 },  // CEP
        { wch: 20 },  // Cidade
        { wch: 20 },  // Estado
        { wch: 5 },   // UF
        { wch: 15 },  // Telefone
        { wch: 8 },   // Peso
        { wch: 8 },   // Altura
        { wch: 12 }   // Total Dependentes
      ]
      ws['!cols'] = colWidths
      
      XLSX.utils.book_append_sheet(wb, ws, "Relatório Propostas")
      
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      const nomeArquivo = `relatorio_propostas_${dataAtual}.xlsx`
      
      XLSX.writeFile(wb, nomeArquivo)
      toast.success(`Relatório Excel gerado com sucesso! (${linhasFiltradas.length} registros)`)
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
      toast.error("Erro ao gerar relatório Excel")
    } finally {
      setExportandoExcel(false)
    }
  }

  // Função para exportar PDF
  async function exportarPDF() {
    if (linhasFiltradas.length === 0) {
      toast.error("Nenhum registro para exportar")
      return
    }

    try {
      setExportandoPDF(true)
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 5
      const startY = 15
      let y = startY
      const fontSize = 6
      
      // Título
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('RELATÓRIO DE PROPOSTAS', pageWidth / 2, y, { align: 'center' })
      y += 5
      
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: 'center' })
      y += 8
      
      // Cabeçalho da tabela (colunas principais - reduzido para caber)
      doc.setFontSize(fontSize)
      doc.setFont(undefined, 'bold')
      
      const headers = [
        'Proposta', 'Tipo', 'Operadora', 'Entidade', 'Corretora', 'Supervisor', 'Corretor',
        'Produto', 'Valor', 'Vigência', 'Nome', 'Data Nasc.', 'Sexo', 'Estado Civil',
        'Nome Pai', 'Nome Mãe', 'Naturalidade', 'RG', 'CPF', 'CNS', 'E-mail',
        'Endereço', 'Complemento', 'Bairro', 'CEP', 'Cidade', 'Estado', 'UF',
        'Telefone', 'Peso', 'Altura', 'Total Dep.'
      ]
      
      const colWidths = [
        10, 8, 15, 12, 18, 18, 18, 20, 12, 10, 20, 10, 6, 10,
        15, 15, 12, 10, 12, 10, 20, 20, 12, 12, 8, 15, 12, 5,
        10, 6, 6, 8
      ]
      
      // Ajustar larguras para caber na página
      const totalWidth = colWidths.reduce((a, b) => a + b, 0)
      const scale = (pageWidth - margin * 2) / totalWidth
      const colWidthsScaled = colWidths.map(w => w * scale)
      
      let x = margin
      headers.forEach((header, index) => {
        const text = doc.splitTextToSize(header, colWidthsScaled[index] - 1)
        doc.text(text, x, y)
        x += colWidthsScaled[index]
      })
      
      y += 4
      doc.line(margin, y, pageWidth - margin, y)
      y += 4
      
      // Dados
      doc.setFont(undefined, 'normal')
      linhasFiltradas.forEach((linha, index) => {
        if (y > pageHeight - 15) {
          doc.addPage()
          y = startY
          
          // Repetir cabeçalho
          doc.setFont(undefined, 'bold')
          x = margin
          headers.forEach((header, idx) => {
            const text = doc.splitTextToSize(header, colWidthsScaled[idx] - 1)
            doc.text(text, x, y)
            x += colWidthsScaled[idx]
          })
          y += 4
          doc.line(margin, y, pageWidth - margin, y)
          y += 4
          doc.setFont(undefined, 'normal')
        }
        
        const row = [
          linha.proposta_numero,
          linha.tipo,
          linha.operadora,
          linha.entidade,
          linha.corretora,
          linha.supervisor,
          linha.corretor,
          linha.produto,
          linha.valor,
          linha.vigencia,
          linha.nome,
          linha.data_nascimento,
          linha.sexo,
          linha.estado_civil,
          linha.nome_pai,
          linha.nome_mae,
          linha.naturalidade,
          linha.rg,
          linha.cpf,
          linha.cns,
          linha.email,
          linha.endereco_rua_numero,
          linha.complemento,
          linha.bairro,
          linha.cep,
          linha.cidade,
          linha.estado,
          linha.uf,
          linha.telefone,
          linha.peso,
          linha.altura,
          linha.total_dependentes.toString()
        ]
        
        x = margin
        row.forEach((cell, idx) => {
          const text = doc.splitTextToSize(cell || "-", colWidthsScaled[idx] - 1)
          doc.text(text, x, y)
          x += colWidthsScaled[idx]
        })
        
        y += 5
      })
      
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      const nomeArquivo = `relatorio_propostas_${dataAtual}.pdf`
      doc.save(nomeArquivo)
      
      toast.success(`Relatório PDF gerado com sucesso! (${linhasFiltradas.length} registros)`)
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
      toast.error("Erro ao gerar relatório PDF")
    } finally {
      setExportandoPDF(false)
    }
  }

  // Função para limpar filtros
  function limparFiltros() {
    setDataInicio("")
    setDataFim("")
    setOperadoraFiltro("todas")
    setVigenciaFiltro("todas")
    setCorretoraFiltro("todas")
    setStatusFiltro("todos")
    setFiltroBusca("")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  // Calcular resumo de busca
  const totalTitulares = linhasFiltradas.filter(l => l.tipo === "Titular").length
  const totalDependentes = linhasFiltradas.filter(l => l.tipo === "Dependente").length
  const totalBeneficiarios = totalTitulares + totalDependentes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900">RELATÓRIOS</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Data Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Início <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="pl-10 rounded border-2 border-gray-300 bg-white text-gray-900 focus:border-[#0F172A] focus:ring-0"
                style={{ borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fim <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="pl-10 rounded border-2 border-gray-300 bg-white text-gray-900 focus:border-[#0F172A] focus:ring-0"
                style={{ borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* Operadora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operadora
            </label>
            <Select value={operadoraFiltro} onValueChange={setOperadoraFiltro}>
              <SelectTrigger className="rounded border-2 border-gray-300 bg-white focus:border-[#0F172A]" style={{ borderRadius: '4px' }}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {operadoras.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vigência */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vigência <span className="text-red-500">*</span>
            </label>
            <Select value={vigenciaFiltro} onValueChange={setVigenciaFiltro}>
              <SelectTrigger className="rounded border-2 border-gray-300 bg-white focus:border-[#0F172A]" style={{ borderRadius: '4px' }}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Corretora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Corretora
            </label>
            <Select value={corretoraFiltro} onValueChange={setCorretoraFiltro}>
              <SelectTrigger className="rounded border-2 border-gray-300 bg-white focus:border-[#0F172A]" style={{ borderRadius: '4px' }}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {corretoras.map((corretora) => (
                  <SelectItem key={corretora.id} value={corretora.id}>
                    {corretora.nome?.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="rounded border-2 border-gray-300 bg-white focus:border-[#0F172A]" style={{ borderRadius: '4px' }}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="parcial">Aguardando validação</SelectItem>
                <SelectItem value="aguardando_cliente">Aguardando cliente</SelectItem>
                <SelectItem value="pendente">Aguardando análise</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="cadastrado">Cadastrado</SelectItem>
                <SelectItem value="transmitida">Transmitida</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="devolvida">Devolvida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={carregarDados}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded"
            style={{ borderRadius: '4px' }}
          >
            <Search className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>
          
          <Button
            onClick={exportarPDF}
            disabled={exportandoPDF || linhasFiltradas.length === 0}
            variant="outline"
            className="border-[#0F172A] text-[#0F172A] bg-white hover:bg-[#0F172A] hover:text-white rounded"
            style={{ borderRadius: '4px' }}
          >
            <FileText className="h-4 w-4 mr-2" />
            {exportandoPDF ? "Gerando..." : "PDF"}
          </Button>
          
          <Button
            onClick={exportarExcel}
            disabled={exportandoExcel || linhasFiltradas.length === 0}
            variant="outline"
            className="border-[#0F172A] text-[#0F172A] bg-white hover:bg-[#0F172A] hover:text-white rounded"
            style={{ borderRadius: '4px' }}
          >
            <FileText className="h-4 w-4 mr-2" />
            {exportandoExcel ? "Gerando..." : "Excel"}
          </Button>
        </div>
      </div>

      {/* Resumo de Busca */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-600">Total de Beneficiários:</span>
          <span className="font-bold text-[#0F172A]">{totalBeneficiarios}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">Titulares:</span>
          <span className="font-bold text-[#0F172A]">{totalTitulares}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">Dependentes:</span>
          <span className="font-bold text-[#0F172A]">{totalDependentes}</span>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Busca:
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <Input
            type="text"
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            placeholder="Buscar por nome do beneficiário..."
            className="pl-10 rounded border-2 border-gray-300 bg-white text-gray-900 focus:border-[#0F172A] focus:ring-0"
            style={{ borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Proposta</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tipo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Operadora</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Entidade</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Corretora</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Supervisor</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Corretor</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Produto</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Valor</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Vigência</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Nome</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Data Nasc.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Sexo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Estado Civil</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Nome Pai</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Nome Mãe</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Naturalidade</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">RG</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">CPF</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">CNS</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">E-mail</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Endereço</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Complemento</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Bairro</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">CEP</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Cidade</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Estado</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">UF</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Telefone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Peso</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Altura</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Total Dep.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {linhasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={32} className="px-4 py-8 text-center text-gray-500">
                    Nenhum registro encontrado...
                  </td>
                </tr>
              ) : (
                linhasFiltradas.map((linha, index) => (
                  <tr key={`${linha.proposta_id}-${linha.tipo}-${index}`} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.proposta_numero}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.tipo}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.operadora}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.entidade}</td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{linha.corretora}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.supervisor}</td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{linha.corretor}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.produto}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.valor}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.vigencia}</td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{linha.nome}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.data_nascimento}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.sexo}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.estado_civil}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.nome_pai}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.nome_mae}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.naturalidade}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.rg}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.cpf}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.cns}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.email}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.endereco_rua_numero}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.complemento}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.bairro}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.cep}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.cidade}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.estado}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.uf}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.telefone}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.peso}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.altura}</td>
                    <td className="px-3 py-2 text-xs text-gray-900">{linha.total_dependentes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
