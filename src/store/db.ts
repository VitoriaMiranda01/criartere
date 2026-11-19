/* Camada de acesso ao Supabase: leitura (mapeando snake_case -> camelCase) e
   persistência das ações do store. */
import { supabase } from '@/lib/supabase'
import type {
  Cliente,
  Produto,
  Pedido,
  PedidoItem,
  EtapaPedido,
  Orcamento,
  Pagamento,
  Despesa,
  Desconto,
  Banner,
  CategoriaProduto,
  OrderHistoryEvent,
  LojaConfig,
  PaymentMethod,
} from '@/types/criartere'
import type { CriartereState } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

export type Fatia =
  | 'clientes'
  | 'produtos'
  | 'pedidos'
  | 'etapas'
  | 'orcamentos'
  | 'pagamentos'
  | 'despesas'
  | 'descontos'
  | 'banners'
  | 'categoriasDespesa'
  | 'categoriasProduto'
  | 'formasPagamento'
  | 'historico'
  | 'config'

export const TODAS_FATIAS: Fatia[] = [
  'clientes',
  'produtos',
  'pedidos',
  'etapas',
  'orcamentos',
  'pagamentos',
  'despesas',
  'descontos',
  'banners',
  'categoriasDespesa',
  'categoriasProduto',
  'formasPagamento',
  'historico',
  'config',
]

const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v)
const num = (v: unknown): number => Number(v ?? 0)

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ---------------- Mapeadores (banco -> app) ----------------

const mapCliente = (r: Row): Cliente => ({
  id: r.id,
  nome: r.nome,
  telefone: r.telefone,
  whatsapp: r.whatsapp,
  email: r.email,
  endereco: r.endereco,
  cidadeUf: r.cidade_uf,
  observacoes: opt(r.observacoes),
  criadoEm: r.criado_em,
})

const mapProduto = (r: Row): Produto => ({
  id: r.id,
  nome: r.nome,
  descricao: r.descricao,
  precoVenda: num(r.preco_venda),
  custo: num(r.custo),
  categoria: r.categoria,
  outrasCategorias: Array.isArray(r.outras_categorias) ? r.outras_categorias : [],
  imagemUrl: opt(r.imagem_url),
  imagens: Array.isArray(r.imagens) ? (r.imagens as string[]) : [],
  ativo: r.ativo,
  publicadoLoja: r.publicado_loja ?? true,
  estoqueAproximado: opt(r.estoque_aproximado),
  promoTipo: opt(r.promo_tipo),
  promoValor: r.promo_valor == null ? undefined : num(r.promo_valor),
  promoDe: opt(r.promo_de),
  promoAte: opt(r.promo_ate),
})

const mapItem = (r: Row): PedidoItem => ({
  id: r.id,
  produtoId: opt(r.produto_id),
  nome: r.nome,
  quantidade: num(r.quantidade),
  valorUnitario: num(r.valor_unitario),
  subtotal: num(r.subtotal),
})

const mapPedido = (r: Row): Pedido => ({
  id: r.id,
  codigo: r.codigo,
  clienteId: r.cliente_id,
  itens: [...(r.pedido_itens ?? [])].sort((a: Row, b: Row) => a.ordem - b.ordem).map(mapItem),
  valorProdutos: num(r.valor_produtos),
  valorFrete: num(r.valor_frete),
  valorDesconto: num(r.valor_desconto),
  descontoId: opt(r.desconto_id),
  valorTotal: num(r.valor_total),
  status: r.status,
  statusPagamento: r.status_pagamento,
  formaPagamento: r.forma_pagamento,
  prazoEntrega: r.prazo_entrega ?? '',
  dataCriacao: r.data_criacao,
  observacoes: opt(r.observacoes),
})

const mapOrcamento = (r: Row): Orcamento => ({
  id: r.id,
  numero: r.numero,
  data: r.data,
  clienteId: opt(r.cliente_id),
  clienteNome: r.cliente_nome,
  clienteTelefone: r.cliente_telefone,
  disponibilidade: r.disponibilidade,
  formasPagamento: r.formas_pagamento,
  tipoPagamento: r.tipo_pagamento,
  percentualSinal: num(r.percentual_sinal),
  itens: [...(r.orcamento_itens ?? [])].sort((a: Row, b: Row) => a.ordem - b.ordem).map(mapItem),
  valorProdutos: num(r.valor_produtos),
  valorFrete: num(r.valor_frete),
  valorDesconto: num(r.valor_desconto),
  descontoId: opt(r.desconto_id),
  valorTotal: num(r.valor_total),
  observacoes: r.observacoes,
  status: r.status,
  pedidoId: opt(r.pedido_id),
  origem: r.origem === 'loja' ? 'loja' : 'painel',
})

