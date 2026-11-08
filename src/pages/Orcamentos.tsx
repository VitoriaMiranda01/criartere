import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { daquiADias } from '@/lib/datas'
import { Obrigatorio } from '@/components/common/MarcadorCampo'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { Orcamento, OrcamentoStatus } from '@/types/criartere'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import {
  NOMES_STATUS_ORCAMENTO,
  baixarPdfOrcamento,
  compartilharPdfOrcamento,
} from '@/utils/orcamentoPdf'
import { FormOrcamentoModal } from '@/components/orcamentos/FormOrcamentoModal'
import {
  FileText,
  Plus,
  Search,
  Download,
  Send,
  Pencil,
  ArrowRightCircle,
  MoreVertical,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

const CORES_STATUS: Record<OrcamentoStatus, string> = {
  aguardando: 'bg-[#D9A441]/15 text-[#8A6420] border-[#D9A441]/40',
  aprovado: 'bg-[#4C8A5A]/15 text-[#2F5E3A] border-[#4C8A5A]/40',
  recusado: 'bg-[#B5533C]/10 text-[#8E3A27] border-[#B5533C]/30',
  expirado: 'bg-[#6B4B36]/10 text-[#6B4B36] border-[#6B4B36]/25',
}

const FILTROS: { valor: 'todos' | OrcamentoStatus; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'aguardando', rotulo: 'Aguardando' },
  { valor: 'aprovado', rotulo: 'Aprovados' },
  { valor: 'recusado', rotulo: 'Recusados' },
  { valor: 'expirado', rotulo: 'Expirados' },
]

