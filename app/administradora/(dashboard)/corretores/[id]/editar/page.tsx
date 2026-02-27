"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"
import type { CorretorAdministradora } from "@/services/corretores-administradora-service"

export default function EditarCorretorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    ativo: true,
  })

  const administradora = getAdministradoraLogada()
  const administradoraId = administradora?.id

  useEffect(() => {
    if (!administradoraId || !id) return
    ;(async () => {
      try {
        const res = await fetch(
          `/api/administradora/corretores/${id}?administradora_id=${encodeURIComponent(administradoraId)}`
        )
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Corretor não encontrado")
            router.push("/administradora/corretores")
            return
          }
          throw new Error("Erro ao carregar")
        }
        const data: CorretorAdministradora = await res.json()
        setForm({
          nome: data.nome,
          email: data.email || "",
          telefone: data.telefone || "",
          ativo: data.ativo ?? true,
        })
      } catch {
        toast.error("Erro ao carregar corretor")
        router.push("/administradora/corretores")
      } finally {
        setLoading(false)
      }
    })()
  }, [administradoraId, id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!administradoraId) return
    if (!form.nome.trim()) {
      toast.error("Informe o nome do corretor")
      return
    }
    try {
      setSaving(true)
      const res = await fetch(`/api/administradora/corretores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          nome: form.nome.trim(),
          email: form.email.trim() || undefined,
          telefone: form.telefone.trim() || undefined,
          ativo: form.ativo,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao salvar")
      }
      toast.success("Corretor atualizado")
      router.push("/administradora/corretores")
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
          onClick={() => router.push("/administradora/corretores")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold text-gray-800">Editar corretor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Altere os dados do corretor.</p>
      </div>

      <div className="px-6 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do corretor</CardTitle>
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
                  placeholder="Nome completo"
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="border-gray-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Corretor ativo
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/administradora/corretores")}
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
