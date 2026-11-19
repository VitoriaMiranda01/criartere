/* Avaliações de produtos: leitura pública (só publicadas), envio pela cliente que
   recebeu o produto e moderação no painel. As regras valem no banco (gatilho + RLS):
   aqui só chamamos as consultas e traduzimos os erros. */
import { supabase } from '@/lib/supabase'

export type StatusAvaliacao = 'pendente' | 'publicada' | 'recusada'

export interface Avaliacao {
  id: string
  produtoId: string
  autorNome: string
  nota: number
  comentario: string
  status: StatusAvaliacao
  destaque: boolean
  criadoEm: string
}

export const COMENTARIO_MAX = 1500

type Linha = Record<string, unknown>
const CAMPOS = 'id, produto_id, autor_nome, nota, comentario, status, destaque, criado_em'

const mapAvaliacao = (r: Linha): Avaliacao => ({
  id: String(r.id),
  produtoId: String(r.produto_id),
  autorNome: String(r.autor_nome || 'Cliente'),
  nota: Number(r.nota ?? 0),
  comentario: String(r.comentario ?? ''),
  status: (r.status as StatusAvaliacao) ?? 'pendente',
  destaque: Boolean(r.destaque),
  criadoEm: String(r.criado_em ?? ''),
})

/** Erros do banco em português, para mostrar na tela. */
export function mensagemErroAvaliacao(e: unknown): string {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
  if (/duplicate key|unique/i.test(m)) return 'Você já avaliou este produto.'
  if (/row-level security|violates/i.test(m)) return 'Só quem recebeu este produto pode avaliá-lo.'
  if (/JWT|not authenticated|permission denied/i.test(m))
    return 'Entre na sua conta para continuar.'
  if (/fetch|network/i.test(m)) return 'Verifique sua conexão com a internet.'
  return 'Tente novamente em instantes.'
}

function checar<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

// ---------- Loja ----------

/** Avaliações publicadas de um produto, mais recentes primeiro. */
export async function listarAvaliacoesPublicadas(produtoId: string): Promise<Avaliacao[]> {
  const data = checar(
    await supabase
      .from('avaliacoes_produto')
      .select(CAMPOS)
      .eq('produto_id', produtoId)
      .eq('status', 'publicada')
      .order('criado_em', { ascending: false })
      .limit(200),
  )
  return ((data ?? []) as Linha[]).map(mapAvaliacao)
}

/** Para a cliente logada: já avaliou este produto? Pode avaliar (recebeu e ainda não avaliou)? */
export async function situacaoAvaliacao(
  produtoId: string,
  userId: string,
): Promise<{ podeAvaliar: boolean; minha: Avaliacao | null }> {
  const [minha, recebeu] = await Promise.all([
    supabase
      .from('avaliacoes_produto')
      .select(CAMPOS)
      .eq('produto_id', produtoId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.rpc('recebi_produto', { p_produto: produtoId }),
  ])
  const avaliacao = minha.data ? mapAvaliacao(minha.data as Linha) : null
  return { podeAvaliar: Boolean(checar(recebeu)) && !avaliacao, minha: avaliacao }
}

/** Envia a avaliação. Dona, status e nome exibido são definidos pelo banco. */
export async function enviarAvaliacao(
  produtoId: string,
  nota: number,
  comentario: string,
): Promise<Avaliacao> {
  const data = checar(
    await supabase
      .from('avaliacoes_produto')
      .insert({
        produto_id: produtoId,
        nota,
        comentario: comentario.trim().slice(0, COMENTARIO_MAX),
      })
      .select(CAMPOS)
      .single(),
  )
  return mapAvaliacao(data as Linha)
}

/** Publicadas para os depoimentos da página inicial (destaques primeiro). */
export async function listarParaDepoimentos(): Promise<Avaliacao[]> {
  const data = checar(
    await supabase
      .from('avaliacoes_produto')
      .select(CAMPOS)
      .eq('status', 'publicada')
      .order('destaque', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(20),
  )
  return ((data ?? []) as Linha[]).map(mapAvaliacao)
}

/** Até 3 depoimentos: os destacados e, se faltar, os mais recentes com nota 4 ou 5 e
 *  comentário de pelo menos 20 letras. Só de produtos que estão na loja. */
export function escolherDepoimentos(lista: Avaliacao[], produtosNaLoja: Set<string>) {
  const validas = lista.filter((a) => produtosNaLoja.has(a.produtoId))
  const destaques = validas.filter((a) => a.destaque)
  const complemento = validas.filter(
    (a) => !a.destaque && a.nota >= 4 && a.comentario.trim().length >= 20,
  )
  return [...destaques, ...complemento].slice(0, 3)
}

/** Média (uma casa) e quantidade; null sem avaliações. */
export function resumoNotas(lista: Pick<Avaliacao, 'nota'>[]) {
  if (lista.length === 0) return null
  const media = lista.reduce((s, a) => s + a.nota, 0) / lista.length
  return { media: Math.round(media * 10) / 10, total: lista.length }
}

/** "4,8" */
export const formatarMedia = (media: number) =>
  media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// ---------- Painel ----------

export interface AvaliacaoModeracao extends Avaliacao {
  produtoNome: string
}

export async function listarParaModeracao(
  status: StatusAvaliacao | 'todas',
): Promise<AvaliacaoModeracao[]> {
  let consulta = supabase
    .from('avaliacoes_produto')
    .select(`${CAMPOS}, produtos(nome)`)
    .order('criado_em', { ascending: false })
    .limit(300)
  if (status !== 'todas') consulta = consulta.eq('status', status)
  const data = checar(await consulta)
  return ((data ?? []) as Linha[]).map((r) => ({
    ...mapAvaliacao(r),
    produtoNome: String((r.produtos as { nome?: string } | null)?.nome ?? 'Produto excluído'),
  }))
}

/** Quantas avaliações aguardam moderação. */
export async function contarPendentes(): Promise<number> {
  const { count, error } = await supabase
    .from('avaliacoes_produto')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendente')
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function definirStatusAvaliacao(id: string, status: StatusAvaliacao) {
  checar(await supabase.from('avaliacoes_produto').update({ status }).eq('id', id))
}

export async function definirDestaqueAvaliacao(id: string, destaque: boolean) {
  checar(await supabase.from('avaliacoes_produto').update({ destaque }).eq('id', id))
}

export async function excluirAvaliacao(id: string) {
  checar(await supabase.from('avaliacoes_produto').delete().eq('id', id))
}
