/* Acesso a dados da loja virtual.
   Visitantes e clientes NUNCA leem a tabela de produtos diretamente: a vitrine
   vem da função pública vitrine_produtos(), que só mostra produtos ativos e
   publicados e não expõe custo nem estoque. Favoritos e carrinho são protegidos
   por RLS: cada cliente só enxerga e altera os próprios. */
import { supabase } from '@/lib/supabase'
import { caminhoProduto } from './seo-dados'

export type Disponibilidade = 'pronta_entrega' | 'sob_encomenda'

export interface ProdutoVitrine {
  id: string
  nome: string
  descricao: string
  preco: number
  categoria: string
  imagemUrl?: string
  disponibilidade: Disponibilidade
  criadoEm: string
}

export interface ContatoLoja {
  nome: string
  whatsapp: string
  instagram: string
}

export interface ItemCarrinho {
  id: string
  produtoId: string
  quantidade: number
}

type Row = Record<string, unknown>

const mapProduto = (r: Row): ProdutoVitrine => ({
  id: String(r.id),
  nome: String(r.nome ?? ''),
  descricao: String(r.descricao ?? ''),
  preco: Number(r.preco ?? 0),
  categoria: String(r.categoria ?? ''),
  imagemUrl:
    r.imagem_url && !String(r.imagem_url).endsWith('/placeholder.svg')
      ? String(r.imagem_url)
      : undefined,
  disponibilidade: r.disponibilidade === 'pronta_entrega' ? 'pronta_entrega' : 'sob_encomenda',
  criadoEm: String(r.criado_em ?? ''),
})

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

export async function listarVitrine(): Promise<ProdutoVitrine[]> {
  const data = check(await supabase.rpc('vitrine_produtos').order('nome'))
  return ((data ?? []) as Row[]).map(mapProduto)
}

export async function buscarContatoLoja(): Promise<ContatoLoja | null> {
  const data = check(await supabase.rpc('vitrine_contato'))
  const r = ((data ?? []) as Row[])[0]
  if (!r) return null
  return {
    nome: String(r.nome ?? 'Criartere'),
    whatsapp: String(r.whatsapp ?? ''),
    instagram: String(r.instagram ?? ''),
  }
}

// ---------- Favoritos ----------
export async function listarFavoritos(): Promise<string[]> {
  const data = check(
    await supabase.from('favoritos').select('produto_id').order('criado_em', { ascending: false }),
  )
  return ((data ?? []) as Row[]).map((r) => String(r.produto_id))
}

export async function adicionarFavorito(produtoId: string) {
  const { error } = await supabase.from('favoritos').insert({ produto_id: produtoId })
  // Já estava nos favoritos (ex.: outra aba): tudo certo
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
}

export async function removerFavorito(produtoId: string) {
  check(await supabase.from('favoritos').delete().eq('produto_id', produtoId))
}

// ---------- Carrinho ----------
export async function listarCarrinho(): Promise<ItemCarrinho[]> {
  const data = check(
    await supabase
      .from('carrinho_itens')
      .select('id, produto_id, quantidade')
      .order('criado_em', { ascending: true }),
  )
  return ((data ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    produtoId: String(r.produto_id),
    quantidade: Number(r.quantidade ?? 1),
  }))
}

export async function adicionarAoCarrinho(produtoId: string, quantidade: number) {
  check(
    await supabase.rpc('adicionar_ao_carrinho', {
      p_produto_id: produtoId,
      p_quantidade: quantidade,
    }),
  )
}

export async function alterarQuantidadeItem(itemId: string, quantidade: number) {
  check(
    await supabase
      .from('carrinho_itens')
      .update({ quantidade, atualizado_em: new Date().toISOString() })
      .eq('id', itemId),
  )
}

export async function removerItemCarrinho(itemId: string) {
  check(await supabase.from('carrinho_itens').delete().eq('id', itemId))
}

export async function buscarPapel(
  userId: string,
): Promise<{ nome: string | null; papel: string } | null> {
  const { data, error } = await supabase
    .from('perfis')
    .select('nome, papel')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { nome: data.nome, papel: data.papel } : null
}

// ---------- Utilidades ----------
export const formatarPreco = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export const NOME_DISPONIBILIDADE: Record<Disponibilidade, string> = {
  pronta_entrega: 'Pronta entrega',
  sob_encomenda: 'Sob encomenda',
}

export const linkProduto = (produto: { id: string; nome: string }) =>
  `${window.location.origin}${caminhoProduto(produto)}`

/** Número no formato do wa.me (só dígitos, com DDI 55 quando faltar). */
export function numeroWhatsApp(bruto: string): string {
  const digitos = (bruto || '').replace(/\D/g, '')
  if (!digitos) return ''
  if ((digitos.length === 10 || digitos.length === 11) && !digitos.startsWith('55')) {
    return '55' + digitos
  }
  return digitos
}

export function linkWhatsAppProduto(whatsapp: string, produto: { id: string; nome: string }) {
  const mensagem =
    `Olá! Tenho interesse no produto *${produto.nome}*. Poderia me passar mais informações?\n` +
    linkProduto(produto)
  const numero = numeroWhatsApp(whatsapp)
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

export function mensagemErroLoja(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/fetch|network/i.test(m)) return 'Verifique sua conexão com a internet.'
  if (/não está disponível|Quantidade inválida|Entre na sua conta/.test(m)) return m
  return 'Tente novamente em instantes.'
}
