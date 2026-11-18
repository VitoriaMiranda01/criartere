/* Loja virtual → Página inicial: até 3 seções da home da loja.
   Cada seção mostra uma categoria (automática: entra e sai produto sozinho) ou
   produtos escolhidos à mão (para vitrines especiais, como "Mais vendidos"). */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  LayoutList,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react'
import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { AbasSecao, SECAO_LOJA_VIRTUAL } from '@/components/common/AbasSecao'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Opcional } from '@/components/common/MarcadorCampo'
import { useCriartere } from '@/store/CriartereContext'
import type { OrdemSecao, SecaoInicio } from '@/types/criartere'
import { produtoTemCategoria } from '@/loja/seo-dados'
import { formatBRL } from '@/store/periodUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const lbl = 'text-[11px] font-semibold text-[#6B4B36] uppercase tracking-wider'
const MAX_PRODUTOS = 12

const ORDENS: { valor: OrdemSecao; rotulo: string }[] = [
  { valor: 'novidades', rotulo: 'Novidades primeiro' },
  { valor: 'promocao', rotulo: 'Em promoção primeiro' },
  { valor: 'menor_preco', rotulo: 'Menor preço' },
  { valor: 'maior_preco', rotulo: 'Maior preço' },
  { valor: 'nome', rotulo: 'Ordem alfabética' },
]

type Vaga = SecaoInicio | null
const novaSecao = (): SecaoInicio => ({ tipo: 'categoria', categoria: '', ordem: 'novidades' })

/** Seção completa o bastante para ir para a loja. */
const valida = (s: SecaoInicio) =>
  s.tipo === 'categoria' ? Boolean(s.categoria) : (s.produtoIds?.length ?? 0) > 0

export default function PaginaInicial() {
  const { state, dispatch } = useCriartere()
  const salvas = state.config.secoesInicio

  const [vagas, setVagas] = useState<Vaga[]>([null, null, null])
  const chaveSalva = JSON.stringify(salvas)
  useEffect(() => {
    const lista = JSON.parse(chaveSalva) as SecaoInicio[]
    setVagas([0, 1, 2].map((i) => lista[i] ?? null))
  }, [chaveSalva])

  const resultado = vagas.filter((v): v is SecaoInicio => v !== null && valida(v))
  const alterado = JSON.stringify(resultado) !== chaveSalva
  const incompletas = vagas.filter((v) => v !== null && !valida(v)).length

  const mudar = (i: number, campos: Partial<SecaoInicio>) =>
    setVagas((l) => l.map((v, j) => (j === i && v ? { ...v, ...campos } : v)))
  const moverSecao = (i: number, direcao: -1 | 1) =>
    setVagas((l) => {
      const j = i + direcao
      if (j < 0 || j >= l.length) return l
      const c = [...l]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  const salvar = () => {
    if (incompletas > 0)
      return void toast.error(
        'Complete as seções (escolha a categoria ou ao menos um produto) ou remova as vazias.',
      )
    dispatch({ type: 'ATUALIZAR_CONFIG', payload: { secoesInicio: resultado } })
    toast.success(
      state.modoDemo
        ? 'Modo desenvolvedor: a alteração não é gravada na loja.'
        : 'Página inicial atualizada na loja!',
    )
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Página Inicial da Loja"
        descricao="Escolha até 3 seções de produtos que aparecem na home, abaixo dos banners"
        ajuda={
          <DicaAjuda titulo="Seções da home" topico="pagina-inicial" lado="bottom">
            <p>
              Por categoria: os produtos entram e saem sozinhos, e a seção ganha o link "Ver todos".
            </p>
            <p>
              Produtos escolhidos: você monta a vitrine à mão (ex.: Mais vendidos, Presentes de
              Natal).
            </p>
          </DicaAjuda>
        }
      />
      <AbasSecao abas={SECAO_LOJA_VIRTUAL} rotulo="Loja virtual" />

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs">
        <p className="text-xs text-[#6B4B36] max-w-xl">
          {resultado.length === 0
            ? 'Sem seções definidas, a loja mostra as 3 categorias com mais produtos.'
            : `${resultado.length} ${resultado.length === 1 ? 'seção' : 'seções'} na home, nesta ordem.`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {alterado && (
            <span className="text-xs font-semibold text-[#A5683F]">Alterações não salvas</span>
          )}
          <Button
            asChild
            variant="outline"
            className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9 px-3 rounded-lg"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Ver na loja
            </a>
          </Button>
          <Button
            onClick={salvar}
            disabled={!alterado && incompletas === 0}
            className="bg-[#A5683F] hover:bg-[#8C5636] text-white text-xs h-9 px-4 rounded-lg font-semibold"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {vagas.map((vaga, i) => (
          <section
            key={i}
            className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif font-bold text-base text-[#0C1014]">Seção {i + 1}</h2>
              <div className="flex items-center">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Subir seção ${i + 1}`}
                  disabled={i === 0}
                  onClick={() => moverSecao(i, -1)}
                  className="h-8 w-8 text-[#6B4B36]"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Descer seção ${i + 1}`}
                  disabled={i === vagas.length - 1}
                  onClick={() => moverSecao(i, 1)}
                  className="h-8 w-8 text-[#6B4B36]"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                {vaga && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover seção ${i + 1}`}
                    onClick={() => setVagas((l) => l.map((v, j) => (j === i ? null : v)))}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {vaga ? (
              <EditorSecao indice={i} secao={vaga} onMudar={(c) => mudar(i, c)} />
            ) : (
              <button
                type="button"
                onClick={() => setVagas((l) => l.map((v, j) => (j === i ? novaSecao() : v)))}
                className="w-full py-10 rounded-xl border-2 border-dashed border-[#DFC3AE] bg-[#F7F3EA]/50 hover:border-[#C48864] flex flex-col items-center gap-1.5 text-[#6B4B36]"
              >
                <Plus className="w-6 h-6 text-[#94603D]" />
                <span className="text-xs font-semibold">Adicionar seção</span>
              </button>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function EditorSecao({
  indice,
  secao,
  onMudar,
}: {
  indice: number
  secao: SecaoInicio
  onMudar: (campos: Partial<SecaoInicio>) => void
}) {
  const { state } = useCriartere()
  const [busca, setBusca] = useState('')
  const id = (campo: string) => `secao-${indice}-${campo}`

  const produtosLoja = useMemo(
    () =>
      state.produtos
        .filter((p) => p.ativo && p.publicadoLoja !== false)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [state.produtos],
  )
  const categorias = state.categoriasProduto.map((c) => c.nome)
  const escolhidos = (secao.produtoIds ?? [])
    .map((pid) => produtosLoja.find((p) => p.id === pid))
    .filter((p): p is (typeof produtosLoja)[number] => Boolean(p))
  const qtdNaCategoria = secao.categoria
    ? produtosLoja.filter((p) => produtoTemCategoria(p, secao.categoria!)).length
    : 0

  const moverProduto = (i: number, direcao: -1 | 1) => {
    const ids = [...(secao.produtoIds ?? [])]
    const j = i + direcao
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    onMudar({ produtoIds: ids })
  }

  return (
    <div className="space-y-3">
      {/* O que a seção mostra */}
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="O que a seção mostra">
        {(
          [
            { valor: 'categoria', rotulo: 'Uma categoria', icone: Tags },
            { valor: 'produtos', rotulo: 'Produtos escolhidos', icone: LayoutList },
          ] as const
        ).map((op) => (
          <button
            key={op.valor}
            type="button"
            role="radio"
            aria-checked={secao.tipo === op.valor}
            onClick={() => onMudar({ tipo: op.valor })}
            className={`flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-colors ${
              secao.tipo === op.valor
                ? 'border-[#A5683F] bg-[#C48864]/10 text-[#94603D]'
                : 'border-[#DFC3AE] text-[#6B4B36] hover:border-[#C48864]'
            }`}
          >
            <op.icone className="w-3.5 h-3.5" />
            {op.rotulo}
          </button>
        ))}
      </div>

      {secao.tipo === 'categoria' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor={id('categoria')} className={lbl}>
              Categoria
            </Label>
            <Select
              value={secao.categoria || ''}
              onValueChange={(v) => v && onMudar({ categoria: v })}
            >
              <SelectTrigger id={id('categoria')} className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue placeholder="Escolha a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {secao.categoria && (
              <p className="text-[10px] text-[#6B4B36]">
                {qtdNaCategoria === 0
                  ? 'Sem produtos publicados nesta categoria: a seção não aparece na loja.'
                  : `${qtdNaCategoria} ${qtdNaCategoria === 1 ? 'produto' : 'produtos'} (até ${MAX_PRODUTOS} na home, com "Ver todos").`}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={id('ordem')} className={lbl}>
              Ordem dos produtos
            </Label>
            <Select
              value={secao.ordem ?? 'novidades'}
              onValueChange={(v) => v && onMudar({ ordem: v as OrdemSecao })}
            >
              <SelectTrigger id={id('ordem')} className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDENS.map((o) => (
                  <SelectItem key={o.valor} value={o.valor} className="text-xs">
                    {o.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className={lbl}>
            Produtos ({escolhidos.length}/{MAX_PRODUTOS})
          </p>
          {escolhidos.length > 0 && (
            <ol className="space-y-1">
              {escolhidos.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-1 rounded-lg border border-[#DFC3AE]/70 bg-[#F7F3EA]/50 pl-2"
                >
                  <span className="flex-1 min-w-0 truncate text-xs text-[#0C1014]">
                    {i + 1}. {p.nome}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Subir ${p.nome}`}
                    disabled={i === 0}
                    onClick={() => moverProduto(i, -1)}
                    className="h-7 w-7 text-[#6B4B36]"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Descer ${p.nome}`}
                    disabled={i === escolhidos.length - 1}
                    onClick={() => moverProduto(i, 1)}
                    className="h-7 w-7 text-[#6B4B36]"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Tirar ${p.nome} da seção`}
                    onClick={() =>
                      onMudar({ produtoIds: (secao.produtoIds ?? []).filter((x) => x !== p.id) })
                    }
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B4B36]/90 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              aria-label="Buscar produto para adicionar"
              placeholder="Buscar produto para adicionar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 pl-8 text-xs border-[#DFC3AE]"
            />
          </div>
          <ul className="max-h-44 overflow-y-auto rounded-lg border border-[#DFC3AE]/70 divide-y divide-[#DFC3AE]/40">
            {produtosLoja
              .filter((p) => !(secao.produtoIds ?? []).includes(p.id))
              .filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={escolhidos.length >= MAX_PRODUTOS}
                    onClick={() => onMudar({ produtoIds: [...(secao.produtoIds ?? []), p.id] })}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[#F7F3EA] disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#94603D] shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-[#0C1014]">{p.nome}</span>
                    <span className="shrink-0 text-[10px] text-[#6B4B36]">
                      {formatBRL(p.precoVenda)}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={id('titulo')} className={lbl}>
          Título da seção
          <Opcional />
        </Label>
        <Input
          id={id('titulo')}
          value={secao.titulo ?? ''}
          maxLength={50}
          placeholder={
            secao.tipo === 'categoria'
              ? secao.categoria || 'Nome da categoria'
              : 'Ex.: Mais vendidos, Presentes de Natal'
          }
          onChange={(e) => onMudar({ titulo: e.target.value })}
          className="h-9 text-xs border-[#DFC3AE]"
        />
      </div>
    </div>
  )
}
