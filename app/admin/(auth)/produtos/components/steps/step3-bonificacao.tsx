"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Step3BonificacaoProps {
  formData: any
  updateFormData: (data: any) => void
}

export default function Step3Bonificacao({
  formData,
  updateFormData,
}: Step3BonificacaoProps) {
  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Bonificação</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure a bonificação que será paga para este produto
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-semibold">Tipo de Bonificação *</Label>
          <RadioGroup
            value={formData.bonificacao_tipo}
            onValueChange={(value) => handleChange("bonificacao_tipo", value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="porcentagem" id="bonificacao-porcentagem" />
              <Label htmlFor="bonificacao-porcentagem" className="cursor-pointer font-semibold">
                Porcentagem (%)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="valor" id="bonificacao-valor" />
              <Label htmlFor="bonificacao-valor" className="cursor-pointer font-semibold">
                Valor Fixo (R$)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonificacao_valor" className="font-semibold">
            {formData.bonificacao_tipo === "porcentagem"
              ? "Porcentagem de Bonificação (%) *"
              : "Valor da Bonificação (R$) *"}
          </Label>
          <Input
            id="bonificacao_valor"
            type="number"
            step={formData.bonificacao_tipo === "porcentagem" ? "0.01" : "0.01"}
            min="0"
            value={formData.bonificacao_valor}
            onChange={(e) => handleChange("bonificacao_valor", e.target.value)}
            placeholder={
              formData.bonificacao_tipo === "porcentagem"
                ? "Ex: 10.5 (para 10,5%)"
                : "Ex: 100.00"
            }
            required
            className="border-2 border-gray-300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonificacao_periodo" className="font-semibold">Período (Quantas vezes será pago) *</Label>
          <Input
            id="bonificacao_periodo"
            type="number"
            min="1"
            value={formData.bonificacao_periodo}
            onChange={(e) => handleChange("bonificacao_periodo", e.target.value)}
            placeholder="Ex: 12 (será pago 12 vezes)"
            required
            className="border-2 border-gray-300"
          />
          <p className="text-xs text-gray-500 mt-1">
            Informe quantas vezes a bonificação será paga (ex: 12 para pagamento mensal durante 1 ano)
          </p>
        </div>
      </div>
    </div>
  )
}
