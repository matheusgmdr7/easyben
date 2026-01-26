"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatarMoeda } from "@/utils/formatters"
import { FileText, User, Calendar, ArrowLeft, AlertTriangle, Archive, Eye, FileDigit, Heart, Scale, Ruler } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadPropostaComDocumentos } from "@/services/download-service"
import { gerarPDFCompleto } from "@/services/pdf-completo-service"
import FileSaver from "file-saver"
import { TabsContent } from "@/components/ui/tabs"

export default function VisualizarPropostaPage() {
  const params = useParams()
  const router = useRouter()
  const [proposta, setProposta] = useState<any>(null)
  const [dependentes, setDependentes] = useState<any[]>([])
  const [questionario, setQuestionario] = useState<any[]>([])
  const [questionarioRespostas, setQuestionarioRespostas] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<any>(null)
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
  const [pdfCompletoLoading, setPdfCompletoLoading] = useState<boolean>(false)

  useEffect(() => {
    const fetchProposta = async () => {
      try {
        setLoading(true)
        setError(null)

        const id = params.id

        // Buscar proposta
        const { data: propostaData, error: propostaError } = await supabase
          .from("propostas")
          .select("*")
          .eq("id", id)
          .single()

        if (propostaError) throw propostaError
        setProposta(propostaData)

        // Carregar dependentes
        const { data: dependentesData, error: dependentesError } = await supabase
          .from("dependentes")
          .select("*")
          .eq("proposta_id", id)
          .order("created_at", { ascending: true })

        if (dependentesError) throw dependentesError
        setDependentes(dependentesData || [])

        // Carregar questionário de saúde
        const { data: questionarioData, error: questionarioError } = await supabase
          .from("questionario_saude")
          .select("*")
          .eq("proposta_id", id)
          .order("pergunta_id", { ascending: true })

        if (questionarioError) throw questionarioError
        setQuestionario(questionarioData || [])

        // Carregar questionário de saúde (questionario_respostas)
        const { data: questionarioRespostasData, error: questionarioRespostasError } = await supabase
          .from("questionario_respostas")
          .select("*, respostas_questionario(*)")
          .eq("proposta_id", id)

        if (questionarioRespostasError) {
          console.error("Erro ao buscar questionario_respostas:", questionarioRespostasError)
        } else {
          setQuestionarioRespostas(Array.isArray(questionarioRespostasData) ? questionarioRespostasData : [])
        }

        // Obter URLs de documentos da proposta
        if (propostaData && propostaData.documentos_urls) {
          setDocumentos(propostaData.documentos_urls)
        }
      } catch (error) {
        console.error("Erro ao carregar proposta:", error)
        setError({
          title: "Erro ao carregar proposta",
          message: "Não foi possível carregar os detalhes da proposta. Por favor, tente novamente mais tarde.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProposta()
  }, [params.id])

  const formatarData = (dataString: any) => {
    if (!dataString) return "N/A"
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getStatusBadgeClass = (status: any) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800"
      case "aprovada":
        return "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
      case "rejeitada":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: any) => {
    switch (status) {
      case "pendente":
        return "Pendente"
      case "aprovada":
        return "Aprovada"
      case "rejeitada":
        return "Rejeitada"
      default:
        return status
    }
  }

  async function atualizarStatusProposta(novoStatus: any) {
    if (!proposta) return
    try {
      const { error } = await supabase.from("propostas").update({ status: novoStatus }).eq("id", proposta.id)
      if (error) throw error
      toast.success(`Status da proposta atualizado para ${getStatusLabel(novoStatus)}`)
      setProposta({ ...proposta, status: novoStatus })
    } catch (error) {
      console.error("Erro ao atualizar status da proposta:", error)
      toast.error("Erro ao atualizar status da proposta")
    }
  }

  async function baixarTodosDocumentos() {
    if (!proposta) return
    try {
      setDownloadLoading(true)
      if (!proposta.pdf_url) {
        toast.error("PDF da proposta não disponível")
        return
      }
      await downloadPropostaComDocumentos(proposta.id, proposta.nome_cliente, documentos, proposta.pdf_url)
      toast.success("Download iniciado com sucesso")
    } catch (error) {
      console.error("Erro ao baixar documentos:", error)
      toast.error("Erro ao baixar documentos")
    } finally {
      setDownloadLoading(false)
    }
  }

  async function gerarPDFCompletoComDocumentos() {
    if (!proposta) return
    try {
      setPdfCompletoLoading(true)
      if (!proposta.pdf_url) {
        toast.error("PDF da proposta não disponível")
        return
      }
      const pdfBlob = await gerarPDFCompleto(proposta.id, proposta.nome_cliente, documentos, proposta.pdf_url)
      const nomeFormatado = proposta.nome_cliente
        .normalize("NFD")
        .replace(/[^a-zA-Z0-9]/g, "_")
      FileSaver.saveAs(pdfBlob, `Proposta_Completa_${nomeFormatado}_${proposta.id.substring(0, 8)}.pdf`)
      toast.success("PDF completo gerado com sucesso")
    } catch (error) {
      console.error("Erro ao gerar PDF completo:", error)
      toast.error("Erro ao gerar PDF completo")
    } finally {
      setPdfCompletoLoading(false)
    }
  }

  // Função para buscar questionário de saúde completo (peso, altura, respostas)
  async function buscarQuestionarioCompleto(propostaId: string) {
    // Buscar todos os registros de questionario_respostas para a proposta
    const { data: questionarios, error: errorQuestionarios } = await supabase
      .from("questionario_respostas")
      .select("*")
      .eq("proposta_id", propostaId)

    if (errorQuestionarios) {
      console.error("Erro ao buscar questionario_respostas:", errorQuestionarios)
      return []
    }

    // Para cada questionario, buscar as respostas
    const resultado = []
    for (const questionario of questionarios) {
      const { data: respostas, error: errorRespostas } = await supabase
        .from("respostas_questionario")
        .select("*")
        .eq("questionario_id", questionario.id)
        .order("pergunta_id", { ascending: true })
      resultado.push({
        pessoa_tipo: questionario.pessoa_tipo,
        pessoa_nome: questionario.pessoa_nome,
        peso: questionario.peso,
        altura: questionario.altura,
        respostas: respostas || [],
      })
    }
    return resultado
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visualizar Proposta"
          description="Detalhes da proposta digital"
          actions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          }
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{error.title || "Erro"}</AlertTitle>
          <AlertDescription>{error.message || "Erro desconhecido."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!proposta) return null

    return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={`Proposta #${proposta.id.substring(0, 8)} - ${proposta.produto_nome || proposta.produto || "Produto não informado"}`}
        description="Detalhes da proposta digital"
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {proposta.pdf_url && (
              <>
                <Button
                  onClick={() => window.open(proposta.pdf_url, "_blank")}
                  className="bg-[#0F172A] hover:bg-[#1E293B]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Visualizar PDF
                </Button>
                <Button
                  onClick={baixarTodosDocumentos}
                  className="bg-[#0F172A] hover:bg-[#0F172A]"
                  disabled={downloadLoading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {downloadLoading ? "Baixando..." : "Baixar Docs (ZIP)"}
                </Button>
                <Button
                  onClick={gerarPDFCompletoComDocumentos}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={pdfCompletoLoading}
                >
                  <FileDigit className="h-4 w-4 mr-2" />
                  {pdfCompletoLoading ? "Gerando..." : "PDF Completo"}
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">Data de Envio</span>
          </div>
          <span className="text-base md:text-lg">{formatarData(proposta.created_at)}</span>
        </Card>

        <Card className="p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">Corretor</span>
          </div>
            <span className="text-base md:text-lg text-gray-900 font-normal">{proposta.corretor_nome || proposta.corretorEmail || "Direto"}</span>
        </Card>

        <Card className="p-4 flex flex-col">
          <div className="flex items-center mb-2">
            <FileText className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium">Status</span>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <span className={`px-2 py-1 rounded-full text-xs mr-2 ${getStatusBadgeClass(proposta.status)}`}>
              {getStatusLabel(proposta.status)}
            </span>

            <Select value={proposta.status} onValueChange={atualizarStatusProposta}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovada">Aprovar</SelectItem>
                <SelectItem value="rejeitada">Rejeitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Dados do Plano</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Cobertura</p>
              <p className="font-medium">{proposta.cobertura}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Acomodação</p>
                <p className="font-medium">{proposta.acomodacao || proposta.tipo_acomodacao || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Código do Plano</p>
              <p className="font-medium">{proposta.sigla_plano}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor</p>
              <p className="font-medium">{formatarMoeda(proposta.valor || 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Dados do Titular</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{proposta.nome_cliente}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CPF</p>
              <p className="font-medium">{proposta.cpf}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">RG</p>
              <p className="font-medium">{proposta.rg}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Nascimento</p>
              <p className="font-medium">{proposta.data_nascimento}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{proposta.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-medium">{proposta.telefone}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Endereço</p>
              <p className="font-medium">{proposta.endereco}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cidade/UF</p>
              <p className="font-medium">
                {proposta.cidade}/{proposta.estado}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CEP</p>
              <p className="font-medium">{proposta.cep}</p>
            </div>
              <div>
                <p className="text-sm text-gray-500">Peso</p>
                <p className="font-medium">{proposta.peso ? proposta.peso + " kg" : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Altura</p>
                <p className="font-medium">{proposta.altura ? proposta.altura + " cm" : "-"}</p>
              </div>
          </div>
        </Card>

        {dependentes.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Dependentes</h3>
            <div className="space-y-4">
                {dependentes.map((dep: any, index: number) => (
                <Card key={dep.id} className="p-4">
                  <h5 className="font-medium mb-2">Dependente {index + 1}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{dep.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CPF</p>
                      <p className="font-medium">{dep.cpf}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">RG</p>
                      <p className="font-medium">{dep.rg}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data de Nascimento</p>
                      <p className="font-medium">{dep.data_nascimento}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Parentesco</p>
                      <p className="font-medium">{dep.parentesco}</p>
                    </div>
                    {dep.cns && (
                      <div>
                        <p className="text-sm text-gray-500">CNS</p>
                        <p className="font-medium">{dep.cns}</p>
                      </div>
                    )}
                      <div>
                        <p className="text-sm text-gray-500">Peso</p>
                        <p className="font-medium">{dep.peso ? dep.peso + " kg" : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Altura</p>
                        <p className="font-medium">{dep.altura ? dep.altura + " cm" : "-"}</p>
                      </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

          <TabsContent value="saude" className="space-y-6 mt-6">
            {questionario && questionario.length > 0 ? (
              questionario.map((q, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      {q.pessoa_tipo === "titular"
                        ? "Declaração de Saúde - Titular"
                        : `Declaração de Saúde - ${q.pessoa_nome}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 text-sm text-gray-700">
                      <span className="mr-4">Peso: <b>{q.peso || "-"} kg</b></span>
                      <span>Altura: <b>{q.altura || "-"} m</b></span>
            </div>
                    {q.respostas && q.respostas.length > 0 ? (
                      q.respostas.map((resposta: any, i: number) => (
                        <div key={i} className="border-l-4 border-blue-200 pl-4 py-2 mb-2">
                          <div className="font-medium text-gray-900 mb-1">Pergunta {resposta.pergunta_id}</div>
                          <div className="text-sm text-gray-600 mb-2">{resposta.pergunta_texto || resposta.pergunta || "Pergunta não disponível"}</div>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Declaração de Saúde
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Nenhuma resposta encontrada</p>
                </CardContent>
              </Card>
          )}
          </TabsContent>

        {Object.keys(documentos).length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Documentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(documentos).map(([key, url]: any) => (
                <Card key={key} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {key === "rg_frente"
                          ? "RG (Frente)"
                          : key === "rg_verso"
                            ? "RG (Verso)"
                            : key === "cpf"
                              ? "CPF"
                              : key === "comprovante_residencia"
                                ? "Comprovante de Residência"
                                : key === "cns"
                                  ? "Cartão Nacional de Saúde"
                                  : key}
                      </p>
                    </div>
                    <Button onClick={() => window.open(url as string, "_blank")} variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
    </>
  )
}