const mapPagamento = (r: Row): Pagamento => ({
  id: r.id,
  pedidoId: r.pedido_id,
  valor: num(r.valor),
  data: r.data,
  formaPagamento: r.forma_pagamento,
  observacoes: opt(r.observacoes),
})

const mapDespesa = (r: Row): Despesa => ({
  id: r.id,
  descricao: r.descricao,
  categoria: r.categoria,
  valor: num(r.valor),
  data: r.data,
  vencimento: opt(r.vencimento),
  formaPagamento: r.forma_pagamento,
  status: r.status,
  observacoes: opt(r.observacoes),
})

const mapDesconto = (r: Row): Desconto => ({
  id: r.id,
  nome: r.nome,
  codigo: r.codigo ?? '',
  tipo: r.tipo,
  valor: num(r.valor),
  valorMinimo: num(r.valor_minimo),
  validoDe: opt(r.valido_de),
  validoAte: opt(r.valido_ate),
  ativo: r.ativo,
  descricao: r.descricao ?? '',
})

const mapBanner = (r: Row): Banner => ({
  id: r.id,
  titulo: r.titulo,
  imagemComputador: r.imagem_computador,
  imagemCelular: r.imagem_celular ?? '',
  destinoTipo: r.destino_tipo,
  destinoValor: opt(r.destino_valor),
  ordem: r.ordem,
  ativo: r.ativo,
  validoDe: opt(r.valido_de),
  validoAte: opt(r.valido_ate),
})

const mapHistorico = (r: Row): OrderHistoryEvent => ({
  id: r.id,
  pedidoId: r.pedido_id,
  dataHora: formatarDataHora(r.data_hora),
  tipo: r.tipo,
  descricao: r.descricao,
})

const mapConfig = (r: Row): LojaConfig => ({
  nome: r.nome,
  chavePix: r.chave_pix ?? '',
  email: r.email,
  telefone: r.telefone,
  whatsapp: r.whatsapp,
  endereco: r.endereco,
  instagram: r.instagram,
  incluirAguardandoNoFaturamento: r.incluir_aguardando_no_faturamento,
  periodoPadraoDashboard: r.periodo_padrao_dashboard,
  barraAvisosAtiva: r.barra_avisos_ativa ?? false,
  barraAvisos: Array.isArray(r.barra_avisos) ? (r.barra_avisos as string[]) : [],
  secoesInicio: Array.isArray(r.secoes_inicio)
    ? (r.secoes_inicio as LojaConfig['secoesInicio'])
    : [],
})

// ---------------- Mapeadores (app -> banco) ----------------

const clienteParaRow = (c: Cliente) => ({
  id: c.id,
  nome: c.nome,
  telefone: c.telefone ?? '',
  whatsapp: c.whatsapp ?? '',
  email: c.email ?? '',
  endereco: c.endereco ?? '',
  cidade_uf: c.cidadeUf ?? '',
  observacoes: c.observacoes || null,
  criado_em: c.criadoEm || undefined,
})

const produtoParaRow = (p: Produto) => ({
  id: p.id,
  nome: p.nome,
  descricao: p.descricao ?? '',
  preco_venda: p.precoVenda,
  custo: p.custo,
  categoria: p.categoria ?? '',
  // Sem repetir a principal nem categorias iguais
  outras_categorias: [
    ...new Set((p.outrasCategorias ?? []).map((c) => c.trim()).filter(Boolean)),
  ].filter((c) => c !== (p.categoria ?? '').trim()),
  imagem_url: p.imagens?.[0] || p.imagemUrl || null,
  imagens:
    p.imagens ?? (p.imagemUrl && !p.imagemUrl.endsWith('/placeholder.svg') ? [p.imagemUrl] : []),
  ativo: p.ativo,
  publicado_loja: p.publicadoLoja ?? true,
  estoque_aproximado: p.estoqueAproximado ?? null,
  promo_tipo: p.promoValor ? (p.promoTipo ?? 'percentual') : null,
  promo_valor: p.promoValor || null,
  promo_de: p.promoValor ? p.promoDe || null : null,
  promo_ate: p.promoValor ? p.promoAte || null : null,
})

