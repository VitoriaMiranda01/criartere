import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  carregarFatias,
  persistirAcao,
  buscarPerfil,
  mensagemErro,
  TODAS_FATIAS,
  Fatia,
} from './db'
import { CriartereState } from './types'
import { ETAPAS_PADRAO } from './etapas'
import { CATEGORIAS_DESPESA_PADRAO, CONFIG_PADRAO, FORMAS_PAGAMENTO_PADRAO } from './padroes'
import { agoraFormatado, hojeISO } from '@/lib/datas'
import { dadosDemo, simularServidor } from './demo'
import {
  Cliente,
  Produto,
  Pedido,
  EtapaPedido,
  Orcamento,
  OrcamentoStatus,
  Despesa,
  Pagamento,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  LojaConfig,
} from '@/types/criartere'

const initialState: CriartereState = {
  autenticado: false,
  sessaoVerificada: false,
  carregando: false,
  autorizado: false,
  acessoNegado: false,
  falhaVerificacao: false,
  modoDemo: false,
  usuarioAtual: {
    id: '',
    nome: '',
    email: '',
    papel: '',
  },
  clientes: [],
  produtos: [],
  pedidos: [],
  etapas: ETAPAS_PADRAO,
  orcamentos: [],
  pagamentos: [],
  despesas: [],
  categoriasDespesa: CATEGORIAS_DESPESA_PADRAO,
  formasPagamento: [...FORMAS_PAGAMENTO_PADRAO],
  historico: [],
  config: CONFIG_PADRAO,
}

export type Action =
  | { type: '__MESCLAR'; payload: Partial<CriartereState> }
  | { type: 'LOGOUT' }
  // Pedidos
  | {
      type: 'CRIAR_PEDIDO'
      payload: Omit<Pedido, 'id' | 'codigo' | 'dataCriacao'> & { id?: string }
    }
  | { type: 'ATUALIZAR_PEDIDO'; payload: Pedido }
  | { type: 'ALTERAR_STATUS_PEDIDO'; payload: { pedidoId: string; novoStatus: OrderStatus } }
  | { type: 'CANCELAR_PEDIDO'; payload: { pedidoId: string; motivo?: string } }
  // Etapas (colunas do Kanban)
  | { type: 'SALVAR_ETAPA'; payload: EtapaPedido }
  | { type: 'REORDENAR_ETAPAS'; payload: string[] }
  | { type: 'EXCLUIR_ETAPA'; payload: { chave: string; moverPara?: string } }
  // Orçamentos
  | { type: 'SALVAR_ORCAMENTO'; payload: Orcamento }
  | { type: 'ALTERAR_STATUS_ORCAMENTO'; payload: { id: string; status: OrcamentoStatus } }
  | { type: 'EXCLUIR_ORCAMENTO'; payload: string }
  | { type: 'CONVERTER_ORCAMENTO'; payload: { id: string; prazoEntrega?: string } }
  // Pagamentos
  | {
      type: 'REGISTRAR_PAGAMENTO'
      payload: {
        pedidoId: string
        valor: number
        formaPagamento: PaymentMethod
        data: string
        observacoes?: string
      }
    }
  // Clientes
  | { type: 'SALVAR_CLIENTE'; payload: Cliente }
  | { type: 'EXCLUIR_CLIENTE'; payload: string }
  // Produtos
  | { type: 'SALVAR_PRODUTO'; payload: Produto }
  | { type: 'EXCLUIR_PRODUTO'; payload: string }
  // Despesas
  | { type: 'SALVAR_DESPESA'; payload: Despesa }
  | { type: 'ALTERNAR_STATUS_DESPESA'; payload: string }
  | { type: 'EXCLUIR_DESPESA'; payload: string }
  // Categorias
  | { type: 'ADICIONAR_CATEGORIA'; payload: string }
  | { type: 'RENOMEAR_CATEGORIA'; payload: { antiga: string; nova: string } }
  | { type: 'EXCLUIR_CATEGORIA'; payload: string }
  // Formas de Pagamento
  | { type: 'ADICIONAR_FORMA_PAGAMENTO'; payload: PaymentMethod }
  | { type: 'REMOVER_FORMA_PAGAMENTO'; payload: PaymentMethod }
  // Config
  | { type: 'ATUALIZAR_CONFIG'; payload: Partial<LojaConfig> }

