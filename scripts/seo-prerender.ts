/* SEO no build: pré-gera as páginas da loja e o sitemap.

   O site é um app React (o conteúdo aparece via JavaScript). O Google consegue
   executá-lo, mas o WhatsApp, Instagram, Facebook e outros buscadores leem só o
   HTML. Por isso, a cada publicação, este plugin busca os produtos publicados
   (pela mesma vitrine pública que a loja usa) e grava:
     - dist/index.html (catálogo)                  → / (também é a base do app)
     - dist/_paginas/produto/<nome-id>.html        → /produto/<nome-id>
     - dist/_paginas/categoria/<nome>.html         → /categoria/<nome>
     - dist/sitemap.xml                            → todas as páginas públicas
   Cada página é o próprio index.html com título, descrição, prévia (foto do
   produto) e dados estruturados corretos; o app abre normalmente em seguida.
   O .htaccess entrega esses arquivos quando existirem.
   Se o Supabase não responder, o build continua (só sem as páginas extras). */
import fs from 'node:fs'
import path from 'node:path'
import {
  SITE,
  SUFIXO_TITULO,
  IMAGEM_PADRAO,
  DESCRICAO_LOJA,
  ProdutoSeo,
  ContatoSeo,
  caminhoProduto,
  descricaoProduto,
  jsonLdProduto,
  jsonLdCatalogo,
  jsonSeguro,
  formatarPrecoSeo,
  LINHAS_CATALOGO,
  LinhaCatalogo,
  produtoNaLinha,
  mapaDeLinhas,
  MapaLinhas,
  PAGINA_SOBRE,
  caminhoCategoria,
  descricaoCategoria,
  produtoTemCategoria,
  categoriasDoProduto,
  trilhaCategoria,
} from '../src/loja/seo-dados'

