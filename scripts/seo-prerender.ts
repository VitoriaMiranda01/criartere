/* SEO no build: pré-gera as páginas da loja e o sitemap.

   O site é um app React (o conteúdo aparece via JavaScript). O Google consegue
   executá-lo, mas o WhatsApp, Instagram, Facebook e outros buscadores leem só o
   HTML. Por isso, a cada publicação, este plugin busca os produtos publicados
   (pela mesma vitrine pública que a loja usa) e grava:
     - dist/index.html (catálogo)                  → / (também é a base do app)
     - dist/_paginas/produto/<nome-id>.html        → /produto/<nome-id>
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
    <meta name="robots" content="index, follow, max-image-preview:large" />
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

const conteudoCatalogo = (produtos: ProdutoSeo[]) => `<main class="conteudo-estatico">
<h1>Criartere — Loja virtual</h1>
<p>${esc(DESCRICAO_LOJA)}</p>
<ul>
${produtos.map((p) => `<li><a href="${esc(caminhoProduto(p))}">${esc(p.nome)}</a> — ${formatarPrecoSeo(p.preco)}</li>`).join('\n')}
</ul>
</main>`

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

      fs.writeFileSync(
        path.join(pastaSaida, 'sitemap.xml'),
        sitemap([
          { caminho: '/', prioridade: '1.0', frequencia: 'daily' },
          ...produtos.map((p) => ({
            caminho: caminhoProduto(p),
            prioridade: '0.8',
            frequencia: 'weekly',
            imagem: p.imagemUrl,
            titulo: p.nome,
          })),
        ]),
      )
      console.log(`[SEO] ${produtos.length} páginas de produto pré-geradas e sitemap atualizado.`)
    },
  }
}
