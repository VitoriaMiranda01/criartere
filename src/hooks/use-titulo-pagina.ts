import { useEffect } from 'react'

const SUFIXO = 'Criartere — Impressão 3D e Gráfica'

/**
 * Define o título da aba (e a meta tag robots) da página atual.
 * As telas internas do sistema ficam fora do Google (noindex); só o login é indexado.
 */
export function useTituloPagina(titulo?: string, opcoes: { indexar?: boolean } = {}) {
  const indexar = opcoes.indexar ?? false
  useEffect(() => {
    document.title = titulo ? `${titulo} | ${SUFIXO}` : SUFIXO
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = indexar ? 'index, follow' : 'noindex, nofollow'
  }, [titulo, indexar])
}