const esc = (t: string) =>
  (t || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

interface Pagina {
  titulo: string // título curto (sem o sufixo)
  descricao: string
  caminho: string
  imagem?: string
  tipo: 'website' | 'product'
  /** false: página sem conteúdo útil (ex.: categoria ainda vazia), fora dos buscadores */
  indexar?: boolean
  jsonLd: unknown
  conteudo: string // HTML simples para quem não executa JavaScript
}

function blocoSeo(p: Pagina): string {
  const url = `${SITE}${p.caminho}`
  const img = p.imagem || IMAGEM_PADRAO
  const medidas =
    img === IMAGEM_PADRAO
      ? `\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`
      : ''
  return `<title>${esc(`${p.titulo} | ${SUFIXO_TITULO}`)}</title>
    <meta name="description" content="${esc(p.descricao)}" />
    <meta name="robots" content="${p.indexar === false ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="${p.tipo}" />
    <meta property="og:title" content="${esc(p.titulo)}" />
    <meta property="og:description" content="${esc(p.descricao)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(img)}" />${medidas}
    <meta property="og:image:alt" content="${esc(p.titulo)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(p.titulo)}" />
    <meta name="twitter:description" content="${esc(p.descricao)}" />
    <meta name="twitter:image" content="${esc(img)}" />
    <script type="application/ld+json" id="jsonld-pagina">${jsonSeguro(p.jsonLd)}</script>`
}

function montarHtml(modelo: string, p: Pagina): string {
  const inicio = modelo.indexOf('<!-- seo:inicio')
  const fim = modelo.indexOf('<!-- seo:fim -->')
  if (inicio < 0 || fim < 0) throw new Error('Marcadores de SEO não encontrados no index.html')
  const fimLinha = modelo.indexOf('\n', inicio)
  let html = modelo.slice(0, fimLinha + 1) + '    ' + blocoSeo(p) + '\n    ' + modelo.slice(fim)
  // Conteúdo legível sem JavaScript (o React substitui ao abrir a página)
  html = html.replace('<div id="root"></div>', `<div id="root">${p.conteudo}</div>`)
  return html
}

const conteudoProduto = (p: ProdutoSeo) => `<main class="conteudo-estatico">
<p><a href="/">Criartere — Loja virtual</a>${p.categoria ? ` › ${esc(p.categoria)}` : ''}</p>
<h1>${esc(p.nome)}</h1>
${p.imagemUrl ? `<img src="${esc(p.imagemUrl)}" alt="${esc(p.nome)}" width="480" height="480" style="max-width:100%;height:auto" />` : ''}
${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}
<p>Preço: <strong>${formatarPrecoSeo(p.preco)}</strong> · ${p.disponibilidade === 'pronta_entrega' ? 'Pronta entrega' : 'Sob encomenda'}</p>
</main>`

const conteudoCatalogo = (
  produtos: ProdutoSeo[],
  titulo = 'Criartere — Loja virtual',
  descricao = DESCRICAO_LOJA,
) => `<main class="conteudo-estatico">
<h1>${esc(titulo)}</h1>
<p>${esc(descricao)}</p>
<ul>
${produtos.map((p) => `<li><a href="${esc(caminhoProduto(p))}">${esc(p.nome)}</a> — ${formatarPrecoSeo(p.preco)}</li>`).join('\n')}
</ul>
</main>`

/** Categorias de produto cadastradas no painel e a aba da loja de cada uma. */
async function buscarCategorias(
  url: string,
  chave: string,
): Promise<{ nomes: string[]; linhas?: MapaLinhas }> {
  try {
    const resp = await fetch(`${url}/rest/v1/categorias_produto?select=nome,linha`, {
      headers: { apikey: chave },
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) return { nomes: [] }
    const lista = (await resp.json()) as { nome: string; linha: string | null }[]
    return { nomes: lista.map((c) => c.nome), linhas: mapaDeLinhas(lista) }
  } catch {
    return { nomes: [] }
  }
}

/** Página "Sobre nós" (leitura pública da tabela pagina_sobre). */
async function buscarSobre(url: string, chave: string) {
  const resp = await fetch(
    `${url}/rest/v1/pagina_sobre?id=eq.1&select=titulo,introducao,texto,fotos`,
    { headers: { apikey: chave }, signal: AbortSignal.timeout(15000) },
  )
  if (!resp.ok) throw new Error(`pagina_sobre: HTTP ${resp.status}`)
  const [r] = (await resp.json()) as Record<string, unknown>[]
  if (!r) return null
  const fotos = Array.isArray(r.fotos) ? (r.fotos as { url?: string; legenda?: string }[]) : []
  return {
    titulo: String(r.titulo || PAGINA_SOBRE.titulo),
    introducao: String(r.introducao ?? ''),
    paragrafos: String(r.texto ?? '')
      .split(/\n\s*\n/)
      .map((t) => t.trim())
      .filter(Boolean),
    fotos: fotos
      .filter((f) => f?.url)
      .map((f) => ({ url: String(f.url), legenda: String(f.legenda ?? '') })),
  }
}

async function buscar<T>(url: string, chave: string, nomeFuncao: string): Promise<T> {
  const controle = new AbortController()
  const tempo = setTimeout(() => controle.abort(), 15000)
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/${nomeFuncao}`, {
      method: 'POST',
      headers: { apikey: chave, 'Content-Type': 'application/json' },
      body: '{}',
      signal: controle.signal,
    })
    if (!resp.ok) throw new Error(`${nomeFuncao}: HTTP ${resp.status}`)
    return (await resp.json()) as T
  } finally {
    clearTimeout(tempo)
  }
}

function sitemap(
  entradas: {
    caminho: string
    prioridade: string
    frequencia: string
    imagem?: string
    titulo?: string
  }[],
) {
  const hoje = new Date().toISOString().slice(0, 10)
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entradas
  .map(
    (e) => `  <url>
    <loc>${esc(SITE + e.caminho)}</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>${e.frequencia}</changefreq>
    <priority>${e.prioridade}</priority>${
      e.imagem
        ? `
    <image:image>
      <image:loc>${esc(e.imagem)}</image:loc>${e.titulo ? `\n      <image:title>${esc(e.titulo)}</image:title>` : ''}
    </image:image>`
        : ''
    }
  </url>`,
  )
  .join('\n')}
</urlset>
`
}

export function seoPrerender(opcoes: { supabaseUrl: string; chave: string }) {
  let pastaSaida = 'dist'
  return {
    name: 'criartere-seo-prerender',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string }; root: string }) {
      pastaSaida = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const arquivoIndex = path.join(pastaSaida, 'index.html')
      if (!fs.existsSync(arquivoIndex)) return
      const modelo = fs.readFileSync(arquivoIndex, 'utf8')

      let produtos: ProdutoSeo[] = []
      let contato: ContatoSeo | undefined
      try {
        type Linha = Record<string, unknown>
        const [linhas, contatos] = await Promise.all([
          buscar<Linha[]>(opcoes.supabaseUrl, opcoes.chave, 'vitrine_produtos'),
          buscar<Linha[]>(opcoes.supabaseUrl, opcoes.chave, 'vitrine_contato').catch(() => []),
        ])
        produtos = linhas
          .map((r) => ({
            id: String(r.id),
            nome: String(r.nome ?? ''),
            descricao: String(r.descricao ?? ''),
            preco: Number(r.preco ?? 0),
            categoria: String(r.categoria ?? ''),
            outrasCategorias: Array.isArray(r.outras_categorias)
              ? (r.outras_categorias as unknown[]).map(String)
              : [],
            imagens: (Array.isArray(r.imagens) ? (r.imagens as string[]) : [r.imagem_url as string])
              .filter((u) => u && !String(u).endsWith('/placeholder.svg'))
              .map(String),
            disponibilidade: (r.disponibilidade === 'pronta_entrega'
              ? 'pronta_entrega'
              : 'sob_encomenda') as ProdutoSeo['disponibilidade'],
          }))
          .map((p) => ({ ...p, imagemUrl: p.imagens[0] }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        const c = contatos[0]
        if (c)
          contato = { whatsapp: String(c.whatsapp ?? ''), instagram: String(c.instagram ?? '') }
      } catch (e) {
        console.warn(`[SEO] Produtos não carregados; páginas da loja não pré-geradas. ${String(e)}`)
      }

      const paginasCategoria: string[] = []
      const pastaPaginas = path.join(pastaSaida, '_paginas')
      fs.rmSync(pastaPaginas, { recursive: true, force: true })
      const gravar = (caminho: string, html: string) => {
        const arquivo = path.join(pastaPaginas, `${caminho.replace(/^\//, '')}.html`)
        fs.mkdirSync(path.dirname(arquivo), { recursive: true })
        fs.writeFileSync(arquivo, html)
      }

      if (produtos.length) {
        // A página inicial (/) é o catálogo: o próprio index.html recebe as metatags e a lista de produtos
        fs.writeFileSync(
          arquivoIndex,
          montarHtml(modelo, {
            titulo: 'Loja virtual: impressão 3D, papelaria e personalizados',
            descricao: DESCRICAO_LOJA,
            caminho: '/',
            tipo: 'website',
            jsonLd: jsonLdCatalogo(produtos, contato),
            conteudo: conteudoCatalogo(produtos),
          }),
        )
        // Abas "Catálogo 3D" e "Catálogo Papelaria"
        const cadastro = await buscarCategorias(opcoes.supabaseUrl, opcoes.chave)
        const linhas = cadastro.linhas
        for (const [linha, info] of Object.entries(LINHAS_CATALOGO)) {
          const daLinha = produtos.filter((p) => produtoNaLinha(p, linha as LinhaCatalogo, linhas))
          gravar(
            info.caminho,
            montarHtml(modelo, {
              titulo: info.tituloSeo,
              descricao: info.descricao,
              caminho: info.caminho,
              tipo: 'website',
              jsonLd: jsonLdCatalogo(daLinha, contato, {
                nome: info.titulo,
                caminho: info.caminho,
                descricao: info.descricao,
              }),
              conteudo: conteudoCatalogo(daLinha, info.titulo, info.descricao),
            }),
          )
        }
        // Uma tela para cada categoria (cadastradas no painel e usadas nos produtos)
        const vistas = new Set<string>()
        for (const nome of [...cadastro.nomes, ...produtos.flatMap(categoriasDoProduto)]) {
          const caminho = caminhoCategoria(nome.trim())
          if (!nome.trim() || vistas.has(caminho)) continue
          vistas.add(caminho)
          const daCategoria = produtos.filter((p) => produtoTemCategoria(p, nome))
          const descricao = descricaoCategoria(nome.trim())
          gravar(
            caminho,
            montarHtml(modelo, {
              titulo: nome.trim(),
              descricao,
              caminho,
              imagem: daCategoria[0]?.imagemUrl,
              tipo: 'website',
              indexar: daCategoria.length > 0,
              jsonLd: jsonLdCatalogo(daCategoria, contato, {
                nome: nome.trim(),
                caminho,
                descricao,
                trilha: trilhaCategoria(nome.trim(), linhas?.get(nome.trim().toLowerCase())),
              }),
              conteudo: conteudoCatalogo(daCategoria, nome.trim(), descricao),
            }),
          )
          if (daCategoria.length) paginasCategoria.push(caminho)
        }
        for (const p of produtos) {
          gravar(
            caminhoProduto(p),
            montarHtml(modelo, {
              titulo: p.categoria ? `${p.nome} – ${p.categoria}` : p.nome,
              descricao: descricaoProduto(p),
              caminho: caminhoProduto(p),
              imagem: p.imagemUrl,
              tipo: 'product',
              jsonLd: jsonLdProduto(p),
              conteudo: conteudoProduto(p),
            }),
          )
        }
      }

      // Página "Sobre nós"
      let sobreGerada = false
      try {
        const sobre = await buscarSobre(opcoes.supabaseUrl, opcoes.chave)
        if (sobre) {
          const descricao = sobre.introducao || PAGINA_SOBRE.descricao
          gravar(
            PAGINA_SOBRE.caminho,
            montarHtml(modelo, {
              titulo: sobre.titulo,
              descricao,
              caminho: PAGINA_SOBRE.caminho,
              imagem: sobre.fotos[0]?.url,
              tipo: 'website',
              jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'AboutPage',
                name: sobre.titulo,
                url: `${SITE}${PAGINA_SOBRE.caminho}`,
                description: descricao,
                inLanguage: 'pt-BR',
              },
              conteudo: `<main class="conteudo-estatico">
<h1>${esc(sobre.titulo)}</h1>
${sobre.introducao ? `<p><strong>${esc(sobre.introducao)}</strong></p>` : ''}
${sobre.paragrafos.map((t) => `<p>${esc(t)}</p>`).join('\n')}
${sobre.fotos.map((f) => `<img src="${esc(f.url)}" alt="${esc(f.legenda)}" style="max-width:100%;height:auto" />`).join('\n')}
</main>`,
            }),
          )
          sobreGerada = true
        }
      } catch (e) {
        console.warn(`[SEO] Página "Sobre nós" não pré-gerada. ${String(e)}`)
      }

      fs.writeFileSync(
        path.join(pastaSaida, 'sitemap.xml'),
        sitemap([
          { caminho: '/', prioridade: '1.0', frequencia: 'daily' },
          ...(sobreGerada
            ? [{ caminho: PAGINA_SOBRE.caminho, prioridade: '0.6', frequencia: 'monthly' }]
            : []),
          ...Object.values(LINHAS_CATALOGO).map((l) => ({
            caminho: l.caminho,
            prioridade: '0.9',
            frequencia: 'daily',
          })),
          ...paginasCategoria.map((caminho) => ({
            caminho,
            prioridade: '0.8',
            frequencia: 'daily',
          })),
          ...produtos.map((p) => ({
            caminho: caminhoProduto(p),
            prioridade: '0.8',
            frequencia: 'weekly',
            imagem: p.imagemUrl,
            titulo: p.nome,
          })),
        ]),
      )
      console.log(
        `[SEO] ${produtos.length} páginas de produto e ${paginasCategoria.length} de categoria pré-geradas; sitemap atualizado.`,
      )
    },
  }
}
