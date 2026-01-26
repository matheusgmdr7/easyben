"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Save, Users, Package } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { buscarCorretores } from "@/services/corretores-service"
import { obterProdutosCorretores } from "@/services/produtos-corretores-service"
import type { Corretor } from "@/types/corretores"
import type { ProdutoCorretor } from "@/types/corretores"
import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

interface AutorizacaoProduto {
  produto_id: string | number
  corretor_id: string | number
}

export default function AutorizacaoPage() {
  const [produtos, setProdutos] = useState<ProdutoCorretor[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("")
  const [autorizacoes, setAutorizacoes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (produtoSelecionado) {
      carregarAutorizacoes(produtoSelecionado)
    } else {
      setAutorizacoes(new Set())
    }
  }, [produtoSelecionado])

  async function carregarDados() {
    try {
      setLoading(true)
      const [produtosData, corretoresData] = await Promise.all([
        obterProdutosCorretores(),
        buscarCorretores(),
      ])
      setProdutos(produtosData)
      setCorretores(corretoresData.filter((c) => c.ativo))
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  async function carregarAutorizacoes(produtoId: string) {
    try {
      const tenantId = await getCurrentTenantId()
      const { data, error } = await supabase
        .from("produto_corretor_autorizacao")
        .select("corretor_id")
        .eq("produto_id", produtoId)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("Erro ao carregar autorizações:", error)
        return
      }

      const autorizados = new Set(data?.map((a) => String(a.corretor_id)) || [])
      setAutorizacoes(autorizados)
    } catch (error) {
      console.error("Erro ao carregar autorizações:", error)
    }
  }

  async function salvarAutorizacoes() {
    if (!produtoSelecionado) {
      toast.error("Selecione um produto primeiro")
      return
    }

    try {
      setSaving(true)
      const tenantId = await getCurrentTenantId()

      // Remover todas as autorizações existentes para este produto
      await supabase
        .from("produto_corretor_autorizacao")
        .delete()
        .eq("produto_id", produtoSelecionado)
        .eq("tenant_id", tenantId)

      // Inserir novas autorizações
      if (autorizacoes.size > 0) {
        const autorizacoesParaInserir = Array.from(autorizacoes).map((corretorId) => ({
          produto_id: produtoSelecionado,
          corretor_id: corretorId,
          tenant_id: tenantId,
        }))

        const { error } = await supabase
          .from("produto_corretor_autorizacao")
          .insert(autorizacoesParaInserir)

        if (error) {
          throw error
        }
      }

      toast.success("Autorizações salvas com sucesso!")
    } catch (error: any) {
      console.error("Erro ao salvar autorizações:", error)
      toast.error(`Erro ao salvar autorizações: ${error.message || "Erro desconhecido"}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleAutorizacao = (corretorId: string) => {
    const novasAutorizacoes = new Set(autorizacoes)
    if (novasAutorizacoes.has(corretorId)) {
      novasAutorizacoes.delete(corretorId)
    } else {
      novasAutorizacoes.add(corretorId)
    }
    setAutorizacoes(novasAutorizacoes)
  }

  const corretoresFiltrados = corretores.filter((corretor) =>
    corretor.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    corretor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autorização de Produtos"
        description="Selecione quais corretores estão autorizados a terem acesso a determinados produtos"
        icon={Package}
      />

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Produto</CardTitle>
          <CardDescription>
            Escolha o produto para gerenciar as autorizações dos corretores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {produtos.map((produto) => (
                <SelectItem key={produto.id} value={String(produto.id)}>
                  {produto.nome} {produto.operadora && `- ${produto.operadora}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {produtoSelecionado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Corretores Autorizados</CardTitle>
                <CardDescription>
                  Selecione os corretores que terão acesso a este produto
                </CardDescription>
              </div>
              <Button
                onClick={salvarAutorizacoes}
                disabled={saving}
                className="bg-[#0F172A] hover:bg-[#1E293B]"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Autorizações"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar corretores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {corretoresFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum corretor encontrado
                </div>
              ) : (
                corretoresFiltrados.map((corretor) => (
                  <div
                    key={corretor.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`corretor-${corretor.id}`}
                      checked={autorizacoes.has(String(corretor.id))}
                      onCheckedChange={() => toggleAutorizacao(String(corretor.id))}
                    />
                    <Label
                      htmlFor={`corretor-${corretor.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{corretor.nome}</div>
                      <div className="text-sm text-gray-500">{corretor.email}</div>
                    </Label>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <strong>{autorizacoes.size}</strong> de <strong>{corretores.length}</strong> corretores
                autorizados
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}









