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

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
]

const STATUS_OPCOES = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativo" },
  { value: "cancelado", label: "Cancelado" },
]

export default function BeneficiariosTitularPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [cidades, setCidades] = useState<string[]>([])
  const [carregandoCidades, setCarregandoCidades] = useState(false)
  const [loading, setLoading] = useState(false)

  const [cpf, setCpf] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [nome, setNome] = useState("")
  const [estado, setEstado] = useState("")
  const [cidade, setCidade] = useState("")
  const [idadeDe, setIdadeDe] = useState("")
  const [idadeAte, setIdadeAte] = useState("")
  const [status, setStatus] = useState("todos")

  const [resultados, setResultados] = useState<any[]>([])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(25)

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

  function valorCampo(obj: any, chaves: string[]): string {
    for (const chave of chaves) {
      const val = obj?.[chave]
      if (val != null && String(val).trim() !== "") return String(val)
    }
    return ""
  }

  function normalizarEstadoUF(valor: string | null | undefined): string {
    if (!valor) return ""
    const limpo = String(valor).trim().toUpperCase()
    if (limpo.length === 2) return limpo

    const semAcento = limpo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const mapa: Record<string, string> = {
      ACRE: "AC",
      ALAGOAS: "AL",
      AMAPA: "AP",
      AMAZONAS: "AM",
      BAHIA: "BA",
      CEARA: "CE",
      "DISTRITO FEDERAL": "DF",
      "ESPIRITO SANTO": "ES",
      GOIAS: "GO",
      MARANHAO: "MA",
      "MATO GROSSO": "MT",
      "MATO GROSSO DO SUL": "MS",
      "MINAS GERAIS": "MG",
      PARA: "PA",
      PARAIBA: "PB",
      PARANA: "PR",
      PERNAMBUCO: "PE",
      PIAUI: "PI",
      "RIO DE JANEIRO": "RJ",
      "RIO GRANDE DO NORTE": "RN",
      "RIO GRANDE DO SUL": "RS",
      RONDONIA: "RO",
      RORAIMA: "RR",
      "SANTA CATARINA": "SC",
      "SAO PAULO": "SP",
      SERGIPE: "SE",
      TOCANTINS: "TO",
    }
    return mapa[semAcento] || semAcento
  }

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (adm?.id) {
      setAdministradoraId(adm.id)
      carregarGrupos(adm.id)
    }
  }, [])

  useEffect(() => {
    if (estado) {
      buscarCidades(estado)
    } else {
      setCidades([])
      setCidade("")
    }
  }, [estado])

  async function carregarGrupos(adminId: string) {
    try {
      const data = await GruposBeneficiariosService.buscarTodos(adminId)
      setGrupos(data)
    } catch (error) {
      console.error("Erro ao carregar grupos:", error)
      toast.error("Erro ao carregar grupos de beneficiários")
    }
  }

  async function buscarCidades(uf: string) {
    try {
      setCarregandoCidades(true)
      setCidades([])
      setCidade("")
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      const data = await res.json()
      const nomes = (data || []).map((m: any) => m.nome).sort()
      setCidades(nomes)
    } catch (e) {
      console.error("Erro ao buscar cidades:", e)
      setCidades([])
    } finally {
      setCarregandoCidades(false)
    }
  }

  async function pesquisar() {
    try {
      if (!administradoraId) {
        toast.error("Administradora não identificada.")
        return
      }
      setLoading(true)
      const { supabase } = await import("@/lib/supabase")

      const filtros = {
        cpf: cpf.replace(/\D/g, ""),
        nome: nome.trim().toLowerCase(),
        estado: normalizarEstadoUF(estado),
        cidade: cidade.trim().toLowerCase(),
        idadeDe: idadeDe ? Number(idadeDe) : null,
        idadeAte: idadeAte ? Number(idadeAte) : null,
      }

      // 1) Titulares vindos de vidas importadas
      let queryVidas = supabase
        .from("vidas_importadas")
        .select("id, grupo_id, nome, cpf, idade, data_nascimento, cidade, estado, ativo, tipo")
        .eq("administradora_id", administradoraId)
        .eq("tipo", "titular")
      if (grupoId) queryVidas = queryVidas.eq("grupo_id", grupoId)
      const { data: vidas, error: errVidas } = await queryVidas
      if (errVidas) throw errVidas

      // 2) Titulares vinculados ao grupo via clientes_grupos
      let queryVinculos = supabase.from("clientes_grupos").select("id, grupo_id, cliente_id, cliente_tipo")
      if (grupoId) queryVinculos = queryVinculos.eq("grupo_id", grupoId)
      const { data: vinculos, error: errVinculos } = await queryVinculos
      if (errVinculos) throw errVinculos

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

      const proposalIds = Array.from(new Set([
        ...idsPropostasDiretas,
        ...clientesAdm.map((c: any) => c.proposta_id).filter(Boolean),
      ]))

      let propostas: any[] = []
      if (proposalIds.length > 0) {
        const { data, error } = await supabase
          .from("propostas")
          .select("*")
          .in("id", proposalIds)
        if (error) throw error
        propostas = data || []
      }

      const gruposMap = new Map(grupos.map((g) => [g.id, g.nome]))
      const propostasMap = new Map(propostas.map((p: any) => [p.id, p]))
      const clientesAdmMap = new Map(clientesAdm.map((c: any) => [c.id, c]))

      const resultadosVidas = (vidas || []).map((v: any) => {
        const idadeCalc = v.idade != null ? Number(v.idade) : idadePorData(v.data_nascimento)
        return {
          id: `vida-${v.id}`,
          origem: "vida_importada",
          grupo_id: v.grupo_id,
          grupo_nome: gruposMap.get(v.grupo_id) || "-",
          nome: v.nome || "-",
          cpf: v.cpf || "",
          estado: normalizarEstadoUF(valorCampo(v, ["estado", "uf"])),
          cidade: valorCampo(v, ["cidade"]),
          idade: idadeCalc,
          ativo: v.ativo !== false,
        }
      })

      const resultadosVinculos = vinculosRelevantes
        .map((v: any) => {
          if (v.cliente_tipo === "proposta") {
            const p = propostasMap.get(v.cliente_id)
            if (!p) return null
            const statusProposta = String(p.status || "").toLowerCase()
            const ativo = ["aprovada", "assinada", "finalizada"].includes(statusProposta)
            const idadeCalc = p.idade != null ? Number(p.idade) : idadePorData(p.data_nascimento)
            return {
              id: `vinculo-${v.id}`,
              origem: "proposta",
              grupo_id: v.grupo_id,
              grupo_nome: gruposMap.get(v.grupo_id) || "-",
              nome: p.nome || "-",
              cpf: p.cpf || "",
              estado: normalizarEstadoUF(valorCampo(p, ["estado", "uf", "estado_cliente"])),
              cidade: valorCampo(p, ["cidade", "cidade_cliente"]),
              idade: idadeCalc,
              ativo,
            }
          }

          const ca = clientesAdmMap.get(v.cliente_id)
          if (!ca) return null
          const p = ca.proposta_id ? propostasMap.get(ca.proposta_id) : null
          const statusCliente = String(ca.status || "").toLowerCase()
          const ativo = statusCliente === "ativo"
          const idadeCalc = p?.idade != null ? Number(p.idade) : idadePorData(p?.data_nascimento)
          return {
            id: `vinculo-${v.id}`,
            origem: "cliente_administradora",
            grupo_id: v.grupo_id,
            grupo_nome: gruposMap.get(v.grupo_id) || "-",
            nome: p?.nome || ca.nome || `Cliente ${ca.numero_contrato || ""}`.trim(),
            cpf: p?.cpf || "",
            estado: normalizarEstadoUF(valorCampo(p, ["estado", "uf", "estado_cliente"]) || valorCampo(ca, ["estado", "uf", "estado_cliente"])),
            cidade: valorCampo(p, ["cidade", "cidade_cliente"]),
            idade: idadeCalc,
            ativo,
          }
        })
        .filter(Boolean)

      const todos = [...resultadosVidas, ...resultadosVinculos]

      const filtrados = todos.filter((r: any) => {
        const cpfDigitos = String(r.cpf || "").replace(/\D/g, "")
        const nomeLower = String(r.nome || "").toLowerCase()
        const estadoUpper = normalizarEstadoUF(r.estado)
        const cidadeLower = String(r.cidade || "").toLowerCase()

        if (grupoId && r.grupo_id !== grupoId) return false
        if (filtros.cpf && !cpfDigitos.includes(filtros.cpf)) return false
        if (filtros.nome && !nomeLower.includes(filtros.nome)) return false
        if (filtros.estado && estadoUpper !== filtros.estado) return false
        if (filtros.cidade && !cidadeLower.includes(filtros.cidade)) return false
        if (filtros.idadeDe != null && (r.idade == null || Number(r.idade) < filtros.idadeDe)) return false
        if (filtros.idadeAte != null && (r.idade == null || Number(r.idade) > filtros.idadeAte)) return false
        if (status === "ativo" && !r.ativo) return false
        if (status === "cancelado" && r.ativo) return false
        return true
      })

      filtrados.sort((a: any, b: any) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
      setResultados(filtrados)
      setPaginaAtual(1)
      if (filtrados.length === 0) {
        toast.info("Nenhum titular encontrado para os filtros informados.")
      }
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || "Erro ao pesquisar"))
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setCpf("")
    setGrupoId("")
    setNome("")
    setEstado("")
    setCidade("")
    setIdadeDe("")
    setIdadeAte("")
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
      const headers = ["Nome", "CPF", "Grupo", "Cidade", "UF", "Idade", "Status"]
      const body = resultados.map((r: any) => [
        r.nome || "-",
        formatarCpf(r.cpf),
        r.grupo_nome || "-",
        r.cidade || "-",
        r.estado || "-",
        r.idade != null ? Number(r.idade) : "",
        r.ativo ? "Ativo" : "Cancelado",
      ])

      const ws = XLSX.utils.aoa_to_sheet([headers, ...body])
      ws["!cols"] = [{ wch: 36 }, { wch: 16 }, { wch: 30 }, { wch: 24 }, { wch: 8 }, { wch: 10 }, { wch: 14 }]

      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c })
        const cell = ws[addr]
        if (!cell) continue
        ;(cell as any).s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: "1E293B" } },
          alignment: { vertical: "center", horizontal: "center" },
        }
      }
      for (let r = 1; r <= body.length; r++) {
        const zebra = r % 2 === 0 ? "F8FAFC" : "FFFFFF"
        for (let c = 0; c < headers.length; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (!cell) continue
          ;(cell as any).s = {
            fill: { patternType: "solid", fgColor: { rgb: zebra } },
            alignment: { vertical: "top", horizontal: c === 1 ? "center" : "left", wrapText: true },
          }
        }
      }
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Titulares")
      XLSX.writeFile(wb, `beneficiarios-titulares-${new Date().toISOString().slice(0, 10)}.xlsx`)
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
      const margem = 8
      const larguraPagina = 297
      const larguraUtil = larguraPagina - margem * 2
      const colWidths = [78, 26, 72, 48, 12, 14]
      const headers = ["Nome", "CPF", "Grupo", "Cidade/UF", "Idade", "Status"]
      const rowH = 6
      let y = 12

      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.text("Relatório de Titulares", margem, y)
      y += 5
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, margem, y)
      y += 6

      const drawHeader = () => {
        let x = margem
        doc.setFillColor(30, 41, 59)
        doc.rect(margem, y, larguraUtil, rowH, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        headers.forEach((h, i) => {
          doc.text(h, x + 1.5, y + 4.1)
          x += colWidths[i]
        })
        y += rowH
      }

      drawHeader()

      resultados.forEach((r: any, idx: number) => {
        if (y > 196) {
          doc.addPage()
          y = 10
          drawHeader()
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margem, y, larguraUtil, rowH, "F")
        }

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(7)
        const valores = [
          String(r.nome || "-").slice(0, 44),
          formatarCpf(r.cpf),
          String(r.grupo_nome || "-").slice(0, 40),
          `${String(r.cidade || "-")} / ${String(r.estado || "-")}`.slice(0, 24),
          r.idade != null ? String(r.idade) : "-",
          r.ativo ? "Ativo" : "Cancelado",
        ]

        let x = margem
        valores.forEach((valor, i) => {
          doc.text(valor, x + 1.5, y + 4.1)
          x += colWidths[i]
        })
        y += rowH
      })

      doc.save(`beneficiarios-titulares-${new Date().toISOString().slice(0, 10)}.pdf`)
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
        <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Titular</h1>
        <p className="text-sm text-gray-500 mt-1">Buscar titular por CPF, grupo, nome, localização, idade e status para acessar dados de cadastro.</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
            <label className="block text-xs text-gray-600 mb-1">Grupo de beneficiários</label>
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
            <label className="block text-xs text-gray-600 mb-1">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do titular"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Estado</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Cidade</label>
            <Select value={cidade} onValueChange={setCidade} disabled={carregandoCidades || !estado}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder={carregandoCidades ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {cidades.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Idade de</label>
            <Input
              type="number"
              min={0}
              value={idadeDe}
              onChange={(e) => setIdadeDe(e.target.value)}
              placeholder="Ex: 18"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Idade até</label>
            <Input
              type="number"
              min={0}
              value={idadeAte}
              onChange={(e) => setIdadeAte(e.target.value)}
              placeholder="Ex: 65"
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
            <p className="text-sm text-gray-500 text-center py-8">Use os filtros e clique em Pesquisar para buscar titulares.</p>
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
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">CPF</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Grupo</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Cidade/UF</th>
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
                        <td className="px-3 py-2">{r.grupo_nome || "-"}</td>
                        <td className="px-3 py-2">{[r.cidade || "-", r.estado || "-"].join(" / ")}</td>
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => router.push(`/administradora/grupos-beneficiarios/${r.grupo_id}/beneficiario/${r.id}`)}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                            Abrir
                          </Button>
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
