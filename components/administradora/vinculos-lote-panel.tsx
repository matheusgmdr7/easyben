"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Loader2 } from "lucide-react"
import { VINCULOS_LOTE_MAX_PDFS } from "@/lib/vinculos-constants"
import { VinculosGeracaoProgresso } from "@/components/administradora/vinculos-geracao-progresso"
import { VinculosPreenchimentoForm } from "@/components/administradora/vinculos-preenchimento-form"
import type { ConfigPreenchimentoSintetico } from "@/lib/vinculos-dados-sinteticos"

type GrupoItem = { id: string; nome: string; ativo?: boolean | null }

type VidaGrupoItem = {
  id: string
  nome: string
  cpf: string | null
  tipo: string | null
  ativo: boolean
  faltando: string[]
}

type OpcionaisLote = {
  data_admissao: string
  funcao: string
  salario: string
  horario_trabalho: string
  horas_almoco: string
  estado_civil: string
  grau_instrucao: string
  contrato_experiencia: "" | "sim" | "nao"
}

type Props = {
  administradoraId: string
  opcionais: OpcionaisLote
  onOpcionaisChange: (opcionais: OpcionaisLote) => void
  onAlterarSalario: (e: React.ChangeEvent<HTMLInputElement>) => void
  preenchimentoSintetico: ConfigPreenchimentoSintetico
  onPreenchimentoSinteticoChange: (value: ConfigPreenchimentoSintetico) => void
}

