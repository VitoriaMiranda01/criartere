import React, { useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Check, X, AlertTriangle, FolderTree } from 'lucide-react'
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
import { toast } from 'sonner'

interface ModalCategoriasProps {
  aberto: boolean
  onFechar: () => void
}

export const ModalCategorias: React.FC<ModalCategoriasProps> = ({ aberto, onFechar }) => {
  const { state, dispatch } = useCriartere()

  const [novaCategoria, setNovaCategoria] = useState('')
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<string | null>(null)

  const handleAdicionar = (e: React.FormEvent) => {
    e.preventDefault()
    const nome = novaCategoria.trim()
    if (!nome) return
    if (state.categoriasDespesa.includes(nome)) {
      toast.error('Esta categoria já existe.')
      return
    }

    dispatch({ type: 'ADICIONAR_CATEGORIA', payload: nome })
    toast.success(`Categoria "${nome}" adicionada!`)
    setNovaCategoria('')
  }

  const handleSalvarEdicao = (antiga: string) => {
    const nova = nomeEditado.trim()
    if (!nova || antiga === nova) {
      setCategoriaEditando(null)
      return
    }

    dispatch({
      type: 'RENOMEAR_CATEGORIA',
      payload: { antiga, nova },
    })
    toast.success(`Categoria renomeada para "${nova}"!`)
    setCategoriaEditando(null)
  }

  const handleConfirmarExclusao = () => {
    if (!categoriaParaExcluir) return

    // Bloquear excluir categoria em uso
    const despesasComEssaCategoria = state.despesas.filter(
      (d) => d.categoria === categoriaParaExcluir,
    )

    if (despesasComEssaCategoria.length > 0) {
      toast.error(
        `Não é possível excluir "${categoriaParaExcluir}": existem ${despesasComEssaCategoria.length} despesa(s) cadastradas nela.`,
      )
      setCategoriaParaExcluir(null)
      return
    }

    dispatch({ type: 'EXCLUIR_CATEGORIA', payload: categoriaParaExcluir })
    toast.success(`Categoria "${categoriaParaExcluir}" excluída.`)
    setCategoriaParaExcluir(null)
  }

  return (
    <>
      <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
        <DialogContent className="sm:max-w-md bg-white border-[#DFC3AE] p-6 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#0C1014] flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#C48864]" />
              Categorias de Despesas
            </DialogTitle>
          </DialogHeader>

          {/* Adicionar nova */}
          <form onSubmit={handleAdicionar} className="flex gap-2 pt-2">
            <Input
              placeholder="Nova categoria..."
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              className="h-9 text-xs border-[#DFC3AE]"
            />
            <Button
              type="submit"
              size="sm"
              className="bg-[#C48864] hover:bg-[#B0764F] text-white text-xs h-9 font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar
            </Button>
          </form>

          {/* Lista de categorias */}
          <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 max-h-72">
            {state.categoriasDespesa.map((cat) => {
              const despesasCount = state.despesas.filter((d) => d.categoria === cat).length
              const emEdicao = categoriaEditando === cat

              return (
                <div
                  key={cat}
                  className="p-2.5 rounded-lg border border-[#DFC3AE]/50 bg-[#F7F3EA]/30 flex items-center justify-between text-xs"
                >
                  {emEdicao ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={nomeEditado}
                        onChange={(e) => setNomeEditado(e.target.value)}
                        className="h-8 text-xs border-[#C48864] bg-white"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSalvarEdicao(cat)}
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCategoriaEditando(null)}
                        className="h-7 w-7 text-gray-500 hover:bg-gray-100 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[#0C1014] truncate">{cat}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-[#6B4B36] border-[#DFC3AE] shrink-0"
                        >
                          {despesasCount} {despesasCount === 1 ? 'despesa' : 'despesas'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setCategoriaEditando(cat)
                            setNomeEditado(cat)
                          }}
                          className="h-7 w-7 text-[#6B4B36] hover:text-[#0C1014]"
                          title="Renomear"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setCategoriaParaExcluir(cat)}
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter className="pt-2 border-t border-[#DFC3AE]/40">
            <Button
              type="button"
              variant="outline"
              onClick={onFechar}
              className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={Boolean(categoriaParaExcluir)}
        onOpenChange={(open) => !open && setCategoriaParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#B5533C]" />
              Excluir Categoria de Despesa?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              {categoriaParaExcluir &&
              state.despesas.filter((d) => d.categoria === categoriaParaExcluir).length > 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <p className="font-bold">Ação Bloqueada:</p>
                  <p>
                    A categoria <strong>{categoriaParaExcluir}</strong> está vinculada a{' '}
                    {state.despesas.filter((d) => d.categoria === categoriaParaExcluir).length}{' '}
                    despesa(s). Reatribua as despesas antes de excluí-la.
                  </p>
                </div>
              ) : (
                <p>
                  Tem certeza que deseja excluir a categoria <strong>{categoriaParaExcluir}</strong>
                  ?
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            {categoriaParaExcluir &&
              state.despesas.filter((d) => d.categoria === categoriaParaExcluir).length === 0 && (
                <AlertDialogAction
                  onClick={handleConfirmarExclusao}
                  className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
