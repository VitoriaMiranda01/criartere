import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { novoId } from '@/lib/supabase'
import { hojeISO } from '@/lib/datas'
import { prepararImagemBanner, ImagemPreparada } from '@/lib/imagem'
import { enviarImagemBanner, mensagemErro } from '@/store/db'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { Banner } from '@/types/criartere'
import { formatDataBR } from '@/store/periodUtils'
import {
  Images,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Monitor,
  Smartphone,
  Link2,
  CalendarDays,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const lbl = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'

type Situacao = 'no_ar' | 'agendado' | 'encerrado' | 'inativo'
const SITUACOES: Record<Situacao, { nome: string; classe: string }> = {
  no_ar: { nome: 'No ar', classe: 'bg-[#4C8A5A] text-white' },
  agendado: { nome: 'Agendado', classe: 'bg-[#C48864] text-white' },
  encerrado: { nome: 'Encerrado', classe: 'bg-[#A84A34] text-white' },
  inativo: { nome: 'Inativo', classe: 'bg-gray-500 text-white' },
}

function situacaoBanner(b: Banner, hoje = hojeISO()): Situacao {
  if (!b.ativo) return 'inativo'
  if (b.validoDe && hoje < b.validoDe) return 'agendado'
  if (b.validoAte && hoje > b.validoAte) return 'encerrado'
  return 'no_ar'
}

type Formato = 'computador' | 'celular'
const FORMATOS: Record<Formato, { nome: string; medida: string; proporcao: string }> = {
  computador: { nome: 'Computador', medida: '1920 × 600 px', proporcao: 'aspect-[16/5]' },
  celular: { nome: 'Celular', medida: '1080 × 1080 px', proporcao: 'aspect-square' },
}

interface ImagemForm {
  url: string // já enviada
  nova: ImagemPreparada | null
  previa: string | null
}
const imagemVazia = (url = ''): ImagemForm => ({ url, nova: null, previa: null })

export default function Banners() {
  const { state, dispatch } = useCriartere()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Banner | null>(null)
  const [paraExcluir, setParaExcluir] = useState<Banner | null>(null)

  const [titulo, setTitulo] = useState('')
  const [imagens, setImagens] = useState<Record<Formato, ImagemForm>>({
    computador: imagemVazia(),
    celular: imagemVazia(),
  })
  const [destinoTipo, setDestinoTipo] = useState<Banner['destinoTipo']>('nenhum')
  const [destinoValor, setDestinoValor] = useState('')
  const [validoDe, setValidoDe] = useState('')
  const [validoAte, setValidoAte] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const banners = useMemo(
    () => [...state.banners].sort((a, b) => a.ordem - b.ordem),
    [state.banners],
  )
  const produtosLoja = useMemo(
    () =>
      state.produtos
        .filter((p) => p.ativo && p.publicadoLoja !== false)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [state.produtos],
  )
  const categorias = useMemo(
    () =>
      [...new Set(produtosLoja.map((p) => p.categoria.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [produtosLoja],
  )

  // Libera as prévias locais ao fechar
  const limparPrevias = () =>
    setImagens((atual) => {
      Object.values(atual).forEach((i) => i.previa && URL.revokeObjectURL(i.previa))
      return atual
    })

  const abrir = (b: Banner | null) => {
    limparPrevias()
    setEditando(b)
    setTitulo(b?.titulo ?? '')
    setImagens({
      computador: imagemVazia(b?.imagemComputador),
      celular: imagemVazia(b?.imagemCelular),
    })
    setDestinoTipo(b?.destinoTipo ?? 'nenhum')
    setDestinoValor(b?.destinoValor ?? '')
    setValidoDe(b?.validoDe ?? '')
    setValidoAte(b?.validoAte ?? '')
    setAtivo(b?.ativo ?? true)
    setErro('')
    setModalAberto(true)
  }

  const escolherImagem = async (formato: Formato, arquivo?: File | null) => {
    if (!arquivo) return
    try {
      const nova = await prepararImagemBanner(arquivo, formato)
      setImagens((atual) => {
        if (atual[formato].previa) URL.revokeObjectURL(atual[formato].previa!)
        return {
          ...atual,
          [formato]: { url: atual[formato].url, nova, previa: URL.createObjectURL(nova.blob) },
        }
      })
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const removerImagem = (formato: Formato) =>
    setImagens((atual) => {
      if (atual[formato].previa) URL.revokeObjectURL(atual[formato].previa!)
      return { ...atual, [formato]: imagemVazia() }
    })

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!titulo.trim()) return setErro('Dê um nome ao banner (ex.: Natal 2026).')
    if (!imagens.computador.url && !imagens.computador.nova)
      return setErro('Envie a imagem para computador.')
    if (destinoTipo !== 'nenhum' && !destinoValor)
      return setErro(
        destinoTipo === 'categoria'
          ? 'Escolha a categoria que o banner vai abrir.'
          : 'Escolha o produto que o banner vai abrir.',
      )
    if (validoDe && validoAte && validoDe > validoAte)
      return setErro('A data de início deve ser antes da data de término.')

    const id = editando?.id ?? novoId()
    const urls: Record<Formato, string> = {
      computador: imagens.computador.url,
      celular: imagens.celular.url,
    }
    setSalvando(true)
    try {
      for (const formato of ['computador', 'celular'] as Formato[]) {
        const nova = imagens[formato].nova
        if (!nova) continue
        // No modo desenvolvedor a imagem fica só neste aparelho (não é enviada)
        urls[formato] = state.modoDemo
          ? URL.createObjectURL(nova.blob)
          : await enviarImagemBanner(id, formato, nova)
      }
    } catch (err) {
      setSalvando(false)
      return setErro(`Não foi possível enviar a imagem. ${mensagemErro(err)}`)
    }
    setSalvando(false)

    const payload: Banner = {
      id,
      titulo: titulo.trim(),
      imagemComputador: urls.computador,
      imagemCelular: urls.celular || undefined,
      destinoTipo,
      destinoValor: destinoTipo === 'nenhum' ? undefined : destinoValor,
      ordem: editando?.ordem ?? Math.max(0, ...state.banners.map((b) => b.ordem)) + 1,
      ativo,
      validoDe: validoDe || undefined,
      validoAte: validoAte || undefined,
    }
    dispatch({ type: 'SALVAR_BANNER', payload })
    toast.success(editando ? `Banner "${payload.titulo}" atualizado!` : 'Banner adicionado à loja!')
    limparPrevias()
    setModalAberto(false)
  }

  const mover = (indice: number, direcao: -1 | 1) => {
    const ids = banners.map((b) => b.id)
    const destino = indice + direcao
    if (destino < 0 || destino >= ids.length) return
    ;[ids[indice], ids[destino]] = [ids[destino], ids[indice]]
    dispatch({ type: 'REORDENAR_BANNERS', payload: ids })
  }

  const handleExcluir = () => {
    if (!paraExcluir) return
    dispatch({ type: 'EXCLUIR_BANNER', payload: paraExcluir.id })
    toast.success(`Banner "${paraExcluir.titulo}" excluído.`)
    setParaExcluir(null)
  }

  const descreverDestino = (b: Banner) => {
    if (b.destinoTipo === 'categoria') return `Abre a categoria "${b.destinoValor}"`
    if (b.destinoTipo === 'produto') {
      const p = state.produtos.find((x) => x.id === b.destinoValor)
      return p ? `Abre o produto "${p.nome}"` : 'Abre um produto que não existe mais'
    }
    return 'Sem link (só imagem)'
  }

  const noAr = banners.filter((b) => situacaoBanner(b) === 'no_ar').length

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Banners da Loja"
        descricao={`${banners.length} banners • ${noAr} no ar no topo do catálogo`}
        ajuda={
          <DicaAjuda titulo="Banners" topico="banners" lado="bottom">
            <p>
              Os banners passam como slides no topo da loja. Use para novidades, datas especiais e
              promoções.
            </p>
            <p>
              Cada banner tem uma imagem para computador (larga) e outra para celular (quadrada).
              Ele pode abrir uma categoria ou um produto ao ser clicado.
            </p>
          </DicaAjuda>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-[#6B4B36] max-w-xl">
          A ordem abaixo é a ordem dos slides na loja. Sem banners no ar, a loja mostra a
          apresentação padrão.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            asChild
            variant="outline"
            className="border-[#DFC3AE] text-[#6B4B36] text-xs h-10 px-4 rounded-xl"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Ver na loja
            </a>
          </Button>
          <Button
            onClick={() => abrir(null)}
            className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Banner
          </Button>
        </div>
      </div>

      {banners.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
          <Images className="w-8 h-8 text-[#94603D] mx-auto opacity-70" />
          <p className="text-sm font-semibold text-[#0C1014]">Nenhum banner cadastrado</p>
          <p className="text-xs text-[#6B4B36]">
            Adicione imagens de novidades e promoções para destacar no topo da loja.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {banners.map((b, i) => {
            const situacao = situacaoBanner(b)
            return (
              <li
                key={b.id}
                className={`bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-3 sm:p-4 flex flex-col md:flex-row gap-4 ${
                  situacao === 'no_ar' ? '' : 'opacity-75'
                }`}
              >
                <div className="flex gap-2 md:w-[440px] shrink-0">
                  <img
                    src={b.imagemComputador}
                    alt=""
                    className="flex-1 min-w-0 aspect-[16/5] object-cover rounded-lg border border-[#DFC3AE]/60 bg-[#F7F3EA]"
                  />
                  <img
                    src={b.imagemCelular || b.imagemComputador}
                    alt=""
                    className="h-full max-h-[86px] aspect-square object-cover rounded-lg border border-[#DFC3AE]/60 bg-[#F7F3EA]"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#6B4B36]">#{i + 1}</span>
                    <h3 className="font-serif font-bold text-sm text-[#0C1014] truncate">
                      {b.titulo}
                    </h3>
                    <Badge
                      className={`${SITUACOES[situacao].classe} border-none text-[10px] font-semibold px-2 py-0.5`}
                    >
                      {SITUACOES[situacao].nome}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#6B4B36] flex items-center gap-1">
                    <Link2 className="w-3 h-3 shrink-0" />
                    {descreverDestino(b)}
                  </p>
                  {(b.validoDe || b.validoAte) && (
                    <p className="text-[11px] text-[#6B4B36] flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      {b.validoDe && b.validoAte
                        ? `${formatDataBR(b.validoDe)} a ${formatDataBR(b.validoAte)}`
                        : b.validoDe
                          ? `A partir de ${formatDataBR(b.validoDe)}`
                          : `Até ${formatDataBR(b.validoAte)}`}
                    </p>
                  )}
                  {!b.imagemCelular && (
                    <p className="text-[11px] text-[#A84A34]">
                      Sem imagem para celular: a do computador aparece recortada.
                    </p>
                  )}
                </div>

                <div className="flex md:flex-col items-center justify-end gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Mover para cima"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                    className="h-8 w-8 text-[#6B4B36]"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Mover para baixo"
                    disabled={i === banners.length - 1}
                    onClick={() => mover(i, 1)}
                    className="h-8 w-8 text-[#6B4B36]"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => abrir(b)}
                    className="h-8 text-xs text-[#6B4B36] hover:text-[#0C1014] px-2"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Excluir banner ${b.titulo}`}
                    onClick={() => setParaExcluir(b)}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* FORMULÁRIO */}
      <Dialog
        open={modalAberto}
        onOpenChange={(aberto) => {
          if (!aberto) limparPrevias()
          setModalAberto(aberto)
        }}
      >
        <DialogContent className="sm:max-w-3xl bg-white border-[#DFC3AE] p-5 sm:p-6 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
              {editando ? 'Editar Banner' : 'Novo Banner'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ban-titulo" className={lbl}>
                Nome do banner
                <Obrigatorio />
              </Label>
              <Input
                id="ban-titulo"
                placeholder="Ex: Coleção de Natal, Frete grátis em dezembro"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="h-10 text-xs border-[#DFC3AE]"
                required
              />
              <p className="text-[10px] text-[#6B4B36]/90">
                Também é lido por leitores de tela e buscadores (descreva o que a imagem mostra).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
              {(['computador', 'celular'] as Formato[]).map((formato) => (
                <CampoImagem
                  key={formato}
                  formato={formato}
                  imagem={imagens[formato]}
                  onEscolher={(arq) => escolherImagem(formato, arq)}
                  onRemover={() => removerImagem(formato)}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ban-destino" className={lbl}>
                  Ao clicar, abrir
                </Label>
                <Select
                  value={destinoTipo}
                  onValueChange={(v) => {
                    setDestinoTipo(v as Banner['destinoTipo'])
                    setDestinoValor('')
                  }}
                >
                  <SelectTrigger id="ban-destino" className="h-10 text-xs border-[#DFC3AE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum" className="text-xs">
                      Nada (só imagem)
                    </SelectItem>
                    <SelectItem value="categoria" className="text-xs">
                      Uma categoria
                    </SelectItem>
                    <SelectItem value="produto" className="text-xs">
                      Um produto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {destinoTipo === 'categoria' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ban-categoria" className={lbl}>
                    Categoria
                    <Obrigatorio />
                  </Label>
                  <Select value={destinoValor} onValueChange={setDestinoValor}>
                    <SelectTrigger id="ban-categoria" className="h-10 text-xs border-[#DFC3AE]">
                      <SelectValue placeholder="Escolha a categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Mantém a categoria salva mesmo que não tenha mais produtos */}
                      {[...new Set([...categorias, ...(destinoValor ? [destinoValor] : [])])].map(
                        (c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  {categorias.length === 0 && (
                    <p className="text-[10px] text-[#A84A34]">
                      Nenhuma categoria com produtos publicados na loja.
                    </p>
                  )}
                </div>
              )}

              {destinoTipo === 'produto' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ban-produto" className={lbl}>
                    Produto
                    <Obrigatorio />
                  </Label>
                  <Select value={destinoValor} onValueChange={setDestinoValor}>
                    <SelectTrigger id="ban-produto" className="h-10 text-xs border-[#DFC3AE]">
                      <SelectValue placeholder="Escolha o produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produtosLoja.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ban-de" className={lbl}>
                  Mostrar a partir de
                  <Opcional />
                </Label>
                <Input
                  id="ban-de"
                  type="date"
                  value={validoDe}
                  onChange={(e) => setValidoDe(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ban-ate" className={lbl}>
                  Mostrar até
                  <Opcional />
                </Label>
                <Input
                  id="ban-ate"
                  type="date"
                  value={validoAte}
                  min={validoDe || undefined}
                  onChange={(e) => setValidoAte(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 bg-[#F7F3EA] rounded-xl border border-[#DFC3AE]/60">
              <Label
                htmlFor="ban-ativo"
                className="text-xs font-bold text-[#0C1014] cursor-pointer"
              >
                Ativo (aparece na loja)
              </Label>
              <Switch id="ban-ativo" checked={ativo} onCheckedChange={setAtivo} />
            </div>

            {erro && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {erro}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  limparPrevias()
                  setModalAberto(false)
                }}
                className="border-[#DFC3AE] text-[#6B4B36] h-10 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#A5683F] hover:bg-[#8C5636] text-white h-10 text-xs font-semibold"
              >
                {salvando ? 'Enviando imagens...' : 'Salvar Banner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(paraExcluir)}
        onOpenChange={(open) => !open && setParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#A84A34]" />
              Excluir banner?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              O banner <strong>{paraExcluir?.titulo}</strong> sai da loja e as imagens são apagadas.
              Para só tirar do ar por um tempo, desligue "Ativo" na edição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Área de envio de uma das imagens do banner, já no formato em que aparece na loja. */
function CampoImagem({
  formato,
  imagem,
  onEscolher,
  onRemover,
}: {
  formato: Formato
  imagem: ImagemForm
  onEscolher: (arquivo?: File | null) => void
  onRemover: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const info = FORMATOS[formato]
  const Icone = formato === 'computador' ? Monitor : Smartphone
  const src = imagem.previa || imagem.url
  useEffect(() => setArrastando(false), [src])

  return (
    <div className="space-y-1.5 min-w-0">
      <Label className={`${lbl} flex items-center gap-1`}>
        <Icone className="w-3.5 h-3.5" />
        {info.nome}
        {formato === 'computador' ? <Obrigatorio /> : <Opcional />}
      </Label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Escolher imagem para ${info.nome.toLowerCase()}`}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          onEscolher(e.dataTransfer.files?.[0])
        }}
        className={`relative w-full ${info.proporcao} rounded-xl border-2 border-dashed overflow-hidden cursor-pointer group transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] ${
          arrastando
            ? 'border-[#C48864] bg-[#C48864]/10'
            : 'border-[#DFC3AE] bg-[#F7F3EA]/60 hover:border-[#C48864]'
        }`}
      >
        {src ? (
          <>
            <img src={src} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-black/40 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ImagePlus className="w-5 h-5" />
              Trocar imagem
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#6B4B36] text-center px-3">
            <ImagePlus className="w-6 h-6 text-[#94603D]" />
            <span className="text-xs font-semibold">Enviar imagem</span>
            <span className="text-[10px] text-[#6B4B36]/90">Clique ou arraste aqui</span>
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          onEscolher(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="flex items-center justify-between gap-2 text-[10px] text-[#6B4B36]/90">
        <span>Ideal: {info.medida}</span>
        {src && (
          <button
            type="button"
            onClick={onRemover}
            className="text-red-600 hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Remover
          </button>
        )}
      </div>
    </div>
  )
}
