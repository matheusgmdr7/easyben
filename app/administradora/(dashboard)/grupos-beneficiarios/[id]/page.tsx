"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { FaturamentoService, type DadosFatura } from "@/services/faturamento-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Trash2, FileText, DollarSign, Users } from "lucide-react"
import { formatarMoeda } from "@/utils/formatters"

export default function DetalhesGrupoPage() {
  const params = useParams()
  const router = useRouter()
  const grupoId = params.id as string

  const [grupo, setGrupo] = useState<GrupoBeneficiarios | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<any[]>([])
  const [showModalGerarFatura, setShowModalGerarFatura] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [dadosFatura, setDadosFatura] = useState({
    valor: "",
    vencimento: "",
    descricao: "",
  })
  const [gerandoFatura, setGerandoFatura] = useState(false)

  useEffect(() => {
    if (grupoId) {
      carregarGrupo()
      carregarClientes()
    }
  }, [grupoId])

  async function carregarGrupo() {
    try {
      setLoading(true)
      const data = await GruposBeneficiariosService.buscarPorId(grupoId)
      setGrupo(data)
    } catch (error: any) {
      console.error("Erro ao carregar grupo:", error)
      toast.error("Erro ao carregar grupo")
    } finally {
      setLoading(false)
    }
  }

  async function carregarClientes() {
    try {
      const { supabase } = await import("@/lib/supabase")
      
      // Buscar clientes vinculados ao grupo
      const { data, error } = await supabase
        .from("clientes_grupos")
        .select("*")
        .eq("grupo_id", grupoId)

      if (error) throw error

      // Buscar dados completos dos clientes
      const clientesCompletos = await Promise.all(
        (data || []).map(async (vinculo) => {
          if (vinculo.cliente_tipo === "proposta") {
            const { data: proposta } = await supabase
              .from("propostas")
              .select("*")
              .eq("id", vinculo.cliente_id)
              .single()

            return {
              ...vinculo,
              cliente: proposta,
              tipo: "Proposta",
            }
          } else {
            const { data: cliente } = await supabase
              .from("clientes_administradoras")
              .select("*")
              .eq("id", vinculo.cliente_id)
              .single()

            return {
              ...vinculo,
              cliente: cliente,
              tipo: "Cliente",
            }
          }
        })
      )

      setClientes(clientesCompletos.filter((c) => c.cliente))
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error)
      toast.error("Erro ao carregar clientes")
    }
  }

  async function handleGerarFatura(cliente: any) {
    setClienteSelecionado(cliente)
    setDadosFatura({
      valor: "",
      vencimento: "",
      descricao: `Fatura - ${cliente.cliente.nome || cliente.cliente.nome}`,
    })
    setShowModalGerarFatura(true)
  }

  async function handleConfirmarGerarFatura() {
    if (!dadosFatura.valor || !dadosFatura.vencimento || !clienteSelecionado) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    try {
      setGerandoFatura(true)

      const dados: DadosFatura = {
        cliente_id: clienteSelecionado.cliente_id,
        cliente_tipo: clienteSelecionado.cliente_tipo,
        valor: parseFloat(dadosFatura.valor),
        vencimento: dadosFatura.vencimento,
        descricao: dadosFatura.descricao,
        grupo_id: grupoId,
      }

      const resultado = await FaturamentoService.gerarFatura(dados)

      if (resultado.sucesso) {
        toast.success("Fatura gerada com sucesso!")
        setShowModalGerarFatura(false)
        setDadosFatura({ valor: "", vencimento: "", descricao: "" })
        setClienteSelecionado(null)
      } else {
        toast.error(resultado.erro || "Erro ao gerar fatura")
      }
    } catch (error: any) {
      console.error("Erro ao gerar fatura:", error)
      toast.error("Erro ao gerar fatura: " + error.message)
    } finally {
      setGerandoFatura(false)
    }
  }

  async function handleRemoverCliente(vinculoId: string) {
    if (!confirm("Tem certeza que deseja remover este cliente do grupo?")) return

    try {
      const { supabase } = await import("@/lib/supabase")
      const { error } = await supabase
        .from("clientes_grupos")
        .delete()
        .eq("id", vinculoId)

      if (error) throw error

      toast.success("Cliente removido do grupo com sucesso!")
      carregarClientes()
    } catch (error: any) {
      console.error("Erro ao remover cliente:", error)
      toast.error("Erro ao remover cliente: " + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  if (!grupo) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Grupo não encontrado</p>
        <Button onClick={() => router.push("/administradora/grupos-beneficiarios")} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/administradora/grupos-beneficiarios")}
            className="text-[#0F172A] hover:bg-[#0F172A]/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
            {grupo.nome}
          </h1>
          {grupo.descricao && (
            <p className="text-gray-600 mt-1 font-medium">{grupo.descricao}</p>
          )}
        </div>
      </div>

      {/* Informações do Grupo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0F172A]">{clientes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Configuração de Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grupo.configuracao_faturamento ? (
              <div>
                <p className="font-semibold text-[#0F172A]">{grupo.configuracao_faturamento.nome}</p>
                <Badge className="mt-1 capitalize">{grupo.configuracao_faturamento.tipo_faturamento}</Badge>
              </div>
            ) : (
              <p className="text-gray-400">Não configurado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={grupo.ativo ? "default" : "secondary"}
              className={grupo.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
            >
              {grupo.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Clientes do Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum cliente vinculado a este grupo
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">CPF/CNPJ</TableHead>
                  <TableHead className="font-bold">Tipo</TableHead>
                  <TableHead className="font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.cliente?.nome || "-"}
                    </TableCell>
                    <TableCell>
                      {item.cliente?.cpf || item.cliente?.cnpj || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGerarFatura(item)}
                          className="text-[#0F172A] hover:bg-[#0F172A]/10"
                          title="Gerar Fatura"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverCliente(item.id)}
                          className="text-red-600 hover:bg-red-50"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Gerar Fatura */}
      {showModalGerarFatura && clienteSelecionado && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Gerar Fatura - {clienteSelecionado.cliente?.nome}
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">
                  Valor <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dadosFatura.valor}
                  onChange={(e) => setDadosFatura({ ...dadosFatura, valor: e.target.value })}
                  placeholder="0.00"
                  className="h-12 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">
                  Data de Vencimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dadosFatura.vencimento}
                  onChange={(e) => setDadosFatura({ ...dadosFatura, vencimento: e.target.value })}
                  className="h-12 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">
                  Descrição
                </Label>
                <Input
                  value={dadosFatura.descricao}
                  onChange={(e) => setDadosFatura({ ...dadosFatura, descricao: e.target.value })}
                  placeholder="Descrição da fatura"
                  className="h-12 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModalGerarFatura(false)
                  setClienteSelecionado(null)
                }}
                className="h-12"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarGerarFatura}
                disabled={gerandoFatura || !dadosFatura.valor || !dadosFatura.vencimento}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white h-12"
              >
                {gerandoFatura ? "Gerando..." : "Gerar Fatura"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

