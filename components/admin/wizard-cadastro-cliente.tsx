"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Building, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  User,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
  XCircle,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { ClientesAdministradorasService } from "@/services/clientes-administradoras-service"
import { openModalOverlay, closeModalOverlay } from "@/hooks/use-modal-overlay"

interface WizardCadastroClienteProps {
  proposta: any
  administradoras: any[]
  onClose: () => void
  onSuccess: () => void
}

interface DadosCadastro {
  // Etapa 1 - Dados Básicos
  administradora: string
  dataVencimento: string
  dataVigencia: string
  valorMensal: number
  
  // Etapa 2 - Cadastro Asaas
  integrarAsaas: boolean
  clienteNome: string
  clienteEmail: string
  clienteTelefone: string
  clienteCpf: string
  clienteEndereco: string
  clienteNumero: string
  clienteBairro: string
  clienteCidade: string
  clienteEstado: string
  clienteCep: string
  
  // Tipo de Faturamento (escolha após etapa 2)
  tipoFaturamento: "unica" | "recorrente" | "depois" | null
  
  // Etapa 3 - Primeira Fatura (apenas se tipoFaturamento = "unica")
  gerarFatura: boolean
  faturaDescricao: string
  faturaVencimento: string
  faturaValor: number
  faturaDiaVencimento: number
  faturaJuros: number
  faturaMulta: number
  faturaDesconto: number
  faturaObservacoes: string
  
  // Etapa 4 - Assinatura Recorrente (apenas se tipoFaturamento = "recorrente")
  criarAssinatura: boolean
  assinaturaDataInicio: string
  assinaturaDataFim: string
  assinaturaCiclo: "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY"
  assinaturaValor: number
  assinaturaDescricao: string
  assinaturaDiaVencimento: number
  assinaturaJuros: number
  assinaturaMulta: number
}

