"use client"

import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"

export default function ValorTotalDisplay() {
  const { watch } = useFormContext()
  const [valorTotal, setValorTotal] = useState("0,00")
  const [detalhes, setDetalhes] = useState([])

  // Watch for changes in plan value and dependents
  const valorPlano = watch("valor")
  const dependentes = watch("dependentes") || []
  const temDependentes = watch("tem_dependentes")
  const nomeTitular = watch("nome")

  // Calculate total value
  useEffect(() => {
    let total = 0
    const novosDetalhes = []

    // Add main plan value
    if (valorPlano) {
      const valorNumerico = Number.parseFloat(valorPlano.replace(/[^\d,]/g, "").replace(",", "."))
      if (!isNaN(valorNumerico)) {
        total += valorNumerico
        novosDetalhes.push({
          nome: nomeTitular || "Titular",
          valor: valorPlano,
          tipo: "titular",
        })
      }
    }

    // Add dependents values
    if (temDependentes && dependentes.length > 0) {
      dependentes.forEach((dep, index) => {
        if (dep.valor_individual) {
          const valorDep = Number.parseFloat(dep.valor_individual.replace(/[^\d,]/g, "").replace(",", "."))
          if (!isNaN(valorDep)) {
            total += valorDep
            novosDetalhes.push({
              nome: dep.nome || `Dependente ${index + 1}`,
              valor: dep.valor_individual,
              tipo: "dependente",
              parentesco: dep.parentesco,
            })
          }
        }
      })
    }

    setDetalhes(novosDetalhes)
    setValorTotal(
      total.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    )
  }, [valorPlano, dependentes, temDependentes, nomeTitular])

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-[#0F172A]">Resumo da Proposta</CardTitle>
        <CardDescription>Valor total calculado com base no titular e dependentes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {detalhes.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
            >
              <div>
                <span className="font-medium">{item.nome}</span>
                {item.tipo === "dependente" && item.parentesco && (
                  <span className="text-sm text-gray-500 ml-2">({item.parentesco})</span>
                )}
                <div className="text-xs text-gray-400">
                  {item.tipo === "titular" ? "Titular do plano" : "Dependente"}
                </div>
              </div>
              <span className="font-medium text-[#0F172A]">R$ {item.valor}</span>
            </div>
          ))}

          <div className="bg-[#7BD9F6] bg-opacity-20 p-4 rounded-lg border border-[#7BD9F6] border-opacity-30 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#0F172A] text-lg">Valor Total da Proposta:</span>
              <span className="text-2xl font-bold text-[#0F172A]">R$ {valorTotal}</span>
            </div>
            {temDependentes && dependentes.length > 0 && (
              <p className="text-sm text-[#0F172A] mt-2">
                Inclui {detalhes.filter((d) => d.tipo === "titular").length} titular +{" "}
                {detalhes.filter((d) => d.tipo === "dependente").length} dependente(s)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
