"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const FAIXAS_ETARIAS: FaixaEtaria[] = [
  "0-18",
  "19-23",
  "24-28",
  "29-33",
  "34-38",
  "39-43",
  "44-48",
  "49-53",
  "54-58",
  "59+",
]

export default function PlanosAdminPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoAtual, setPlanoAtual] = useState<Partial<Plano>>({
    id: 0,
    nome: "",
    operadora: "",
    cobertura: "",
    tipo: "",
    descricao: "",
  })
  const [precos, setPrecos] = useState<{ faixa_etaria: FaixaEtaria; preco: number }[]>(
    FAIXAS_ETARIAS.map((faixa) => ({ faixa_etaria: faixa, preco: 0 })),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregarPlanos()
  }, [])

  async function carregarPlanos() {
    setCarregando(true)
    setErro(null)

    try {
      // Remover import e uso de buscarPlanos, criarPlano, atualizarPlano, deletarPlano do planos-service antigo
    } catch (error) {
      console.error("Erro ao carregar planos:", error)
      setErro("Falha ao carregar os planos. Por favor, tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  const handleAddPlano = () => {
    setIsEditing(false)
    setPlanoAtual({
      nome: "",
      operadora: "",
      cobertura: "",
      tipo: "",
      descricao: "",
    })
    setPrecos(FAIXAS_ETARIAS.map((faixa) => ({ faixa_etaria: faixa, preco: 0 })))
    setIsDialogOpen(true)
  }

  const handleEditPlano = (plano: Plano) => {
    setIsEditing(true)
    setPlanoAtual(plano)
    // Aqui você precisaria carregar os preços do plano
    setIsDialogOpen(true)
  }

  const handleDeletePlano = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este plano?")) {
      try {
        // Remover import e uso de deletarPlano do planos-service antigo
      } catch (error) {
        console.error("Erro ao excluir plano:", error)
        alert("Erro ao excluir plano. Por favor, tente novamente.")
      }
    }
  }

  const handleSavePlano = async () => {
    try {
      setCarregando(true)
      setErro(null)

      // Validar campos obrigatórios
      if (!planoAtual.nome || !planoAtual.operadora || !planoAtual.cobertura || !planoAtual.tipo) {
        setErro("Por favor, preencha todos os campos obrigatórios.")
        return
      }

      // Validar preços
      if (precos.some((preco) => preco.preco <= 0)) {
        setErro("Por favor, preencha todos os preços com valores maiores que zero.")
        return
      }

      const planoComPrecos = {
        ...planoAtual,
        precos,
      }

      if (isEditing && planoAtual.id) {
        // Remover import e uso de atualizarPlano do planos-service antigo
      } else {
        // Remover import e uso de criarPlano do planos-service antigo
      }

      await carregarPlanos()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao salvar plano:", error)
      setErro(error instanceof Error ? error.message : "Erro ao salvar plano. Por favor, tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  const planosFiltrados = planos.filter((plano) => {
    const matchSearch =
      plano.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plano.operadora.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = filtroTipo === "Todos" || plano.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciar Planos</h1>
        <Button onClick={handleAddPlano}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input placeholder="Buscar planos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Família">Família</SelectItem>
                <SelectItem value="Empresarial">Empresarial</SelectItem>
                <SelectItem value="Adesão">Adesão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {carregando ? (
            <div className="text-center py-4">Carregando planos...</div>
          ) : erro ? (
            <div className="text-center py-4 text-red-500">{erro}</div>
          ) : planosFiltrados.length === 0 ? (
            <div className="text-center py-4">Nenhum plano encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Operadora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planosFiltrados.map((plano) => (
                  <TableRow key={plano.id}>
                    <TableCell>{plano.nome}</TableCell>
                    <TableCell>{plano.operadora}</TableCell>
                    <TableCell>{plano.tipo}</TableCell>
                    <TableCell>{plano.cobertura}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditPlano(plano)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeletePlano(plano.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Edite as informações do plano abaixo." : "Preencha as informações do novo plano abaixo."}
            </DialogDescription>
          </DialogHeader>

          {erro && <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">{erro}</div>}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="font-semibold">Nome do Plano *</Label>
                <Input
                  id="nome"
                  value={planoAtual.nome}
                  onChange={(e) => setPlanoAtual({ ...planoAtual, nome: e.target.value })}
                  placeholder="Ex: Plano Premium"
                  required
                  className="border-2 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operadora" className="font-semibold">Operadora *</Label>
                <Input
                  id="operadora"
                  value={planoAtual.operadora}
                  onChange={(e) => setPlanoAtual({ ...planoAtual, operadora: e.target.value })}
                  placeholder="Ex: Unimed"
                  required
                  className="border-2 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo" className="font-semibold">Tipo *</Label>
                <Select
                  value={planoAtual.tipo}
                  onValueChange={(value) => setPlanoAtual({ ...planoAtual, tipo: value })}
                >
                  <SelectTrigger id="tipo" className="border-2 border-gray-300">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Família">Família</SelectItem>
                    <SelectItem value="Empresarial">Empresarial</SelectItem>
                    <SelectItem value="Adesão">Adesão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cobertura" className="font-semibold">Cobertura *</Label>
                <Input
                  id="cobertura"
                  value={planoAtual.cobertura}
                  onChange={(e) => setPlanoAtual({ ...planoAtual, cobertura: e.target.value })}
                  placeholder="Ex: Nacional"
                  required
                  className="border-2 border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="font-semibold">Descrição</Label>
              <Textarea
                id="descricao"
                value={planoAtual.descricao}
                onChange={(e) => setPlanoAtual({ ...planoAtual, descricao: e.target.value })}
                placeholder="Descreva os detalhes e benefícios do plano"
                rows={4}
                className="border-2 border-gray-300"
              />
            </div>

            <div className="space-y-4">
              <Label className="font-semibold">Preços por Faixa Etária *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {precos.map((preco) => (
                  <div key={preco.faixa_etaria} className="space-y-2">
                    <Label htmlFor={`preco-${preco.faixa_etaria}`} className="text-sm font-semibold">
                      {preco.faixa_etaria} anos
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                      <Input
                        id={`preco-${preco.faixa_etaria}`}
                        type="text"
                        inputMode="numeric"
                        value={preco.preco === 0 ? "" : preco.preco.toString().replace(".", ",")}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d,]/g, "")
                          const numericValue = Number.parseFloat(value.replace(",", ".")) || 0
                          setPrecos(
                            precos.map((p) =>
                              p.faixa_etaria === preco.faixa_etaria ? { ...p, preco: numericValue } : p,
                            ),
                          )
                        }}
                        className="border-2 border-gray-300 pl-8"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlano} disabled={carregando}>
              {carregando ? "Salvando..." : isEditing ? "Salvar Alterações" : "Adicionar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
