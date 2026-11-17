/* Regras de desconto:
   - Cupons (tela Cupons): código que o cliente informa, aplicado no pedido/orçamento.
   - Desconto do produto: campo no cadastro do produto, aparece na loja com etiqueta. */
import type { Desconto, Produto } from '@/types/criartere'
import { vigencia } from '@/lib/datas'
import { formatBRL } from '@/store/periodUtils'

export type SituacaoDesconto = 'ativo' | 'inativo' | 'agendado' | 'expirado'

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
 * Valor em R$ do cupom sobre o subtotal dos itens.
 * Retorna 0 se o subtotal não atinge o mínimo. Nunca passa do subtotal.
 */
export function calcularDesconto(d: Desconto, subtotal: number): number {
  if (subtotal <= 0 || subtotal < d.valorMinimo) return 0
  const bruto = d.tipo === 'percentual' ? (subtotal * d.valor) / 100 : d.valor
  return Math.round(Math.min(bruto, subtotal) * 100) / 100
}

/** Preço do produto com o desconto do cadastro, se estiver valendo hoje (mesma regra do banco/loja). */
export function precoPromocional(
  produto: Pick<Produto, 'precoVenda' | 'promoTipo' | 'promoValor' | 'promoDe' | 'promoAte'>,
): number {
  if (!produto.promoValor || vigencia(true, produto.promoDe, produto.promoAte) !== 'vigente')
    return produto.precoVenda
  const preco =
    produto.promoTipo === 'valor'
      ? produto.precoVenda - produto.promoValor
      : produto.precoVenda * (1 - produto.promoValor / 100)
  return Math.max(0, Math.round(preco * 100) / 100)
}

/** Percentual de desconto para a etiqueta (ex.: 15 para "-15%"). */
export const percentualDesconto = (original: number, promocional: number) =>
  original > 0 ? Math.round((1 - promocional / original) * 100) : 0
