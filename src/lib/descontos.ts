/* Regras dos descontos e cupons: situação, validade e cálculo do valor. */
import type { Desconto } from '@/types/criartere'
import { hojeISO } from '@/lib/datas'
import { formatBRL } from '@/store/periodUtils'

export type SituacaoDesconto = 'ativo' | 'inativo' | 'agendado' | 'expirado'

export const ehCupom = (d: Desconto) => Boolean(d.codigo)

/** Normaliza o código digitado: maiúsculas, sem espaços nem acentos. */
export const normalizarCodigo = (codigo: string) =>
  codigo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')

export function situacaoDesconto(d: Desconto, hoje = hojeISO()): SituacaoDesconto {
  if (!d.ativo) return 'inativo'
  if (d.validoDe && hoje < d.validoDe) return 'agendado'
  if (d.validoAte && hoje > d.validoAte) return 'expirado'
  return 'ativo'
}

/** Ex.: "10%" ou "R$ 15,00". */
export const rotuloValorDesconto = (d: Desconto) =>
  d.tipo === 'percentual' ? `${d.valor.toLocaleString('pt-BR')}%` : formatBRL(d.valor)

/**
 * Valor em R$ do desconto sobre o subtotal dos itens.
 * Retorna 0 se o subtotal não atinge o mínimo. Nunca passa do subtotal.
 */
export function calcularDesconto(d: Desconto, subtotal: number): number {
  if (subtotal <= 0 || subtotal < d.valorMinimo) return 0
  const bruto = d.tipo === 'percentual' ? (subtotal * d.valor) / 100 : d.valor
  return Math.round(Math.min(bruto, subtotal) * 100) / 100
}

/** Descontos e cupons que podem ser usados hoje. */
export const descontosDisponiveis = (lista: Desconto[]) =>
  lista.filter((d) => situacaoDesconto(d) === 'ativo')
