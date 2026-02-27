"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import type { AdministradoraFinanceira } from "@/services/financeiras-service"

export default function EditarFinanceiraPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    instituicao_financeira: "asaas",
    api_key: "",
    api_token: "",
    ambiente: "producao",
    status_integracao: "inativa",
  })

  const administradora = getAdministradoraLogada()
  const administradoraId = administradora?.id

  useEffect(() => {
    if (!administradoraId || !id) return
    ;(async () => {
      try {
        const res = await fetch(
          `/api/administradora/financeiras/${id}?administradora_id=${encodeURIComponent(administradoraId)}`
        )
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Empresa financeira não encontrada")
            router.push("/administradora/financeiras")
            return
          }
          throw new Error("Erro ao carregar")
        }
        const data: AdministradoraFinanceira = await res.json()
        setForm({
          nome: data.nome,
          instituicao_financeira: data.instituicao_financeira || "asaas",
          api_key: data.api_key || "",
          api_token: data.api_token || "",
          ambiente: data.ambiente || "producao",
          status_integracao: data.status_integracao || "inativa",
        })
      } catch {
        toast.error("Erro ao carregar empresa financeira")
        router.push("/administradora/financeiras")
      } finally {
        setLoading(false)
      }
    })()
  }, [administradoraId, id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!administradoraId) return
    if (!form.nome.trim()) {
      toast.error("Informe o nome da empresa financeira")
      return
    }
    try {
      setSaving(true)
      const payload: Record<string, unknown> = {
        administradora_id: administradoraId,
        nome: form.nome.trim(),
        instituicao_financeira: form.instituicao_financeira,
        ambiente: form.ambiente,
      }
      if (form.api_key.trim()) payload.api_key = form.api_key
      if (form.api_token.trim()) payload.api_token = form.api_token
      const res = await fetch(`/api/administradora/financeiras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao salvar")
      }
      toast.success("Empresa financeira atualizada")
      router.push("/administradora/financeiras")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (!administradoraId) {
    router.push("/administradora/login")
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button
          variant="ghost"
          className="font-bold mb-2"
          onClick={() => router.push("/administradora/financeiras")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold text-gray-800">Editar empresa financeira</h1>
        <p className="text-sm text-gray-500 mt-0.5">Altere os dados da conexão com o gateway.</p>
      </div>

      <div className="px-6 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Asaas Produção"
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instituição financeira
                </label>
                <Select
                  value={form.instituicao_financeira}
                  onValueChange={(v) => setForm({ ...form, instituicao_financeira: v })}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <Input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="Deixe em branco para não alterar"
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token (opcional)
                </label>
                <Input
                  type="password"
                  value={form.api_token}
                  onChange={(e) => setForm({ ...form, api_token: e.target.value })}
                  placeholder="Token adicional"
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
                <Select
                  value={form.ambiente}
                  onValueChange={(v: string) => setForm({ ...form, ambiente: v })}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/administradora/financeiras")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
