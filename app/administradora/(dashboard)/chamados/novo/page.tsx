"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAdministradoraLogada,
  getUsuarioAdministradoraLogado,
} from "@/services/auth-administradoras-service"
import { ASSUNTOS_CHAMADO } from "@/services/chamados-administradora-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import {
  SeletorBeneficiarioChamado,
  type BeneficiarioSelecionadoChamado,
} from "@/components/administradora/seletor-beneficiario-chamado"

export default function NovoChamadoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [beneficiario, setBeneficiario] = useState<BeneficiarioSelecionadoChamado | null>(null)
  const [assuntoCodigo, setAssuntoCodigo] = useState("")
  const [queixa, setQueixa] = useState("")

  const administradora = getAdministradoraLogada()
  const usuario = getUsuarioAdministradoraLogado()
  const administradoraId = administradora?.id

  const assuntoSelecionado = ASSUNTOS_CHAMADO.find((a) => a.id === assuntoCodigo)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!administradoraId) {
      toast.error("Sessão inválida")
      return
    }
    if (!beneficiario) {
      toast.error("Selecione um beneficiário ativo")
      return
    }
    if (!assuntoCodigo) {
      toast.error("Selecione o assunto do chamado")
      return
    }
    if (!queixa.trim()) {
      toast.error("Descreva a queixa do cliente")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/administradora/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          grupo_id: beneficiario.grupo_id,
          grupo_nome: beneficiario.grupo_nome,
          beneficiario_origem: beneficiario.origem,
          vida_importada_id: beneficiario.vida_importada_id,
          cliente_administradora_id: beneficiario.cliente_administradora_id,
          cliente_nome: beneficiario.nome,
          cliente_cpf: beneficiario.cpf,
          cliente_telefone: beneficiario.telefone || undefined,
          cliente_email: beneficiario.email || undefined,
          assunto_codigo: assuntoCodigo,
          queixa: queixa.trim(),
          aberto_por_usuario_id: usuario?.id ?? null,
          aberto_por_nome: usuario?.nome || administradora?.nome || administradora?.email,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao salvar")
      }
      const data = await res.json()
      toast.success("Chamado aberto com sucesso")
      router.push(`/administradora/chamados/${data.id}`)
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
          onClick={() => router.push("/administradora/chamados")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold text-gray-800">Abrir chamado</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Busque o beneficiário, escolha o assunto e descreva a queixa.
        </p>
      </div>

      <div className="px-6 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do chamado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beneficiário <span className="text-red-500">*</span>
                </label>
                <SeletorBeneficiarioChamado
                  administradoraId={administradoraId}
                  value={beneficiario}
                  onChange={setBeneficiario}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <Select value={assuntoCodigo} onValueChange={setAssuntoCodigo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo do chamado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSUNTOS_CHAMADO.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assuntoSelecionado && (
                  <p className="text-xs text-gray-500 mt-1.5">{assuntoSelecionado.descricao}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Queixa / descrição <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={queixa}
                  onChange={(e) => setQueixa(e.target.value)}
                  placeholder={
                    assuntoCodigo === "outros"
                      ? "Descreva o motivo do chamado com o máximo de detalhes possível..."
                      : "Descreva em detalhes o que o cliente relatou..."
                  }
                  rows={6}
                  className="border-gray-300"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/administradora/chamados")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !beneficiario || !assuntoCodigo}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
                >
                  {saving ? (
                    "Abrindo..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Abrir chamado
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
