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
