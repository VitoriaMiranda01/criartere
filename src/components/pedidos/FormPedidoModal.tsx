import { novoId } from '@/lib/supabase'
import React, { useState } from 'react'
import { Pedido, PedidoItem, PaymentMethod, OrderStatus } from '@/types/criartere'
import { useCriartere } from '@/store/CriartereContext'
import { formatBRL } from '@/store/periodUtils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, UserPlus, Check } from 'lucide-react'
import { toast } from 'sonner'

interface FormPedidoModalProps {
  aberto: boolean
  onFechar: () => void
  pedidoParaEditar?: Pedido | null
}

export const FormPedidoModal: React.FC<FormPedidoModalProps> = ({
  aberto,
  onFechar,
  pedidoParaEditar,
}) => {
  const { state, dispatch } = useCriartere()

  // Campos do formulário
  const [clienteId, setClienteId] = useState(pedidoParaEditar?.clienteId || '')
  const [itens, setItens] = useState<PedidoItem[]>(
    pedidoParaEditar?.itens || [
      { id: 'item-1', nome: '', quantidade: 1, valorUnitario: 0, subtotal: 0 },
    ],
  )
  const [valorFreteStr, setValorFreteStr] = useState(
    pedidoParaEditar ? pedidoParaEditar.valorFrete.toString() : '0',
  )
  const [valorDescontoStr, setValorDescontoStr] = useState(
    pedidoParaEditar ? pedidoParaEditar.valorDesconto.toString() : '0',
  )
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>(
    pedidoParaEditar?.formaPagamento || 'Pix',
  )
  const [status, setStatus] = useState<OrderStatus>(pedidoParaEditar?.status || 'novo')
  const [prazoEntrega, setPrazoEntrega] = useState(
    pedidoParaEditar?.prazoEntrega ||
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  )
  const [observacoes, setObservacoes] = useState(pedidoParaEditar?.observacoes || '')
  const [erro, setErro] = useState('')

  // Mini-form para cadastrar cliente inline
  const [cadastrandoClienteInline, setCadastrandoClienteInline] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const [novoClienteEmail, setNovoClienteEmail] = useState('')
  const [novoClienteEndereco, setNovoClienteEndereco] = useState('')

  // Ao abrir para edição, preenche estado
  React.useEffect(() => {
    if (pedidoParaEditar) {
      setClienteId(pedidoParaEditar.clienteId)
      setItens(pedidoParaEditar.itens)
      setValorFreteStr(pedidoParaEditar.valorFrete.toString())
      setValorDescontoStr(pedidoParaEditar.valorDesconto.toString())
      setFormaPagamento(pedidoParaEditar.formaPagamento)
      setStatus(pedidoParaEditar.status)
      setPrazoEntrega(pedidoParaEditar.prazoEntrega)
      setObservacoes(pedidoParaEditar.observacoes || '')
    } else {
      setClienteId('')
      setItens([
        { id: `item-${Date.now()}`, nome: '', quantidade: 1, valorUnitario: 0, subtotal: 0 },
      ])
      setValorFreteStr('0')
      setValorDescontoStr('0')
      setFormaPagamento('Pix')
      setStatus('novo')
      setPrazoEntrega(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
      setObservacoes('')
    }
    setCadastrandoClienteInline(false)
    setErro('')
  }, [pedidoParaEditar, aberto])

  // Itens: manipulação
  const handleAddItem = () => {
    setItens([
      ...itens,
      { id: `item-${Date.now()}`, nome: '', quantidade: 1, valorUnitario: 0, subtotal: 0 },
    ])
  }

  const handleRemoverItem = (id: string) => {
    if (itens.length <= 1) {
      toast.error('O pedido precisa ter pelo menos 1 item.')
      return
    }
    setItens(itens.filter((it) => it.id !== id))
  }

  const handleSelecionarProduto = (index: number, produtoId: string) => {
    const prod = state.produtos.find((p) => p.id === produtoId)
    if (!prod) return

    const novos = [...itens]
    novos[index] = {
      ...novos[index],
      produtoId: prod.id,
      nome: prod.nome,
      valorUnitario: prod.precoVenda,
      subtotal: prod.precoVenda * novos[index].quantidade,
    }
    setItens(novos)
  }

  const handleChangeItemQuantidade = (index: number, qtd: number) => {
    const novos = [...itens]
    const quantidade = Math.max(1, qtd)
    novos[index] = {
      ...novos[index],
      quantidade,
      subtotal: quantidade * novos[index].valorUnitario,
    }
    setItens(novos)
  }

  const handleChangeItemValorUnitario = (index: number, valor: number) => {
    const novos = [...itens]
    const valorUnitario = Math.max(0, valor)
    novos[index] = {
      ...novos[index],
      valorUnitario,
      subtotal: novos[index].quantidade * valorUnitario,
    }
    setItens(novos)
  }

  const handleChangeItemNome = (index: number, nome: string) => {
    const novos = [...itens]
    novos[index] = { ...novos[index], nome }
    setItens(novos)
  }

  // Cálculos financeiros
  const subtotalProdutos = itens.reduce((s, it) => s + (it.subtotal || 0), 0)
  const frete = parseFloat(valorFreteStr) || 0
  const desconto = parseFloat(valorDescontoStr) || 0
  const valorTotalFinal = Math.max(0, subtotalProdutos + frete - desconto)

  // Salvar cliente inline
  const handleCriarClienteInline = () => {
    if (!novoClienteNome.trim() || !novoClienteTelefone.trim()) {
      toast.error('Preencha ao menos o nome e telefone do cliente.')
      return
    }

    const novoClienteId = novoId()
    const novoCliente = {
      id: novoClienteId,
      nome: novoClienteNome.trim(),
      telefone: novoClienteTelefone.trim(),
      whatsapp: novoClienteTelefone.trim(),
      email: novoClienteEmail.trim() || 'contato@cliente.com',
      endereco: novoClienteEndereco.trim() || 'A definir',
      cidadeUf: 'São Paulo - SP',
      criadoEm: new Date().toISOString().slice(0, 10),
    }

    dispatch({ type: 'SALVAR_CLIENTE', payload: novoCliente })
    setClienteId(novoClienteId)
    setCadastrandoClienteInline(false)
    toast.success(`Cliente ${novoCliente.nome} cadastrado com sucesso!`)
  }

  const handleSalvarPedido = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!clienteId) {
      setErro('Selecione ou cadastre um cliente para o pedido.')
      return
    }

    const itemInvalido = itens.some((it) => !it.nome.trim() || it.valorUnitario <= 0)
    if (itemInvalido) {
      setErro('Todos os itens precisam de nome e valor unitário válido maior que zero.')
      return
    }

    if (valorTotalFinal <= 0) {
      setErro('O valor total do pedido deve ser maior que zero.')
      return
    }

    if (pedidoParaEditar) {
      // Edição
      const atualizado: Pedido = {
        ...pedidoParaEditar,
        clienteId,
        itens,
        valorProdutos: subtotalProdutos,
        valorFrete: frete,
        valorDesconto: desconto,
        valorTotal: valorTotalFinal,
        status,
        formaPagamento,
        prazoEntrega,
        observacoes: observacoes.trim() || undefined,
      }
      dispatch({ type: 'ATUALIZAR_PEDIDO', payload: atualizado })
      toast.success(`Pedido ${pedidoParaEditar.codigo} atualizado com sucesso!`)
    } else {
      // Novo pedido
      dispatch({
        type: 'CRIAR_PEDIDO',
        payload: {
          clienteId,
          itens,
          valorProdutos: subtotalProdutos,
          valorFrete: frete,
          valorDesconto: desconto,
          valorTotal: valorTotalFinal,
          status,
          statusPagamento: 'pendente',
          formaPagamento,
          prazoEntrega,
          observacoes: observacoes.trim() || undefined,
        },
      })
      toast.success('Novo pedido criado com sucesso! Adicionado como receita prevista.')
    }

    onFechar()
  }

  // Produtos ativos para o seletor (inativos são excluídos da lista)
  const produtosAtivos = state.produtos.filter((p) => p.ativo)

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-2xl bg-white border-[#DFC3AE] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
            {pedidoParaEditar ? `Editar Pedido ${pedidoParaEditar.codigo}` : 'Novo Pedido de Venda'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSalvarPedido} className="space-y-6 pt-2">
          {/* SEÇÃO 1: CLIENTE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#6B4B36] uppercase tracking-wider">
                Cliente *
              </Label>
              {!cadastrandoClienteInline ? (
                <button
                  type="button"
                  onClick={() => setCadastrandoClienteInline(true)}
                  className="text-xs text-[#C48864] hover:underline flex items-center gap-1 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />+ Cadastrar Novo Cliente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCadastrandoClienteInline(false)}
                  className="text-xs text-[#6B4B36] hover:underline"
                >
                  Voltar para seleção
                </button>
              )}
            </div>

            {!cadastrandoClienteInline ? (
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-10 text-xs border-[#DFC3AE] bg-[#F7F3EA]/30">
                  <SelectValue placeholder="Selecione um cliente cadastrado..." />
                </SelectTrigger>
                <SelectContent>
                  {state.clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome} &bull; {c.telefone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-4 rounded-xl bg-[#F7F3EA]/60 border border-[#DFC3AE] space-y-3">
                <p className="text-xs font-bold text-[#0C1014]">Novo Cliente Rápido</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nome completo *"
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    className="h-9 text-xs border-[#DFC3AE]"
                  />
                  <Input
                    placeholder="Telefone / WhatsApp *"
                    value={novoClienteTelefone}
                    onChange={(e) => setNovoClienteTelefone(e.target.value)}
                    className="h-9 text-xs border-[#DFC3AE]"
                  />
                  <Input
                    placeholder="E-mail (opcional)"
                    value={novoClienteEmail}
                    onChange={(e) => setNovoClienteEmail(e.target.value)}
                    className="h-9 text-xs border-[#DFC3AE]"
                  />
                  <Input
                    placeholder="Endereço de entrega"
                    value={novoClienteEndereco}
                    onChange={(e) => setNovoClienteEndereco(e.target.value)}
                    className="h-9 text-xs border-[#DFC3AE]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCadastrandoClienteInline(false)}
                    className="text-xs h-8 border-[#DFC3AE]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCriarClienteInline}
                    className="text-xs h-8 bg-[#C48864] hover:bg-[#B0764F] text-white font-semibold"
                  >
                    Salvar e Selecionar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: ITENS DO PEDIDO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#6B4B36] uppercase tracking-wider">
                Itens do Pedido *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs border-[#DFC3AE] text-[#C48864] hover:bg-[#F7F3EA]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-2">
              {itens.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#F7F3EA]/40 rounded-xl border border-[#DFC3AE]/50 space-y-2 text-xs"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Seletor de produto ou texto livre */}
                    <div className="col-span-12 sm:col-span-6 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-[#6B4B36]">
                          Produto do Catálogo
                        </span>
                      </div>
                      <Select
                        value={item.produtoId || 'custom'}
                        onValueChange={(val) => {
                          if (val === 'custom') {
                            const novos = [...itens]
                            novos[index] = { ...novos[index], produtoId: undefined }
                            setItens(novos)
                          } else {
                            handleSelecionarProduto(index, val)
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs border-[#DFC3AE] bg-white">
                          <SelectValue placeholder="Escolha um produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom" className="text-xs italic text-[#6B4B36]">
                            &bull; Item personalizado / sob medida
                          </SelectItem>
                          {produtosAtivos.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.nome} — {formatBRL(p.precoVenda)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Nome do item no pedido"
                        value={item.nome}
                        onChange={(e) => handleChangeItemNome(index, e.target.value)}
                        className="h-8 text-xs border-[#DFC3AE] bg-white mt-1"
                      />
                    </div>

                    {/* Quantidade */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#6B4B36]">
                        Qtd
                      </span>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) =>
                          handleChangeItemQuantidade(index, parseInt(e.target.value, 10) || 1)
                        }
                        className="h-8 text-xs border-[#DFC3AE] bg-white"
                      />
                    </div>

                    {/* Valor Unitário */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#6B4B36]">
                        Unit. (R$)
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.valorUnitario}
                        onChange={(e) =>
                          handleChangeItemValorUnitario(index, parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs border-[#DFC3AE] bg-white"
                      />
                    </div>

                    {/* Subtotal e Remover */}
                    <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2 pt-3">
                      <span className="font-bold text-[#0C1014] text-xs">
                        {formatBRL(item.subtotal)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverItem(item.id)}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEÇÃO 3: VALORES (Frete, Desconto, Total Calculado) */}
          <div className="bg-[#F7F3EA] p-4 rounded-xl border border-[#DFC3AE]/70 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-[#6B4B36]">
                  Subtotal Produtos
                </Label>
                <p className="font-serif font-bold text-sm text-[#0C1014] mt-1">
                  {formatBRL(subtotalProdutos)}
                </p>
              </div>

              <div>
                <Label htmlFor="frete" className="text-[11px] font-semibold text-[#6B4B36]">
                  Frete de Envio (R$)
                </Label>
                <Input
                  id="frete"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorFreteStr}
                  onChange={(e) => setValorFreteStr(e.target.value)}
                  className="h-8 text-xs border-[#DFC3AE] bg-white mt-1"
                />
              </div>

              <div>
                <Label htmlFor="desconto" className="text-[11px] font-semibold text-[#6B4B36]">
                  Desconto (R$)
                </Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDescontoStr}
                  onChange={(e) => setValorDescontoStr(e.target.value)}
                  className="h-8 text-xs border-[#DFC3AE] bg-white mt-1"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#DFC3AE]/50 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-[#6B4B36] tracking-wider">
                  Valor Total do Pedido
                </span>
                <p className="text-[10px] text-[#6B4B36]/80">
                  Cadastrado como receita prevista até o recebimento
                </p>
              </div>
              <span className="font-serif text-2xl font-bold text-[#C48864]">
                {formatBRL(valorTotalFinal)}
              </span>
            </div>
          </div>

          {/* SEÇÃO 4: PAGAMENTO, STATUS E PRAZO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                Forma de Pagamento
              </Label>
              <Select value={formaPagamento} onValueChange={(val: any) => setFormaPagamento(val)}>
                <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.formasPagamento.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                Status Operacional
              </Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo" className="text-xs">
                    Novo pedido
                  </SelectItem>
                  <SelectItem value="aguardando_pagamento" className="text-xs">
                    Aguardando pagamento
                  </SelectItem>
                  <SelectItem value="em_preparacao" className="text-xs">
                    Em preparação
                  </SelectItem>
                  <SelectItem value="em_producao" className="text-xs">
                    Em produção
                  </SelectItem>
                  <SelectItem value="pronto_envio" className="text-xs">
                    Pronto para envio
                  </SelectItem>
                  <SelectItem value="enviado" className="text-xs">
                    Enviado
                  </SelectItem>
                  <SelectItem value="entregue" className="text-xs">
                    Entregue
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="prazo"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Prazo de Entrega
              </Label>
              <Input
                id="prazo"
                type="date"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                className="h-9 text-xs border-[#DFC3AE]"
                required
              />
            </div>
          </div>

          {/* SEÇÃO 5: OBSERVAÇÕES */}
          <div className="space-y-1.5">
            <Label
              htmlFor="obs"
              className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
            >
              Observações Internas (opcional)
            </Label>
            <Textarea
              id="obs"
              placeholder="Ex: Embalagem para presente, retirar no ateliê, gravar iniciais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="text-xs border-[#DFC3AE] min-h-[70px]"
            />
          </div>

          {erro && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {erro}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onFechar}
              className="border-[#DFC3AE] text-[#6B4B36] h-10 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#C48864] hover:bg-[#B0764F] text-white h-10 text-xs font-semibold shadow-xs"
            >
              {pedidoParaEditar ? 'Salvar Alterações' : 'Cadastrar Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
