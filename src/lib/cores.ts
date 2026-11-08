/* Ajustes de cor para manter o texto legível (contraste WCAG AA ≥ 4,5:1). */

function luminancia(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6)
  const canais = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => m - n)
  return (y + 0.05) / (x + 0.05)
}

/**
 * Escurece uma cor (mantendo o tom) até ela ter contraste suficiente
 * sobre um fundo claro. Usada no texto dos selos de etapa, cuja cor é
 * escolhida livremente pelo usuário.
 */
export function corLegivel(hex: string, fundo = '#FFFFFF', minimo = 4.5): string {
  if (!/^#[0-9a-f]{6}/i.test(hex)) return hex
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16))
  let cor = hex.slice(0, 7)
  for (let passo = 0; passo < 20 && contraste(cor, fundo) < minimo; passo++) {
    r = Math.round(r * 0.9)
    g = Math.round(g * 0.9)
    b = Math.round(b * 0.9)
    cor = '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
  }
  return cor
}
