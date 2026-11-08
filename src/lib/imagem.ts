/* Prepara imagens no próprio aparelho antes do envio: recorta/reduz e converte para
   WebP (ou JPEG). Assim o envio é rápido e leve, mesmo com fotos grandes do celular. */

const TAMANHO = 256
const MAX_ORIGINAL = 15 * 1024 * 1024 // 15 MB

export interface ImagemPreparada {
  blob: Blob
  extensao: string
}

/** Foto de perfil: quadrada, 256×256. */
export function prepararFotoPerfil(arquivo: File): Promise<ImagemPreparada> {
  return prepararImagem(arquivo, { lado: TAMANHO, quadrada: true })
}

/** Imagem de produto: mantém a proporção, lado maior com até 1000 px. */
export function prepararImagemProduto(arquivo: File): Promise<ImagemPreparada> {
  return prepararImagem(arquivo, { lado: 1000, quadrada: false })
}

async function prepararImagem(
  arquivo: File,
  opcoes: { lado: number; quadrada: boolean },
): Promise<ImagemPreparada> {
  if (!arquivo.type.startsWith('image/'))
    throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).')
  if (arquivo.size > MAX_ORIGINAL) throw new Error('A imagem é muito grande (máximo 15 MB).')

  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Não foi possível ler esta imagem.'))
      i.src = url
    })
    const w = img.naturalWidth
    const h = img.naturalHeight
    // Área de origem: recorte central quadrado ou a imagem inteira
    const recorte = opcoes.quadrada ? Math.min(w, h) : 0
    const sx = opcoes.quadrada ? (w - recorte) / 2 : 0
    const sy = opcoes.quadrada ? (h - recorte) / 2 : 0
    const sw = opcoes.quadrada ? recorte : w
    const sh = opcoes.quadrada ? recorte : h
    // Tamanho final: nunca aumenta a imagem, só reduz
    const escala = Math.min(1, opcoes.lado / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * escala)
    canvas.height = Math.round(sh * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

    const gerar = (tipo: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, 0.85))
    const webp = await gerar('image/webp')
    if (webp && webp.type === 'image/webp') return { blob: webp, extensao: 'webp' }
    const jpeg = await gerar('image/jpeg')
    if (!jpeg) throw new Error('Não foi possível converter a imagem.')
    return { blob: jpeg, extensao: 'jpg' }
  } finally {
    URL.revokeObjectURL(url)
  }
}
