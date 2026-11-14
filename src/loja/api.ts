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
  imagemUrl?: string // foto principal
  imagens: string[] // todas as fotos (a primeira é a principal)
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

const fotoValida = (u: unknown): u is string =>
  typeof u === 'string' && u !== '' && !u.endsWith('/placeholder.svg')

const mapProduto = (r: Row): ProdutoVitrine => {
  const lista = Array.isArray(r.imagens) ? (r.imagens as unknown[]).filter(fotoValida) : []
  const imagens = lista.length ? lista : fotoValida(r.imagem_url) ? [r.imagem_url] : []
  return {
    id: String(r.id),
    nome: String(r.nome ?? ''),
    descricao: String(r.descricao ?? ''),
    preco: Number(r.preco ?? 0),
    categoria: String(r.categoria ?? ''),
    imagemUrl: imagens[0],
    imagens,
    disponibilidade: r.disponibilidade === 'pronta_entrega' ? 'pronta_entrega' : 'sob_encomenda',
    criadoEm: String(r.criado_em ?? ''),
  }
}

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
): Promise<{ nome: string | null; papel: string; avatarUrl: string | null } | null> {
  const { data, error } = await supabase
    .from('perfis')
    .select('nome, papel, avatar_url')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { nome: data.nome, papel: data.papel, avatarUrl: data.avatar_url } : null
}

// ---------- Minha conta ----------
/** Atualiza o nome do próprio cliente (mantém a foto de perfil, se houver). */
export async function salvarNomeConta(nome: string, avatarUrl: string | null) {
  check(await supabase.rpc('atualizar_meu_perfil', { p_nome: nome, p_avatar_url: avatarUrl ?? '' }))
  // Mantém o nome também nos dados da conta de acesso
  await supabase.auth.updateUser({ data: { nome } }).catch(() => undefined)
}

/** Troca a senha conferindo antes a senha atual. */
export async function trocarSenha(email: string, senhaAtual: string, novaSenha: string) {
  const { error: erroAtual } = await supabase.auth.signInWithPassword({
    email,
    password: senhaAtual,
  })
  if (erroAtual) throw new Error('SENHA_ATUAL_INCORRETA')
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) {
    if (/different from the old|same/i.test(error.message)) throw new Error('SENHA_IGUAL')
    if (/weak|least/i.test(error.message)) throw new Error('SENHA_FRACA')
    throw new Error(error.message)
  }
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
  if (
    /não está disponível|Quantidade inválida|Entre na sua conta|carrinho está vazio|WhatsApp válido|Informe seu nome|vários pedidos|retirada ou entrega|endereço e a cidade/.test(
      m,
    )
  )
    return m
  return 'Tente novamente em instantes.'
}

// ---------- Pedidos feitos pela loja ----------
export interface ItemPedidoLoja {
  nome: string
  quantidade: number
  subtotal: number
  valorUnitario?: number
}

export interface PedidoCriado {
  id: string
  numero: string
  total: number
  formaPagamento: string
  entrega: string // ex.: "Retirada na loja" ou "Entrega em ... (frete a combinar)"
  itens: ItemPedidoLoja[]
}

export interface PedidoLoja {
  id: string
  numero: string
  criadoEm: string
  valorTotal: number
  situacao: string
  situacaoTipo: 'aguardando' | 'andamento' | 'concluido' | 'encerrado'
  itens: ItemPedidoLoja[]
}

const mapItemPedido = (r: Row): ItemPedidoLoja => ({
  nome: String(r.nome ?? ''),
  quantidade: Number(r.quantidade ?? 0),
  subtotal: Number(r.subtotal ?? 0),
  valorUnitario: r.valorUnitario !== undefined ? Number(r.valorUnitario) : undefined,
})

