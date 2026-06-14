/** Árvore de permissões espelhando o menu lateral da administradora. */
export type ItemMenuAdministradora = {
  id: string
  label: string
  path?: string
  children?: ItemMenuAdministradora[]
}

export const MENU_ADMINISTRADORA: ItemMenuAdministradora[] = [
  { id: "dashboard", label: "Dashboard", path: "/administradora/dashboard" },
  {
    id: "relatorios",
    label: "Relatórios",
    children: [
      { id: "relatorios_faturamento", label: "Faturamento", path: "/administradora/faturamento" },
      { id: "relatorios_geral", label: "Relatórios", path: "/administradora/relatorios" },
      { id: "relatorios_comissao", label: "Comissão", path: "/administradora/relatorios/comissao" },
      { id: "relatorios_devedores", label: "Devedores", path: "/administradora/fatura/devedores" },
    ],
  },
  {
    id: "auditoria",
    label: "Auditoria",
    children: [
      { id: "auditoria_faturas", label: "Auditar faturas", path: "/administradora/auditoria/faturas" },
    ],
  },
  {
    id: "grupos_beneficiarios",
    label: "Grupo de Beneficiários",
    path: "/administradora/grupos-beneficiarios",
  },
  {
    id: "beneficiarios",
    label: "Beneficiários",
    children: [
      { id: "beneficiarios_titular", label: "Titular", path: "/administradora/beneficiarios/titular" },
      { id: "beneficiarios_dependentes", label: "Dependentes", path: "/administradora/beneficiarios/dependentes" },
      { id: "beneficiarios_contrato", label: "Contrato", path: "/administradora/beneficiarios/contrato" },
      {
        id: "beneficiarios_cancelamento_grupo",
        label: "Cancelamento em grupo",
        path: "/administradora/beneficiarios/cancelamento-em-grupo",
      },
      { id: "beneficiarios_cancelados", label: "Cancelados", path: "/administradora/beneficiarios/cancelados" },
      {
        id: "beneficiarios_importacao_vidas",
        label: "Importação de vidas",
        path: "/administradora/beneficiarios/importacao-vidas",
      },
      {
        id: "beneficiarios_importacao_matriculas",
        label: "Importação de matrículas",
        path: "/administradora/beneficiarios/importacao-matriculas",
      },
      {
        id: "beneficiarios_comparacao_planilhas",
        label: "Comparação de planilhas",
        path: "/administradora/beneficiarios/comparacao-planilhas",
      },
    ],
  },
  {
    id: "fatura",
    label: "Fatura",
    children: [
      { id: "fatura_gerar", label: "Gerar", path: "/administradora/fatura/gerar" },
      { id: "fatura_pesquisar", label: "Pesquisar", path: "/administradora/fatura" },
    ],
  },
  { id: "financeiras", label: "Financeira", path: "/administradora/financeiras" },
  {
    id: "financeiro",
    label: "Financeiro",
    children: [
      { id: "financeiro_cobrancas", label: "Cobranças", path: "/administradora/financeiro/cobrancas" },
      { id: "financeiro_inadimplencia", label: "Inadimplência", path: "/administradora/financeiro/inadimplencia" },
      { id: "financeiro_pesquisar", label: "Pesquisar", path: "/administradora/financeiro/pesquisar" },
    ],
  },
  {
    id: "contrato",
    label: "Contrato",
    children: [
      { id: "contrato_pesquisar", label: "Pesquisar", path: "/administradora/contrato/pesquisar" },
      { id: "contrato_novo", label: "Novo", path: "/administradora/contrato/novo" },
    ],
  },
  { id: "propostas", label: "Propostas", path: "/administradora/propostas" },
  { id: "corretores", label: "Corretores", path: "/administradora/corretores" },
  {
    id: "configuracoes",
    label: "Configurações",
    children: [
      { id: "gerenciar_acesso", label: "Gerenciar acesso", path: "/administradora/gerenciar-acesso" },
      { id: "configuracoes_preferencias", label: "Preferências", path: "/administradora/configuracoes" },
    ],
  },
]

/** IDs legados (módulos agrupados) → IDs granulares atuais. */
const LEGADO_PARA_GRANULAR: Record<string, string[]> = {
  relatorios: [
    "relatorios_faturamento",
    "relatorios_geral",
    "relatorios_comissao",
    "relatorios_devedores",
  ],
  auditoria: ["auditoria_faturas"],
  beneficiarios: [
    "beneficiarios_titular",
    "beneficiarios_dependentes",
    "beneficiarios_contrato",
    "beneficiarios_cancelamento_grupo",
    "beneficiarios_cancelados",
    "beneficiarios_importacao_vidas",
    "beneficiarios_importacao_matriculas",
    "beneficiarios_comparacao_planilhas",
  ],
  fatura: ["fatura_gerar", "fatura_pesquisar"],
  financeiro: ["financeiro_cobrancas", "financeiro_inadimplencia", "financeiro_pesquisar"],
  contrato: ["contrato_pesquisar", "contrato_novo"],
  configuracoes: ["configuracoes_preferencias"],
}

