/* Regras dos descontos e cupons: situação, validade e cálculo do valor. */
import type { Desconto } from '@/types/criartere'
import { vigencia } from '@/lib/datas'
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

export function situacaoDesconto(d: Desconto): SituacaoDesconto {
  const v = vigencia(d.ativo, d.validoDe, d.validoAte)
  return v === 'vigente' ? 'ativo' : v === 'encerrado' ? 'expirado' : v
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

/** Descontos e cupons do pedido inteiro que podem ser usados hoje
 *  (as promoções por produto já entram no preço do item). */
export const descontosDisponiveis = (lista: Desconto[]) =>
  lista.filter((d) => d.alcance === 'pedido' && situacaoDesconto(d) === 'ativo')

/** Promoção por produto: vale para este produto (pelo próprio produto ou pela categoria)? */
export const promocaoValeParaProduto = (d: Desconto, produto: { id: string; categoria: string }) =>
  d.alcance === 'produtos' &&
  !d.codigo &&
  (d.produtoIds.includes(produto.id) ||
    d.categorias.some((c) => c.trim().toLowerCase() === produto.categoria.trim().toLowerCase()))

/** Preço do produto com a melhor promoção válida hoje (mesma regra do banco/loja). */
export function precoPromocional(
  produto: { id: string; categoria: string; precoVenda: number },
  descontos: Desconto[],
): number {
  let melhor = produto.precoVenda
  for (const d of descontos) {
    if (situacaoDesconto(d) !== 'ativo' || !promocaoValeParaProduto(d, produto)) continue
    const preco =
      d.tipo === 'percentual'
        ? produto.precoVenda * (1 - d.valor / 100)
        : produto.precoVenda - d.valor
    melhor = Math.min(melhor, Math.max(0, Math.round(preco * 100) / 100))
  }
  return melhor
}

/** Percentual de desconto para a etiqueta (ex.: 15 para "-15%"). */
export const percentualDesconto = (original: number, promocional: number) =>
  original > 0 ? Math.round((1 - promocional / original) * 100) : 0
