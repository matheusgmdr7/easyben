"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatarMoeda } from "@/utils/formatters"
import {
  ArrowLeft,
  Download,
  FileText,
  Pencil,
  Trash2,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

export default function ContratoDetalhesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { id } = params
  const tipo = searchParams.get("tipo") || "digital" // Tipo de proposta: 'digital' ou 'corretor'

  const [contrato, setContrato] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const fetchContrato = async () => {
      try {
        setLoading(true)
        setError(null)

        if (tipo === "corretor") {
          // Buscar proposta de corretor
          const { data, error } = await supabase
            .from("propostas_corretores")
            .select("*, corretores(*), documentos_propostas_corretores(*)")
            .eq("id", id)
            .eq("status", "aprovada")
            .single()

          if (error) throw error

          if (!data) {
            setError("Contrato não encontrado ou não está aprovado.")
            return
          }

          // Formatar dados para o formato de contrato
          const contratoFormatado = {
            id: data.id,
            numero_contrato: `PC-${data.id.substring(0, 8)}`,
            nome_cliente: data.cliente,
            cpf_cliente: data.cpf_cliente || "Não informado",
            email_cliente: data.email_cliente || "Não informado",
            telefone_cliente: data.whatsapp_cliente || "Não informado",
            plano: data.produto || "Não especificado",
            plano_nome: data.plano_nome || data.produto,
            operadora: data.operadora || "Não especificado",
            valor_mensal: data.valor || 0,
            data_inicio: data.data || data.created_at,
            status: "ativo",
            documento_url: data.documentos_propostas_corretores?.[0]?.url || null,
            corretor_nome: data.corretores?.nome || "Não especificado",
            corretor_email: data.corretores?.email || "Não informado",
            corretor_telefone: data.corretores?.telefone || "Não informado",
            created_at: data.created_at,
            updated_at: data.updated_at,
            tipo: "corretor",
          }

          setContrato(contratoFormatado)
        } else {
          // Buscar proposta digital
          const { data, error } = await supabase
            .from("propostas")
            .select("*")
            .eq("id", id)
            .eq("status", "aprovada")
            .single()

          if (error) throw error

          if (!data) {
            setError("Contrato não encontrado ou não está aprovado.")
            return
          }

          // Formatar dados para o formato de contrato
          const contratoFormatado = {
            id: data.id,
            numero_contrato: `PD-${data.id.substring(0, 8)}`,
            nome_cliente: data.nome_cliente,
            cpf_cliente: data.cpf,
            email_cliente: data.email,
            telefone_cliente: data.telefone,
            plano: data.sigla_plano || "Não especificado",
            plano_nome: data.sigla_plano,
            operadora: "Não especificado",
            tipo_plano: data.tipo_cobertura,
            tipo_acomodacao: data.tipo_acomodacao,
            valor_mensal: Number.parseFloat(data.valor) || 0,
            data_inicio: data.created_at,
            status: "ativo",
            documento_url: data.pdf_url || null,
            corretor_nome: data.corretor_nome || "Direto",
            created_at: data.created_at,
            updated_at: data.created_at,
            endereco_cliente: `${data.endereco}, ${data.bairro}, ${data.cidade}/${data.estado}, CEP: ${data.cep}`,
            tipo: "digital",
          }

          setContrato(contratoFormatado)
        }
      } catch (error) {
        console.error("Erro ao buscar contrato:", error)
        setError("Ocorreu um erro ao carregar os detalhes do contrato.")
        toast.error("Erro ao carregar detalhes do contrato")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchContrato()
    }
  }, [id, tipo])

  const formatarData = (dataString) => {
    if (!dataString) return "N/A"
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "ativo":
        return "bg-gray-100 text-[#0F172A]"
      case "pendente":
        return "bg-gray-100 text-yellow-600"
      case "cancelado":
        return "bg-gray-100 text-orange-600"
      case "suspenso":
        return "bg-gray-100 text-orange-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "ativo":
        return "ATIVO"
      case "pendente":
        return "PENDENTE"
      case "cancelado":
        return "CANCELADO"
      case "suspenso":
        return "SUSPENSO"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Spinner />
      </div>
    )
  }

  if (error || !contrato) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar contrato</h2>
        <p className="text-gray-500 mb-4">{error || "Contrato não encontrado"}</p>
        <Button onClick={() => router.push("/admin/contratos")} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Contratos
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Contrato #${contrato.numero_contrato || id}`}
        description="Detalhes do contrato e informações do cliente."
        actions={
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/contratos")} className="w-full md:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button className="bg-[#0F172A] hover:bg-[#1E293B] w-full md:w-auto">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">Cliente</span>
          </div>
          <span className="text-lg">{contrato.nome_cliente}</span>
        </Card>

        <Card className="p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">Data de Início</span>
          </div>
          <span className="text-lg">{formatarData(contrato.data_inicio)}</span>
        </Card>

        <Card className="p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">Status</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(contrato.status)} self-start`}>
            {getStatusLabel(contrato.status)}
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium mb-4">Informações do Contrato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Número do Contrato</p>
                <p className="font-medium">{contrato.numero_contrato || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plano</p>
                <p className="font-medium">{contrato.plano_nome || contrato.plano}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor Mensal</p>
                <p className="font-medium">{formatarMoeda(contrato.valor_mensal || 0)}</p>
              </div>
              {contrato.tipo_plano && (
                <div>
                  <p className="text-sm text-gray-500">Tipo de Plano</p>
                  <p className="font-medium">{contrato.tipo_plano}</p>
                </div>
              )}
              {contrato.tipo_acomodacao && (
                <div>
                  <p className="text-sm text-gray-500">Acomodação</p>
                  <p className="font-medium">{contrato.tipo_acomodacao}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Data de Início</p>
                <p className="font-medium">{formatarData(contrato.data_inicio)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Operadora</p>
                <p className="font-medium">{contrato.operadora || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Corretor</p>
                <p className="font-medium">{contrato.corretor_nome}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium mb-4">Informações do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-medium">{contrato.nome_cliente}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CPF</p>
                <p className="font-medium">{contrato.cpf_cliente || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{contrato.email_cliente || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="font-medium">{contrato.telefone_cliente || "N/A"}</p>
              </div>
              {contrato.endereco_cliente && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Endereço</p>
                  <p className="font-medium">{contrato.endereco_cliente}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium mb-4">Documento do Contrato</h3>
            {contrato.documento_url ? (
              <div className="flex flex-col items-center">
                <div className="relative w-full h-48 mb-4 bg-gray-100 rounded-md overflow-hidden">
                  {!imageError ? (
                    <Image
                      src="/documento.png"
                      alt="Prévia do documento"
                      fill
                      style={{ objectFit: "contain" }}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileText className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => window.open(contrato.documento_url, "_blank")}
                  className="bg-[#0F172A] hover:bg-[#1E293B] w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Contrato
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-center mb-4">Nenhum documento disponível</p>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Adicionar Documento
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-medium mb-4">Ações</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Pencil className="h-4 w-4 mr-2" />
                Editar Contrato
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancelar Contrato
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
