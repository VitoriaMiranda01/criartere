import React, { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import {
  carregarGoogle,
  gerarNonce,
  GOOGLE_CLIENT_ID,
  RespostaCredencial,
} from '@/loja/googleLogin'
import { useSeo } from '@/lib/seo'
import { supabase } from '@/lib/supabase'
import { CampoSenha } from '@/components/common/CampoSenha'
import { Obrigatorio } from '@/components/common/MarcadorCampo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoja } from '@/loja/LojaContext'
import { CarregandoLoja } from '@/loja/componentes'

interface EstadoNavegacao {
  voltarPara?: string
  modo?: 'entrar' | 'cadastrar'
}

export default function Entrar() {
  const location = useLocation()
  const navState = (location.state ?? {}) as EstadoNavegacao
  // Só volta para páginas da loja (nunca para o painel nem para outro site)
  const voltarPara =
    navState.voltarPara &&
    navState.voltarPara.startsWith('/') &&
    !navState.voltarPara.startsWith('//') &&
    !navState.voltarPara.startsWith('/admin')
      ? navState.voltarPara
      : '/'

  const { usuario, sessaoVerificada } = useLoja()
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>(navState.modo ?? 'entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoGoogle, setCarregandoGoogle] = useState(false)

  useSeo({
    titulo: modo === 'entrar' ? 'Entrar na loja' : 'Criar conta na loja',
    caminho: '/entrar',
    indexar: false,
  })

  if (!sessaoVerificada) return <CarregandoLoja />
  if (usuario) return <Navigate to={voltarPara} replace />

  // Plano B (se o botão oficial do Google não carregar): login pela página do Google
  const entrarComGoogle = async () => {
    setErro('')
    setCarregandoGoogle(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${voltarPara}`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setCarregandoGoogle(false)
      setErro('Não foi possível entrar com o Google agora. Tente novamente ou use seu e-mail.')
    }
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    const emailLimpo = email.trim()
    if (modo === 'cadastrar' && !nome.trim()) return setErro('Informe seu nome.')
    if (!emailLimpo || !senha) return setErro('Preencha o e-mail e a senha.')
    if (modo === 'cadastrar' && senha.length < 8) {
      return setErro('A senha precisa ter pelo menos 8 caracteres.')
    }

    setCarregando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: senha,
      })
      if (error) setErro('E-mail ou senha incorretos.')
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
        options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
      })
      if (error) {
        setErro(
          error.message.toLowerCase().includes('already registered')
            ? 'Este e-mail já tem conta. Use "Já tenho conta".'
            : 'Não foi possível criar a conta. Tente novamente em instantes.',
        )
      } else if (!data.session) {
        // A conta é confirmada automaticamente no banco: entra direto
        const { error: erroLogin } = await supabase.auth.signInWithPassword({
          email: emailLimpo,
          password: senha,
        })
        if (erroLogin) {
          setModo('entrar')
          setErro('Conta criada! Agora entre com seu e-mail e senha.')
        }
      }
    }
    // Com sucesso, a sessão é detectada pela loja e a página redireciona
    setCarregando(false)
  }

  const classeCampo =
    'h-10 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/40 text-sm placeholder:text-[#6B4B36]/50'
  const classeRotulo = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'

  return (
    <div className="w-full max-w-[880px] mx-auto grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] rounded-3xl overflow-hidden border border-[#DFC3AE]/60 bg-white shadow-[0_8px_30px_rgba(12,16,20,0.06)]">
      <div className="hidden md:flex flex-col justify-between bg-[#0C1014] text-[#F7F3EA] p-8 relative overflow-hidden">
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#C48864] opacity-30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <img src="/logo.png" alt="" className="w-11 h-11 mb-5" />
          <h2 className="font-serif text-[28px] font-semibold leading-tight">
            Sua conta na <span className="text-[#DFC3AE]">Criartere</span>
          </h2>
          <p className="text-sm text-[#F7F3EA]/75 mt-3 leading-relaxed">
            Guarde seus produtos preferidos e organize suas compras para encomendar quando quiser.
          </p>
        </div>
        <ul className="relative space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <Heart className="w-4 h-4 text-[#C48864]" /> Lista de favoritos salva na conta
          </li>
          <li className="flex items-center gap-3">
            <ShoppingBag className="w-4 h-4 text-[#C48864]" /> Carrinho acessível de qualquer
            aparelho
          </li>
        </ul>
      </div>

      <div className="p-6 sm:px-8 sm:py-7">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold">
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="text-sm text-[#6B4B36] mt-1 mb-4">
          {modo === 'entrar'
            ? 'Bem-vinda(o) de volta! Acesse seus favoritos e seu carrinho.'
            : 'É rápido e gratuito: salve favoritos e monte seu carrinho.'}
        </p>

        <BotaoGoogle
          modo={modo}
          alternativo={
            <button
              type="button"
              onClick={entrarComGoogle}
              disabled={carregandoGoogle}
              className="w-full h-11 rounded-lg border border-[#DFC3AE] bg-white hover:bg-[#F7F3EA] text-sm font-semibold text-[#0C1014] inline-flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
            >
              {carregandoGoogle ? (
                <span className="inline-block w-4 h-4 border-2 border-[#C48864] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FcGoogle className="w-5 h-5" aria-hidden="true" />
              )}
              Continuar com Google
            </button>
          }
          onErro={setErro}
        />

        <div className="flex items-center gap-3 my-3.5" aria-hidden="true">
          <span className="h-px flex-1 bg-[#DFC3AE]/70" />
          <span className="text-[11px] uppercase tracking-widest text-[#6B4B36]/80">
            ou com e-mail
          </span>
          <span className="h-px flex-1 bg-[#DFC3AE]/70" />
        </div>

        <form onSubmit={enviar} className="space-y-3" noValidate>
          <div className={modo === 'cadastrar' ? 'grid sm:grid-cols-2 gap-3' : ''}>
            {modo === 'cadastrar' && (
              <div className="space-y-1">
                <Label htmlFor="loja-nome" className={classeRotulo}>
                  Nome
                  <Obrigatorio />
                </Label>
                <Input
                  id="loja-nome"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className={classeCampo}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="loja-email" className={classeRotulo}>
                E-mail
                <Obrigatorio />
              </Label>
              <Input
                id="loja-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={classeCampo}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="loja-senha" className={classeRotulo}>
              Senha
              <Obrigatorio />
            </Label>
            <CampoSenha
              id="loja-senha"
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={modo === 'cadastrar' ? 'Mínimo de 8 caracteres' : '••••••••'}
              className={classeCampo}
            />
          </div>

          {erro && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full h-11 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {carregando ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3.5 border-t border-[#DFC3AE]/50 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
              setErro('')
            }}
            className="text-sm font-semibold text-[#A5683F] hover:text-[#8C5636] underline-offset-4 hover:underline"
          >
            {modo === 'entrar' ? 'Ainda não tem conta? Criar conta' : 'Já tenho conta. Entrar'}
          </button>
          <Link to="/" className="text-xs text-[#6B4B36] hover:text-[#0C1014]">
            Continuar navegando sem entrar
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Botão oficial "Continuar com Google". A janela do Google é aberta pelo próprio
 * site (mostra criartere.com.br). Se a biblioteca do Google não carregar
 * (internet lenta, bloqueador), mostra o botão alternativo.
 */
function BotaoGoogle({
  modo,
  alternativo,
  onErro,
}: {
  modo: 'entrar' | 'cadastrar'
  alternativo: React.ReactNode
  onErro: (mensagem: string) => void
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'falhou'>('carregando')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [google, nonce] = await Promise.all([carregarGoogle(), gerarNonce()])
        if (!ativo || !caixa.current) return
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hash,
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
          use_fedcm_for_button: true,
          itp_support: true,
          context: modo === 'cadastrar' ? 'signup' : 'signin',
          callback: async (resposta: RespostaCredencial) => {
            setEntrando(true)
            onErro('')
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: resposta.credential,
              nonce: nonce.original,
            })
            if (error) {
              setEntrando(false)
              onErro(
                'Não foi possível entrar com o Google agora. Tente novamente ou use seu e-mail.',
              )
            }
            // Com sucesso, a sessão é detectada pela loja e a página redireciona
          },
        })
        const largura = Math.min(400, Math.max(200, Math.floor(caixa.current.offsetWidth)))
        caixa.current.innerHTML = ''
        google.renderButton(caixa.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: modo === 'cadastrar' ? 'signup_with' : 'continue_with',
          logo_alignment: 'center',
          locale: 'pt-BR',
          width: largura,
        })
        setEstado('pronto')
      } catch {
        if (ativo) setEstado('falhou')
      }
    })()
    return () => {
      ativo = false
      window.google?.accounts?.id?.cancel()
    }
  }, [modo, onErro])

  if (estado === 'falhou') return <>{alternativo}</>

  return (
    <div className="relative min-h-[44px] flex items-center justify-center">
      <div
        ref={caixa}
        className={`w-full flex justify-center ${estado === 'pronto' && !entrando ? '' : 'invisible'}`}
      />
      {(estado === 'carregando' || entrando) && (
        <div className="absolute inset-0 rounded-lg border border-[#DFC3AE] bg-white flex items-center justify-center gap-2.5 text-sm font-semibold text-[#6B4B36]">
          <span className="inline-block w-4 h-4 border-2 border-[#C48864] border-t-transparent rounded-full animate-spin" />
          {entrando ? 'Entrando...' : 'Continuar com Google'}
        </div>
      )}
    </div>
  )
}
