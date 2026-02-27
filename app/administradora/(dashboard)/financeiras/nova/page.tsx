"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

export default function NovaFinanceiraPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    instituicao_financeira: "asaas",
    api_key: "",
    api_token: "",
    ambiente: "producao",
  })

  const administradora = getAdministradoraLogada()
  const administradoraId = administradora?.id

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!administradoraId) {
      toast.error("Sessão inválida")
      return
    }
    if (!form.nome.trim()) {
      toast.error("Informe o nome da empresa financeira")
      return
    }
    try {
      setSaving(true)
      const res = await fetch("/api/administradora/financeiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          nome: form.nome.trim(),
          instituicao_financeira: form.instituicao_financeira,
          api_key: form.api_key || undefined,
          api_token: form.api_token || undefined,
          ambiente: form.ambiente,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao salvar")
      }
      toast.success("Empresa financeira cadastrada")
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
        <h1 className="text-xl font-semibold text-gray-800">Nova empresa financeira</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure a conexão com o gateway de pagamento para geração de boletos.
        </p>
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
                  placeholder="Chave da API"
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
