import { useEffect } from 'react'
import { SITE, SUFIXO_TITULO, IMAGEM_PADRAO, jsonSeguro } from '@/loja/seo-dados'

export interface OpcoesSeo {
  titulo?: string
  descricao?: string
  caminho?: string // ex.: /produto/vaso-...; vira o endereço canônico
  imagem?: string
  tipo?: 'website' | 'product'
  indexar?: boolean
  jsonLd?: unknown // dados estruturados desta página (schema.org)
  /** false enquanto os dados carregam: mantém o que já está na página (ex.: o HTML pré-gerado) */
  ativo?: boolean
}

function meta(atributo: 'name' | 'property', chave: string, valor: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(atributo, chave)
    document.head.appendChild(el)
  }
  el.content = valor
}

function link(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Título, descrição, endereço canônico, prévias de compartilhamento
 * (WhatsApp, Facebook, Instagram) e dados estruturados da página atual.
 */
export function useSeo(o: OpcoesSeo) {
  const jsonTexto = o.jsonLd ? jsonSeguro(o.jsonLd) : ''
  const ativo = o.ativo ?? true
  useEffect(() => {
    if (!ativo) return
    const titulo = o.titulo ? `${o.titulo} | ${SUFIXO_TITULO}` : SUFIXO_TITULO
    const url = `${SITE}${o.caminho ?? window.location.pathname}`
    const imagem = o.imagem || IMAGEM_PADRAO
    const indexar = o.indexar ?? false

    document.title = titulo
    meta('name', 'robots', indexar ? 'index, follow, max-image-preview:large' : 'noindex, follow')
    if (o.descricao) {
      meta('name', 'description', o.descricao)
      meta('property', 'og:description', o.descricao)
      meta('name', 'twitter:description', o.descricao)
    }
    link('canonical', url)
    meta('property', 'og:title', o.titulo ?? SUFIXO_TITULO)
    meta('name', 'twitter:title', o.titulo ?? SUFIXO_TITULO)
    meta('property', 'og:url', url)
    meta('property', 'og:type', o.tipo ?? 'website')
    meta('property', 'og:image', imagem)
    // As medidas fixas valem só para a imagem padrão (1200×630)
    document.head
      .querySelectorAll('meta[property="og:image:width"], meta[property="og:image:height"]')
      .forEach((el) => {
        if (o.imagem) el.remove()
      })
    meta('name', 'twitter:image', imagem)
    meta('property', 'og:image:alt', o.titulo ?? 'Criartere')

    let script = document.getElementById('jsonld-pagina') as HTMLScriptElement | null
    if (jsonTexto) {
      if (!script) {
        script = document.createElement('script')
        script.type = 'application/ld+json'
        script.id = 'jsonld-pagina'
        document.head.appendChild(script)
      }
      script.textContent = jsonTexto
    } else if (script) {
      script.remove()
    }
  }, [ativo, o.titulo, o.descricao, o.caminho, o.imagem, o.tipo, o.indexar, jsonTexto])
}
