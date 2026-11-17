/* Aplica um desconto cadastrado (lista) ou um cupom (código) no pedido/orçamento.
   O desconto escolhido fica vinculado: quando os itens mudam, o valor é recalculado
   sozinho (e sai, com aviso, se a soma ficar abaixo da compra mínima). Digitar um
   valor à mão no campo "Desconto" desfaz o vínculo. */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useCriartere } from '@/store/CriartereContext'
import {
  calcularDesconto,
  descontosDisponiveis,
  ehCupom,
  normalizarCodigo,
  rotuloValorDesconto,
  situacaoDesconto,
} from '@/lib/descontos'
import { formatBRL } from '@/store/periodUtils'
import type { Desconto } from '@/types/criartere'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Props {
  subtotal: number
  /** Desconto/cupom vinculado ao pedido (undefined = valor digitado à mão ou nenhum). */
  descontoId?: string
  /** Chamado ao aplicar, recalcular ou remover: novo valor em R$ e o desconto vinculado. */
  onAplicar: (valor: number, descontoId?: string) => void
  className?: string
}

export function AplicarDesconto({ subtotal, descontoId, onAplicar, className }: Props) {
  const { state } = useCriartere()
  const [codigo, setCodigo] = useState('')
  const [escolhido, setEscolhido] = useState('')

  const vinculado = descontoId ? state.descontos.find((d) => d.id === descontoId) : undefined

  // Recalcula quando a soma dos itens muda (com a mesma soma, o valor não muda)
  const subtotalAnterior = useRef(subtotal)
  useEffect(() => {
    if (subtotalAnterior.current === subtotal) return
    subtotalAnterior.current = subtotal
    if (!vinculado) return
    if (subtotal <= 0 || subtotal < vinculado.valorMinimo) {
      onAplicar(0, undefined)
      toast.warning(
        `"${vinculado.nome}" foi retirado: vale para compras a partir de ${formatBRL(vinculado.valorMinimo)}.`,
      )
      return
    }
    onAplicar(calcularDesconto(vinculado, subtotal), vinculado.id)
  }, [subtotal, vinculado, onAplicar])

  const semCodigo = descontosDisponiveis(state.descontos).filter((d) => !ehCupom(d))
  const temCupons = state.descontos.some(ehCupom)
  if (semCodigo.length === 0 && !temCupons && !vinculado) return null

  const aplicar = (d: Desconto) => {
    if (subtotal <= 0) {
      toast.error('Adicione os itens antes de aplicar o desconto.')
      return false
    }
    if (subtotal < d.valorMinimo) {
      toast.error(
        `"${d.nome}" vale para compras a partir de ${formatBRL(d.valorMinimo)} (itens: ${formatBRL(subtotal)}).`,
      )
      return false
    }
    const valor = calcularDesconto(d, subtotal)
    onAplicar(valor, d.id)
    toast.success(
      `${d.nome} (${rotuloValorDesconto(d)}): desconto de ${formatBRL(valor)} aplicado.`,
    )
    return true
  }

  const aplicarCupom = () => {
    const cod = normalizarCodigo(codigo)
    if (!cod) return
    const cupom = state.descontos.find((d) => d.codigo === cod)
    if (!cupom) return void toast.error(`Cupom "${cod}" não encontrado.`)
    const situacao = situacaoDesconto(cupom)
    if (situacao === 'inativo') return void toast.error(`O cupom ${cod} está desativado.`)
    if (situacao === 'agendado')
      return void toast.error(`O cupom ${cod} ainda não começou a valer.`)
    if (situacao === 'expirado') return void toast.error(`O cupom ${cod} expirou.`)
    if (aplicar(cupom)) setCodigo('')
  }

  return (
    <div className={`grid grid-cols-1 gap-2 ${className ?? ''}`}>
      {vinculado && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[#C48864]/50 bg-[#C48864]/10 px-2.5 py-1.5">
          <p className="text-[11px] text-[#6B4B36] min-w-0">
            <span className="font-semibold text-[#94603D]">
              {ehCupom(vinculado) ? `Cupom ${vinculado.codigo}` : vinculado.nome}
            </span>{' '}
            ({rotuloValorDesconto(vinculado)}) aplicado • recalcula sozinho se os itens mudarem
          </p>
          <button
            type="button"
            onClick={() => onAplicar(0, undefined)}
            aria-label="Remover desconto aplicado"
            className="shrink-0 p-1 rounded text-[#6B4B36] hover:text-red-600 hover:bg-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {semCodigo.length > 0 && (
        <Select
          value={escolhido}
          onValueChange={(id) => {
            const d = semCodigo.find((x) => x.id === id)
            if (d) aplicar(d)
            setEscolhido('')
          }}
        >
          <SelectTrigger
            aria-label="Aplicar desconto cadastrado"
            className="h-9 text-xs border-[#DFC3AE] bg-white"
          >
            <SelectValue
              placeholder={
                vinculado ? 'Trocar por outro desconto...' : 'Aplicar desconto cadastrado...'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {semCodigo.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.nome} • {rotuloValorDesconto(d)}
                {d.valorMinimo > 0 ? ` (mín. ${formatBRL(d.valorMinimo)})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {temCupons && (
        <div className="flex gap-2">
          <Input
            aria-label="Código do cupom"
            placeholder="Código do cupom"
            value={codigo}
            onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                aplicarCupom()
              }
            }}
            className="h-9 text-xs border-[#DFC3AE] bg-white font-mono uppercase"
          />
          <Button
            type="button"
            variant="outline"
            onClick={aplicarCupom}
            disabled={!codigo}
            className="h-9 text-xs border-[#DFC3AE] text-[#6B4B36] shrink-0"
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  )
}
