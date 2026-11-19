/* Estrutura das páginas da loja virtual: cabeçalho, conteúdo e rodapé */
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import * as PopoverPrimitive from '@radix-ui/react-popover'
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
  Box,
  PenTool,
  BookHeart,
  ClipboardList,
  ChevronDown,
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
import { caminhoCategoria, LINHAS_CATALOGO, LinhaCatalogo, PAGINA_SOBRE } from './seo-dados'
import { BarraAvisos } from './BarraAvisos'
import { BuscaCabecalho } from './BuscaLoja'

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
  const {
    usuario,
    favoritos,
    quantidadeNoCarrinho,
    sair,
    contato,
    sessaoVerificada,
    categoriasLoja,
    avisos,
  } = useLoja()
  // Categorias de cada aba (cadastro do painel; enquanto não carrega, a divisão padrão)
  const categoriasDaLinha = (linha: LinhaCatalogo) => {
    const cadastradas = categoriasLoja.filter((c) => c.linha === linha).map((c) => c.nome)
    return cadastradas.length || categoriasLoja.length
      ? cadastradas
      : LINHAS_CATALOGO[linha].categorias
  }
  // Telas de entrar/criar conta e de finalizar pedido: ocupam só a altura da tela
  // (sem rodapé, sem rolagem)
  const local = useLocation()
  const caminho = local.pathname
  // Ao abrir outra página da loja, começa do topo (links "Ver todos" e de categoria descem
  // até os produtos por conta própria)
  useEffect(() => {
    const estado = local.state as { rolarParaProdutos?: boolean } | null
    if (!estado?.rolarParaProdutos && !local.hash) window.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho])
  const telaFocada = caminho === '/entrar' || caminho === '/finalizar'
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

      {/* Letreiro de avisos (configurado em Loja virtual → Avisos); fora das telas focadas */}
      {!telaFocada && <BarraAvisos frases={avisos} />}

      <header className="sticky top-0 z-40 bg-[#F7F3EA]/90 backdrop-blur border-b border-[#DFC3AE]/60">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="lg:hidden -ml-1 p-2 rounded-lg text-[#6B4B36] hover:bg-white"
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

          <nav
            className="hidden lg:flex items-center gap-5 xl:gap-6 ml-6 xl:ml-8 whitespace-nowrap"
            aria-label="Loja"
          >
            {(['3d', 'papelaria'] as LinhaCatalogo[]).map((linha) => (
              <MenuCatalogo
                key={linha}
                linha={linha}
                categorias={categoriasDaLinha(linha)}
                linkNav={linkNav}
              />
            ))}
            <NavLink to={PAGINA_SOBRE.caminho} className={linkNav}>
              {PAGINA_SOBRE.menu}
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <BuscaCabecalho />
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
            className="lg:hidden border-t border-[#DFC3AE]/60 bg-[#F7F3EA] px-4 py-2 flex flex-col"
            aria-label="Loja"
          >
            {[
              { to: '/', label: 'Início', icon: Store, end: true },
              { to: LINHAS_CATALOGO['3d'].caminho, label: LINHAS_CATALOGO['3d'].menu, icon: Box },
              {
                to: LINHAS_CATALOGO.papelaria.caminho,
                label: LINHAS_CATALOGO.papelaria.menu,
                icon: PenTool,
              },
              { to: PAGINA_SOBRE.caminho, label: PAGINA_SOBRE.menu, icon: BookHeart },
            ]
              .map((l) => (
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
              ))
              .flatMap((item, i) => {
                // Depois do Catálogo 3D (i = 1) e do Catálogo Papelaria (i = 2), as categorias deles
                const linha: LinhaCatalogo | null = i === 1 ? '3d' : i === 2 ? 'papelaria' : null
                if (!linha) return [item]
                const categorias = categoriasDaLinha(linha)
                if (!categorias.length) return [item]
                return [
                  item,
                  <div
                    key={`${linha}-categorias`}
                    className="ml-9 mb-1 flex flex-col border-l border-[#DFC3AE]"
                  >
                    {categorias.map((categoria) => (
                      <Link
                        key={categoria}
                        to={caminhoCategoria(categoria)}
                        onClick={() => setMenuAberto(false)}
                        className="pl-3 py-2 text-[13px] text-[#6B4B36] hover:text-[#0C1014]"
                      >
                        {categoria}
                      </Link>
                    ))}
                  </div>,
                ]
              })}
          </nav>
        )}
      </header>

      <main
        id="conteudo"
        className={cn(
          'flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10',
          // Espaço do topo igual ao das laterais
          telaFocada
            ? 'flex flex-col justify-center py-4 sm:py-6'
            : 'pt-4 sm:pt-6 lg:pt-10 pb-6 sm:pb-10',
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
            <Link
              to={PAGINA_SOBRE.caminho}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-[#DFC3AE] bg-white text-sm text-[#0C1014] hover:border-[#C48864]"
            >
              <BookHeart className="w-4 h-4 text-[#A5683F]" aria-hidden="true" /> Sobre nós
            </Link>
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

/** "Catálogo 3D ⌄": o nome abre a aba inteira; a setinha abre as categorias logo abaixo
 *  do nome (a lista fica presa ao bloco todo, não só à setinha). */
function MenuCatalogo({
  linha,
  categorias,
  linkNav,
}: {
  linha: LinhaCatalogo
  categorias: string[]
  linkNav: (estado: { isActive: boolean }) => string
}) {
  const [aberto, setAberto] = useState(false)
  const info = LINHAS_CATALOGO[linha]
  const itemLista =
    'block px-3 py-2 rounded-lg text-sm outline-none transition-colors hover:bg-[#F6EDE7] focus-visible:bg-[#F6EDE7]'

  return (
    <PopoverPrimitive.Root open={aberto} onOpenChange={setAberto}>
      <PopoverPrimitive.Anchor asChild>
        <div className="flex items-center gap-0.5">
          <NavLink
            to={info.caminho}
            className={(estado) => cn(linkNav(estado), aberto && 'text-[#0C1014] border-[#C48864]')}
          >
            {info.menu}
          </NavLink>
          {categorias.length > 0 && (
            <PopoverPrimitive.Trigger
              aria-label={`Categorias do ${info.menu}`}
              className="group p-1 rounded-md text-[#6B4B36] hover:text-[#0C1014] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] data-[state=open]:bg-white data-[state=open]:text-[#0C1014]"
            >
              <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
            </PopoverPrimitive.Trigger>
          )}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-64 rounded-xl border border-[#DFC3AE] bg-white p-1.5 shadow-[0_10px_30px_rgba(12,16,20,0.10)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-2"
        >
          <nav aria-label={`Categorias do ${info.menu}`}>
            <Link
              to={info.caminho}
              state={{ rolarParaProdutos: true }}
              onClick={() => setAberto(false)}
              className={cn(itemLista, 'font-semibold text-[#A5683F]')}
            >
              Ver todo o {info.menu}
            </Link>
            <div className="my-1 h-px bg-[#DFC3AE]/60" />
            {categorias.map((categoria) => (
              <Link
                key={categoria}
                to={caminhoCategoria(categoria)}
                onClick={() => setAberto(false)}
                className={cn(itemLista, 'text-[#6B4B36] hover:text-[#0C1014]')}
              >
                {categoria}
              </Link>
            ))}
          </nav>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
