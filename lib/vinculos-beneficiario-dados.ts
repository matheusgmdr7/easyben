import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"

type Registro = Record<string, unknown>

export type DadosAutomaticosFichaAdmissao = {
  nome: string
  data_nascimento: string
  local_nascimento: string
  uf_nascimento: string
  cpf: string
  rg: string
  orgao_emissor: string
  endereco_completo: string
  carteira_trabalho_digital: string
}

export type DadosOpcionaisFichaAdmissao = {
  data_admissao?: string
  funcao?: string
  salario?: string
  horario_trabalho?: string
  horas_almoco?: string
  estado_civil?: string
  grau_instrucao?: string
  contrato_experiencia?: "sim" | "nao" | ""
}

function valorCampo(obj: Registro | null | undefined, chaves: string[]): string {
  if (!obj) return ""
  for (const chave of chaves) {
    const v = obj[chave]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ""
}

export function formatarDataFichaAdmissao(valor?: string): string {
  if (!valor) return ""
  const s = String(valor).trim()
  if (!s) return ""
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  const parte = s.split("T")[0]
  const [ano, mes, dia] = parte.split("-")
  if (ano && mes && dia) return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`
  return s
}

/** Formata salário para o PDF (ex.: 1.300,00, sem símbolo R$). */
export function formatarSalarioFicha(valor?: string): string {
  const s = String(valor || "").trim()
  if (!s) return ""

  const semMoeda = s.replace(/R\$\s?/gi, "").trim()
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(semMoeda)) return semMoeda

  const comPontoDecimal = semMoeda.replace(/\./g, "").replace(",", ".")
  const numero = Number(comPontoDecimal)
  if (!Number.isNaN(numero) && comPontoDecimal.match(/^\d+(\.\d+)?$/)) {
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const digitos = s.replace(/\D/g, "")
  if (!digitos) return ""
  return (Number(digitos) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatarDataBr(iso: unknown): string {
  return formatarDataFichaAdmissao(String(iso ?? ""))
}

function formatarCpf(cpf: unknown): string {
  const d = String(cpf || "").replace(/\D/g, "")
  if (d.length !== 11) return String(cpf || "").trim()
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

function montarEndereco(vida: Registro): string {
  const adic =
    vida.dados_adicionais && typeof vida.dados_adicionais === "object"
      ? (vida.dados_adicionais as Registro)
      : {}

  const partes = [
    valorCampo(vida, ["logradouro"]) || valorCampo(adic, ["logradouro", "endereco"]),
    valorCampo(vida, ["numero"]) || valorCampo(adic, ["numero"]),
    valorCampo(vida, ["complemento"]) || valorCampo(adic, ["complemento"]),
    valorCampo(vida, ["bairro"]) || valorCampo(adic, ["bairro"]),
    [
      valorCampo(vida, ["cidade"]) || valorCampo(adic, ["cidade"]),
      valorCampo(vida, ["estado", "uf"]) || valorCampo(adic, ["estado", "uf"]),
    ]
      .filter(Boolean)
      .join("/"),
    (() => {
      const cep = valorCampo(vida, ["cep"]) || valorCampo(adic, ["cep"])
      return cep ? `CEP ${cep}` : ""
    })(),
  ].filter(Boolean)

  return partes.join(" - ")
}

export function mapearVidaParaFichaAdmissao(vida: Registro): DadosAutomaticosFichaAdmissao {
  const adic =
    vida.dados_adicionais && typeof vida.dados_adicionais === "object"
      ? (vida.dados_adicionais as Registro)
      : {}

  const cpfFmt = formatarCpf(vida.cpf)

  return {
    nome: String(vida.nome || "").trim().toUpperCase(),
    data_nascimento: formatarDataBr(vida.data_nascimento),
    local_nascimento: (
      valorCampo(adic, ["naturalidade", "local_nascimento", "cidade_nascimento"]) ||
      valorCampo(vida, ["cidade"])
    ).toUpperCase(),
    uf_nascimento: (
      valorCampo(adic, ["uf_nascimento", "uf_nasc", "estado_nascimento"]) ||
      valorCampo(vida, ["estado", "uf"])
    ).toUpperCase(),
    cpf: cpfFmt,
    rg: valorCampo(vida, ["identidade"]) || valorCampo(adic, ["rg", "identidade"]),
    orgao_emissor: valorCampo(adic, ["orgao_emissor", "orgao_expedidor", "orgao_emissor_rg"]).toUpperCase(),
    endereco_completo: montarEndereco(vida).toUpperCase(),
    carteira_trabalho_digital: cpfFmt,
  }
}

export async function carregarVidaParaVinculos(
  vidaImportadaId: string,
  administradoraId: string
): Promise<Registro> {
  const tenantId = await resolveTenantIdForAdministradora(administradoraId)

  let { data, error } = await supabaseAdmin
    .from("vidas_importadas")
    .select("*")
    .eq("id", vidaImportadaId)
    .eq("administradora_id", administradoraId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (!data && tenantId) {
    const fb = await supabaseAdmin
      .from("vidas_importadas")
      .select("*")
      .eq("id", vidaImportadaId)
      .eq("administradora_id", administradoraId)
      .maybeSingle()
    data = fb.data
    error = fb.error
  }

  if (error) throw error
  if (!data) throw new Error("Beneficiário não encontrado")
  return data as Registro
}

export function sugestoesOpcionaisDaVida(vida: Registro): DadosOpcionaisFichaAdmissao {
  const adic =
    vida.dados_adicionais && typeof vida.dados_adicionais === "object"
      ? (vida.dados_adicionais as Registro)
      : {}

  return {
    estado_civil: valorCampo(vida, ["estado_civil"]) || valorCampo(adic, ["estado_civil"]),
    grau_instrucao:
      valorCampo(adic, ["grau_instrucao", "escolaridade", "grau_de_instrucao"]) || "",
  }
}
