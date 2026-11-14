/* Componentes visuais da loja virtual */
import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaWhatsapp } from 'react-icons/fa'
import { Heart, Minus, Plus, ShoppingBag, ImageOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { caminhoProduto } from './seo-dados'
import { useLoja } from './LojaContext'
import {
  ProdutoVitrine,
  formatarPreco,
  NOME_DISPONIBILIDADE,
  linkWhatsAppProduto,
  numeroWhatsApp,
} from './api'

/** Imagem do produto, com um fundo neutro quando não houver foto. */
export function ImagemProduto({
  produto,
  className,
  quadrada = false,
}: {
  produto: Pick<ProdutoVitrine, 'nome' | 'imagemUrl'>
  className?: string
  quadrada?: boolean
}) {
  const [falhou, setFalhou] = useState(false)
  // (o plugin de proporção do Tailwind desativa a classe aspect-square)
  const estilo = quadrada ? { aspectRatio: '1 / 1' } : undefined
  if (!produto.imagemUrl || falhou) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-[#F1E6DC] text-[#6B4B36]/70',
          className,
        )}
        style={estilo}
        role="img"
        aria-label={`Sem foto de ${produto.nome}`}
      >
        <ImageOff className="w-7 h-7" aria-hidden="true" />
        <span className="text-[11px] uppercase tracking-widest">Sem foto</span>
      </div>
    )
  }
  return (
    <img
      src={produto.imagemUrl}
      alt={produto.nome}
      loading="lazy"
      onError={() => setFalhou(true)}
      style={estilo}
      className={cn('object-cover bg-[#F1E6DC]', className)}
    />
  )
}

export function BadgeDisponibilidade({ produto }: { produto: ProdutoVitrine }) {
  const pronta = produto.disponibilidade === 'pronta_entrega'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        pronta ? 'bg-[#E7F1E9] text-[#3D6F48]' : 'bg-[#F6EDE7] text-[#8C5636]',
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', pronta ? 'bg-[#4C8A5A]' : 'bg-[#C48864]')}
        aria-hidden="true"
      />
      {NOME_DISPONIBILIDADE[produto.disponibilidade]}
    </span>
  )
}

/** Coração de favoritar (canto superior direito da imagem). */
export function BotaoFavorito({
  produto,
  className,
}: {
  produto: ProdutoVitrine
  className?: string
}) {
  const { favoritos, alternarFavorito } = useLoja()
  const ativo = favoritos.has(produto.id)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        alternarFavorito(produto)
      }}
      aria-pressed={ativo}
      aria-label={ativo ? `Remover ${produto.nome} dos favoritos` : `Favoritar ${produto.nome}`}
      className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center bg-white/90 backdrop-blur shadow-sm border border-white',
        'transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864]',
        className,
      )}
    >
      <Heart
        className={cn(
          'w-[18px] h-[18px] transition-colors',
          ativo ? 'fill-[#C48864] text-[#C48864]' : 'text-[#6B4B36]',
        )}
        aria-hidden="true"
      />
    </button>
  )
}

export function SeletorQuantidade({
  valor,
  onChange,
  tamanho = 'md',
  rotulo = 'Quantidade',
}: {
  valor: number
  onChange: (v: number) => void
  tamanho?: 'sm' | 'md'
  rotulo?: string
}) {
  const btn = tamanho === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  return (
    <div
      className="inline-flex items-center rounded-lg border border-[#DFC3AE] bg-white overflow-hidden"
      role="group"
      aria-label={rotulo}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, valor - 1))}
        disabled={valor <= 1}
        aria-label="Diminuir quantidade"
        className={cn(
          btn,
          'flex items-center justify-center text-[#6B4B36] hover:bg-[#F7F3EA] disabled:opacity-40',
        )}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={999}
        value={valor}
        aria-label={rotulo}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n)) onChange(Math.max(1, Math.min(999, n)))
        }}
        className={cn(
          'w-10 text-center text-sm font-semibold text-[#0C1014] bg-transparent outline-none',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(999, valor + 1))}
        disabled={valor >= 999}
        aria-label="Aumentar quantidade"
        className={cn(
          btn,
          'flex items-center justify-center text-[#6B4B36] hover:bg-[#F7F3EA] disabled:opacity-40',
        )}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

