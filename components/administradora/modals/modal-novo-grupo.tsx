"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { XCircle, Users, CreditCard, Building2, Settings } from "lucide-react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"
import { toast } from "sonner"
import {
  GruposBeneficiariosService,
  ConfiguracaoFaturamentoService,
  ContasCedentesService,
  type GrupoBeneficiarios,
  type ConfiguracaoFaturamento,
  type ContaCedente,
} from "@/services/grupos-beneficiarios-service"

interface ModalNovoGrupoProps {
  open: boolean
  onClose: () => void
  administradoraId: string
  grupoEditando?: GrupoBeneficiarios | null
}

export default function ModalNovoGrupo({
  open,
  onClose,
  administradoraId,
  grupoEditando,
}: ModalNovoGrupoProps) {
  useModalOverlay(open)

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("grupo")
  /** Na aba Grupo: "agora" = escolher/criar config e seguir para as abas; "depois" = pular. */
  const [faturamentoAgoraOuDepois, setFaturamentoAgoraOuDepois] = useState<"agora" | "depois">("depois")

  // Dados do grupo
  const [nomeGrupo, setNomeGrupo] = useState("")
  const [descricaoGrupo, setDescricaoGrupo] = useState("")
  const [configuracaoFaturamentoId, setConfiguracaoFaturamentoId] = useState<string>("")

  // Listas
  const [configuracoesFaturamento, setConfiguracoesFaturamento] = useState<ConfiguracaoFaturamento[]>([])
  const [contasCedentes, setContasCedentes] = useState<ContaCedente[]>([])

  // Dados para nova configuração de faturamento
  const [novaConfigNome, setNovaConfigNome] = useState("")
  const [tipoFaturamento, setTipoFaturamento] = useState<"asaas" | "banco" | "manual">("asaas")
  const [asaasApiKey, setAsaasApiKey] = useState("")
  const [asaasAmbiente, setAsaasAmbiente] = useState<"producao" | "sandbox">("producao")
  const [contaCedenteId, setContaCedenteId] = useState<string>("")
  const [bancoCodigo, setBancoCodigo] = useState("")
  const [bancoNome, setBancoNome] = useState("")
  const [diasVencimento, setDiasVencimento] = useState("30")
  const [instrucoesBoleto, setInstrucoesBoleto] = useState("")

  // Dados para nova conta cedente
  const [novaContaNome, setNovaContaNome] = useState("")
  const [novaContaBanco, setNovaContaBanco] = useState("")
  const [novaContaAgencia, setNovaContaAgencia] = useState("")
  const [novaContaConta, setNovaContaConta] = useState("")
  const [novaContaTipo, setNovaContaTipo] = useState<"corrente" | "poupanca">("corrente")
  const [novaContaCpfCnpj, setNovaContaCpfCnpj] = useState("")
  const [novaContaNomeTitular, setNovaContaNomeTitular] = useState("")
  const [novaContaCodigoCedente, setNovaContaCodigoCedente] = useState("")
  const [novaContaCarteira, setNovaContaCarteira] = useState("")
  const [novaContaConvenio, setNovaContaConvenio] = useState("")

  useEffect(() => {
    if (open) {
      carregarDados()
      if (grupoEditando) {
        setNomeGrupo(grupoEditando.nome)
        setDescricaoGrupo(grupoEditando.descricao || "")
        setConfiguracaoFaturamentoId(grupoEditando.configuracao_faturamento_id || "")
        setFaturamentoAgoraOuDepois(grupoEditando.configuracao_faturamento_id ? "agora" : "depois")
      } else {
        limparFormulario()
      }
    }
  }, [open, grupoEditando])

  async function carregarDados() {
    try {
      const [configs, contas] = await Promise.all([
        ConfiguracaoFaturamentoService.buscarTodas(),
        ContasCedentesService.buscarTodas(administradoraId),
      ])
      setConfiguracoesFaturamento(configs)
      setContasCedentes(contas)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar configurações")
    }
  }

  function limparFormulario() {
    setNomeGrupo("")
    setDescricaoGrupo("")
    setConfiguracaoFaturamentoId("")
    setFaturamentoAgoraOuDepois("depois")
    setNovaConfigNome("")
    setTipoFaturamento("asaas")
    setAsaasApiKey("")
    setAsaasAmbiente("producao")
    setContaCedenteId("")
    setBancoCodigo("")
    setBancoNome("")
    setDiasVencimento("30")
    setInstrucoesBoleto("")
    setNovaContaNome("")
    setNovaContaBanco("")
    setNovaContaAgencia("")
    setNovaContaConta("")
    setNovaContaTipo("corrente")
    setNovaContaCpfCnpj("")
    setNovaContaNomeTitular("")
    setNovaContaCodigoCedente("")
    setNovaContaCarteira("")
    setNovaContaConvenio("")
    setActiveTab("grupo")
  }

  async function handleCriarContaCedente() {
    if (!novaContaNome || !novaContaBanco || !novaContaAgencia || !novaContaConta || !novaContaNomeTitular) {
      toast.error("Preencha todos os campos obrigatórios da conta cedente")
      return
    }

    try {
      const conta = await ContasCedentesService.criar(administradoraId, {
        nome: novaContaNome,
        banco: novaContaBanco,
        agencia: novaContaAgencia,
        conta: novaContaConta,
        tipo_conta: novaContaTipo,
        cpf_cnpj: novaContaCpfCnpj || undefined,
        nome_titular: novaContaNomeTitular,
        codigo_cedente: novaContaCodigoCedente || undefined,
        carteira: novaContaCarteira || undefined,
        convenio: novaContaConvenio || undefined,
      })

      toast.success("Conta cedente criada com sucesso!")
      await carregarDados()
      setContaCedenteId(conta.id)
      
      // Limpar formulário da conta
      setNovaContaNome("")
      setNovaContaBanco("")
      setNovaContaAgencia("")
      setNovaContaConta("")
      setNovaContaTipo("corrente")
      setNovaContaCpfCnpj("")
      setNovaContaNomeTitular("")
      setNovaContaCodigoCedente("")
      setNovaContaCarteira("")
      setNovaContaConvenio("")
    } catch (error: any) {
      console.error("Erro ao criar conta cedente:", error)
      toast.error("Erro ao criar conta cedente: " + error.message)
    }
  }

  async function handleCriarConfiguracaoFaturamento() {
    if (!novaConfigNome || !tipoFaturamento) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    if (tipoFaturamento === "asaas" && !asaasApiKey) {
      toast.error("Informe a API Key do Asaas")
      return
    }

    if (tipoFaturamento === "banco" && !contaCedenteId) {
      toast.error("Selecione uma conta cedente")
      return
    }

    try {
      const config = await ConfiguracaoFaturamentoService.criar({
        nome: novaConfigNome,
        tipo_faturamento: tipoFaturamento,
        asaas_api_key: tipoFaturamento === "asaas" ? asaasApiKey : undefined,
        asaas_ambiente: tipoFaturamento === "asaas" ? asaasAmbiente : undefined,
        conta_cedente_id: tipoFaturamento === "banco" ? contaCedenteId : undefined,
        banco_codigo: tipoFaturamento === "banco" ? bancoCodigo : undefined,
        banco_nome: tipoFaturamento === "banco" ? bancoNome : undefined,
        dias_vencimento: parseInt(diasVencimento) || 30,
        instrucoes_boleto: instrucoesBoleto || undefined,
      })

      toast.success("Configuração de faturamento criada com sucesso!")
      await carregarDados()
      setConfiguracaoFaturamentoId(config.id)
      
      // Limpar formulário da configuração
      setNovaConfigNome("")
      setTipoFaturamento("asaas")
      setAsaasApiKey("")
      setAsaasAmbiente("producao")
      setContaCedenteId("")
      setBancoCodigo("")
      setBancoNome("")
      setDiasVencimento("30")
      setInstrucoesBoleto("")
    } catch (error: any) {
      console.error("Erro ao criar configuração:", error)
      toast.error("Erro ao criar configuração: " + error.message)
    }
  }

  async function handleSalvar() {
    if (!nomeGrupo) {
      toast.error("Preencha o nome do grupo")
      return
    }

    try {
      setSaving(true)

      if (grupoEditando) {
        await GruposBeneficiariosService.atualizar(grupoEditando.id, {
          nome: nomeGrupo,
          descricao: descricaoGrupo || undefined,
          configuracao_faturamento_id: configuracaoFaturamentoId || undefined,
        })
        toast.success("Grupo atualizado com sucesso!")
      } else {
        await GruposBeneficiariosService.criar(administradoraId, {
          nome: nomeGrupo,
          descricao: descricaoGrupo || undefined,
          configuracao_faturamento_id: configuracaoFaturamentoId || undefined,
        })
        toast.success("Grupo criado com sucesso!")
      }

      limparFormulario()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar grupo:", error)
      toast.error("Erro ao salvar grupo: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                {grupoEditando ? "Editar Grupo" : "Novo Grupo de Beneficiários"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-sm p-2 transition-colors"
              aria-label="Fechar"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-none">
              <TabsTrigger value="grupo">
                <Users className="h-4 w-4 mr-2" />
                Grupo
              </TabsTrigger>
              <TabsTrigger value="faturamento">
                <CreditCard className="h-4 w-4 mr-2" />
                Faturamento
              </TabsTrigger>
              <TabsTrigger value="conta-cedente">
                <Building2 className="h-4 w-4 mr-2" />
                Conta Cedente
              </TabsTrigger>
            </TabsList>

            {/* Tab: Grupo */}
            <TabsContent value="grupo" className="space-y-5 mt-5">
              <div className="space-y-1.5">
                <Label htmlFor="grupo-nome" className="text-sm font-semibold text-gray-700">
                  Nome do Grupo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="grupo-nome"
                  value={nomeGrupo}
                  onChange={(e) => setNomeGrupo(e.target.value.toUpperCase())}
                  placeholder="Ex: GRUPO EMPRESARIAL ABC"
                  className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grupo-desc" className="text-sm font-semibold text-gray-700">
                  Descrição
                </Label>
                <Textarea
                  id="grupo-desc"
                  value={descricaoGrupo}
                  onChange={(e) => setDescricaoGrupo(e.target.value)}
                  placeholder="Descrição do grupo de beneficiários..."
                  className="min-h-[100px] border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 block">
                  Configuração de faturamento
                </Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={faturamentoAgoraOuDepois === "agora" ? "default" : "outline"}
                    size="sm"
                    className="rounded-sm h-9"
                    onClick={() => setFaturamentoAgoraOuDepois("agora")}
                  >
                    Configurar agora
                  </Button>
                  <Button
                    type="button"
                    variant={faturamentoAgoraOuDepois === "depois" ? "default" : "outline"}
                    size="sm"
                    className="rounded-sm h-9"
                    onClick={() => setFaturamentoAgoraOuDepois("depois")}
                  >
                    Configurar depois
                  </Button>
                </div>

                {faturamentoAgoraOuDepois === "agora" && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    <Select
                      value={configuracaoFaturamentoId || undefined}
                      onValueChange={setConfiguracaoFaturamentoId}
                    >
                      <SelectTrigger className="h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#0F172A]">
                        <SelectValue placeholder="Selecione uma configuração de faturamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {configuracoesFaturamento.length === 0 ? (
                          <SelectItem value="no-config" disabled>
                            Nenhuma configuração disponível
                          </SelectItem>
                        ) : (
                          configuracoesFaturamento.map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              {config.nome} ({config.tipo_faturamento})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-gray-500">
                        Crie uma nova na aba Faturamento.
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-[#0F172A] rounded-none"
                        onClick={() => setActiveTab("faturamento")}
                      >
                        Seguir para abas Faturamento e Conta Cedente
                      </Button>
                    </div>
                  </div>
                )}

                {faturamentoAgoraOuDepois === "depois" && (
                  <p className="text-xs text-gray-500 pt-1">
                    Você poderá configurar o faturamento depois nas abas Faturamento e Conta Cedente.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Tab: Configuração de Faturamento */}
            <TabsContent value="faturamento" className="space-y-5 mt-5">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-nome" className="text-sm font-semibold text-gray-700">
                  Nome da Configuração <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cfg-nome"
                  value={novaConfigNome}
                  onChange={(e) => setNovaConfigNome(e.target.value)}
                  placeholder="Ex: Faturamento Asaas Produção"
                  className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 block">
                  Tipo de Faturamento <span className="text-red-500">*</span>
                </Label>
                <Select value={tipoFaturamento} onValueChange={(v) => setTipoFaturamento(v as any)}>
                  <SelectTrigger className="h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#0F172A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asaas">Asaas (API)</SelectItem>
                    <SelectItem value="banco">Banco (Boleto Bancário)</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoFaturamento === "asaas" && (
                <div className="space-y-5 pl-3 border-l-2 border-gray-200">
                  <div className="space-y-1.5">
                    <Label htmlFor="asaas-key" className="text-sm font-semibold text-gray-700">
                      API Key do Asaas <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="asaas-key"
                      type="password"
                      value={asaasApiKey}
                      onChange={(e) => setAsaasApiKey(e.target.value)}
                      placeholder="Sua API Key do Asaas"
                      className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700 block">
                      Ambiente
                    </Label>
                    <Select value={asaasAmbiente} onValueChange={(v) => setAsaasAmbiente(v as any)}>
                      <SelectTrigger className="h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#0F172A]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {tipoFaturamento === "banco" && (
                <div className="space-y-5 pl-3 border-l-2 border-gray-200">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700 block">
                      Conta Cedente <span className="text-red-500">*</span>
                    </Label>
                    <Select value={contaCedenteId} onValueChange={setContaCedenteId}>
                      <SelectTrigger className="h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#0F172A]">
                        <SelectValue placeholder="Selecione uma conta cedente" />
                      </SelectTrigger>
                      <SelectContent>
                        {contasCedentes.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome} - {conta.banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Crie uma nova na aba Conta Cedente.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="banco-cod" className="text-sm font-semibold text-gray-700">
                        Código do Banco
                      </Label>
                      <Input
                        id="banco-cod"
                        value={bancoCodigo}
                        onChange={(e) => setBancoCodigo(e.target.value)}
                        placeholder="Ex: 001"
                        className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="banco-nome" className="text-sm font-semibold text-gray-700">
                        Nome do Banco
                      </Label>
                      <Input
                        id="banco-nome"
                        value={bancoNome}
                        onChange={(e) => setBancoNome(e.target.value)}
                        placeholder="Ex: Banco do Brasil"
                        className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="dias-venc" className="text-sm font-semibold text-gray-700">
                  Dias para Vencimento
                </Label>
                <Input
                  id="dias-venc"
                  type="number"
                  value={diasVencimento}
                  onChange={(e) => setDiasVencimento(e.target.value)}
                  placeholder="30"
                  className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inst-boleto" className="text-sm font-semibold text-gray-700">
                  Instruções do Boleto
                </Label>
                <Textarea
                  id="inst-boleto"
                  value={instrucoesBoleto}
                  onChange={(e) => setInstrucoesBoleto(e.target.value)}
                  placeholder="Instruções que aparecerão no boleto..."
                  className="min-h-[100px] border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm resize-y"
                />
              </div>

              <Button
                onClick={handleCriarConfiguracaoFaturamento}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white h-11 rounded-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Criar Configuração de Faturamento
              </Button>
            </TabsContent>

            {/* Tab: Conta Cedente */}
            <TabsContent value="conta-cedente" className="space-y-5 mt-5">
              <div className="space-y-1.5">
                <Label htmlFor="conta-nome" className="text-sm font-semibold text-gray-700">
                  Nome da Conta <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="conta-nome"
                  value={novaContaNome}
                  onChange={(e) => setNovaContaNome(e.target.value.toUpperCase())}
                  placeholder="Ex: CONTA PRINCIPAL BB"
                  className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-banco" className="text-sm font-semibold text-gray-700">
                    Banco <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="conta-banco"
                    value={novaContaBanco}
                    onChange={(e) => setNovaContaBanco(e.target.value.toUpperCase())}
                    placeholder="Ex: BANCO DO BRASIL"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conta-ag" className="text-sm font-semibold text-gray-700">
                    Agência <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="conta-ag"
                    value={novaContaAgencia}
                    onChange={(e) => setNovaContaAgencia(e.target.value)}
                    placeholder="0000"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-cc" className="text-sm font-semibold text-gray-700">
                    Conta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="conta-cc"
                    value={novaContaConta}
                    onChange={(e) => setNovaContaConta(e.target.value)}
                    placeholder="00000-0"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700 block">
                    Tipo de Conta <span className="text-red-500">*</span>
                  </Label>
                  <Select value={novaContaTipo} onValueChange={(v) => setNovaContaTipo(v as any)}>
                    <SelectTrigger className="h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#0F172A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-cpf" className="text-sm font-semibold text-gray-700">
                    CPF/CNPJ do Titular
                  </Label>
                  <Input
                    id="conta-cpf"
                    value={novaContaCpfCnpj}
                    onChange={(e) => setNovaContaCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conta-titular" className="text-sm font-semibold text-gray-700">
                    Nome do Titular <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="conta-titular"
                    value={novaContaNomeTitular}
                    onChange={(e) => setNovaContaNomeTitular(e.target.value.toUpperCase())}
                    placeholder="NOME DO TITULAR"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-cod" className="text-sm font-semibold text-gray-700">
                    Código Cedente
                  </Label>
                  <Input
                    id="conta-cod"
                    value={novaContaCodigoCedente}
                    onChange={(e) => setNovaContaCodigoCedente(e.target.value)}
                    placeholder="0000000"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conta-cart" className="text-sm font-semibold text-gray-700">
                    Carteira
                  </Label>
                  <Input
                    id="conta-cart"
                    value={novaContaCarteira}
                    onChange={(e) => setNovaContaCarteira(e.target.value)}
                    placeholder="17"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conta-conv" className="text-sm font-semibold text-gray-700">
                    Convênio
                  </Label>
                  <Input
                    id="conta-conv"
                    value={novaContaConvenio}
                    onChange={(e) => setNovaContaConvenio(e.target.value)}
                    placeholder="0000000"
                    className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleCriarContaCedente}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white h-11 rounded-sm"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Criar Conta Cedente
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 border border-gray-300 rounded-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={saving || !nomeGrupo}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white h-11 px-6 rounded-sm"
          >
            {saving ? "Salvando..." : grupoEditando ? "Atualizar" : "Criar Grupo"}
          </Button>
        </div>
      </div>
    </div>
  )
}

