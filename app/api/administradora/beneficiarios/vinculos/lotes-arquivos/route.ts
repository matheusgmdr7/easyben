import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
export const maxDuration = 300

const BUCKET = "arquivos"

function idValido(valor: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(valor)
}

function nomeZipValido(valor: string): boolean {
  return /^fichas-(admissao-lote|linhas)-[\w.-]+\.zip$/i.test(valor) && !valor.includes("..")
}

function pasta(administradoraId: string): string {
  return `vinculos-lote/${administradoraId}`
}

function tamanhoDe(item: { metadata?: Record<string, unknown> | null }): number {
  const meta = item.metadata || {}
  const bruto = meta.size ?? meta.contentLength ?? meta.content_length
  const numero = Number(bruto)
  return Number.isFinite(numero) ? numero : 0
}

/**
 * GET sem `arquivo`: lista os ZIPs já gravados no Storage.
 * GET com `arquivo`: devolve esse ZIP pelo próprio servidor, um por vez.
 */
export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")?.trim() || ""
    const arquivo = request.nextUrl.searchParams.get("arquivo")?.trim() || ""
    if (!idValido(administradoraId)) {
      return NextResponse.json({ error: "administradora_id inválido" }, { status: 400 })
    }

    if (arquivo) {
      if (!nomeZipValido(arquivo)) {
        return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 })
      }
      const caminho = `${pasta(administradoraId)}/${arquivo}`
      if (request.nextUrl.searchParams.get("link") === "1") {
        const assinada = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(caminho, 60 * 30, { download: arquivo })
        if (assinada.error || !assinada.data?.signedUrl) {
          return NextResponse.json({ error: "ZIP não encontrado no armazenamento" }, { status: 404 })
        }
        return NextResponse.json({ url: assinada.data.signedUrl })
      }
      const inicio = Math.max(0, Number(request.nextUrl.searchParams.get("inicio") || 0) || 0)
      const bloco = 4 * 1024 * 1024
      const assinada = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(caminho, 120)
      if (assinada.error || !assinada.data?.signedUrl) {
        return NextResponse.json({ error: "ZIP não encontrado no armazenamento" }, { status: 404 })
      }
      const remoto = await fetch(assinada.data.signedUrl, {
        headers: { Range: `bytes=${inicio}-${inicio + bloco - 1}` },
      })
      if (remoto.status === 416) {
        return new NextResponse(new Uint8Array(), {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Total-Bytes": "0",
            "Cache-Control": "no-store",
          },
        })
      }
      if (!remoto.ok && remoto.status !== 206) {
        return NextResponse.json({ error: "Falha ao ler o ZIP no armazenamento" }, { status: 502 })
      }
      const faixa = remoto.headers.get("content-range") || ""
      const total = Number(faixa.match(/\/(\d+)\s*$/)?.[1] || 0)
      const pedaco = new Uint8Array(await remoto.arrayBuffer())
      return new NextResponse(pedaco, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Total-Bytes": String(total),
          "Cache-Control": "no-store",
        },
      })
    }

    const lista: Array<{ nome: string; tamanho: number; atualizado_em: string | null }> = []
    let offset = 0
    while (lista.length < 500) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(pasta(administradoraId), {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      })
      if (error) {
        return NextResponse.json({ error: "Não foi possível listar os ZIPs" }, { status: 500 })
      }
      const pagina = data || []
      for (const item of pagina) {
        if (!item.name || !nomeZipValido(item.name)) continue
        lista.push({
          nome: item.name,
          tamanho: tamanhoDe(item),
          atualizado_em: item.updated_at || item.created_at || null,
        })
      }
      if (pagina.length < 100) break
      offset += pagina.length
    }

    return NextResponse.json({ arquivos: lista })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao consultar os ZIPs"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
