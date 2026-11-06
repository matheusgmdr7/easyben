import { createHash } from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  formatarDataFichaAdmissao,
  type DadosAutomaticosFichaAdmissao,
  type DadosOpcionaisFichaAdmissao,
} from "@/lib/vinculos-beneficiario-dados"
import type { PartesEnderecoVinculo } from "@/lib/vinculos-planilha"

type Registro = Record<string, unknown>

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const

const VALOR_MENSAL = "10,00"
const MAX_LINHAS_EXTRATO = 12

export type LinhaExtratoCartao = {
  mes: string
  valor: string
  dataPagamento: string
  status: string
}

export type DadosPreenchimentoFichaCartao = {
  nome: string
  nomeMae: string
  cpf: string
  rg: string
  dataNascimento: string
  estadoCivil: string
  profissao: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidadeUf: string
  cep: string
  telefoneResidencial: string
  telefoneCelular: string
  telefoneComercial: string
  whatsapp: string
  email: string
  possuiDependentes: boolean
  localData: string
  matricula: string
  associadoDesde: string
  periodo: string
  dataEmissao: string
  linhas: LinhaExtratoCartao[]
  total: string
}

function valorCampo(obj: Registro | null | undefined, chaves: string[]): string {
  if (!obj) return ""
  for (const chave of chaves) {
    const valor = obj[chave]
    if (valor != null && String(valor).trim()) return String(valor).trim()
  }
  return ""
}

export function hojeSaoPaulo(base = new Date()): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base)
  const [ano, mes, dia] = iso.split("-").map(Number)
  return new Date(ano, mes - 1, dia)
}

function parseDataCalendario(valor?: string): Date | null {
  const texto = String(valor || "").trim()
  if (!texto) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
  return null
}

function dataDoCadastro(vida?: Registro | null): Date | null {
  const bruto = vida?.created_at ?? vida?.data_cadastro
  if (!bruto) return null
  const instante = new Date(String(bruto))
  if (Number.isNaN(instante.getTime())) return parseDataCalendario(String(bruto))
  return hojeSaoPaulo(instante)
}

/** Data de admissão digitada, senão a data de cadastro da vida, senão hoje. */
export function resolverDataAssinatura(
  opcionais: DadosOpcionaisFichaAdmissao | undefined,
  vida: Registro | null | undefined,
  agora = hojeSaoPaulo()
): Date {
  return parseDataCalendario(opcionais?.data_admissao) || dataDoCadastro(vida) || agora
}

/** Matrícula estável: os 14 dígitos saem de um SHA-256 do CPF (ou do nome). */
export function gerarMatriculaApti(seed: string): string {
  const base = String(seed || "sem-identificacao").replace(/\s+/g, " ").trim() || "sem-identificacao"
  const bytes = createHash("sha256").update(`apti-matricula:v1:${base}`).digest()
  let digitos = ""
  for (const byte of bytes) {
    digitos += String(byte % 10)
    if (digitos.length === 14) break
  }
  return `APTI ${digitos.slice(0, 9)}-${digitos.slice(9)}`
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0")
}