export default function Orcamentos() {
  const { state, dispatch } = useCriartere()
  const navigate = useNavigate()

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | OrcamentoStatus>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Orcamento | null>(null)
  const [paraConverter, setParaConverter] = useState<Orcamento | null>(null)
  const [prazoConversao, setPrazoConversao] = useState(daquiADias(7))
  const [paraExcluir, setParaExcluir] = useState<Orcamento | null>(null)

  const chavePix = state.config.chavePix

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return state.orcamentos.filter(
      (o) =>
        (filtro === 'todos' || o.status === filtro) &&
        (!t ||
          o.numero.toLowerCase().includes(t) ||
          o.clienteNome.toLowerCase().includes(t) ||
          o.itens.some((i) => i.nome.toLowerCase().includes(t))),
    )
  }, [state.orcamentos, busca, filtro])

  const contagem = (s: 'todos' | OrcamentoStatus) =>
    s === 'todos' ? state.orcamentos.length : state.orcamentos.filter((o) => o.status === s).length

  const totalAguardando = state.orcamentos
    .filter((o) => o.status === 'aguardando')
    .reduce((s, o) => s + o.valorTotal, 0)

  const pronto = (o: Orcamento) => {
    if (!o.numero) {
      toast.info('Salvando o orçamento... tente novamente em instantes.')
      return false
    }
    return true
  }

  const handleBaixar = (o: Orcamento) => {
    if (!pronto(o)) return
    baixarPdfOrcamento(o, chavePix)
  }

  const handleEnviar = async (o: Orcamento) => {
    if (!pronto(o)) return
    const ok = await compartilharPdfOrcamento(o, chavePix)
    if (!ok) {
      baixarPdfOrcamento(o, chavePix)
      toast.info('PDF baixado. Anexe o arquivo na conversa com o cliente (WhatsApp, e-mail...).')
    }
  }

  const handleConverter = () => {
    if (!paraConverter) return
    if (!prazoConversao) {
      toast.error('Informe o prazo de entrega do pedido.')
      return
    }
    dispatch({
      type: 'CONVERTER_ORCAMENTO',
      payload: { id: paraConverter.id, prazoEntrega: prazoConversao },
    })
    toast.success(`Orçamento Nº ${paraConverter.numero} aprovado e transformado em pedido!`, {
      action: { label: 'Ver pedidos', onClick: () => navigate('/pedidos') },
    })
    setParaConverter(null)
  }

  const verPedido = (o: Orcamento) => {
    const ped = state.pedidos.find((p) => p.id === o.pedidoId)
    navigate(ped ? `/pedidos?busca=${encodeURIComponent(ped.codigo)}` : '/pedidos')
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <CabecalhoPagina
          titulo="Orçamentos"
          descricao={`${contagem('aguardando')} aguardando confirmação • ${formatBRL(totalAguardando)} em negociação`}
          ajuda={
            <DicaAjuda titulo="Orçamentos" topico="orcamentos" lado="bottom">
              <p>Crie o orçamento, baixe ou compartilhe o PDF e envie ao cliente.</p>
              <p>Quando o cliente aprovar, use "Aprovado → virar pedido" para gerar o pedido.</p>
            </DicaAjuda>
          }
        />
        <Button
          onClick={() => {
            setEmEdicao(null)
            setModalAberto(true)
          }}
          className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Orçamento</span>
        </Button>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por número, cliente ou item..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs border-[#DFC3AE]"
          />
          {busca && (
            <button
              aria-label="Limpar busca"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B4B36] hover:text-[#0C1014]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filtro === f.valor
                  ? 'bg-[#A5683F] text-white shadow-xs'
                  : 'bg-[#F7F3EA] text-[#6B4B36] hover:bg-[#DFC3AE]/40'
              }`}
            >
              {f.rotulo} ({contagem(f.valor)})
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[#DFC3AE] p-10 text-center space-y-3">
          <FileText className="w-10 h-10 text-[#DFC3AE] mx-auto" />
          <p className="text-sm font-semibold text-[#0C1014]">
            {state.orcamentos.length === 0
              ? 'Nenhum orçamento ainda'
              : 'Nenhum orçamento encontrado'}
          </p>
          <p className="text-xs text-[#6B4B36]">
            Crie um orçamento, baixe o PDF para enviar ao cliente e, se for aprovado, transforme em
            pedido com um clique.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {lista.map((o) => {
            const podeConverter = !o.pedidoId && o.status !== 'recusado'
            return (
              <div
                key={o.id}
                className="bg-white rounded-xl border border-[#DFC3AE]/70 shadow-xs p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-[#0C1014]">
                        Nº {o.numero || '...'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CORES_STATUS[o.status]}`}
                      >
                        {NOMES_STATUS_ORCAMENTO[o.status]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0C1014] truncate mt-1">
                      {o.clienteNome}
                    </p>
                    <p className="text-[11px] text-[#6B4B36]">
                      {formatDataBR(o.data)} &bull; {o.disponibilidade}
                      {o.tipoPagamento === 'sinal' ? ` • Sinal ${o.percentualSinal}%` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#0C1014]">{formatBRL(o.valorTotal)}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label="Mais ações do orçamento"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#6B4B36]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem
                          onClick={() => {
                            setEmEdicao(o)
                            setModalAberto(true)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {!o.pedidoId &&
                          (['aguardando', 'recusado', 'expirado'] as OrcamentoStatus[])
                            .filter((s) => s !== o.status)
                            .map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() =>
                                  dispatch({
                                    type: 'ALTERAR_STATUS_ORCAMENTO',
                                    payload: { id: o.id, status: s },
                                  })
                                }
                              >
                                Marcar como {NOMES_STATUS_ORCAMENTO[s].toLowerCase()}
                              </DropdownMenuItem>
                            ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setParaExcluir(o)}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <ul className="text-xs text-[#6B4B36] space-y-0.5 border-t border-[#DFC3AE]/40 pt-2">
                  {o.itens.slice(0, 3).map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {i.quantidade}× {i.nome}
                      </span>
                      <span className="shrink-0">{formatBRL(i.subtotal)}</span>
                    </li>
                  ))}
                  {o.itens.length > 3 && <li>+ {o.itens.length - 3} item(ns)</li>}
                </ul>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBaixar(o)}
                    className="h-8 text-xs border-[#DFC3AE] text-[#6B4B36]"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnviar(o)}
                    className="h-8 text-xs border-[#DFC3AE] text-[#6B4B36]"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Enviar
                  </Button>
                  {o.pedidoId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verPedido(o)}
                      className="h-8 text-xs border-[#4C8A5A]/40 text-[#2F5E3A] ml-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Ver pedido
                    </Button>
                  ) : (
                    podeConverter && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!pronto(o)) return
                          setPrazoConversao(daquiADias(7))
                          setParaConverter(o)
                        }}
                        className="h-8 text-xs bg-[#4C8A5A] hover:bg-[#3D6F48] text-white ml-auto"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5 mr-1.5" />
                        Aprovado → virar pedido
                      </Button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormOrcamentoModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        orcamentoParaEditar={emEdicao}
      />

      {/* CONFIRMAR CONVERSÃO */}
      <AlertDialog open={!!paraConverter} onOpenChange={(v) => !v && setParaConverter(null)}>
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Transformar orçamento Nº {paraConverter?.numero} em pedido?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              Será criado um pedido para <strong>{paraConverter?.clienteNome}</strong> no valor de{' '}
              <strong>{formatBRL(paraConverter?.valorTotal ?? 0)}</strong>, com os mesmos itens. O
              orçamento fica registrado como aprovado.
              {paraConverter &&
                !paraConverter.clienteId &&
                ' O cliente será cadastrado automaticamente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label
              htmlFor="orcamentos-campo-1"
              className="text-xs font-bold text-[#6B4B36] uppercase tracking-wider"
            >
              Prazo de entrega do pedido
              <Obrigatorio />
            </Label>
            <Input
              id="orcamentos-campo-1"
              type="date"
              value={prazoConversao}
              onChange={(e) => setPrazoConversao(e.target.value)}
              className="h-9 text-xs border-[#DFC3AE]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs border-[#DFC3AE]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConverter}
              className="text-xs bg-[#4C8A5A] hover:bg-[#3D6F48] text-white"
            >
              Criar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRMAR EXCLUSÃO */}
      <AlertDialog open={!!paraExcluir} onOpenChange={(v) => !v && setParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Excluir orçamento Nº {paraExcluir?.numero}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              O orçamento será apagado definitivamente.
              {paraExcluir?.pedidoId && ' O pedido gerado a partir dele continua existindo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs border-[#DFC3AE]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (paraExcluir) dispatch({ type: 'EXCLUIR_ORCAMENTO', payload: paraExcluir.id })
                toast.success('Orçamento excluído.')
                setParaExcluir(null)
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