/** Registra o pedido (como orçamento no painel) com os itens do carrinho e esvazia o carrinho. */
export async function enviarPedido(dados: {
  nome: string
  whatsapp: string
  formaPagamento: string
  observacoes: string
  entrega: 'retirada' | 'entrega'
  endereco: string
  cidadeUf: string
}): Promise<PedidoCriado> {
  const r = check(
    await supabase.rpc('criar_pedido_loja', {
      p_nome: dados.nome,
      p_whatsapp: dados.whatsapp,
      p_forma_pagamento: dados.formaPagamento,
      p_observacoes: dados.observacoes,
      p_entrega: dados.entrega,
      p_endereco: dados.entrega === 'entrega' ? dados.endereco : null,
      p_cidade_uf: dados.entrega === 'entrega' ? dados.cidadeUf : null,
    }),
  ) as Row
  return {
    id: String(r.id),
    numero: String(r.numero),
    total: Number(r.total ?? 0),
    formaPagamento: String(r.formaPagamento ?? ''),
    entrega: String(r.entrega ?? 'A combinar'),
    itens: ((r.itens as Row[]) ?? []).map(mapItemPedido),
  }
}

export async function listarMeusPedidos(): Promise<PedidoLoja[]> {
  const data = check(await supabase.rpc('meus_pedidos_loja'))
  return ((data ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    numero: String(r.numero),
    criadoEm: String(r.criado_em),
    valorTotal: Number(r.valor_total ?? 0),
    situacao: String(r.situacao ?? ''),
    situacaoTipo: (r.situacao_tipo as PedidoLoja['situacaoTipo']) ?? 'aguardando',
    itens: ((r.itens as Row[]) ?? []).map(mapItemPedido),
  }))
}

/** Nome e WhatsApp usados no último pedido (para preencher o formulário). */
export async function buscarMeusDadosPedido(): Promise<{
  nome: string
  whatsapp: string
  endereco: string
  cidadeUf: string
} | null> {
  const data = check(await supabase.rpc('meus_dados_pedido'))
  const r = ((data ?? []) as Row[])[0]
  return r
    ? {
        nome: String(r.nome ?? ''),
        whatsapp: String(r.whatsapp ?? ''),
        endereco: String(r.endereco ?? ''),
        cidadeUf: String(r.cidade_uf ?? ''),
      }
    : null
}

const qtd = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR'))

/** "Entrega em Rua X — Cidade (frete a combinar)" → "Rua X — Cidade (frete a combinar)" */
export const textoEntrega = (t: string) => t.replace(/^Entrega em /, '')

/** Mensagem do WhatsApp com o resumo do pedido. */
export function mensagemPedidoWhatsApp(pedido: PedidoCriado, nome: string, observacoes: string) {
  const linhas = [
    `Olá! Acabei de fazer um pedido no site da Criartere 😊`,
    ``,
    `*Pedido Nº ${pedido.numero}*`,
    ...pedido.itens.map((i) => `• ${qtd(i.quantidade)}x ${i.nome} — ${formatarPreco(i.subtotal)}`),
    ``,
    `*Total dos produtos:* ${formatarPreco(pedido.total)}`,
    `*Pagamento:* ${pedido.formaPagamento}`,
    `*Entrega:* ${textoEntrega(pedido.entrega)}`,
    `*Nome:* ${nome}`,
  ]
  if (observacoes.trim()) linhas.push(`*Observações:* ${observacoes.trim()}`)
  linhas.push(
    ``,
    pedido.entrega.startsWith('Retirada')
      ? `Podemos combinar a retirada e o pagamento?`
      : `Podemos combinar o frete e o pagamento?`,
  )
  return linhas.join('\n')
}

export function linkWhatsAppPedido(
  whatsappLoja: string,
  pedido: PedidoCriado,
  nome: string,
  observacoes: string,
) {
  return `https://wa.me/${numeroWhatsApp(whatsappLoja)}?text=${encodeURIComponent(
    mensagemPedidoWhatsApp(pedido, nome, observacoes),
  )}`
}

/** Máscara simples de telefone brasileiro: (21) 99999-9999 */
export function mascararTelefone(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
