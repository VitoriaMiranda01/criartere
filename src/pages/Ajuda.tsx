/* Central de Ajuda: guia prático de uso do sistema, organizado por tela. */
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Banknote,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'

interface Secao {
  subtitulo: string
  passos: string[]
}

interface Topico {
  id: string
  titulo: string
  icone: React.ElementType
  resumo: string
  rota?: string
  secoes: Secao[]
  dicas?: string[]
}

const TOPICOS: Topico[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos',
    icone: Lightbulb,
    resumo: 'O que configurar antes de começar a usar o sistema no dia a dia.',
    secoes: [
      {
        subtitulo: 'Deixe o sistema com a cara da loja',
        passos: [
          'Em Configurações, preencha os Dados Comerciais da Loja (nome, telefone, WhatsApp, Instagram).',
          'Confira a Chave Pix: ela aparece automaticamente nos orçamentos em PDF.',
          'Em Meu perfil, coloque sua foto e o nome que deve aparecer no menu.',
        ],
      },
      {
        subtitulo: 'Cadastre o básico',
        passos: [
          'Cadastre os produtos e serviços mais vendidos em Produtos, com preço de venda e custo.',
          'Cadastre os clientes frequentes em Clientes (também dá para cadastrar na hora de criar um pedido).',
          'Revise as formas de pagamento e as categorias de despesa em Configurações e Financeiro.',
        ],
      },
      {
        subtitulo: 'Rotina sugerida',
        passos: [
          'Pedido de orçamento → crie um Orçamento e envie o PDF ao cliente.',
          'Cliente aprovou → clique em "Aprovado → virar pedido".',
          'Acompanhe a produção arrastando o pedido entre as colunas do Kanban.',
          'Recebeu um valor → registre o pagamento no pedido.',
          'Pagou uma conta → lance a despesa no Financeiro.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    titulo: 'Dashboard (Início)',
    icone: LayoutDashboard,
    resumo: 'Resumo da loja: vendas, valores recebidos, contas e pedidos em andamento.',
    rota: '/',
    secoes: [
      {
        subtitulo: 'Entendendo os números',
        passos: [
          'Faturamento Total: soma dos pedidos (não cancelados) criados no período, pagos ou não. É a receita prevista.',
          'Total Recebido: o que de fato entrou no caixa no período (pagamentos registrados).',
          'Total a Receber: quanto ainda falta receber dos pedidos do período.',
          'Despesas Pagas / Pendentes: contas já pagas e contas ainda em aberto no período.',
          'Resultado: Total Recebido menos Despesas Pagas, ou seja, o lucro realizado.',
        ],
      },
      {
        subtitulo: 'Dicas de uso',
        passos: [
          'Use a barra de período (Hoje, 7 dias, Mês atual...) para mudar o intervalo analisado.',
          'Clique em um status operacional para abrir a tela de Pedidos já filtrada.',
          '"A Receber em Breve" lista os pedidos com saldo pendente para você cobrar.',
        ],
      },
    ],
  },
  {
    id: 'pedidos',
    titulo: 'Pedidos',
    icone: ShoppingBag,
    resumo: 'Cadastro, produção (Kanban), pagamentos e histórico de cada pedido.',
    rota: '/pedidos',
    secoes: [
      {
        subtitulo: 'Criar um pedido',
        passos: [
          'Clique em "Novo Pedido".',
          'Escolha o cliente (ou cadastre um novo ali mesmo).',
          'Adicione os itens: escolha do catálogo ou digite a descrição, a quantidade e o valor.',
          'Informe frete, desconto, forma de pagamento, prazo de entrega e salve.',
          'O número do pedido (0001, 0002...) é gerado automaticamente.',
        ],
      },
      {
        subtitulo: 'Acompanhar a produção (Kanban)',
        passos: [
          'Cada coluna é uma etapa (Novo pedido, Em produção, Entregue...).',
          'Arraste o cartão do pedido para outra coluna para mudar a etapa. A mudança fica no histórico.',
          'Use o botão Lista/Kanban no topo para alternar entre as visualizações.',
        ],
      },
      {
        subtitulo: 'Personalizar as colunas',
        passos: [
          'Clique em "Nova coluna" para criar uma etapa (ex.: "Aguardando arte", "Acabamento").',
          'No menu "⋯" de cada coluna dá para renomear, mudar a cor, mover para a esquerda/direita ou excluir.',
          'Ao excluir uma coluna com pedidos, o sistema pergunta para qual coluna eles devem ir.',
          'Novo pedido, Aguardando pagamento, Entregue e Cancelado são usadas pelo sistema: dá para renomear e mudar a cor, mas não excluir.',
        ],
      },
      {
        subtitulo: 'Registrar pagamentos',
        passos: [
          'Abra o pedido e clique em "Registrar pagamento".',
          'Informe o valor recebido, a data e a forma. Pode ser parcial (sinal) e completar depois.',
          'O status muda sozinho: Pendente → Parcial → Pago.',
          'Pagamentos não podem ser apagados (segurança do caixa). Se lançar errado, registre a correção nas observações.',
        ],
      },
      {
        subtitulo: 'Cancelar um pedido',
        passos: [
          'Abra o pedido e clique em "Cancelar pedido". Se quiser, informe o motivo.',
          'O pedido sai do faturamento e aparece no relatório de Pedidos Cancelados.',
        ],
      },
    ],
  },
  {
    id: 'orcamentos',
    titulo: 'Orçamentos',
    icone: FileText,
    resumo: 'Monte orçamentos, envie o PDF ao cliente e transforme em pedido quando aprovado.',
    rota: '/orcamentos',
    secoes: [
      {
        subtitulo: 'Criar e enviar',
        passos: [
          'Clique em "Novo Orçamento" e informe o cliente (cadastrado ou só o nome).',
          'Adicione os itens, a disponibilidade (ex.: Pronta entrega) e as formas de pagamento aceitas.',
          'Escolha a condição: Integral (sem sinal) ou Com sinal (ex.: 50% para confirmar o pedido).',
          'Salve. O número é criado pela data (ex.: 051126; se houver outro no mesmo dia, 051126-2).',
          '"Baixar PDF" salva o arquivo; "Enviar" abre o compartilhamento do celular (WhatsApp, e-mail...).',
        ],
      },
      {
        subtitulo: 'Cliente aprovou?',
        passos: [
          'Clique em "Aprovado → virar pedido" e confirme o prazo de entrega.',
          'O pedido é criado com os mesmos itens e valores. Se o cliente não era cadastrado, ele é cadastrado automaticamente.',
          'O orçamento fica como "Aprovado" com o botão "Ver pedido".',
        ],
      },
      {
        subtitulo: 'Outras situações',
        passos: [
          'Cliente desistiu: no menu "⋯" do orçamento, marque como Recusado.',
          'Passou o prazo sem resposta: marque como Expirado.',
          'Orçamentos não contam no faturamento enquanto não viram pedido.',
        ],
      },
    ],
    dicas: ['A chave Pix cadastrada em Configurações entra sozinha nas observações do PDF.'],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    icone: Users,
    resumo: 'Cadastro de clientes com histórico de compras e valores a receber.',
    rota: '/clientes',
    secoes: [
      {
        subtitulo: 'Como usar',
        passos: [
          'Clique em "Novo Cliente". Só nome e telefone são obrigatórios.',
          'Se o telefone já existir, o sistema avisa para evitar cadastro duplicado.',
          'Clique no cliente para ver todos os pedidos, o total comprado e o que ainda falta receber.',
          'Clientes com pedidos não podem ser excluídos, para não perder o histórico.',
        ],
      },
    ],
  },
  {
    id: 'produtos',
    titulo: 'Produtos',
    icone: Package,
    resumo: 'Catálogo com preços, custos e categorias para agilizar pedidos e orçamentos.',
    rota: '/produtos',
    secoes: [
      {
        subtitulo: 'Como usar',
        passos: [
          'Cadastre nome, preço de venda e categoria. Custo e estoque são opcionais, mas ajudam a ver a margem.',
          'Produtos cadastrados aparecem para escolha rápida em pedidos e orçamentos (o preço já vem preenchido).',
          'Desmarque "Produto Ativo no Catálogo" para tirar um produto da lista sem apagar o histórico.',
        ],
      },
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    icone: Banknote,
    resumo: 'Recebimentos dos pedidos e controle de despesas (contas a pagar).',
    rota: '/financeiro',
    secoes: [
      {
        subtitulo: 'Despesas',
        passos: [
          'Na aba "Despesas & Saídas", clique em "Nova Despesa" e informe descrição, categoria, valor, data e se já está paga.',
          'Despesas pendentes funcionam como contas a pagar. Clique no status para marcar como paga.',
          'Em "Categorias" você cria, renomeia ou exclui categorias (ex.: Filamento, Papel e tinta).',
        ],
      },
      {
        subtitulo: 'Recebimentos',
        passos: [
          'A aba "Receitas & Pedidos" mostra cada pedido com o que já foi recebido e o saldo restante.',
          'Use o botão "Receber" para registrar um pagamento sem precisar abrir o pedido.',
        ],
      },
    ],
  },
  {
    id: 'fluxo-de-caixa',
    titulo: 'Fluxo de Caixa',
    icone: TrendingUp,
    resumo: 'Todas as entradas e saídas em ordem de data, com saldo do caixa.',
    rota: '/fluxo-de-caixa',
    secoes: [
      {
        subtitulo: 'Como ler',
        passos: [
          'Entradas são pagamentos recebidos; saídas são despesas.',
          'O Saldo Final considera somente o que já aconteceu (recebido e pago).',
          'Valores previstos (a receber e contas pendentes) aparecem tracejados e não entram no saldo.',
          'Use os filtros para ver só entradas, só saídas ou só pendências.',
        ],
      },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios',
    icone: BarChart3,
    resumo: 'Análises de vendas, produtos, clientes, despesas e cobranças, com exportação.',
    rota: '/relatorios',
    secoes: [
      {
        subtitulo: 'Relatórios disponíveis',
        passos: [
          'Vendas por período, produtos mais vendidos e clientes que mais compram.',
          'Despesas por categoria e evolução financeira mês a mês.',
          'Pedidos cancelados, pedidos aguardando pagamento e valores a receber (cobrança).',
        ],
      },
      {
        subtitulo: 'Exportar',
        passos: [
          '"Exportar Excel (.csv)" baixa uma planilha que abre no Excel ou no Google Planilhas.',
          '"Exportar PDF / Imprimir" abre a impressão; escolha "Salvar como PDF" para guardar o arquivo.',
        ],
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações e usuários',
    icone: Settings,
    resumo: 'Perfil, dados da loja, Pix, preferências e quem pode acessar o sistema.',
    rota: '/configuracoes',
    secoes: [
      {
        subtitulo: 'Meu perfil e senha',
        passos: [
          'Em Meu perfil, troque a foto e o nome. Também dá para chegar lá clicando na sua foto no menu.',
          'Em Dados de Acesso, troque a senha (mínimo de 8 caracteres). Use o ícone de olho para ver o que digitou.',
        ],
      },
      {
        subtitulo: 'Usuários e permissões',
        passos: [
          'Qualquer pessoa pode criar uma conta, mas só administradores veem os dados da loja.',
          'Para liberar alguém: peça para a pessoa criar a conta e escolha o papel dela ao lado do nome: Administrador(a), Desenvolvedor(a) ou Cliente.',
          'Desenvolvedor(a) usa o sistema com dados fictícios, para manutenção e testes: não vê clientes, pedidos nem finanças reais, e nada do que faz é salvo.',
          'Para tirar o acesso: mude o papel para Cliente. O sistema não deixa ficar sem nenhum administrador.',
        ],
      },
      {
        subtitulo: 'Preferências',
        passos: [
          'Período Padrão do Dashboard: o intervalo que aparece ao abrir o Início.',
          'Faturamento Previsto: escolha se pedidos aguardando pagamento entram no Faturamento Total.',
        ],
      },
    ],
  },
  {
    id: 'instalar-app',
    titulo: 'Instalar no celular ou computador',
    icone: Smartphone,
    resumo: 'Use o sistema como um aplicativo, com ícone na tela inicial.',
    secoes: [
      {
        subtitulo: 'iPhone (pelo Safari)',
        passos: [
          'Abra criartere.com.br no Safari (precisa ser o Safari; no Chrome do iPhone a opção pode não aparecer).',
          'Toque no botão Compartilhar (o quadrado com uma seta para cima), na barra de baixo.',
          'Role a lista e toque em "Adicionar à Tela de Início".',
          'Confira o nome "Criartere" e toque em Adicionar.',
        ],
      },
      {
        subtitulo: 'Android (pelo Chrome)',
        passos: [
          'Abra criartere.com.br no Chrome.',
          'Toque nos três pontinhos (⋮) no canto superior direito.',
          'Toque em "Instalar app" ou "Adicionar à tela inicial".',
          'Confirme em Instalar.',
        ],
      },
      {
        subtitulo: 'Computador (Chrome ou Edge)',
        passos: [
          'Abra criartere.com.br.',
          'Clique no ícone de instalar, no canto direito da barra de endereço.',
          'Confirme em Instalar. O sistema abre em uma janela própria e ganha atalho no menu Iniciar.',
        ],
      },
    ],
    dicas: [
      'Pronto: o ícone da Criartere fica na tela inicial e abre em tela cheia, sem a barra do navegador. Na primeira vez, entre com seu e-mail e senha; depois o login fica salvo.',
      'Se uma novidade não aparecer, feche o app por completo e abra de novo.',
      'O app atualiza sozinho. Os dados ficam na nuvem: é preciso internet, e dá para usar em vários aparelhos ao mesmo tempo.',
      'Para desinstalar, segure o ícone e escolha remover, como qualquer outro app.',
    ],
  },
]

const FAQ: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'Qual a diferença entre Faturamento e Total Recebido?',
    resposta:
      'Faturamento é o valor total dos pedidos vendidos (mesmo os ainda não pagos). Total Recebido é o dinheiro que de fato entrou.',
  },
  {
    pergunta: 'O cliente pagou um sinal. Como registro?',
    resposta:
      'Abra o pedido e registre um pagamento com o valor do sinal. O pedido fica como "Parcial" até você registrar o restante.',
  },
  {
    pergunta: 'Lancei um pagamento errado. Como apago?',
    resposta:
      'Por segurança, pagamentos não podem ser apagados. Anote a correção nas observações do pedido e, se necessário, peça ajuda ao suporte técnico.',
  },
  {
    pergunta: 'Usei o sistema em outro aparelho e não vejo a alteração.',
    resposta:
      'Os dados se atualizam ao voltar para a aba ou quando a internet volta. Se quiser na hora, recarregue a página.',
  },
  {
    pergunta: 'Esqueci minha senha. E agora?',
    resposta:
      'Peça a outra administradora para entrar em contato com o suporte técnico, que redefine a senha pelo painel do sistema.',
  },
  {
    pergunta: 'O sistema funciona sem internet?',
    resposta:
      'O app abre, mas os dados (pedidos, clientes, finanças) precisam de internet para carregar e salvar.',
  },
]

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export default function Ajuda() {
  const location = useLocation()
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState<string[]>([])

  // Abre e rola até o tópico indicado no endereço (#pedidos, #orcamentos...)
  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (id && TOPICOS.some((t) => t.id === id)) {
      setAbertos((a) => (a.includes(id) ? a : [...a, id]))
      setTimeout(
        () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        50,
      )
    }
  }, [location.hash])

  const termo = normalizar(busca.trim())

  const topicosFiltrados = useMemo(() => {
    if (!termo) return TOPICOS
    return TOPICOS.filter((t) =>
      normalizar(
        [
          t.titulo,
          t.resumo,
          ...t.secoes.flatMap((s) => [s.subtitulo, ...s.passos]),
          ...(t.dicas ?? []),
        ].join(' '),
      ).includes(termo),
    )
  }, [termo])

  const faqFiltrado = useMemo(
    () =>
      termo ? FAQ.filter((f) => normalizar(`${f.pergunta} ${f.resposta}`).includes(termo)) : FAQ,
    [termo],
  )

  // Ao buscar, abre os resultados automaticamente
  const valorAberto = termo ? topicosFiltrados.map((t) => t.id) : abertos

  return (
    <div className="space-y-6 max-w-4xl">
      {/* CABEÇALHO */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold text-[#0C1014] flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[#94603D]" />
          Ajuda
        </h2>
        <p className="text-xs text-[#6B4B36]">
          Guia prático de cada parte do sistema. Procure pelo assunto ou abra um tópico abaixo. Nas
          telas, o ícone <HelpCircle className="inline w-3.5 h-3.5 -mt-0.5" /> explica o recurso ao
          lado dele.
        </p>
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="O que você quer fazer? Ex.: sinal, PDF, coluna, senha..."
          className="pl-9 pr-9 h-11 text-sm border-[#DFC3AE] bg-white"
          aria-label="Buscar na ajuda"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B4B36] hover:text-[#0C1014]"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ATALHOS (só sem busca) */}
      {!termo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOPICOS.filter((t) => t.rota)
            .slice(0, 8)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setAbertos((a) => (a.includes(t.id) ? a : [...a, t.id]))
                  setTimeout(
                    () =>
                      document
                        .getElementById(t.id)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    50,
                  )
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#DFC3AE]/70 hover:border-[#C48864] hover:bg-[#F7F3EA] text-left text-xs font-semibold text-[#0C1014] transition-colors"
              >
                <t.icone className="w-4 h-4 text-[#94603D] shrink-0" />
                <span className="truncate">{t.titulo}</span>
              </button>
            ))}
        </div>
      )}

      {/* TÓPICOS */}
      {topicosFiltrados.length > 0 && (
        <Accordion
          type="multiple"
          value={valorAberto}
          onValueChange={(v) => !termo && setAbertos(v)}
          className="space-y-2"
        >
          {topicosFiltrados.map((t) => (
            <AccordionItem
              key={t.id}
              value={t.id}
              id={t.id}
              className="bg-white border border-[#DFC3AE]/70 rounded-xl px-4 scroll-mt-6"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-start gap-3 text-left">
                  <span className="w-9 h-9 rounded-lg bg-[#F7F3EA] flex items-center justify-center shrink-0">
                    <t.icone className="w-4 h-4 text-[#94603D]" />
                  </span>
                  <span>
                    <span className="block font-serif font-bold text-[#0C1014]">{t.titulo}</span>
                    <span className="block text-xs font-normal text-[#6B4B36]">{t.resumo}</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5 space-y-4">
                {t.secoes.map((s) => (
                  <div key={s.subtitulo} className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B4B36]">
                      {s.subtitulo}
                    </p>
                    <ol className="space-y-1.5">
                      {s.passos.map((p, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm text-[#0C1014]/90 leading-relaxed"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#C48864]/15 text-[#8A5A3B] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                {t.dicas?.map((d) => (
                  <p
                    key={d}
                    className="text-xs text-[#6B4B36] bg-[#F7F3EA] border border-[#DFC3AE]/60 rounded-lg p-3 flex gap-2"
                  >
                    <Lightbulb className="w-4 h-4 text-[#8A6416] shrink-0" />
                    <span>{d}</span>
                  </p>
                ))}
                {t.rota && (
                  <Link
                    to={t.rota}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#94603D] hover:underline"
                  >
                    Ir para {t.titulo.split(' (')[0]}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* DÚVIDAS FREQUENTES */}
      {faqFiltrado.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-serif text-lg font-bold text-[#0C1014]">Dúvidas frequentes</h3>
          <div className="bg-white border border-[#DFC3AE]/70 rounded-xl divide-y divide-[#DFC3AE]/40">
            {faqFiltrado.map((f) => (
              <details key={f.pergunta} className="group p-4" open={!!termo}>
                <summary className="cursor-pointer list-none flex justify-between gap-3 text-sm font-semibold text-[#0C1014]">
                  {f.pergunta}
                  <span className="text-[#94603D] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-[#6B4B36] leading-relaxed">{f.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {termo && topicosFiltrados.length === 0 && faqFiltrado.length === 0 && (
        <div className="bg-white border border-dashed border-[#DFC3AE] rounded-xl p-8 text-center text-sm text-[#6B4B36]">
          Nada encontrado para "{busca}". Tente outra palavra, como "pedido", "pagamento" ou "PDF".
        </div>
      )}
    </div>
  )
}
