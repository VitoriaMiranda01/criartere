/* Página "Sobre nós": leitura pública (loja) e edição pelo painel (só administradores). */
import { supabase } from '@/lib/supabase'

export interface FotoSobre {
  url: string
  legenda: string
}

export interface PaginaSobre {
  titulo: string
  introducao: string
  texto: string // parágrafos separados por linha em branco
  fotos: FotoSobre[]
}

export const MAX_FOTOS_SOBRE = 12

const paraPagina = (r: Record<string, unknown> | null): PaginaSobre => ({
  titulo: String(r?.titulo ?? 'Sobre nós') || 'Sobre nós',
  introducao: String(r?.introducao ?? ''),
  texto: String(r?.texto ?? ''),
  fotos: (Array.isArray(r?.fotos) ? (r.fotos as Record<string, unknown>[]) : [])
    .filter((f) => typeof f?.url === 'string' && f.url)
    .map((f) => ({ url: String(f.url), legenda: String(f.legenda ?? '') })),
})

/** Texto dividido em parágrafos (linha em branco separa). */
export const paragrafos = (texto: string) =>
  texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

export async function buscarPaginaSobre(): Promise<PaginaSobre> {
  const { data, error } = await supabase
    .from('pagina_sobre')
    .select('titulo, introducao, texto, fotos')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return paraPagina(data)
}

export async function salvarPaginaSobre(p: PaginaSobre): Promise<void> {
  const { error } = await supabase
    .from('pagina_sobre')
    .update({
      titulo: p.titulo.trim() || 'Sobre nós',
      introducao: p.introducao.trim(),
      texto: p.texto.trim(),
      fotos: p.fotos.map((f) => ({ url: f.url, legenda: f.legenda.trim() })),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  // Fotos removidas da página são apagadas do armazenamento
  await limparFotosSobre(p.fotos.map((f) => f.url)).catch(() => undefined)
}

export async function enviarFotoSobre(imagem: { blob: Blob; extensao: string }): Promise<string> {
  const caminho = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imagem.extensao}`
  const { error } = await supabase.storage.from('sobre').upload(caminho, imagem.blob, {
    contentType: imagem.blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('sobre').getPublicUrl(caminho).data.publicUrl
}

async function limparFotosSobre(urlsEmUso: string[]) {
  const { data } = await supabase.storage.from('sobre').list('fotos', { limit: 200 })
  const apagar = (data ?? [])
    .map((f) => `fotos/${f.name}`)
    .filter((caminho) => !urlsEmUso.some((url) => url.endsWith(caminho)))
  if (apagar.length) await supabase.storage.from('sobre').remove(apagar)
}
