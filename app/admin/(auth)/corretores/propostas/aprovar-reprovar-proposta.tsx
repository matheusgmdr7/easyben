"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface AprovarReprovarPropostaProps {
  propostaId: string
  onAprovar?: (id: string) => Promise<void> | void
  onRejeitar?: (id: string, motivo: string) => Promise<void> | void
}

function AprovarReprovarProposta({ propostaId, onAprovar, onRejeitar }: AprovarReprovarPropostaProps) {
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState<"aprovar" | "rejeitar" | null>(null)

  const aprovar = async () => {
    try {
      setLoading("aprovar")
      if (onAprovar) {
        await onAprovar(propostaId)
      }
      toast.success("Proposta aprovada")
    } catch (error) {
      console.error(error)
      toast.error("Não foi possível aprovar a proposta")
    } finally {
      setLoading(null)
    }
  }

  const rejeitar = async () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da rejeição")
      return
    }

    try {
      setLoading("rejeitar")
      if (onRejeitar) {
        await onRejeitar(propostaId, motivo)
      }
      toast.success("Proposta rejeitada")
      setMotivo("")
    } catch (error) {
      console.error(error)
      toast.error("Não foi possível rejeitar a proposta")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Informe o motivo da rejeição (obrigatório para reprovar)"
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
        className="min-h-[100px]"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={aprovar} disabled={loading === "aprovar"}>
          {loading === "aprovar" ? "Aprovando..." : "Aprovar"}
        </Button>
        <Button variant="destructive" onClick={rejeitar} disabled={loading === "rejeitar"}>
          {loading === "rejeitar" ? "Rejeitando..." : "Rejeitar"}
        </Button>
      </div>
    </div>
  )
}

export default AprovarReprovarProposta
export { AprovarReprovarProposta }
