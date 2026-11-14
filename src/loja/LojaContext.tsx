/* Estado da loja virtual: sessão do cliente, vitrine, favoritos e carrinho.
   É independente do store do painel administrativo (CriartereContext). */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  ProdutoVitrine,
  ContatoLoja,
  ItemCarrinho,
  listarVitrine,
  buscarContatoLoja,
  listarFavoritos,
  adicionarFavorito,
  removerFavorito,
  listarCarrinho,
  adicionarAoCarrinho,
  alterarQuantidadeItem,
  removerItemCarrinho,
  buscarPapel,
  mensagemErroLoja,
} from './api'

export interface UsuarioLoja {
  id: string
  nome: string
  email: string
  papel: string // 'cliente' | 'admin' | 'desenvolvedor'
}

interface LojaContextValue {
  sessaoVerificada: boolean
  usuario: UsuarioLoja | null
  produtos: ProdutoVitrine[]
  carregandoProdutos: boolean
  erroProdutos: boolean
  contato: ContatoLoja | null
  favoritos: Set<string>
  carrinho: ItemCarrinho[]
  carregandoConta: boolean
  quantidadeNoCarrinho: number
  recarregarVitrine: () => Promise<void>
  alternarFavorito: (produto: ProdutoVitrine) => Promise<void>
  adicionarCarrinho: (produto: ProdutoVitrine, quantidade: number) => Promise<boolean>
  alterarQuantidade: (itemId: string, quantidade: number) => Promise<void>
  removerItem: (itemId: string) => Promise<void>
  sair: () => Promise<void>
}

const LojaContext = createContext<LojaContextValue | null>(null)

