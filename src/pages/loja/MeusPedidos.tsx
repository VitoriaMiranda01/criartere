import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useSeo } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { useLoja } from '@/loja/LojaContext'
import { CarregandoLoja, EstadoVazio } from '@/loja/componentes'
import { formatarPreco, listarMeusPedidos, numeroWhatsApp, PedidoLoja } from '@/loja/api'
import { PrecisaEntrar } from './PrecisaEntrar'

const ESTILO_SITUACAO: Record<PedidoLoja['situacaoTipo'], string> = {
  aguardando: 'bg-[#FBF3E2] text-[#8A6417]',
  andamento: 'bg-[#F6EDE7] text-[#8C5636]',
  concluido: 'bg-[#E7F1E9] text-[#3D6F48]',
  encerrado: 'bg-[#F1EEEA] text-[#6B4B36]/80',
}

const qtd = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR'))

export default function MeusPedidos() {
  useSeo({ titulo: 'Meus pedidos', caminho: '/meus-pedidos', indexar: false })
  const { usuario, sessaoVerificada, contato } = useLoja()
  const [pedidos, setPedidos] = useState<PedidoLoja[] | null>(null)
  const [erro, setErro] = useState(false)

  const carregar = () => {
    setErro(false)
    listarMeusPedidos()
      .then(setPedidos)
      .catch(() => setErro(true))
  }

  useEffect(() => {
    if (usuario) carregar()
  }, [usuario])

  if (!sessaoVerificada) return <CarregandoLoja />
  if (!usuario) {
    return (
      <PrecisaEntrar
        icone={ClipboardList}
        titulo="Entre para ver seus pedidos"
        texto="Acompanhe aqui os pedidos que você fez na loja."
      />
    )
  }
  if (erro) {
    return (
      <EstadoVazio
        icone={RefreshCw}
        titulo="Não foi possível carregar seus pedidos"
        texto="Verifique sua conexão com a internet e tente de novo."
        acao={
          <button
            type="button"
            onClick={carregar}
            className="h-10 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
          >
            Tentar de novo
          </button>
        }
      />
    )
  }
  if (!pedidos) return <CarregandoLoja />

  const whatsLoja = numeroWhatsApp(contato?.whatsapp ?? '')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Meus pedidos</h1>
        <p className="text-sm text-[#6B4B36] mt-1">
          A situação é atualizada pela Criartere conforme o seu pedido avança.
        </p>
      </header>

      {pedidos.length === 0 ? (
        <EstadoVazio
          icone={ClipboardList}
          titulo="Você ainda não fez pedidos"
          texto="Monte seu carrinho e finalize o pedido para falar com a loja pelo WhatsApp."
          acao={
            <Link
              to="/"
              className="inline-flex h-10 px-5 items-center rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
            >
              Explorar o catálogo
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {pedidos.map((p) => (
            <li key={p.id} className="bg-white rounded-2xl border border-[#DFC3AE]/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg font-semibold">Pedido Nº {p.numero}</p>
                  <p className="text-xs text-[#6B4B36]">
                    {new Date(p.criadoEm).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    ESTILO_SITUACAO[p.situacaoTipo],
                  )}
                >
                  {p.situacao}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-[#3a2c22]">
                {p.itens.map((i, n) => (
                  <li key={n} className="flex justify-between gap-3">
                    <span>
                      {qtd(i.quantidade)}× {i.nome}
                    </span>
                    <span className="text-[#6B4B36] shrink-0">{formatarPreco(i.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-[#DFC3AE]/50 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  Total{' '}
                  <strong className="font-serif text-lg text-[#A5683F]">
                    {formatarPreco(p.valorTotal)}
                  </strong>
                </span>
                {whatsLoja && (
                  <a
                    href={`https://wa.me/${whatsLoja}?text=${encodeURIComponent(
                      `Olá! Gostaria de falar sobre o meu pedido Nº ${p.numero} feito no site.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#128C4B] hover:underline underline-offset-4"
                  >
                    <FaWhatsapp className="w-4 h-4" aria-hidden="true" /> Falar sobre este pedido
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
