import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Search, PackageSearch, RefreshCw, X, ArrowUpDown, ChevronRight } from 'lucide-react'
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
  caminhoCategoria,
  descricaoCategoria,
  trilhaCategoria,
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
import { produtoCombina } from '@/loja/BuscaLoja'
import { Depoimentos } from '@/loja/Depoimentos'
import { CarrosselCategorias } from '@/loja/CarrosselCategorias'

const OPCOES_ORDEM = [
  { valor: 'nome', rotulo: 'Ordem alfabética' },
  { valor: 'novos', rotulo: 'Novidades' },
  { valor: 'menor', rotulo: 'Menor preço' },
  { valor: 'maior', rotulo: 'Maior preço' },
] as const

/** Sem `linha`: página inicial com os banners e as seções escolhidas no painel.
 *  Com `linha`: aba "Catálogo 3D" ou "Catálogo Papelaria", só com as categorias dela.
 *  Com `categoriaFixa`: tela própria de uma categoria (/categoria/<nome>).
 *  Com `modoBusca`: resultados da busca do cabeçalho (/busca?q=...). */
export default function Catalogo({
  linha,
  categoriaFixa,
  modoBusca = false,
}: {
  linha?: LinhaCatalogo
  categoriaFixa?: string
  modoBusca?: boolean
}) {
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
  // Aba à qual a categoria da tela pertence (para o caminho "Início › Catálogo 3D › ...")
  const linhaDaCategoria = categoriaFixa
    ? (linhasCategorias?.get(categoriaFixa.toLowerCase()) ?? null)
    : null
  const produtos = useMemo(
    () =>
      categoriaFixa
        ? todosProdutos.filter((p) => produtoTemCategoria(p, categoriaFixa))
        : linha
          ? todosProdutos.filter((p) => produtoNaLinha(p, linha, linhasCategorias))
          : todosProdutos,
    [todosProdutos, linha, linhasCategorias, categoriaFixa],
  )
  const paginaCategoria = categoriaFixa
    ? {
        nome: categoriaFixa,
        caminho: caminhoCategoria(categoriaFixa),
        descricao: descricaoCategoria(categoriaFixa),
        trilha: trilhaCategoria(categoriaFixa, linhaDaCategoria),
      }
    : null
  const paginaSeo =
    paginaCategoria ??
    (infoLinha
      ? {
          nome: infoLinha.titulo,
          caminho: infoLinha.caminho,
          descricao: infoLinha.descricao,
        }
      : undefined)
  const [parametros, setParametros] = useSearchParams()
  const termoNoEndereco = parametros.get('q') ?? ''
  useSeo({
    titulo: modoBusca
      ? termoNoEndereco.trim()
        ? `Busca: ${termoNoEndereco.trim()}`
        : 'Buscar produtos'
      : (paginaCategoria?.nome ??
        infoLinha?.tituloSeo ??
        'Loja virtual: impressão 3D, papelaria e personalizados'),
    descricao: paginaSeo?.descricao ?? DESCRICAO_LOJA,
    caminho: modoBusca ? '/busca' : (paginaSeo?.caminho ?? '/'),
    // Resultados de busca e categoria ainda sem produtos não vão para os buscadores
    indexar: !modoBusca && (!categoriaFixa || carregandoProdutos || produtos.length > 0),
    jsonLd:
      produtos.length && !modoBusca
        ? jsonLdCatalogo(produtos, contato ?? undefined, paginaSeo)
        : undefined,
    ativo: !carregandoProdutos && !erroProdutos,
  })
  // Na página de busca o termo fica no endereço (?q=...); nas outras, só na tela
  const [buscaLocal, setBuscaLocal] = useState('')
  const busca = modoBusca ? termoNoEndereco : buscaLocal
  const setBusca = (v: string) =>
    modoBusca
      ? setParametros(
          (atuais) => {
            const novos = new URLSearchParams(atuais)
            if (v) novos.set('q', v)
            else novos.delete('q')
            return novos
          },
          { replace: true, preventScrollReset: true },
        )
      : setBuscaLocal(v)
  // Nas abas, o filtro de categoria fica no endereço (?categoria=...)
  const categoriaNoEndereco = parametros.get('categoria') ?? ''
  const categoria = categoriaFixa ?? categoriaNoEndereco
  // No início e na tela de uma categoria, os botões de categoria são links para as telas delas
  const chipsSaoLinks = !linha
  const setCategoria = (c: string) =>
    linha &&
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        if (c) novos.set('categoria', c)
        else novos.delete('categoria')
        return novos
      },
      { replace: true, preventScrollReset: true },
    )
  // Ao vir do link "Ver todo o Catálogo ...", desce até os produtos
  const location = useLocation()
  const filtrosRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if ((location.state as { rolarParaProdutos?: boolean } | null)?.rolarParaProdutos)
      filtrosRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }, [location.key, location.state])
  // Fila de categorias (rola sozinha até a categoria aberta, no celular)
  const chipsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const fila = chipsRef.current
    const ativa = fila?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]')
    if (!fila || !ativa || fila.scrollWidth <= fila.clientWidth) return
    const desvio = ativa.getBoundingClientRect().left - fila.getBoundingClientRect().left
    fila.scrollLeft += desvio - (fila.clientWidth - ativa.offsetWidth) / 2
  }, [categoria, categoriasLoja])
  const [ordem, setOrdem] = useState<'nome' | 'menor' | 'maior' | 'novos'>('nome')
  // Página inicial: banners, cards de categoria e as seções do painel (sem busca nem filtros;
  // a busca fica na lupa do cabeçalho)
  const vitrineInicio = !linha && !categoria && !modoBusca
  const ehInicio = vitrineInicio

  // Categorias cadastradas no painel (na ordem do cadastro; numa aba, só as dela),
  // mais qualquer categoria usada em produtos que não esteja no cadastro
  const categorias = useMemo(() => {
    // Na tela de uma categoria: as categorias da mesma aba
    const daAba = categoriaFixa ? linhaDaCategoria : linha
    if (categoriaFixa && !daAba) return []
    const cadastradas = categoriasLoja
      .filter((c) => !daAba || c.linha === daAba)
      .map((c) => c.nome.trim())
      .filter(Boolean)
    const conhecidas = new Set(cadastradas.map((c) => c.toLowerCase()))
    const extras = [...new Set(produtos.flatMap(categoriasDoProduto))]
      .filter((c) => !conhecidas.has(c.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return [...cadastradas, ...extras]
  }, [categoriasLoja, linha, produtos, categoriaFixa, linhaDaCategoria])

  const lista = useMemo(() => {
    const filtrados = produtos.filter(
      (p) => (!categoria || produtoTemCategoria(p, categoria)) && produtoCombina(p, busca),
    )
    return [...filtrados].sort((a, b) => {
      if (ordem === 'menor') return a.preco - b.preco
      if (ordem === 'maior') return b.preco - a.preco
      if (ordem === 'novos') return b.criadoEm.localeCompare(a.criadoEm)
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [produtos, busca, categoria, ordem])

  // Endereços antigos (/?categoria=...) → tela própria da categoria
  if (!linha && !categoriaFixa && categoriaNoEndereco)
    return <Navigate to={caminhoCategoria(categoriaNoEndereco)} replace />

  return (
    <div className="space-y-8">
      {/* Aba ou categoria: só o título. Início: banners ou apresentação padrão */}
      {modoBusca ? (
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-[#0C1014]">
          {busca.trim() ? (
            <>
              Resultados para <span className="text-[#A5683F]">“{busca.trim()}”</span>
            </>
          ) : (
            'Buscar produtos'
          )}
        </h1>
      ) : infoLinha ? (
        // Aba da loja: só o título no topo
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-[#0C1014]">
          {infoLinha.titulo}
        </h1>
      ) : categoriaFixa ? (
        // Tela própria da categoria: caminho e título no topo
        <div>
          <nav aria-label="Você está em" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#A5683F]">
              <li>
                <Link to="/" className="hover:underline underline-offset-4">
                  Início
                </Link>
              </li>
              {linhaDaCategoria && (
                <li className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-[#C48864]" aria-hidden="true" />
                  <Link
                    to={LINHAS_CATALOGO[linhaDaCategoria].caminho}
                    className="hover:underline underline-offset-4"
                  >
                    {LINHAS_CATALOGO[linhaDaCategoria].menu}
                  </Link>
                </li>
              )}
              <li className="flex items-center gap-1 text-[#6B4B36]" aria-current="page">
                <ChevronRight className="w-3.5 h-3.5 text-[#C48864]" aria-hidden="true" />
                {categoriaFixa}
              </li>
            </ol>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-[#0C1014]">
            {categoriaFixa}
          </h1>
        </div>
      ) : carregandoBanners ? (
        <div
          className="rounded-3xl bg-white border border-[#DFC3AE]/60 aspect-square sm:aspect-[16/5] animate-pulse"
          aria-hidden="true"
        />
      ) : banners.length > 0 ? (
        <div>
          {/* Num só bloco: o título escondido não empurra o banner para baixo */}
          <h1 className="sr-only">Criartere: criações feitas com carinho, camada por camada</h1>
          <CarrosselBanners banners={banners} produtos={produtos} />
        </div>
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

      {/* Página inicial: categorias em cards com foto (logo abaixo dos banners) */}
      {ehInicio && !carregandoProdutos && !erroProdutos && (
        <CarrosselCategorias categoriasLoja={categoriasLoja} produtos={todosProdutos} />
      )}

      <>
        {/* Busca e filtros */}
        <section
          ref={filtrosRef}
          aria-label="Filtros"
          // Categoria ainda vazia: sem busca nem ordem (não há o que filtrar)
          hidden={
            vitrineInicio ||
            (Boolean(categoriaFixa) && !carregandoProdutos && produtos.length === 0)
          }
          className="space-y-4 scroll-mt-24"
        >
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
            {!vitrineInicio && (
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
            )}
          </div>

          {!ehInicio &&
            !modoBusca &&
            (categorias.length > 1 || (linha && categorias.length > 0)) && (
              <nav
                ref={chipsRef}
                aria-label="Categorias"
                className="flex gap-2 overflow-x-auto sem-barra pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap"
              >
                {(categoriaFixa ? categorias : ['', ...categorias]).map((c) => {
                  const ativa = categoria.toLowerCase() === c.toLowerCase()
                  const estilo = cn(
                    'shrink-0 inline-flex items-center h-9 px-4 rounded-full text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EA]',
                    ativa
                      ? 'bg-[#0C1014] text-white border-[#0C1014]'
                      : 'bg-white text-[#6B4B36] border-[#DFC3AE] hover:border-[#C48864] hover:text-[#0C1014]',
                  )
                  return chipsSaoLinks ? (
                    <Link
                      key={c || 'todas'}
                      to={c ? caminhoCategoria(c) : '/'}
                      aria-current={ativa ? 'page' : undefined}
                      className={estilo}
                    >
                      {c || 'Todos'}
                    </Link>
                  ) : (
                    <button
                      key={c || 'todas'}
                      type="button"
                      onClick={() => setCategoria(c)}
                      aria-pressed={ativa}
                      className={estilo}
                    >
                      {c || 'Todos'}
                    </button>
                  )
                })}
              </nav>
            )}
        </section>

        {/* Início: seções escolhidas no painel. Nas outras páginas: a lista de produtos */}
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
            <>
              <SecoesInicio secoes={secoesInicio} produtos={todosProdutos} />
              {/* Depoimentos reais (avaliações publicadas); sem nenhuma, não aparece */}
              <Depoimentos produtos={todosProdutos} />
            </>
          )
        ) : (
          <>
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
                  produtos.length === 0 && categoriaFixa
                    ? `Ainda não há produtos em ${categoriaFixa}`
                    : produtos.length === 0
                      ? 'Novidades em breve'
                      : categoria && !busca.trim()
                        ? `Ainda não há produtos em ${categoria}`
                        : 'Nenhum produto encontrado'
                }
                texto={
                  produtos.length === 0 && categoriaFixa
                    ? 'Estamos preparando novidades para esta categoria. Veja as outras enquanto isso!'
                    : produtos.length === 0
                      ? 'Nosso catálogo está sendo preparado com carinho. Volte em breve!'
                      : categoria && !busca.trim()
                        ? 'Estamos preparando novidades para esta categoria. Veja as outras enquanto isso!'
                        : 'Tente buscar por outro nome ou escolha outra categoria.'
                }
                acao={
                  categoriaFixa && produtos.length === 0 ? (
                    <Link
                      to="/"
                      className="inline-flex items-center h-10 px-5 rounded-lg border border-[#DFC3AE] bg-white text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
                    >
                      Ver a loja
                    </Link>
                  ) : produtos.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBusca('')
                        if (!categoriaFixa) setCategoria('')
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
                <p className="text-xs text-[#6B4B36] mb-3" aria-live="polite">
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
      </>
    </div>
  )
}
