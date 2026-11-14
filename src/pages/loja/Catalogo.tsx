import { useMemo, useState } from 'react'
import { Search, PackageSearch, RefreshCw, X } from 'lucide-react'
import { useTituloPagina } from '@/hooks/use-titulo-pagina'
import { cn } from '@/lib/utils'
import { useLoja } from '@/loja/LojaContext'
import { CardProduto, CarregandoLoja, EstadoVazio } from '@/loja/componentes'

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function Catalogo() {
  useTituloPagina('Loja virtual', { indexar: true })
  const { produtos, carregandoProdutos, erroProdutos, recarregarVitrine } = useLoja()
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
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#DFC3AE] bg-white text-sm outline-none focus:ring-2 focus:ring-[#C48864]/50 focus:border-[#C48864]"
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
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as typeof ordem)}
            aria-label="Ordenar produtos"
            className="h-11 rounded-xl border border-[#DFC3AE] bg-white px-3 text-sm text-[#0C1014] outline-none focus:ring-2 focus:ring-[#C48864]/50"
          >
            <option value="nome">Ordem alfabética</option>
            <option value="novos">Novidades</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>
        </div>

        {categorias.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
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
        <section aria-label="Produtos">
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
