"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ModalConfirmacaoExclusao } from "@/components/administradora/modal-confirmacao-exclusao"
import { Search, Check, Plus, Trash2, Package, ImagePlus, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// --- Tipos e constantes da aba Produtos ---
interface FaixaEtaria {
  faixa_etaria: string
  valor: string
}

interface ProdutoContrato {
  id: string
  nome: string
  segmentacao: string
  acomodacao: string
  faixas: FaixaEtaria[]
}

const SEGMENTACOES = [
  { value: "Padrão", label: "Padrão" },
  { value: "Adesão", label: "Adesão" },
  { value: "Individual", label: "Individual" },
  { value: "Familiar", label: "Familiar" },
  { value: "Empresarial", label: "Empresarial" },
  { value: "Coletivo", label: "Coletivo" },
]

const ACOMODACOES = [
  { value: "Enfermaria", label: "Enfermaria" },
  { value: "Apartamento", label: "Apartamento" },
  { value: "Coletivo", label: "Coletivo" },
]

const FAIXAS_PADRAO = ["0-18", "19-23", "24-28", "29-33", "34-38", "39-43", "44-48", "49-53", "54-58", "59+"]

export default function NovoContratoPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dados")
  const [loading, setLoading] = useState(false)
  const [cnpjBusca, setCnpjBusca] = useState("")
  const [buscandoOperadora, setBuscandoOperadora] = useState(false)

  // Formulário
  const [formData, setFormData] = useState({
    operadora_id: "" as string,
    cnpj_operadora: "",
    razao_social: "",
    nome_fantasia: "",
    logo: "",
    descricao: "",
    numero: "",
    observacao: "",
  })

  const [uploadLogoLoading, setUploadLogoLoading] = useState(false)
  const [produtos, setProdutos] = useState<ProdutoContrato[]>([])
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [excluirContexto, setExcluirContexto] = useState<{ tipo: "produto"; id: string; nome?: string } | { tipo: "faixa"; produtoId: string; produtoNome?: string; index: number } | null>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLogoLoading(true)
    try {
      const fd = new FormData()
      fd.append("logo", file)
      const res = await fetch("/api/administradora/upload-logo", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erro no upload")
      setFormData((prev) => ({ ...prev, logo: json.url }))
      toast.success("Logo enviado.")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar logo")
    } finally {
      setUploadLogoLoading(false)
      e.target.value = ""
    }
  }

  async function buscarOperadoraPorCNPJ() {
    const cnpj = cnpjBusca?.trim() || ""
    if (!cnpj) {
      toast.error("Digite um CNPJ para buscar")
      return
    }
    const cnpjLimpo = cnpj.replace(/\D/g, "")
    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ deve conter 14 dígitos")
      return
    }

    setBuscandoOperadora(true)
    try {
      const res = await fetch(
        "/api/administradora/buscar-operadora-por-cnpj?cnpj=" + encodeURIComponent(cnpj)
      )
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setFormData((prev) => ({
          ...prev,
          operadora_id: json.id ?? "",
          cnpj_operadora: json.cnpj ?? cnpjLimpo,
          razao_social: json.nome ?? "",
          nome_fantasia: json.fantasia ?? "",
        }))
        toast.success("Operadora encontrada")
      } else {
        // 404: operadora não existe; preenche o CNPJ, limpa nome/fantasia e orienta a cadastrar na própria página
        setFormData((prev) => ({
          ...prev,
          operadora_id: "",
          cnpj_operadora: cnpjLimpo,
          razao_social: "",
          nome_fantasia: "",
        }))
        toast.info(json?.error || "Operadora não encontrada. Preencha os dados e salve para cadastrar.")
      }
    } catch (error) {
      console.error("Erro ao buscar operadora:", error)
      toast.error("Erro ao buscar operadora. Tente novamente.")
    } finally {
      setBuscandoOperadora(false)
    }
  }

  function adicionarProduto() {
    setProdutos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: "", segmentacao: "Padrão", acomodacao: "Enfermaria", faixas: [] },
    ])
  }

  function removerProduto(id: string) {
    setProdutos((prev) => prev.filter((p) => p.id !== id))
  }

  function abrirConfirmExcluirProduto(prod: ProdutoContrato) {
    setExcluirContexto({ tipo: "produto", id: prod.id, nome: prod.nome || undefined })
    setConfirmExcluirOpen(true)
  }

  function abrirConfirmExcluirFaixa(prod: ProdutoContrato, index: number) {
    setExcluirContexto({ tipo: "faixa", produtoId: prod.id, produtoNome: prod.nome || undefined, index })
    setConfirmExcluirOpen(true)
  }

  function confirmarExclusao() {
    if (!excluirContexto) return
    if (excluirContexto.tipo === "produto") removerProduto(excluirContexto.id)
    else removerFaixa(excluirContexto.produtoId, excluirContexto.index)
    setConfirmExcluirOpen(false)
    setExcluirContexto(null)
  }

  function atualizarProduto(id: string, dados: Partial<Pick<ProdutoContrato, "nome" | "segmentacao" | "acomodacao">>) {
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ...dados } : p)))
  }

  function adicionarFaixa(produtoId: string) {
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, faixas: [...p.faixas, { faixa_etaria: "", valor: "" }] } : p))
    )
  }

  function adicionarFaixasPadrao(produtoId: string) {
    setProdutos((prev) =>
      prev.map((p) =>
        p.id === produtoId
          ? { ...p, faixas: FAIXAS_PADRAO.map((f) => ({ faixa_etaria: f, valor: "" })) }
          : p
      )
    )
  }

  function removerFaixa(produtoId: string, index: number) {
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, faixas: p.faixas.filter((_, i) => i !== index) } : p))
    )
  }

  function atualizarFaixa(produtoId: string, index: number, dados: Partial<FaixaEtaria>) {
    setProdutos((prev) =>
      prev.map((p) =>
        p.id === produtoId
          ? { ...p, faixas: p.faixas.map((f, i) => (i === index ? { ...f, ...dados } : f)) }
          : p
      )
    )
  }

  async function salvarContrato() {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      toast.error("Faça login como administradora para salvar o contrato")
      router.push("/administradora/login")
      return
    }

    try {
      setLoading(true)

      // Validações
      if (!formData.cnpj_operadora) {
        toast.error("CNPJ da Operadora é obrigatório")
        return
      }
      if (!formData.razao_social) {
        toast.error("Razão Social é obrigatória")
        return
      }
      if (!formData.nome_fantasia) {
        toast.error("Nome Fantasia é obrigatório")
        return
      }
      if (!formData.descricao) {
        toast.error("Descrição é obrigatória")
        return
      }
      if (!formData.numero) {
        toast.error("Número é obrigatório")
        return
      }

      const payload = {
        administradora_id: adm.id,
        operadora_id: formData.operadora_id || null,
        cnpj_operadora: formData.cnpj_operadora,
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia,
        logo: formData.logo || null,
        descricao: formData.descricao,
        numero: formData.numero,
        observacao: formData.observacao || null,
        produtos: produtos
          .filter((p) => (p.nome || "").trim())
          .map((p) => ({
            nome: p.nome.trim(),
            segmentacao: p.segmentacao,
            acomodacao: p.acomodacao,
            faixas: p.faixas.map((f) => ({
              faixa_etaria: f.faixa_etaria,
              valor: f.valor,
            })),
          })),
      }

      const res = await fetch("/api/administradora/contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar contrato")
      }

      toast.success("Contrato criado com sucesso!")
      router.push("/administradora/contrato/pesquisar")
    } catch (error: unknown) {
      console.error("Erro ao salvar contrato:", error)
      toast.error("Erro ao salvar contrato: " + (error instanceof Error ? error.message : "Erro desconhecido"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Cadastrar Contrato</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/administradora/contrato/pesquisar")}
            variant="outline"
            className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button
            onClick={() => router.push("/administradora/contrato/novo")}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <span>+</span>
            Novo
          </Button>
        </div>
      </div>

      {/* Conteúdo com Abas */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white border border-gray-200 rounded-sm">
            <TabsTrigger 
              value="dados" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-sm"
            >
              Dados
            </TabsTrigger>
            <TabsTrigger 
              value="produtos"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-sm"
            >
              Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
              {/* Campos do formulário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    CNPJ da Operadora <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <Input
                      value={cnpjBusca}
                      onChange={(e) => setCnpjBusca(e.target.value)}
                      placeholder="Digite o CNPJ"
                      className="h-9 text-sm border-gray-300 rounded-sm flex-1"
                    />
                    <Button
                      onClick={buscarOperadoraPorCNPJ}
                      size="sm"
                      className="h-9 px-2 bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                      title="Buscar"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Razão Social <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value.toUpperCase() })}
                    placeholder="Razão Social"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Nome Fantasia <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value.toUpperCase() })}
                    placeholder="Nome Fantasia"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Logo da operadora</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                        disabled={uploadLogoLoading}
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-gray-300 rounded-sm cursor-pointer hover:bg-gray-50"
                      >
                        <ImagePlus className="h-4 w-4 text-gray-500" />
                        {uploadLogoLoading ? "Enviando..." : "Enviar imagem"}
                      </label>
                      {formData.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setFormData((p) => ({ ...p, logo: "" }))}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>
                    {formData.logo && (
                      <div className="mt-1">
                        <img
                          src={formData.logo}
                          alt="Preview do logo"
                          className="h-16 object-contain border border-gray-200 rounded-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">A URL da imagem será salva ao cadastrar o contrato.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                    placeholder="Descrição"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value.toUpperCase() })}
                    placeholder="Número"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Observação</label>
                  <Textarea
                    value={formData.observacao}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length <= 500) {
                        setFormData({ ...formData, observacao: value.toUpperCase() })
                      }
                    }}
                    placeholder="Observação"
                    className="min-h-[100px] text-sm border-gray-300 rounded-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Restam {500 - formData.observacao.length} caracteres.
                  </p>
                </div>
              </div>

              {/* Botão Salvar no final */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={salvarContrato}
                  disabled={loading}
                  className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Produtos vinculados ao contrato com nome, segmentação, acomodação e preços por faixa etária.</p>
                <Button
                  onClick={adicionarProduto}
                  className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar produto
                </Button>
              </div>

              {produtos.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-sm p-8 text-center">
                  <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Nenhum produto adicionado.</p>
                  <p className="text-xs text-gray-400 mt-1">Clique em &quot;Adicionar produto&quot; para começar.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {produtos.map((prod) => (
                    <div
                      key={prod.id}
                      className="border border-gray-200 rounded-sm p-4 bg-gray-50/50 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
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
                            <Select
                              value={prod.segmentacao}
                              onValueChange={(v) => atualizarProduto(prod.id, { segmentacao: v })}
                            >
                              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SEGMENTACOES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Acomodação</label>
                            <Select
                              value={prod.acomodacao}
                              onValueChange={(v) => atualizarProduto(prod.id, { acomodacao: v })}
                            >
                              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACOMODACOES.map((a) => (
                                  <SelectItem key={a.value} value={a.value}>
                                    {a.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirConfirmExcluirProduto(prod)}
                          className="h-9 px-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shrink-0"
                          title="Remover produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Preços por faixa etária</span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adicionarFaixasPadrao(prod.id)}
                              className="h-8 text-xs border-gray-300 rounded-sm"
                            >
                              Preencher faixas padrão
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adicionarFaixa(prod.id)}
                              className="h-8 text-xs border-gray-300 rounded-sm"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionar faixa
                            </Button>
                          </div>
                        </div>
                        {prod.faixas.length === 0 ? (
                          <p className="text-xs text-gray-500 py-2">Nenhuma faixa. Use &quot;Preencher faixas padrão&quot; ou &quot;Adicionar faixa&quot;.</p>
                        ) : (
                          <div className="border border-gray-200 rounded-sm overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-gray-200 bg-gray-100/80">
                                  <TableHead className="h-9 text-xs font-medium">Faixa etária</TableHead>
                                  <TableHead className="h-9 text-xs font-medium">Valor (R$)</TableHead>
                                  <TableHead className="h-9 text-xs font-medium w-[80px]">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {prod.faixas.map((f, idx) => (
                                  <TableRow key={idx} className="border-gray-200">
                                    <TableCell className="py-1">
                                      <Input
                                        value={f.faixa_etaria}
                                        onChange={(e) => atualizarFaixa(prod.id, idx, { faixa_etaria: e.target.value })}
                                        placeholder="Ex: 0-18 ou 59+"
                                        className="h-8 text-sm border-gray-300 rounded-sm"
                                      />
                                    </TableCell>
                                    <TableCell className="py-1">
                                      <Input
                                        value={f.valor}
                                        onChange={(e) => atualizarFaixa(prod.id, idx, { valor: e.target.value })}
                                        placeholder="0,00"
                                        className="h-8 text-sm border-gray-300 rounded-sm"
                                      />
                                    </TableCell>
                                    <TableCell className="py-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => abrirConfirmExcluirFaixa(prod, idx)}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        title="Remover faixa"
                                      >
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
            : `Tem certeza que deseja remover esta faixa etária${excluirContexto.produtoNome ? ` do produto "${excluirContexto.produtoNome}"` : ""}?`
          : ""}
        textoConfirmar={excluirContexto?.tipo === "produto" ? "Remover produto" : "Remover faixa"}
        onConfirm={confirmarExclusao}
      />
    </div>
  )
}

