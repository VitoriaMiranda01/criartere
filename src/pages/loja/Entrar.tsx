import React, { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react'
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

  useSeo({
    titulo: modo === 'entrar' ? 'Entrar na loja' : 'Criar conta na loja',
    caminho: '/entrar',
    indexar: false,
  })

  if (!sessaoVerificada) return <CarregandoLoja />
  if (usuario) return <Navigate to={voltarPara} replace />

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
    'h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/40 text-sm placeholder:text-[#6B4B36]/50'
  const classeRotulo = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 rounded-3xl overflow-hidden border border-[#DFC3AE]/60 bg-white shadow-[0_8px_30px_rgba(12,16,20,0.06)]">
      <div className="hidden md:flex flex-col justify-between bg-[#0C1014] text-[#F7F3EA] p-10 relative overflow-hidden">
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#C48864] opacity-30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <img src="/logo.png" alt="" className="w-12 h-12 mb-6" />
          <h2 className="font-serif text-3xl font-semibold leading-tight">
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

      <div className="p-6 sm:p-10">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold">
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="text-sm text-[#6B4B36] mt-1 mb-6">
          {modo === 'entrar'
            ? 'Bem-vinda(o) de volta! Acesse seus favoritos e seu carrinho.'
            : 'É rápido e gratuito.'}
        </p>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          {modo === 'cadastrar' && (
            <div className="space-y-1.5">
              <Label htmlFor="loja-nome" className={classeRotulo}>
                Nome
                <Obrigatorio />
              </Label>
              <Input
                id="loja-nome"
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como devemos te chamar"
                className={classeCampo}
              />
            </div>
          )}
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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

        <div className="mt-6 pt-5 border-t border-[#DFC3AE]/50 text-center space-y-3">
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
          <p>
            <Link to="/" className="text-xs text-[#6B4B36] hover:text-[#0C1014]">
              Continuar navegando sem entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
