import type { DadosAutomaticosFichaAdmissao, DadosOpcionaisFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"

export type ConfigPreenchimentoSintetico = {
  ativo: boolean
  endereco_cidade?: string
  endereco_uf?: string
  orgao_emissor_padrao?: string
  /** Se true, usa cidade/UF do endereço sintético quando local de nascimento estiver vazio */
  local_nascimento_da_cidade?: boolean
  estado_civil_aleatorio?: boolean
  grau_instrucao_aleatorio?: boolean
}

export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const

const ESTADOS_CIVIS = ["SOLTEIRO", "CASADO", "DIVORCIADO", "VIÚVO", "UNIÃO ESTÁVEL"] as const
const GRAUS_INSTRUCAO = [
  "FUNDAMENTAL",
  "MÉDIO",
  "SUPERIOR",
  "PÓS-GRADUAÇÃO",
  "MESTRADO",
  "DOUTORADO",
] as const

const TIPOS_LOGRADOURO = ["Rua", "Avenida", "Travessa", "Alameda", "Praça"] as const
const NOMES_LOGRADOURO = [
  "das Flores",
  "São José",
  "Presidente Vargas",
  "7 de Setembro",
  "Getúlio Vargas",
  "Dom Pedro II",
  "Marechal Deodoro",
  "da Paz",
  "Brasil",
  "Independência",
  "Osvaldo Cruz",
  "Santos Dumont",
] as const

const BAIRROS_POR_CIDADE: Record<string, string[]> = {
  "joao pessoa": ["Tambiá", "Centro", "Bessa", "Mangabeira", "Cabo Branco", "Altiplano", "Jaguaribe"],
  "recife": ["Boa Viagem", "Centro", "Casa Forte", "Espinheiro", "Pina"],
  "natal": ["Ponta Negra", "Centro", "Cidade Alta", "Tirol", "Alecrim"],
  "fortaleza": ["Aldeota", "Centro", "Meireles", "Dionísio Torres", "Benfica"],
  "sao paulo": ["Centro", "Pinheiros", "Moema", "Tatuapé", "Santana", "Ipiranga"],
  "rio de janeiro": ["Copacabana", "Centro", "Tijuca", "Botafogo", "Barra da Tijuca"],
  "belo horizonte": ["Centro", "Savassi", "Pampulha", "Funcionários", "Lourdes"],
  "salvador": ["Barra", "Centro", "Pituba", "Itapuã", "Ondina"],
  "curitiba": ["Centro", "Batel", "Água Verde", "Bigorrilho", "Portão"],
}

const BAIRROS_GENERICOS = ["Centro", "Jardim América", "Vila Nova", "São José", "Industrial", "Cidade Nova"]

/** Prefixos aproximados de CEP por UF (5 primeiros dígitos base). */
const CEP_BASE_POR_UF: Record<string, number> = {
  AC: 69900, AL: 57000, AP: 68900, AM: 69000, BA: 40000, CE: 60000, DF: 70000,
  ES: 29000, GO: 74000, MA: 65000, MT: 78000, MS: 79000, MG: 30000, PA: 66000,
  PB: 58000, PR: 80000, PE: 50000, PI: 64000, RJ: 20000, RN: 59000, RS: 90000,
  RO: 76800, RR: 69300, SC: 88000, SP: 1000, SE: 49000, TO: 77000,
}

function normalizarChaveCidade(cidade: string): string {
  return cidade
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function rng(seed: string, salt: string) {
  let n = hashSeed(`${seed}:${salt}`)
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0
    return n / 0xffffffff
  }
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

function pickInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function gerarCepSintetico(uf: string, seed: string): string {
  const ufUp = uf.toUpperCase().slice(0, 2)
  const base = CEP_BASE_POR_UF[ufUp] ?? 58000
  const rand = rng(seed, "cep")
  const sufixo = pickInt(0, 999, rand)
  const cepNum = String(base + sufixo).padStart(5, "0").slice(0, 5) + pickInt(100, 999, rand)
  const s = cepNum.padStart(8, "0")
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

export function gerarEnderecoSintetico(cidade: string, uf: string, seed: string): string {
  const cidadeFmt = cidade.trim().toUpperCase()
  const ufFmt = uf.toUpperCase().slice(0, 2)
  const rand = rng(seed, "endereco")
  const tipo = pick(TIPOS_LOGRADOURO, rand)
  const nome = pick(NOMES_LOGRADOURO, rand)
  const numero = pickInt(1, 2500, rand)
  const compl = rand() > 0.7 ? ` BL ${pickInt(1, 4, rand)} APT ${pickInt(101, 904, rand)}` : ""
  const chave = normalizarChaveCidade(cidade)
  const bairros = BAIRROS_POR_CIDADE[chave] ?? BAIRROS_GENERICOS
  const bairro = pick(bairros, rand).toUpperCase()
  const cep = gerarCepSintetico(ufFmt, seed)
  return `${tipo.toUpperCase()} ${nome.toUpperCase()}, ${numero}${compl} - ${bairro} - ${cidadeFmt}/${ufFmt} - CEP ${cep}`
}

export function listarCamposFaltandoFicha(
  automaticos: DadosAutomaticosFichaAdmissao,
  opcionais?: DadosOpcionaisFichaAdmissao
): string[] {
  const faltando: string[] = []
  if (!automaticos.endereco_completo?.trim()) faltando.push("endereco")
  if (!automaticos.local_nascimento?.trim()) faltando.push("local_nascimento")
  if (!automaticos.uf_nascimento?.trim()) faltando.push("uf_nascimento")
  if (!automaticos.rg?.trim()) faltando.push("rg")
  if (!automaticos.orgao_emissor?.trim()) faltando.push("orgao_emissor")
  if (!opcionais?.estado_civil?.trim()) faltando.push("estado_civil")
  if (!opcionais?.grau_instrucao?.trim()) faltando.push("grau_instrucao")
  return faltando
}

export function aplicarPreenchimentoSintetico(params: {
  automaticos: DadosAutomaticosFichaAdmissao
  opcionais?: DadosOpcionaisFichaAdmissao
  config: ConfigPreenchimentoSintetico
  /** CPF ou id da vida — mantém dados estáveis no lote */
  seed: string
}): {
  automaticos: DadosAutomaticosFichaAdmissao
  opcionais: DadosOpcionaisFichaAdmissao
  preenchidos: string[]
} {
  const { config, seed } = params
  const automaticos = { ...params.automaticos }
  const opcionais: DadosOpcionaisFichaAdmissao = { ...(params.opcionais || {}) }
  const preenchidos: string[] = []

  if (!config.ativo) {
    return { automaticos, opcionais, preenchidos }
  }

  const cidade = String(config.endereco_cidade || "").trim()
  const uf = String(config.endereco_uf || "").trim().toUpperCase().slice(0, 2)
  const rand = rng(seed, "misc")

  if (!automaticos.endereco_completo?.trim() && cidade && uf) {
    automaticos.endereco_completo = gerarEnderecoSintetico(cidade, uf, seed)
    preenchidos.push("endereco_completo")
  }

  if (config.local_nascimento_da_cidade !== false && cidade && uf) {
    if (!automaticos.local_nascimento?.trim()) {
      automaticos.local_nascimento = cidade.toUpperCase()
      preenchidos.push("local_nascimento")
    }
    if (!automaticos.uf_nascimento?.trim()) {
      automaticos.uf_nascimento = uf
      preenchidos.push("uf_nascimento")
    }
  }

  if (!automaticos.orgao_emissor?.trim() && config.orgao_emissor_padrao?.trim()) {
    automaticos.orgao_emissor = config.orgao_emissor_padrao.trim().toUpperCase()
    preenchidos.push("orgao_emissor")
  }

  if (!opcionais.estado_civil?.trim() && config.estado_civil_aleatorio) {
    opcionais.estado_civil = pick(ESTADOS_CIVIS, rand)
    preenchidos.push("estado_civil")
  }

  if (!opcionais.grau_instrucao?.trim() && config.grau_instrucao_aleatorio) {
    opcionais.grau_instrucao = pick(GRAUS_INSTRUCAO, rand)
    preenchidos.push("grau_instrucao")
  }

  return { automaticos, opcionais, preenchidos }
}

export function parseConfigPreenchimentoSintetico(body: Record<string, unknown>): ConfigPreenchimentoSintetico {
  const raw = body.preenchimento_sintetico
  if (!raw || typeof raw !== "object") {
    return { ativo: false }
  }
  const c = raw as Record<string, unknown>
  return {
    ativo: c.ativo === true,
    endereco_cidade: String(c.endereco_cidade || "").trim(),
    endereco_uf: String(c.endereco_uf || "").trim().toUpperCase().slice(0, 2),
    orgao_emissor_padrao: String(c.orgao_emissor_padrao || "").trim(),
    local_nascimento_da_cidade: c.local_nascimento_da_cidade !== false,
    estado_civil_aleatorio: c.estado_civil_aleatorio === true,
    grau_instrucao_aleatorio: c.grau_instrucao_aleatorio === true,
  }
}
