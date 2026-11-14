/* Estrutura das páginas da loja virtual: cabeçalho, conteúdo e rodapé */
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FaWhatsapp, FaInstagram } from 'react-icons/fa'
import {
  Heart,
  ShoppingBag,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Store,
  ClipboardList,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ErroTela } from '@/components/common/ErroTela'
import { cn } from '@/lib/utils'
import { LojaProvider, useLoja } from './LojaContext'
import { CarregandoLoja } from './componentes'
import { numeroWhatsApp } from './api'

export default function LojaLayout() {
  // Ativa os estilos da loja (avisos, barras de rolagem, seleção de texto, preenchimento automático)
  useEffect(() => {
    document.documentElement.dataset.area = 'loja'
    return () => {
      delete document.documentElement.dataset.area
    }
  }, [])

  return (
    <LojaProvider>
      <LojaEstrutura />
    </LojaProvider>
  )
}

function Contador({ valor }: { valor: number }) {
  if (valor <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A5683F] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
      {valor > 99 ? '99+' : valor}
    </span>
  )
}

function LojaEstrutura() {
  const { usuario, favoritos, quantidadeNoCarrinho, sair, contato, sessaoVerificada } = useLoja()
  // Tela de entrar/criar conta: ocupa só a altura da tela (sem rodapé, sem rolagem).
  // Finalizar pedido: o conteúdo ocupa a primeira tela inteira e o rodapé vem depois.
  const caminho = useLocation().pathname
  const telaFocada = caminho === '/entrar'
  const telaCheia = caminho === '/finalizar'
  const [menuAberto, setMenuAberto] = useState(false)
  const ehAdmin = usuario?.papel === 'admin' || usuario?.papel === 'desenvolvedor'
  const whatsapp = numeroWhatsApp(contato?.whatsapp ?? '')
  const instagram = (contato?.instagram ?? '').replace(/^@/, '').trim()
  const linkInstagram = instagram
    ? instagram.startsWith('http')
      ? instagram
      : `https://instagram.com/${instagram}`
    : ''

  const linkNav = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-semibold transition-colors px-1 py-1 border-b-2',
      isActive
        ? 'text-[#0C1014] border-[#C48864]'
        : 'text-[#6B4B36] border-transparent hover:text-[#0C1014]',
    )

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F3EA] text-[#0C1014] font-sans">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white px-3 py-2 rounded-lg shadow"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-40 bg-[#F7F3EA]/90 backdrop-blur border-b border-[#DFC3AE]/60">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-4">
          <button
            type="button"
            className="md:hidden -ml-1 p-2 rounded-lg text-[#6B4B36] hover:bg-white"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
          >
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0"
            aria-label="Criartere — início da loja"
          >
            <img src="/logo.png" alt="" className="w-9 h-9" />
            <span className="leading-none">
              <span className="block font-serif text-xl font-bold tracking-tight">Criartere</span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#6B4B36] mt-0.5">
                Impressão 3D &amp; Gráfica
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-8" aria-label="Loja">
            <NavLink to="/" end className={linkNav}>
              Catálogo
            </NavLink>
            <NavLink to="/favoritos" className={linkNav}>
              Favoritos
            </NavLink>
            <NavLink to="/carrinho" className={linkNav}>
              Carrinho
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              to="/favoritos"
              className="relative p-2 rounded-full text-[#6B4B36] hover:bg-white hover:text-[#0C1014]"
              aria-label={`Favoritos (${favoritos.size})`}
            >
              <Heart className="w-5 h-5" />
              <Contador valor={favoritos.size} />
            </Link>
            <Link
              to="/carrinho"
              className="relative p-2 rounded-full text-[#6B4B36] hover:bg-white hover:text-[#0C1014]"
              aria-label={`Carrinho (${quantidadeNoCarrinho} itens)`}
            >
              <ShoppingBag className="w-5 h-5" />
              <Contador valor={quantidadeNoCarrinho} />
            </Link>

            {!sessaoVerificada ? (
              <span className="w-9 h-9" />
            ) : usuario ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="ml-1 w-9 h-9 rounded-full bg-[#A5683F] text-white font-semibold text-sm flex items-center justify-center hover:bg-[#8C5636] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C48864]"
                    aria-label="Minha conta"
                  >
                    {usuario.nome.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-xl border-[#DFC3AE] bg-white p-1.5 shadow-[0_10px_30px_rgba(12,16,20,0.10)] [&_[role=menuitem]]:rounded-lg [&_[role=menuitem]]:py-2 [&_[role=menuitem]]:text-[#6B4B36] [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]:focus]:bg-[#F6EDE7] [&_[role=menuitem]:focus]:text-[#0C1014] [&_[role=separator]]:bg-[#DFC3AE]/60"
                >
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold text-[#0C1014] truncate">{usuario.nome}</p>
                    <p className="text-xs text-[#6B4B36] truncate">{usuario.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/conta">
                      <User className="w-4 h-4 mr-2" /> Minha conta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/meus-pedidos">
                      <ClipboardList className="w-4 h-4 mr-2" /> Meus pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favoritos">
                      <Heart className="w-4 h-4 mr-2" /> Meus favoritos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/carrinho">
                      <ShoppingBag className="w-4 h-4 mr-2" /> Meu carrinho
                    </Link>
                  </DropdownMenuItem>
                  {ehAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Painel administrativo
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => sair()}>
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/entrar"
                className="ml-1 inline-flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-full bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
          </div>
        </div>

        {menuAberto && (
          <nav
            className="md:hidden border-t border-[#DFC3AE]/60 bg-[#F7F3EA] px-4 py-2 flex flex-col"
            aria-label="Loja"
          >
            {[
              { to: '/', label: 'Catálogo', icon: Store, end: true },
              { to: '/favoritos', label: 'Favoritos', icon: Heart },
              { to: '/carrinho', label: 'Carrinho', icon: ShoppingBag },
            ].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-2 py-3 rounded-lg text-sm font-semibold',
                    isActive ? 'text-[#0C1014] bg-white' : 'text-[#6B4B36]',
                  )
                }
              >
                <l.icon className="w-4 h-4" /> {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main
        id="conteudo"
        className={cn(
          'flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10',
          telaFocada ? 'flex flex-col justify-center py-4 sm:py-6' : 'py-6 sm:py-10',
          telaCheia && 'lg:min-h-[calc(100svh-4rem)] lg:flex lg:flex-col lg:justify-center lg:py-6',
        )}
      >
        <ErroTela>
          <Suspense fallback={<CarregandoLoja />}>
            <Outlet />
          </Suspense>
        </ErroTela>
      </main>

      <footer className={cn('border-t border-[#DFC3AE]/60 bg-white/60', telaFocada && 'hidden')}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-10 h-10" />
            <div>
              <p className="font-serif text-lg font-bold">Criartere</p>
              <p className="text-xs text-[#6B4B36]">Impressão 3D, papelaria e personalizados</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-[#DFC3AE] bg-white text-sm text-[#0C1014] hover:border-[#25D366]"
              >
                <FaWhatsapp className="w-4 h-4 text-[#25D366]" aria-hidden="true" /> WhatsApp
              </a>
            )}
            {linkInstagram && (
              <a
                href={linkInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-[#DFC3AE] bg-white text-sm text-[#0C1014] hover:border-[#C48864]"
              >
                <FaInstagram className="w-4 h-4 text-[#A5683F]" aria-hidden="true" /> Instagram
              </a>
            )}
          </div>
        </div>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 pb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B4B36]/90">
          <span>Criartere &copy; {new Date().getFullYear()}</span>
          <p>
            Feito com carinho por{' '}
            <a
              href={`https://wa.me/5521979371559?text=${encodeURIComponent('Olá! Tenho interesse em construir meu site.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#A5683F] transition-colors hover:text-[#0C1014]"
            >
              Vitória Miranda
            </a>
            .
          </p>
        </div>
      </footer>

      {whatsapp && caminho !== '/finalizar' && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
            'Olá! Vim do site da Criartere e gostaria de mais informações.',
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-flutuante"
          aria-label="Falar com a Criartere pelo WhatsApp"
        >
          <span className="whatsapp-flutuante__rotulo" aria-hidden="true">
            Fale conosco
          </span>
          <FaWhatsapp className="w-8 h-8" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
