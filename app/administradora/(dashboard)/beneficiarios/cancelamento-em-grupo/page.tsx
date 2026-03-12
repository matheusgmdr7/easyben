"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type LinhaArquivo = Record<string, unknown>
type VidaGrupo = {
  id: string
  nome?: string
  cpf?: string
  tipo?: string
  grupo_id?: string
  ativo?: boolean
}

function limparDigitos(v: unknown) {
  return String(v || "").replace(/\D/g, "")
}

function cpfVariantes(v: unknown) {
  const dig = limparDigitos(v)
  if (!dig) return []
  const set = new Set<string>()
  set.add(dig)
  if (dig.length < 11) set.add(dig.padStart(11, "0"))
  set.add(dig.replace(/^0+/, ""))
  return Array.from(set).filter(Boolean)
}

function normalizarTexto(v: unknown) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function parseArquivo(file: File): Promise<{ headers: string[]; rows: LinhaArquivo[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const isCsv = /\.csv$/i.test(file.name)
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) return reject(new Error("Falha ao ler o arquivo"))
        let wb: XLSX.WorkBook
        if (isCsv) {
          const text = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data as ArrayBuffer)
          wb = XLSX.read(text, { type: "string", raw: true })
        } else {
          wb = XLSX.read(data as ArrayBuffer, { type: "array" })
        }
        const sh = wb.SheetNames[0]
        if (!sh) return reject(new Error("Nenhuma planilha encontrada"))
        const ws = wb.Sheets[sh]
        const arr: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
        if (!arr.length) return resolve({ headers: [], rows: [] })
        const headers = (arr[0] as unknown[]).map((h) => String(h ?? "").trim())
        const rows = arr.slice(1).map((row) => {
          const r = Array.isArray(row) ? row : Object.values(row as object)
          const obj: LinhaArquivo = {}
          headers.forEach((h, i) => {
            obj[h] = r[i] != null ? r[i] : ""
          })
          return obj
        })
        resolve({ headers, rows })
      } catch (err) {
        reject(err)
      }
    }
    if (isCsv) reader.readAsText(file, "UTF-8")
    else reader.readAsArrayBuffer(file)
  })
}

export default function CancelamentoEmGrupoPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [vidasGrupo, setVidasGrupo] = useState<VidaGrupo[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<LinhaArquivo[]>([])
  const [drag, setDrag] = useState(false)
  const [motivoLote, setMotivoLote] = useState("")
  const [loadingArquivo, setLoadingArquivo] = useState(false)
  const [loadingVidas, setLoadingVidas] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function baixarTemplateCancelamentoGrupo() {
    try {
      const linhas = [
        { Nome: "NOME DO BENEFICIARIO", CPF: "00000000000" },
      ]
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "CancelamentoGrupo")
      XLSX.writeFile(wb, "template-cancelamento-em-grupo.xlsx")
    } catch (e: any) {
      toast.error("Erro ao gerar template: " + (e?.message || "desconhecido"))
    }
  }

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) return
    setAdministradoraId(adm.id)
    GruposBeneficiariosService.buscarTodos(adm.id).then(setGrupos).catch(() => setGrupos([]))
    setLoadingVidas(true)
    fetch(
      `/api/administradora/vidas-importadas?administradora_id=${encodeURIComponent(adm.id)}&somente_ativos=1`
    )
      .then((r) => r.json())
      .then((d) => setVidasGrupo(Array.isArray(d) ? d : []))
      .catch(() => setVidasGrupo([]))
      .finally(() => setLoadingVidas(false))
  }, [])

  async function onFileSelected(f: File | null) {
    if (!f) {
      setFile(null)
      setRows([])
      return
    }
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name)
    if (!ok) {
      toast.error("Use arquivo .xlsx, .xls ou .csv")
      return
    }
    try {
      setLoadingArquivo(true)
      const { headers: h, rows: r } = await parseArquivo(f)
      setFile(f)
      const headersNorm = h.map((x) => normalizarTexto(x))
      const colunasCpfPrioritarias = h.filter((col, idx) => {
        const n = headersNorm[idx]
        return n === "cpf" || n.startsWith("cpf ") || n.includes(" cpf") || n.includes("documento")
      })
      const colunasNomePrioritarias = h.filter((col, idx) => {
        const n = headersNorm[idx]
        if (!n.includes("nome")) return false
        if (n.includes("mae") || n.includes("mãe") || n.includes("pai")) return false
        return true
      })
      const colunasCpfFallback = h.filter((col, idx) => headersNorm[idx].includes("cpf"))
      const colunasNomeFallback = h.filter((col, idx) => headersNorm[idx].includes("nome"))
      const cpfCols = colunasCpfPrioritarias.length > 0 ? colunasCpfPrioritarias : colunasCpfFallback
      const nomeCols = colunasNomePrioritarias.length > 0 ? colunasNomePrioritarias : colunasNomeFallback

      if (nomeCols.length === 0 && cpfCols.length === 0) {
        throw new Error("Arquivo precisa ter pelo menos uma coluna com Nome ou CPF.")
      }
      const normalizadas = r.map((row) => {
        const cpfs = cpfCols.map((c) => String(row[c] ?? "").trim()).filter(Boolean)
        const nomes = nomeCols.map((c) => String(row[c] ?? "").trim()).filter(Boolean)
        return { __cpfs: cpfs, __nomes: nomes }
      })
      setRows(normalizadas)
      toast.success(`${r.length} linha(s) carregada(s).`)
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + (e?.message || "desconhecido"))
    } finally {
      setLoadingArquivo(false)
    }
  }

  const preview = useMemo(() => {
    const porCpf = new Map<string, VidaGrupo>()
    const porCpfSemZero = new Map<string, VidaGrupo>()
    const porNome = new Map<string, VidaGrupo[]>()
    for (const v of vidasGrupo) {
      const cpf = limparDigitos(v.cpf)
      if (cpf) {
        porCpf.set(cpf, v)
        porCpfSemZero.set(cpf.replace(/^0+/, ""), v)
      }
      const nome = normalizarTexto(v.nome)
      if (!nome) continue
      const arr = porNome.get(nome) || []
      arr.push(v)
      porNome.set(nome, arr)
    }

    return rows.map((row, idx) => {
      const nomesArquivo = Array.isArray((row as any).__nomes) ? (row as any).__nomes : []
      const cpfsArquivo = Array.isArray((row as any).__cpfs) ? (row as any).__cpfs : []
      const nomeArquivo = String(nomesArquivo[0] || "").trim()
      const cpfArquivo = limparDigitos(cpfsArquivo[0] || "")
      let encontrado: VidaGrupo | null = null
      let criterio = ""
      let motivoNaoEncontrado = ""
      for (const cpfRaw of cpfsArquivo) {
        if (encontrado) break
        for (const vari of cpfVariantes(cpfRaw)) {
          const byCpf = porCpf.get(vari) || porCpfSemZero.get(vari)
          if (byCpf) {
            encontrado = byCpf
            criterio = "CPF"
            break
          }
        }
      }
      if (!encontrado) {
        for (const nomeRaw of nomesArquivo) {
          const candidatos = porNome.get(normalizarTexto(nomeRaw)) || []
          if (candidatos.length === 1) {
            encontrado = candidatos[0]
            criterio = "Nome"
            break
          }
          if (candidatos.length > 1) {
            motivoNaoEncontrado = "Nome com múltiplos beneficiários no cadastro"
          }
        }
      }
      if (!encontrado) {
        for (const nomeRaw of nomesArquivo) {
          const alvo = normalizarTexto(nomeRaw)
          if (!alvo) continue
          const aproximados = vidasGrupo.filter((v) => {
            const nv = normalizarTexto(v.nome)
            return nv.includes(alvo) || alvo.includes(nv)
          })
          if (aproximados.length === 1) {
            encontrado = aproximados[0]
            criterio = "Nome aproximado"
            break
          }
          if (aproximados.length > 1) {
            motivoNaoEncontrado = "Nome aproximado ambíguo (mais de um candidato)"
          }
        }
      }
      if (!encontrado && !motivoNaoEncontrado) {
        const cpfInformado = cpfsArquivo.some((c) => limparDigitos(c).length > 0)
        const nomeInformado = nomesArquivo.some((n) => String(n || "").trim().length > 0)
        if (cpfInformado && !nomeInformado) {
          motivoNaoEncontrado = "CPF não localizado na base ativa da administradora"
        } else if (!cpfInformado && nomeInformado) {
          motivoNaoEncontrado = "Nome não localizado na base ativa da administradora"
        } else if (!cpfInformado && !nomeInformado) {
          motivoNaoEncontrado = "Linha sem nome e sem CPF válidos"
        } else {
          motivoNaoEncontrado = "Não foi possível identificar com nome/CPF informados"
        }
      }
      return {
        linha: idx + 1,
        nomeArquivo,
        cpfArquivo,
        beneficiarioId: encontrado?.id || "",
        beneficiarioNome: encontrado?.nome || "",
        beneficiarioTipo: String(encontrado?.tipo || ""),
        grupoId: String(encontrado?.grupo_id || ""),
        criterio,
        motivoNaoEncontrado: encontrado ? "" : motivoNaoEncontrado,
        status: encontrado ? "Encontrado" : "Não encontrado",
      }
    })
  }, [rows, vidasGrupo])

  const idsEncontrados = useMemo(
    () =>
      Array.from(new Set(preview.map((p) => p.beneficiarioId).filter(Boolean))),
    [preview]
  )

  async function solicitarLote() {
    if (!administradoraId) {
      toast.error("Administradora não identificada.")
      return
    }
    if (idsEncontrados.length === 0) {
      toast.error("Nenhum beneficiário identificado para solicitar cancelamento.")
      return
    }
    try {
      setEnviando(true)
      const res = await fetch("/api/administradora/beneficiarios/cancelamentos/solicitar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          beneficiario_ids: idsEncontrados,
          referencias: preview
            .filter((p) => p.beneficiarioId || p.cpfArquivo || p.nomeArquivo)
            .map((p) => ({
              id: p.beneficiarioId || undefined,
              cpf: p.cpfArquivo || undefined,
              nome: p.nomeArquivo || undefined,
            })),
          motivo_solicitacao: motivoLote || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao solicitar cancelamento em lote")
      const ignorados = Array.isArray(data?.ignorados) ? data.ignorados.length : 0
      const jaSolicitados = Number(data?.ja_solicitados || 0)
      const idsRecebidos = Number(data?.diagnostico?.ids_recebidos || 0)
      const refsRecebidas = Number(data?.diagnostico?.referencias_recebidas || 0)
      const idsMapeados = Number(data?.diagnostico?.ids_mapeados || 0)
      toast.success(
        `Solicitação enviada. Novos: ${data?.solicitados || 0}${jaSolicitados > 0 ? ` | Já solicitados: ${jaSolicitados}` : ""}${ignorados > 0 ? ` | Ignorados: ${ignorados}` : ""}${idsRecebidos > 0 ? ` | IDs mapeados: ${idsMapeados}/${idsRecebidos}` : ""}${refsRecebidas > 0 ? ` | Referências: ${refsRecebidas}` : ""}`
      )
      if (ignorados > 0) {
        const amostra = Array.isArray(data?.diagnostico?.amostra_ignorados)
          ? data.diagnostico.amostra_ignorados
              .map((x: { id?: string; motivo?: string }) => `${x?.id || "?"}: ${x?.motivo || "-"}`)
              .join(" | ")
          : ""
        if (amostra) {
          toast.info(`Amostra de ignorados: ${amostra}`)
        }
      }
      setFile(null)
      setRows([])
      setMotivoLote("")
    } catch (e: any) {
      toast.error(e?.message || "Erro ao solicitar cancelamento em lote")
    } finally {
      setEnviando(false)
    }
  }

  function removerLinhaPreview(linhaIndex: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== linhaIndex))
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Cancelamento em Grupo</h1>
        <p className="text-gray-600 mt-1 font-medium">
          Envie um arquivo com nome/CPF. O sistema identifica automaticamente os beneficiários e mostra os dados do grupo antes de solicitar o cancelamento em lote.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Upload de arquivo</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={baixarTemplateCancelamentoGrupo}>
              Download template Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm text-gray-700">Arquivo (Excel/CSV)</p>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const f = e.dataTransfer.files?.[0] || null
                if (f) onFileSelected(f)
              }}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                drag ? "border-gray-500 bg-gray-50" : "border-gray-300"
              } ${loadingArquivo ? "opacity-60 pointer-events-none" : ""}`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                id="file-cancelamento-grupo"
                onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-cancelamento-grupo" className="cursor-pointer flex flex-col items-center gap-2">
                <span className="text-2xl text-gray-400" aria-hidden>
                  📄
                </span>
                <span className="text-sm text-gray-600">Clique ou arraste .xlsx, .xls ou .csv</span>
              </label>
              {file && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => onFileSelected(null)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remover arquivo"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-700">Motivo da solicitação (opcional)</p>
            <Input value={motivoLote} onChange={(e) => setMotivoLote(e.target.value)} placeholder="Ex: solicitação enviada pela empresa" />
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia de identificação</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingArquivo || loadingVidas ? (
              <p className="text-sm text-gray-500">Processando arquivo e carregando beneficiários...</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Encontrados: <span className="font-semibold">{idsEncontrados.length}</span> | Linhas:{" "}
                    <span className="font-semibold">{preview.length}</span>
                  </p>
                  <Button onClick={solicitarLote} disabled={enviando || idsEncontrados.length === 0}>
                    {enviando ? "Enviando..." : "Solicitar cancelamento em lote"}
                  </Button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Nome no arquivo</TableHead>
                        <TableHead>CPF no arquivo</TableHead>
                        <TableHead>Beneficiário identificado</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Critério</TableHead>
                        <TableHead>Motivo não encontrado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 300).map((p, previewIdx) => (
                        <TableRow key={`${p.linha}-${p.cpfArquivo}-${p.nomeArquivo}`}>
                          <TableCell>{p.linha}</TableCell>
                          <TableCell>{p.nomeArquivo || "—"}</TableCell>
                          <TableCell>{p.cpfArquivo || "—"}</TableCell>
                          <TableCell>{p.beneficiarioNome || "—"}</TableCell>
                          <TableCell>
                            {grupos.find((g) => g.id === p.grupoId)?.nome || "—"}
                          </TableCell>
                          <TableCell>{p.beneficiarioTipo || "—"}</TableCell>
                          <TableCell>{p.criterio || "—"}</TableCell>
                          <TableCell>{p.motivoNaoEncontrado || "—"}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
                                p.status === "Encontrado"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }`}
                            >
                              {p.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removerLinhaPreview(previewIdx)}
                              className="h-8 text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                            >
                              Excluir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {preview.length > 300 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Exibindo as 300 primeiras linhas na prévia.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
