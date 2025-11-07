"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdministradorasService, type Administradora, type ConfiguracaoFinanceira } from "@/services/administradoras-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building,
  ArrowLeft,
  Settings,
  Save,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ConfiguracoesAdministradoraPage() {
  const params = useParams()
  const router = useRouter()
  const administradoraId = params.id as string

  const [administradora, setAdministradora] = useState<Administradora | null>(null)
  const [config, setConfig] = useState<ConfiguracaoFinanceira | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formConfig, setFormConfig] = useState({
    instituicao_financeira: "",
    api_key: "",
    api_token: "",
    ambiente: "producao" as "sandbox" | "producao",
  })

  useEffect(() => {
    carregarDados()
  }, [administradoraId])

  async function carregarDados() {
    try {
      setLoading(true)

      const admData = await AdministradorasService.buscarPorId(administradoraId)
      setAdministradora(admData)

      const configData = await AdministradorasService.buscarConfiguracaoFinanceira(administradoraId)
      if (configData) {
        setConfig(configData)
        setFormConfig({
          instituicao_financeira: configData.instituicao_financeira || "",
          api_key: configData.api_key || "",
          api_token: configData.api_token || "",
          ambiente: configData.ambiente,
        })
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados:", error)
      toast.error("Erro ao carregar configurações")
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvar() {
    try {
      setSaving(true)

      await AdministradorasService.salvarConfiguracaoFinanceira(administradoraId, {
        ...formConfig,
        status_integracao: formConfig.api_key ? "ativa" : "inativa",
      })

      toast.success("Configurações salvas com sucesso!")
      carregarDados()
    } catch (error: any) {
      console.error("❌ Erro ao salvar:", error)
      toast.error("Erro ao salvar configurações")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  if (!administradora) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Administradora não encontrada</p>
            <Button
              onClick={() => router.push("/admin/administradoras")}
              className="mt-4"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        onClick={() => router.push(`/admin/administradoras/${administradoraId}`)}
        variant="ghost"
        className="font-bold"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans flex items-center gap-2">
              <Settings className="h-6 w-6 text-[#168979]" />
              Configurações - {administradora.nome}
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Configure integração com gateway de pagamento
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 font-sans">
          Integração Financeira
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Funcionalidade em Desenvolvimento</p>
              <p className="text-xs text-blue-700 mt-1">
                Esta área permitirá integrar com gateways de pagamento como Asaas, PagSeguro, Mercado Pago, etc.
                Por enquanto, as faturas podem ser gerenciadas manualmente.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Instituição Financeira
            </label>
            <Select
              value={formConfig.instituicao_financeira}
              onValueChange={(value) => setFormConfig({ ...formConfig, instituicao_financeira: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="pagseguro">PagSeguro</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              API Key
            </label>
            <Input
              type="password"
              value={formConfig.api_key}
              onChange={(e) => setFormConfig({ ...formConfig, api_key: e.target.value })}
              placeholder="Chave da API"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              API Token (Opcional)
            </label>
            <Input
              type="password"
              value={formConfig.api_token}
              onChange={(e) => setFormConfig({ ...formConfig, api_token: e.target.value })}
              placeholder="Token adicional se necessário"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Ambiente
            </label>
            <Select
              value={formConfig.ambiente}
              onValueChange={(value: "sandbox" | "producao") => setFormConfig({ ...formConfig, ambiente: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {config.status_integracao === "ativa" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Integração Ativa</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">Integração Inativa</span>
                  </>
                )}
              </div>
              {config.ultima_sincronizacao && (
                <p className="text-xs text-gray-500 mt-1">
                  Última sincronização: {new Date(config.ultima_sincronizacao).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
          <Button
            onClick={handleSalvar}
            disabled={saving}
            className="bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate shadow-corporate"
          >
            {saving ? (
              <>
                <div className="loading-corporate-small mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
