/* Etapas do pedido (colunas do Kanban): padrões e funções de apoio. */
import type { EtapaPedido } from '@/types/criartere'
import type { CriartereState } from './types'
import { corLegivel } from '@/lib/cores'

/** Etapas padrão: usadas antes de os dados do servidor carregarem. */
export const ETAPAS_PADRAO: EtapaPedido[] = [
  { chave: 'novo', nome: 'Novo pedido', cor: '#C48864', ordem: 1, fixa: true },
  {
    chave: 'aguardando_pagamento',
    nome: 'Aguardando pagamento',
    cor: '#D9A441',
    ordem: 2,
    fixa: true,
  },
  { chave: 'em_preparacao', nome: 'Em preparação', cor: '#8A5A3B', ordem: 3, fixa: false },
  { chave: 'em_producao', nome: 'Em produção', cor: '#B0764F', ordem: 4, fixa: false },
  { chave: 'pronto_envio', nome: 'Pronto para envio', cor: '#4C8A5A', ordem: 5, fixa: false },
  { chave: 'enviado', nome: 'Enviado', cor: '#5A7D8A', ordem: 6, fixa: false },
  { chave: 'entregue', nome: 'Entregue', cor: '#3D6F48', ordem: 7, fixa: true },
  { chave: 'cancelado', nome: 'Cancelado', cor: '#B5533C', ordem: 99, fixa: true },
]

/** Cores sugeridas ao criar/editar uma coluna. */
export const CORES_ETAPA = [
  '#C48864',
  '#D9A441',
  '#8A5A3B',
  '#B0764F',
  '#4C8A5A',
  '#3D6F48',
  '#5A7D8A',
  '#4A6FA5',
  '#7A5C9E',
  '#B5533C',
  '#C2577A',
  '#6B6B6B',
]

const ordenar = (a: EtapaPedido, b: EtapaPedido) => a.ordem - b.ordem

/** Colunas exibidas no Kanban (todas menos "cancelado"), na ordem definida. */
export function etapasDoKanban(state: Pick<CriartereState, 'etapas'>): EtapaPedido[] {
  return [...state.etapas].filter((e) => e.chave !== 'cancelado').sort(ordenar)
}

/** Todas as etapas, com "cancelado" por último. */
export function todasEtapas(state: Pick<CriartereState, 'etapas'>): EtapaPedido[] {
  return [...state.etapas].sort(ordenar)
}

/** Nome, cor e fundo claro de uma etapa (com fallback para chaves desconhecidas). */
export function infoEtapa(state: Pick<CriartereState, 'etapas'>, chave: string) {
  const e = state.etapas.find((x) => x.chave === chave)
  const cor = e?.cor || '#6B4B36'
  return { nome: e?.nome || chave.replace(/_/g, ' '), cor, texto: corLegivel(cor), bg: `${cor}14` }
}

/** Gera uma chave única (minúsculas, sem acento) a partir do nome da etapa. */
export function gerarChaveEtapa(nome: string, existentes: string[]): string {
  const base =
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'etapa'
  let chave = base
  let n = 2
  while (existentes.includes(chave)) chave = `${base}_${n++}`
  return chave
}
