"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Archive, Download, FileText, Loader2 } from "lucide-react"

const ETAPAS_LOTE = [
  { label: "Preparando dados dos beneficiários", icon: FileText },
  { label: "Gerando fichas em PDF", icon: FileText },
  { label: "Compactando arquivo ZIP", icon: Archive },
  { label: "Preparando link de download", icon: Download },
]

const ETAPAS_INDIVIDUAL = [
  { label: "Carregando dados do cadastro", icon: FileText },
  { label: "Aplicando preenchimentos", icon: FileText },
  { label: "Gerando PDF da ficha", icon: Download },
]

type Props = {
  modo: "individual" | "lote"
  total?: number
}

export function VinculosGeracaoProgresso({ modo, total = 1 }: Props) {
  const etapas = modo === "lote" ? ETAPAS_LOTE : ETAPAS_INDIVIDUAL
  const [progresso, setProgresso] = useState(8)
  const [etapaAtual, setEtapaAtual] = useState(0)

  useEffect(() => {
    const tickMs = modo === "lote" ? 1400 : 900
    const interval = setInterval(() => {
      setProgresso((p) => Math.min(p + (modo === "lote" ? 1.2 : 5), 94))
      setEtapaAtual((e) => (e + 1) % etapas.length)
    }, tickMs)
    return () => clearInterval(interval)
  }, [modo, etapas.length])

  const Icon = etapas[etapaAtual].icon

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-blue-700 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-blue-900">
            {modo === "lote" ? `Gerando ${total} PDF(s)...` : "Gerando ficha de admissão..."}
          </p>
          <p className="text-xs text-blue-700 flex items-center gap-1.5 mt-0.5">
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {etapas[etapaAtual].label}
          </p>
        </div>
      </div>
      <Progress value={progresso} className="h-2 bg-blue-100" />
      <p className="text-xs text-blue-600">
        {modo === "lote"
          ? "Lotes grandes podem levar alguns minutos. Não feche esta página."
          : "Aguarde enquanto o PDF é montado."}
      </p>
    </div>
  )
}
