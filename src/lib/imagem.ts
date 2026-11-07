/* Prepara a foto de perfil no próprio aparelho: recorta no centro (quadrado),
   reduz para 256×256 e converte para WebP (ou JPEG). Assim o envio é rápido e leve. */

const TAMANHO = 256
const MAX_ORIGINAL = 15 * 1024 * 1024 // 15 MB

export async function prepararFotoPerfil(arquivo: File): Promise<{ blob: Blob; extensao: string }> {
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
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - lado) / 2
    const sy = (img.naturalHeight - lado) / 2
    const canvas = document.createElement('canvas')
    canvas.width = TAMANHO
    canvas.height = TAMANHO
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, TAMANHO, TAMANHO)

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
