"use client"

import { useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, FileText, Loader2 } from "lucide-react"
import {
  SeletorBeneficiarioChamado,
  type BeneficiarioSelecionadoChamado,
} from "@/components/administradora/seletor-beneficiario-chamado"
import type { DadosAutomaticosFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"

const CAMPOS_AUTO_LABEL: Record<keyof DadosAutomaticosFichaAdmissao, string> = {
  nome: "Nome",
  data_nascimento: "Data de nascimento",
  local_nascimento: "Local de nascimento",
  uf_nascimento: "UF",
  cpf: "CPF",
  rg: "RG",
  orgao_emissor: "Órgão emissor",
  endereco_completo: "Endereço completo",
  carteira_trabalho_digital: "Carteira de Trabalho Digital (CPF)",
}

export default function BeneficiariosVinculosPage() {
  const administradora = getAdministradoraLogada()
  const administradoraId = administradora?.id

  const [beneficiario, setBeneficiario] = useState<BeneficiarioSelecionadoChamado | null>(null)
  const [automaticos, setAutomaticos] = useState<DadosAutomaticosFichaAdmissao | null>(null)
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [gerando, setGerando] = useState(false)

  const [opcionais, setOpcionais] = useState({
    data_admissao: "",
    funcao: "",
    salario: "",
    horario_trabalho: "",
    horas_almoco: "",
    estado_civil: "",
    grau_instrucao: "",
    contrato_experiencia: "" as "" | "sim" | "nao",
  })

  async function aoSelecionarBeneficiario(b: BeneficiarioSelecionadoChamado | null) {
    setBeneficiario(b)
    setAutomaticos(null)
    if (!b) return
    if (!b.vida_importada_id) {
      toast.error("Selecione um beneficiário importado (vidas do grupo)")
      setBeneficiario(null)
      return
    }
    if (!administradoraId) return

    try {
      setCarregandoDados(true)
      const params = new URLSearchParams({
        administradora_id: administradoraId,
        vida_importada_id: b.vida_importada_id,
      })
      const res = await fetch(`/api/administradora/beneficiarios/vinculos/dados?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar dados")

      setAutomaticos(data.automaticos)
      setOpcionais((prev) => ({
        ...prev,
        estado_civil: data.sugestoes?.estado_civil || prev.estado_civil,
        grau_instrucao: data.sugestoes?.grau_instrucao || prev.grau_instrucao,
      }))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar dados do beneficiário")
    } finally {
      setCarregandoDados(false)
    }
  }

  function aoAlterarSalario(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, "")
    if (!digitos) {
      setOpcionais({ ...opcionais, salario: "" })
      return
    }
    const formatado = (Number(digitos) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    setOpcionais({ ...opcionais, salario: formatado })
  }

  async function gerarPdf() {
    if (!administradoraId || !beneficiario?.vida_importada_id) {
      toast.error("Selecione um beneficiário")
      return
    }

    try {
      setGerando(true)
      const res = await fetch("/api/administradora/beneficiarios/vinculos/gerar-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          vida_importada_id: beneficiario.vida_importada_id,
          ...opcionais,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Erro ao gerar PDF")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ficha-admissao-${beneficiario.nome.replace(/\s+/g, "-")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("PDF gerado com sucesso")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF")
    } finally {
      setGerando(false)
    }
  }

  if (!administradoraId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Vínculos — Ficha de admissão</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gere a ficha APTI preenchida com os dados do beneficiário e campos opcionais.
        </p>
      </div>

      <div className="px-6 py-6 max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Beneficiário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SeletorBeneficiarioChamado
              administradoraId={administradoraId}
              value={beneficiario}
              onChange={aoSelecionarBeneficiario}
            />
            {carregandoDados && (
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando dados do cadastro...
              </p>
            )}
          </CardContent>
        </Card>

        {automaticos && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do cadastro (automáticos)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {(Object.keys(CAMPOS_AUTO_LABEL) as Array<keyof DadosAutomaticosFichaAdmissao>).map(
                (chave) => (
                  <div key={chave}>
                    <p className="text-gray-500 text-xs">{CAMPOS_AUTO_LABEL[chave]}</p>
                    <p className="font-medium text-gray-800 break-words">
                      {automaticos[chave] || "—"}
                    </p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos opcionais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Data de admissão</Label>
              <Input
                type="date"
                value={opcionais.data_admissao}
                onChange={(e) => setOpcionais({ ...opcionais, data_admissao: e.target.value })}
              />
            </div>
            <div>
              <Label>Função</Label>
              <Input
                value={opcionais.funcao}
                onChange={(e) => setOpcionais({ ...opcionais, funcao: e.target.value })}
              />
            </div>
            <div>
              <Label>Salário</Label>
              <Input
                inputMode="numeric"
                placeholder="0,00"
                value={opcionais.salario}
                onChange={aoAlterarSalario}
              />
            </div>
            <div>
              <Label>Horário de trabalho</Label>
              <Input
                value={opcionais.horario_trabalho}
                onChange={(e) => setOpcionais({ ...opcionais, horario_trabalho: e.target.value })}
              />
            </div>
            <div>
              <Label>Horas de almoço</Label>
              <Input
                value={opcionais.horas_almoco}
                onChange={(e) => setOpcionais({ ...opcionais, horas_almoco: e.target.value })}
              />
            </div>
            <div>
              <Label>Estado civil</Label>
              <Input
                value={opcionais.estado_civil}
                onChange={(e) => setOpcionais({ ...opcionais, estado_civil: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Grau de instrução</Label>
              <Input
                value={opcionais.grau_instrucao}
                onChange={(e) => setOpcionais({ ...opcionais, grau_instrucao: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Contrato de experiência</Label>
              <Select
                value={opcionais.contrato_experiencia || "__vazio__"}
                onValueChange={(v) =>
                  setOpcionais({
                    ...opcionais,
                    contrato_experiencia: v === "__vazio__" ? "" : (v as "sim" | "nao"),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Não marcar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__vazio__">Não marcar</SelectItem>
                  <SelectItem value="sim">SIM</SelectItem>
                  <SelectItem value="nao">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={gerarPdf}
          disabled={!beneficiario?.vida_importada_id || gerando || carregandoDados}
          className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
        >
          {gerando ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Gerar e baixar PDF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
