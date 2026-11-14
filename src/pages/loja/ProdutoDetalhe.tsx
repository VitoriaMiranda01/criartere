import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, PackageX, ShoppingBag } from 'lucide-react'
import { useTituloPagina } from '@/hooks/use-titulo-pagina'
import { useLoja } from '@/loja/LojaContext'
import {
  BadgeDisponibilidade,
  BotaoFavorito,
  BotaoWhatsApp,
  CardProduto,
  CarregandoLoja,
  EstadoVazio,
  ImagemProduto,
  SeletorQuantidade,
} from '@/loja/componentes'
import { formatarPreco } from '@/loja/api'

export default function ProdutoDetalhe() {
  const { id } = useParams()
  const { produtos, carregandoProdutos, adicionarCarrinho } = useLoja()
  const produto = produtos.find((p) => p.id === id)
  useTituloPagina(produto?.nome ?? 'Produto', { indexar: !!produto })

  const [quantidade, setQuantidade] = useState(1)
  const [adicionando, setAdicionando] = useState(false)
  const [adicionado, setAdicionado] = useState(false)

  if (carregandoProdutos) return <CarregandoLoja />

  if (!produto) {
    return (
      <EstadoVazio
        icone={PackageX}
        titulo="Produto indisponível"
        texto="Este produto não está mais disponível na loja. Que tal conhecer outras criações?"
        acao={
          <Link
            to="/loja"
            className="inline-flex h-10 px-5 items-center rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
          >
            Ver catálogo
          </Link>
        }
      />
    )
  }

  const relacionados = produtos
    .filter((p) => p.id !== produto.id && produto.categoria && p.categoria === produto.categoria)
    .slice(0, 4)

  const adicionar = async () => {
    setAdicionando(true)
    const ok = await adicionarCarrinho(produto, quantidade)
    setAdicionando(false)
    if (ok) {
      setAdicionado(true)
      setTimeout(() => setAdicionado(false), 1800)
    }
  }

  return (
    <div className="space-y-12">
      <Link
        to="/loja"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
      </Link>

      <article className="grid md:grid-cols-2 gap-6 md:gap-10 items-start">
        <div className="relative rounded-3xl overflow-hidden border border-[#DFC3AE]/60 bg-white">
          <ImagemProduto produto={produto} quadrada className="w-full" />
          <BotaoFavorito produto={produto} className="absolute top-4 right-4 w-11 h-11" />
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {produto.categoria && (
                <span className="text-[11px] uppercase tracking-widest text-[#6B4B36] font-semibold">
                  {produto.categoria}
                </span>
              )}
              <BadgeDisponibilidade produto={produto} />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-[#0C1014]">
              {produto.nome}
            </h1>
            <p className="font-serif text-3xl font-bold text-[#A5683F]">
              {formatarPreco(produto.preco)}
            </p>
          </div>

          {produto.descricao && (
            <p className="text-[15px] text-[#3a2c22] leading-relaxed whitespace-pre-line">
              {produto.descricao}
            </p>
          )}

          <div className="rounded-2xl bg-white border border-[#DFC3AE]/60 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <SeletorQuantidade valor={quantidade} onChange={setQuantidade} />
              <button
                type="button"
                onClick={adicionar}
                disabled={adicionando}
                className="flex-1 h-10 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {adicionado ? (
                  <>
                    <Check className="w-4 h-4" /> Adicionado ao carrinho
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Adicionar ao carrinho
                  </>
                )}
              </button>
            </div>
            <BotaoWhatsApp produto={produto} className="w-full" />
            <p className="text-xs text-[#6B4B36]">
              {produto.disponibilidade === 'pronta_entrega'
                ? 'Produto a pronta entrega. Confirme os detalhes pelo WhatsApp.'
                : 'Produzido sob encomenda. Consulte o prazo pelo WhatsApp.'}
            </p>
          </div>
        </div>
      </article>

      {relacionados.length > 0 && (
        <section aria-labelledby="relacionados" className="space-y-4">
          <h2 id="relacionados" className="font-serif text-2xl font-semibold">
            Você também pode gostar
          </h2>
          <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {relacionados.map((p) => (
              <CardProduto key={p.id} produto={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
