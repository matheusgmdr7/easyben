const PREFIX = "vinculos-fichas-geradas"

function chave(administradoraId: string, grupoId: string) {
  return `${PREFIX}:${administradoraId}:${grupoId}`
}

export function listarGeradosVinculosLocal(administradoraId: string, grupoId: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(chave(administradoraId, grupoId))
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.filter((id) => typeof id === "string") : [])
  } catch {
    return new Set()
  }
}

export function marcarGeradosVinculosLocal(
  administradoraId: string,
  grupoId: string,
  ids: string[]
): Set<string> {
  if (typeof window === "undefined") return new Set()
  const atual = listarGeradosVinculosLocal(administradoraId, grupoId)
  for (const id of ids) atual.add(id)
  localStorage.setItem(chave(administradoraId, grupoId), JSON.stringify(Array.from(atual)))
  return atual
}

export function limparGeradosVinculosLocal(administradoraId: string, grupoId: string) {
  if (typeof window === "undefined") return
  localStorage.removeItem(chave(administradoraId, grupoId))
}

const PREFIX_ZIPS = "vinculos-zips"

export type ItemZipVinculo = {
  linha: number | null
  pdf: string
}

export type ZipVinculoRegistrado = {
  nome: string
  tamanho: number
  baixado: boolean
  itens: ItemZipVinculo[]
}

function chaveZips(administradoraId: string) {
  return `${PREFIX_ZIPS}:${administradoraId}`
}

export function listarZipsVinculosLocal(administradoraId: string): ZipVinculoRegistrado[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(chaveZips(administradoraId))
    const arr = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr)) return []
    return arr.flatMap((item) => {
      if (!item || typeof item.nome !== "string") return []
      return [
        {
          nome: item.nome,
          tamanho: Number(item.tamanho) || 0,
          baixado: item.baixado === true,
          itens: Array.isArray(item.itens)
            ? item.itens.flatMap((entrada: { linha?: unknown; pdf?: unknown }) =>
                typeof entrada?.pdf === "string"
                  ? [{ linha: Number(entrada.linha) || null, pdf: entrada.pdf }]
                  : []
              )
            : [],
        },
      ]
    })
  } catch {
    return []
  }
}

export function registrarZipsVinculosLocal(
  administradoraId: string,
  zips: Array<{ nome: string; tamanho?: number; itens?: ItemZipVinculo[] }>
) {
  if (typeof window === "undefined" || zips.length === 0) return
  const atual = listarZipsVinculosLocal(administradoraId)
  const porNome = new Map(atual.map((item) => [item.nome, item]))
  for (const zip of zips) {
    const anterior = porNome.get(zip.nome)
    porNome.set(zip.nome, {
      nome: zip.nome,
      tamanho: zip.tamanho || anterior?.tamanho || 0,
      baixado: anterior?.baixado === true,
      itens: zip.itens?.length ? zip.itens : anterior?.itens || [],
    })
  }
  localStorage.setItem(chaveZips(administradoraId), JSON.stringify(Array.from(porNome.values())))
}

export function marcarZipBaixadoVinculosLocal(administradoraId: string, nome: string, tamanho?: number) {
  if (typeof window === "undefined") return
  const atual = listarZipsVinculosLocal(administradoraId)
  const indice = atual.findIndex((item) => item.nome === nome)
  if (indice >= 0) {
    atual[indice] = {
      ...atual[indice],
      baixado: true,
      tamanho: tamanho || atual[indice].tamanho,
    }
  } else {
    atual.push({ nome, tamanho: tamanho || 0, baixado: true, itens: [] })
  }
  localStorage.setItem(chaveZips(administradoraId), JSON.stringify(atual))
}