export type ModuloAdministradora = string

function coletarFolhas(item: ItemMenuAdministradora): string[] {
  if (!item.children?.length) return [item.id]
  return item.children.flatMap(coletarFolhas)
}

function indexarMenu(
  itens: ItemMenuAdministradora[],
  mapa = new Map<string, ItemMenuAdministradora>()
): Map<string, ItemMenuAdministradora> {
  for (const item of itens) {
    mapa.set(item.id, item)
    if (item.children) indexarMenu(item.children, mapa)
  }
  return mapa
}

const MAPA_MENU = indexarMenu(MENU_ADMINISTRADORA)

export const TODAS_PERMISSOES_MENU: string[] = MENU_ADMINISTRADORA.flatMap(coletarFolhas)

export const TODOS_MODULOS_ADMINISTRADORA = TODAS_PERMISSOES_MENU

export const MODULOS_ADMINISTRADORA = TODAS_PERMISSOES_MENU.map((id) => {
  const item = MAPA_MENU.get(id)
  return { id, label: item?.label || id, grupo: "Menu" }
})

export const MODULOS_LABELS: Record<string, string> = Object.fromEntries(
  [...MAPA_MENU.entries()].map(([id, item]) => [id, item.label])
)

export const PERFIS_ADMINISTRADORA: Record<
  string,
  { label: string; descricao: string; permissoes: string[] }
> = {
  operacional: {
    label: "Operacional",
    descricao: "Beneficiários, grupos e comercial",
    permissoes: expandirIdsPermissao([
      "dashboard",
      "grupos_beneficiarios",
      "beneficiarios",
      "propostas",
      "corretores",
    ]),
  },
  financeiro: {
    label: "Financeiro",
    descricao: "Faturas, cobranças e relatórios",
    permissoes: expandirIdsPermissao([
      "dashboard",
      "relatorios",
      "auditoria",
      "fatura",
      "financeiras",
      "financeiro",
    ]),
  },
  comercial: {
    label: "Comercial",
    descricao: "Propostas, corretores e contratos",
    permissoes: expandirIdsPermissao(["dashboard", "propostas", "corretores", "contrato", "beneficiarios"]),
  },
  completo: {
    label: "Acesso completo",
    descricao: "Todas as páginas exceto gerenciar acesso",
    permissoes: TODAS_PERMISSOES_MENU.filter((id) => id !== "gerenciar_acesso"),
  },
}

export function expandirIdsPermissao(ids: string[]): string[] {
  const out = new Set<string>()
  for (const id of ids) {
    if (LEGADO_PARA_GRANULAR[id]) {
      LEGADO_PARA_GRANULAR[id].forEach((g) => out.add(g))
      continue
    }
    const item = MAPA_MENU.get(id)
    if (item?.children?.length) {
      coletarFolhas(item).forEach((f) => out.add(f))
    } else if (TODAS_PERMISSOES_MENU.includes(id)) {
      out.add(id)
    }
  }
  return [...out]
}

export function normalizarPermissoesAdministradora(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return expandirIdsPermissao(valor.map((p) => String(p || "").trim()).filter(Boolean))
}

export function usuarioAdministradoraTemPermissao(
  permissoes: string[] | unknown,
  itemId: string,
  isMaster?: boolean
): boolean {
  if (isMaster) return true
  const lista = new Set(normalizarPermissoesAdministradora(permissoes))
  if (lista.has(itemId)) return true

  const item = MAPA_MENU.get(itemId)
  if (item?.children?.length) {
    return coletarFolhas(item).some((f) => lista.has(f))
  }
  return false
}

/** Seção do menu visível se o usuário tem a seção ou qualquer subitem. */
export function usuarioAdministradoraTemSecao(
  permissoes: string[] | unknown,
  secaoId: string,
  isMaster?: boolean
): boolean {
  return usuarioAdministradoraTemPermissao(permissoes, secaoId, isMaster)
}