function formatarData(data: Date): string {
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

export function listarMesesContribuicao(inicio: Date, hoje: Date): Array<{ ano: number; mes: number }> {
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  if (cursor > fim) return []
  const meses: Array<{ ano: number; mes: number }> = []
  while (cursor <= fim) {
    meses.push({ ano: cursor.getFullYear(), mes: cursor.getMonth() + 1 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return meses.slice(-MAX_LINHAS_EXTRATO)
}

function formatarCep(cep: string): string {
  const digitos = cep.replace(/\D/g, "")
  if (digitos.length !== 8) return cep.trim()
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

function formatarTelefone(raw: string): string {
  let digitos = String(raw || "").replace(/\D/g, "")
  if (digitos.startsWith("55") && digitos.length > 11) digitos = digitos.slice(2)
  if (digitos.length === 11) return `${digitos.slice(0, 2)} ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  if (digitos.length === 10) return `${digitos.slice(0, 2)} ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  return String(raw || "").trim()
}

function listarTelefones(telefones: unknown): string[] {
  if (!Array.isArray(telefones)) return []
  const saida: string[] = []
  for (const item of telefones) {
    if (typeof item === "string" && item.trim()) {
      saida.push(item.trim())
      continue
    }
    if (item && typeof item === "object") {
      const registro = item as Registro
      const numero = registro.numero ?? registro.telefone ?? registro.phone ?? registro.celular
      if (numero != null && String(numero).trim()) saida.push(String(numero).trim())
    }
  }
  return saida
}

function primeiroEmail(emails: unknown, adicionais: Registro): string {
  if (typeof emails === "string" && emails.trim()) return emails.trim()
  if (Array.isArray(emails)) {
    for (const item of emails) {
      if (typeof item === "string" && item.trim()) return item.trim()
      if (item && typeof item === "object") {
        const registro = item as Registro
        const email = registro.email ?? registro.endereco ?? registro.value
        if (email != null && String(email).trim()) return String(email).trim()
      }
    }
  }
  return valorCampo(adicionais, ["email", "e-mail", "email_principal"])
}

function partesDaVida(vida?: Registro | null): PartesEnderecoVinculo {
  const adicionais =
    vida?.dados_adicionais && typeof vida.dados_adicionais === "object"
      ? (vida.dados_adicionais as Registro)
      : {}
  return {
    logradouro: valorCampo(vida, ["logradouro"]) || valorCampo(adicionais, ["logradouro", "endereco"]),
    numero: valorCampo(vida, ["numero"]) || valorCampo(adicionais, ["numero"]),
    complemento: valorCampo(vida, ["complemento"]) || valorCampo(adicionais, ["complemento"]),
    bairro: valorCampo(vida, ["bairro"]) || valorCampo(adicionais, ["bairro"]),
    cidade: valorCampo(vida, ["cidade"]) || valorCampo(adicionais, ["cidade"]),
    uf: (valorCampo(vida, ["estado", "uf"]) || valorCampo(adicionais, ["estado", "uf"])).slice(0, 2),
    cep: valorCampo(vida, ["cep"]) || valorCampo(adicionais, ["cep"]),
  }
}

function temAlgumaParte(partes?: PartesEnderecoVinculo | null): boolean {
  if (!partes) return false
  return Object.values(partes).some((valor) => String(valor || "").trim())
}

export function montarDadosFichaCartao(params: {
  automaticos: DadosAutomaticosFichaAdmissao
  opcionais?: DadosOpcionaisFichaAdmissao
  vida?: Registro | null
  partesEndereco?: PartesEnderecoVinculo | null
  possuiDependentes: boolean
  agora?: Date
}): DadosPreenchimentoFichaCartao {
  const agora = params.agora ?? hojeSaoPaulo()
  const vida = params.vida
  const adicionais =
    vida?.dados_adicionais && typeof vida.dados_adicionais === "object"
      ? (vida.dados_adicionais as Registro)
      : {}
  const assinatura = resolverDataAssinatura(params.opcionais, vida, agora)
  const partesInformadas = temAlgumaParte(params.partesEndereco) ? params.partesEndereco : null
  const partes = partesInformadas || partesDaVida(vida)
  const usarPartes = temAlgumaParte(partes)
  const cidade = String(partes?.cidade || "").trim()
  const uf = String(partes?.uf || "").trim().toUpperCase().slice(0, 2)
  const telefones = listarTelefones(vida?.telefones)
  const telefonePlanilha = String(params.opcionais?.telefone || "").trim()
  const celular =
    telefonePlanilha ||
    valorCampo(adicionais, ["celular", "telefone_celular", "telefone"]) ||
    telefones[0] ||
    ""
  const whatsapp =
    telefonePlanilha || valorCampo(adicionais, ["whatsapp", "WhatsApp"]) || celular
  const residencial =
    valorCampo(adicionais, ["telefone_residencial", "tel_residencial"]) ||
    (telefones[0] && telefones[0] !== celular ? telefones[0] : telefones[1] || "")
  const cpfDigitos = String(params.automaticos.cpf || "").replace(/\D/g, "")
  const semente = cpfDigitos || String(params.automaticos.nome || "")
  const meses = listarMesesContribuicao(assinatura, agora)
  const linhas = meses.map((item) => {
    const diaPreferido = assinatura.getDate()
    let dia = Math.min(diaPreferido, ultimoDiaDoMes(item.ano, item.mes))
    const data = new Date(item.ano, item.mes - 1, dia)
    if (data > agora) dia = agora.getDate()
    return {
      mes: `${MESES[item.mes - 1]}/${item.ano}`,
      valor: VALOR_MENSAL,
      dataPagamento: `${doisDigitos(dia)}/${doisDigitos(item.mes)}/${item.ano}`,
      status: "Pago",
    }
  })
  const primeiro = meses[0]
  const ultimo = meses[meses.length - 1]
  const periodo =
    !primeiro || !ultimo
      ? ""
      : primeiro === ultimo
        ? `${doisDigitos(primeiro.mes)}/${primeiro.ano}`
        : `${doisDigitos(primeiro.mes)}/${primeiro.ano} a ${doisDigitos(ultimo.mes)}/${ultimo.ano}`
  const total = (linhas.length * 10).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return {
    nome: String(params.automaticos.nome || "").trim().toUpperCase(),
    nomeMae: (
      valorCampo(vida, ["nome_mae"]) || valorCampo(adicionais, ["nome_mae", "nome_da_mae"])
    ).toUpperCase(),
    cpf: params.automaticos.cpf,
    rg: params.automaticos.rg,
    dataNascimento: params.automaticos.data_nascimento,
    estadoCivil: String(
      params.opcionais?.estado_civil ||
        valorCampo(vida, ["estado_civil"]) ||
        valorCampo(adicionais, ["estado_civil"])
    )
      .trim()
      .toUpperCase(),
    profissao: String(
      params.opcionais?.funcao || valorCampo(adicionais, ["profissao", "profissão", "atividade"])
    )
      .trim()
      .toUpperCase(),
    endereco: usarPartes
      ? String(partes?.logradouro || "").trim().toUpperCase()
      : String(params.automaticos.endereco_completo || "").trim().toUpperCase(),
    numero: usarPartes ? String(partes?.numero || "").trim() : "",
    complemento: usarPartes ? String(partes?.complemento || "").trim().toUpperCase() : "",
    bairro: usarPartes ? String(partes?.bairro || "").trim().toUpperCase() : "",
    cidadeUf: usarPartes ? [cidade.toUpperCase(), uf].filter(Boolean).join("/") : "",
    cep: usarPartes ? formatarCep(String(partes?.cep || "")) : "",
    telefoneResidencial: formatarTelefone(residencial),
    telefoneCelular: formatarTelefone(celular),
    telefoneComercial: formatarTelefone(valorCampo(adicionais, ["telefone_comercial", "tel_comercial"])),
    whatsapp: formatarTelefone(whatsapp),
    email: String(params.opcionais?.email || "").trim() || primeiroEmail(vida?.emails, adicionais),
    possuiDependentes: params.possuiDependentes,
    localData: `São Paulo, ${formatarData(assinatura)}`,
    matricula: gerarMatriculaApti(semente),
    associadoDesde: `${MESES[assinatura.getMonth()]}/${assinatura.getFullYear()}`,
    periodo,
    dataEmissao: formatarDataFichaAdmissao(formatarDataIso(agora)) || formatarData(agora),
    linhas,
    total: linhas.length ? total : "",
  }
}

function formatarDataIso(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export async function vidaPossuiDependentes(vida?: Registro | null): Promise<boolean> {
  if (!vida) return false
  if (String(vida.tipo || "").toLowerCase() === "dependente") return false
  const cpf = String(vida.cpf || "").replace(/\D/g, "")
  const grupoId = String(vida.grupo_id || "").trim()
  const administradoraId = String(vida.administradora_id || "").trim()
  if (cpf.length !== 11 || !grupoId) return false

  let consulta = supabaseAdmin
    .from("vidas_importadas")
    .select("tipo, cpf_titular")
    .eq("grupo_id", grupoId)
  if (administradoraId) consulta = consulta.eq("administradora_id", administradoraId)

  const { data, error } = await consulta
  if (error) return false
  return (data || []).some(
    (dependente) =>
      String(dependente.tipo || "").toLowerCase() === "dependente" &&
      String(dependente.cpf_titular || "").replace(/\D/g, "") === cpf
  )
}
