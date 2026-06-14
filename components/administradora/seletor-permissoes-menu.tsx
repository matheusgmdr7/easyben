"use client"

import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MENU_ADMINISTRADORA,
  type ItemMenuAdministradora,
  expandirIdsPermissao,
  normalizarPermissoesAdministradora,
} from "@/lib/administradora-permissoes"

type Props = {
  value: string[]
  onChange: (permissoes: string[]) => void
}

function folhasDoItem(item: ItemMenuAdministradora): string[] {
  if (!item.children?.length) return [item.id]
  return item.children.flatMap(folhasDoItem)
}

function GrupoPermissoes({
  item,
  value,
  onChange,
  nivel = 0,
}: {
  item: ItemMenuAdministradora
  value: Set<string>
  onChange: (permissoes: string[]) => void
  nivel?: number
}) {
  const folhas = useMemo(() => folhasDoItem(item), [item])
  const temFilhos = (item.children?.length || 0) > 0
  const selecionadas = folhas.filter((f) => value.has(f)).length
  const todas = selecionadas === folhas.length && folhas.length > 0
  const parcial = selecionadas > 0 && !todas

  function aplicar(novas: Set<string>) {
    onChange([...novas])
  }

  function toggleFolha(id: string) {
    const novas = new Set(value)
    if (novas.has(id)) novas.delete(id)
    else novas.add(id)
    aplicar(novas)
  }

  function toggleGrupo() {
    const novas = new Set(value)
    if (todas) folhas.forEach((f) => novas.delete(f))
    else folhas.forEach((f) => novas.add(f))
    aplicar(novas)
  }

  if (!temFilhos) {
    return (
      <label
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
          value.has(item.id)
            ? "border-[#0F172A]/30 bg-[#0F172A]/5"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        )}
        style={{ marginLeft: nivel * 12 }}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#0F172A] shrink-0"
          checked={value.has(item.id)}
          onChange={() => toggleFolha(item.id)}
        />
        <span className="text-sm text-gray-800">{item.label}</span>
      </label>
    )
  }

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white overflow-hidden"
      style={{ marginLeft: nivel * 8 }}
    >
      <label className="flex items-center gap-3 px-3 py-2.5 bg-gray-50/80 border-b border-gray-100 cursor-pointer hover:bg-gray-100/80">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#0F172A] shrink-0"
          checked={todas}
          ref={(el) => {
            if (el) el.indeterminate = parcial
          }}
          onChange={toggleGrupo}
        />
        <span className="text-sm font-semibold text-gray-800">{item.label}</span>
        <span className="ml-auto text-[10px] tabular-nums text-gray-500">
          {selecionadas}/{folhas.length}
        </span>
      </label>
      <div className="p-2 space-y-1.5">
        {item.children!.map((filho) =>
          filho.children?.length ? (
            <GrupoPermissoes key={filho.id} item={filho} value={value} onChange={onChange} nivel={nivel + 1} />
          ) : (
            <label
              key={filho.id}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors",
                value.has(filho.id) ? "bg-[#0F172A]/5 text-[#0F172A]" : "hover:bg-gray-50 text-gray-700"
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#0F172A] shrink-0"
                checked={value.has(filho.id)}
                onChange={() => toggleFolha(filho.id)}
              />
              <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-sm">{filho.label}</span>
            </label>
          )
        )}
      </div>
    </div>
  )
}

export function SeletorPermissoesMenu({ value, onChange }: Props) {
  const normalizado = useMemo(() => new Set(normalizarPermissoesAdministradora(value)), [value])
  const total = normalizado.size

  function selecionarTodas() {
    onChange(expandirIdsPermissao(MENU_ADMINISTRADORA.map((m) => m.id)))
  }

  function limparTodas() {
    onChange([])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Marque as páginas do menu que este usuário poderá acessar.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="tabular-nums font-medium text-[#0F172A]">{total} selecionada(s)</span>
          <button type="button" onClick={selecionarTodas} className="text-gray-600 hover:text-[#0F172A] underline-offset-2 hover:underline">
            Todas
          </button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={limparTodas} className="text-gray-600 hover:text-[#0F172A] underline-offset-2 hover:underline">
            Limpar
          </button>
        </div>
      </div>
      <div className="space-y-3 max-h-[min(52vh,420px)] overflow-y-auto pr-1">
        {MENU_ADMINISTRADORA.map((item) => (
          <GrupoPermissoes
            key={item.id}
            item={item}
            value={normalizado}
            onChange={(p) => onChange(normalizarPermissoesAdministradora(p))}
          />
        ))}
      </div>
    </div>
  )
}
