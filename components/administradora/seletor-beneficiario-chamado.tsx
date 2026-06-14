"use client"

import { useCallback, useEffect, useState } from "react"
import type { BeneficiarioChamadoBusca } from "@/services/chamados-administradora-service"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, User, X } from "lucide-react"
import { toast } from "sonner"

export type BeneficiarioSelecionadoChamado = BeneficiarioChamadoBusca

type Props = {
  administradoraId: string
  value: BeneficiarioSelecionadoChamado | null
  onChange: (beneficiario: BeneficiarioSelecionadoChamado | null) => void
}

function formatarCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "")
  if (d.length !== 11) return cpf
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function SeletorBeneficiarioChamado({ administradoraId, value, onChange }: Props) {
  const [busca, setBusca] = useState("")
  const [resultados, setResultados] = useState<BeneficiarioChamadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)

  const pesquisar = useCallback(async () => {
    const termo = busca.trim()
    if (termo.length < 2) {
      toast.info("Digite ao menos 2 caracteres para buscar")
      return
    }

    try {
      setBuscando(true)
      const params = new URLSearchParams({
        administradora_id: administradoraId,
        q: termo,
      })

      const res = await fetch(`/api/administradora/chamados/beneficiarios?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro na busca")

      const lista = Array.isArray(data) ? data : []
      setResultados(lista)
      if (lista.length === 0) {
        toast.info("Nenhum beneficiário ativo encontrado")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar beneficiários")
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }, [administradoraId, busca])

  useEffect(() => {
    if (value) return
    const termo = busca.trim()
    if (termo.length < 2) {
      setResultados([])
      return
    }

    const timer = setTimeout(() => {
      pesquisar()
    }, 400)
    return () => clearTimeout(timer)
  }, [busca, value, pesquisar])

  if (value) {
    return (
      <Card className="border-[#0F172A]/20 bg-slate-50">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{value.nome}</p>
                <p className="text-sm text-gray-600">
                  {value.cpf ? formatarCpf(value.cpf) : "CPF não informado"}
                  {value.tipo ? ` · ${value.tipo}` : ""}
                </p>
                <p className="text-sm text-gray-500">Grupo: {value.grupo_nome}</p>
                {(value.telefone || value.email) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {[value.telefone, value.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              title="Trocar beneficiário"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar por nome ou CPF <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou CPF do beneficiário ativo"
            className="border-gray-300"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                pesquisar()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={pesquisar}
            disabled={buscando}
            className="shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Busca em todos os grupos. Somente beneficiários ativos.
      </p>

      {buscando && <p className="text-sm text-gray-500">Buscando...</p>}

      {!buscando && resultados.length > 0 && (
        <ul className="border border-gray-200 rounded-md divide-y max-h-64 overflow-y-auto bg-white">
          {resultados.map((item) => (
            <li key={item.chave}>
              <button
                type="button"
                className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  onChange(item)
                  setResultados([])
                  setBusca("")
                }}
              >
                <p className="font-medium text-gray-900">{item.nome}</p>
                <p className="text-sm text-gray-600">
                  {item.cpf ? formatarCpf(item.cpf) : "Sem CPF"}
                  {item.tipo ? ` · ${item.tipo}` : ""}
                </p>
                <p className="text-xs text-gray-500">{item.grupo_nome}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
