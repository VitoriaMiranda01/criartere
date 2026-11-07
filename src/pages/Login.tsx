import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { dispatch } = useCriartere()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!email || !senha) {
      setErro('Por favor, preencha o e-mail e a senha.')
      return
    }

    setCarregando(true)
    setTimeout(() => {
      // Aceita as credenciais de demonstração ou qualquer credencial no modo demo
      if (
        (email.trim().toLowerCase() === 'demonstracao@criartere.com' &&
          senha === 'criartere2024') ||
        email.includes('@')
      ) {
        dispatch({ type: 'LOGIN', payload: { email } })
        navigate('/')
      } else {
        setErro('E-mail ou senha incorretos.')
        setCarregando(false)
      }
    }, 400)
  }

  const handleEntrarDemo = () => {
    setEmail('demonstracao@criartere.com')
    setSenha('criartere2024')
    setErro('')
    setCarregando(true)
    setTimeout(() => {
      dispatch({ type: 'LOGIN', payload: { email: 'demonstracao@criartere.com' } })
      navigate('/')
    }, 350)
  }

  return (
    <div className="min-h-screen w-full bg-[#F7F3EA] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Elementos orgânicos decorativos sutis no fundo */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#DFC3AE] opacity-25 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#C48864] opacity-15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(12,16,20,0.06)] border border-[#DFC3AE]/60 p-8 sm:p-10">
          {/* Wordmark Criartere */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <span className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0C1014]">
                Criartere
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#C48864] inline-block animate-pulse" />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#6B4B36] font-medium">
              Ateliê &amp; Cerâmica Artesanal
            </p>
            <div className="mt-4 pt-4 border-t border-[#DFC3AE]/40">
              <h1 className="font-serif text-xl font-semibold text-[#0C1014]">Sistema de Gestão</h1>
              <p className="text-xs text-[#6B4B36] mt-1">
                Acesse o painel administrativo e financeiro da loja
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="demonstracao@criartere.com"
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
                </Label>
                <span className="text-[11px] text-[#6B4B36]/80">Demo: criartere2024</span>
              </div>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/30 text-sm"
              />
            </div>

            {erro && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {erro}
              </div>
            )}

            <Button
              type="submit"
              disabled={carregando}
              className="w-full h-11 bg-[#C48864] hover:bg-[#B0764F] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {carregando ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Atalho Demo */}
          <div className="mt-6 pt-5 border-t border-[#DFC3AE]/50 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleEntrarDemo}
              disabled={carregando}
              className="w-full h-10 border-[#DFC3AE] bg-[#F7F3EA]/60 hover:bg-[#F7F3EA] text-[#6B4B36] hover:text-[#0C1014] text-xs font-medium rounded-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C48864]" />
              <span>Entrar como demonstração (1 clique)</span>
            </Button>
            <p className="text-[11px] text-[#6B4B36]/80 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#4C8A5A]" />
              <span>Modo demonstração com dados de exemplo pré-carregados</span>
            </p>
          </div>
        </div>

        {/* Rodapé discreto */}
        <div className="text-center mt-6 text-xs text-[#6B4B36]/70 flex items-center justify-center gap-2">
          <span>Criartere &copy; {new Date().getFullYear()}</span>
          <span>&bull;</span>
          <span>Ambiente de Apresentação</span>
        </div>
      </div>
    </div>
  )
}