function criartereReducer(state: CriartereState, action: Action): CriartereState {
  switch (action.type) {
    case '__MESCLAR':
      return { ...state, ...action.payload }

    case 'LOGOUT':
      return state

    case 'CRIAR_PEDIDO': {
      // Gerar próximo código sequencial
      const numeros = state.pedidos
        .map((p) => {
          return parseInt(p.codigo.replace(/\D/g, ''), 10) || 0
        })
        .filter((n) => !isNaN(n))
      const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0
      const codigo = String(maxNum + 1).padStart(4, '0')
      const id = action.payload.id ?? crypto.randomUUID()

      const novoPedido: Pedido = {
        ...action.payload,
        id,
        codigo,
        dataCriacao: hojeISO(),
      }

      const eventoHistorico = {
        id: `h-${Date.now()}`,
        pedidoId: id,
        dataHora: agoraFormatado(),
        tipo: 'criacao' as const,
        descricao: `Pedido cadastrado no valor de R$ ${novoPedido.valorTotal.toFixed(2)}`,
      }

      return {
        ...state,
        pedidos: [novoPedido, ...state.pedidos],
        historico: [eventoHistorico, ...state.historico],
      }
    }

    case 'ATUALIZAR_PEDIDO': {
      const atualizado = action.payload
      const eventoHistorico = {
        id: `h-${Date.now()}`,
        pedidoId: atualizado.id,
        dataHora: agoraFormatado(),
        tipo: 'edicao' as const,
        descricao: 'Dados do pedido foram atualizados',
      }

      return {
        ...state,
        pedidos: state.pedidos.map((p) => (p.id === atualizado.id ? atualizado : p)),
        historico: [eventoHistorico, ...state.historico],
      }
    }

    case 'ALTERAR_STATUS_PEDIDO': {
      const { pedidoId, novoStatus } = action.payload
      const pedido = state.pedidos.find((p) => p.id === pedidoId)
      if (!pedido || pedido.status === novoStatus) return state

      const nomeEtapa = (chave: string) =>
        state.etapas.find((e) => e.chave === chave)?.nome || chave

      const eventoHistorico = {
        id: `h-${Date.now()}`,
        pedidoId,
        dataHora: agoraFormatado(),
        tipo: 'status' as const,
        descricao: `Status alterado de "${nomeEtapa(pedido.status)}" para "${nomeEtapa(novoStatus)}"`,
      }

      return {
        ...state,
        pedidos: state.pedidos.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p)),
        historico: [eventoHistorico, ...state.historico],
      }
    }

    case 'CANCELAR_PEDIDO': {
      const { pedidoId, motivo } = action.payload
      const pedido = state.pedidos.find((p) => p.id === pedidoId)
      if (!pedido) return state

      const eventoHistorico = {
        id: `h-${Date.now()}`,
        pedidoId,
        dataHora: agoraFormatado(),
        tipo: 'cancelamento' as const,
        descricao: `Pedido cancelado${motivo ? `: ${motivo}` : ''}. Valores previstos removidos do faturamento.`,
      }

      return {
        ...state,
        pedidos: state.pedidos.map((p) => (p.id === pedidoId ? { ...p, status: 'cancelado' } : p)),
        historico: [eventoHistorico, ...state.historico],
      }
    }

    case 'REGISTRAR_PAGAMENTO': {
      const { pedidoId, valor, formaPagamento, data, observacoes } = action.payload
      const pedido = state.pedidos.find((p) => p.id === pedidoId)
      if (!pedido) return state

      const jaPago = state.pagamentos
        .filter((p) => p.pedidoId === pedidoId)
        .reduce((s, p) => s + p.valor, 0)

      const novoTotalPago = jaPago + valor
      const quitado = novoTotalPago >= pedido.valorTotal - 0.01
      const novoStatusPagamento: PaymentStatus = quitado
        ? 'pago'
        : novoTotalPago > 0
          ? 'parcial'
          : 'pendente'

      const novoPagamento: Pagamento = {
        id: `pag-${Date.now()}`,
        pedidoId,
        valor,
        data,
        formaPagamento,
        observacoes,
      }

      const restante = Math.max(0, pedido.valorTotal - novoTotalPago)
      const descPagamento = quitado
        ? `Pagamento final de R$ ${valor.toFixed(2)} registrado (${formaPagamento}). Pedido quitado com sucesso!`
        : `Pagamento parcial de R$ ${valor.toFixed(2)} registrado (${formaPagamento}). Saldo restante: R$ ${restante.toFixed(2)}`

      const eventoHistorico = {
        id: `h-${Date.now()}`,
        pedidoId,
        dataHora: agoraFormatado(),
        tipo: 'pagamento' as const,
        descricao: descPagamento,
      }

      return {
        ...state,
        pedidos: state.pedidos.map((p) =>
          p.id === pedidoId ? { ...p, statusPagamento: novoStatusPagamento } : p,
        ),
        pagamentos: [novoPagamento, ...state.pagamentos],
        historico: [eventoHistorico, ...state.historico],
      }
    }

    case 'SALVAR_ETAPA': {
      const etapa = action.payload
      const existe = state.etapas.some((e) => e.chave === etapa.chave)
      return {
        ...state,
        etapas: existe
          ? state.etapas.map((e) => (e.chave === etapa.chave ? etapa : e))
          : [...state.etapas, etapa],
      }
    }

    case 'REORDENAR_ETAPAS': {
      const ordem = action.payload
      return {
        ...state,
        etapas: state.etapas.map((e) =>
          ordem.includes(e.chave) ? { ...e, ordem: ordem.indexOf(e.chave) + 1 } : e,
        ),
      }
    }

    case 'EXCLUIR_ETAPA': {
      const { chave, moverPara } = action.payload
      return {
        ...state,
        etapas: state.etapas.filter((e) => e.chave !== chave),
        pedidos: moverPara
          ? state.pedidos.map((p) => (p.status === chave ? { ...p, status: moverPara } : p))
          : state.pedidos,
      }
    }

    case 'SALVAR_ORCAMENTO': {
      const orc = action.payload
      const existe = state.orcamentos.some((o) => o.id === orc.id)
      return {
        ...state,
        orcamentos: existe
          ? state.orcamentos.map((o) => (o.id === orc.id ? orc : o))
          : [orc, ...state.orcamentos],
      }
    }

    case 'ALTERAR_STATUS_ORCAMENTO': {
      const { id, status } = action.payload
      return {
        ...state,
        orcamentos: state.orcamentos.map((o) => (o.id === id ? { ...o, status } : o)),
      }
    }

    case 'EXCLUIR_ORCAMENTO':
      return { ...state, orcamentos: state.orcamentos.filter((o) => o.id !== action.payload) }

    case 'CONVERTER_ORCAMENTO':
      return {
        ...state,
        orcamentos: state.orcamentos.map((o) =>
          o.id === action.payload.id ? { ...o, status: 'aprovado' } : o,
        ),
      }

    case 'SALVAR_CLIENTE': {
      const cli = action.payload
      const existe = state.clientes.some((c) => c.id === cli.id)
      return {
        ...state,
        clientes: existe
          ? state.clientes.map((c) => (c.id === cli.id ? cli : c))
          : [cli, ...state.clientes],
      }
    }

    case 'EXCLUIR_CLIENTE': {
      const clienteId = action.payload
      return {
        ...state,
        clientes: state.clientes.filter((c) => c.id !== clienteId),
      }
    }

    case 'SALVAR_PRODUTO': {
      const prod = action.payload
      const existe = state.produtos.some((p) => p.id === prod.id)
      return {
        ...state,
        produtos: existe
          ? state.produtos.map((p) => (p.id === prod.id ? prod : p))
          : [prod, ...state.produtos],
      }
    }

    case 'EXCLUIR_PRODUTO': {
      const produtoId = action.payload
      return {
        ...state,
        produtos: state.produtos.filter((p) => p.id !== produtoId),
      }
    }

    case 'SALVAR_DESPESA': {
      const desp = action.payload
      const existe = state.despesas.some((d) => d.id === desp.id)
      return {
        ...state,
        despesas: existe
          ? state.despesas.map((d) => (d.id === desp.id ? desp : d))
          : [desp, ...state.despesas],
      }
    }

    case 'ALTERNAR_STATUS_DESPESA': {
      const id = action.payload
      return {
        ...state,
        despesas: state.despesas.map((d) =>
          d.id === id ? { ...d, status: d.status === 'pago' ? 'pendente' : 'pago' } : d,
        ),
      }
    }

    case 'EXCLUIR_DESPESA': {
      const id = action.payload
      return {
        ...state,
        despesas: state.despesas.filter((d) => d.id !== id),
      }
    }

    case 'ADICIONAR_CATEGORIA': {
      const nova = action.payload.trim()
      if (!nova || state.categoriasDespesa.includes(nova)) return state
      return {
        ...state,
        categoriasDespesa: [...state.categoriasDespesa, nova],
      }
    }

    case 'RENOMEAR_CATEGORIA': {
      const { antiga, nova } = action.payload
      if (!nova.trim() || antiga === nova) return state
      return {
        ...state,
        categoriasDespesa: state.categoriasDespesa.map((c) => (c === antiga ? nova.trim() : c)),
        despesas: state.despesas.map((d) =>
          d.categoria === antiga ? { ...d, categoria: nova.trim() } : d,
        ),
      }
    }

    case 'EXCLUIR_CATEGORIA': {
      const categoria = action.payload
      return {
        ...state,
        categoriasDespesa: state.categoriasDespesa.filter((c) => c !== categoria),
      }
    }

    case 'ADICIONAR_FORMA_PAGAMENTO': {
      const nova = action.payload
      if (state.formasPagamento.includes(nova)) return state
      return {
        ...state,
        formasPagamento: [...state.formasPagamento, nova],
      }
    }

    case 'REMOVER_FORMA_PAGAMENTO': {
      const forma = action.payload
      return {
        ...state,
        formasPagamento: state.formasPagamento.filter((f) => f !== forma),
      }
    }

    case 'ATUALIZAR_CONFIG': {
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      }
    }

    default:
      return state
  }
}

