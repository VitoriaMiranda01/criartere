import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { AbasSecao, SECAO_LOJA_VIRTUAL } from '@/components/common/AbasSecao'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { prepararFotoSobre } from '@/lib/imagem'
import {
  buscarPaginaSobre,
  enviarFotoSobre,
  MAX_FOTOS_SOBRE,
  PaginaSobre,
  salvarPaginaSobre,
} from '@/lib/sobre'
import { mensagemErro } from '@/store/db'
import { useCriartere } from '@/store/CriartereContext'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Star,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const lbl = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'
const vazia: PaginaSobre = { titulo: 'Sobre nós', introducao: '', texto: '', fotos: [] }

export default function SobreNos() {
  const { state } = useCriartere()
  const [salva, setSalva] = useState<PaginaSobre | null>(null) // versão no banco
  const [pagina, setPagina] = useState<PaginaSobre>(vazia)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [enviando, setEnviando] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const inputFotos = useRef<HTMLInputElement>(null)

  const carregar = () => {
    setErroCarregar(false)
    buscarPaginaSobre()
      .then((p) => {
        setSalva(p)
        setPagina(p)
      })
      .catch(() => setErroCarregar(true))
  }
  useEffect(carregar, [])

  const alterado = salva !== null && JSON.stringify(salva) !== JSON.stringify(pagina)

  // Avisa antes de sair da página com alterações não salvas
  useEffect(() => {
    if (!alterado) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [alterado])

  const mudar = (campos: Partial<PaginaSobre>) => setPagina((p) => ({ ...p, ...campos }))

  const adicionarFotos = async (arquivos: FileList | File[] | null | undefined) => {
    const lista = Array.from(arquivos ?? []).filter((a) => a.type.startsWith('image/'))
    if (!lista.length) return
    const livres = MAX_FOTOS_SOBRE - pagina.fotos.length
    if (livres <= 0) return void toast.error(`A página aceita até ${MAX_FOTOS_SOBRE} fotos.`)
    if (lista.length > livres)
      toast.warning(`Só cabem mais ${livres} fotos; as demais foram ignoradas.`)
    for (const arquivo of lista.slice(0, livres)) {
      setEnviando((n) => n + 1)
      try {
        const imagem = await prepararFotoSobre(arquivo)
        // No modo desenvolvedor a foto fica só neste aparelho (não é enviada)
        const url = state.modoDemo
          ? URL.createObjectURL(imagem.blob)
          : await enviarFotoSobre(imagem)
        setPagina((p) => ({ ...p, fotos: [...p.fotos, { url, legenda: '' }] }))
      } catch (e) {
        toast.error(`Não foi possível enviar "${arquivo.name}". ${mensagemErro(e)}`)
      } finally {
        setEnviando((n) => n - 1)
      }
    }
  }

  const moverFoto = (i: number, direcao: -1 | 1) =>
    setPagina((p) => {
      const fotos = [...p.fotos]
      const j = i + direcao
      if (j < 0 || j >= fotos.length) return p
      ;[fotos[i], fotos[j]] = [fotos[j], fotos[i]]
      return { ...p, fotos }
    })

  const removerFoto = (i: number) =>
    setPagina((p) => ({ ...p, fotos: p.fotos.filter((_, k) => k !== i) }))

  const mudarLegenda = (i: number, legenda: string) =>
    setPagina((p) => ({
      ...p,
      fotos: p.fotos.map((f, k) => (k === i ? { ...f, legenda } : f)),
    }))

  const salvar = async () => {
    if (!pagina.titulo.trim()) return void toast.error('Informe o título da página.')
    if (!pagina.texto.trim()) return void toast.error('Escreva o texto da página.')
    if (state.modoDemo) {
      setSalva(pagina)
      return void toast.info('Modo desenvolvedor: a alteração não é gravada na loja.')
    }
    setSalvando(true)
    try {
      await salvarPaginaSobre(pagina)
      setSalva(pagina)
      toast.success('Página "Sobre nós" atualizada na loja!')
    } catch (e) {
      toast.error(`Não foi salvo: ${mensagemErro(e)}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Página Sobre Nós"
        descricao="Conte a história da loja e mostre fotos do ateliê, do processo e da equipe"
        ajuda={
          <DicaAjuda titulo="Sobre nós" topico="sobre" lado="bottom">
            <p>Este conteúdo aparece na aba "Sobre nós" da loja virtual.</p>
            <p>
              Deixe uma linha em branco entre os parágrafos. A primeira foto é a de destaque, ao
              lado do texto; as outras formam uma galeria.
            </p>
          </DicaAjuda>
        }
      />
      <AbasSecao abas={SECAO_LOJA_VIRTUAL} rotulo="Loja virtual" />

      {erroCarregar ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
          <p className="text-sm font-semibold text-[#0C1014]">Não foi possível carregar a página</p>
          <Button
            onClick={carregar}
            variant="outline"
            className="border-[#DFC3AE] text-[#6B4B36] text-xs"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Tentar de novo
          </Button>
        </div>
      ) : salva === null ? (
        <div className="flex items-center justify-center py-16 text-[#6B4B36] text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <>
          {/* Barra de ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs sticky top-2 z-10">
            <p className="text-xs text-[#6B4B36]">
              {alterado ? (
                <span className="font-semibold text-[#A5683F]">Alterações não salvas</span>
              ) : (
                'Tudo salvo'
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9 px-3 rounded-lg"
              >
                <a href="/sobre" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Ver na loja
                </a>
              </Button>
              {alterado && (
                <Button
                  variant="outline"
                  onClick={() => setPagina(salva)}
                  className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9 px-3 rounded-lg"
                >
                  Descartar
                </Button>
              )}
              <Button
                onClick={salvar}
                disabled={!alterado || salvando || enviando > 0}
                className="bg-[#A5683F] hover:bg-[#8C5636] text-white text-xs h-9 px-4 rounded-lg font-semibold"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {salvando ? 'Salvando...' : enviando > 0 ? 'Enviando fotos...' : 'Salvar'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TEXTO */}
            <section className="bg-white p-5 rounded-2xl border border-[#DFC3AE]/70 shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-base text-[#0C1014]">Texto</h2>
              <div className="space-y-1.5">
                <Label htmlFor="sobre-titulo" className={lbl}>
                  Título
                  <Obrigatorio />
                </Label>
                <Input
                  id="sobre-titulo"
                  value={pagina.titulo}
                  maxLength={80}
                  onChange={(e) => mudar({ titulo: e.target.value })}
                  className="h-10 text-sm border-[#DFC3AE]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sobre-intro" className={lbl}>
                  Frase de abertura
                  <Opcional />
                </Label>
                <Textarea
                  id="sobre-intro"
                  value={pagina.introducao}
                  rows={2}
                  maxLength={300}
                  placeholder="Uma frase que resume a loja, em destaque no topo."
                  onChange={(e) => mudar({ introducao: e.target.value })}
                  className="text-sm border-[#DFC3AE] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sobre-texto" className={lbl}>
                  Nossa história
                  <Obrigatorio />
                </Label>
                <Textarea
                  id="sobre-texto"
                  value={pagina.texto}
                  rows={14}
                  placeholder="Como a loja nasceu, o que vocês fazem, o que torna cada peça especial..."
                  onChange={(e) => mudar({ texto: e.target.value })}
                  className="text-sm border-[#DFC3AE] leading-relaxed"
                />
                <p className="text-[10px] text-[#6B4B36]/90">
                  Deixe uma linha em branco entre os parágrafos.
                </p>
              </div>
            </section>

            {/* FOTOS */}
            <section className="bg-white p-5 rounded-2xl border border-[#DFC3AE]/70 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif font-bold text-base text-[#0C1014]">
                  Fotos{' '}
                  <span className="text-xs font-sans font-normal text-[#6B4B36]">
                    ({pagina.fotos.length}/{MAX_FOTOS_SOBRE})
                  </span>
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputFotos.current?.click()}
                  disabled={pagina.fotos.length >= MAX_FOTOS_SOBRE}
                  className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9 px-3 rounded-lg"
                >
                  <ImagePlus className="w-4 h-4 mr-1.5" />
                  Adicionar fotos
                </Button>
              </div>
              <input
                ref={inputFotos}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  adicionarFotos(e.target.files)
                  e.target.value = ''
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setArrastando(true)
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setArrastando(false)
                  adicionarFotos(e.dataTransfer.files)
                }}
                className={`rounded-xl transition-colors ${arrastando ? 'bg-[#C48864]/10 ring-2 ring-[#C48864]' : ''}`}
              >
                {pagina.fotos.length === 0 && enviando === 0 ? (
                  <button
                    type="button"
                    onClick={() => inputFotos.current?.click()}
                    className="w-full py-12 rounded-xl border-2 border-dashed border-[#DFC3AE] bg-[#F7F3EA]/60 hover:border-[#C48864] flex flex-col items-center gap-1.5 text-[#6B4B36]"
                  >
                    <ImagePlus className="w-7 h-7 text-[#94603D]" />
                    <span className="text-xs font-semibold">Enviar fotos</span>
                    <span className="text-[10px]">Clique ou arraste aqui (JPG, PNG ou WebP)</span>
                  </button>
                ) : (
                  <ol className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pagina.fotos.map((f, i) => (
                      <li
                        key={f.url}
                        className="rounded-xl border border-[#DFC3AE]/70 overflow-hidden bg-[#F7F3EA]/50"
                      >
                        <div className="relative aspect-[4/3]">
                          <img src={f.url} alt="" className="w-full h-full object-cover" />
                          {i === 0 && (
                            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold bg-white/90 text-[#A5683F] px-1.5 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-current" /> Destaque
                            </span>
                          )}
                        </div>
                        <div className="p-1.5 space-y-1.5">
                          <Input
                            aria-label={`Legenda da foto ${i + 1}`}
                            placeholder="Legenda (opcional)"
                            value={f.legenda}
                            maxLength={120}
                            onChange={(e) => mudarLegenda(i, e.target.value)}
                            className="h-8 text-[11px] border-[#DFC3AE] bg-white"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Mover para a esquerda"
                                disabled={i === 0}
                                onClick={() => moverFoto(i, -1)}
                                className="h-7 w-7 text-[#6B4B36]"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Mover para a direita"
                                disabled={i === pagina.fotos.length - 1}
                                onClick={() => moverFoto(i, 1)}
                                className="h-7 w-7 text-[#6B4B36]"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Remover foto ${i + 1}`}
                              onClick={() => removerFoto(i)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                    {Array.from({ length: enviando }).map((_, i) => (
                      <li
                        key={`enviando-${i}`}
                        className="rounded-xl border border-dashed border-[#DFC3AE] aspect-[4/3] flex items-center justify-center text-[#6B4B36] text-[11px] gap-1.5"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <p className="text-[10px] text-[#6B4B36]/90">
                A primeira foto aparece em destaque ao lado do texto; use as setas para mudar a
                ordem. Fotos removidas são apagadas ao salvar.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
