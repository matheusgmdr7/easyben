"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ClientesAdministradorasService, type ClienteAdministradoraCompleto } from "@/services/clientes-administradoras-service"
import { FaturasService, type Fatura } from "@/services/faturas-service"
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  Wallet,
  RefreshCw,
  Edit,
  Save,
  X,
  CreditCard as CardIcon,
  ArrowRight,
  Ban,
  Building
} from "lucide-react"

export default function ClienteDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const administradoraId = params.id as string
  const clienteId = params.clienteId as string

  const [cliente, setCliente] = useState<ClienteAdministradoraCompleto | null>(null)
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFaturas, setLoadingFaturas] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState("dados")
  const [editandoImplantacao, setEditandoImplantacao] = useState(false)
  const [salvandoImplantacao, setSalvandoImplantacao] = useState(false)
  const [numeroCarteirinha, setNumeroCarteirinha] = useState("")
  const [implantado, setImplantado] = useState(false)
  const [showModalTransferir, setShowModalTransferir] = useState(false)
  const [showModalCancelar, setShowModalCancelar] = useState(false)
  const [administradoras, setAdministradoras] = useState<Administradora[]>([])
  const [novaAdministradoraId, setNovaAdministradoraId] = useState("")
  const [transferindo, setTransferindo] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  
  // Verificar se há parâmetro na URL para abrir na aba financeiro
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('aba') === 'financeiro') {
        setAbaAtiva('financeiro')
      }
    }
  }, [])

  async function carregarCliente() {
    if (!clienteId) {
      console.log("⚠️ ClienteId não disponível")
      return
    }

    try {
      setLoading(true)
      console.log("📋 Buscando cliente com ID:", clienteId)
      const clienteData = await ClientesAdministradorasService.buscarPorId(clienteId)
      
      if (clienteData) {
        console.log("✅ Cliente encontrado:", clienteData.cliente_nome)
        setCliente(clienteData)
        // Inicializar estados de implantação
        setNumeroCarteirinha(clienteData.numero_carteirinha || "")
        setImplantado(clienteData.implantado ?? false)
      } else {
        console.log("⚠️ Cliente não encontrado")
        toast.error("Cliente não encontrado")
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar cliente:", error)
      toast.error("Erro ao carregar dados do cliente")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clienteId) {
      console.log("📋 Carregando cliente com ID:", clienteId)
      carregarCliente()
    }
  }, [clienteId])

  useEffect(() => {
    carregarAdministradoras()
  }, [])

  async function carregarAdministradoras() {
    try {
      const admList = await AdministradorasService.buscarTodas({ status: "ativa" })
      setAdministradoras(admList)
    } catch (error) {
      console.error("❌ Erro ao carregar administradoras:", error)
    }
  }

  // Carregar faturas quando cliente estiver disponível e aba for financeiro
  useEffect(() => {
    if (cliente && abaAtiva === "financeiro") {
      console.log("🔄 Aba financeiro ativa, carregando faturas para cliente:", cliente.id)
      carregarFaturas()
    }
  }, [cliente?.id, abaAtiva])
  
  // Carregar faturas quando o cliente for carregado pela primeira vez (se já estiver na aba financeiro)
  useEffect(() => {
    if (cliente && abaAtiva === "financeiro" && faturas.length === 0 && !loadingFaturas) {
      console.log("🔄 Cliente carregado e aba financeiro ativa, carregando faturas...")
      carregarFaturas()
    }
  }, [cliente?.id])

  async function atualizarFinanceiro() {
    if (!cliente) {
      toast.error("Cliente não disponível")
      return
    }

    if (!administradoraId) {
      toast.error("ID da administradora não encontrado")
      return
    }

    try {
      setLoadingFaturas(true)
      console.log("🔄 Atualizando dados financeiros para cliente:", cliente.id)
      console.log("🔄 Administradora ID:", administradoraId)
      console.log("📋 Dados completos do cliente:", {
        id: cliente.id,
        proposta_id: cliente.proposta_id,
        administradora_id: cliente.administradora_id,
        cliente_nome: cliente.cliente_nome
      })
      
      const payload = {
        cliente_administradora_id: cliente.id,
        administradora_id: administradoraId
      }
      
      console.log("📤 Enviando payload:", payload)
      
      // 1. Primeiro, recuperar faturas do Asaas
      const response = await fetch('/api/admin/recuperar-fatura-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log("📥 Response status:", response.status)
      console.log("📥 Response ok:", response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erro na resposta:", errorText)
        // Não bloquear o processo se houver erro na recuperação
        toast.warning("Aviso: Erro ao recuperar do Asaas, mas continuando atualização...")
      } else {
        const resultado = await response.json()
        
        console.log("📥 Resultado completo da recuperação:", resultado)

        if (resultado.sucesso || resultado.sucesso_parcial) {
          const faturasNovas = resultado.faturas_salvas || 0
          const faturasExistentes = resultado.faturas_existentes || 0
          
          let mensagem = ""
          if (faturasNovas > 0 && faturasExistentes > 0) {
            mensagem = `✅ ${faturasNovas} fatura(s) recuperada(s) e ${faturasExistentes} já existiam no banco!`
          } else if (faturasNovas > 0) {
            mensagem = `✅ ${faturasNovas} fatura(s) recuperada(s) do Asaas!`
          } else if (faturasExistentes > 0) {
            mensagem = `ℹ️ ${faturasExistentes} fatura(s) já existiam no banco.`
          }
          
          if (mensagem) {
            if (resultado.sucesso_parcial && resultado.erros?.length > 0) {
              mensagem += ` (Avisos: ${resultado.erros.length})`
              toast.warning(mensagem)
            } else {
              toast.success(mensagem)
            }
          }
          
          console.log("✅ Faturas recuperadas:", resultado)
        }
      }

      // 2. Recarregar dados do cliente (atualiza os cards de resumo: Total, Pagas, Atrasadas)
      console.log("🔄 Recarregando dados do cliente para atualizar cards...")
      await carregarCliente()

      // 3. Recarregar lista de faturas
      console.log("🔄 Recarregando lista de faturas...")
      await carregarFaturas()

      toast.success("✅ Dados financeiros atualizados com sucesso!")
    } catch (error: any) {
      console.error("❌ Erro ao atualizar dados financeiros:", error)
      toast.error("Erro ao atualizar dados financeiros")
    } finally {
      setLoadingFaturas(false)
    }
  }

  async function carregarFaturas() {
    if (!cliente) {
      console.log("⚠️ Cliente não disponível, pulando carregamento de faturas")
      return
    }
    
    try {
      setLoadingFaturas(true)
      console.log("📋 ========== INICIANDO BUSCA DE FATURAS ==========")
      console.log("📋 Cliente ID (cliente_administradora_id):", cliente.id)
      console.log("📋 Cliente nome:", cliente.cliente_nome)
      console.log("📋 Cliente email:", cliente.cliente_email)
      console.log("📋 Cliente CPF:", cliente.cliente_cpf)
      
      // Usar o ID da tabela clientes_administradoras, não o ID da proposta
      const faturasData = await FaturasService.buscarPorCliente(cliente.id)
      
      console.log("✅ Total de faturas encontradas:", faturasData.length)
      
      if (faturasData.length > 0) {
        console.log("📊 ========== DETALHES DAS FATURAS ==========")
        faturasData.forEach((fatura, index) => {
          console.log(`   📄 Fatura ${index + 1}:`, {
            id: fatura.id,
            numero: fatura.numero_fatura,
            valor: fatura.valor || fatura.valor_total,
            vencimento: fatura.vencimento || fatura.data_vencimento,
            status: fatura.status,
            asaas_charge_id: fatura.asaas_charge_id,
            cliente_administradora_id: fatura.cliente_administradora_id,
            cliente_administradora_id_match: fatura.cliente_administradora_id === cliente.id ? "✅ CORRETO" : "❌ DIFERENTE",
            created_at: fatura.created_at
          })
        })
        console.log("📊 ============================================")
      } else {
        console.log("⚠️ ========== NENHUMA FATURA ENCONTRADA ==========")
        console.log("⚠️ Isso pode indicar que:")
        console.log("   1. A fatura não foi salva no banco")
        console.log("   2. O cliente_administradora_id está incorreto na fatura")
        console.log("   3. A fatura foi criada com um ID diferente")
        console.log("⚠️ Verifique o banco de dados com a query SQL fornecida")
        console.log("⚠️ ============================================")
      }
      
      setFaturas(faturasData)
    } catch (error: any) {
      console.error("❌ ========== ERRO AO CARREGAR FATURAS ==========")
      console.error("❌ Erro completo:", error)
      console.error("❌ Mensagem:", error?.message)
      console.error("❌ Stack:", error?.stack)
      console.error("❌ ============================================")
      toast.error("Erro ao carregar faturas do cliente")
    } finally {
      setLoadingFaturas(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const badges = {
      ativo: { bg: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle },
      aguardando_implantacao: { bg: "bg-blue-50 text-blue-700 border border-blue-200", icon: Clock },
      suspenso: { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", icon: AlertCircle },
      cancelado: { bg: "bg-red-50 text-red-700 border border-red-200", icon: XCircle },
      inadimplente: { bg: "bg-orange-50 text-orange-700 border border-orange-200", icon: Clock },
      // Status das faturas
      pendente: { bg: "bg-yellow-100 text-yellow-800", icon: Clock },
      paga: { bg: "bg-green-100 text-green-800", icon: CheckCircle },
      pago: { bg: "bg-green-100 text-green-800", icon: CheckCircle },
      atrasada: { bg: "bg-red-100 text-red-800", icon: AlertCircle },
      cancelada: { bg: "bg-gray-100 text-gray-800", icon: XCircle },
    }
    
    return badges[status as keyof typeof badges] || badges.ativo
  }

  const getStatusBadge = (cliente: ClienteAdministradoraCompleto | string) => {
    // Se receber um objeto cliente, usar lógica de implantação
    if (typeof cliente === 'object' && cliente !== null) {
      // Priorizar status de implantação sobre status geral
      if (cliente.implantado === true) {
        return (
          <Badge className="bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Implantado
          </Badge>
        )
      } else if (cliente.implantado === false) {
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Aguardando Implantação
          </Badge>
        )
      }
      
      // Fallback para status tradicionais
      const badge = getStatusInfo(cliente.status)
      const Icon = badge.icon
      
      return (
        <Badge className={`${badge.bg} flex items-center gap-1`}>
          <Icon className="h-3 w-3" />
          {cliente.status}
        </Badge>
      )
    }
    
    // Se receber apenas string (status), usar lógica antiga
    const badge = getStatusInfo(cliente)
    const Icon = badge.icon
    
    return (
      <Badge className={`${badge.bg} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {cliente}
      </Badge>
    )
  }

  const formatarData = (data: string) => {
    if (!data) return "N/A"
    
    try {
      // Se a data está no formato YYYY-MM-DD, vamos tratá-la como data local
      // para evitar problemas de fuso horário
      if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}/)) {
        const dataLimpa = data.split('T')[0] // Remove hora se houver
        const [ano, mes, dia] = dataLimpa.split('-')
        const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
        return dataObj.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit", 
          year: "numeric",
        })
      }

      // Para outros formatos, tentar parse normal
      const dataObj = new Date(data)
      if (isNaN(dataObj.getTime())) {
        return "Data inválida"
      }

      return dataObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      return "Erro na data"
    }
  }

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  async function salvarImplantacao() {
    if (!cliente) return

    try {
      setSalvandoImplantacao(true)
      await ClientesAdministradorasService.atualizar(cliente.id, {
        numero_carteirinha: numeroCarteirinha || undefined,
        implantado: implantado
      })
      
      // Recarregar dados do cliente
      await carregarCliente()
      setEditandoImplantacao(false)
      toast.success("Informações de implantação salvas com sucesso!")
    } catch (error: any) {
      console.error("❌ Erro ao salvar implantação:", error)
      toast.error("Erro ao salvar informações de implantação")
    } finally {
      setSalvandoImplantacao(false)
    }
  }

  function cancelarEdicaoImplantacao() {
    if (cliente) {
      setNumeroCarteirinha(cliente.numero_carteirinha || "")
      setImplantado(cliente.implantado ?? false)
    }
    setEditandoImplantacao(false)
  }

  async function transferirCliente() {
    if (!cliente || !novaAdministradoraId) {
      toast.error("Selecione uma administradora para transferir o cliente")
      return
    }

    if (novaAdministradoraId === administradoraId) {
      toast.error("O cliente já está vinculado a esta administradora")
      return
    }

    try {
      setTransferindo(true)
      await ClientesAdministradorasService.transferirCliente(cliente.id, novaAdministradoraId)
      toast.success("Cliente transferido com sucesso!")
      setShowModalTransferir(false)
      setNovaAdministradoraId("")
      // Redirecionar para a nova administradora
      router.push(`/admin/administradoras/${novaAdministradoraId}/clientes/${cliente.id}`)
    } catch (error: any) {
      console.error("❌ Erro ao transferir cliente:", error)
      toast.error(error.message || "Erro ao transferir cliente")
    } finally {
      setTransferindo(false)
    }
  }

  async function cancelarCliente() {
    if (!cliente) return

    try {
      setCancelando(true)
      await ClientesAdministradorasService.cancelarVinculo(cliente.id)
      toast.success("Cliente cancelado com sucesso!")
      setShowModalCancelar(false)
      // Recarregar dados do cliente
      await carregarCliente()
      // Voltar para lista de clientes
      router.push(`/admin/administradoras/${administradoraId}`)
    } catch (error: any) {
      console.error("❌ Erro ao cancelar cliente:", error)
      toast.error(error.message || "Erro ao cancelar cliente")
    } finally {
      setCancelando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando dados do cliente...</span>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cliente não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/administradoras/${administradoraId}`)}
              className="flex items-center gap-2 border-gray-300 hover:border-gray-400 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{cliente.cliente_nome}</h1>
              <p className="text-sm sm:text-base text-gray-600">Detalhes do cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
            {getStatusBadge(cliente)}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModalTransferir(true)}
                className="border-[#168979] text-[#168979] hover:bg-[#168979] hover:text-white"
                disabled={cliente.status === "cancelado"}
              >
                <ArrowRight className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Transferir</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowModalCancelar(true)}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
                disabled={cliente.status === "cancelado"}
              >
                <Ban className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Transferir Cliente */}
      <Dialog open={showModalTransferir} onOpenChange={setShowModalTransferir}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ArrowRight className="h-5 w-5 text-[#168979]" />
              Transferir Cliente
            </DialogTitle>
            <DialogDescription>
              Selecione a administradora para a qual deseja transferir o cliente <strong>{cliente?.cliente_nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administradora Atual
              </label>
              <Input
                value={cliente?.administradora_nome || "N/A"}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Administradora <span className="text-red-500">*</span>
              </label>
              <Select
                value={novaAdministradoraId}
                onValueChange={setNovaAdministradoraId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a administradora" />
                </SelectTrigger>
                <SelectContent>
                  {administradoras
                    .filter(adm => adm.id !== administradoraId)
                    .map((adm) => (
                      <SelectItem key={adm.id} value={adm.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {adm.nome}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Atenção:</strong> Ao transferir o cliente, todas as faturas também serão transferidas para a nova administradora.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowModalTransferir(false)
                setNovaAdministradoraId("")
              }}
              disabled={transferindo}
            >
              Cancelar
            </Button>
            <Button
              onClick={transferirCliente}
              disabled={!novaAdministradoraId || transferindo}
              className="bg-[#168979] hover:bg-[#13786a] text-white"
            >
              {transferindo ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transferir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Cancelar Cliente */}
      <Dialog open={showModalCancelar} onOpenChange={setShowModalCancelar}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-red-600">
              <Ban className="h-5 w-5" />
              Cancelar Cliente
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar o cliente <strong>{cliente?.cliente_nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                Esta ação irá:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>Alterar o status do cliente para "Cancelado"</li>
                <li>Registrar a data de cancelamento</li>
                <li>Manter o histórico de faturas e dados</li>
              </ul>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Atenção:</strong> Esta ação não pode ser desfeita facilmente. O cliente não poderá mais ser gerenciado normalmente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModalCancelar(false)}
              disabled={cancelando}
            >
              Não, manter cliente
            </Button>
            <Button
              onClick={cancelarCliente}
              disabled={cancelando}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Sim, cancelar cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4 sm:space-y-6">
        <TabsList className="inline-flex h-auto w-full bg-transparent p-0 gap-0 sm:gap-1">
          <TabsTrigger 
            value="dados" 
            className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-transparent data-[state=active]:text-[#168979] data-[state=active]:border-b-2 data-[state=active]:border-[#168979] rounded-none"
          >
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger 
            value="contrato" 
            className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-transparent data-[state=active]:text-[#168979] data-[state=active]:border-b-2 data-[state=active]:border-[#168979] rounded-none"
          >
            Contrato
          </TabsTrigger>
          <TabsTrigger 
            value="financeiro" 
            data-aba="financeiro"
            className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-transparent data-[state=active]:text-[#168979] data-[state=active]:border-b-2 data-[state=active]:border-[#168979] rounded-none"
          >
            Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4 sm:space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Dados Pessoais */}
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 opacity-60" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Nome Completo
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">{cliente.cliente_nome}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Email
                  </label>
                  <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {cliente.cliente_email}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Telefone
                  </label>
                  <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {cliente.cliente_telefone}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    CPF
                  </label>
                  <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    {cliente.cliente_cpf}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Plano */}
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 opacity-60" />
                  Plano Contratado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Produto
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">{cliente.produto_nome}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Plano
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">{cliente.plano_nome || "Não informado"}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Cobertura
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">{cliente.cobertura}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Acomodação
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">{cliente.acomodacao}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contrato" className="space-y-4 sm:space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Dados do Contrato */}
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 opacity-60" />
                  Dados do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Número do Contrato
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">{cliente.numero_contrato || "Não informado"}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Data de Vinculação
                  </label>
                  <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatarData(cliente.data_vinculacao)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Data de Vencimento
                  </label>
                  <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatarData(cliente.data_vencimento)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Data de Vigência
                  </label>
                  <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatarData(cliente.data_vigencia)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Dia de Vencimento
                  </label>
                  <p className="text-sm sm:text-base text-gray-700">Dia {cliente.dia_vencimento}</p>
                </div>
              </CardContent>
            </Card>

            {/* Valores */}
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 opacity-60" />
                  Valores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                    Valor Mensal
                  </label>
                  <p className="text-2xl sm:text-3xl font-bold text-[#168979]">{formatarValor(cliente.valor_mensal)}</p>
                </div>
                {cliente.observacoes && (
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                      Observações
                    </label>
                    <p className="text-sm sm:text-base text-gray-700">{cliente.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Implantação */}
            <Card className="border-2 border-gray-200 shadow-sm lg:col-span-2">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
                    <CardIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 opacity-60" />
                    Implantação do Plano
                  </CardTitle>
                  {!editandoImplantacao && (
                    <Button
                      onClick={() => setEditandoImplantacao(true)}
                      variant="outline"
                      size="sm"
                      className="border-[#168979] text-[#168979] hover:bg-[#168979] hover:text-white"
                    >
                      <Edit className="h-4 w-4 mr-1.5" />
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6 space-y-4">
                {editandoImplantacao ? (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                        Status de Implantação
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="implantado"
                            checked={implantado === true}
                            onChange={() => setImplantado(true)}
                            className="h-4 w-4 text-[#168979] focus:ring-[#168979]"
                          />
                          <span className="text-sm sm:text-base text-gray-700">Implantado</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="implantado"
                            checked={implantado === false}
                            onChange={() => setImplantado(false)}
                            className="h-4 w-4 text-[#168979] focus:ring-[#168979]"
                          />
                          <span className="text-sm sm:text-base text-gray-700">Aguardando Implantação</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                        Número da Carteirinha
                      </label>
                      <Input
                        type="text"
                        value={numeroCarteirinha}
                        onChange={(e) => setNumeroCarteirinha(e.target.value)}
                        placeholder="Digite o número da carteirinha"
                        className="h-10 sm:h-11 border-2 border-gray-300 focus:border-[#168979] rounded-lg text-sm sm:text-base"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={salvarImplantacao}
                        disabled={salvandoImplantacao}
                        className="bg-[#168979] hover:bg-[#13786a] text-white flex-1"
                        size="sm"
                      >
                        {salvandoImplantacao ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1.5" />
                            Salvar
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={cancelarEdicaoImplantacao}
                        variant="outline"
                        disabled={salvandoImplantacao}
                        className="flex-1 border-gray-300"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                        Status de Implantação
                      </label>
                      <div className="flex items-center gap-2">
                        {cliente.implantado ? (
                          <Badge className="bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Implantado
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aguardando Implantação
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                        Número da Carteirinha
                      </label>
                      <p className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
                        <CardIcon className="h-4 w-4 text-gray-400" />
                        {cliente.numero_carteirinha || "Não informado"}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 sm:space-y-6 mt-0">
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-gray-900">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 opacity-60" />
                  Financeiro
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={atualizarFinanceiro}
                    variant="outline"
                    size="sm"
                    disabled={loadingFaturas}
                    className="flex items-center gap-2 border-[#168979] text-[#168979] hover:bg-[#168979] hover:text-white flex-1 sm:flex-none"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingFaturas ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button
                    onClick={() => router.push(`/admin/administradoras/${administradoraId}/clientes/${clienteId}/faturas`)}
                    className="flex items-center gap-2 bg-[#168979] hover:bg-[#13786a] text-white flex-1 sm:flex-none"
                    size="sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Gerenciar Faturas</span>
                    <span className="sm:hidden">Gerenciar</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-blue-700 font-semibold uppercase tracking-wide mb-1.5 sm:mb-2">Total de Faturas</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700">{cliente.total_faturas || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-green-700 font-semibold uppercase tracking-wide mb-1.5 sm:mb-2">Faturas Pagas</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700">{cliente.faturas_pagas || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-red-700 font-semibold uppercase tracking-wide mb-1.5 sm:mb-2">Faturas Atrasadas</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-700">{cliente.faturas_atrasadas || 0}</p>
                </div>
              </div>
              
              {loadingFaturas ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando faturas...</p>
                </div>
              ) : faturas.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma fatura encontrada</p>
                  <p className="text-sm text-gray-500">Este cliente ainda não possui faturas</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {faturas.map((fatura) => {
                    const StatusInfo = getStatusInfo(fatura.status)
                    const Icon = StatusInfo.icon
                    return (
                      <div key={fatura.id} className="border-2 border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all bg-white">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              <span className="font-semibold text-sm sm:text-base text-gray-900">#{fatura.numero_fatura || fatura.id.slice(0, 8)}</span>
                            </div>
                            <Badge className={`${StatusInfo.bg} flex items-center gap-1 text-xs`}>
                              <Icon className="h-3 w-3" />
                              {fatura.status}
                            </Badge>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="font-bold text-lg sm:text-xl text-gray-900">
                              {formatarValor(fatura.valor || 0)}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 sm:justify-end mt-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              Vence em {formatarData(fatura.vencimento)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Emissão: {new Date(fatura.created_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {(fatura.asaas_boleto_url || fatura.boleto_url || fatura.asaas_invoice_url) && (
                              <Button
                                onClick={() => window.open(fatura.asaas_boleto_url || fatura.boleto_url || fatura.asaas_invoice_url, "_blank")}
                                size="sm"
                                className="bg-[#168979] hover:bg-[#13786a] text-white w-full sm:w-auto"
                              >
                                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                                {fatura.asaas_boleto_url ? "Boleto" : "Fatura"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}