"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, ArrowUpRight, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from "lucide-react"

const STATUS_OPCOES = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativo" },
  { value: "cancelado", label: "Cancelado" },
]

export default function BeneficiariosDependentesPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loading, setLoading] = useState(false)

  const [cpf, setCpf] = useState("")
  const [nome, setNome] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [titular, setTitular] = useState("")
  const [status, setStatus] = useState("todos")

  const [resultados, setResultados] = useState<any[]>([])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(25)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (adm?.id) {
      setAdministradoraId(adm.id)
      carregarGrupos(adm.id)
    }
  }, [])

  async function carregarGrupos(adminId: string) {
    try {
      const data = await GruposBeneficiariosService.buscarTodos(adminId)
      setGrupos(data)
    } catch (error) {
      console.error("Erro ao carregar grupos:", error)
      toast.error("Erro ao carregar grupos de beneficiários")
    }
  }

  function formatarCpf(cpf: string | null | undefined): string {
    if (!cpf) return "-"
    const d = String(cpf).replace(/\D/g, "")
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    return String(cpf)
  }

  function idadePorData(data: string | null | undefined): number | null {
    if (!data) return null
    const partes = String(data).slice(0, 10).split("-")
    if (partes.length !== 3) return null
    const ano = parseInt(partes[0], 10)
    const mes = parseInt(partes[1], 10)
    const dia = parseInt(partes[2], 10)
    if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null
    const hoje = new Date()
    let idade = hoje.getFullYear() - ano
    if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
    return idade >= 0 && idade <= 120 ? idade : null
  }

  async function pesquisar() {
    try {
      if (!administradoraId) {
        toast.error("Administradora não identificada.")
        return
      }
      setLoading(true)
      const { supabase } = await import("@/lib/supabase")

      const filtroCpf = cpf.replace(/\D/g, "")
      const filtroNome = nome.trim().toLowerCase()
      const filtroTitular = titular.trim().toLowerCase()

      let queryVidasDependentes = supabase
        .from("vidas_importadas")
        .select("id, grupo_id, nome, cpf, data_nascimento, idade, parentesco, cpf_titular, ativo, tipo")
        .eq("administradora_id", administradoraId)
        .eq("tipo", "dependente")
      if (grupoId) queryVidasDependentes = queryVidasDependentes.eq("grupo_id", grupoId)

      let queryVidasTitulares = supabase
        .from("vidas_importadas")
        .select("grupo_id, nome, cpf, tipo")
        .eq("administradora_id", administradoraId)
        .eq("tipo", "titular")
      if (grupoId) queryVidasTitulares = queryVidasTitulares.eq("grupo_id", grupoId)

      let queryVinculos = supabase.from("clientes_grupos").select("id, grupo_id, cliente_id, cliente_tipo")
      if (grupoId) queryVinculos = queryVinculos.eq("grupo_id", grupoId)

      const [{ data: vidasDependentes, error: errVidasDep }, { data: vidasTitulares, error: errVidasTit }, { data: vinculos, error: errVinculos }] =
        await Promise.all([queryVidasDependentes, queryVidasTitulares, queryVinculos])

      if (errVidasDep) throw errVidasDep
      if (errVidasTit) throw errVidasTit
      if (errVinculos) throw errVinculos

      const gruposMap = new Map(grupos.map((g) => [g.id, g.nome]))
      const titularNomePorCpfGrupo = new Map<string, string>()
      for (const t of vidasTitulares || []) {
        const cpfDig = String((t as any).cpf || "").replace(/\D/g, "")
        if (cpfDig.length >= 11) titularNomePorCpfGrupo.set(`${(t as any).grupo_id}:${cpfDig}`, (t as any).nome || "-")
      }

      const resultadosVidas = (vidasDependentes || []).map((v: any) => {
        const cpfTitDig = String(v.cpf_titular || "").replace(/\D/g, "")
        return {
          id: `vida-${v.id}`,
          grupo_id: v.grupo_id,
          grupo_nome: gruposMap.get(v.grupo_id) || "-",
          nome: v.nome || "-",
          cpf: v.cpf || "",
          idade: v.idade != null ? Number(v.idade) : idadePorData(v.data_nascimento),
          parentesco: v.parentesco || "-",
          titular_nome: titularNomePorCpfGrupo.get(`${v.grupo_id}:${cpfTitDig}`) || "-",
          titular_cpf: cpfTitDig || "",
          ativo: v.ativo !== false,
          abrir_id: `vida-${v.id}`,
        }
      })

      const vinculosRelevantes = (vinculos || []).filter((v: any) => v.cliente_tipo === "proposta" || v.cliente_tipo === "cliente_administradora")
      const idsPropostasDiretas = vinculosRelevantes
        .filter((v: any) => v.cliente_tipo === "proposta")
        .map((v: any) => v.cliente_id)
      const idsClientesAdm = vinculosRelevantes
        .filter((v: any) => v.cliente_tipo === "cliente_administradora")
        .map((v: any) => v.cliente_id)

      let clientesAdm: any[] = []
      if (idsClientesAdm.length > 0) {
        const { data, error } = await supabase
          .from("clientes_administradoras")
          .select("*")
          .in("id", idsClientesAdm)
          .eq("administradora_id", administradoraId)
        if (error) throw error
        clientesAdm = data || []
      }

      const clientesAdmMap = new Map(clientesAdm.map((c: any) => [c.id, c]))
      const proposalIds = Array.from(
        new Set([
          ...idsPropostasDiretas,
          ...clientesAdm.map((c: any) => c.proposta_id).filter(Boolean),
        ])
      )

      let propostas: any[] = []
      if (proposalIds.length > 0) {
        const { data, error } = await supabase
          .from("propostas")
          .select("*")
          .in("id", proposalIds)
        if (error) throw error
        propostas = data || []
      }
      const propostasMap = new Map(propostas.map((p: any) => [p.id, p]))

      const metaPorProposta = new Map<
        string,
        { grupo_id: string; grupo_nome: string; abrir_id: string; ativo: boolean; titular_nome: string; titular_cpf: string }
      >()

      for (const v of vinculosRelevantes) {
        if ((v as any).cliente_tipo === "proposta") {
          const p = propostasMap.get((v as any).cliente_id)
          if (!p) continue
          const ativo = ["aprovada", "assinada", "finalizada"].includes(String(p.status || "").toLowerCase())
          if (!metaPorProposta.has(p.id)) {
            metaPorProposta.set(p.id, {
              grupo_id: (v as any).grupo_id,
              grupo_nome: gruposMap.get((v as any).grupo_id) || "-",
              abrir_id: `vinculo-${(v as any).id}`,
              ativo,
              titular_nome: p.nome || "-",
              titular_cpf: String(p.cpf || "").replace(/\D/g, ""),
            })
          }
        } else {
          const ca = clientesAdmMap.get((v as any).cliente_id)
          const p = ca?.proposta_id ? propostasMap.get(ca.proposta_id) : null
          if (!p) continue
          const ativo = String(ca?.status || "").toLowerCase() === "ativo"
          if (!metaPorProposta.has(p.id)) {
            metaPorProposta.set(p.id, {
              grupo_id: (v as any).grupo_id,
              grupo_nome: gruposMap.get((v as any).grupo_id) || "-",
              abrir_id: `vinculo-${(v as any).id}`,
              ativo,
              titular_nome: p.nome || "-",
              titular_cpf: String(p.cpf || "").replace(/\D/g, ""),
            })
          }
        }
      }

      let dependentesPropostas: any[] = []
      if (proposalIds.length > 0) {
        const { data, error } = await supabase
          .from("dependentes")
          .select("id, proposta_id, nome, cpf, data_nascimento, parentesco")
          .in("proposta_id", proposalIds)
        if (error) throw error
        dependentesPropostas = data || []
      }

      const resultadosPropostas = dependentesPropostas
        .map((d: any) => {
          const meta = metaPorProposta.get(d.proposta_id)
          if (!meta) return null
          return {
            id: `dependente-proposta-${d.id}-${meta.grupo_id}`,
            grupo_id: meta.grupo_id,
            grupo_nome: meta.grupo_nome,
            nome: d.nome || "-",
            cpf: d.cpf || "",
            idade: idadePorData(d.data_nascimento),
            parentesco: d.parentesco || "-",
            titular_nome: meta.titular_nome,
            titular_cpf: meta.titular_cpf,
            ativo: meta.ativo,
            abrir_id: meta.abrir_id,
          }
        })
        .filter(Boolean)

      const todos = [...resultadosVidas, ...resultadosPropostas]
      const filtrados = todos.filter((r: any) => {
        const depCpfDig = String(r.cpf || "").replace(/\D/g, "")
        const depNome = String(r.nome || "").toLowerCase()
        const titNome = String(r.titular_nome || "").toLowerCase()
        const titCpfDig = String(r.titular_cpf || "").replace(/\D/g, "")

        if (grupoId && r.grupo_id !== grupoId) return false
        if (filtroCpf && !depCpfDig.includes(filtroCpf)) return false
        if (filtroNome && !depNome.includes(filtroNome)) return false
        if (filtroTitular && !(titNome.includes(filtroTitular) || titCpfDig.includes(filtroTitular.replace(/\D/g, "")))) return false
        if (status === "ativo" && !r.ativo) return false
        if (status === "cancelado" && r.ativo) return false
        return true
      })

      filtrados.sort((a: any, b: any) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
      setResultados(filtrados)
      setPaginaAtual(1)
      if (filtrados.length === 0) toast.info("Nenhum dependente encontrado para os filtros informados.")
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || "Erro ao pesquisar"))
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setCpf("")
    setNome("")
    setGrupoId("")
    setTitular("")
    setStatus("todos")
    setResultados([])
    setPaginaAtual(1)
  }

  async function exportarExcel() {
    try {
      if (resultados.length === 0) {
        toast.info("Não há dados para exportar.")
        return
      }
      const XLSX = await import("xlsx")
      const dados = resultados.map((r: any) => ({
        Dependente: r.nome || "-",
        "CPF Dependente": formatarCpf(r.cpf),
        Titular: r.titular_nome || "-",
        "CPF Titular": formatarCpf(r.titular_cpf),
        Grupo: r.grupo_nome || "-",
        Parentesco: r.parentesco || "-",
        Idade: r.idade != null ? Number(r.idade) : "",
        Status: r.ativo ? "Ativo" : "Cancelado",
      }))
      const ws = XLSX.utils.json_to_sheet(dados)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Dependentes")
      XLSX.writeFile(wb, `beneficiarios-dependentes-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: any) {
      toast.error("Erro ao exportar Excel: " + (e?.message || "erro desconhecido"))
    }
  }

  async function exportarPdf() {
    try {
      if (resultados.length === 0) {
        toast.info("Não há dados para exportar.")
        return
      }
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      const rowHeight = 6
      const maxY = 185
      const headers = ["Nº", "Dependente", "CPF", "Titular", "Grupo", "Parentesco", "Idade", "Status"]
      const colWidths = [10, 45, 30, 40, 35, 22, 12, 20]
      let y = 15

      const desenharCabecalho = (primeiraPagina = false) => {
        if (primeiraPagina) {
          doc.setFontSize(14)
          doc.setFont(undefined, "bold")
          doc.text("RELATORIO DE DEPENDENTES", margin, y)
          y += 6
          doc.setFontSize(10)
          doc.setFont(undefined, "normal")
          doc.text(`Total de registros: ${resultados.length}`, margin, y)
          y += 5
          doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, y)
          y += 8
        }
        doc.setFontSize(9)
        doc.setFont(undefined, "bold")
        let x = margin
        headers.forEach((h, i) => {
          doc.text(h, x, y)
          x += colWidths[i]
        })
        y += 5
        doc.setFont(undefined, "normal")
      }

      desenharCabecalho(true)

      resultados.forEach((r: any, index: number) => {
        if (y > maxY) {
          doc.addPage("a4", "landscape")
          y = 15
          desenharCabecalho(false)
        }
        if (index % 2 === 1) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, y - 4, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F")
        }
        let x = margin
        const linha = [
          String(index + 1),
          String(r.nome || "-"),
          formatarCpf(r.cpf),
          String(r.titular_nome || "-"),
          String(r.grupo_nome || "-"),
          String(r.parentesco || "-"),
          r.idade != null ? String(r.idade) : "-",
          r.ativo ? "Ativo" : "Cancelado",
        ]
        linha.forEach((valor, i) => {
          const texto = doc.splitTextToSize(valor, colWidths[i] - 2)?.[0] || "-"
          doc.text(texto, x, y)
          x += colWidths[i]
        })
        y += rowHeight
      })

      y += 4
      doc.setFont(undefined, "bold")
      doc.text(`Total de registros: ${resultados.length}`, margin, y)
      doc.save(`beneficiarios-dependentes-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e: any) {
      toast.error("Erro ao exportar PDF: " + (e?.message || "erro desconhecido"))
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / itensPorPagina))
  const paginaAtualAjustada = Math.min(paginaAtual, totalPaginas)
  const resultadosPaginados = resultados.slice(
    (paginaAtualAjustada - 1) * itensPorPagina,
    paginaAtualAjustada * itensPorPagina
  )
  const inicio = resultados.length > 0 ? (paginaAtualAjustada - 1) * itensPorPagina + 1 : 0
  const fim = Math.min(paginaAtualAjustada * itensPorPagina, resultados.length)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Dependentes</h1>
        <p className="text-sm text-gray-500 mt-1">Buscar dependentes por CPF, nome, grupo, titular e status.</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">CPF</label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do dependente"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo de beneficiário</label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Titular</label>
            <Input
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="Nome ou CPF do titular"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Ativo / Cancelado</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPCOES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={pesquisar}
            disabled={loading}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button onClick={limpar} variant="outline" className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm">
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          {resultados.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Use os filtros e clique em Pesquisar para buscar dependentes.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-600">{resultados.length} resultado(s) encontrado(s).</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={exportarExcel}>
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={exportarPdf}>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Dependente</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">CPF</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Titular</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Grupo</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Parentesco</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Idade</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosPaginados.map((r, idx) => (
                      <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                        <td className="px-3 py-2">{r.nome || "-"}</td>
                        <td className="px-3 py-2">{formatarCpf(r.cpf)}</td>
                        <td className="px-3 py-2">{r.titular_nome || "-"}</td>
                        <td className="px-3 py-2">{r.grupo_nome || "-"}</td>
                        <td className="px-3 py-2">{r.parentesco || "-"}</td>
                        <td className="px-3 py-2">{r.idade != null ? String(r.idade) : "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ${
                            r.ativo
                              ? "bg-slate-100 text-slate-800 border-slate-300"
                              : "bg-gray-100 text-gray-600 border-gray-300"
                          }`}>
                            {r.ativo ? "Ativo" : "Cancelado"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.abrir_id ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => router.push(`/administradora/grupos-beneficiarios/${r.grupo_id}/beneficiario/${r.abrir_id}`)}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                              Abrir
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">Sem rota</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Mostrando {inicio} a {fim} de {resultados.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Itens por página:</span>
                    <Select
                      value={String(itensPorPagina)}
                      onValueChange={(v) => {
                        setItensPorPagina(Number(v))
                        setPaginaAtual(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtualAjustada <= 1}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[80px] text-center">
                    Página {paginaAtualAjustada} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtualAjustada >= totalPaginas}
                    className="h-8"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
