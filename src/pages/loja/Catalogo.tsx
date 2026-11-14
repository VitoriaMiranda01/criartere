import { useMemo, useState } from 'react'
import { Search, PackageSearch, RefreshCw, X, ArrowUpDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSeo } from '@/lib/seo'
import { DESCRICAO_LOJA, jsonLdCatalogo } from '@/loja/seo-dados'
import { cn } from '@/lib/utils'
import { useLoja } from '@/loja/LojaContext'
import { CardProduto, CarregandoLoja, EstadoVazio } from '@/loja/componentes'

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

export default function Catalogo() {
  const { produtos, carregandoProdutos, erroProdutos, recarregarVitrine, contato } = useLoja()
  useSeo({
    titulo: 'Loja virtual: impressão 3D, papelaria e personalizados',
    descricao: DESCRICAO_LOJA,
    caminho: '/loja',
    indexar: true,
    jsonLd: produtos.length ? jsonLdCatalogo(produtos, contato ?? undefined) : undefined,
    ativo: !carregandoProdutos && !erroProdutos,
  })
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<string>('')
  const [ordem, setOrdem] = useState<'nome' | 'menor' | 'maior' | 'novos'>('nome')

  const categorias = useMemo(
    () =>
      [...new Set(produtos.map((p) => p.categoria.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [produtos],
  )

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    const filtrados = produtos.filter((p) => {
      if (categoria && p.categoria.trim() !== categoria) return false
      if (!termo) return true
      return normalizar(`${p.nome} ${p.descricao} ${p.categoria}`).includes(termo)
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
      {/* Apresentação */}
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

      {/* Busca e filtros */}
      <section aria-label="Filtros" className="space-y-4">
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

        {categorias.length > 0 && (
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
          titulo={produtos.length === 0 ? 'Novidades em breve' : 'Nenhum produto encontrado'}
          texto={
            produtos.length === 0
              ? 'Nosso catálogo está sendo preparado com carinho. Volte em breve!'
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
                Limpar filtros
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
    </div>
  )
}