const ROTAS_PERMISSAO: Array<{ prefixo: string; permissao: string }> = [
  { prefixo: "/administradora/gerenciar-acesso", permissao: "gerenciar_acesso" },
  { prefixo: "/administradora/configuracoes", permissao: "configuracoes_preferencias" },
  { prefixo: "/administradora/dashboard", permissao: "dashboard" },
  { prefixo: "/administradora/faturamento", permissao: "relatorios_faturamento" },
  { prefixo: "/administradora/relatorios/comissao", permissao: "relatorios_comissao" },
  { prefixo: "/administradora/relatorios", permissao: "relatorios_geral" },
  { prefixo: "/administradora/fatura/devedores", permissao: "relatorios_devedores" },
  { prefixo: "/administradora/auditoria/faturas", permissao: "auditoria_faturas" },
  { prefixo: "/administradora/grupos-beneficiarios", permissao: "grupos_beneficiarios" },
  { prefixo: "/administradora/beneficiarios/titular", permissao: "beneficiarios_titular" },
  { prefixo: "/administradora/beneficiarios/dependentes", permissao: "beneficiarios_dependentes" },
  { prefixo: "/administradora/beneficiarios/contrato", permissao: "beneficiarios_contrato" },
  {
    prefixo: "/administradora/beneficiarios/cancelamento-em-grupo",
    permissao: "beneficiarios_cancelamento_grupo",
  },
  { prefixo: "/administradora/beneficiarios/cancelados", permissao: "beneficiarios_cancelados" },
  {
    prefixo: "/administradora/beneficiarios/importacao-vidas",
    permissao: "beneficiarios_importacao_vidas",
  },
  {
    prefixo: "/administradora/beneficiarios/importacao-matriculas",
    permissao: "beneficiarios_importacao_matriculas",
  },
  {
    prefixo: "/administradora/beneficiarios/comparacao-planilhas",
    permissao: "beneficiarios_comparacao_planilhas",
  },
  { prefixo: "/administradora/beneficiarios", permissao: "beneficiarios_titular" },
  { prefixo: "/administradora/fatura/gerar", permissao: "fatura_gerar" },
  { prefixo: "/administradora/fatura", permissao: "fatura_pesquisar" },
  { prefixo: "/administradora/financeiras", permissao: "financeiras" },
  { prefixo: "/administradora/financeiro/cobrancas", permissao: "financeiro_cobrancas" },
  { prefixo: "/administradora/financeiro/inadimplencia", permissao: "financeiro_inadimplencia" },
  { prefixo: "/administradora/financeiro/pesquisar", permissao: "financeiro_pesquisar" },
  { prefixo: "/administradora/financeiro", permissao: "financeiro_cobrancas" },
  { prefixo: "/administradora/contrato/pesquisar", permissao: "contrato_pesquisar" },
  { prefixo: "/administradora/contrato/novo", permissao: "contrato_novo" },
  { prefixo: "/administradora/contrato", permissao: "contrato_pesquisar" },
  { prefixo: "/administradora/propostas", permissao: "propostas" },
  { prefixo: "/administradora/corretores", permissao: "corretores" },
].sort((a, b) => b.prefixo.length - a.prefixo.length)

const ROTAS_PORTAL_ADMINISTRADORA = new Set([
  "admin",
  "administradora",
  "analista",
  "corretor",
  "gestor",
  "easyben-admin",
])

/** Remove prefixo de tenant do pathname (ex.: /benefit/administradora/x → /administradora/x). */
export function normalizarPathAdministradora(pathname: string): string {
  const path = String(pathname || "").split("?")[0]
  const segmentos = path.split("/").filter(Boolean)
  if (segmentos.length < 2) return path.startsWith("/") ? path : `/${path}`

  const primeiro = segmentos[0].toLowerCase()
  const segundo = segmentos[1].toLowerCase()
  if (!ROTAS_PORTAL_ADMINISTRADORA.has(primeiro) && ROTAS_PORTAL_ADMINISTRADORA.has(segundo)) {
    return `/${segmentos.slice(1).join("/")}`
  }
  return path.startsWith("/") ? path : `/${path}`
}

/** Mantém o prefixo de tenant ao redirecionar (ex.: /benefit + /administradora/x). */
export function aplicarPrefixoTenantNaRota(pathnameAtual: string, rotaPortal: string): string {
  const path = String(pathnameAtual || "").split("?")[0]
  const segmentos = path.split("/").filter(Boolean)
  if (segmentos.length < 2) return rotaPortal

  const primeiro = segmentos[0].toLowerCase()
  const segundo = segmentos[1].toLowerCase()
  if (!ROTAS_PORTAL_ADMINISTRADORA.has(primeiro) && ROTAS_PORTAL_ADMINISTRADORA.has(segundo)) {
    return `/${primeiro}${rotaPortal}`
  }
  return rotaPortal
}

function coletarItensMenuEmOrdem(itens: ItemMenuAdministradora[]): Array<{ id: string; path: string }> {
  const out: Array<{ id: string; path: string }> = []
  for (const item of itens) {
    if (item.children?.length) {
      for (const filho of item.children) {
        if (filho.path) out.push({ id: filho.id, path: filho.path })
      }
    } else if (item.path) {
      out.push({ id: item.id, path: item.path })
    }
  }
  return out
}

/** Primeira rota do menu lateral que o usuário pode acessar (ordem do sidebar). */
export function primeiraRotaDisponivelAdministradora(
  permissoes: string[] | unknown,
  isMaster?: boolean
): string {
  if (isMaster) return "/administradora/dashboard"

  for (const { id, path } of coletarItensMenuEmOrdem(MENU_ADMINISTRADORA)) {
    if (usuarioAdministradoraTemPermissao(permissoes, id, false)) return path
  }

  return "/administradora/dashboard"
}

export function moduloParaRotaAdministradora(pathname: string): string | null {
  const path = normalizarPathAdministradora(pathname)
  for (const { prefixo, permissao } of ROTAS_PERMISSAO) {
    if (path === prefixo || path.startsWith(prefixo + "/")) return permissao
  }
  return null
}

export function contarPermissoesSelecionadas(permissoes: string[]): number {
  return normalizarPermissoesAdministradora(permissoes).length
}
