import React, { useState } from 'react'
import { Pedido, PaymentMethod } from '@/types/criartere'
import { useCriartere } from '@/store/CriartereContext'
import { selectTotalPagoDoPedido } from '@/store/selectors'
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
import { toast } from 'sonner'

interface ModalPagamentoProps {
  pedido: Pedido | null
  aberto: boolean
  onFechar: () => void
}

export const ModalPagamento: React.FC<ModalPagamentoProps> = ({ pedido, aberto, onFechar }) => {
  const { state, dispatch } = useCriartere()

  const jaPago = pedido ? selectTotalPagoDoPedido(state, pedido.id) : 0
  const saldoRestante = pedido ? Math.max(0, pedido.valorTotal - jaPago) : 0

  const [valorStr, setValorStr] = useState(saldoRestante.toFixed(2))
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [forma, setForma] = useState<PaymentMethod>(pedido?.formaPagamento || 'Pix')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState('')

  // Ao abrir ou trocar saldo, preenche o valor restante sugerido
  React.useEffect(() => {
    if (pedido) {
      setValorStr(saldoRestante.toFixed(2))
      setForma(pedido.formaPagamento || 'Pix')
      setErro('')
    }
  }, [pedido, saldoRestante])

  if (!pedido) return null

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const valorNum = parseFloat(valorStr.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor de pagamento válido maior que zero.')
      return
    }

    // Regra #10: Impedir pagamento maior que o saldo restante
    if (valorNum > saldoRestante + 0.01) {
      setErro(
        `O valor informado (${formatBRL(valorNum)}) é maior que o saldo restante (${formatBRL(saldoRestante)}).`,
      )
      return
    }

    dispatch({
      type: 'REGISTRAR_PAGAMENTO',
      payload: {
        pedidoId: pedido.id,
        valor: valorNum,
        formaPagamento: forma,
        data,
        observacoes: obs.trim() || undefined,
      },
    })

    const quitou = valorNum >= saldoRestante - 0.01
    toast.success(
      quitou
        ? `Pagamento de ${formatBRL(valorNum)} registrado! Pedido ${pedido.codigo} foi quitado.`
        : `Pagamento parcial de ${formatBRL(valorNum)} registrado para o pedido ${pedido.codigo}.`,
    )

    onFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-md bg-white border-[#DFC3AE] p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
            Registrar Pagamento &bull; {pedido.codigo}
          </DialogTitle>
        </DialogHeader>

        {/* Resumo do Pedido */}
        <div className="bg-[#F7F3EA] p-3.5 rounded-xl border border-[#DFC3AE]/60 space-y-2 text-xs">
          <div className="flex justify-between text-[#6B4B36]">
            <span>Valor Total do Pedido:</span>
            <span className="font-bold text-[#0C1014]">{formatBRL(pedido.valorTotal)}</span>
          </div>
          <div className="flex justify-between text-[#6B4B36]">
            <span>Já Pago Anteriormente:</span>
            <span className="font-bold text-[#4C8A5A]">{formatBRL(jaPago)}</span>
          </div>
          <div className="flex justify-between text-[#6B4B36] pt-1.5 border-t border-[#DFC3AE]/50">
            <span className="font-bold text-[#0C1014]">Saldo Restante:</span>
            <span className="font-serif font-bold text-sm text-[#D9A441]">
              {formatBRL(saldoRestante)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="valor"
              className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
            >
              Valor a Receber (R$) *
            </Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              max={saldoRestante}
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              className="h-10 text-sm border-[#DFC3AE] focus-visible:ring-[#C48864]"
              required
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setValorStr(saldoRestante.toFixed(2))}
                className="text-[11px] text-[#C48864] hover:underline font-medium"
              >
                Quitar total ({formatBRL(saldoRestante)})
              </button>
              {saldoRestante > 10 && (
                <button
                  type="button"
                  onClick={() => setValorStr((saldoRestante / 2).toFixed(2))}
                  className="text-[11px] text-[#6B4B36] hover:underline"
                >
                  Metade (50%)
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="data"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Data do Recebimento *
              </Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="h-10 text-xs border-[#DFC3AE]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="forma"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Forma de Pagamento *
              </Label>
              <Select value={forma} onValueChange={(val: any) => setForma(val)}>
                <SelectTrigger className="h-10 text-xs border-[#DFC3AE]">
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
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="obs"
              className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
            >
              Observações (opcional)
            </Label>
            <Input
              id="obs"
              placeholder="Ex: Comprovante enviado via WhatsApp"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="h-9 text-xs border-[#DFC3AE]"
            />
          </div>

          {erro && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
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
              className="bg-[#C48864] hover:bg-[#B0764F] text-white h-10 text-xs font-semibold"
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
