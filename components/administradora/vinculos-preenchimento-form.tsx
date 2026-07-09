"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ConfigPreenchimentoSintetico } from "@/lib/vinculos-dados-sinteticos"
import { UFS_BRASIL } from "@/lib/vinculos-dados-sinteticos"

type Props = {
  value: ConfigPreenchimentoSintetico
  onChange: (value: ConfigPreenchimentoSintetico) => void
  compact?: boolean
}

export const PREENCHIMENTO_SINTETICO_VAZIO: ConfigPreenchimentoSintetico = {
  ativo: false,
  endereco_cidade: "",
  endereco_uf: "",
  orgao_emissor_padrao: "",
  local_nascimento_da_cidade: true,
  estado_civil_aleatorio: false,
  grau_instrucao_aleatorio: false,
}

export function VinculosPreenchimentoForm({ value, onChange, compact }: Props) {
  function patch(partial: Partial<ConfigPreenchimentoSintetico>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className={`space-y-4 ${compact ? "" : "pt-2"}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          id="sintetico-ativo"
          checked={value.ativo}
          onCheckedChange={(c) => patch({ ativo: c === true })}
          className="mt-0.5"
        />
        <div>
          <label htmlFor="sintetico-ativo" className="text-sm font-medium text-gray-900 cursor-pointer">
            Preencher campos faltantes automaticamente
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Só preenche o que estiver vazio no cadastro. Nome e CPF nunca são gerados.
          </p>
        </div>
      </div>

      {value.ativo && (
        <>
          <Alert className="border-amber-200 bg-amber-50/80">
            <AlertDescription className="text-xs text-amber-900">
              Endereços gerados são <strong>plausíveis</strong> para a cidade/UF escolhida, mas podem não
              existir de fato. Use apenas para completar fichas internas/teste. RG não é gerado
              automaticamente.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Cidade (endereço faltante)</Label>
              <Input
                placeholder="Ex.: João Pessoa"
                value={value.endereco_cidade || ""}
                onChange={(e) => patch({ endereco_cidade: e.target.value })}
              />
            </div>
            <div>
              <Label>UF (endereço faltante)</Label>
              <Select
                value={value.endereco_uf || "__vazio__"}
                onValueChange={(v) => patch({ endereco_uf: v === "__vazio__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__vazio__">Selecione</SelectItem>
                  {UFS_BRASIL.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Órgão emissor padrão (se faltar)</Label>
              <Input
                placeholder="Ex.: SSP/PB"
                value={value.orgao_emissor_padrao || ""}
                onChange={(e) => patch({ orgao_emissor_padrao: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="local-nasc-cidade"
                checked={value.local_nascimento_da_cidade !== false}
                onCheckedChange={(c) => patch({ local_nascimento_da_cidade: c === true })}
              />
              <label htmlFor="local-nasc-cidade" className="text-sm text-gray-700 cursor-pointer">
                Usar mesma cidade/UF para local de nascimento (se vazio)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ec-aleatorio"
                checked={!!value.estado_civil_aleatorio}
                onCheckedChange={(c) => patch({ estado_civil_aleatorio: c === true })}
              />
              <label htmlFor="ec-aleatorio" className="text-sm text-gray-700 cursor-pointer">
                Estado civil aleatório (se vazio nos opcionais)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="gi-aleatorio"
                checked={!!value.grau_instrucao_aleatorio}
                onCheckedChange={(c) => patch({ grau_instrucao_aleatorio: c === true })}
              />
              <label htmlFor="gi-aleatorio" className="text-sm text-gray-700 cursor-pointer">
                Grau de instrução aleatório (se vazio nos opcionais)
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
