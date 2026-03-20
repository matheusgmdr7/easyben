"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { ChevronDown, Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react"

type BeneficiarioRow = Record<string, any>

type ExtraColumnOption = {
  key: string
  label: string
  getValue: (b: BeneficiarioRow) => string | number
}

function formatarCpf(cpf: string | null | undefined): string {
  if (!cpf) return "-"
  const digitos = String(cpf).replace(/\D/g, "")
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  return String(cpf)
}

function formatarData(data: string | null | undefined): string {
  if (!data) return "-"
  const valor = String(data).slice(0, 10)
  const partes = valor.split("-")
  if (partes.length !== 3) return valor
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function limparDigitos(valor: string | null | undefined): string {
  return String(valor || "").replace(/\D/g, "")
}

function valorCampo(obj: BeneficiarioRow, chaves: string[]): string {
  for (const chave of chaves) {
    const valor = obj?.[chave]
    if (valor != null && String(valor).trim() !== "") {
      return String(valor)
    }
  }
  return ""
}

function normalizarChave(chave: string): string {
  return String(chave || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function valorDadosAdicionais(obj: BeneficiarioRow, chaves: string[]): string {
  const dados = obj?.dados_adicionais
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return ""

  const entries = Object.entries(dados as Record<string, unknown>)
  if (entries.length === 0) return ""

  const alvo = new Set(chaves.map((k) => normalizarChave(k)))

  for (const [key, raw] of entries) {
    const keyNorm = normalizarChave(key)
    if (!alvo.has(keyNorm)) continue
    if (raw == null) continue
    const valor = String(raw).trim()
    if (valor) return valor
  }

  return ""
}

function valorCampoRobusto(obj: BeneficiarioRow, chaves: string[]): string {
  const direto = valorCampo(obj, chaves)
  if (direto) return direto
  return valorDadosAdicionais(obj, chaves)
}

function extrairTelefone(obj: BeneficiarioRow): string {
  const direto = valorCampoRobusto(obj, [
    "telefone",
    "telefone 1",
    "telefone1",
    "celular",
    "celular 1",
    "celular1",
    "fone",
    "telefone_principal",
    "telefone_comercial",
    "telefone_residencial",
    "whatsapp",
    "whats app",
  ])
  if (direto) return direto

  const extrairDeObjetoTelefone = (telefoneObj: Record<string, unknown>): string => {
    const numero = valorCampo(telefoneObj as BeneficiarioRow, ["numero", "telefone", "phone", "celular", "whatsapp"])
    const ddd = valorCampo(telefoneObj as BeneficiarioRow, ["ddd", "codigo_area", "area_code"]).replace(/\D/g, "")
    const numeroLimpo = String(numero || "").trim()
    if (!numeroLimpo) return ""
    if (ddd && !numeroLimpo.startsWith(ddd)) return `${ddd}${numeroLimpo}`
    return numeroLimpo
  }

  const lerTelefones = (valor: unknown): string => {
    if (!Array.isArray(valor)) return ""
    for (const item of valor) {
      if (typeof item === "string" && item.trim()) return item.trim()
      if (item && typeof item === "object") {
        const extraido = extrairDeObjetoTelefone(item as Record<string, unknown>)
        if (extraido) return extraido
      }
    }
    return ""
  }

  const telefones = obj?.telefones
  const telefoneLista = lerTelefones(telefones)
  if (telefoneLista) return telefoneLista

  if (typeof telefones === "string" && telefones.trim()) {
    try {
      const parseado = JSON.parse(telefones)
      const telefoneParseado = lerTelefones(parseado)
      if (telefoneParseado) return telefoneParseado
    } catch {
      // Mantém fluxo; em alguns registros o campo pode vir como texto simples.
      return telefones.trim()
    }
  }

  return ""
}

function formatarTelefone(valor: string | null | undefined): string {
  const bruto = String(valor || "").trim()
  if (!bruto) return ""

  const digitos = bruto.replace(/\D/g, "")
  if (digitos.length === 11) {
    return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
  }
  if (digitos.length === 10) {
    return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3")
  }

  return bruto
}

function extrairEmail(obj: BeneficiarioRow): string {
  const direto = valorCampoRobusto(obj, ["email", "e_mail", "mail"])
  if (direto) return direto

  const emails = obj?.emails
  if (Array.isArray(emails) && emails.length > 0) {
    const primeiro = emails[0]
    if (primeiro != null && String(primeiro).trim()) return String(primeiro).trim()
  }

  return ""
}

function normalizarSexo(valor: string | null | undefined): string {
  const v = String(valor || "").trim()
  if (!v) return ""
  const n = v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  if (["m", "masc", "masculino", "male", "homem"].includes(n)) return "Masculino"
  if (["f", "fem", "feminino", "female", "mulher"].includes(n)) return "Feminino"
  return v
}

const EXTRA_COLUMN_OPTIONS: ExtraColumnOption[] = [
  { key: "cpf_titular", label: "CPF do Titular", getValue: (b) => formatarCpf(valorCampoRobusto(b, ["cpf_titular", "cpf titular"])) || "-" },
  { key: "data_nascimento", label: "Data de Nascimento", getValue: (b) => formatarData(valorCampoRobusto(b, ["data_nascimento", "data nascimento", "dt_nascimento"])) || "-" },
  { key: "idade", label: "Idade", getValue: (b) => (b?.idade != null && String(b.idade).trim() !== "" ? Number(b.idade) : "-") },
  { key: "sexo", label: "Sexo", getValue: (b) => normalizarSexo(valorCampoRobusto(b, ["sexo", "genero"])) || "-" },
  { key: "estado_civil", label: "Estado Civil", getValue: (b) => valorCampoRobusto(b, ["estado_civil", "estado civil"]) || "-" },
  { key: "nome_mae", label: "Nome da Mae", getValue: (b) => valorCampoRobusto(b, ["nome_mae", "nome mae"]) || "-" },
  { key: "telefone", label: "Telefone", getValue: (b) => formatarTelefone(extrairTelefone(b)) || "-" },
  { key: "email", label: "Email", getValue: (b) => extrairEmail(b) || "-" },
  { key: "cep", label: "CEP", getValue: (b) => valorCampoRobusto(b, ["cep"]) || "-" },
  { key: "logradouro", label: "Logradouro", getValue: (b) => valorCampoRobusto(b, ["endereco", "logradouro", "rua"]) || "-" },
  { key: "numero", label: "Numero", getValue: (b) => valorCampoRobusto(b, ["numero", "num"]) || "-" },
  { key: "complemento", label: "Complemento", getValue: (b) => valorCampoRobusto(b, ["complemento"]) || "-" },
  { key: "bairro", label: "Bairro", getValue: (b) => valorCampoRobusto(b, ["bairro"]) || "-" },
  { key: "cidade", label: "Cidade", getValue: (b) => valorCampoRobusto(b, ["cidade"]) || "-" },
  { key: "uf", label: "UF", getValue: (b) => valorCampoRobusto(b, ["estado", "uf"]) || "-" },
  { key: "rg", label: "RG", getValue: (b) => valorCampoRobusto(b, ["rg", "identidade"]) || "-" },
  { key: "orgao_emissor", label: "Orgao Emissor", getValue: (b) => valorCampoRobusto(b, ["orgao_emissor", "orgao emissor", "órgao emissor"]) || "-" },
  { key: "produto", label: "Produto", getValue: (b) => valorCampoRobusto(b, ["produto", "produto_nome"]) || "-" },
  { key: "plano", label: "Plano", getValue: (b) => valorCampoRobusto(b, ["plano", "plano_nome"]) || "-" },
]

const DEFAULT_EXTRA_COLUMNS = [
  "data_nascimento",
  "idade",
  "sexo",
  "estado_civil",
  "telefone",
  "email",
  "cidade",
  "uf",
]

function ordenarBeneficiariosPorTitular(beneficiarios: BeneficiarioRow[]): BeneficiarioRow[] {
  const titulares: BeneficiarioRow[] = []
  const dependentes: BeneficiarioRow[] = []
  const outros: BeneficiarioRow[] = []

  beneficiarios.forEach((b) => {
    const tipo = String(b?.tipo || "").toLowerCase()
    if (tipo === "titular") {
      titulares.push(b)
      return
    }
    if (tipo === "dependente") {
      dependentes.push(b)
      return
    }
    outros.push(b)
  })

  const titularesPorCpf = new Map<string, BeneficiarioRow>()
  titulares.forEach((t) => {
    const cpf = limparDigitos(valorCampoRobusto(t, ["cpf"]))
    if (cpf) titularesPorCpf.set(cpf, t)
  })

  const dependentesPorTitular = new Map<string, BeneficiarioRow[]>()
  dependentes.forEach((d) => {
    const cpfTitular = limparDigitos(valorCampoRobusto(d, ["cpf_titular", "cpf titular"]))
    if (!cpfTitular || !titularesPorCpf.has(cpfTitular)) return
    const lista = dependentesPorTitular.get(cpfTitular) || []
    lista.push(d)
    dependentesPorTitular.set(cpfTitular, lista)
  })

  const ordenarPorNome = (a: BeneficiarioRow, b: BeneficiarioRow) =>
    String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", { sensitivity: "base" })

  const resultado: BeneficiarioRow[] = []
  titulares.sort(ordenarPorNome).forEach((titular) => {
    resultado.push(titular)
    const cpfTitular = limparDigitos(valorCampoRobusto(titular, ["cpf"]))
    const deps = (dependentesPorTitular.get(cpfTitular) || []).sort(ordenarPorNome)
    resultado.push(...deps)
  })

  const dependentesOrfaos = dependentes
    .filter((d) => {
      const cpfTitular = limparDigitos(valorCampoRobusto(d, ["cpf_titular", "cpf titular"]))
      return !cpfTitular || !titularesPorCpf.has(cpfTitular)
    })
    .sort(ordenarPorNome)

  return [...resultado, ...dependentesOrfaos, ...outros.sort(ordenarPorNome)]
}

function montarMapaTitularesPorCpf(beneficiarios: BeneficiarioRow[]): Map<string, string> {
  const mapa = new Map<string, string>()
  beneficiarios.forEach((b) => {
    const tipo = String(b?.tipo || "").toLowerCase()
    if (tipo !== "titular") return
    const cpf = limparDigitos(valorCampoRobusto(b, ["cpf"]))
    const nome = valorCampo(b, ["nome"]).trim()
    if (cpf && nome) mapa.set(cpf, nome)
  })
  return mapa
}

function getLinhasExportacao(
  beneficiarios: BeneficiarioRow[],
  nomesGruposPorId: Map<string, string>,
  colunasExtrasSelecionadas: string[],
  titularesPorCpf: Map<string, string>
) {
  const extrasSelecionadas = EXTRA_COLUMN_OPTIONS.filter((opt) => colunasExtrasSelecionadas.includes(opt.key))

  return beneficiarios.map((b) => {
    const cpf = valorCampoRobusto(b, ["cpf"])
    const status = b?.ativo === false ? "Cancelado" : "Ativo"
    const tipoRaw = String(valorCampoRobusto(b, ["tipo"]) || "").toLowerCase()
    const tipo = tipoRaw || "-"
    const cpfTitular = limparDigitos(valorCampoRobusto(b, ["cpf_titular", "cpf titular"]))
    const nomeTitular = titularesPorCpf.get(cpfTitular) || ""
    const nomeBase = valorCampo(b, ["nome"]) || "-"
    const nomeComVinculo =
      tipoRaw === "dependente"
        ? nomeBase
        : nomeBase
    const grupoNome = nomesGruposPorId.get(String(b?.grupo_id || "")) || "-"
    const linhaBase: Record<string, string | number> = {
      Grupo: grupoNome,
      Nome: nomeComVinculo,
      CPF: formatarCpf(cpf),
      Tipo: tipo,
      Parentesco: valorCampo(b, ["parentesco"]) || "-",
      Status: status,
    }

    extrasSelecionadas.forEach((extra) => {
      linhaBase[extra.label] = extra.getValue(b)
    })

    return linhaBase
  })
}

export default function RelatoriosBeneficiariosPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [grupoIdsSelecionados, setGrupoIdsSelecionados] = useState<string[]>([])
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioRow[]>([])
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "cancelado">("todos")
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "titular" | "dependente">("todos")
  const [colunasExtrasSelecionadas, setColunasExtrasSelecionadas] = useState<string[]>(DEFAULT_EXTRA_COLUMNS)
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState<"" | "excel" | "pdf">("")

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (!administradora?.id) {
      toast.error("Administradora não identificada.")
      return
    }
    setAdministradoraId(administradora.id)
    carregarGrupos(administradora.id)
  }, [])

  async function carregarGrupos(admId: string) {
    try {
      const data = await GruposBeneficiariosService.buscarTodos(admId)
      setGrupos(data || [])
    } catch (error) {
      console.error("Erro ao carregar grupos:", error)
      toast.error("Erro ao carregar grupos de beneficiários.")
    }
  }

  async function carregarBeneficiarios() {
    if (grupoIdsSelecionados.length === 0) {
      toast.info("Selecione ao menos um grupo de beneficiários.")
      return
    }
    if (!administradoraId) {
      toast.error("Administradora não identificada.")
      return
    }

    try {
      setLoading(true)
      const grupoIdsQuery = grupoIdsSelecionados.join(",")
      const res = await fetch(
        `/api/administradora/vidas-importadas?grupo_ids=${encodeURIComponent(grupoIdsQuery)}&administradora_id=${encodeURIComponent(administradoraId)}`,
        { cache: "no-store" }
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar beneficiários")
      }

      const lista = Array.isArray(data) ? data : []
      setBeneficiarios(lista)

      if (lista.length === 0) {
        toast.info("Nenhum beneficiário encontrado para os grupos selecionados.")
      }
    } catch (error: any) {
      console.error("Erro ao carregar beneficiários do relatório:", error)
      toast.error(error?.message || "Erro ao carregar beneficiários")
    } finally {
      setLoading(false)
    }
  }

  const nomesGruposPorId = useMemo(() => {
    const mapa = new Map<string, string>()
    grupos.forEach((g) => mapa.set(g.id, g.nome))
    return mapa
  }, [grupos])

  const beneficiariosFiltrados = useMemo(() => {
    return beneficiarios.filter((b) => {
      const tipo = String(b?.tipo || "").toLowerCase()
      const ativo = b?.ativo !== false

      if (filtroStatus === "ativo" && !ativo) return false
      if (filtroStatus === "cancelado" && ativo) return false

      if (filtroTipo === "titular" && tipo !== "titular") return false
      if (filtroTipo === "dependente" && tipo !== "dependente") return false

      return true
    })
  }, [beneficiarios, filtroStatus, filtroTipo])

  const titularesPorCpf = useMemo(() => montarMapaTitularesPorCpf(beneficiarios), [beneficiarios])

  const beneficiariosOrdenados = useMemo(
    () => ordenarBeneficiariosPorTitular(beneficiariosFiltrados),
    [beneficiariosFiltrados]
  )

  const linhasExportacao = useMemo(
    () =>
      getLinhasExportacao(
        beneficiariosOrdenados,
        nomesGruposPorId,
        colunasExtrasSelecionadas,
        titularesPorCpf
      ),
    [beneficiariosOrdenados, nomesGruposPorId, colunasExtrasSelecionadas, titularesPorCpf]
  )

  const nomesGruposSelecionados = useMemo(
    () => grupos.filter((g) => grupoIdsSelecionados.includes(g.id)).map((g) => g.nome),
    [grupos, grupoIdsSelecionados]
  )

  const totalTitulares = useMemo(
    () => beneficiariosFiltrados.filter((b) => String(b?.tipo || "").toLowerCase() === "titular").length,
    [beneficiariosFiltrados]
  )

  const totalDependentes = useMemo(
    () => beneficiariosFiltrados.filter((b) => String(b?.tipo || "").toLowerCase() === "dependente").length,
    [beneficiariosFiltrados]
  )

  async function exportarExcel() {
    if (linhasExportacao.length === 0) {
      toast.info("Não há dados para exportar.")
      return
    }

    try {
      setExportando("excel")
      const XLSX = await import("xlsx")
      const ws = XLSX.utils.json_to_sheet(linhasExportacao)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Beneficiarios")
      const sufixoGrupos =
        nomesGruposSelecionados.length === 1
          ? nomesGruposSelecionados[0]
          : `multiplos-grupos-${nomesGruposSelecionados.length}`
      XLSX.writeFile(
        wb,
        `relatorio-beneficiarios-${sufixoGrupos.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    } catch (error: any) {
      toast.error("Erro ao exportar Excel: " + (error?.message || "erro desconhecido"))
    } finally {
      setExportando("")
    }
  }

  async function exportarPdf() {
    if (linhasExportacao.length === 0) {
      toast.info("Não há dados para exportar.")
      return
    }

    try {
      setExportando("pdf")
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const margin = 10
      const maxY = 285
      let y = 14

      doc.setFontSize(13)
      doc.setFont(undefined, "bold")
      doc.text("RELATORIO DE BENEFICIARIOS", margin, y)
      y += 6
      doc.setFontSize(9)
      doc.setFont(undefined, "normal")
      doc.text(
        `Grupos: ${
          nomesGruposSelecionados.length > 0 ? nomesGruposSelecionados.join(", ") : "-"
        }`,
        margin,
        y
      )
      y += 4
      doc.text(`Total: ${linhasExportacao.length} | Titulares: ${totalTitulares} | Dependentes: ${totalDependentes}`, margin, y)
      y += 4
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, y)
      y += 7

      const colunasOrdem = Object.keys(linhasExportacao[0] || {})

      linhasExportacao.forEach((linha, index) => {
        if (y > maxY - 35) {
          doc.addPage()
          y = 14
        }

        doc.setFont(undefined, "bold")
        doc.setFontSize(10)
        doc.text(`${index + 1}. ${String(linha.Nome || "-")}`, margin, y)
        y += 5
        doc.setFont(undefined, "normal")
        doc.setFontSize(8.5)

        colunasOrdem.forEach((coluna) => {
          const valor = String(linha[coluna] ?? "-")
          const texto = `${coluna}: ${valor}`
          const linhas = doc.splitTextToSize(texto, 190)
          if (y + linhas.length * 4 > maxY) {
            doc.addPage()
            y = 14
          }
          doc.text(linhas, margin, y)
          y += linhas.length * 4
        })

        y += 3
        doc.setDrawColor(220, 220, 220)
        doc.line(margin, y, 200, y)
        y += 5
      })

      const sufixoGrupos =
        nomesGruposSelecionados.length === 1
          ? nomesGruposSelecionados[0]
          : `multiplos-grupos-${nomesGruposSelecionados.length}`
      doc.save(
        `relatorio-beneficiarios-${sufixoGrupos.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
      )
    } catch (error: any) {
      toast.error("Erro ao exportar PDF: " + (error?.message || "erro desconhecido"))
    } finally {
      setExportando("")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Relatório Layout</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione um ou mais grupos de beneficiários e exporte o relatório de layout em Excel ou PDF.
        </p>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Grupos de beneficiários</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 w-full justify-between font-normal">
                    <span className="truncate">
                      {grupoIdsSelecionados.length === 0
                        ? "Selecione um ou mais grupos"
                        : `${grupoIdsSelecionados.length} grupo(s) selecionado(s)`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[420px] max-w-[90vw] p-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setGrupoIdsSelecionados(grupos.map((g) => g.id))}
                      >
                        Selecionar todos
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setGrupoIdsSelecionados([])}
                      >
                        Limpar
                      </Button>
                    </div>
                    <div className="max-h-56 overflow-auto space-y-2 pr-1">
                      {grupos.map((grupo) => {
                        const checked = grupoIdsSelecionados.includes(grupo.id)
                        return (
                          <label key={grupo.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(valor) => {
                                setGrupoIdsSelecionados((prev) => {
                                  if (valor) return prev.includes(grupo.id) ? prev : [...prev, grupo.id]
                                  return prev.filter((id) => id !== grupo.id)
                                })
                              }}
                            />
                            <span>{grupo.nome}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button
                onClick={carregarBeneficiarios}
                disabled={loading || grupoIdsSelecionados.length === 0}
                className="h-10 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm w-full md:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Carregar dados
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500">Total de beneficiários</p>
              <p className="text-xl font-semibold text-gray-800">{beneficiariosFiltrados.length}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500">Titulares</p>
              <p className="text-xl font-semibold text-gray-800">{totalTitulares}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-500">Dependentes</p>
              <p className="text-xl font-semibold text-gray-800">{totalDependentes}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <Select value={filtroStatus} onValueChange={(v: "todos" | "ativo" | "cancelado") => setFiltroStatus(v)}>
                <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo de beneficiário</label>
              <Select value={filtroTipo} onValueChange={(v: "todos" | "titular" | "dependente") => setFiltroTipo(v)}>
                <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="titular">Somente titulares</SelectItem>
                  <SelectItem value="dependente">Somente dependentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Colunas extras do relatório</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 w-full justify-between font-normal">
                  <span className="truncate">
                    {colunasExtrasSelecionadas.length === 0
                      ? "Nenhuma coluna extra selecionada"
                      : `${colunasExtrasSelecionadas.length} coluna(s) extra selecionada(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[360px] max-w-[90vw] p-3">
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    As colunas selecionadas serão incluídas na pré-visualização e na exportação.
                  </p>
                  <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setColunasExtrasSelecionadas(DEFAULT_EXTRA_COLUMNS)}
                    >
                      Padrão
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setColunasExtrasSelecionadas(EXTRA_COLUMN_OPTIONS.map((opt) => opt.key))}
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setColunasExtrasSelecionadas([])}
                    >
                      Limpar
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-auto space-y-2 pr-1">
                    {EXTRA_COLUMN_OPTIONS.map((opcao) => {
                      const checked = colunasExtrasSelecionadas.includes(opcao.key)
                      return (
                        <label key={opcao.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(valor) => {
                              setColunasExtrasSelecionadas((prev) => {
                                if (valor) {
                                  return prev.includes(opcao.key) ? prev : [...prev, opcao.key]
                                }
                                return prev.filter((item) => item !== opcao.key)
                              })
                            }}
                          />
                          <span>{opcao.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              className="h-9"
              onClick={exportarExcel}
              disabled={exportando !== "" || linhasExportacao.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exportando === "excel" ? "Exportando Excel..." : "Exportar Excel"}
            </Button>
            <Button
              variant="outline"
              className="h-9"
              onClick={exportarPdf}
              disabled={exportando !== "" || linhasExportacao.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              {exportando === "pdf" ? "Exportando PDF..." : "Exportar PDF"}
            </Button>
          </div>

          {linhasExportacao.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Nome</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">CPF</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Parentesco</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                    {EXTRA_COLUMN_OPTIONS.filter((c) => colunasExtrasSelecionadas.includes(c.key)).map((coluna) => (
                      <th key={coluna.key} className="px-3 py-2 text-left font-semibold text-gray-700">
                        {coluna.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhasExportacao.slice(0, 15).map((linha, idx) => (
                    <tr key={`${linha.CPF}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                      <td className="px-3 py-2">{linha.Nome}</td>
                      <td className="px-3 py-2">{linha.CPF}</td>
                      <td className="px-3 py-2">{linha.Tipo}</td>
                      <td className="px-3 py-2">{linha.Parentesco}</td>
                      <td className="px-3 py-2">{linha.Status}</td>
                      {EXTRA_COLUMN_OPTIONS.filter((c) => colunasExtrasSelecionadas.includes(c.key)).map((coluna) => (
                        <td key={coluna.key} className="px-3 py-2">
                          {String(linha[coluna.label] ?? "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {linhasExportacao.length > 15 && (
                <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
                  Mostrando 15 de {linhasExportacao.length} registros. Use a exportação para obter o relatório completo.
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 rounded-md p-8 text-center text-sm text-gray-500">
              <Download className="h-4 w-4 inline mr-1" />
              Selecione um grupo, carregue os dados e ajuste os filtros para liberar a exportação.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