function formatarCpf(cpf: string | null | undefined) {
  const d = String(cpf || "").replace(/\D/g, "")
  if (d.length !== 11) return cpf || "—"
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function VinculosLotePanel({
  administradoraId,
  opcionais,
  onOpcionaisChange,
  onAlterarSalario,
  preenchimentoSintetico,
  onPreenchimentoSinteticoChange,
}: Props) {
  const [grupos, setGrupos] = useState<GrupoItem[]>([])
  const [grupoId, setGrupoId] = useState("")
  const [vidas, setVidas] = useState<VidaGrupoItem[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [carregandoGrupos, setCarregandoGrupos] = useState(true)
  const [carregandoVidas, setCarregandoVidas] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [ultimoRelatorio, setUltimoRelatorio] = useState<{
    gerados: number
    falhas: Array<{ nome: string; motivo: string }>
  } | null>(null)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        setCarregandoGrupos(true)
        const res = await fetch(
          `/api/administradora/beneficiarios/vinculos/grupos?administradora_id=${encodeURIComponent(administradoraId)}`
        )
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar grupos")
        if (ativo) setGrupos(Array.isArray(data) ? data : [])
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar grupos")
      } finally {
        if (ativo) setCarregandoGrupos(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [administradoraId])

  const carregarVidasGrupo = useCallback(
    async (idGrupo: string) => {
      if (!idGrupo) {
        setVidas([])
        setSelecionados(new Set())
        return
      }
      try {
        setCarregandoVidas(true)
        setUltimoRelatorio(null)
        const params = new URLSearchParams({
          administradora_id: administradoraId,
          grupo_id: idGrupo,
        })
        const res = await fetch(`/api/administradora/beneficiarios/vinculos/grupo-vidas?${params}`)
        const data = await res.json().catch(() => [])
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar beneficiários")
        const lista = Array.isArray(data) ? data : []
        setVidas(lista)
        setSelecionados(new Set(lista.map((v: VidaGrupoItem) => v.id)))
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar beneficiários do grupo")
        setVidas([])
        setSelecionados(new Set())
      } finally {
        setCarregandoVidas(false)
      }
    },
    [administradoraId]
  )

  useEffect(() => {
    if (grupoId) void carregarVidasGrupo(grupoId)
  }, [grupoId, carregarVidasGrupo])

  const todosSelecionados = vidas.length > 0 && selecionados.size === vidas.length
  const algunsSelecionados = selecionados.size > 0 && !todosSelecionados

  const comDadosFaltando = useMemo(
    () => vidas.filter((v) => selecionados.has(v.id) && v.faltando.length > 0),
    [vidas, selecionados]
  )

  function alternarTodos(checked: boolean) {
    if (checked) {
      const ids = vidas.slice(0, VINCULOS_LOTE_MAX_PDFS).map((v) => v.id)
      setSelecionados(new Set(ids))
      if (vidas.length > VINCULOS_LOTE_MAX_PDFS) {
        toast.info(`Selecionados os primeiros ${VINCULOS_LOTE_MAX_PDFS} (limite do lote)`)
      }
    } else {
      setSelecionados(new Set())
    }
  }

  function alternarUm(id: string, checked: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (checked) {
        if (next.size >= VINCULOS_LOTE_MAX_PDFS) {
          toast.error(`Máximo de ${VINCULOS_LOTE_MAX_PDFS} beneficiários por lote`)
          return prev
        }
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  async function gerarLote() {
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos um beneficiário")
      return
    }

    if (preenchimentoSintetico.ativo) {
      const precisaEndereco = comDadosFaltando.some(
        (v) => v.faltando.includes("endereco") || v.faltando.includes("local_nascimento")
      )
      if (
        precisaEndereco &&
        (!preenchimentoSintetico.endereco_cidade?.trim() || !preenchimentoSintetico.endereco_uf?.trim())
      ) {
        toast.error("Informe cidade e UF para o preenchimento automático de endereço")
        return
      }
    }

    try {
      setGerando(true)
      setUltimoRelatorio(null)
      const res = await fetch("/api/administradora/beneficiarios/vinculos/gerar-pdf-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          vida_importada_ids: Array.from(selecionados),
          ...opcionais,
          preenchimento_sintetico: preenchimentoSintetico,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar lote")

      if (data.download_url) {
        const a = document.createElement("a")
        a.href = data.download_url
        a.download = data.nome_arquivo || "fichas-admissao-lote.zip"
        a.target = "_blank"
        a.rel = "noopener noreferrer"
        a.click()
      }

      const falhas = Array.isArray(data.falhas) ? data.falhas : []
      setUltimoRelatorio({ gerados: data.gerados ?? 0, falhas })

      if (falhas.length > 0) {
        toast.warning(
          `ZIP gerado com ${data.gerados} PDF(s). ${falhas.length} beneficiário(s) não incluído(s).`
        )
      } else {
        toast.success(`${data.gerados} PDF(s) gerados e baixados em ZIP`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar lote")
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50/80">
        <AlertDescription className="text-sm text-blue-900">
          Gere até <strong>{VINCULOS_LOTE_MAX_PDFS} fichas</strong> por vez. O download vem em um arquivo{" "}
          <strong>ZIP</strong> (link válido por 1 hora). Campos opcionais abaixo valem para todos do lote.
        </AlertDescription>
      </Alert>

      <div>
        <Label>Grupo de beneficiários</Label>
        <Select
          value={grupoId || "__vazio__"}
          onValueChange={(v) => setGrupoId(v === "__vazio__" ? "" : v)}
          disabled={carregandoGrupos}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={carregandoGrupos ? "Carregando grupos..." : "Selecione o grupo"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__vazio__">Selecione o grupo</SelectItem>
            {grupos.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {grupoId && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sel-todos"
                checked={todosSelecionados || (algunsSelecionados ? "indeterminate" : false)}
                onCheckedChange={(c) => alternarTodos(c === true)}
              />
              <label htmlFor="sel-todos" className="text-sm font-medium text-gray-800 cursor-pointer">
                Selecionar todos ({vidas.length})
              </label>
            </div>
            <span className="text-xs text-gray-600">
              {selecionados.size} / {VINCULOS_LOTE_MAX_PDFS} selecionados
            </span>
          </div>

          {carregandoVidas ? (
            <p className="p-4 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando beneficiários...
            </p>
          ) : vidas.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Nenhum beneficiário ativo neste grupo.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {vidas.map((v) => (
                <li key={v.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50/80">
                  <Checkbox
                    checked={selecionados.has(v.id)}
                    onCheckedChange={(c) => alternarUm(v.id, c === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.nome}</p>
                    <p className="text-xs text-gray-600">
                      {formatarCpf(v.cpf)}
                      {v.tipo ? ` · ${v.tipo}` : ""}
                    </p>
                    {v.faltando.length > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Faltando no cadastro: {v.faltando.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {comDadosFaltando.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80">
          <AlertDescription className="text-sm text-amber-900">
            {comDadosFaltando.length} selecionado(s) têm dados incompletos no cadastro.
            {preenchimentoSintetico.ativo
              ? " O preenchimento automático tentará completar endereço, órgão emissor e opcionais vazios."
              : " O PDF será gerado com os campos disponíveis; ative o preenchimento automático abaixo se necessário."}{" "}
            Beneficiários sem nome ou CPF válido serão ignorados no ZIP.
          </AlertDescription>
        </Alert>
      )}

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <p className="text-sm font-medium text-gray-900 mb-3">Preenchimento automático (todo o lote)</p>
        <VinculosPreenchimentoForm
          value={preenchimentoSintetico}
          onChange={onPreenchimentoSinteticoChange}
          compact
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Data de admissão (todos)</Label>
          <Input
            type="date"
            value={opcionais.data_admissao}
            onChange={(e) => onOpcionaisChange({ ...opcionais, data_admissao: e.target.value })}
          />
        </div>
        <div>
          <Label>Função (todos)</Label>
          <Input
            value={opcionais.funcao}
            onChange={(e) => onOpcionaisChange({ ...opcionais, funcao: e.target.value })}
          />
        </div>
        <div>
          <Label>Salário (todos)</Label>
          <Input
            inputMode="numeric"
            placeholder="0,00"
            value={opcionais.salario}
            onChange={onAlterarSalario}
          />
        </div>
        <div>
          <Label>Horário de trabalho (todos)</Label>
          <Input
            value={opcionais.horario_trabalho}
            onChange={(e) => onOpcionaisChange({ ...opcionais, horario_trabalho: e.target.value })}
          />
        </div>
        <div>
          <Label>Horas de almoço (todos)</Label>
          <Input
            value={opcionais.horas_almoco}
            onChange={(e) => onOpcionaisChange({ ...opcionais, horas_almoco: e.target.value })}
          />
        </div>
        <div>
          <Label>Estado civil (todos)</Label>
          <Input
            value={opcionais.estado_civil}
            onChange={(e) => onOpcionaisChange({ ...opcionais, estado_civil: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Grau de instrução (todos)</Label>
          <Input
            value={opcionais.grau_instrucao}
            onChange={(e) => onOpcionaisChange({ ...opcionais, grau_instrucao: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Contrato de experiência (todos)</Label>
          <Select
            value={opcionais.contrato_experiencia || "__vazio__"}
            onValueChange={(v) =>
              onOpcionaisChange({
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
      </div>

      {ultimoRelatorio && (
        <Alert className="border-gray-200">
          <AlertDescription className="text-sm space-y-1">
            <p>
              <strong>{ultimoRelatorio.gerados}</strong> PDF(s) no ZIP.
              {ultimoRelatorio.falhas.length > 0 && (
                <> <strong>{ultimoRelatorio.falhas.length}</strong> não gerado(s):</>
              )}
            </p>
            {ultimoRelatorio.falhas.slice(0, 5).map((f, i) => (
              <p key={i} className="text-xs text-gray-600">
                {f.nome}: {f.motivo}
              </p>
            ))}
            {ultimoRelatorio.falhas.length > 5 && (
              <p className="text-xs text-gray-500">… e mais {ultimoRelatorio.falhas.length - 5}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={gerarLote}
        disabled={!grupoId || selecionados.size === 0 || gerando || carregandoVidas}
        className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
      >
        {gerando ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando {selecionados.size} PDF(s)…
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Gerar {selecionados.size || ""} PDF(s) em ZIP
          </>
        )}
      </Button>

      {gerando && <VinculosGeracaoProgresso modo="lote" total={selecionados.size} />}
    </div>
  )
}
