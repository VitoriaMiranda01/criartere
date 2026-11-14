import { useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, PackageX, ShoppingBag } from 'lucide-react'
import { useSeo } from '@/lib/seo'
import { caminhoProduto, descricaoProduto, idDoCaminho, jsonLdProduto } from '@/loja/seo-dados'
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
import { formatarPreco, ProdutoVitrine } from '@/loja/api'

export default function ProdutoDetalhe() {
  const { id: parametro } = useParams()
  const location = useLocation()
  const id = idDoCaminho(parametro)
  const { produtos, carregandoProdutos, erroProdutos, adicionarCarrinho } = useLoja()
  const produto = produtos.find((p) => p.id === id)
  useSeo(
    produto
      ? {
          titulo: produto.categoria ? `${produto.nome} – ${produto.categoria}` : produto.nome,
          descricao: descricaoProduto(produto),
          caminho: caminhoProduto(produto),
          imagem: produto.imagemUrl,
          tipo: 'product',
          indexar: true,
          jsonLd: jsonLdProduto(produto),
        }
      : {
          titulo: 'Produto indisponível',
          indexar: false,
          ativo: !carregandoProdutos && !erroProdutos,
        },
  )

  const [quantidade, setQuantidade] = useState(1)
  const [adicionando, setAdicionando] = useState(false)
  const [adicionado, setAdicionado] = useState(false)

  if (carregandoProdutos) return <CarregandoLoja />

  // Endereço antigo (só o código) ou nome desatualizado: vai para o endereço amigável
  if (produto && location.pathname !== caminhoProduto(produto)) {
    return <Navigate to={caminhoProduto(produto)} replace />
  }

  if (!produto) {
    return (
      <EstadoVazio
        icone={PackageX}
        titulo="Produto indisponível"
        texto="Este produto não está mais disponível na loja. Que tal conhecer outras criações?"
        acao={
          <Link
            to="/"
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
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
      </Link>

      <article className="grid md:grid-cols-2 gap-6 md:gap-10 items-start">
        <GaleriaProduto key={produto.id} produto={produto} />

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

/** Fotos do produto: foto grande com setas (ou deslizar no celular) e miniaturas abaixo. */
function GaleriaProduto({ produto }: { produto: ProdutoVitrine }) {
  const fotos = produto.imagens.length ? produto.imagens : [undefined]
  const [atual, setAtual] = useState(0)
  const [toqueInicio, setToqueInicio] = useState<number | null>(null)
  const total = fotos.length
  const ir = (i: number) => setAtual((i + total) % total)

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-3xl overflow-hidden border border-[#DFC3AE]/60 bg-white"
        onTouchStart={(e) => setToqueInicio(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toqueInicio === null || total < 2) return
          const dx = e.changedTouches[0].clientX - toqueInicio
          if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1))
          setToqueInicio(null)
        }}
      >
        <ImagemProduto
          key={fotos[atual] ?? 'sem-foto'}
          produto={{
            nome: total > 1 ? `${produto.nome} — foto ${atual + 1} de ${total}` : produto.nome,
            imagemUrl: fotos[atual],
          }}
          quadrada
          className="w-full"
        />
        <BotaoFavorito produto={produto} className="absolute top-4 right-4 w-11 h-11" />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(atual - 1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-[#0C1014] hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(atual + 1)}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-[#0C1014] hover:bg-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0C1014]/70 px-2.5 py-0.5 text-xs font-semibold text-white">
              {atual + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div
          className="flex gap-2 overflow-x-auto sem-barra pb-1"
          role="tablist"
          aria-label="Fotos do produto"
        >
          {fotos.map((url, i) => (
            <button
              key={url ?? i}
              type="button"
              role="tab"
              aria-selected={i === atual}
              aria-label={`Ver foto ${i + 1}`}
              onClick={() => setAtual(i)}
              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                i === atual ? 'border-[#A5683F]' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <ImagemProduto
                produto={{ nome: `${produto.nome} — miniatura ${i + 1}`, imagemUrl: url }}
                className="w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
