import React, { useState } from 'react'
import { Pedido } from '@/types/criartere'
import { useCriartere } from '@/store/CriartereContext'
import {
  selectTotalPagoDoPedido,
  selectPagamentosDoPedido,
  selectHistoricoDoPedido,
  selectClientePorId,
} from '@/store/selectors'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditCard,
  Ban,
  Edit,
  Clock,
  User,
  Package,
  Calendar,
  History,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { ModalPagamento } from './ModalPagamento'
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

interface DetalhePedidoDrawerProps {
  pedidoId: string | null
  aberto: boolean
  onFechar: () => void
  onEditar: (pedido: Pedido) => void
}

export const DetalhePedidoDrawer: React.FC<DetalhePedidoDrawerProps> = ({
  pedidoId,
  aberto,
  onFechar,
  onEditar,
}) => {
  const { state, dispatch } = useCriartere()

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false)
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  if (!pedidoId) return null

  const pedido = state.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) return null

  const cliente = selectClientePorId(state, pedido.clienteId)
  const pagamentos = selectPagamentosDoPedido(state, pedido.id)
  const historico = selectHistoricoDoPedido(state, pedido.id)
  const totalPago = selectTotalPagoDoPedido(state, pedido.id)
  const saldoRestante = Math.max(0, pedido.valorTotal - totalPago)

  const statusMap: Record<string, { label: string; cor: string; bg: string }> = {
    novo: { label: 'Novo pedido', cor: '#C48864', bg: '#FDF7F3' },
    aguardando_pagamento: { label: 'Aguardando pagamento', cor: '#D9A441', bg: '#FEF9EE' },
    em_preparacao: { label: 'Em preparação', cor: '#8A5A3B', bg: '#F7F1EC' },
    em_producao: { label: 'Em produção', cor: '#C48864', bg: '#FDF7F3' },
    pronto_envio: { label: 'Pronto p/ envio', cor: '#4C8A5A', bg: '#F0F7F2' },
    enviado: { label: 'Enviado', cor: '#5A7D8A', bg: '#F1F6F8' },
    entregue: { label: 'Entregue', cor: '#4C8A5A', bg: '#F0F7F2' },
    cancelado: { label: 'Cancelado', cor: '#B5533C', bg: '#FDF2F2' },
  }

  const statusInfo = statusMap[pedido.status] || {
    label: pedido.status,
    cor: '#6B4B36',
    bg: '#F7F3EA',
  }

  const handleConfirmarCancelamento = () => {
    dispatch({
      type: 'CANCELAR_PEDIDO',
      payload: {
        pedidoId: pedido.id,
        motivo: motivoCancelamento || 'Solicitado pelo cliente/loja',
      },
    })
    toast.error(`Pedido ${pedido.codigo} foi cancelado.`)
    setModalCancelarAberto(false)
  }

  return (
    <>
      <Sheet open={aberto} onOpenChange={(open) => !open && onFechar()}>
        <SheetContent className="w-full sm:max-w-xl bg-white p-0 flex flex-col border-l border-[#DFC3AE] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#DFC3AE]/50 bg-[#F7F3EA]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold text-[#0C1014]">
                  {pedido.codigo}
                </span>
                <Badge
                  style={{
                    backgroundColor: statusInfo.bg,
                    color: statusInfo.cor,
                    borderColor: statusInfo.cor,
                  }}
                  className="border text-xs font-semibold capitalize"
                >
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Status de Pagamento */}
              <Badge
                className={`text-xs font-semibold border-none ${
                  pedido.statusPagamento === 'pago'
                    ? 'bg-[#4C8A5A]/15 text-[#4C8A5A]'
                    : pedido.statusPagamento === 'parcial'
                      ? 'bg-[#D9A441]/15 text-[#D9A441]'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {pedido.statusPagamento === 'pago'
                  ? 'Totalmente Quitado'
                  : pedido.statusPagamento === 'parcial'
                    ? `Parcial (${formatBRL(totalPago)} de ${formatBRL(pedido.valorTotal)})`
                    : 'Aguardando Pagamento'}
              </Badge>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditar(pedido)}
                className="h-8 text-xs border-[#DFC3AE] text-[#6B4B36] hover:text-[#0C1014]"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                Editar Pedido
              </Button>

              {saldoRestante > 0.01 && pedido.status !== 'cancelado' && (
                <Button
                  size="sm"
                  onClick={() => setModalPagamentoAberto(true)}
                  className="h-8 text-xs bg-[#C48864] hover:bg-[#B0764F] text-white"
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  Registrar Pagamento
                </Button>
              )}

              {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setModalCancelarAberto(true)}
                  className="h-8 text-xs text-[#B5533C] hover:bg-red-50"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Cancelar Pedido
                </Button>
              )}
            </div>
          </div>

          {/* Conteúdo com Abas */}
          <Tabs defaultValue="resumo" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b border-[#DFC3AE]/40 bg-white">
              <TabsList className="bg-transparent h-11 p-0 gap-6">
                <TabsTrigger
                  value="resumo"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#C48864] data-[state=active]:text-[#C48864] rounded-none px-1 text-xs font-semibold"
                >
                  Resumo Geral
                </TabsTrigger>
                <TabsTrigger
                  value="pagamentos"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#C48864] data-[state=active]:text-[#C48864] rounded-none px-1 text-xs font-semibold flex items-center gap-1.5"
                >
                  Pagamentos
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-[#DFC3AE]/50">
                    {pagamentos.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#C48864] data-[state=active]:text-[#C48864] rounded-none px-1 text-xs font-semibold flex items-center gap-1.5"
                >
                  Histórico de Alterações
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-[#DFC3AE]/50">
                    {historico.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ABA 1: RESUMO */}
              <TabsContent value="resumo" className="space-y-6 m-0">
                {/* Bloco Cliente */}
                <div className="bg-[#F7F3EA]/60 p-4 rounded-xl border border-[#DFC3AE]/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6B4B36]">
                    <User className="w-3.5 h-3.5 text-[#C48864]" />
                    <span>Dados do Cliente</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-[#0C1014]">
                      {cliente?.nome || 'Cliente não identificado'}
                    </p>
                    <p className="text-xs text-[#6B4B36]">
                      {cliente?.telefone} &bull; {cliente?.email}
                    </p>
                    <p className="text-xs text-[#6B4B36] mt-1">
                      {cliente?.endereco} - {cliente?.cidadeUf}
                    </p>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6B4B36]">
                    <Package className="w-3.5 h-3.5 text-[#C48864]" />
                    <span>Itens do Pedido ({pedido.itens.length})</span>
                  </div>
                  <div className="border border-[#DFC3AE]/60 rounded-xl overflow-hidden divide-y divide-[#DFC3AE]/40">
                    {pedido.itens.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between text-xs bg-white"
                      >
                        <div>
                          <p className="font-semibold text-[#0C1014]">{item.nome}</p>
                          <p className="text-[11px] text-[#6B4B36]">
                            {item.quantidade}x {formatBRL(item.valorUnitario)}
                          </p>
                        </div>
                        <span className="font-bold text-[#0C1014]">{formatBRL(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais do Pedido */}
                <div className="bg-white p-4 rounded-xl border border-[#DFC3AE]/60 space-y-2 text-xs">
                  <div className="flex justify-between text-[#6B4B36]">
                    <span>Subtotal de produtos:</span>
                    <span>{formatBRL(pedido.valorProdutos)}</span>
                  </div>
                  {pedido.valorFrete > 0 && (
                    <div className="flex justify-between text-[#6B4B36]">
                      <span>Frete de envio:</span>
                      <span>+ {formatBRL(pedido.valorFrete)}</span>
                    </div>
                  )}
                  {pedido.valorDesconto > 0 && (
                    <div className="flex justify-between text-[#4C8A5A]">
                      <span>Desconto aplicado:</span>
                      <span>- {formatBRL(pedido.valorDesconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[#DFC3AE]/50 text-sm font-bold text-[#0C1014]">
                    <span>Valor Final:</span>
                    <span className="font-serif text-base text-[#C48864]">
                      {formatBRL(pedido.valorTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#6B4B36] pt-1">
                    <span>Saldo restante a pagar:</span>
                    <span className="font-bold text-[#D9A441]">{formatBRL(saldoRestante)}</span>
                  </div>
                </div>

                {/* Prazos e Observações */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-[#F7F3EA]/40 rounded-lg border border-[#DFC3AE]/40">
                    <span className="text-[#6B4B36] font-medium block mb-1">Data do Pedido:</span>
                    <span className="font-bold text-[#0C1014]">
                      {formatDataBR(pedido.dataCriacao)}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F7F3EA]/40 rounded-lg border border-[#DFC3AE]/40">
                    <span className="text-[#6B4B36] font-medium block mb-1">Prazo de Entrega:</span>
                    <span className="font-bold text-[#0C1014]">
                      {formatDataBR(pedido.prazoEntrega)}
                    </span>
                  </div>
                </div>

                {pedido.observacoes && (
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                    <span className="font-bold text-[#6B4B36] block mb-1">
                      Observações Internas:
                    </span>
                    <p className="text-[#0C1014]">{pedido.observacoes}</p>
                  </div>
                )}
              </TabsContent>

              {/* ABA 2: PAGAMENTOS */}
              <TabsContent value="pagamentos" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-[#0C1014]">
                      Histórico Financeiro
                    </h4>
                    <p className="text-xs text-[#6B4B36]">
                      {formatBRL(totalPago)} recebido de {formatBRL(pedido.valorTotal)}
                    </p>
                  </div>
                  {saldoRestante > 0.01 && (
                    <Button
                      size="sm"
                      onClick={() => setModalPagamentoAberto(true)}
                      className="h-8 text-xs bg-[#C48864] hover:bg-[#B0764F] text-white"
                    >
                      + Novo Pagamento
                    </Button>
                  )}
                </div>

                {pagamentos.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#6B4B36] border border-dashed border-[#DFC3AE] rounded-xl">
                    Nenhum pagamento registrado ainda para este pedido.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagamentos.map((pag) => (
                      <div
                        key={pag.id}
                        className="p-3 bg-white rounded-lg border border-[#DFC3AE]/50 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#4C8A5A] text-sm">{formatBRL(pag.valor)}</p>
                          <p className="text-[#6B4B36]">
                            {pag.formaPagamento} &bull; Em {formatDataBR(pag.data)}
                          </p>
                          {pag.observacoes && (
                            <p className="text-[11px] text-[#6B4B36]/80 italic">
                              &ldquo;{pag.observacoes}&rdquo;
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-[#4C8A5A] border-[#4C8A5A]"
                        >
                          Recebido
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ABA 3: HISTÓRICO */}
              <TabsContent value="historico" className="space-y-4 m-0">
                <h4 className="font-serif text-sm font-bold text-[#0C1014]">
                  Trilha de Auditoria do Pedido
                </h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DFC3AE]">
                  {historico.map((ev) => (
                    <div key={ev.id} className="relative text-xs">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#C48864] ring-4 ring-white" />
                      <p className="font-bold text-[#0C1014]">{ev.descricao}</p>
                      <p className="text-[11px] text-[#6B4B36]">{ev.dataHora}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Modal de Pagamento */}
      <ModalPagamento
        pedido={pedido}
        aberto={modalPagamentoAberto}
        onFechar={() => setModalPagamentoAberto(false)}
      />

      {/* Alerta de Confirmação de Cancelamento (Regra #6) */}
      <AlertDialog open={modalCancelarAberto} onOpenChange={setModalCancelarAberto}>
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#B5533C]" />
              Confirmar Cancelamento do Pedido?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36] space-y-2">
              <p>
                Ao cancelar o pedido <strong>{pedido.codigo}</strong>, o valor total previsto de{' '}
                <strong>{formatBRL(pedido.valorTotal)}</strong> será removido do faturamento da
                loja.
              </p>
              <p>Esta operação é registrada no histórico de alterações do pedido.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarCancelamento}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, Cancelar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
