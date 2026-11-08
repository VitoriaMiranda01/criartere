/* Rede de segurança: se uma tela quebrar, mostra uma mensagem amigável
   em vez de deixar a página em branco. */
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Quando muda (ex.: troca de rota), a tela tenta renderizar de novo. */
  chave?: string
}

interface State {
  erro: boolean
}

export class ErroTela extends Component<Props, State> {
  state: State = { erro: false }

  static getDerivedStateFromError(): State {
    return { erro: true }
  }

  componentDidCatch(erro: unknown) {
    console.error('Erro ao exibir a tela:', erro)
  }

  componentDidUpdate(anteriores: Props) {
    if (this.state.erro && anteriores.chave !== this.props.chave) this.setState({ erro: false })
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="mx-auto w-11 h-11 rounded-full bg-[#F6EDE7] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#94603D]" />
          </div>
          <h1 className="font-serif text-lg font-bold text-[#0C1014]">
            Não foi possível abrir esta tela
          </h1>
          <p className="text-sm text-[#6B4B36]">
            Pode ser uma atualização recente do sistema ou uma falha de conexão. Recarregue a página
            para continuar. Seus dados estão salvos.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md bg-[#A5683F] hover:bg-[#8C5636] px-4 py-2 text-sm font-semibold text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
