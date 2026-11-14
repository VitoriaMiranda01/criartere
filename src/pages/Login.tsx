import { useTituloPagina } from '@/hooks/use-titulo-pagina'
import { CampoSenha } from '@/components/common/CampoSenha'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, ShieldCheck, Store, LogOut } from 'lucide-react'

export default function Login() {
  const { state, dispatch } = useCriartere()

  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  useTituloPagina(modo === 'entrar' ? 'Entrar' : 'Criar conta', { indexar: true })

  // Logado com uma conta de cliente da loja virtual: não acessa o painel
  if (state.autenticado && state.clienteLoja) {
    return (
      <AvisoContaCliente
        email={state.usuarioAtual.email}
        onSair={() => dispatch({ type: 'LOGOUT' })}
      />
    )
  }

  // Já logado: vai direto para o painel
  if (state.autenticado) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setAviso('')
    if (state.acessoNegado) dispatch({ type: '__MESCLAR', payload: { acessoNegado: false } })

    if (!email || !senha) {
      setErro('Por favor, preencha o e-mail e a senha.')
      return
    }

    setCarregando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })
      if (error) {
        setErro(
          error.message.includes('Email not confirmed')
            ? 'Não foi possível entrar com esta conta. Fale com um administrador.'
            : 'E-mail ou senha incorretos.',
        )
      }
      // Em caso de sucesso, a sessão é detectada pelo store e o usuário é redirecionado
    } else {
      if (senha.length < 8) {
        setErro('A senha precisa ter pelo menos 8 caracteres.')
        setCarregando(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { nome: nome.trim() || undefined },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) {
        setErro(
          error.message.toLowerCase().includes('already registered')
            ? 'Este e-mail já tem conta. Use "Já tenho conta. Entrar".'
            : 'Não foi possível criar a conta. Tente novamente em instantes.',
        )
      } else if (!data.session) {
        // A conta é confirmada automaticamente no banco: entra direto
        const { error: erroLogin } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        })
        if (erroLogin) {
          setAviso('Conta criada! Agora é só entrar com seu e-mail e senha.')
          setModo('entrar')
        }
      } else {
        setAviso('Conta criada com sucesso!')
        setModo('entrar')
      }
    }
    setCarregando(false)
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#F7F3EA] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Elementos orgânicos decorativos sutis no fundo */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#DFC3AE] opacity-25 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#A5683F] opacity-15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(12,16,20,0.06)] border border-[#DFC3AE]/60 px-6 py-6 sm:p-10">
          {/* Wordmark Criartere */}
          <div className="text-center mb-5 sm:mb-8">
            <img
              src="/logo.png"
              alt="Logo Criartere"
              className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-2 sm:mb-3"
            />
            <div className="inline-flex items-center justify-center gap-2 mb-1 sm:mb-2">
              <span className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0C1014]">
                Criartere
              </span>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#6B4B36] font-medium">
              Impressão 3D &amp; Gráfica
            </p>
            <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-[#DFC3AE]/40">
              <h1 className="font-serif text-lg sm:text-xl font-semibold text-[#0C1014]">
                Sistema de Gestão
              </h1>
              <p className="text-xs text-[#6B4B36] mt-1">
                Acesse o painel administrativo e financeiro da loja
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {modo === 'cadastrar' && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="nome"
                  className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                >
                  Nome
                  <Opcional />
                </Label>
                <Input
                  id="nome"
                  autoComplete="name"
                  placeholder="Como devemos te chamar"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/30 text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                E-mail
                <Obrigatorio />
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/30 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="senha"
                  className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                >
                  Senha
                  <Obrigatorio />
                </Label>
              </div>
              <CampoSenha
                id="senha"
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/30 text-sm"
              />
            </div>

            {aviso && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 font-medium">
                {aviso}
              </div>
            )}

            {state.acessoNegado && !erro && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
              >
                Somente administradores podem acessar este site.
              </div>
            )}

            {erro && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {erro}
              </div>
            )}

            <Button
              type="submit"
              disabled={carregando}
              className="w-full h-11 bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {carregando ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{modo === 'entrar' ? 'Entrar no Sistema' : 'Criar conta'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 pt-4 sm:mt-6 sm:pt-5 border-t border-[#DFC3AE]/50 text-center">
            <button
              type="button"
              onClick={() => {
                setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
                setErro('')
                setAviso('')
              }}
              className="text-xs font-medium text-[#6B4B36] hover:text-[#0C1014] underline-offset-4 hover:underline"
            >
              {modo === 'entrar' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta. Entrar'}
            </button>
            <p className="text-[11px] text-[#6B4B36]/90 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#3F7A4E]" />
              <span>Área restrita a administradores da loja</span>
            </p>
          </div>
        </div>

        {/* Rodapé discreto */}
        <div className="text-center mt-4 sm:mt-6 text-xs text-[#6B4B36]/90 flex items-center justify-center gap-2">
          <span>Criartere &copy; {new Date().getFullYear()}</span>
          <span>&bull;</span>
          <span>Sistema de Gestão</span>
        </div>
      </div>
    </div>
  )
}

/** Conta de cliente tentando abrir o painel: explica e oferece a loja ou trocar de conta. */
function AvisoContaCliente({ email, onSair }: { email: string; onSair: () => void }) {
  useTituloPagina('Acesso restrito')
  return (
    <div className="min-h-[100dvh] w-full bg-[#F7F3EA] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgba(12,16,20,0.06)] border border-[#DFC3AE]/60 p-8 text-center">
        <img src="/logo.png" alt="Logo Criartere" className="w-14 h-14 mx-auto mb-4" />
        <h1 className="font-serif text-xl font-semibold text-[#0C1014]">
          Somente administradores podem acessar este site.
        </h1>
        <p className="text-sm text-[#6B4B36] mt-2">
          {email ? (
            <>
              A conta <strong className="text-[#0C1014]">{email}</strong> é de cliente da loja
              virtual.
            </>
          ) : (
            'Esta conta é de cliente da loja virtual.'
          )}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/"
            className="h-11 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <Store className="w-4 h-4" /> Ir para a loja virtual
          </Link>
          <button
            type="button"
            onClick={onSair}
            className="h-11 rounded-lg border border-[#DFC3AE] text-[#6B4B36] hover:text-[#0C1014] text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sair e entrar com outra conta
          </button>
        </div>
      </div>
    </div>
  )
}