/** Botão "Consultar pelo WhatsApp" com mensagem automática (nome + link do produto). */
export function BotaoWhatsApp({
  produto,
  className,
  compacto = false,
}: {
  produto: ProdutoVitrine
  className?: string
  compacto?: boolean
}) {
  const { contato } = useLoja()
  const numero = numeroWhatsApp(contato?.whatsapp ?? '')
  if (!numero) return null
  return (
    <a
      href={linkWhatsAppProduto(contato!.whatsapp, produto)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-[#25D366]/50 bg-white text-[#128C4B] font-semibold',
        'hover:bg-[#25D366]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]',
        compacto ? 'h-9 text-xs px-3' : 'h-11 text-sm px-4',
        className,
      )}
      aria-label={`Consultar ${produto.nome} pelo WhatsApp`}
    >
      <FaWhatsapp className={compacto ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden="true" />
      <span>Consultar pelo WhatsApp</span>
    </a>
  )
}

/** Card de produto do catálogo */
export function CardProduto({ produto }: { produto: ProdutoVitrine }) {
  const { adicionarCarrinho } = useLoja()
  const [quantidade, setQuantidade] = useState(1)
  const [adicionando, setAdicionando] = useState(false)
  const [adicionado, setAdicionado] = useState(false)

  const adicionar = async () => {
    setAdicionando(true)
    const ok = await adicionarCarrinho(produto, quantidade)
    setAdicionando(false)
    if (ok) {
      setAdicionado(true)
      setQuantidade(1)
      setTimeout(() => setAdicionado(false), 1800)
    }
  }

  return (
    <article className="group flex flex-col bg-white rounded-2xl border border-[#DFC3AE]/60 overflow-hidden shadow-[0_2px_12px_rgba(12,16,20,0.04)] hover:shadow-[0_10px_30px_rgba(12,16,20,0.08)] hover:border-[#C48864]/60 transition-all">
      <div className="relative">
        <Link
          to={caminhoProduto(produto)}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C48864]"
        >
          <ImagemProduto
            produto={produto}
            quadrada
            className="w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <BotaoFavorito produto={produto} className="absolute top-3 right-3" />
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {produto.categoria ? (
            <span className="text-[11px] uppercase tracking-widest text-[#6B4B36] font-semibold truncate">
              {produto.categoria}
            </span>
          ) : (
            <span />
          )}
          <BadgeDisponibilidade produto={produto} />
        </div>

        <Link to={caminhoProduto(produto)} className="hover:underline underline-offset-4">
          <h3 className="font-serif text-lg font-semibold text-[#0C1014] leading-snug line-clamp-2">
            {produto.nome}
          </h3>
        </Link>

        {produto.descricao && (
          <p className="text-sm text-[#6B4B36] line-clamp-2 leading-relaxed">{produto.descricao}</p>
        )}

        <p className="font-serif text-xl font-bold text-[#A5683F] mt-auto pt-1">
          {formatarPreco(produto.preco)}
        </p>

        <div className="flex items-center gap-2">
          <SeletorQuantidade valor={quantidade} onChange={setQuantidade} tamanho="sm" />
          <button
            type="button"
            onClick={adicionar}
            disabled={adicionando}
            className="flex-1 h-8 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#A5683F]"
          >
            {adicionado ? (
              <>
                <Check className="w-4 h-4" /> Adicionado
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Adicionar
              </>
            )}
          </button>
        </div>
        <BotaoWhatsApp produto={produto} compacto className="w-full" />
      </div>
    </article>
  )
}

export function CarregandoLoja() {
  return (
    <div
      className="min-h-[40vh] flex items-center justify-center"
      role="status"
      aria-label="Carregando"
    >
      <span className="w-7 h-7 rounded-full border-2 border-[#DFC3AE] border-t-[#C48864] animate-spin" />
    </div>
  )
}

export function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  icone: ComponentType<{ className?: string }>
  titulo: string
  texto: string
  acao?: ReactNode
}) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-[#DFC3AE]">
      <div className="w-14 h-14 mx-auto rounded-full bg-[#F6EDE7] flex items-center justify-center mb-4">
        <Icone className="w-6 h-6 text-[#C48864]" />
      </div>
      <h2 className="font-serif text-xl font-semibold text-[#0C1014]">{titulo}</h2>
      <p className="text-sm text-[#6B4B36] mt-1 max-w-sm mx-auto">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}
