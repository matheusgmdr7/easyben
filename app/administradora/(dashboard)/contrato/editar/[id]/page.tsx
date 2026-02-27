"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ModalConfirmacaoExclusao } from "@/components/administradora/modal-confirmacao-exclusao"
import { ArrowLeft, Check, Plus, Trash2, Package } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FaixaEtaria {
  faixa_etaria: string
  valor: string
}

/** Faixas por tipo de acomodação: Enfermaria e Apartamento para cada produto */
interface FaixasPorAcomodacao {
  Enfermaria: FaixaEtaria[]
  Apartamento: FaixaEtaria[]
}

interface ProdutoContrato {
  id: string
  nome: string
  segmentacao: string
  /** Preços por faixa etária para Enfermaria e Apartamento */
  faixasEnfermaria: FaixaEtaria[]
  faixasApartamento: FaixaEtaria[]
}

const SEGMENTACOES = [
  { value: "Padrão", label: "Padrão" },
  { value: "Adesão", label: "Adesão" },
  { value: "Individual", label: "Individual" },
  { value: "Familiar", label: "Familiar" },
  { value: "Empresarial", label: "Empresarial" },
  { value: "Coletivo", label: "Coletivo" },
]

const FAIXAS_PADRAO = ["0-18", "19-23", "24-28", "29-33", "34-38", "39-43", "44-48", "49-53", "54-58", "59+"]

function normalizarFaixasProduto(faixas: FaixaEtaria[] | FaixasPorAcomodacao | undefined): FaixasPorAcomodacao {
  if (!faixas) return { Enfermaria: [], Apartamento: [] }
  if (Array.isArray(faixas)) {
    return { Enfermaria: [...faixas], Apartamento: [] }
  }
  const obj = faixas as FaixasPorAcomodacao
  return {
    Enfermaria: Array.isArray(obj.Enfermaria) ? obj.Enfermaria : [],
    Apartamento: Array.isArray(obj.Apartamento) ? obj.Apartamento : [],
  }
}