export function LojaProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [sessaoVerificada, setSessaoVerificada] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioLoja | null>(null)
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)
  const [erroProdutos, setErroProdutos] = useState(false)
  const [contato, setContato] = useState<ContatoLoja | null>(null)
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [carregandoConta, setCarregandoConta] = useState(false)
  const usuarioRef = useRef<UsuarioLoja | null>(null)
  usuarioRef.current = usuario

  // ---------- Vitrine (pública) ----------
  const recarregarVitrine = useCallback(async () => {
    try {
      const [lista, cont] = await Promise.all([
        listarVitrine(),
        buscarContatoLoja().catch(() => null),
      ])
      setProdutos(lista)
      if (cont) setContato(cont)
      setErroProdutos(false)
    } catch {
      setErroProdutos(true)
    } finally {
      setCarregandoProdutos(false)
    }
  }, [])

  // ---------- Dados do cliente ----------
  const carregarConta = useCallback(async () => {
    if (!usuarioRef.current) return
    setCarregandoConta(true)
    try {
      const [favs, itens] = await Promise.all([listarFavoritos(), listarCarrinho()])
      setFavoritos(new Set(favs))
      setCarrinho(itens)
    } catch (e) {
      toast.error(`Não foi possível carregar sua conta. ${mensagemErroLoja(e)}`)
    } finally {
      setCarregandoConta(false)
    }
  }, [])

  useEffect(() => {
    recarregarVitrine()
  }, [recarregarVitrine])

  // Sessão (mesmo login do Supabase Auth usado no painel)
  useEffect(() => {
    let atualId: string | undefined
    const aplicar = async (id?: string, email?: string, nomeMeta?: string) => {
      if (!id || !email) {
        setUsuario(null)
        setFavoritos(new Set())
        setCarrinho([])
        setSessaoVerificada(true)
        return
      }
      let perfil: { nome: string | null; papel: string } | null = null
      try {
        perfil = await buscarPapel(id)
      } catch {
        // sem perfil carregado, trata como cliente comum
      }
      const u: UsuarioLoja = {
        id,
        email,
        nome: perfil?.nome || nomeMeta || email.split('@')[0],
        papel: perfil?.papel ?? 'cliente',
      }
      usuarioRef.current = u
      setUsuario(u)
      setSessaoVerificada(true)
      carregarConta()
    }
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      const id = sessao?.user?.id
      if (evento !== 'INITIAL_SESSION' && id === atualId) return
      atualId = id
      setTimeout(() => aplicar(id, sessao?.user?.email, sessao?.user?.user_metadata?.nome), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [carregarConta])

  // Ao voltar para a aba, atualiza preços e disponibilidade (o painel pode ter mudado algo)
  useEffect(() => {
    let ultima = Date.now()
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < 60_000) return
      ultima = Date.now()
      recarregarVitrine()
      carregarConta()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [recarregarVitrine, carregarConta])

  // Visitante tentando usar algo da conta: leva para o login e volta depois
  const exigirLogin = useCallback(
    (mensagem: string) => {
      if (usuarioRef.current) return false
      toast(mensagem, { description: 'Entre ou crie sua conta gratuitamente.' })
      navigate('/entrar', { state: { voltarPara: location.pathname + location.search } })
      return true
    },
    [navigate, location.pathname, location.search],
  )

  // ---------- Ações ----------
  const alternarFavorito = useCallback(
    async (produto: ProdutoVitrine) => {
      if (exigirLogin('Entre na sua conta para salvar favoritos.')) return
      const era = favoritos.has(produto.id)
      setFavoritos((atual) => {
        const novo = new Set(atual)
        if (era) novo.delete(produto.id)
        else novo.add(produto.id)
        return novo
      })
      try {
        if (era) await removerFavorito(produto.id)
        else await adicionarFavorito(produto.id)
        toast.success(era ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
      } catch (e) {
        setFavoritos((atual) => {
          const novo = new Set(atual)
          if (era) novo.add(produto.id)
          else novo.delete(produto.id)
          return novo
        })
        toast.error(`Não foi possível atualizar os favoritos. ${mensagemErroLoja(e)}`)
      }
    },
    [exigirLogin, favoritos],
  )

  const adicionarCarrinho = useCallback(
    async (produto: ProdutoVitrine, quantidade: number) => {
      if (exigirLogin('Entre na sua conta para usar o carrinho.')) return false
      try {
        await adicionarAoCarrinho(produto.id, quantidade)
        setCarrinho(await listarCarrinho())
        toast.success(`${produto.nome} adicionado ao carrinho`, {
          action: { label: 'Ver carrinho', onClick: () => navigate('/carrinho') },
        })
        return true
      } catch (e) {
        toast.error(`Não foi possível adicionar ao carrinho. ${mensagemErroLoja(e)}`)
        return false
      }
    },
    [exigirLogin, navigate],
  )

  const alterarQuantidade = useCallback(async (itemId: string, quantidade: number) => {
    const q = Math.max(1, Math.min(999, Math.round(quantidade) || 1))
    let anterior: ItemCarrinho[] = []
    setCarrinho((atual) => {
      anterior = atual
      return atual.map((i) => (i.id === itemId ? { ...i, quantidade: q } : i))
    })
    try {
      await alterarQuantidadeItem(itemId, q)
    } catch (e) {
      setCarrinho(anterior)
      toast.error(`Não foi possível alterar a quantidade. ${mensagemErroLoja(e)}`)
    }
  }, [])

  const removerItem = useCallback(async (itemId: string) => {
    let anterior: ItemCarrinho[] = []
    setCarrinho((atual) => {
      anterior = atual
      return atual.filter((i) => i.id !== itemId)
    })
    try {
      await removerItemCarrinho(itemId)
    } catch (e) {
      setCarrinho(anterior)
      toast.error(`Não foi possível remover o produto. ${mensagemErroLoja(e)}`)
    }
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
    toast('Você saiu da sua conta.')
    navigate('/')
  }, [navigate])

  const quantidadeNoCarrinho = carrinho.reduce((s, i) => s + i.quantidade, 0)

  return (
    <LojaContext.Provider
      value={{
        sessaoVerificada,
        usuario,
        produtos,
        carregandoProdutos,
        erroProdutos,
        contato,
        favoritos,
        carrinho,
        carregandoConta,
        quantidadeNoCarrinho,
        recarregarVitrine,
        alternarFavorito,
        adicionarCarrinho,
        alterarQuantidade,
        removerItem,
        sair,
      }}
    >
      {children}
    </LojaContext.Provider>
  )
}

export function useLoja() {
  const ctx = useContext(LojaContext)
  if (!ctx) throw new Error('useLoja deve ser usado dentro de LojaProvider')
  return ctx
}
