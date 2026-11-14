import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCriartere } from '@/store/CriartereContext'
import { formatBRL } from '@/store/periodUtils'

/**
 * Avisa no painel quando chega um pedido feito na loja virtual (os orçamentos
 * chegam em tempo real). Na primeira carga só registra os que já existiam.
 */
export function AvisoPedidosSite() {
  const { state } = useCriartere()
  const navigate = useNavigate()
  const conhecidos = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (state.carregando || state.modoDemo) return
    const doSite = state.orcamentos.filter((o) => o.origem === 'loja')
    if (conhecidos.current === null) {
      conhecidos.current = new Set(doSite.map((o) => o.id))
      return
    }
    for (const o of doSite) {
      if (conhecidos.current.has(o.id)) continue
      conhecidos.current.add(o.id)
      toast.success(`Novo pedido pelo site: Nº ${o.numero}`, {
        description: `${o.clienteNome} · ${formatBRL(o.valorTotal)}`,
        duration: 15000,
        action: { label: 'Ver', onClick: () => navigate('/admin/orcamentos') },
      })
    }
  }, [state.orcamentos, state.carregando, state.modoDemo, navigate])

  return null
}
