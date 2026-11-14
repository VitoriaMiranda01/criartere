import { Link, Navigate, useLocation } from 'react-router-dom'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useSeo } from '@/lib/seo'
import { formatarPreco, PedidoCriado } from '@/loja/api'

interface Estado {
  pedido: PedidoCriado
  nome: string
  observacoes: string
  link: string | null
}

const qtd = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR'))

export default function PedidoEnviado() {
  useSeo({ titulo: 'Pedido enviado', caminho: '/pedido-enviado', indexar: false })
  const estado = useLocation().state as Estado | null
  if (!estado?.pedido) return <Navigate to="/meus-pedidos" replace />
  const { pedido, link } = estado

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-3xl border border-[#DFC3AE]/60 p-6 sm:p-9 text-center shadow-[0_8px_30px_rgba(12,16,20,0.06)]">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#E7F1E9] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-[#4C8A5A]" aria-hidden="true" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#A5683F] font-bold">
          Pedido Nº {pedido.numero}
        </p>
        <h1 className="font-serif text-3xl font-semibold mt-1">Pedido recebido!</h1>
        <p className="text-sm text-[#6B4B36] mt-2 leading-relaxed">
          Agora é só enviar a mensagem no WhatsApp para a Criartere confirmar seu pedido e combinar
          a entrega e o pagamento.
        </p>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full h-12 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <FaWhatsapp className="w-5 h-5" aria-hidden="true" /> Enviar mensagem no WhatsApp
          </a>
        )}
        {link && (
          <p className="text-[11px] text-[#6B4B36]/80 mt-2">
            Se o WhatsApp não abriu sozinho, toque no botão acima.
          </p>
        )}

        <div className="mt-6 text-left rounded-2xl bg-[#F7F3EA] border border-[#DFC3AE]/60 p-4">
          <ul className="space-y-1.5 text-sm">
            {pedido.itens.map((i, n) => (
              <li key={n} className="flex justify-between gap-3">
                <span className="text-[#3a2c22]">
                  {qtd(i.quantidade)}× {i.nome}
                </span>
                <span className="font-semibold shrink-0">{formatarPreco(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#DFC3AE]/70 mt-3 pt-3 flex justify-between text-sm">
            <span className="text-[#6B4B36]">
              Total dos produtos · {pedido.formaPagamento} · entrega a combinar
            </span>
            <strong className="font-serif text-lg text-[#A5683F]">
              {formatarPreco(pedido.total)}
            </strong>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            to="/meus-pedidos"
            className="h-11 px-5 rounded-lg border border-[#DFC3AE] bg-white text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014] inline-flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-4 h-4" /> Acompanhar meus pedidos
          </Link>
          <Link
            to="/"
            className="h-11 px-5 rounded-lg text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014] inline-flex items-center justify-center"
          >
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    </div>
  )
}
