"use client"

import { useEffect, useState } from "react"
import {
  type AdministradoraMarcaLike,
  carregarNomeMarcaExibicao,
  nomeMarcaFallbackLocal,
} from "@/lib/administradora-marca"

export function useNomeMarcaAdministradora(administradora: AdministradoraMarcaLike | null | undefined) {
  const [nomeMarca, setNomeMarca] = useState(() => nomeMarcaFallbackLocal(administradora))

  useEffect(() => {
    setNomeMarca(nomeMarcaFallbackLocal(administradora))
    let cancelled = false
    void carregarNomeMarcaExibicao(administradora).then((nome) => {
      if (!cancelled) setNomeMarca(nome)
    })
    return () => {
      cancelled = true
    }
  }, [administradora?.id, administradora?.tenant_id, administradora?.nome, administradora?.nome_fantasia])

  return nomeMarca
}
