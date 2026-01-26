"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Step4ComissionamentoProps {
  formData: any
  updateFormData: (data: any) => void
}

export default function Step4Comissionamento({
  formData,
  updateFormData,
}: Step4ComissionamentoProps) {
  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Comissionamento</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure a comissão que será paga para os corretores neste produto
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="comissionamento_porcentagem" className="font-semibold">Porcentagem de Comissão (%) *</Label>
          <Input
            id="comissionamento_porcentagem"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.comissionamento_porcentagem}
            onChange={(e) => handleChange("comissionamento_porcentagem", e.target.value)}
            placeholder="Ex: 10.5 (para 10,5%)"
            required
            className="border-2 border-gray-300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="comissionamento_periodo" className="font-semibold">Período (em meses)</Label>
          <Input
            id="comissionamento_periodo"
            type="number"
            min="1"
            value={formData.comissionamento_periodo}
            onChange={(e) => handleChange("comissionamento_periodo", e.target.value)}
            placeholder="Ex: 12 (comissão por 12 meses)"
            disabled={formData.comissionamento_vitalicia}
            className="border-2 border-gray-300"
          />
          <p className="text-xs text-gray-500 mt-1">
            Informe por quantos meses a comissão será paga (ignorado se vitalícia)
          </p>
        </div>

        <div className="flex items-center space-x-2 p-4 border-2 border-gray-300 rounded-lg">
          <Switch
            id="comissionamento_vitalicia"
            checked={formData.comissionamento_vitalicia}
            onCheckedChange={(checked) => {
              handleChange("comissionamento_vitalicia", checked)
              if (checked) {
                handleChange("comissionamento_periodo", "")
              }
            }}
          />
          <Label htmlFor="comissionamento_vitalicia" className="cursor-pointer font-semibold">
            Comissão Vitalícia
          </Label>
        </div>

        {formData.comissionamento_vitalicia && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Comissão Vitalícia:</strong> A comissão será paga enquanto o cliente
              permanecer com o produto, sem limite de tempo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