export function WizardCadastroCliente({
  proposta,
  administradoras,
  onClose,
  onSuccess
}: WizardCadastroClienteProps) {
  const router = useRouter()
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  
  useEffect(() => {
    openModalOverlay()
    return () => {
      closeModalOverlay()
    }
  }, [])

  // Função para calcular valor total mensal (titular + dependentes)
  const calcularValorTotalMensal = (proposta: any) => {
    let total = 0
    let valorTitular = proposta.valor_mensal || proposta.valor || proposta.valor_total || 0
    if (typeof valorTitular !== "number") {
      valorTitular = String(valorTitular).replace(/[^\d,\.]/g, "").replace(",", ".")
      valorTitular = Number.parseFloat(valorTitular)
    }
    if (!isNaN(valorTitular) && valorTitular > 0) {
      total += valorTitular
    }
    
    // Parsear dependentes
    let dependentesArr = []
    try {
      if (proposta.dependentes && typeof proposta.dependentes === 'string') {
        dependentesArr = JSON.parse(proposta.dependentes)
      } else if (Array.isArray(proposta.dependentes)) {
        dependentesArr = proposta.dependentes
      }
    } catch {
      dependentesArr = []
    }
    
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
  
  // Calcular valor total inicial
  const valorTotalInicial = calcularValorTotalMensal(proposta)
  
  const [dados, setDados] = useState<DadosCadastro>({
    // Etapa 1 - Pré-preencher com dados da proposta
    administradora: "",
    dataVencimento: proposta.data_vencimento || "",
    dataVigencia: proposta.data_vigencia || "",
    valorMensal: valorTotalInicial,
    
    // Etapa 2 - Preencher com dados da proposta
    integrarAsaas: true,
    clienteNome: proposta.nome || "",
    clienteEmail: proposta.email || "",
    clienteTelefone: proposta.telefone || proposta.celular || "",
    clienteCpf: proposta.cpf || "",
    clienteEndereco: proposta.endereco || "",
    clienteNumero: proposta.numero || "",
    clienteBairro: proposta.bairro || "",
    clienteCidade: proposta.cidade || "",
    clienteEstado: proposta.estado || "",
    clienteCep: proposta.cep || "",
    
    // Tipo de Faturamento (escolha após etapa 2)
    tipoFaturamento: null,
    
    // Etapa 3 - Primeira Fatura (apenas se tipoFaturamento = "unica")
    gerarFatura: true,
    faturaDescricao: `Mensalidade ${proposta.produto_nome || proposta.plano_nome || ""} - Taxa Administrativa: 5,00`,
    faturaVencimento: "",
    faturaValor: valorTotalInicial,
    faturaDiaVencimento: 10,
    faturaJuros: 2,
    faturaMulta: 2,
    faturaDesconto: 0,
    faturaObservacoes: "",
    
    // Etapa 4 - Assinatura Recorrente (apenas se tipoFaturamento = "recorrente")
    criarAssinatura: true, // Sempre true se escolher recorrente
    assinaturaDataInicio: "",
    assinaturaDataFim: "",
    assinaturaCiclo: "MONTHLY",
    assinaturaValor: valorTotalInicial,
    assinaturaDescricao: `Mensalidade ${proposta.produto_nome || proposta.plano_nome || ""} - Taxa Administrativa: 5,00`,
    assinaturaDiaVencimento: 10,
    assinaturaJuros: 2,
    assinaturaMulta: 2
  })

  const etapas = [
    { numero: 1, titulo: "Dados Básicos", icone: Building, descricao: "Administradora e datas" },
    { numero: 2, titulo: "Cadastro Asaas", icone: User, descricao: "Dados do cliente" },
    { numero: 3, titulo: "Tipo de Faturamento", icone: CreditCard, descricao: "Escolha o tipo" },
    { numero: 4, titulo: "Configuração", icone: FileText, descricao: "Fatura ou Assinatura" },
    { numero: 5, titulo: "Confirmação", icone: CheckCircle, descricao: "Revisar e finalizar" }
  ]
  
  // Calcular etapa real baseada no tipo de faturamento
  const getEtapaReal = () => {
    if (etapaAtual === 1) return 1 // Dados Básicos
    if (etapaAtual === 2) return 2 // Cadastro Asaas
    if (etapaAtual === 3) return 3 // Tipo de Faturamento
    if (etapaAtual === 4) {
      // Etapa 4 pode ser Fatura Única ou Assinatura, dependendo da escolha
      if (dados.tipoFaturamento === "unica") return 4 // Fatura Única
      if (dados.tipoFaturamento === "recorrente") return 4 // Assinatura
      return 3 // Ainda não escolheu, voltar para escolha
    }
    if (etapaAtual === 5) return 5 // Confirmação
    return etapaAtual
  }

  const podeAvancar = () => {
    switch (etapaAtual) {
      case 1:
        return dados.administradora && dados.dataVencimento && dados.dataVigencia && dados.valorMensal > 0
      case 2:
        if (!dados.integrarAsaas) return true
        return dados.clienteNome && dados.clienteEmail && dados.clienteCpf
      case 3:
        // Tipo de faturamento deve ser escolhido
        return dados.tipoFaturamento !== null
      case 4:
        // Se for "depois", não precisa validar nada (já pulou para etapa 5)
        if (dados.tipoFaturamento === "depois") {
          return true
        }
        // Se for fatura única, validar campos da fatura
        if (dados.tipoFaturamento === "unica") {
          return dados.faturaVencimento && dados.faturaValor > 0 && dados.faturaDescricao
        }
        // Se for recorrente, validar campos da assinatura
        if (dados.tipoFaturamento === "recorrente") {
          return dados.assinaturaDescricao && dados.assinaturaValor > 0
        }
        return false
      case 5:
        return true
      default:
        return false
    }
  }

  const proximaEtapa = () => {
    if (podeAvancar()) {
      // Se está na etapa 3 (escolha do tipo) e escolheu "depois", pular direto para etapa 5 (confirmação)
      if (etapaAtual === 3 && dados.tipoFaturamento === "depois") {
        setEtapaAtual(5)
      }
      // Se está na etapa 3 (escolha do tipo) e escolheu outra opção, ir para etapa 4
      else if (etapaAtual === 3 && dados.tipoFaturamento) {
        setEtapaAtual(4)
      } else {
        setEtapaAtual(prev => Math.min(prev + 1, 5))
      }
    } else {
      toast.error("Preencha todos os campos obrigatórios")
    }
  }

  const etapaAnterior = () => {
    setEtapaAtual(prev => Math.max(prev - 1, 1))
  }

  const finalizarCadastro = async () => {
    // Proteção contra cliques duplos
    if (salvando) {
      console.log("⚠️ Cadastro já em andamento, ignorando clique duplo")
      return
    }
    
    try {
      setSalvando(true)
      
      console.log("🚀 Iniciando cadastro completo do cliente...")
      console.log("📊 Dados do wizard:", dados)
      
      // Determinar se é fatura única, recorrente ou depois
      const isFaturaUnica = dados.tipoFaturamento === "unica"
      const isRecorrente = dados.tipoFaturamento === "recorrente"
      const isGerarDepois = dados.tipoFaturamento === "depois"
      
      // Se faturaVencimento estiver vazio, usar dataVencimento
      const vencimentoFatura = dados.faturaVencimento || dados.dataVencimento
      
      console.log("📅 Tipo de faturamento:", dados.tipoFaturamento)
      console.log("📅 Vencimentos:", {
        dataVencimento: dados.dataVencimento,
        faturaVencimento: dados.faturaVencimento,
        vencimentoFinal: vencimentoFatura
      })
      
      // Vincular cliente à administradora (já faz a integração Asaas se solicitado)
      console.log("📋 Vinculando cliente à administradora...")
      const clienteVinculado = await ClientesAdministradorasService.vincularCliente({
        administradora_id: dados.administradora,
        proposta_id: proposta.id,
        data_vencimento: dados.dataVencimento,
        data_vigencia: dados.dataVigencia,
        valor_mensal: dados.valorMensal,
        dia_vencimento: isRecorrente ? dados.assinaturaDiaVencimento : (dados.faturaDiaVencimento || 10),
        integrar_asaas: dados.integrarAsaas,
        // Se for fatura única, gerar fatura. Se for recorrente, criar assinatura. Se for "depois", não gerar nada
        gerar_fatura: isFaturaUnica && dados.integrarAsaas && !isGerarDepois,
        criar_assinatura: isRecorrente && dados.integrarAsaas && !isGerarDepois,
        // Campos da fatura única
        fatura_juros: isFaturaUnica ? dados.faturaJuros : undefined,
        fatura_multa: isFaturaUnica ? dados.faturaMulta : undefined,
        fatura_vencimento: isFaturaUnica ? vencimentoFatura : undefined,
        fatura_valor: isFaturaUnica ? dados.faturaValor : undefined,
        fatura_descricao: isFaturaUnica ? dados.faturaDescricao : undefined,
        // Campos da assinatura recorrente (a descrição será usada nas faturas geradas)
        assinatura_descricao: isRecorrente ? dados.assinaturaDescricao : undefined,
        assinatura_valor: isRecorrente ? dados.assinaturaValor : undefined,
        assinatura_juros: isRecorrente ? dados.assinaturaJuros : undefined,
        assinatura_multa: isRecorrente ? dados.assinaturaMulta : undefined,
      })
      
      console.log("✅ Cliente vinculado com sucesso!")
      console.log("📋 ID do cliente:", clienteVinculado.id)
      console.log("📋 ID da administradora:", dados.administradora)
      
      // Salvar IDs para redirecionamento
      setClienteId(clienteVinculado.id)
      setAdministradoraId(dados.administradora)
      
      // Mostrar tela de sucesso
      setSalvando(false)
      setSucesso(true)
      
      // Recarregar dados após um pequeno delay para garantir que o usuário veja a mensagem de sucesso
      // Não fechamos o modal automaticamente, deixamos o usuário escolher
    } catch (error: any) {
      console.error("❌ Erro ao finalizar cadastro:", error)
      toast.error(`Erro ao cadastrar: ${error.message}`)
      setSalvando(false)
      setSucesso(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-r from-[#168979] to-[#13786a] px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-xl font-bold text-white truncate">Completar Cadastro</h3>
                <p className="text-white/80 text-xs sm:text-sm truncate">Cliente: <strong>{proposta.nome}</strong></p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex-shrink-0 ml-2"
              disabled={salvando}
            >
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
          
          {/* Stepper Melhorado - Responsivo */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {etapas.map((etapa, index) => (
              <div key={etapa.numero} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-lg text-xs sm:text-sm ${
                      etapaAtual === etapa.numero
                        ? "bg-white text-[#168979] scale-110 ring-2 sm:ring-4 ring-white/30"
                        : etapaAtual > etapa.numero
                        ? "bg-white/90 text-[#168979]"
                        : "bg-white/30 text-white/70"
                    }`}
                  >
                    {etapaAtual > etapa.numero ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      etapa.numero
                    )}
                  </div>
                  <div className="text-center mt-1 sm:mt-2 hidden sm:block">
                    <p className={`text-[10px] sm:text-xs font-medium truncate w-full ${
                      etapaAtual === etapa.numero ? "text-white font-bold" : "text-white/70"
                    }`}>
                      {etapa.titulo}
                    </p>
                  </div>
                </div>
                {index < etapas.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-1 sm:mx-2 transition-all rounded ${
                      etapaAtual > etapa.numero ? "bg-white/50" : "bg-white/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="min-h-[400px]">
            {/* Tela de Loading */}
            {salvando && !sucesso && (
              <div className="flex flex-col items-center justify-center space-y-6 py-12">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-[#168979] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 bg-[#168979]/20 rounded-full animate-ping opacity-75" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Processando cadastro...
                  </h3>
                  <p className="text-gray-600">
                    Aguarde enquanto finalizamos o cadastro do cliente.
                  </p>
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <div className="h-2 w-2 bg-[#168979] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 bg-[#168979] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 bg-[#168979] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Tela de Sucesso */}
            {sucesso && clienteId && administradoraId && (
              <div className="flex flex-col items-center justify-center space-y-6 py-12">
                <div className="relative">
                  <div className="h-20 w-20 bg-[#168979]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-[#168979]" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <div className="h-6 w-6 bg-[#168979] rounded-full flex items-center justify-center animate-ping">
                      <div className="h-4 w-4 bg-[#168979] rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="text-center max-w-md">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Cadastro realizado com sucesso!
                  </h3>
                  <p className="text-gray-600 mb-1">
                    O cliente <strong>{proposta.nome}</strong> foi cadastrado com sucesso.
                  </p>
                  {dados.integrarAsaas && (
                    <p className="text-sm text-gray-500 mt-2">
                      {dados.tipoFaturamento === "unica" && "Fatura única gerada no Asaas."}
                      {dados.tipoFaturamento === "recorrente" && "Assinatura recorrente criada no Asaas."}
                      {dados.tipoFaturamento === "depois" && dados.integrarAsaas && "Cliente cadastrado no Asaas. Fatura será gerada posteriormente."}
                      {dados.tipoFaturamento === "depois" && !dados.integrarAsaas && "Cliente cadastrado. Fatura será gerada posteriormente."}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSuccess()
                      onClose()
                    }}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      onSuccess()
                      onClose()
                      // Redirecionar para a aba financeiro diretamente usando hash
                      router.push(`/admin/administradoras/${administradoraId}/clientes/${clienteId}?aba=financeiro`)
                      // Aguardar um pouco para garantir que a página carregou antes de rolar
                      setTimeout(() => {
                        const elemento = document.querySelector('[data-aba="financeiro"]')
                        if (elemento) {
                          elemento.scrollIntoView({ behavior: 'smooth' })
                        }
                      }, 500)
                    }}
                    className="flex-1 bg-gradient-to-r from-[#168979] to-[#13786a] hover:from-[#13786a] hover:to-[#0f6b5c] text-white font-bold"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Cliente
                  </Button>
                </div>
              </div>
            )}

            {/* Conteúdo do Wizard - Só mostra se não estiver salvando ou em sucesso */}
            {!salvando && !sucesso && (
              <>
            {/* Etapa 1: Dados Básicos */}
            {etapaAtual === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Building className="h-5 w-5 text-[#168979]" />
                    Dados Básicos
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Administradora <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={dados.administradora}
                        onValueChange={(value) => setDados({ ...dados, administradora: value })}
                      >
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base">
                          <SelectValue placeholder="Selecione uma administradora..." />
                        </SelectTrigger>
                        <SelectContent>
                          {administradoras.map((adm) => (
                            <SelectItem key={adm.id} value={adm.id}>
                              {adm.nome} - {adm.cnpj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Data de Vencimento <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={dados.dataVencimento}
                        onChange={(e) => setDados({ ...dados, dataVencimento: e.target.value })}
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                      {proposta.data_vencimento && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                          ℹ️ Data preenchida na proposta. Confirme ou ajuste se necessário.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Data de Vigência <span className="text-red-500">*</span>
                      </label>
                      {proposta.data_vigencia && (
                        <div className="mb-2 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                          ℹ️ Data preenchida na proposta. Confirme ou ajuste se necessário.
                        </div>
                      )}
                      <Input
                        type="date"
                        value={dados.dataVigencia}
                        onChange={(e) => setDados({ ...dados, dataVigencia: e.target.value })}
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Valor Mensal <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.valorMensal}
                        onChange={(e) => setDados({ ...dados, valorMensal: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          ⚠️ <strong>Lembrete:</strong> Não esqueça de incluir a Taxa Administrativa de <strong>R$ 5,00</strong> no valor mensal.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 2: Cadastro Asaas */}
            {etapaAtual === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <User className="h-5 w-5 text-[#168979]" />
                      Cadastro no Asaas
                    </h4>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={dados.integrarAsaas}
                        onCheckedChange={(checked) => setDados({ ...dados, integrarAsaas: checked as boolean })}
                      />
                      <label className="text-sm font-medium text-gray-900">Cadastrar no Asaas</label>
                    </div>
                  </div>

                  {dados.integrarAsaas && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Nome Completo <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={dados.clienteNome}
                          onChange={(e) => setDados({ ...dados, clienteNome: e.target.value })}
                          placeholder="Nome completo do cliente"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="email"
                          value={dados.clienteEmail}
                          onChange={(e) => setDados({ ...dados, clienteEmail: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Telefone
                        </label>
                        <Input
                          value={dados.clienteTelefone}
                          onChange={(e) => setDados({ ...dados, clienteTelefone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          CPF <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={dados.clienteCpf}
                          onChange={(e) => setDados({ ...dados, clienteCpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          CEP
                        </label>
                        <Input
                          value={dados.clienteCep}
                          onChange={(e) => setDados({ ...dados, clienteCep: e.target.value })}
                          placeholder="00000-000"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Endereço
                        </label>
                        <Input
                          value={dados.clienteEndereco}
                          onChange={(e) => setDados({ ...dados, clienteEndereco: e.target.value })}
                          placeholder="Rua, Avenida, etc"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Número
                        </label>
                        <Input
                          value={dados.clienteNumero}
                          onChange={(e) => setDados({ ...dados, clienteNumero: e.target.value })}
                          placeholder="123"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Bairro
                        </label>
                        <Input
                          value={dados.clienteBairro}
                          onChange={(e) => setDados({ ...dados, clienteBairro: e.target.value })}
                          placeholder="Bairro"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Cidade
                        </label>
                        <Input
                          value={dados.clienteCidade}
                          onChange={(e) => setDados({ ...dados, clienteCidade: e.target.value })}
                          placeholder="Cidade"
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Estado
                        </label>
                        <Input
                          value={dados.clienteEstado}
                          onChange={(e) => setDados({ ...dados, clienteEstado: e.target.value })}
                          placeholder="UF"
                          maxLength={2}
                          className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  )}

                  {!dados.integrarAsaas && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ O cliente não será cadastrado no Asaas. Você não poderá gerar faturas automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Etapa 3: Tipo de Faturamento */}
            {etapaAtual === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#168979]" />
                    Tipo de Faturamento
                  </h4>
                
                {!dados.integrarAsaas && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Para gerar faturas ou assinaturas, é necessário cadastrar o cliente no Asaas (etapa anterior).
                    </p>
                  </div>
                )}

                  <div className={`grid grid-cols-1 ${dados.integrarAsaas ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 sm:gap-6`}>
                      <button
                        type="button"
                        onClick={() => setDados({ ...dados, tipoFaturamento: "unica" })}
                        disabled={!dados.integrarAsaas}
                        className={`p-6 border-2 rounded-xl transition-all text-left shadow-sm ${
                          dados.tipoFaturamento === "unica"
                            ? "border-[#168979] bg-[#168979]/5 ring-2 ring-[#168979]/20"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                        } ${!dados.integrarAsaas ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${dados.tipoFaturamento === "unica" ? "bg-[#168979]/10" : "bg-gray-100"}`}>
                            <FileText className={`h-6 w-6 ${dados.tipoFaturamento === "unica" ? "text-[#168979]" : "text-gray-400"}`} />
                          </div>
                          <h4 className="font-bold text-lg text-gray-900">Fatura Única</h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Gere uma fatura única para o cliente. Ideal para pagamentos pontuais ou sem recorrência.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDados({ ...dados, tipoFaturamento: "recorrente" })}
                        disabled={!dados.integrarAsaas}
                        className={`p-6 border-2 rounded-xl transition-all text-left shadow-sm ${
                          dados.tipoFaturamento === "recorrente"
                            ? "border-[#168979] bg-[#168979]/5 ring-2 ring-[#168979]/20"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                        } ${!dados.integrarAsaas ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${dados.tipoFaturamento === "recorrente" ? "bg-[#168979]/10" : "bg-gray-100"}`}>
                            <RefreshCw className={`h-6 w-6 ${dados.tipoFaturamento === "recorrente" ? "text-[#168979]" : "text-gray-400"}`} />
                          </div>
                          <h4 className="font-bold text-lg text-gray-900">Recorrente</h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Crie uma assinatura que gera faturas automaticamente. A primeira fatura será criada automaticamente.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDados({ ...dados, tipoFaturamento: "depois" })}
                        className={`p-6 border-2 rounded-xl transition-all text-left shadow-sm ${
                          dados.tipoFaturamento === "depois"
                            ? "border-[#168979] bg-[#168979]/5 ring-2 ring-[#168979]/20"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${dados.tipoFaturamento === "depois" ? "bg-[#168979]/10" : "bg-gray-100"}`}>
                            <Clock className={`h-6 w-6 ${dados.tipoFaturamento === "depois" ? "text-[#168979]" : "text-gray-400"}`} />
                          </div>
                          <h4 className="font-bold text-lg text-gray-900">Gerar Fatura Depois</h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Cadastre o cliente no sistema e no Asaas, mas gere a fatura posteriormente. Ideal para quando ainda não há data definida.
                        </p>
                      </button>
                    </div>
                </div>
              </div>
            )}

            {/* Etapa 4: Configuração (Fatura Única ou Assinatura) */}
            {etapaAtual === 4 && dados.tipoFaturamento === "unica" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#168979]" />
                    Configuração da Fatura Única
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Descrição da Fatura <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={dados.faturaDescricao}
                        onChange={(e) => setDados({ ...dados, faturaDescricao: e.target.value })}
                        placeholder="Ex: Mensalidade Plano Saúde - Taxa Administrativa: 5,00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Data de Vencimento <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={dados.faturaVencimento || dados.dataVencimento}
                        onChange={(e) => setDados({ ...dados, faturaVencimento: e.target.value })}
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Valor <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.faturaValor}
                        onChange={(e) => setDados({ ...dados, faturaValor: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        ⚠️ Lembre-se de incluir a Taxa Administrativa de <strong>R$ 5,00</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Dia de Vencimento
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={dados.faturaDiaVencimento}
                        onChange={(e) => setDados({ ...dados, faturaDiaVencimento: parseInt(e.target.value) })}
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Juros (% ao mês)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.faturaJuros}
                        onChange={(e) => setDados({ ...dados, faturaJuros: parseFloat(e.target.value) })}
                        placeholder="2.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Multa (%)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.faturaMulta}
                        onChange={(e) => setDados({ ...dados, faturaMulta: parseFloat(e.target.value) })}
                        placeholder="2.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Desconto (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.faturaDesconto}
                        onChange={(e) => setDados({ ...dados, faturaDesconto: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Observações
                      </label>
                      <Textarea
                        value={dados.faturaObservacoes}
                        onChange={(e) => setDados({ ...dados, faturaObservacoes: e.target.value })}
                        placeholder="Observações adicionais para a fatura..."
                        rows={3}
                        className="border-2 border-gray-200 focus:border-[#168979] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 4: Configuração da Assinatura Recorrente */}
            {etapaAtual === 4 && dados.tipoFaturamento === "recorrente" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-[#168979]" />
                    Configuração da Assinatura Recorrente
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Descrição da Fatura (aparecerá no boleto) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={dados.assinaturaDescricao}
                        onChange={(e) => setDados({ ...dados, assinaturaDescricao: e.target.value })}
                        placeholder="Ex: Mensalidade Plano Saúde - Taxa Administrativa: 5,00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Esta descrição aparecerá em todas as faturas geradas pela assinatura
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Valor Mensal <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.assinaturaValor}
                        onChange={(e) => setDados({ ...dados, assinaturaValor: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        ⚠️ Lembre-se de incluir a Taxa Administrativa de <strong>R$ 5,00</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Dia de Vencimento <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={dados.assinaturaDiaVencimento}
                        onChange={(e) => setDados({ ...dados, assinaturaDiaVencimento: parseInt(e.target.value) })}
                        placeholder="10"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Ciclo de Cobrança
                      </label>
                      <Select
                        value={dados.assinaturaCiclo}
                        onValueChange={(value: any) => setDados({ ...dados, assinaturaCiclo: value })}
                      >
                        <SelectTrigger className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Mensal</SelectItem>
                          <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                          <SelectItem value="SEMIANNUALLY">Semestral</SelectItem>
                          <SelectItem value="YEARLY">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Juros (% ao mês)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.assinaturaJuros}
                        onChange={(e) => setDados({ ...dados, assinaturaJuros: parseFloat(e.target.value) })}
                        placeholder="2.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Multa (%)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dados.assinaturaMulta}
                        onChange={(e) => setDados({ ...dados, assinaturaMulta: parseFloat(e.target.value) })}
                        placeholder="2.00"
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Data de Início (opcional)
                      </label>
                      <Input
                        type="date"
                        value={dados.assinaturaDataInicio}
                        onChange={(e) => setDados({ ...dados, assinaturaDataInicio: e.target.value })}
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Data de Término (opcional)
                      </label>
                      <Input
                        type="date"
                        value={dados.assinaturaDataFim}
                        onChange={(e) => setDados({ ...dados, assinaturaDataFim: e.target.value })}
                        className="h-11 sm:h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ A assinatura criará automaticamente a primeira fatura na data de vencimento escolhida.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 5: Confirmação */}
            {etapaAtual === 5 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#168979]" />
                    Revisão e Confirmação
                  </h4>

                  {/* Resumo Dados Básicos */}
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#168979]/10 rounded-lg">
                        <Building className="h-5 w-5 text-[#168979]" />
                      </div>
                      <h4 className="font-bold text-gray-900">Dados Básicos</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">Administradora</div>
                        <div className="text-gray-900 font-medium">
                          {administradoras.find(a => a.id === dados.administradora)?.nome}
                        </div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">Valor Mensal</div>
                        <div className="text-gray-900 font-medium">R$ {dados.valorMensal.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">Data Vencimento</div>
                        <div className="text-gray-900 font-medium">
                          {new Date(dados.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">Data Vigência</div>
                        <div className="text-gray-900 font-medium">
                          {new Date(dados.dataVigencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Asaas */}
                  {dados.integrarAsaas && (
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-blue-900">Cadastro no Asaas</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-blue-800 mb-1">Cliente</div>
                          <div className="text-blue-900">{dados.clienteNome}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-blue-800 mb-1">Email</div>
                          <div className="text-blue-900">{dados.clienteEmail}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-blue-800 mb-1">CPF</div>
                          <div className="text-blue-900">{dados.clienteCpf}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resumo Fatura */}
                  {dados.tipoFaturamento === "unica" && dados.integrarAsaas && (
                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <h4 className="font-bold text-green-900">Fatura Única</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-green-800 mb-1">Descrição</div>
                          <div className="text-green-900">{dados.faturaDescricao}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-green-800 mb-1">Valor</div>
                          <div className="text-green-900">R$ {dados.faturaValor.toFixed(2)}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-green-800 mb-1">Vencimento</div>
                          <div className="text-green-900">{new Date((dados.faturaVencimento || dados.dataVencimento) + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-green-800 mb-1">Juros / Multa</div>
                          <div className="text-green-900">{dados.faturaJuros}% / {dados.faturaMulta}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resumo Assinatura */}
                  {dados.tipoFaturamento === "recorrente" && dados.integrarAsaas && (
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <RefreshCw className="h-5 w-5 text-purple-600" />
                        </div>
                        <h4 className="font-bold text-purple-900">Assinatura Recorrente</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-purple-800 mb-1">Descrição</div>
                          <div className="text-purple-900">{dados.assinaturaDescricao}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-purple-800 mb-1">Valor Mensal</div>
                          <div className="text-purple-900">R$ {dados.assinaturaValor.toFixed(2)}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-purple-800 mb-1">Dia Vencimento</div>
                          <div className="text-purple-900">{dados.assinaturaDiaVencimento}</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="font-semibold text-purple-800 mb-1">Ciclo</div>
                          <div className="text-purple-900">{
                            dados.assinaturaCiclo === 'MONTHLY' ? 'Mensal' :
                            dados.assinaturaCiclo === 'QUARTERLY' ? 'Trimestral' :
                            dados.assinaturaCiclo === 'SEMIANNUALLY' ? 'Semestral' : 'Anual'
                          }</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resumo Gerar Depois */}
                  {dados.tipoFaturamento === "depois" && (
                    <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <h4 className="font-bold text-amber-900">Fatura Será Gerada Depois</h4>
                      </div>
                      <div className="space-y-2 text-sm text-amber-800">
                        <p>O cliente será cadastrado no sistema{dados.integrarAsaas && " e no Asaas"}, mas a fatura será gerada posteriormente.</p>
                        <p className="mt-2 font-semibold">Você poderá gerar a fatura a qualquer momento na página do cliente.</p>
                      </div>
                    </div>
                  )}

                  <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-amber-900 mb-2">
                          ⚠️ Atenção!
                        </h4>
                        <p className="text-sm text-amber-800">
                          Ao confirmar, o cliente será vinculado à administradora e todas as ações selecionadas serão executadas. Esta ação não pode ser desfeita.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        </div>

        {/* Footer - Só mostra se não estiver salvando ou em sucesso */}
        {!salvando && !sucesso && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between items-stretch sm:items-center">
            <Button
              variant="outline"
              onClick={etapaAtual === 1 ? onClose : etapaAnterior}
              disabled={salvando}
              className="w-full sm:w-auto h-11 sm:h-12 px-4 sm:px-6 border-2 border-gray-300 hover:border-gray-400 text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {etapaAtual === 1 ? "Cancelar" : "Voltar"}
            </Button>

            <div className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left order-first sm:order-none">
              Etapa {etapaAtual} de {etapas.length}
            </div>

            {etapaAtual < 5 ? (
              <Button
                onClick={proximaEtapa}
                disabled={!podeAvancar() || salvando}
                className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 bg-gradient-to-r from-[#168979] to-[#13786a] hover:from-[#13786a] hover:to-[#0f6b5c] text-white font-bold shadow-lg text-sm sm:text-base"
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={finalizarCadastro}
                disabled={salvando}
                className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 bg-gradient-to-r from-[#168979] to-[#13786a] hover:from-[#13786a] hover:to-[#0f6b5c] text-white font-bold shadow-lg text-sm sm:text-base"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Finalizar Cadastro
              </Button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

