import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Search, PackageSearch, RefreshCw, X, ArrowUpDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSeo } from '@/lib/seo'
import {
  DESCRICAO_LOJA,
  jsonLdCatalogo,
  LINHAS_CATALOGO,
  LinhaCatalogo,
  produtoNaLinha,
  produtoTemCategoria,
  categoriasDoProduto,
} from '@/loja/seo-dados'
import { cn } from '@/lib/utils'
import { useLoja } from '@/loja/LojaContext'
import { CardProduto, CarregandoLoja, EstadoVazio } from '@/loja/componentes'
import { CarrosselBanners } from '@/loja/CarrosselBanners'
import { SecoesInicio } from '@/loja/SecoesInicio'

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const OPCOES_ORDEM = [
  { valor: 'nome', rotulo: 'Ordem alfabética' },
  { valor: 'novos', rotulo: 'Novidades' },
  { valor: 'menor', rotulo: 'Menor preço' },
  { valor: 'maior', rotulo: 'Maior preço' },
] as const

/** Sem `linha`: página inicial com os banners e as seções escolhidas no painel
 *  (com ?categoria=..., mostra a lista daquela categoria).
 *  Com `linha`: aba "Catálogo 3D" ou "Catálogo Papelaria", só com as categorias dela. */
export default function Catalogo({ linha }: { linha?: LinhaCatalogo }) {
  const {
    produtos: todosProdutos,
    carregandoProdutos,
    erroProdutos,
    recarregarVitrine,
    contato,
    banners,
    carregandoBanners,
    linhasCategorias,
    categoriasLoja,
    secoesInicio,
  } = useLoja()
  const infoLinha = linha ? LINHAS_CATALOGO[linha] : null
  const produtos = useMemo(
    () =>
      linha
        ? todosProdutos.filter((p) => produtoNaLinha(p, linha, linhasCategorias))
        : todosProdutos,
    [todosProdutos, linha, linhasCategorias],
  )
  useSeo({
    titulo: infoLinha?.tituloSeo ?? 'Loja virtual: impressão 3D, papelaria e personalizados',
    descricao: infoLinha?.descricao ?? DESCRICAO_LOJA,
    caminho: infoLinha?.caminho ?? '/',
    indexar: true,
    jsonLd: produtos.length
      ? jsonLdCatalogo(
          produtos,
          contato ?? undefined,
          infoLinha
            ? { nome: infoLinha.titulo, caminho: infoLinha.caminho, descricao: infoLinha.descricao }
            : undefined,
        )
      : undefined,
    ativo: !carregandoProdutos && !erroProdutos,
  })
  const [busca, setBusca] = useState('')
  // Categoria fica no endereço (?categoria=...) para os banners poderem abrir uma categoria
  const [parametros, setParametros] = useSearchParams()
  const categoria = parametros.get('categoria') ?? ''
  const setCategoria = (c: string) =>
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        if (c) novos.set('categoria', c)
        else novos.delete('categoria')
        return novos
      },
      { replace: true, preventScrollReset: true },
    )
  // Ao vir de um banner de categoria, desce até os produtos
  const location = useLocation()
  const filtrosRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if ((location.state as { rolarParaProdutos?: boolean } | null)?.rolarParaProdutos)
      filtrosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.key, location.state])
  const [ordem, setOrdem] = useState<'nome' | 'menor' | 'maior' | 'novos'>('nome')
  // Página inicial sem categoria escolhida: vitrine com as seções do painel
  const vitrineInicio = !linha && !categoria

  // Categorias cadastradas no painel (na ordem do cadastro; numa aba, só as dela),
  // mais qualquer categoria usada em produtos que não esteja no cadastro
  const categorias = useMemo(() => {
    const cadastradas = categoriasLoja
      .filter((c) => !linha || c.linha === linha)
      .map((c) => c.nome.trim())
      .filter(Boolean)
    const conhecidas = new Set(cadastradas.map((c) => c.toLowerCase()))
    const extras = [...new Set(produtos.flatMap(categoriasDoProduto))]
      .filter((c) => !conhecidas.has(c.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return [...cadastradas, ...extras]
  }, [categoriasLoja, linha, produtos])

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    const filtrados = produtos.filter((p) => {
      if (categoria && !produtoTemCategoria(p, categoria)) return false
      if (!termo) return true
      return normalizar(`${p.nome} ${p.descricao} ${categoriasDoProduto(p).join(' ')}`).includes(
        termo,
      )
    })
    return [...filtrados].sort((a, b) => {
      if (ordem === 'menor') return a.preco - b.preco
      if (ordem === 'maior') return b.preco - a.preco
      if (ordem === 'novos') return b.criadoEm.localeCompare(a.criadoEm)
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [produtos, busca, categoria, ordem])

  return (
    <div className="space-y-8">
      {/* Aba de uma linha: título simples. Início: banners ou apresentação padrão */}
      {infoLinha ? (
        <section className="relative overflow-hidden rounded-3xl bg-white border border-[#DFC3AE]/60 px-6 py-8 sm:px-10 sm:py-10">
          <div
            className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#DFC3AE] opacity-40 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#A5683F] font-bold mb-2">
              Criartere
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-[#0C1014]">
              {infoLinha.titulo}
            </h1>
            <p className="text-sm sm:text-base text-[#6B4B36] mt-3 leading-relaxed">
              {infoLinha.descricao}
            </p>
          </div>
        </section>
      ) : carregandoBanners ? (
        <div
          className="rounded-3xl bg-white border border-[#DFC3AE]/60 aspect-square sm:aspect-[16/5] animate-pulse"
          aria-hidden="true"
        />
      ) : banners.length > 0 ? (
        <>
          <h1 className="sr-only">Criartere: criações feitas com carinho, camada por camada</h1>
          <CarrosselBanners banners={banners} produtos={produtos} />
        </>
      ) : (
        <section className="relative overflow-hidden rounded-3xl bg-white border border-[#DFC3AE]/60 px-6 py-10 sm:px-12 sm:py-14">
          <div
            className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#DFC3AE] opacity-40 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-28 left-1/3 w-72 h-72 rounded-full bg-[#C48864] opacity-15 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#A5683F] font-bold mb-3">
              Catálogo Criartere
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl font-semibold leading-[1.1] text-[#0C1014]">
              Criações feitas com <em className="text-[#A5683F] not-italic sm:italic">carinho</em>,
              camada por camada.
            </h1>
            <p className="text-sm sm:text-base text-[#6B4B36] mt-4 leading-relaxed">
              Impressão 3D, papelaria e personalizados. Salve seus favoritos, monte seu carrinho e
              fale com a gente pelo WhatsApp para encomendar.
            </p>
          </div>
        </section>
      )}

      {vitrineInicio ? (
        carregandoProdutos ? (
          <CarregandoLoja />
        ) : erroProdutos ? (
          <EstadoVazio
            icone={RefreshCw}
            titulo="Não foi possível carregar a loja"
            texto="Verifique sua conexão com a internet e tente de novo."
            acao={
              <button
                type="button"
                onClick={() => recarregarVitrine()}
                className="h-10 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
              >
                Tentar de novo
              </button>
            }
          />
        ) : (
          <SecoesInicio secoes={secoesInicio} produtos={todosProdutos} mapa={linhasCategorias} />
        )
      ) : (
        <>
          {/* Busca e filtros */}
          <section ref={filtrosRef} aria-label="Filtros" className="space-y-4 scroll-mt-24">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B4B36]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produtos..."
                  aria-label="Buscar produtos"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#DFC3AE] bg-white text-sm outline-none placeholder:text-[#6B4B36]/60 focus:ring-2 focus:ring-[#C48864]/50 focus:border-[#C48864]"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#6B4B36] hover:bg-[#F7F3EA]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
                <SelectTrigger
                  aria-label="Ordenar produtos"
                  className="h-11 w-full sm:w-56 rounded-xl border-[#DFC3AE] bg-white justify-start gap-2 pl-4 pr-3 text-sm font-semibold text-[#0C1014] [&>svg:last-child]:ml-auto focus:ring-2 focus:ring-[#C48864]/50 focus:ring-offset-0 focus:border-[#C48864] [&>svg]:text-[#A5683F] [&>svg]:opacity-100 [&>svg]:shrink-0"
                >
                  <ArrowUpDown className="w-4 h-4 text-[#A5683F]" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#DFC3AE] bg-white shadow-[0_10px_30px_rgba(12,16,20,0.10)]">
                  {OPCOES_ORDEM.map((o) => (
                    <SelectItem
                      key={o.valor}
                      value={o.valor}
                      className="rounded-lg outline-none focus-visible:outline-none py-2.5 pl-8 pr-3 text-sm text-[#6B4B36] cursor-pointer focus:bg-[#F6EDE7] focus:text-[#0C1014] data-[state=checked]:font-semibold data-[state=checked]:text-[#A5683F] [&_svg]:text-[#A5683F]"
                    >
                      {o.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(categorias.length > 1 || (linha && categorias.length > 0)) && (
              <div className="flex gap-2 overflow-x-auto sem-barra pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                {['', ...categorias].map((c) => (
                  <button
                    key={c || 'todas'}
                    type="button"
                    onClick={() => setCategoria(c)}
                    aria-pressed={categoria === c}
                    className={cn(
                      'shrink-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors',
                      categoria === c
                        ? 'bg-[#0C1014] text-white border-[#0C1014]'
                        : 'bg-white text-[#6B4B36] border-[#DFC3AE] hover:border-[#C48864] hover:text-[#0C1014]',
                    )}
                  >
                    {c || 'Todos'}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Produtos */}
          {carregandoProdutos ? (
            <CarregandoLoja />
          ) : erroProdutos ? (
            <EstadoVazio
              icone={RefreshCw}
              titulo="Não foi possível carregar o catálogo"
              texto="Verifique sua conexão com a internet e tente de novo."
              acao={
                <button
                  type="button"
                  onClick={() => recarregarVitrine()}
                  className="h-10 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
                >
                  Tentar de novo
                </button>
              }
            />
          ) : lista.length === 0 ? (
            <EstadoVazio
              icone={PackageSearch}
              titulo={
                produtos.length === 0
                  ? 'Novidades em breve'
                  : categoria && !busca.trim()
                    ? `Ainda não há produtos em ${categoria}`
                    : 'Nenhum produto encontrado'
              }
              texto={
                produtos.length === 0
                  ? 'Nosso catálogo está sendo preparado com carinho. Volte em breve!'
                  : categoria && !busca.trim()
                    ? 'Estamos preparando novidades para esta categoria. Veja as outras enquanto isso!'
                    : 'Tente buscar por outro nome ou escolha outra categoria.'
              }
              acao={
                produtos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBusca('')
                      setCategoria('')
                    }}
                    className="h-10 px-5 rounded-lg border border-[#DFC3AE] bg-white text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
                  >
                    {categoria && !busca.trim() ? 'Ver todos os produtos' : 'Limpar filtros'}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <section aria-labelledby="titulo-produtos">
              <h2 id="titulo-produtos" className="sr-only">
                Produtos
              </h2>
              <p className="text-xs text-[#6B4B36] mb-3">
                {lista.length} {lista.length === 1 ? 'produto' : 'produtos'}
              </p>
              <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-4 sm:gap-5">
                {lista.map((p) => (
                  <CardProduto key={p.id} produto={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
