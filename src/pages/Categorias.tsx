import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { AbasSecao, SECAO_LOJA_VIRTUAL } from '@/components/common/AbasSecao'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { prepararFotoCategoria, ImagemPreparada } from '@/lib/imagem'
import { enviarFotoCategoria, mensagemErro } from '@/store/db'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { CategoriaProduto } from '@/types/criartere'
import {
  AlertTriangle,
  Box,
  Edit,
  Home,
  ImageIcon,
  LayoutGrid,
  ImagePlus,
  PenTool,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type Linha = '3d' | 'papelaria' | 'nenhuma'

const ABAS: Record<Linha, { nome: string; icone: typeof Box; classe: string }> = {
  '3d': { nome: 'Catálogo 3D', icone: Box, classe: 'bg-[#C48864]/15 text-[#94603D]' },
  papelaria: {
    nome: 'Catálogo Papelaria',
    icone: PenTool,
    classe: 'bg-[#4C8A5A]/12 text-[#3F7A4E]',
  },
  nenhuma: { nome: 'Só na página inicial', icone: Home, classe: 'bg-gray-100 text-gray-600' },
}

const lbl = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'

export default function Categorias() {
  const { state, dispatch } = useCriartere()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<CategoriaProduto | null>(null)
  const [nome, setNome] = useState('')
  const [linha, setLinha] = useState<Linha>('3d')
  const [erro, setErro] = useState('')
  // Foto do card na loja: a atual (url), uma nova escolhida (ainda não enviada) e a prévia
  const [foto, setFoto] = useState<{ url?: string; nova?: ImagemPreparada; previa?: string }>({})
  const [preparandoFoto, setPreparandoFoto] = useState(false)
  // Aparece nos cards de categoria da página inicial da loja
  const [naInicio, setNaInicio] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)
  // Libera a prévia local quando ela deixa de ser usada
  useEffect(() => {
    const previa = foto.previa
    return () => {
      if (previa) URL.revokeObjectURL(previa)
    }
  }, [foto.previa])

  const [paraExcluir, setParaExcluir] = useState<CategoriaProduto | null>(null)
  const [moverPara, setMoverPara] = useState('')

  // Produtos por categoria (sem diferenciar maiúsculas)
  const contagem = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of state.produtos) {
      const chave = p.categoria.trim().toLowerCase()
      m.set(chave, (m.get(chave) ?? 0) + 1)
    }
    return m
  }, [state.produtos])
  const qtd = (c: string) => contagem.get(c.trim().toLowerCase()) ?? 0
  // Prévia da foto usada na loja quando a categoria não tem foto própria (a de um produto dela)
  const fotoDosProdutos = (c: string) =>
    state.produtos.find(
      (p) =>
        p.ativo &&
        p.publicadoLoja !== false &&
        p.imagemUrl &&
        [p.categoria, ...(p.outrasCategorias ?? [])].some(
          (x) => x.trim().toLowerCase() === c.trim().toLowerCase(),
        ),
    )?.imagemUrl
  // Produtos que estão na categoria como "também aparece em"
  const qtdOutras = (c: string) =>
    state.produtos.filter((p) =>
      (p.outrasCategorias ?? []).some((x) => x.trim().toLowerCase() === c.trim().toLowerCase()),
    ).length

  const bannersDaCategoria = (c: string) =>
    state.banners.filter((b) => b.destinoTipo === 'categoria' && b.destinoValor === c).length

  const abrir = (c: CategoriaProduto | null) => {
    setEditando(c)
    setNome(c?.nome ?? '')
    setLinha(c ? (c.linha ?? 'nenhuma') : '3d')
    setFoto({ url: c?.imagemUrl })
    setNaInicio(c ? c.mostrarNaInicio !== false : true)
    setErro('')
    setModalAberto(true)
  }

  const escolherFoto = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setPreparandoFoto(true)
    setErro('')
    try {
      const nova = await prepararFotoCategoria(arquivo)
      setFoto((f) => ({ url: f.url, nova, previa: URL.createObjectURL(nova.blob) }))
    } catch (err) {
      setErro(mensagemErro(err))
    } finally {
      setPreparandoFoto(false)
      if (arquivoRef.current) arquivoRef.current.value = ''
    }
  }
  const fotoNaTela = foto.previa ?? foto.url

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (salvando) return
    setErro('')
    const nomeFinal = nome.trim().replace(/\s+/g, ' ')
    if (!nomeFinal) return setErro('Informe o nome da categoria.')
    if (nomeFinal.length > 60) return setErro('Use até 60 caracteres no nome.')
    const repetida = state.categoriasProduto.some(
      (c) => c.nome.toLowerCase() === nomeFinal.toLowerCase() && c.nome !== editando?.nome,
    )
    if (repetida) return setErro(`Já existe uma categoria chamada "${nomeFinal}".`)

    const linhaFinal = linha === 'nenhuma' ? undefined : linha
    // Envia a foto nova antes de gravar a categoria
    let imagemUrl = foto.url
    if (foto.nova) {
      setSalvando(true)
      try {
        // No modo desenvolvedor a foto fica só neste aparelho (não é enviada)
        imagemUrl = state.modoDemo
          ? URL.createObjectURL(foto.nova.blob)
          : await enviarFotoCategoria(foto.nova)
      } catch (err) {
        setSalvando(false)
        return setErro(`Não foi possível enviar a foto. ${mensagemErro(err)}`)
      }
      setSalvando(false)
    }
    if (editando) {
      dispatch({
        type: 'SALVAR_CATEGORIA_PRODUTO',
        payload: {
          antiga: editando.nome,
          nome: nomeFinal,
          linha: linhaFinal,
          imagemUrl,
          mostrarNaInicio: naInicio,
        },
      })
      const renomeou = nomeFinal !== editando.nome
      const n = qtd(editando.nome)
      toast.success(
        renomeou && n > 0
          ? `Categoria renomeada. ${n} ${n === 1 ? 'produto foi atualizado' : 'produtos foram atualizados'}.`
          : 'Categoria atualizada!',
      )
    } else {
      dispatch({
        type: 'ADICIONAR_CATEGORIA_PRODUTO',
        payload: { nome: nomeFinal, linha: linhaFinal, imagemUrl, mostrarNaInicio: naInicio },
      })
      toast.success(`Categoria "${nomeFinal}" criada!`)
    }
    setModalAberto(false)
  }

  const abrirExclusao = (c: CategoriaProduto) => {
    setParaExcluir(c)
    setMoverPara('')
  }

  const excluir = () => {
    if (!paraExcluir) return
    const n = qtd(paraExcluir.nome)
    if (n > 0 && !moverPara)
      return void toast.error('Escolha para qual categoria mover os produtos.')
    dispatch({
      type: 'EXCLUIR_CATEGORIA_PRODUTO',
      payload: { nome: paraExcluir.nome, moverPara: moverPara || undefined },
    })
    toast.success(
      n > 0
        ? `Categoria excluída. ${n} ${n === 1 ? 'produto foi movido' : 'produtos foram movidos'} para "${moverPara}".`
        : `Categoria "${paraExcluir.nome}" excluída.`,
    )
    setParaExcluir(null)
  }

  const qtdExcluir = paraExcluir ? qtd(paraExcluir.nome) : 0
  const bannersExcluir = paraExcluir ? bannersDaCategoria(paraExcluir.nome) : 0

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Categorias de Produto"
        descricao={`${state.categoriasProduto.length} categorias • organizam os produtos e as abas da loja`}
        ajuda={
          <DicaAjuda titulo="Categorias" topico="categorias" lado="bottom">
            <p>
              Cada categoria aparece em uma aba da loja: Catálogo 3D, Catálogo Papelaria ou só na
              página inicial.
            </p>
            <p>Renomear uma categoria atualiza todos os produtos dela automaticamente.</p>
          </DicaAjuda>
        }
      />
      <AbasSecao abas={SECAO_LOJA_VIRTUAL} rotulo="Loja virtual" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-[#6B4B36] max-w-xl">
          As categorias aparecem no cadastro de produtos, nos filtros da loja e no menu de cada
          catálogo.
        </p>
        <Button
          onClick={() => abrir(null)}
          className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Categoria
        </Button>
      </div>

      {state.categoriasProduto.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
          <Tags className="w-8 h-8 text-[#94603D] mx-auto opacity-70" />
          <p className="text-sm font-semibold text-[#0C1014]">Nenhuma categoria cadastrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs overflow-hidden">
          <ul className="divide-y divide-[#DFC3AE]/50">
            {state.categoriasProduto.map((c) => {
              const aba = ABAS[c.linha ?? 'nenhuma']
              const n = qtd(c.nome)
              return (
                <li
                  key={c.nome}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-[#F7F3EA]/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MiniaturaCategoria
                      propria={c.imagemUrl}
                      reserva={c.imagemUrl ? undefined : fotoDosProdutos(c.nome)}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#0C1014] truncate">{c.nome}</p>
                      <p className="text-[11px] text-[#6B4B36]">
                        {n === 0 ? 'Nenhum produto' : n === 1 ? '1 produto' : `${n} produtos`}
                        {qtdOutras(c.nome) > 0 && ` • +${qtdOutras(c.nome)} também aparecem aqui`}
                      </p>
                    </div>
                  </div>
                  {c.mostrarNaInicio !== false && (
                    <span
                      className="self-start sm:self-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#A5683F]/10 text-[#8C5636]"
                      title="Aparece nos cards de categoria da página inicial"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                      Card na página inicial
                    </span>
                  )}
                  <span
                    className={`self-start sm:self-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${aba.classe}`}
                  >
                    <aba.icone className="w-3.5 h-3.5" />
                    {aba.nome}
                  </span>
                  <div className="flex items-center gap-1 sm:w-[150px] justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrir(c)}
                      className="h-8 text-xs text-[#6B4B36] hover:text-[#0C1014] px-2"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Excluir categoria ${c.nome}`}
                      onClick={() => abrirExclusao(c)}
                      disabled={state.categoriasProduto.length <= 1}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* CRIAR / EDITAR */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md bg-white border-[#DFC3AE] p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
              {editando ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-nome" className={lbl}>
                Nome
                <Obrigatorio />
              </Label>
              <Input
                id="cat-nome"
                value={nome}
                maxLength={60}
                placeholder="Ex: Topos de bolo"
                onChange={(e) => setNome(e.target.value)}
                className="h-10 text-sm border-[#DFC3AE]"
              />
              {editando &&
                nome.trim() &&
                nome.trim() !== editando.nome &&
                qtd(editando.nome) > 0 && (
                  <p className="text-[11px] text-[#A5683F]">
                    Os {qtd(editando.nome)} produtos desta categoria passam a usar o novo nome.
                  </p>
                )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-linha" className={lbl}>
                Aparece na loja em
              </Label>
              <Select value={linha} onValueChange={(v) => v && setLinha(v as Linha)}>
                <SelectTrigger id="cat-linha" className="h-10 text-sm border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ABAS) as Linha[]).map((l) => (
                    <SelectItem key={l} value={l} className="text-sm">
                      {ABAS[l].nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#6B4B36]/90">
                Todos os produtos aparecem na página inicial; aqui você escolhe também a aba.
              </p>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border border-[#DFC3AE]/70 bg-[#F7F3EA]/50 p-3">
              <div>
                <Label htmlFor="cat-inicio" className="text-sm font-semibold text-[#0C1014]">
                  Mostrar nos cards da página inicial
                </Label>
                <p className="text-[11px] text-[#6B4B36] mt-0.5">
                  A categoria aparece na faixa de categorias com foto, logo abaixo dos banners.
                </p>
              </div>
              <Switch id="cat-inicio" checked={naInicio} onCheckedChange={setNaInicio} />
            </div>

            <div className="space-y-1.5">
              <p className={lbl}>
                Foto do card na loja
                <Opcional />
              </p>
              <div className="flex gap-3 items-start">
                <div className="w-[84px] aspect-[3/4] rounded-xl overflow-hidden border border-[#DFC3AE] bg-[#F7F3EA] shrink-0 relative">
                  {fotoNaTela ? (
                    <img src={fotoNaTela} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C48864]">
                      <ImageIcon className="w-6 h-6" aria-hidden="true" />
                    </div>
                  )}
                  {preparandoFoto && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="w-5 h-5 border-2 border-[#A5683F] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <input
                    ref={arquivoRef}
                    id="cat-foto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => escolherFoto(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={preparandoFoto}
                      onClick={() => arquivoRef.current?.click()}
                      className="h-9 text-xs border-[#DFC3AE] text-[#6B4B36]"
                    >
                      <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                      {fotoNaTela ? 'Trocar foto' : 'Escolher foto'}
                    </Button>
                    {fotoNaTela && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setFoto({})}
                        className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#6B4B36]/90 leading-relaxed">
                    Aparece nos cards de categoria da página inicial. Prefira foto em pé (retrato),
                    com o produto no centro. Sem foto, usamos a do produto mais recente.
                  </p>
                </div>
              </div>
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
                onClick={() => setModalAberto(false)}
                className="border-[#DFC3AE] text-[#6B4B36] h-10 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando || preparandoFoto}
                className="bg-[#A5683F] hover:bg-[#8C5636] text-white h-10 text-xs font-semibold"
              >
                {salvando ? 'Enviando foto...' : 'Salvar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EXCLUIR */}
      <AlertDialog
        open={Boolean(paraExcluir)}
        onOpenChange={(open) => !open && setParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#A84A34]" />
              Excluir a categoria "{paraExcluir?.nome}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs text-[#6B4B36] space-y-3">
                {qtdExcluir > 0 ? (
                  <>
                    <p>
                      Ela tem <strong>{qtdExcluir}</strong>{' '}
                      {qtdExcluir === 1 ? 'produto' : 'produtos'}. Escolha para qual categoria{' '}
                      {qtdExcluir === 1 ? 'ele vai' : 'eles vão'}:
                    </p>
                    <Select value={moverPara} onValueChange={(v) => v && setMoverPara(v)}>
                      <SelectTrigger
                        aria-label="Mover os produtos para"
                        className="h-10 text-sm border-[#DFC3AE]"
                      >
                        <SelectValue placeholder="Mover os produtos para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.categoriasProduto
                          .filter((c) => c.nome !== paraExcluir?.nome)
                          .map((c) => (
                            <SelectItem key={c.nome} value={c.nome} className="text-sm">
                              {c.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <p>Nenhum produto usa esta categoria.</p>
                )}
                {bannersExcluir > 0 && (
                  <p>
                    {bannersExcluir === 1 ? '1 banner abre' : `${bannersExcluir} banners abrem`}{' '}
                    esta categoria:{' '}
                    {moverPara ? `passará a abrir "${moverPara}".` : 'ficará sem link (só imagem).'}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={excluir}
              disabled={qtdExcluir > 0 && !moverPara}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Miniatura da lista: a foto da categoria ou, sem ela, a do produto (mais clara, com aviso). */
function MiniaturaCategoria({ propria, reserva }: { propria?: string; reserva?: string }) {
  const url = propria ?? reserva
  return (
    <div
      className="w-10 h-[52px] rounded-lg overflow-hidden border border-[#DFC3AE]/70 bg-[#F7F3EA] shrink-0 relative"
      title={
        propria ? 'Foto da categoria' : reserva ? 'Sem foto própria: usa a do produto' : 'Sem foto'
      }
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover ${propria ? '' : 'opacity-60'}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#C48864]/70">
          <ImageIcon className="w-4 h-4" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
