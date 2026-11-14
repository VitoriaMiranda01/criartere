# Projeto Criado com o Skip

Sistema de gestão da Criartere (impressão 3D e gráfica). Projeto iniciado com o [Skip](https://goskip.dev).

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## 🗄️ Backend (Supabase)

Os dados ficam no projeto Supabase **Criartere** (`kitarrykwoaxlrydethm`).

- **Conexão:** `src/lib/supabase.ts`, configurada pelas variáveis do arquivo `.env`
  (`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, que são públicas).
- **Acesso a dados:** `src/store/db.ts` carrega as tabelas e grava cada ação do store;
  `src/store/CriartereContext.tsx` aplica as mudanças na tela na hora e salva em seguida.
- **Banco:** as tabelas, políticas de segurança (RLS) e funções estão em `supabase/migrations/`.
  Regras como número do pedido (0001, 0002…), status de pagamento e histórico são calculadas no banco.
- **Quem acessa:** qualquer pessoa pode criar conta (papel `cliente`) e usar a loja virtual, mas só
  contas com papel `admin` (tabela `perfis`) entram no sistema de gestão; clientes que tentam abrir o
  painel veem "Somente administradores podem acessar este site." com o atalho para a loja. Administradores liberam outras contas em
  **Configurações → Usuários e permissões** (o sistema não deixa remover o último administrador).
  Pensado para um futuro e-commerce: clientes usam o mesmo login, com acesso só aos próprios dados.

## 🧭 Endereços

- `https://criartere.com.br/` → **loja virtual** (catálogo). Páginas da loja: `/produto/<nome>-<id>`, `/favoritos`, `/carrinho`, `/entrar`.
- `https://criartere.com.br/admin` → **painel administrativo** (login em `/admin/login`).
- Endereços antigos redirecionam: `/loja/...` → raiz do site; `/pedidos`, `/login`… → `/admin/...`.

## 🛍️ Loja virtual (raiz do site)

- **Catálogo público** na página inicial (`criartere.com.br`).
  Usa o mesmo cadastro de produtos do painel: aparecem os produtos **ativos** e com
  **"Publicado na loja virtual"** ligado (campo `produtos.publicado_loja`).
- Os visitantes leem a vitrine pela função `vitrine_produtos()`, que **não expõe custo nem estoque**
  (só mostra "Pronta entrega" quando o estoque é maior que zero, ou "Sob encomenda").
- **Clientes** (papel `cliente`) criam conta em `/entrar` e têm **favoritos** (`favoritos`) e
  **carrinho** (`carrinhos` + `carrinho_itens`), protegidos por RLS: cada um só vê e altera os próprios.
- **Várias fotos por produto** (até 8, campo `produtos.imagens`): a primeira é a principal (também gravada em `imagem_url`); a página do produto mostra a galeria.
- **Consultar pelo WhatsApp** usa o número de *Configurações → WhatsApp oficial* e envia o nome e o link do produto.
- **Pedidos pelo site (sem pagamento online):** em `/finalizar` o cliente informa nome, WhatsApp, forma de
  pagamento preferida e observações. A função `criar_pedido_loja()` registra o pedido como **orçamento
  "Aguardando"** (origem `loja`, selo "Site" no painel), usando os preços do banco, vincula/cria o cliente e
  esvazia o carrinho; depois abre o WhatsApp da loja com o resumo. Entrega e frete são combinados no WhatsApp.
  A loja confirma e usa "Aprovado → virar pedido". O cliente acompanha em `/meus-pedidos` (`meus_pedidos_loja()`).
- Código: `src/loja/` (dados, contexto e componentes) e `src/pages/loja/` (telas).

### SEO da loja

- Endereços amigáveis: `/produto/<nome-do-produto>-<id>` (links antigos só com o id continuam funcionando).
- Cada página define título, descrição, endereço canônico, prévia de compartilhamento (foto do produto)
  e dados estruturados do Google (`Product` com preço e disponibilidade; `Store` + `ItemList` no catálogo) — `src/lib/seo.ts` e `src/loja/seo-dados.ts`.
- **No build** (`scripts/seo-prerender.ts`), os produtos publicados são lidos da vitrine e é gerado
  `dist/_paginas/produto/...` e o catálogo no próprio `index.html` (HTML com as metatags certas para WhatsApp, Instagram, Facebook e buscadores que não executam JavaScript)
  e o `sitemap.xml`. O `.htaccess` entrega essas páginas; se o Supabase não responder, o build segue sem elas.
- Produtos novos aparecem na loja na hora; as páginas pré-geradas e o sitemap são atualizados a cada nova publicação do site.

## 🔒 Segurança

- RLS em todas as tabelas: só administradores acessam os dados da loja; visitantes (anon) não têm permissão alguma.
- Histórico de pedidos e pagamentos não podem ser alterados nem apagados pela API (auditoria).
- Regras de negócio (código do pedido, pagamentos, conversão de orçamento) rodam no banco.
- Cabeçalhos HTTP de segurança e Content-Security-Policy em `public/.htaccess`.
- Exportação CSV protegida contra injeção de fórmulas.
- A chave do `.env` é a *publishable* (pública por definição). Nunca coloque a `service_role` no frontend.

## 📋 Pré-requisitos

- Node.js 18+
- npm

## 🔧 Instalação

```bash
npm install
```

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

Para criar uma build otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/` e estarão prontos para deploy.