interface CriartereContextType {
  state: CriartereState
  dispatch: (action: Action) => void
  recarregar: () => Promise<void>
}

/** Tabela do banco -> partes da tela que dependem dela. */
const FATIAS_POR_TABELA: Record<string, Fatia[]> = {
  clientes: ['clientes'],
  produtos: ['produtos'],
  pedidos: ['pedidos'],
  pedido_itens: ['pedidos'],
  pedido_historico: ['historico'],
  pagamentos: ['pagamentos'],
  orcamentos: ['orcamentos'],
  orcamento_itens: ['orcamentos'],
  despesas: ['despesas'],
  categorias_despesa: ['categoriasDespesa'],
  formas_pagamento: ['formasPagamento'],
  etapas_pedido: ['etapas'],
  loja_config: ['config'],
}

const CriartereContext = createContext<CriartereContextType | undefined>(undefined)

export function CriartereProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(criartereReducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  // Fila para gravar as ações no banco na mesma ordem em que aconteceram
  const filaRef = useRef<Promise<unknown>>(Promise.resolve())
  // Gravações ainda na fila e fatias a recarregar quando a fila esvaziar.
  // Recarregar no meio da fila desfaria por um instante as ações seguintes.
  const pendentesRef = useRef(0)
  const fatiasARecarregarRef = useRef(new Set<Fatia>())

  const mesclar = useCallback((payload: Partial<CriartereState>) => {
    stateRef.current = { ...stateRef.current, ...payload }
    baseDispatch({ type: '__MESCLAR', payload })
  }, [])

  const recarregarFatias = useCallback(
    async (fatias: Fatia[]) => {
      if (fatias.length === 0) return
      mesclar(await carregarFatias(fatias))
    },
    [mesclar],
  )

  const recarregar = useCallback(async () => {
    if (stateRef.current.modoDemo) return
    mesclar({ carregando: true })
    try {
      await recarregarFatias(TODAS_FATIAS)
    } catch (e) {
      toast.error(`Não foi possível carregar os dados. ${mensagemErro(e)}`)
    } finally {
      mesclar({ carregando: false })
    }
  }, [mesclar, recarregarFatias])

  // Sessão do Supabase Auth
  useEffect(() => {
    // Marca que a última tentativa de entrar foi de alguém que não é administrador
    let negarAcesso = false

    const aplicarSessao = async (
      userId: string | undefined,
      email: string | undefined,
      nomeMeta?: string,
    ) => {
      if (!userId || !email) {
        mesclar({
          ...initialState,
          sessaoVerificada: true,
          acessoNegado: negarAcesso,
        })
        negarAcesso = false
        return
      }
      mesclar({
        autenticado: true,
        carregando: true,
        sessaoVerificada: true,
        acessoNegado: false,
        falhaVerificacao: false,
      })
      try {
        const perfil = await buscarPerfil(userId)
        if (perfil?.papel === 'desenvolvedor') {
          // Desenvolvedor(a): usa o sistema com dados fictícios, sem ler nada do banco
          mesclar({
            autorizado: true,
            modoDemo: true,
            usuarioAtual: {
              id: userId,
              nome: perfil.nome || nomeMeta || email.split('@')[0],
              email,
              papel: 'Desenvolvedor(a)',
              avatarUrl: perfil.avatarUrl ?? undefined,
            },
            ...dadosDemo(),
          })
          return
        }
        if (perfil?.papel !== 'admin') {
          // Conta existe, mas não é administradora: encerra a sessão e avisa no login
          negarAcesso = true
          await supabase.auth.signOut()
          return
        }
        mesclar({
          autorizado: true,
          usuarioAtual: {
            id: userId,
            nome: perfil.nome || nomeMeta || email.split('@')[0],
            email,
            papel: 'Administrador(a)',
            avatarUrl: perfil.avatarUrl ?? undefined,
          },
        })
        await recarregarFatias(TODAS_FATIAS)
      } catch (e) {
        // Sem confirmar o acesso, mostra a tela de erro com "Tentar de novo"
        if (!stateRef.current.autorizado) mesclar({ falhaVerificacao: true })
        else toast.error(`Não foi possível carregar os dados. ${mensagemErro(e)}`)
      } finally {
        mesclar({ carregando: false })
      }
    }

    let usuarioAtualId: string | undefined
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      const userId = sessao?.user?.id
      if (evento !== 'INITIAL_SESSION' && userId === usuarioAtualId) return
      usuarioAtualId = userId
      // Executa fora do callback para não travar o cliente de autenticação
      setTimeout(
        () => aplicarSessao(userId, sessao?.user?.email, sessao?.user?.user_metadata?.nome),
        0,
      )
    })
    return () => data.subscription.unsubscribe()
  }, [mesclar, recarregarFatias])

  // Atualização ao vivo: quando outra pessoa (ou outro aparelho) altera algo,
  // o banco avisa e só a parte afetada é recarregada.
  useEffect(() => {
    if (!state.autorizado || state.modoDemo) return
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const recebidas = new Set<Fatia>()
    const aplicar = () => {
      temporizador = undefined
      // Com gravações nossas na fila, deixa para recarregar quando ela esvaziar
      if (pendentesRef.current > 0) {
        recebidas.forEach((f) => fatiasARecarregarRef.current.add(f))
        recebidas.clear()
        return
      }
      const fatias = [...recebidas]
      recebidas.clear()
      filaRef.current = filaRef.current.then(() => recarregarFatias(fatias).catch(() => undefined))
    }
    const canal = supabase.channel('criartere-dados')
    for (const [tabela, fatias] of Object.entries(FATIAS_POR_TABELA)) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => {
        fatias.forEach((f) => recebidas.add(f))
        clearTimeout(temporizador)
        temporizador = setTimeout(aplicar, 600)
      })
    }
    canal.subscribe()
    return () => {
      clearTimeout(temporizador)
      supabase.removeChannel(canal)
    }
  }, [state.autorizado, state.modoDemo, recarregarFatias])

  // Mantém os dados atualizados quando o sistema é usado em mais de um aparelho:
  // ao voltar para a aba (após 2 min) ou quando a internet volta, busca tudo de novo.
  useEffect(() => {
    let ultimaSincronizacao = Date.now()
    const sincronizar = (forcar = false) => {
      const s = stateRef.current
      if (!s.autenticado || !s.autorizado || s.carregando || s.modoDemo) return
      if (!forcar && Date.now() - ultimaSincronizacao < 2 * 60 * 1000) return
      ultimaSincronizacao = Date.now()
      // Espera as gravações pendentes antes de recarregar
      filaRef.current = filaRef.current.then(() =>
        recarregarFatias(TODAS_FATIAS).catch(() => undefined),
      )
    }
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') sincronizar()
    }
    const aoReconectar = () => sincronizar(true)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('online', aoReconectar)
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('online', aoReconectar)
    }
  }, [recarregarFatias])

  const dispatch = useCallback(
    (actionOriginal: Action) => {
      let action = actionOriginal

      if (action.type === 'LOGOUT') {
        supabase.auth.signOut()
        return
      }
      // Novo pedido recebe o id definitivo já no cliente
      if (action.type === 'CRIAR_PEDIDO' && !action.payload.id) {
        action = { ...action, payload: { ...action.payload, id: crypto.randomUUID() } }
      }

      const anterior = stateRef.current
      const proximo = criartereReducer(anterior, action)
      if (proximo === anterior) return

      // Modo desenvolvedor: aplica só na tela, sem gravar no banco
      if (anterior.modoDemo) {
        const simulado = simularServidor(action, proximo)
        stateRef.current = simulado
        baseDispatch(action)
        if (simulado !== proximo) baseDispatch({ type: '__MESCLAR', payload: simulado })
        return
      }

      // Atualização otimista: a tela responde na hora
      stateRef.current = proximo
      baseDispatch(action)

      pendentesRef.current++
      filaRef.current = filaRef.current.then(async () => {
        try {
          const fatias = await persistirAcao(action, anterior, proximo)
          fatias.forEach((f) => fatiasARecarregarRef.current.add(f))
        } catch (e) {
          toast.error(`Não foi salvo: ${mensagemErro(e)}`)
          TODAS_FATIAS.forEach((f) => fatiasARecarregarRef.current.add(f))
        } finally {
          pendentesRef.current--
        }
        if (pendentesRef.current === 0 && fatiasARecarregarRef.current.size > 0) {
          const fatias = [...fatiasARecarregarRef.current]
          fatiasARecarregarRef.current.clear()
          await recarregarFatias(fatias).catch(() => undefined)
        }
      })
    },
    [recarregarFatias],
  )

  return (
    <CriartereContext.Provider value={{ state, dispatch, recarregar }}>
      {children}
    </CriartereContext.Provider>
  )
}

export function useCriartere() {
  const context = useContext(CriartereContext)
  if (!context) {
    throw new Error('useCriartere deve ser usado dentro de um CriartereProvider')
  }
  return context
}
