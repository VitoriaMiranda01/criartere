import { hojeISO } from '@/lib/datas'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import React, { useEffect, useState } from 'react'
import { novoId } from '@/lib/supabase'
import { Orcamento, OrcamentoItem, OrcamentoStatus } from '@/types/criartere'
import { useCriartere } from '@/store/CriartereContext'
import { formatBRL } from '@/store/periodUtils'
import { NOMES_STATUS_ORCAMENTO } from '@/utils/orcamentoPdf'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  aberto: boolean
  onFechar: () => void
  orcamentoParaEditar?: Orcamento | null
}

const FORMAS_RAPIDAS = ['Pix', 'Cartão', 'Dinheiro', 'Transferência']
const DISPONIBILIDADES = ['Pronta entrega', 'Sob encomenda', 'Sob encomenda (7 dias úteis)']
const AVULSO = '__avulso__'

const itemVazio = (): OrcamentoItem => ({
  id: novoId(),
  nome: '',
  quantidade: 1,
  valorUnitario: 0,
  subtotal: 0,
})

const lbl = 'text-xs font-bold text-[#6B4B36] uppercase tracking-wider'
const inp = 'h-9 text-xs border-[#DFC3AE]'

export const FormOrcamentoModal: React.FC<Props> = ({ aberto, onFechar, orcamentoParaEditar }) => {
  const { state, dispatch } = useCriartere()
  const o = orcamentoParaEditar

  const [clienteId, setClienteId] = useState(AVULSO)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [data, setData] = useState(hojeISO())
  const [disponibilidade, setDisponibilidade] = useState('Pronta entrega')
  const [formas, setFormas] = useState<string[]>(['Pix', 'Cartão', 'Dinheiro'])
  const [tipoPagamento, setTipoPagamento] = useState<'integral' | 'sinal'>('integral')
  const [percentualSinalStr, setPercentualSinalStr] = useState('50')
  const [itens, setItens] = useState<OrcamentoItem[]>([itemVazio()])
  const [freteStr, setFreteStr] = useState('0')
  const [descontoStr, setDescontoStr] = useState('0')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState<OrcamentoStatus>('aguardando')
  const [erro, setErro] = useState('')

  // Preenche o formulário ao abrir
  useEffect(() => {
    if (!aberto) return
    setErro('')
    setClienteId(o?.clienteId || AVULSO)
    setClienteNome(o?.clienteNome || '')
    setClienteTelefone(o?.clienteTelefone || '')
    setData(o?.data || hojeISO())
    setDisponibilidade(o?.disponibilidade || 'Pronta entrega')
    setFormas(
      o
        ? o.formasPagamento
            .split('•')
            .map((f) => f.trim())
            .filter(Boolean)
        : ['Pix', 'Cartão', 'Dinheiro'],
    )
    setTipoPagamento(o?.tipoPagamento || 'integral')
    setPercentualSinalStr(String(o?.percentualSinal ?? 50))
    setItens(o?.itens.length ? o.itens.map((i) => ({ ...i })) : [itemVazio()])
    setFreteStr(String(o?.valorFrete ?? 0))
    setDescontoStr(String(o?.valorDesconto ?? 0))
    setObservacoes(o?.observacoes ?? '')
    setStatus(o?.status || 'aguardando')
  }, [aberto, o])

  const frete = Math.max(0, parseFloat(freteStr.replace(',', '.')) || 0)
  const desconto = Math.max(0, parseFloat(descontoStr.replace(',', '.')) || 0)
  const percentualSinal = Math.min(99, Math.max(1, parseFloat(percentualSinalStr) || 50))
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  const total = Math.max(0, subtotal + frete - desconto)
  const produtosAtivos = state.produtos.filter((p) => p.ativo)

  const atualizarItem = (idx: number, mudancas: Partial<OrcamentoItem>) => {
    setItens((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const novo = { ...it, ...mudancas }
        novo.subtotal = Math.round(novo.quantidade * novo.valorUnitario * 100) / 100
        return novo
      }),
    )
  }

  const escolherCliente = (id: string) => {
    setClienteId(id)
    if (id === AVULSO) return
    const c = state.clientes.find((x) => x.id === id)
    if (c) {
      setClienteNome(c.nome)
      setClienteTelefone(c.whatsapp || c.telefone)
    }
  }

  const alternarForma = (f: string) =>
    setFormas((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!clienteNome.trim()) {
      setErro('Informe o nome do cliente.')
      return
    }
    if (!data) {
      setErro('Informe a data do orçamento.')
      return
    }
    const itensValidos = itens.filter((i) => i.nome.trim())
    if (itensValidos.length === 0 || itensValidos.some((i) => i.valorUnitario <= 0)) {
      setErro('Adicione ao menos um item com nome e valor unitário maior que zero.')
      return
    }

    const orcamento: Orcamento = {
      id: o?.id || novoId(),
      numero: o?.numero || '',
      data,
      clienteId: clienteId === AVULSO ? undefined : clienteId,
      clienteNome: clienteNome.trim(),
      clienteTelefone: clienteTelefone.trim(),
      disponibilidade: disponibilidade.trim(),
      formasPagamento: formas.join(' • '),
      tipoPagamento,
      percentualSinal,
      itens: itensValidos,
      valorProdutos: itensValidos.reduce((s, i) => s + i.subtotal, 0),
      valorFrete: frete,
      valorDesconto: desconto,
      valorTotal: total,
      observacoes: observacoes.trim(),
      status,
      pedidoId: o?.pedidoId,
    }
    dispatch({ type: 'SALVAR_ORCAMENTO', payload: orcamento })
    toast.success(o ? `Orçamento Nº ${o.numero} atualizado!` : 'Orçamento criado!')
    onFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-2xl bg-white border-[#DFC3AE] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
            {o ? `Editar Orçamento Nº ${o.numero}` : 'Novo Orçamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSalvar} className="space-y-6 pt-2">
          {/* CLIENTE */}
          <div className="space-y-2">
            <Label className={lbl}>
              Cliente
              <Obrigatorio />
            </Label>
            <Select value={clienteId} onValueChange={escolherCliente}>
              <SelectTrigger className="h-10 text-xs border-[#DFC3AE] bg-[#F7F3EA]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AVULSO} className="text-xs italic text-[#6B4B36]">
                  Cliente ainda não cadastrado (digitar nome)
                </SelectItem>
                {state.clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.nome}
                    {c.telefone ? ` • ${c.telefone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Nome que aparece no orçamento *"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                className={inp}
              />
              <Input
                placeholder="Telefone / WhatsApp (opcional)"
                value={clienteTelefone}
                onChange={(e) => setClienteTelefone(e.target.value)}
                className={inp}
              />
            </div>
            {clienteId === AVULSO && (
              <p className="text-[11px] text-[#6B4B36]/80">
                Se o orçamento for aprovado, o cliente é cadastrado automaticamente ao virar pedido.
              </p>
            )}
          </div>

          {/* DADOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className={lbl}>
                Data
                <Obrigatorio />
              </Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inp}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={lbl}>
                Disponibilidade
                <Opcional />
              </Label>
              <Input
                list="disponibilidades-orcamento"
                value={disponibilidade}
                onChange={(e) => setDisponibilidade(e.target.value)}
                placeholder="Ex: Pronta entrega"
                className={inp}
              />
              <datalist id="disponibilidades-orcamento">
                {DISPONIBILIDADES.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          {/* ITENS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={lbl}>
                Itens do orçamento
                <Obrigatorio />
              </Label>
              <button
                type="button"
                onClick={() => setItens((p) => [...p, itemVazio()])}
                className="text-xs text-[#C48864] hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar item
              </button>
            </div>
            {itens.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#F7F3EA]/50 border border-[#DFC3AE]/70 grid grid-cols-12 gap-2 items-end"
              >
                <div className="col-span-12 sm:col-span-6 space-y-1">
                  <Select
                    value={item.produtoId || ''}
                    onValueChange={(v) => {
                      const p = produtosAtivos.find((x) => x.id === v)
                      if (p)
                        atualizarItem(idx, {
                          produtoId: p.id,
                          nome: p.nome,
                          valorUnitario: p.precoVenda,
                        })
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs border-[#DFC3AE] bg-white">
                      <SelectValue placeholder="Escolher do catálogo (opcional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produtosAtivos.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-[#6B4B36]">
                          Nenhum produto cadastrado
                        </div>
                      )}
                      {produtosAtivos.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.nome} — {formatBRL(p.precoVenda)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Descrição do item"
                    value={item.nome}
                    onChange={(e) => atualizarItem(idx, { nome: e.target.value })}
                    className="h-8 text-xs border-[#DFC3AE] bg-white"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#6B4B36]">
                    Qtd
                    <Obrigatorio />
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantidade}
                    onChange={(e) =>
                      atualizarItem(idx, {
                        quantidade: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    className="h-8 text-xs border-[#DFC3AE] bg-white"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#6B4B36]">
                    Unit. (R$)
                    <Obrigatorio />
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.valorUnitario}
                    onChange={(e) =>
                      atualizarItem(idx, { valorUnitario: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 text-xs border-[#DFC3AE] bg-white"
                  />
                </div>
                <div className="col-span-5 sm:col-span-2 flex items-center justify-end gap-1 pb-0.5">
                  <span className="font-bold text-[#0C1014] text-xs">
                    {formatBRL(item.subtotal)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={itens.length === 1}
                    onClick={() => setItens((p) => p.filter((_, i) => i !== idx))}
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* VALORES E PAGAMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={lbl}>
                    Frete (R$)
                    <Opcional />
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={freteStr}
                    onChange={(e) => setFreteStr(e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={lbl}>
                    Desconto (R$)
                    <Opcional />
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={descontoStr}
                    onChange={(e) => setDescontoStr(e.target.value)}
                    className={inp}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>
                  Formas de pagamento aceitas
                  <Opcional />
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {[...FORMAS_RAPIDAS, ...formas.filter((f) => !FORMAS_RAPIDAS.includes(f))].map(
                    (f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => alternarForma(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          formas.includes(f)
                            ? 'bg-[#C48864] border-[#C48864] text-white'
                            : 'bg-white border-[#DFC3AE] text-[#6B4B36] hover:bg-[#F7F3EA]'
                        }`}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className={lbl}>
                  Condição de pagamento
                  <Obrigatorio />
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['integral', 'Integral (sem sinal)'],
                      ['sinal', 'Com sinal'],
                    ] as const
                  ).map(([v, t]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTipoPagamento(v)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        tipoPagamento === v
                          ? 'bg-[#C48864] border-[#C48864] text-white'
                          : 'bg-white border-[#DFC3AE] text-[#6B4B36] hover:bg-[#F7F3EA]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {tipoPagamento === 'sinal' && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-[#6B4B36] whitespace-nowrap">
                    Sinal de
                    <Obrigatorio />
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={percentualSinalStr}
                    onChange={(e) => setPercentualSinalStr(e.target.value)}
                    className="h-8 w-20 text-xs border-[#DFC3AE]"
                  />
                  <span className="text-xs text-[#6B4B36]">
                    % = {formatBRL(Math.round(total * percentualSinal) / 100)}
                  </span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-[#F7F3EA] border border-[#DFC3AE] text-xs space-y-1">
                <div className="flex justify-between text-[#6B4B36]">
                  <span>Subtotal</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                {frete > 0 && (
                  <div className="flex justify-between text-[#6B4B36]">
                    <span>Frete</span>
                    <span>{formatBRL(frete)}</span>
                  </div>
                )}
                {desconto > 0 && (
                  <div className="flex justify-between text-[#6B4B36]">
                    <span>Desconto</span>
                    <span>- {formatBRL(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#0C1014] pt-1 border-t border-[#DFC3AE]/60">
                  <span>Total</span>
                  <span>{formatBRL(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES E STATUS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={lbl}>
                Observações
                <Opcional />
              </Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder={
                  'Uma observação por linha. Ex:\nProduto disponível para pronta entrega.'
                }
                className="min-h-[80px] text-xs border-[#DFC3AE]"
              />
              <p className="text-[11px] text-[#6B4B36]/80">
                {state.config.chavePix
                  ? `A chave Pix (${state.config.chavePix}) entra automaticamente no PDF.`
                  : 'Cadastre a chave Pix em Configurações para ela sair no PDF.'}
              </p>
            </div>
            {o && (
              <div className="space-y-1.5">
                <Label className={lbl}>
                  Status
                  <Obrigatorio />
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OrcamentoStatus)}>
                  <SelectTrigger className={inp}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NOMES_STATUS_ORCAMENTO) as OrcamentoStatus[])
                      .filter((s) => s !== 'aprovado' || o.pedidoId)
                      .map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {NOMES_STATUS_ORCAMENTO[s]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {erro && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {erro}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onFechar}
              className="border-[#DFC3AE] text-[#6B4B36] text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#C48864] hover:bg-[#B0764F] text-white text-xs font-semibold"
            >
              {o ? 'Salvar alterações' : 'Criar orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
