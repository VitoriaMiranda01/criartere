import { novoId } from '@/lib/supabase'
import React, { useState } from 'react'
import { Despesa, PaymentMethod } from '@/types/criartere'
import { useCriartere } from '@/store/CriartereContext'
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
import { toast } from 'sonner'

interface FormDespesaModalProps {
  aberto: boolean
  onFechar: () => void
  despesaParaEditar?: Despesa | null
}

export const FormDespesaModal: React.FC<FormDespesaModalProps> = ({
  aberto,
  onFechar,
  despesaParaEditar,
}) => {
  const { state, dispatch } = useCriartere()

  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [vencimento, setVencimento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('Pix')
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')

  React.useEffect(() => {
    if (despesaParaEditar) {
      setDescricao(despesaParaEditar.descricao)
      setCategoria(despesaParaEditar.categoria)
      setValorStr(despesaParaEditar.valor.toString())
      setData(despesaParaEditar.data)
      setVencimento(despesaParaEditar.vencimento || '')
      setFormaPagamento(despesaParaEditar.formaPagamento)
      setStatus(despesaParaEditar.status)
      setObservacoes(despesaParaEditar.observacoes || '')
    } else {
      setDescricao('')
      setCategoria(state.categoriasDespesa[0] || 'Outros')
      setValorStr('')
      setData(new Date().toISOString().slice(0, 10))
      setVencimento('')
      setFormaPagamento('Pix')
      setStatus('pago')
      setObservacoes('')
    }
    setErro('')
  }, [despesaParaEditar, aberto, state.categoriasDespesa])

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const valorNum = parseFloat(valorStr.replace(',', '.'))
    if (!descricao.trim()) {
      setErro('A descrição da despesa é obrigatória.')
      return
    }

    if (isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor de despesa válido maior que zero.')
      return
    }

    const payload: Despesa = {
      id: despesaParaEditar ? despesaParaEditar.id : novoId(),
      descricao: descricao.trim(),
      categoria,
      valor: valorNum,
      data,
      vencimento: vencimento || undefined,
      formaPagamento,
      status,
      observacoes: observacoes.trim() || undefined,
    }

    dispatch({ type: 'SALVAR_DESPESA', payload })
    toast.success(
      despesaParaEditar
        ? 'Despesa atualizada com sucesso!'
        : status === 'pago'
          ? 'Despesa cadastrada como saída realizada!'
          : 'Despesa cadastrada como saída pendente (prevista).',
    )

    onFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-md bg-white border-[#DFC3AE] p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
            {despesaParaEditar ? 'Editar Despesa' : 'Nova Despesa / Saída'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSalvar} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="desc"
              className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
            >
              Descrição da Despesa *
            </Label>
            <Input
              id="desc"
              placeholder="Ex: Sacos de argila terracota (50kg)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="h-10 text-xs border-[#DFC3AE]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                Categoria *
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-10 text-xs border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.categoriasDespesa.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="val"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Valor (R$) *
              </Label>
              <Input
                id="val"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                className="h-10 text-xs border-[#DFC3AE]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="data"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Data da Despesa *
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
                htmlFor="venc"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Vencimento (opcional)
              </Label>
              <Input
                id="venc"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="h-10 text-xs border-[#DFC3AE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                Forma de Pagamento
              </Label>
              <Select value={formaPagamento} onValueChange={(val: any) => setFormaPagamento(val)}>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                Status da Despesa
              </Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-10 text-xs border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago" className="text-xs">
                    Pago (Saída Realizada)
                  </SelectItem>
                  <SelectItem value="pendente" className="text-xs">
                    Pendente (Saída Prevista)
                  </SelectItem>
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
            <Textarea
              id="obs"
              placeholder="Fornecedor, nota fiscal, número do pedido..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="text-xs border-[#DFC3AE] min-h-[60px]"
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
              Salvar Despesa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
