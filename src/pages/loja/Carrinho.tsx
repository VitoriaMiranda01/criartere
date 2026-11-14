import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, Info } from 'lucide-react'
import { useTituloPagina } from '@/hooks/use-titulo-pagina'
import { useLoja } from '@/loja/LojaContext'
import { CarregandoLoja, EstadoVazio, ImagemProduto, SeletorQuantidade } from '@/loja/componentes'
import { formatarPreco } from '@/loja/api'
import { PrecisaEntrar } from './PrecisaEntrar'

export default function Carrinho() {
  useTituloPagina('Meu carrinho')
  const {
    usuario,
    sessaoVerificada,
    carrinho,
    produtos,
    carregandoProdutos,
    carregandoConta,
    alterarQuantidade,
    removerItem,
  } = useLoja()

  if (!sessaoVerificada) return <CarregandoLoja />
  if (!usuario) {
    return (
      <PrecisaEntrar
        icone={ShoppingBag}
        titulo="Seu carrinho fica salvo na sua conta"
        texto="Entre ou crie sua conta para montar seu carrinho e acessá-lo de qualquer aparelho."
      />
    )
  }
  if (carregandoProdutos || (carregandoConta && carrinho.length === 0)) return <CarregandoLoja />

  const linhas = carrinho.map((item) => ({
    item,
    produto: produtos.find((p) => p.id === item.produtoId),
  }))
  const disponiveis = linhas.filter((l) => l.produto)
  const total = disponiveis.reduce((s, l) => s + l.produto!.preco * l.item.quantidade, 0)
  const quantidadeTotal = disponiveis.reduce((s, l) => s + l.item.quantidade, 0)

  if (carrinho.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Meu carrinho</h1>
        <EstadoVazio
          icone={ShoppingBag}
          titulo="Seu carrinho está vazio"
          texto="Adicione produtos do catálogo para organizar suas compras."
          acao={
            <Link
              to="/loja"
              className="inline-flex h-10 px-5 items-center rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
            >
              Explorar o catálogo
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Meu carrinho</h1>
        <p className="text-sm text-[#6B4B36] mt-1">
          {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <ul className="bg-white rounded-2xl border border-[#DFC3AE]/60 divide-y divide-[#DFC3AE]/50">
          {linhas.map(({ item, produto }) => (
            <li key={item.id} className="p-4 sm:p-5 flex gap-4">
              {produto ? (
                <Link to={`/loja/produto/${produto.id}`} className="shrink-0">
                  <ImagemProduto
                    produto={produto}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-[#DFC3AE]/50"
                  />
                </Link>
              ) : (
                <ImagemProduto
                  produto={{ nome: 'Produto indisponível' }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0"
                />
              )}

              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {produto ? (
                      <Link
                        to={`/loja/produto/${produto.id}`}
                        className="font-serif text-base sm:text-lg font-semibold leading-snug hover:underline underline-offset-4 line-clamp-2"
                      >
                        {produto.nome}
                      </Link>
                    ) : (
                      <p className="font-serif text-base font-semibold text-[#6B4B36]">
                        Produto indisponível
                      </p>
                    )}
                    <p className="text-xs text-[#6B4B36] mt-0.5">
                      {produto
                        ? `${formatarPreco(produto.preco)} / unidade`
                        : 'Este produto saiu da loja. Remova-o do carrinho.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerItem(item.id)}
                    aria-label={`Remover ${produto?.nome ?? 'produto'} do carrinho`}
                    title="Remover"
                    className="p-2 -mr-2 -mt-1 rounded-lg text-[#6B4B36] hover:text-[#B5533C] hover:bg-[#B5533C]/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {produto && (
                  <div className="flex items-center justify-between gap-3 flex-wrap mt-auto">
                    <SeletorQuantidade
                      valor={item.quantidade}
                      onChange={(q) => alterarQuantidade(item.id, q)}
                      tamanho="sm"
                      rotulo={`Quantidade de ${produto.nome}`}
                    />
                    <p className="text-sm">
                      <span className="text-[#6B4B36] mr-1.5">Subtotal</span>
                      <strong className="font-serif text-lg text-[#0C1014]">
                        {formatarPreco(produto.preco * item.quantidade)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="bg-white rounded-2xl border border-[#DFC3AE]/60 p-5 space-y-4 lg:sticky lg:top-24">
          <h2 className="font-serif text-xl font-semibold">Resumo</h2>
          <div className="flex items-center justify-between text-sm text-[#6B4B36]">
            <span>Produtos ({quantidadeTotal})</span>
            <span>{formatarPreco(total)}</span>
          </div>
          <div className="border-t border-[#DFC3AE]/60 pt-4 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-serif text-2xl font-bold text-[#A5683F]">
              {formatarPreco(total)}
            </span>
          </div>
          <p className="flex gap-2 text-xs text-[#6B4B36] bg-[#F7F3EA] rounded-lg p-3 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#C48864]" aria-hidden="true" />
            O carrinho serve para organizar suas escolhas. Frete e pagamento são combinados
            diretamente com a Criartere pelo WhatsApp.
          </p>
          <Link
            to="/loja"
            className="block text-center text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014] underline-offset-4 hover:underline"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  )
}