export default function EditarContratoPage() {
  const router = useRouter()
  const params = useParams()
  const contratoId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("dados")

  const [formData, setFormData] = useState({
    descricao: "",
    numero: "",
    observacao: "",
    logo: "",
  })

  const [operadoraInfo, setOperadoraInfo] = useState({ cnpj: "", razao_social: "", nome_fantasia: "" })
  const [produtos, setProdutos] = useState<ProdutoContrato[]>([])
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [excluirContexto, setExcluirContexto] = useState<{ tipo: "produto"; id: string; nome?: string } | { tipo: "faixa"; produtoId: string; produtoNome?: string; tipoAcomodacao: TipoAcomodacao; index: number } | null>(null)

  useEffect(() => {
    if (!contratoId) return
    carregarContrato()
  }, [contratoId])

  async function carregarContrato() {
    if (!contratoId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/administradora/contrato/${contratoId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Contrato não encontrado")

      setFormData({
        descricao: data.descricao || "",
        numero: data.numero || "",
        observacao: data.observacao || "",
        logo: data.logo || "",
      })
      setOperadoraInfo({
        cnpj: data.cnpj_operadora || "",
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
      })
      const prods = (data.produtos || []).map((p: {
        id: string
        nome: string
        segmentacao?: string
        faixas?: FaixaEtaria[] | FaixasPorAcomodacao
      }) => {
        const parsed = normalizarFaixasProduto(p.faixas)
        return {
          id: p.id || crypto.randomUUID(),
          nome: p.nome || "",
          segmentacao: p.segmentacao || "Padrão",
          faixasEnfermaria: parsed.Enfermaria,
          faixasApartamento: parsed.Apartamento,
        }
      })
      setProdutos(prods)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar contrato")
      router.push("/administradora/contrato/pesquisar")
    } finally {
      setLoading(false)
    }
  }

  function adicionarProduto() {
    setProdutos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: "", segmentacao: "Padrão", faixasEnfermaria: [], faixasApartamento: [] },
    ])
  }

  function removerProduto(id: string) {
    setProdutos((prev) => prev.filter((p) => p.id !== id))
  }

  type TipoAcomodacao = "Enfermaria" | "Apartamento"

  function abrirConfirmExcluirProduto(prod: ProdutoContrato) {
    setExcluirContexto({ tipo: "produto", id: prod.id, nome: prod.nome || undefined })
    setConfirmExcluirOpen(true)
  }

  function abrirConfirmExcluirFaixa(prod: ProdutoContrato, tipo: TipoAcomodacao, index: number) {
    setExcluirContexto({ tipo: "faixa", produtoId: prod.id, produtoNome: prod.nome || undefined, tipoAcomodacao: tipo, index })
    setConfirmExcluirOpen(true)
  }

  function confirmarExclusao() {
    if (!excluirContexto) return
    if (excluirContexto.tipo === "produto") removerProduto(excluirContexto.id)
    else removerFaixa(excluirContexto.produtoId, excluirContexto.tipoAcomodacao, excluirContexto.index)
    setConfirmExcluirOpen(false)
    setExcluirContexto(null)
  }

  function atualizarProduto(id: string, dados: Partial<Pick<ProdutoContrato, "nome" | "segmentacao">>) {
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ...dados } : p)))
  }

  function adicionarFaixa(produtoId: string, tipo: TipoAcomodacao) {
    const key = tipo === "Enfermaria" ? "faixasEnfermaria" : "faixasApartamento"
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, [key]: [...p[key], { faixa_etaria: "", valor: "" }] } : p))
    )
  }

  function adicionarFaixasPadrao(produtoId: string, tipo: TipoAcomodacao) {
    const key = tipo === "Enfermaria" ? "faixasEnfermaria" : "faixasApartamento"
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, [key]: FAIXAS_PADRAO.map((f) => ({ faixa_etaria: f, valor: "" })) } : p))
    )
  }

  function removerFaixa(produtoId: string, tipo: TipoAcomodacao, index: number) {
    const key = tipo === "Enfermaria" ? "faixasEnfermaria" : "faixasApartamento"
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, [key]: p[key].filter((_, i) => i !== index) } : p))
    )
  }

  function atualizarFaixa(produtoId: string, tipo: TipoAcomodacao, index: number, dados: Partial<FaixaEtaria>) {
    const key = tipo === "Enfermaria" ? "faixasEnfermaria" : "faixasApartamento"
    setProdutos((prev) =>
      prev.map((p) =>
        p.id === produtoId ? { ...p, [key]: p[key].map((f, i) => (i === index ? { ...f, ...dados } : f)) } : p
      )
    )
  }

  async function salvar() {
    if (!contratoId) return

    try {
      setSaving(true)
      if (!formData.descricao || !formData.numero) {
        toast.error("Descrição e Número são obrigatórios")
        return
      }

      const res = await fetch(`/api/administradora/contrato/${contratoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: formData.descricao,
          numero: formData.numero,
          observacao: formData.observacao || null,
          logo: formData.logo || null,
          produtos: produtos
            .filter((p) => (p.nome || "").trim())
            .map((p) => ({
              id: p.id,
              nome: p.nome.trim(),
              segmentacao: p.segmentacao,
              faixas_por_acomodacao: {
                Enfermaria: p.faixasEnfermaria.map((f) => ({ faixa_etaria: f.faixa_etaria, valor: f.valor })),
                Apartamento: p.faixasApartamento.map((f) => ({ faixa_etaria: f.faixa_etaria, valor: f.valor })),
              },
            })),
        }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(json?.error || "Erro ao salvar")

      toast.success("Contrato atualizado")
      router.push("/administradora/contrato/pesquisar")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar contrato")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando contrato...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/administradora/contrato/pesquisar")}
            className="h-9 px-3 border-gray-300 rounded-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Analisar e editar contrato</h1>
        </div>
        <Button
          onClick={salvar}
          disabled={saving}
          className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
        >
          <Check className="h-4 w-4 mr-1" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white border border-gray-200 rounded-sm">
            <TabsTrigger value="dados" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-sm">
              Dados do contrato
            </TabsTrigger>
            <TabsTrigger value="produtos" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-sm">
              Produtos ({produtos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 p-3 bg-gray-50 rounded-sm border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Operadora (somente leitura)</p>
                  <p className="text-sm text-gray-800">
                    {operadoraInfo.nome_fantasia || operadoraInfo.razao_social || "-"}
                    {operadoraInfo.cnpj && (
                      <span className="text-gray-500 ml-2">CNPJ: {operadoraInfo.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}</span>
                    )}
                  </p>
                </div>

                {formData.logo && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-600 mb-1">Logo</p>
                    <img src={formData.logo} alt="Logo" className="h-16 object-contain border border-gray-200 rounded-sm" />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Descrição <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value.toUpperCase() }))}
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Número <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData((p) => ({ ...p, numero: e.target.value.toUpperCase() }))}
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Observação</label>
                  <Textarea
                    value={formData.observacao}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v.length <= 500) setFormData((p) => ({ ...p, observacao: v.toUpperCase() }))
                    }}
                    className="min-h-[80px] text-sm border-gray-300 rounded-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">Restam {500 - formData.observacao.length} caracteres.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Edite os produtos vinculados ao contrato.</p>
                <Button onClick={adicionarProduto} className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar produto
                </Button>
              </div>

              {produtos.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-sm p-8 text-center">
                  <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Nenhum produto.</p>
                  <p className="text-xs text-gray-400 mt-1">Clique em &quot;Adicionar produto&quot;.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {produtos.map((prod) => (
                    <div key={prod.id} className="border border-gray-200 rounded-sm p-4 bg-gray-50/50 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Nome do produto</label>
                            <Input
                              value={prod.nome}
                              onChange={(e) => atualizarProduto(prod.id, { nome: e.target.value.toUpperCase() })}
                              placeholder="Ex: Plano Básico"
                              className="h-9 text-sm border-gray-300 rounded-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Segmentação</label>
                            <Select value={prod.segmentacao} onValueChange={(v) => atualizarProduto(prod.id, { segmentacao: v })}>
                              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SEGMENTACOES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirConfirmExcluirProduto(prod)}
                          className="h-9 px-2 border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {(["Enfermaria", "Apartamento"] as const).map((tipo) => {
                          const faixas = tipo === "Enfermaria" ? prod.faixasEnfermaria : prod.faixasApartamento
                          return (
                            <div key={tipo} className="border border-gray-200 rounded-sm p-4 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Preços por faixa etária — {tipo}</span>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => adicionarFaixasPadrao(prod.id, tipo)} className="h-8 text-xs border-gray-300 rounded-sm">
                                    Preencher faixas padrão
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => adicionarFaixa(prod.id, tipo)} className="h-8 text-xs border-gray-300 rounded-sm">
                                    <Plus className="h-3 w-3 mr-1" /> Adicionar faixa
                                  </Button>
                                </div>
                              </div>
                              {faixas.length === 0 ? (
                                <p className="text-xs text-gray-500 py-2">Nenhuma faixa para {tipo}.</p>
                              ) : (
                                <div className="border border-gray-200 rounded-sm overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-100/80">
                                        <TableHead className="h-9 text-xs">Faixa etária</TableHead>
                                        <TableHead className="h-9 text-xs">Valor (R$)</TableHead>
                                        <TableHead className="h-9 text-xs w-[80px]">Ações</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {faixas.map((f, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="py-1">
                                            <Input
                                              value={f.faixa_etaria}
                                              onChange={(e) => atualizarFaixa(prod.id, tipo, idx, { faixa_etaria: e.target.value })}
                                              className="h-8 text-sm border-gray-300 rounded-sm"
                                            />
                                          </TableCell>
                                          <TableCell className="py-1">
                                            <Input
                                              value={f.valor}
                                              onChange={(e) => atualizarFaixa(prod.id, tipo, idx, { valor: e.target.value })}
                                              placeholder="0,00"
                                              className="h-8 text-sm border-gray-300 rounded-sm"
                                            />
                                          </TableCell>
                                          <TableCell className="py-1">
                                            <Button variant="ghost" size="sm" onClick={() => abrirConfirmExcluirFaixa(prod, tipo, idx)} className="h-8 w-8 p-0 text-red-500">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ModalConfirmacaoExclusao
        open={confirmExcluirOpen}
        onOpenChange={(open) => { setConfirmExcluirOpen(open); if (!open) setExcluirContexto(null) }}
        titulo={excluirContexto?.tipo === "produto" ? "Remover produto" : "Remover faixa etária"}
        descricao={excluirContexto
          ? excluirContexto.tipo === "produto"
            ? `Tem certeza que deseja remover o produto${excluirContexto.nome ? ` "${excluirContexto.nome}"` : ""} da lista?`
            : `Tem certeza que deseja remover esta faixa (${excluirContexto.tipoAcomodacao})${excluirContexto.produtoNome ? ` do produto "${excluirContexto.produtoNome}"` : ""}?`
          : ""}
        textoConfirmar={excluirContexto?.tipo === "produto" ? "Remover produto" : "Remover faixa"}
        onConfirm={confirmarExclusao}
      />
    </div>
  )
}
