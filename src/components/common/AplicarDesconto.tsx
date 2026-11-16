/* Aplica um desconto cadastrado (lista) ou um cupom (código) no pedido/orçamento.
   Calcula o valor em R$ sobre o subtotal dos itens e devolve para o campo "Desconto". */
import { useState } from 'react'
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
  onAplicar: (valor: number) => void
  className?: string
}

export function AplicarDesconto({ subtotal, onAplicar, className }: Props) {
  const { state } = useCriartere()
  const [codigo, setCodigo] = useState('')
  const [escolhido, setEscolhido] = useState('')

  const semCodigo = descontosDisponiveis(state.descontos).filter((d) => !ehCupom(d))
  const temCupons = state.descontos.some(ehCupom)
  if (semCodigo.length === 0 && !temCupons) return null

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
    onAplicar(valor)
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
            <SelectValue placeholder="Aplicar desconto cadastrado..." />
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
