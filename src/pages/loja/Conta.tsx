import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Heart, KeyRound, LogOut, ShoppingBag, UserRound } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { useSeo } from '@/lib/seo'
import { CampoSenha } from '@/components/common/CampoSenha'
import { Obrigatorio } from '@/components/common/MarcadorCampo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoja } from '@/loja/LojaContext'
import { CarregandoLoja } from '@/loja/componentes'
import { salvarNomeConta, trocarSenha } from '@/loja/api'
import { PrecisaEntrar } from './PrecisaEntrar'

const classeCampo =
  'h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/40 text-sm placeholder:text-[#6B4B36]/50'
const classeRotulo = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'
const classeBotao =
  'h-11 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60'

function Girando() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )
}

export default function Conta() {
  useSeo({ titulo: 'Minha conta', caminho: '/conta', indexar: false })
  const { usuario, sessaoVerificada, favoritos, quantidadeNoCarrinho, atualizarUsuario, sair } =
    useLoja()

  if (!sessaoVerificada) return <CarregandoLoja />
  if (!usuario) {
    return (
      <PrecisaEntrar
        icone={UserRound}
        titulo="Entre para ver sua conta"
        texto="Na sua conta você atualiza seus dados e troca sua senha."
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#A5683F] text-white font-serif text-2xl font-semibold flex items-center justify-center shrink-0 overflow-hidden">
          {usuario.avatarUrl ? (
            <img src={usuario.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            usuario.nome.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold truncate">Minha conta</h1>
          <p className="text-sm text-[#6B4B36] truncate">{usuario.email}</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link
          to="/meus-pedidos"
          className="flex items-center gap-3 rounded-2xl bg-white border border-[#DFC3AE]/60 p-4 hover:border-[#C48864] transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-[#F6EDE7] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#C48864]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Meus pedidos</span>
            <span className="block text-xs text-[#6B4B36]">Acompanhe seus pedidos</span>
          </span>
        </Link>
        <Link
          to="/favoritos"
          className="flex items-center gap-3 rounded-2xl bg-white border border-[#DFC3AE]/60 p-4 hover:border-[#C48864] transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-[#F6EDE7] flex items-center justify-center">
            <Heart className="w-5 h-5 text-[#C48864]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Meus favoritos</span>
            <span className="block text-xs text-[#6B4B36]">
              {favoritos.size === 1 ? '1 produto salvo' : `${favoritos.size} produtos salvos`}
            </span>
          </span>
        </Link>
        <Link
          to="/carrinho"
          className="flex items-center gap-3 rounded-2xl bg-white border border-[#DFC3AE]/60 p-4 hover:border-[#C48864] transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-[#F6EDE7] flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-[#C48864]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Meu carrinho</span>
            <span className="block text-xs text-[#6B4B36]">
              {quantidadeNoCarrinho === 1 ? '1 item' : `${quantidadeNoCarrinho} itens`}
            </span>
          </span>
        </Link>
      </div>

      <DadosPessoais
        nomeAtual={usuario.nome}
        email={usuario.email}
        avatarUrl={usuario.avatarUrl}
        onSalvo={(nome) => atualizarUsuario({ nome })}
      />
      {usuario.provedores.includes('email') ? (
        <TrocarSenha email={usuario.email} />
      ) : (
        <Cartao
          icone={KeyRound}
          titulo="Senha"
          descricao="Você entra na loja com a sua conta Google."
        >
          <p className="flex items-center gap-2.5 text-sm text-[#6B4B36] bg-[#F7F3EA] rounded-lg p-3">
            <FcGoogle className="w-5 h-5 shrink-0" aria-hidden="true" />
            Sua senha é a da conta Google. Para trocá-la, acesse as configurações da sua conta
            Google.
          </p>
        </Cartao>
      )}

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => sair()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  )
}

function Cartao({
  icone: Icone,
  titulo,
  descricao,
  children,
}: {
  icone: React.ComponentType<{ className?: string }>
  titulo: string
  descricao: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-[#DFC3AE]/60 p-5 sm:p-7">
      <div className="flex items-start gap-3 mb-5">
        <Icone className="w-5 h-5 text-[#A5683F] mt-1 shrink-0" />
        <div>
          <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
          <p className="text-sm text-[#6B4B36]">{descricao}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function DadosPessoais({
  nomeAtual,
  email,
  avatarUrl,
  onSalvo,
}: {
  nomeAtual: string
  email: string
  avatarUrl: string | null
  onSalvo: (nome: string) => void
}) {
  const [nome, setNome] = useState(nomeAtual)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  useEffect(() => setNome(nomeAtual), [nomeAtual])

  const alterado = nome.trim() !== nomeAtual.trim()

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    const limpo = nome.trim()
    if (!limpo) return setErro('Informe seu nome.')
    if (limpo.length > 80) return setErro('O nome pode ter no máximo 80 caracteres.')
    setSalvando(true)
    try {
      await salvarNomeConta(limpo, avatarUrl)
      onSalvo(limpo)
      toast.success('Seus dados foram atualizados.')
    } catch {
      setErro('Não foi possível salvar agora. Tente novamente em instantes.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao icone={UserRound} titulo="Meus dados" descricao="Como a Criartere vai te chamar.">
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="conta-nome" className={classeRotulo}>
              Nome
              <Obrigatorio />
            </Label>
            <Input
              id="conta-nome"
              autoComplete="name"
              value={nome}
              maxLength={80}
              onChange={(e) => setNome(e.target.value)}
              className={classeCampo}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conta-email" className={classeRotulo}>
              E-mail
            </Label>
            <Input
              id="conta-email"
              value={email}
              readOnly
              aria-describedby="conta-email-ajuda"
              className={`${classeCampo} text-[#6B4B36] cursor-not-allowed`}
            />
            <p id="conta-email-ajuda" className="text-[11px] text-[#6B4B36]/80">
              O e-mail é usado para entrar e não pode ser alterado aqui.
            </p>
          </div>
        </div>
        {erro && (
          <p role="alert" className="text-xs text-red-700 font-medium">
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={salvando || !alterado} className={classeBotao}>
            {salvando ? <Girando /> : 'Salvar dados'}
          </button>
        </div>
      </form>
    </Cartao>
  )
}

function TrocarSenha({ email }: { email: string }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!atual || !nova || !confirmacao) return setErro('Preencha os três campos.')
    if (nova.length < 8) return setErro('A nova senha precisa ter pelo menos 8 caracteres.')
    if (nova !== confirmacao) return setErro('A confirmação não é igual à nova senha.')
    if (nova === atual) return setErro('A nova senha precisa ser diferente da atual.')
    setSalvando(true)
    try {
      await trocarSenha(email, atual, nova)
      setAtual('')
      setNova('')
      setConfirmacao('')
      toast.success('Senha alterada com sucesso!')
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      setErro(
        codigo === 'SENHA_ATUAL_INCORRETA'
          ? 'A senha atual está incorreta.'
          : codigo === 'SENHA_IGUAL'
            ? 'A nova senha precisa ser diferente da atual.'
            : codigo === 'SENHA_FRACA'
              ? 'Escolha uma senha mais forte (mínimo de 8 caracteres).'
              : 'Não foi possível trocar a senha agora. Tente novamente em instantes.',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao
      icone={KeyRound}
      titulo="Trocar senha"
      descricao="Por segurança, confirme sua senha atual antes de escolher a nova."
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        {/* Ajuda os gerenciadores de senha a salvar a senha nova na conta certa */}
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <div className="space-y-1.5">
          <Label htmlFor="senha-atual" className={classeRotulo}>
            Senha atual
            <Obrigatorio />
          </Label>
          <CampoSenha
            id="senha-atual"
            autoComplete="current-password"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            className={classeCampo}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="senha-nova" className={classeRotulo}>
              Nova senha
              <Obrigatorio />
            </Label>
            <CampoSenha
              id="senha-nova"
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              className={classeCampo}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-confirmacao" className={classeRotulo}>
              Confirmar nova senha
              <Obrigatorio />
            </Label>
            <CampoSenha
              id="senha-confirmacao"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className={classeCampo}
            />
          </div>
        </div>
        {erro && (
          <p role="alert" className="text-xs text-red-700 font-medium">
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={salvando} className={classeBotao}>
            {salvando ? <Girando /> : 'Trocar senha'}
          </button>
        </div>
      </form>
    </Cartao>
  )
}