const despesaParaRow = (d: Despesa) => ({
  id: d.id,
  descricao: d.descricao,
  categoria: d.categoria,
  valor: d.valor,
  data: d.data,
  vencimento: d.vencimento || null,
  forma_pagamento: d.formaPagamento,
  status: d.status,
  observacoes: d.observacoes || null,
})

const descontoParaRow = (d: Desconto) => ({
  id: d.id,
  nome: d.nome,
  codigo: d.codigo.trim().toUpperCase(),
  tipo: d.tipo,
  valor: d.valor,
  valor_minimo: d.valorMinimo,
  valido_de: d.validoDe || null,
  valido_ate: d.validoAte || null,
  ativo: d.ativo,
  descricao: d.descricao ?? '',
})

const bannerParaRow = (b: Banner) => ({
  id: b.id,
  titulo: b.titulo,
  imagem_computador: b.imagemComputador,
  imagem_celular: b.imagemCelular,
  destino_tipo: b.destinoTipo,
  destino_valor: b.destinoTipo === 'nenhum' ? null : b.destinoValor || null,
  ordem: b.ordem,
  ativo: b.ativo,
  valido_de: b.validoDe || null,
  valido_ate: b.validoAte || null,
})

const configParaRow = (c: LojaConfig) => ({
  nome: c.nome,
  chave_pix: c.chavePix ?? '',
  email: c.email,
  telefone: c.telefone,
  whatsapp: c.whatsapp,
  endereco: c.endereco,
  instagram: c.instagram,
  incluir_aguardando_no_faturamento: c.incluirAguardandoNoFaturamento,
  periodo_padrao_dashboard: c.periodoPadraoDashboard,
  barra_avisos_ativa: c.barraAvisosAtiva,
  barra_avisos: c.barraAvisos.map((f) => f.trim()).filter(Boolean),
  secoes_inicio: c.secoesInicio.slice(0, 3),
})

// ---------------- Leitura ----------------

export async function carregarFatias(fatias: Fatia[]): Promise<Partial<CriartereState>> {
  const unicas = Array.from(new Set(fatias))
  const partes = await Promise.all(
    unicas.map(async (f): Promise<Partial<CriartereState>> => {
      switch (f) {
        case 'clientes':
          return {
            clientes: check(await supabase.from('clientes').select('*').order('nome')).map(
              mapCliente,
            ),
          }
        case 'produtos':
          return {
            produtos: check(await supabase.from('produtos').select('*').order('nome')).map(
              mapProduto,
            ),
          }
        case 'pedidos':
          return {
            pedidos: check(
              await supabase
                .from('pedidos')
                .select('*, pedido_itens(*)')
                .order('numero', { ascending: false }),
            ).map(mapPedido),
          }
        case 'etapas':
          return {
            etapas: check(
              await supabase
                .from('etapas_pedido')
                .select('chave, nome, cor, ordem, fixa')
                .order('ordem'),
            ).map((r: Row): EtapaPedido => ({
              chave: r.chave,
              nome: r.nome,
              cor: r.cor,
              ordem: r.ordem,
              fixa: r.fixa,
            })),
          }
        case 'orcamentos':
          return {
            orcamentos: check(
              await supabase
                .from('orcamentos')
                .select('*, orcamento_itens(*)')
                .order('criado_em', { ascending: false }),
            ).map(mapOrcamento),
          }
        case 'pagamentos':
          return {
            pagamentos: check(
              await supabase
                .from('pagamentos')
                .select('*')
                .order('data', { ascending: false })
                .order('criado_em', { ascending: false }),
            ).map(mapPagamento),
          }
        case 'despesas':
          return {
            despesas: check(
              await supabase.from('despesas').select('*').order('data', { ascending: false }),
            ).map(mapDespesa),
          }
        case 'descontos':
          return {
            descontos: check(
              await supabase.from('descontos').select('*').order('criado_em', { ascending: false }),
            ).map(mapDesconto),
          }
        case 'banners':
          return {
            banners: check(
              await supabase.from('banners').select('*').order('ordem').order('criado_em'),
            ).map(mapBanner),
          }
        case 'categoriasProduto':
          return {
            categoriasProduto: check(
              await supabase
                .from('categorias_produto')
                .select('nome, linha, imagem_url')
                .order('criado_em'),
            ).map((r: Row): CategoriaProduto => ({
              nome: r.nome,
              linha: opt(r.linha),
              imagemUrl: opt(r.imagem_url),
            })),
          }
        case 'categoriasDespesa':
          return {
            categoriasDespesa: check(
              await supabase.from('categorias_despesa').select('nome').order('criado_em'),
            ).map((r: Row) => r.nome as string),
          }
        case 'formasPagamento':
          return {
            formasPagamento: check(
              await supabase.from('formas_pagamento').select('nome').order('criado_em'),
            ).map((r: Row) => r.nome as PaymentMethod),
          }
        case 'historico':
          return {
            historico: check(
              await supabase
                .from('pedido_historico')
                .select('*')
                .order('data_hora', { ascending: false }),
            ).map(mapHistorico),
          }
        case 'config': {
          const row = check(
            await supabase.from('loja_config').select('*').eq('id', 1).maybeSingle(),
          )
          return row ? { config: mapConfig(row) } : {}
        }
      }
    }),
  )
  return Object.assign({}, ...partes)
}

