/* Aba "Sobre nós" da loja: história e fotos, editadas no painel (Página Sobre Nós). */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaWhatsapp } from 'react-icons/fa'
import { RefreshCw } from 'lucide-react'
import { useSeo } from '@/lib/seo'
import { buscarPaginaSobre, PaginaSobre, paragrafos } from '@/lib/sobre'
import { useLoja } from '@/loja/LojaContext'
import { numeroWhatsApp } from '@/loja/api'
import { CarregandoLoja, EstadoVazio } from '@/loja/componentes'
import { LINHAS_CATALOGO, PAGINA_SOBRE } from '@/loja/seo-dados'

export default function Sobre() {
  const { contato } = useLoja()
  const [pagina, setPagina] = useState<PaginaSobre | null>(null)
  const [erro, setErro] = useState(false)

  const carregar = () => {
    setErro(false)
    buscarPaginaSobre()
      .then(setPagina)
      .catch(() => setErro(true))
  }
  useEffect(carregar, [])

  useSeo({
    titulo: pagina?.titulo || PAGINA_SOBRE.titulo,
    descricao: pagina?.introducao || PAGINA_SOBRE.descricao,
    caminho: PAGINA_SOBRE.caminho,
    imagem: pagina?.fotos[0]?.url,
    indexar: true,
    ativo: pagina !== null,
  })

  if (erro)
    return (
      <EstadoVazio
        icone={RefreshCw}
        titulo="Não foi possível carregar esta página"
        texto="Verifique sua conexão com a internet e tente de novo."
        acao={
          <button
            type="button"
            onClick={carregar}
            className="h-10 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
          >
            Tentar de novo
          </button>
        }
      />
    )
  if (!pagina) return <CarregandoLoja />

  const [destaque, ...galeria] = pagina.fotos
  const whatsapp = contato?.whatsapp ? numeroWhatsApp(contato.whatsapp) : ''

  return (
    <article className="space-y-10 sm:space-y-14 pb-6">
      {/* Abertura */}
      <header className="relative overflow-hidden rounded-3xl bg-white border border-[#DFC3AE]/60 px-6 py-10 sm:px-12 sm:py-14">
        <div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#DFC3AE] opacity-40 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-28 left-1/3 w-72 h-72 rounded-full bg-[#C48864] opacity-15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#A5683F] font-bold mb-3">
            Criartere
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold leading-[1.1] text-[#0C1014]">
            {pagina.titulo}
          </h1>
          {pagina.introducao && (
            <p className="font-serif text-lg sm:text-2xl text-[#6B4B36] mt-4 leading-snug">
              {pagina.introducao}
            </p>
          )}
        </div>
      </header>

      {/* História + foto de destaque */}
      <section
        className={
          destaque
            ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 lg:gap-14 items-start'
            : 'max-w-3xl'
        }
      >
        <div className="space-y-5 text-base sm:text-lg text-[#3A2A1F] leading-relaxed max-w-prose">
          {paragrafos(pagina.texto).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        {destaque && (
          <figure className="lg:sticky lg:top-24 space-y-2">
            <img
              src={destaque.url}
              alt={destaque.legenda || `Foto da ${contato?.nome || 'Criartere'}`}
              className="w-full aspect-[4/5] object-cover rounded-3xl border border-[#DFC3AE]/60 shadow-[0_20px_50px_rgba(12,16,20,0.08)]"
            />
            {destaque.legenda && (
              <figcaption className="text-sm text-[#6B4B36] text-center">
                {destaque.legenda}
              </figcaption>
            )}
          </figure>
        )}
      </section>

      {/* Galeria */}
      {galeria.length > 0 && (
        <section aria-labelledby="titulo-galeria" className="space-y-4">
          <h2 id="titulo-galeria" className="font-serif text-2xl font-semibold text-[#0C1014]">
            Um pouco do nosso dia a dia
          </h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {galeria.map((f) => (
              <li key={f.url}>
                <figure className="space-y-1.5">
                  <img
                    src={f.url}
                    alt={f.legenda || ''}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-2xl border border-[#DFC3AE]/60"
                  />
                  {f.legenda && (
                    <figcaption className="text-xs sm:text-sm text-[#6B4B36]">
                      {f.legenda}
                    </figcaption>
                  )}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Chamada final */}
      <section className="rounded-3xl bg-[#0C1014] text-white px-6 py-10 sm:px-12 sm:py-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold">Vamos criar juntos?</h2>
          <p className="text-sm sm:text-base text-white/75 mt-2">
            Veja nossos catálogos ou chame a gente no WhatsApp para encomendar algo especial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to={LINHAS_CATALOGO['3d'].caminho}
            className="h-11 px-5 inline-flex items-center rounded-xl bg-white text-[#0C1014] text-sm font-semibold hover:bg-[#F7F3EA]"
          >
            {LINHAS_CATALOGO['3d'].menu}
          </Link>
          <Link
            to={LINHAS_CATALOGO.papelaria.caminho}
            className="h-11 px-5 inline-flex items-center rounded-xl bg-white text-[#0C1014] text-sm font-semibold hover:bg-[#F7F3EA]"
          >
            {LINHAS_CATALOGO.papelaria.menu}
          </Link>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pela página Sobre nós e queria conversar sobre uma encomenda.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-5 inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-[#0C1014] text-sm font-semibold hover:brightness-95"
            >
              <FaWhatsapp className="w-4 h-4" /> WhatsApp
            </a>
          )}
        </div>
      </section>
    </article>
  )
}
