import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { Pedido, OrderStatus, PaymentStatus } from '@/types/criartere'
import { selectTotalPagoDoPedido } from '@/store/selectors'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import { DetalhePedidoDrawer } from '@/components/pedidos/DetalhePedidoDrawer'
import { FormPedidoModal } from '@/components/pedidos/FormPedidoModal'
import { ModalPagamento } from '@/components/pedidos/ModalPagamento'
import { DialogEtapa, DialogExcluirEtapa, MenuColuna } from '@/components/pedidos/GerenciarColunas'
import { etapasDoKanban, infoEtapa, todasEtapas } from '@/store/etapas'
import { EtapaPedido } from '@/types/criartere'
import {
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  Filter,
  CreditCard,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  Package,
  FileText,
  Columns3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function Pedidos() {
  const { state, dispatch } = useCriartere()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Modo de visualização: kanban | lista
  const [modoView, setModoView] = useState<'kanban' | 'lista'>('kanban')

  // Filtros
  const filtroStatusUrl = searchParams.get('status') as OrderStatus | null
  const buscaUrl = searchParams.get('busca') || ''

  const [busca, setBusca] = useState(buscaUrl)
  const [filtroStatus, setFiltroStatus] = useState<string>(filtroStatusUrl || 'todos')
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<'recente' | 'antigo' | 'maior_valor' | 'menor_valor'>(
    'recente',
  )

  // Estados de modais e gavetas
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState<string | null>(null)
  const [pedidoParaEditar, setPedidoParaEditar] = useState<Pedido | null>(null)
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [pedidoParaPagamento, setPedidoParaPagamento] = useState<Pedido | null>(null)

  // Drag & drop nativo para o Kanban
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaHover, setColunaHover] = useState<OrderStatus | null>(null)

  // Colunas do Kanban: etapas cadastradas pela loja (editáveis)
  const etapasKanban = etapasDoKanban(state)
  const colunasKanban = etapasKanban.map((e) => ({
    id: e.chave,
    label: e.nome,
    cor: e.cor,
    bgHeader: `${e.cor}14`,
    etapa: e,
  }))

  // Gerenciamento de colunas
  const [dialogEtapaAberto, setDialogEtapaAberto] = useState(false)
  const [etapaEmEdicao, setEtapaEmEdicao] = useState<EtapaPedido | null>(null)
  const [etapaParaExcluir, setEtapaParaExcluir] = useState<EtapaPedido | null>(null)
  const abrirNovaColuna = () => {
    setEtapaEmEdicao(null)
    setDialogEtapaAberto(true)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setArrastandoId(id)
  }

  const handleDragOver = (e: React.DragEvent, statusCol: OrderStatus) => {
    e.preventDefault()
    if (colunaHover !== statusCol) {
      setColunaHover(statusCol)
    }
  }

  const handleDrop = (e: React.DragEvent, statusCol: OrderStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || arrastandoId
    setArrastandoId(null)
    setColunaHover(null)

    if (!id) return

    const pedido = state.pedidos.find((p) => p.id === id)
    if (!pedido || pedido.status === statusCol) return

    // Regra: Não permitir mover direto para cancelado via drag (cancelamento tem confirmação)
    dispatch({
      type: 'ALTERAR_STATUS_PEDIDO',
      payload: { pedidoId: id, novoStatus: statusCol },
    })

    toast.success(`Pedido ${pedido.codigo} movido para "${infoEtapa(state, statusCol).nome}"!`)
  }

  // Filtragem dos pedidos
  const pedidosFiltrados = state.pedidos.filter((p) => {
    // Busca por código ou nome do cliente
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      const cli = state.clientes.find((c) => c.id === p.clienteId)
      const matchCodigo = p.codigo.toLowerCase().includes(termo)
      const matchCliente = cli ? cli.nome.toLowerCase().includes(termo) : false
      if (!matchCodigo && !matchCliente) return false
    }

    // Filtro de status
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) {
      return false
    }

    // Filtro de pagamento
    if (filtroPagamento !== 'todos' && p.statusPagamento !== filtroPagamento) {
      return false
    }

    return true
  })

  // Ordenação
  const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) => {
    if (ordenacao === 'recente') return b.dataCriacao.localeCompare(a.dataCriacao)
    if (ordenacao === 'antigo') return a.dataCriacao.localeCompare(b.dataCriacao)
    if (ordenacao === 'maior_valor') return b.valorTotal - a.valorTotal
    if (ordenacao === 'menor_valor') return a.valorTotal - b.valorTotal
    return 0
  })

  return (
    <div className="space-y-6">
      {/* HEADER DA PÁGINA: TÍTULO, CONTROLES E BOTÃO NOVO PEDIDO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#0C1014]">Gestão de Pedidos</h2>
          <p className="text-xs text-[#6B4B36]">
            {state.pedidos.length} pedidos no total &bull; Movimentação arrastável em tempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador Kanban / Lista */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#DFC3AE]/70 shadow-xs">
            <button
              onClick={() => setModoView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                modoView === 'kanban'
                  ? 'bg-[#C48864] text-white shadow-xs'
                  : 'text-[#6B4B36] hover:bg-[#F7F3EA]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setModoView('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                modoView === 'lista'
                  ? 'bg-[#C48864] text-white shadow-xs'
                  : 'text-[#6B4B36] hover:bg-[#F7F3EA]'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Nova coluna do Kanban */}
          {modoView === 'kanban' && (
            <Button
              variant="outline"
              onClick={abrirNovaColuna}
              className="border-[#DFC3AE] text-[#6B4B36] text-xs h-10 px-4 rounded-xl flex items-center gap-1.5"
              title="Criar uma nova coluna no Kanban"
            >
              <Columns3 className="w-4 h-4" />
              <span>Nova coluna</span>
            </Button>
          )}

          {/* Atalho para Orçamentos */}
          <Button
            variant="outline"
            onClick={() => navigate('/orcamentos')}
            className="border-[#DFC3AE] text-[#6B4B36] text-xs h-10 px-4 rounded-xl flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Orçamentos</span>
          </Button>

          {/* Botão Novo Pedido */}
          <Button
            onClick={() => {
              setPedidoParaEditar(null)
              setModalFormAberto(true)
            }}
            className="bg-[#C48864] hover:bg-[#B0764F] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Pedido</span>
          </Button>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Busca */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-[#6B4B36]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar por número do pedido ou nome do cliente..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setSearchParams((prev) => {
                  if (e.target.value) prev.set('busca', e.target.value)
                  else prev.delete('busca')
                  return prev
                })
              }}
              className="pl-9 pr-8 h-9 text-xs border-[#DFC3AE]"
            />
            {busca && (
              <button
                onClick={() => {
                  setBusca('')
                  setSearchParams((prev) => {
                    prev.delete('busca')
                    return prev
                  })
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6B4B36] hover:text-[#0C1014]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Status */}
          <div className="sm:col-span-3">
            <Select
              value={filtroStatus}
              onValueChange={(val) => {
                setFiltroStatus(val)
                setSearchParams((prev) => {
                  if (val !== 'todos') prev.set('status', val)
                  else prev.delete('status')
                  return prev
                })
              }}
            >
              <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue placeholder="Filtrar por status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os Status
                </SelectItem>
                {todasEtapas(state).map((e) => (
                  <SelectItem key={e.chave} value={e.chave} className="text-xs">
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Pagamento */}
          <div className="sm:col-span-2">
            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue placeholder="Pagamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos Pagtos
                </SelectItem>
                <SelectItem value="pago" className="text-xs">
                  Pago
                </SelectItem>
                <SelectItem value="parcial" className="text-xs">
                  Parcial
                </SelectItem>
                <SelectItem value="pendente" className="text-xs">
                  Pendente
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordenação */}
          <div className="sm:col-span-2">
            <Select value={ordenacao} onValueChange={(val: any) => setOrdenacao(val)}>
              <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recente" className="text-xs">
                  Mais recentes
                </SelectItem>
                <SelectItem value="antigo" className="text-xs">
                  Mais antigos
                </SelectItem>
                <SelectItem value="maior_valor" className="text-xs">
                  Maior valor
                </SelectItem>
                <SelectItem value="menor_valor" className="text-xs">
                  Menor valor
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* VISUALIZAÇÃO KANBAN */}
      {modoView === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 w-max">
            {colunasKanban.map((coluna, indiceColuna) => {
              const pedidosDaColuna = pedidosOrdenados.filter((p) => p.status === coluna.id)
              const isHoverTarget = colunaHover === coluna.id

              return (
                <div
                  key={coluna.id}
                  onDragOver={(e) => handleDragOver(e, coluna.id)}
                  onDragLeave={() => setColunaHover(null)}
                  onDrop={(e) => handleDrop(e, coluna.id)}
                  className={`w-72 shrink-0 flex flex-col rounded-2xl border transition-all ${
                    isHoverTarget
                      ? 'border-[#C48864] bg-[#C48864]/5 ring-2 ring-[#C48864]/30'
                      : 'border-[#DFC3AE]/70 bg-white/70'
                  }`}
                >
                  {/* Cabeçalho da Coluna */}
                  <div
                    className="p-3.5 border-b border-[#DFC3AE]/50 rounded-t-2xl flex items-center justify-between"
                    style={{ backgroundColor: coluna.bgHeader }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: coluna.cor }}
                      />
                      <h3 className="font-serif text-sm font-bold text-[#0C1014]">
                        {coluna.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        style={{ backgroundColor: coluna.cor }}
                        className="text-white text-xs font-bold px-2 py-0 border-none h-5"
                      >
                        {pedidosDaColuna.length}
                      </Badge>
                      <MenuColuna
                        etapa={coluna.etapa}
                        posicao={indiceColuna}
                        total={colunasKanban.length}
                        onEditar={() => {
                          setEtapaEmEdicao(coluna.etapa)
                          setDialogEtapaAberto(true)
                        }}
                        onExcluir={() => setEtapaParaExcluir(coluna.etapa)}
                      />
                    </div>
                  </div>

                  {/* Lista de Cartões Arrasta-e-Solta */}
                  <div className="p-3 flex-1 space-y-3 min-h-[350px] max-h-[calc(100vh-320px)] overflow-y-auto">
                    {pedidosDaColuna.length === 0 ? (
                      <div className="h-32 flex items-center justify-center border border-dashed border-[#DFC3AE]/60 rounded-xl text-[11px] text-[#6B4B36]/60 p-4 text-center">
                        Arraste um cartão para esta coluna
                      </div>
                    ) : (
                      pedidosDaColuna.map((ped) => {
                        const cliente = state.clientes.find((c) => c.id === ped.clienteId)
                        const jaPago = selectTotalPagoDoPedido(state, ped.id)
                        const saldo = Math.max(0, ped.valorTotal - jaPago)
                        const isDragging = arrastandoId === ped.id

                        return (
                          <div
                            key={ped.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ped.id)}
                            onClick={() => setPedidoSelecionadoId(ped.id)}
                            className={`p-3.5 bg-white rounded-xl border border-[#DFC3AE]/80 shadow-xs hover:shadow-md hover:border-[#C48864] cursor-grab active:cursor-grabbing transition-all space-y-2.5 ${
                              isDragging ? 'opacity-40 scale-95 border-dashed border-[#C48864]' : ''
                            }`}
                          >
                            {/* Linha superior: Código e indicador de pagamento */}
                            <div className="flex items-center justify-between">
                              <span className="font-serif font-bold text-xs text-[#0C1014]">
                                {ped.codigo}
                              </span>

                              {/* Dot indicador de pagamento */}
                              <div
                                className="flex items-center gap-1.5"
                                title={`Pagamento: ${ped.statusPagamento}`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    ped.statusPagamento === 'pago'
                                      ? 'bg-[#4C8A5A]'
                                      : ped.statusPagamento === 'parcial'
                                        ? 'bg-[#D9A441]'
                                        : 'bg-red-500'
                                  }`}
                                />
                                <span className="text-[10px] text-[#6B4B36] capitalize">
                                  {ped.statusPagamento}
                                </span>
                              </div>
                            </div>

                            {/* Cliente */}
                            <div>
                              <p className="font-semibold text-xs text-[#0C1014] truncate">
                                {cliente?.nome || 'Cliente'}
                              </p>
                              <p className="text-[11px] text-[#6B4B36]/80 flex items-center gap-1 mt-0.5">
                                <Package className="w-3 h-3 text-[#C48864]" />
                                {ped.itens.length} {ped.itens.length === 1 ? 'item' : 'itens'}
                              </p>
                            </div>

                            {/* Valor e Prazo */}
                            <div className="pt-2 border-t border-[#DFC3AE]/40 flex items-center justify-between text-xs">
                              <span className="font-serif font-bold text-[#C48864]">
                                {formatBRL(ped.valorTotal)}
                              </span>
                              <span className="text-[11px] text-[#6B4B36] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#6B4B36]/60" />
                                {formatDataBR(ped.prazoEntrega)}
                              </span>
                            </div>

                            {saldo > 0.01 && (
                              <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex justify-between">
                                <span>A receber:</span>
                                <span className="font-bold">{formatBRL(saldo)}</span>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
            <button
              onClick={abrirNovaColuna}
              className="w-60 shrink-0 min-h-[200px] rounded-2xl border-2 border-dashed border-[#DFC3AE] text-[#6B4B36] hover:border-[#C48864] hover:text-[#C48864] hover:bg-white/60 transition-colors flex flex-col items-center justify-center gap-2 text-xs font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nova coluna
            </button>
          </div>
        </div>
      )}

      {/* VISUALIZAÇÃO LISTA */}
      {modoView === 'lista' && (
        <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Prazo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFC3AE]/40 text-[#0C1014]">
                {pedidosOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#6B4B36]">
                      Nenhum pedido encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  pedidosOrdenados.map((ped) => {
                    const cliente = state.clientes.find((c) => c.id === ped.clienteId)
                    const jaPago = selectTotalPagoDoPedido(state, ped.id)
                    const saldo = Math.max(0, ped.valorTotal - jaPago)

                    return (
                      <tr
                        key={ped.id}
                        className="hover:bg-[#F7F3EA]/50 transition-colors cursor-pointer"
                        onClick={() => setPedidoSelecionadoId(ped.id)}
                      >
                        <td className="py-3 px-4 font-serif font-bold text-[#0C1014]">
                          {ped.codigo}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#0C1014]">{cliente?.nome || '—'}</p>
                          <p className="text-[11px] text-[#6B4B36]">{cliente?.telefone}</p>
                        </td>
                        <td className="py-3 px-4 text-[#6B4B36]">
                          {formatDataBR(ped.dataCriacao)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-serif font-bold text-[#0C1014]">
                            {formatBRL(ped.valorTotal)}
                          </p>
                          {saldo > 0.01 && (
                            <p className="text-[10px] text-[#D9A441]">Resta: {formatBRL(saldo)}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] font-semibold border-none ${
                              ped.statusPagamento === 'pago'
                                ? 'bg-[#4C8A5A]/15 text-[#4C8A5A]'
                                : ped.statusPagamento === 'parcial'
                                  ? 'bg-[#D9A441]/15 text-[#D9A441]'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {ped.statusPagamento}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: infoEtapa(state, ped.status).bg,
                              color: infoEtapa(state, ped.status).cor,
                              borderColor: `${infoEtapa(state, ped.status).cor}55`,
                            }}
                            className="text-[10px] font-semibold border"
                          >
                            {infoEtapa(state, ped.status).nome}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#6B4B36]">
                          {formatDataBR(ped.prazoEntrega)}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {saldo > 0.01 && ped.status !== 'cancelado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPedidoParaPagamento(ped)}
                                className="h-7 text-[11px] border-[#DFC3AE] text-[#4C8A5A] hover:bg-emerald-50 px-2"
                              >
                                Pagar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPedidoParaEditar(ped)
                                setModalFormAberto(true)
                              }}
                              className="h-7 text-[11px] text-[#6B4B36] hover:text-[#0C1014] px-2"
                            >
                              Editar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GAVETA DE DETALHE DO PEDIDO */}
      <DetalhePedidoDrawer
        pedidoId={pedidoSelecionadoId}
        aberto={Boolean(pedidoSelecionadoId)}
        onFechar={() => setPedidoSelecionadoId(null)}
        onEditar={(ped) => {
          setPedidoSelecionadoId(null)
          setPedidoParaEditar(ped)
          setModalFormAberto(true)
        }}
      />

      {/* FORMULÁRIO DE NOVO / EDITAR PEDIDO */}
      <FormPedidoModal
        aberto={modalFormAberto}
        onFechar={() => {
          setModalFormAberto(false)
          setPedidoParaEditar(null)
        }}
        pedidoParaEditar={pedidoParaEditar}
      />

      {/* MODAL DE PAGAMENTO RÁPIDO DA TABELA */}
      <ModalPagamento
        pedido={pedidoParaPagamento}
        aberto={Boolean(pedidoParaPagamento)}
        onFechar={() => setPedidoParaPagamento(null)}
      />

      <DialogEtapa
        aberto={dialogEtapaAberto}
        etapa={etapaEmEdicao}
        onFechar={() => setDialogEtapaAberto(false)}
      />
      <DialogExcluirEtapa etapa={etapaParaExcluir} onFechar={() => setEtapaParaExcluir(null)} />
    </div>
  )
}