export type PapelUsuario = 'admin' | 'desenvolvedor' | 'cliente'

/** Perfil (nome e papel) do usuário logado. */
export async function buscarPerfil(
  userId: string,
): Promise<{ nome: string | null; papel: PapelUsuario; avatarUrl: string | null } | null> {
  const { data, error } = await supabase
    .from('perfis')
    .select('nome, papel, avatar_url')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { nome: data.nome, papel: data.papel as PapelUsuario, avatarUrl: data.avatar_url }
}

export interface UsuarioSistema {
  userId: string
  email: string
  nome: string | null
  papel: PapelUsuario
  avatarUrl: string | null
  criadoEm: string
}

/** Lista todas as contas (somente administradores conseguem ler). */
export async function listarUsuarios(): Promise<UsuarioSistema[]> {
  const rows = check(
    await supabase
      .from('perfis')
      .select('user_id, email, nome, papel, avatar_url, criado_em')
      .order('criado_em'),
  ) as Row[]
  return rows.map((r) => ({
    userId: r.user_id,
    email: r.email,
    nome: r.nome,
    papel: r.papel,
    avatarUrl: r.avatar_url,
    criadoEm: r.criado_em,
  }))
}

/** Envia a foto de perfil (já preparada) para a pasta do usuário e devolve o endereço público. */
export async function enviarFotoPerfil(
  userId: string,
  foto: { blob: Blob; extensao: string },
): Promise<string> {
  const caminho = `${userId}/${Date.now()}.${foto.extensao}`
  const { error } = await supabase.storage.from('avatares').upload(caminho, foto.blob, {
    contentType: foto.blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('avatares').getPublicUrl(caminho).data.publicUrl
}

/** Apaga as fotos antigas do usuário, mantendo só a atual (se houver). */
export async function limparFotosAntigas(userId: string, urlAtual: string | null): Promise<void> {
  const { data } = await supabase.storage.from('avatares').list(userId, { limit: 100 })
  const apagar = (data ?? [])
    .map((f) => `${userId}/${f.name}`)
    .filter((caminho) => !urlAtual || !urlAtual.endsWith(caminho))
  if (apagar.length) await supabase.storage.from('avatares').remove(apagar)
}

/** Envia a imagem de um produto e devolve o endereço público. */
export async function enviarImagemProduto(
  produtoId: string,
  imagem: { blob: Blob; extensao: string },
): Promise<string> {
  const caminho = `${produtoId}/${Date.now()}.${imagem.extensao}`
  const { error } = await supabase.storage.from('produtos').upload(caminho, imagem.blob, {
    contentType: imagem.blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('produtos').getPublicUrl(caminho).data.publicUrl
}

/** Apaga do armazenamento as fotos que o produto não usa mais (todas, se a lista estiver vazia). */
export async function limparImagensProduto(produtoId: string, urlsEmUso: string[]) {
  const { data } = await supabase.storage.from('produtos').list(produtoId, { limit: 100 })
  const apagar = (data ?? [])
    .map((f) => `${produtoId}/${f.name}`)
    .filter((caminho) => !urlsEmUso.some((url) => url.endsWith(caminho)))
  if (apagar.length) await supabase.storage.from('produtos').remove(apagar)
}

/** Envia a imagem de um banner (computador ou celular) e devolve o endereço público. */
export async function enviarImagemBanner(
  bannerId: string,
  formato: 'computador' | 'celular',
  imagem: { blob: Blob; extensao: string },
): Promise<string> {
  const caminho = `${bannerId}/${formato}-${Date.now()}.${imagem.extensao}`
  const { error } = await supabase.storage.from('banners').upload(caminho, imagem.blob, {
    contentType: imagem.blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('banners').getPublicUrl(caminho).data.publicUrl
}

/** Apaga as imagens do banner que não estão mais em uso. */
async function limparImagensBanner(bannerId: string, urlsEmUso: string[]) {
  const { data } = await supabase.storage.from('banners').list(bannerId, { limit: 100 })
  const apagar = (data ?? [])
    .map((f) => `${bannerId}/${f.name}`)
    .filter((caminho) => !urlsEmUso.some((url) => url.endsWith(caminho)))
  if (apagar.length) await supabase.storage.from('banners').remove(apagar)
}

/** Envia a foto do card de uma categoria e devolve o endereço público. */
export async function enviarFotoCategoria(imagem: {
  blob: Blob
  extensao: string
}): Promise<string> {
  const caminho = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imagem.extensao}`
  const { error } = await supabase.storage.from('categorias').upload(caminho, imagem.blob, {
    contentType: imagem.blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('categorias').getPublicUrl(caminho).data.publicUrl
}

async function gravarFotoCategoria(nome: string, imagemUrl: string | null) {
  check(
    await supabase
      .from('categorias_produto')
      .update({ imagem_url: imagemUrl })
      .eq('nome', nome.trim().replace(/\s+/g, ' ')),
  )
}

/** Apaga as fotos de categoria que nenhuma categoria usa mais. */
async function limparFotosCategorias(categorias: CategoriaProduto[]) {
  const emUso = categorias.map((c) => c.imagemUrl).filter((u): u is string => Boolean(u))
  const { data } = await supabase.storage.from('categorias').list('fotos', { limit: 500 })
  const apagar = (data ?? [])
    .map((f) => `fotos/${f.name}`)
    .filter((caminho) => !emUso.some((url) => url.endsWith(caminho)))
  if (apagar.length) await supabase.storage.from('categorias').remove(apagar)
}

/** Atualiza nome e foto do próprio usuário. */
export async function atualizarMeuPerfil(nome: string, avatarUrl: string | null): Promise<void> {
  check(await supabase.rpc('atualizar_meu_perfil', { p_nome: nome, p_avatar_url: avatarUrl ?? '' }))
}

/** Torna um usuário administrador ou cliente (somente administradores). */
export async function definirPapel(userId: string, papel: PapelUsuario): Promise<void> {
  check(await supabase.rpc('definir_papel', { p_user_id: userId, p_papel: papel }))
}

// ---------------- Persistência ----------------

/* Ações que alteram dados. Definidas aqui de forma estrutural para evitar
   dependência circular com o reducer. */
type AcaoPersistivel = { type: string; payload?: any }

/**
 * Grava no banco o efeito de uma ação já aplicada localmente.
 * Retorna as fatias que devem ser recarregadas do servidor (ex.: código do pedido,
 * histórico gerado pelo banco).
 */
export async function persistirAcao(
  action: AcaoPersistivel,
  anterior: CriartereState,
  proximo: CriartereState,
): Promise<Fatia[]> {
  const p = action.payload
  switch (action.type) {
    case 'CRIAR_PEDIDO':
    case 'ATUALIZAR_PEDIDO':
      check(await supabase.rpc('salvar_pedido', { p }))
      return ['pedidos', 'historico']

    case 'ALTERAR_STATUS_PEDIDO':
      check(
        await supabase.rpc('alterar_status_pedido', {
          p_pedido_id: p.pedidoId,
          p_novo_status: p.novoStatus,
        }),
      )
      return ['pedidos', 'historico']

    case 'CANCELAR_PEDIDO':
      check(
        await supabase.rpc('cancelar_pedido', {
          p_pedido_id: p.pedidoId,
          p_motivo: p.motivo ?? null,
        }),
      )
      return ['pedidos', 'historico']

    case 'REGISTRAR_PAGAMENTO':
      check(
        await supabase.rpc('registrar_pagamento', {
          p_pedido_id: p.pedidoId,
          p_valor: p.valor,
          p_forma: p.formaPagamento,
          p_data: p.data,
          p_observacoes: p.observacoes ?? null,
        }),
      )
      return ['pedidos', 'pagamentos', 'historico']

    case 'SALVAR_ETAPA': {
      const e = p as EtapaPedido
      check(
        await supabase
          .from('etapas_pedido')
          .upsert({ chave: e.chave, nome: e.nome, cor: e.cor, ordem: e.ordem, fixa: e.fixa }),
      )
      return ['etapas']
    }

    case 'REORDENAR_ETAPAS':
      check(await supabase.rpc('reordenar_etapas', { p_chaves: p }))
      return ['etapas']

    case 'EXCLUIR_ETAPA':
      check(
        await supabase.rpc('excluir_etapa', {
          p_chave: p.chave,
          p_mover_para: p.moverPara ?? null,
        }),
      )
      return ['etapas', 'pedidos', 'historico']

    case 'SALVAR_ORCAMENTO':
      check(await supabase.rpc('salvar_orcamento', { p }))
      return ['orcamentos']

    case 'ALTERAR_STATUS_ORCAMENTO':
      check(await supabase.from('orcamentos').update({ status: p.status }).eq('id', p.id))
      return []

    case 'EXCLUIR_ORCAMENTO':
      check(await supabase.from('orcamentos').delete().eq('id', p))
      return []

    case 'CONVERTER_ORCAMENTO':
      check(
        await supabase.rpc('converter_orcamento_em_pedido', {
          p_orcamento_id: p.id,
          p_prazo: p.prazoEntrega || null,
        }),
      )
      return ['orcamentos', 'pedidos', 'historico', 'clientes']

    case 'SALVAR_CLIENTE':
      check(await supabase.from('clientes').upsert(clienteParaRow(p)))
      return []

    case 'EXCLUIR_CLIENTE':
      check(await supabase.from('clientes').delete().eq('id', p))
      return []

    case 'SALVAR_PRODUTO':
      check(await supabase.from('produtos').upsert(produtoParaRow(p)))
      await limparImagensProduto(
        p.id,
        (p.imagens ?? [p.imagemUrl ?? '']).filter((u) => u.includes('/produtos/')),
      ).catch(() => undefined)
      return []

    case 'EXCLUIR_PRODUTO':
      check(await supabase.from('produtos').delete().eq('id', p))
      await limparImagensProduto(p, []).catch(() => undefined)
      return []

    case 'SALVAR_DESPESA':
      check(await supabase.from('despesas').upsert(despesaParaRow(p)))
      return []

    case 'ALTERNAR_STATUS_DESPESA': {
      const d = proximo.despesas.find((x) => x.id === p)
      if (d) check(await supabase.from('despesas').update({ status: d.status }).eq('id', p))
      return []
    }

    case 'EXCLUIR_DESPESA':
      check(await supabase.from('despesas').delete().eq('id', p))
      return []

    case 'SALVAR_DESCONTO':
      check(await supabase.from('descontos').upsert(descontoParaRow(p)))
      return []

    case 'EXCLUIR_DESCONTO':
      check(await supabase.from('descontos').delete().eq('id', p))
      return []

    case 'SALVAR_BANNER':
      check(await supabase.from('banners').upsert(bannerParaRow(p)))
      await limparImagensBanner(p.id, [p.imagemComputador, p.imagemCelular]).catch(() => undefined)
      return []

    case 'EXCLUIR_BANNER':
      check(await supabase.from('banners').delete().eq('id', p))
      await limparImagensBanner(p, []).catch(() => undefined)
      return []

    case 'REORDENAR_BANNERS': {
      // Grava só os banners que mudaram de posição
      const ordemAntes = new Map(anterior.banners.map((b) => [b.id, b.ordem]))
      for (const b of proximo.banners)
        if (ordemAntes.get(b.id) !== b.ordem)
          check(await supabase.from('banners').update({ ordem: b.ordem }).eq('id', b.id))
      return []
    }

    case 'ADICIONAR_CATEGORIA_PRODUTO': {
      const c = p as CategoriaProduto
      if (anterior.categoriasProduto.some((x) => x.nome.toLowerCase() === c.nome.toLowerCase()))
        return []
      // Mesma função (com as validações do banco) usada pela tela de Categorias
      check(
        await supabase.rpc('salvar_categoria_produto', {
          p_antiga: null,
          p_nome: c.nome,
          p_linha: c.linha ?? null,
        }),
      )
      if (c.imagemUrl) await gravarFotoCategoria(c.nome, c.imagemUrl)
      return ['categoriasProduto']
    }

    case 'SALVAR_CATEGORIA_PRODUTO': {
      check(
        await supabase.rpc('salvar_categoria_produto', {
          p_antiga: p.antiga,
          p_nome: p.nome,
          p_linha: p.linha ?? null,
        }),
      )
      const antes = anterior.categoriasProduto.find((c) => c.nome === p.antiga)
      if ((antes?.imagemUrl ?? null) !== (p.imagemUrl ?? null)) {
        await gravarFotoCategoria(p.nome, p.imagemUrl ?? null)
        // A foto antiga deixa de ser usada: sai do armazenamento
        await limparFotosCategorias(proximo.categoriasProduto).catch(() => undefined)
      }
      return ['categoriasProduto', 'produtos', 'banners', 'config']
    }

    case 'EXCLUIR_CATEGORIA_PRODUTO':
      check(
        await supabase.rpc('excluir_categoria_produto', {
          p_nome: p.nome,
          p_mover_para: p.moverPara ?? null,
        }),
      )
      await limparFotosCategorias(proximo.categoriasProduto).catch(() => undefined)
      return ['categoriasProduto', 'produtos', 'banners', 'config']

    case 'ADICIONAR_CATEGORIA': {
      const nova = String(p).trim()
      if (!nova || anterior.categoriasDespesa.includes(nova)) return []
      check(await supabase.from('categorias_despesa').insert({ nome: nova }))
      return []
    }

    case 'RENOMEAR_CATEGORIA':
      check(await supabase.rpc('renomear_categoria', { p_antiga: p.antiga, p_nova: p.nova }))
      return ['categoriasDespesa', 'despesas']

    case 'EXCLUIR_CATEGORIA':
      check(await supabase.from('categorias_despesa').delete().eq('nome', p))
      return []

    case 'ADICIONAR_FORMA_PAGAMENTO':
      if (anterior.formasPagamento.includes(p)) return []
      check(await supabase.from('formas_pagamento').insert({ nome: p }))
      return []

    case 'REMOVER_FORMA_PAGAMENTO':
      check(await supabase.from('formas_pagamento').delete().eq('nome', p))
      return []

    case 'ATUALIZAR_CONFIG':
      check(await supabase.from('loja_config').update(configParaRow(proximo.config)).eq('id', 1))
      return []

    default:
      return []
  }
}

/** Converte erros técnicos (rede, banco) em mensagens claras em português. */
export function mensagemErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  const m = msg.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network request'))
    return 'Sem conexão com a internet. Verifique a rede e tente de novo.'
  if (m.includes('jwt') || m.includes('refresh token'))
    return 'Sua sessão expirou. Saia e entre novamente.'
  if (m.includes('foreign key'))
    return 'Este registro está sendo usado em outro lugar (ex.: pedidos) e não pode ser excluído.'
  if (m.includes('duplicate key') || m.includes('unique'))
    return 'Já existe um registro com esses dados.'
  if (
    m.includes('permission denied') ||
    m.includes('row-level security') ||
    m.includes('acesso negado')
  )
    return 'Você não tem permissão para fazer isso.'
  if (m.includes('check constraint') || m.includes('violates'))
    return 'Algum valor informado é inválido. Confira os campos e tente de novo.'
  // Mensagens das regras do banco já vêm em português
  if (/[ãçéêíóúâ]/i.test(msg) && msg.length < 200) return msg
  return 'Não foi possível concluir a operação. Tente novamente.'
}
