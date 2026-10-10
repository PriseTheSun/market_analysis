---
name: Market Analysis
description: Interface operacional de agências e clientes, com Montserrat local, ações azuis e superfícies sóbrias.
colors:
  bg: '#f7f9fc'
  surface: '#fff'
  text: '#111827'
  muted: '#56647a'
  border: '#d8dfe9'
  primary: '#0a5ed7'
  primary-hover: '#084eb3'
  soft: '#eaf2ff'
  danger: '#b42318'
  success: '#176b4a'
  bg-dark: '#0b1120'
  surface-dark: '#111827'
  text-dark: '#f8fafc'
  muted-dark: '#aebbcd'
  border-dark: '#334155'
  primary-dark: '#77b2ff'
  primary-hover-dark: '#a0c9ff'
  soft-dark: '#172e4b'
  danger-dark: '#ffaaa4'
  success-dark: '#7bddb0'
  on-action-dark: '#081423'
typography:
  display:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  display-compact:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  headline-mobile:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  title:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  title-mobile:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  subsection:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  chat:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  input:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  input-mobile:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
  subsection-mobile:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  dialog-title:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '0'
  metadata:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  table-heading:
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif'
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.015em
rounded:
  badge: 5px
  control: 8px
  scope: 10px
  container: 12px
  composer: 14px
  dialog: 16px
  auth: 24px
  circle: 50%
spacing:
  '4': 4px
  '8': 8px
  '12': 12px
  '16': 16px
  '20': 20px
  '24': 24px
  '32': 32px
  '40': 40px
  '48': 48px
  '64': 64px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 10px 16px
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-primary-dark:
    backgroundColor: '{colors.primary-dark}'
    textColor: '{colors.on-action-dark}'
  button-primary-dark-hover:
    backgroundColor: '{colors.primary-hover-dark}'
  button-outline:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 10px 16px
  button-outline-hover:
    backgroundColor: '{colors.soft}'
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.muted}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 10px 16px
  button-ghost-hover:
    backgroundColor: '{colors.soft}'
  button-destructive:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 10px 16px
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.input}'
    rounded: '{rounded.control}'
    padding: 12px 14px
    width: 100%
  navigation-item:
    textColor: '{colors.muted}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 12px
  navigation-item-active:
    backgroundColor: '{colors.soft}'
    textColor: '{colors.primary}'
  badge:
    backgroundColor: '{colors.soft}'
    textColor: '{colors.primary}'
    rounded: '{rounded.badge}'
    padding: 4px 8px
  context-card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.container}'
    padding: 20px
  chat-composer:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.composer}'
  administration-table:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.container}'
  button-destructive-dark:
    backgroundColor: '{colors.danger-dark}'
    textColor: '{colors.on-action-dark}'
---

# Design System: Market Analysis

## Overview

**Creative North Star: "Clareza operacional"**

A identidade aprovada combina Montserrat local, ações azuis, superfícies sólidas e informação operacional legível. A marca vetorial e o vídeo fornecidos pelo usuário definem a presença visual da autenticação; as telas internas mantêm a atenção no contexto do cliente, nos dados reais e na próxima ação.

Este registro atualiza o sistema existente a partir de apps/web/src/styles.css e dos componentes implementados. Preserva as decisões de PRODUCT.md, das referências em docs/references e da seção 9 do OpenSpec. A expressão é contida e funcional; a interface mantém visível o caráter demonstrativo das respostas do chat, sem transformar a apresentação visual em promessa de análise de mercado ou de arquivos.

**Key Characteristics:**

- Uma família tipográfica local, com pesos 400, 500 e 600.
- Azul para ação, seleção e foco; estados acompanhados de texto.
- Tema claro inicial e tema escuro escolhido pelo usuário.
- Bordas discretas, cantos arredondados e sombras reservadas a superfícies sobrepostas.
- Formulários sólidos; mídia de autenticação separada do conteúdo HTML.
- Administração tabular no desktop e campos rotulados empilhados nas tabelas administrativas adaptadas ao mobile.

## Colors

O azul de ação contrasta com uma base branca e cinza fria; o tema escuro mantém a mesma hierarquia em superfícies azul-marinho. O frontmatter conserva os valores CSS de origem. As chaves com sufixo `-dark` correspondem às substituições de tema dos mesmos papéis semânticos. As rampas em OKLCH do sidecar são prévias sintéticas para o painel, não novas cores adotadas pela aplicação.

### Primary

- **Azul de ação** (`primary` / `primary-dark`): botões primários, links, seleção, ícones de contexto e foco.
- **Azul de interação** (`primary-hover` / `primary-hover-dark`): hover do botão primário.
- **Azul suave** (`soft` / `soft-dark`): seleção da navegação, badges neutros e hover de controles secundários.
- **Texto sobre ação escura** (`on-action-dark`): texto dos botões primário e destrutivo no tema escuro. No tema claro, o texto desses botões é branco.

### Secondary

- **Vermelho de erro** (`danger` / `danger-dark`): borda de campo inválido, mensagem de erro e ação destrutiva.
- **Verde de confirmação** (`success` / `success-dark`): confirmação e status positivos. Fundos de status usam mistura de 9% da cor semântica com a superfície; as expressões CSS completas ficam no sidecar.

### Neutral

- **Fundo de trabalho** (`bg` / `bg-dark`): plano atrás das superfícies e fundo de cabeçalho de tabela.
- **Superfície** (`surface` / `surface-dark`): formulário, navegação, cabeçalho, campos e painéis.
- **Texto principal** (`text` / `text-dark`): títulos e conteúdo operacional.
- **Texto secundário** (`muted` / `muted-dark`): ajuda, metadados e controles de menor ênfase.
- **Borda** (`border` / `border-dark`): campos, divisórias e contornos de contêineres.

**The Ação e estado Rule.** Use primary para ações, links e seleção; use danger e success com rótulos explícitos. A cor reforça o significado do conteúdo.

## Typography

**Display Font:** Montserrat Variable, Montserrat, Arial, sans-serif.
**Body Font:** a mesma família local, carregada por `@fontsource-variable/montserrat`.

A hierarquia depende de tamanho, peso e espaço. Os pesos de interface documentados são 400, 500 e 600; os valores normativos estão no frontmatter.

### Hierarchy

- **Display:** apresentação HTML da autenticação; a versão compacta entra até 960px. Não acrescenta um segundo h1 à página.
- **Headline:** título de página; a versão mobile entra até 700px.
- **Title:** título de seção; a versão mobile entra até 700px.
- **Subsection:** título subordinado; a versão mobile entra até 700px.
- **Dialog title:** título compacto de diálogo.
- **Metadata:** informação de apoio e textos pequenos.
- **Table heading:** cabeçalho de coluna, com peso médio e tracking discreto.
- **Body:** conteúdo operacional e texto secundário. Descrições de página têm largura máxima de 70ch; estados vazios usam 48ch.
- **Chat:** mensagens com largura máxima de 740px e quebra de palavras longas; texto inicial limitado a 56ch.
- **Label:** labels de formulário, botões e navegação. Campos usam fonte de corpo, com tamanho mobile próprio até 700px.

Trechos de código dentro de mensagens usam monospace (13px), sem criar uma segunda família para a interface.

**The Uma família Rule.** Use Montserrat local para a interface. Preserve a marca fornecida como SVG; o logotipo não é um título tipográfico reconstruído.

## Layout

A composição de autenticação mantém vídeo à esquerda e formulário à direita: duas colunas proporcionais (1.06fr / 0.94fr), espaçamento entre colunas (32px), margem externa (20px), painel visual com altura mínima (720px) e formulário com largura máxima (460px). Até 1200px, o espaço entre colunas cai para 16px; até 960px, a proporção passa a 0.9fr / 1.1fr e a margem externa a 16px. A partir de 1600px, o formulário pode alcançar 480px. Até 700px, a mídia sai do layout e o formulário ocupa a tela com marca compacta e idioma no topo.

O app usa uma coluna de navegação persistente (248px) e conteúdo flexível. A coluna passa a 224px até 1200px; o estado recolhido usa 80px. Até 960px, o cabeçalho oferece abertura de drawer (280px). O cabeçalho mede 80px no desktop e 72px até 700px. O conteúdo geral tem largura máxima de 1440px, padding de 40px nas laterais no desktop, 24px até 1200px e 20px até 700px.

O chat tem coluna de histórico (228px; 190px até 1200px; 200px até 960px) e área flexível de mensagens. Até 700px, o histórico vira faixa horizontal e o compositor fica abaixo das mensagens. O convite ao tour participa do fluxo. Cabeçalho e convite preservam a própria altura, enquanto o contêiner flexível da rota e o chat ocupam o espaço restante do viewport; o convite não se sobrepõe ao compositor.

As tabelas administrativas com adaptação responsiva — incluindo Membros e Convites — mantêm cabeçalhos no desktop e, até 600px, mostram cada registro como bloco: padding externo de 16px, células empilhadas com padding vertical de 8px e rótulos traduzidos acima dos valores. A primeira célula mantém a identidade sem repetir o rótulo. Outros contêineres tabulares ainda conservam overflow horizontal quando necessário; essa característica não autoriza recortar ações ou dados essenciais.

O ritmo principal está na escala de espaçamento do frontmatter, incluindo os intervalos de 20px e 40px efetivamente usados nos formulários e páginas. Não aplicar uma escala planejada mais estreita sobre estes valores observados.

## Elevation & Depth

Fundo, superfície e borda organizam a maior parte da interface. Diálogos e o menu de notificações usam a sombra ambiental do tema. O vídeo de autenticação tem uma máscara independente em degradê escuro para sustentar texto branco opaco; não há sombra dura deslocada.

### Shadow Vocabulary

- **Sobreposição clara:** `0 16px 48px rgb(12 28 50 / 15%)`.
- **Sobreposição escura:** `0 16px 48px rgb(0 0 0 / 40%)`.
- **Scrim de diálogo:** `rgba(3, 9, 18, 0.55)`; camada de fundo do diálogo e do drawer.

**The Elevação contextual Rule.** Use a sombra documentada em diálogos e no menu de notificações. As superfícies de trabalho se separam por fundo, borda e espaço.

## Shapes

Controles usam o raio `control`; contêineres tabulares, listas e cartões de contexto usam `container`. O diálogo usa `dialog`, o compositor usa `composer` e o painel de autenticação usa `auth`. Badges têm raio menor (`badge`); avatar e controles circulares usam `circle`. Bordas comuns são de 1px. O upload usa borda tracejada, mantendo a mesma cor de divisória.

Ícones de controle vêm de Lucide, com traço de 1.75 e base de 20px. Ícones compactos de histórico usam 16px; estados vazios e ilustrações de estado podem usar dimensões maiores, sem substituir a marca vetorial.

## Components

### Buttons

Botões combinam rótulo em peso médio com canto de controle, gap de 8px e altura mínima de 42px. Primário, contorno, ghost e destrutivo são as quatro variantes implementadas. A variante pequena usa altura mínima de 36px, padding de 8px 12px e texto de 12px; a variante de ícone mede 42px por 42px. A ação principal do formulário de autenticação tem altura mínima de 50px.

Primário troca para a cor de hover; contorno e ghost recebem fundo suave. As transições de fundo e texto duram 160ms. O foco global usa contorno de 2px na cor primária, afastado 4px. Controles desabilitados têm opacidade 0.55 e cursor de indisponível.

### Chips

Badges são rótulos de status, com texto de 12px em peso 500. O estado neutro usa fundo suave e texto primário. Estados positivos e negativos usam cores semânticas com fundo misturado à superfície; o nome traduzido continua visível. Não são filtros interativos.

### Cards / Containers

A entrada respeita o perfil: Global acessa a administração global; os demais perfis acessam o último cliente autorizado ou a agência disponível. A troca de cliente e de área administrativa ocorre no seletor de contexto do cabeçalho, também acessível no mobile. O seletor lista as agências autorizadas e expande os clientes dentro da agência escolhida; o contexto atual recebe indicador e fundo suave. O menu tem largura máxima de 320px, limite à largura do viewport e rolagem interna. Tabelas e listas usam contornos e divisórias, sem empilhar sombras. Diálogos têm largura máxima de 520px, rolagem interna quando necessária e padding de 32px; no mobile, 28px 24px.

### Inputs / Fields

Campos possuem altura mínima de 46px, borda de 1px, superfície sólida e padding de 12px 14px. A família é herdada e o peso do valor é 400. Placeholders usam texto secundário com opacidade integral. Erros têm borda semântica, texto adjacente e `aria-invalid`; o foco preserva o contorno global. Campos de senha reservam espaço para um botão visível de mostrar/ocultar.

### Navigation

Itens têm padding de 12px, gap de 12px, texto secundário e canto de controle. Hover usa fundo de trabalho; o item ativo combina fundo suave e texto primário. A mesma linguagem aparece na navegação lateral e no drawer. O contexto do cliente e o usuário permanecem partes distintas da navegação.

### Chat composer

O compositor é um contêiner sólido com borda, largura máxima de 740px e textarea sem borda própria. O foco envolve o contêiner inteiro com contorno de 2px e afastamento de 3px. No mobile, as margens laterais são 16px e o textarea usa 16px; a ação de envio permanece acessível abaixo do conteúdo.

### Motion and feedback

Preferências usa um painel central de até 1122px de conteúdo, com seções de Foto de perfil, Aparência e Idioma. No desktop, cada seção possui descrição à esquerda e controles à direita; no mobile, as colunas são empilhadas. Aparência oferece opções de rádio com miniaturas clara e escura. Idioma mantém o fuso horário existente. As alterações da página ficam em rascunho até Salvar alterações; Descartar alterações restaura os valores persistidos. Os controles globais do cabeçalho mantêm seu salvamento imediato.

O avatar tem prévia circular de 104px (80px no mobile). Alterar foto abre o editor, com arraste, setas do teclado, zoom de 100% a 300%, redefinição, cancelamento e Aplicar enquadramento. O recorte aplicado permanece local até o salvamento da página; Ajustar enquadramento permite editar uma prévia ou foto já salva. A remoção também passa pela confirmação do rodapé. `react-easy-crop` fornece as interações; o canvas exporta os pixels selecionados para WebP de 512px, e a API preserva sua validação e normalização em 256px. A máscara circular é uma prévia de exibição, mantendo o arquivo quadrado. A interface continua com traduções PT/EN/ES, tokens dos dois temas e rótulos acessíveis.

A entrada implementada nos formulários de autenticação e no conteúdo de rota do app é um único bloco: 200ms, easeOut, opacidade de 0.85 a 1, deslocamento vertical de 6px a 0 e blur de 1px a 0. No app, a troca de pathname reinicia a entrada do bloco de rota. Reduced motion remove esse estado inicial e reduz transições/animações CSS a 0.01ms; a rolagem deixa de ser suave. O vídeo pausa quando a aba fica oculta e usa poster sem autoplay sob reduced motion ou economia de dados.

Há um único Sonner no canto inferior esquerdo, com fechamento e duração padrão de 5000ms. O componente compartilhado `components/ui/sonner.tsx` adapta o padrão shadcn/ui: superfície neutra, borda discreta, raio de 8px e cores dos tokens do tema, sem `richColors`. Os tipos success, info, warning e error usam respectivamente CircleCheck, Info, TriangleAlert e OctagonX de 16px; loading usa LoaderCircle animado, estático sob reduced motion. Default permanece sem ícone. Use `toast.promise` para acompanhar uma operação de carregamento até sucesso ou erro na mesma notificação; o salvamento de Preferências adota esse fluxo. Validações de arquivo anteriores ao envio usam warning; falhas de operação usam error. O fechamento e a região de notificações têm rótulos traduzidos. As margens são 24px no desktop e 16px no mobile, respeitando a área segura inferior; o tour ocupa o fluxo em vez de cobrir controles.

## Do's and Don'ts

### Do:

- Do manter as associações semânticas dos tokens ao alternar entre os temas.
- Do preservar a geometria da marca fornecida e o texto traduzível sobre a mídia de autenticação.
- Do usar títulos, rótulos, estados e ações completos nas tabelas administrativas empilhadas.
- Do manter foco visível, mensagens de erro próximas aos campos e nomes acessíveis nos controles de ícone.
- Do respeitar reduced motion e economia de dados no vídeo e manter o formulário utilizável com o poster.
- Do manter visível a indicação de demonstração no chat e apresentar estados vazios com uma próxima ação real.

### Don't:

- Don't acrescentar métricas, gráficos ou capacidades de análise sem dados e implementação correspondentes.
- Don't substituir Montserrat, redesenhar a marca ou gerar mídia para substituir os assets aprovados.
- Don't animar letras, células ou tokens de resposta individualmente, nem bloquear o acesso com uma abertura de marca.
- Don't inserir links institucionais sem conteúdo e destino fornecidos.
- Don't usar uma restrição de largura para ocultar papel, status ou ações essenciais da administração mobile.



## Padrão compartilhado das rotas autenticadas — 10/10/2026

Entrada por perfil: Global inicia no workspace de administração global (`/plataforma/agencias` em português), mesmo após visitar um cliente. A escolha explícita de um cliente continua disponível no seletor do cabeçalho. Os demais perfis mantêm a entrada no último cliente autorizado ou no primeiro disponível. `/app` e o endereço legado `/contexts` seguem a mesma regra.

A referência de Agências passa a reger o shell de toda a aplicação autenticada. A fonte de implementação é `apps/web/src/app-layout.css`, importada depois dos estilos base. As dimensões não devem depender da rota: sidebar 215 px (80 px recolhida), logo 128 × 36 px, cabeçalho 64 px, conteúdo com 23 px laterais no desktop. O seletor de contexto fica no cabeçalho e a conta no rodapé da lateral, sem seta. Preferências e Sair ficam no menu da conta, conforme acesso disponível. À direita do sino, todas as rotas autenticadas exibem o toggle de tema e o seletor de idioma, nessa ordem, com persistência na conta. O toggle usa sol/lua, tooltip e semântica de switch; ambos os controles acompanham o estado da página Preferências. No mobile, o cabeçalho mantém 64 px e compacta os controles e o seletor de contexto.

Tokens do shell claro (substituem os tokens base apenas enquanto o shell autenticado está presente): fundo #f5f9fc, texto #111d4b, secundário #52699f, borda #d3def0, ação #2453ff, hover #193bdb, seleção #e8eeff. No escuro: ação #a2b6ff, hover #c1ceff, seleção #253353, secundário #b7c2db. Portais herdam os tokens do shell.

Títulos principais: 32 px/700 (26 px mobile); cabeçalhos de tabela 11 px/500; linhas com altura mínima de 57 px no desktop. Listagens usam a constante `PAGE_SIZE = 12`; seletores de opções possuem limites próprios. `RecordIdentity`, `ActiveStatus` e `TableSearch` mantêm consistência visual entre cadastros. Ações específicas de cada módulo preservam seu comportamento.

Ícones de menu: 20 px, centralizados em alvos de 44 × 42 px quando recolhidos. Todos os links têm nome acessível e tooltip por hover/foco, com Escape para fechar. Os nomes acessíveis permanecem quando o texto visual é ocultado. Mobile usa drawer e mantém o mesmo tamanho do logo.

Tooltips de navegação usam fundo e borda no azul de marca `--brand-blue: #2453ff`, com texto branco, nos dois temas. O azul de marca é independente do tom adaptado de `--primary` no tema escuro.

Agências, Clientes, Contas e Solicitações usam `record-table` para a coluna de ações de 108 px, centralizada no desktop. Cada registro apresenta um único `RecordActions` com reticências horizontais; comandos ficam no dropdown e reutilizam os formulários existentes. Contas e Solicitações mantêm `RecordIdentity`, 12 registros por página e o padrão de tabela responsiva de Clientes. Solicitações preserva os estados de revisão e entrega do convite.

A lateral abre e recolhe em 280 ms com Motion e curva `cubic-bezier(0.22, 1, 0.36, 1)`. Um único progresso sincroniza largura de 80–215 px, conteúdo, posição dos ícones, recorte da marca, opacidade dos rótulos e rotação do controle. Não há animação inicial ao restaurar a preferência; alternar durante a transição inverte a partir da posição atual. No mobile, o drawer desliza em 280 ms na entrada e 200 ms na saída, acompanhado do fade do backdrop. `useReducedMotion` elimina a transição desktop, e a regra CSS global de movimento reduzido limita as animações mobile a 0.01 ms.


## Terminologia de agência e cliente — 10/10/2026

A hierarquia visível é Agência → Cliente: Publicis → Nivea é um exemplo. Cada cliente pertence a uma agência. Menus, títulos, formulários, solicitações de acesso e mensagens usam Cliente/Clientes, Client/Clients e Cliente/Clientes nos três idiomas. A listagem identifica o cliente e sua agência em colunas separadas. A área Global permanece independente dos espaços dos clientes.

A rota da listagem é `/plataforma/clientes` em português e espanhol e `/platform/clients` em inglês. Endereços antigos de organizações e `/platform/tenants` redirecionam preservando parâmetros e fragmentos. Os contratos internos de tenant e o campo legado de afiliação da solicitação de acesso permanecem compatíveis; esta alteração não modifica dados cadastrados.


## Seletor de workspace por agência — 10/10/2026

Global visualiza todas as agências no seletor, inclusive as sem clientes e as inativas (identificadas e desabilitadas). Super Admin visualiza as agências que administra; Admin e User visualizam as agências dos clientes autorizados, sem ganhar acesso à administração da agência. Todas as páginas da API são carregadas, com 100 opções por requisição, independentemente do limite de 12 registros das tabelas.

Ao selecionar uma agência, o menu permanece aberto e exibe seus clientes em uma lista recuada, com nome, identificação de cliente e indicador da seleção atual. A escolha explícita está disponível com qualquer quantidade de clientes, incluindo dois ou mais. “Acessar agência” aparece somente para Global e Super Admin autorizados. Agências sem clientes operáveis exibem uma mensagem; Administração global permanece uma opção separada para Global. Ao reabrir, a agência atual aparece expandida. As opções são atualizadas ao abrir o menu.

Validação: 32 testes unitários (incluindo três clientes na mesma agência, permissões e 205 agências distribuídas em três páginas), build e lint. No Chrome, conferidos lista completa, expansão, agência sem clientes, seleção de Horizonte por teclado, retorno ao Global e menu em 390 px. Evidências em `output/workspace-agencies/`.


## Central de gestão

`/plataforma/gestao` reúne Usuários, Permissões, Agências e Clientes em abas. Usa o shell compartilhado (sidebar 215/80 px, logo 128 × 36 px e cabeçalho 64 px), tabela com superfície/borda do sistema, seleção azul, ações em reticências e paginação de 12 registros. Referência: `docs/references/management-center.png`.

O painel lateral tem 474 px em desktop, começa abaixo do cabeçalho e mantém ações fixas no rodapé. Em telas até 1350 px, um backdrop separa o formulário; até 700 px, o painel ocupa a tela inteira. Tabelas mantêm largura legível e rolagem horizontal contida no mobile. As abas aceitam setas/Home/End, o formulário usa foco contido e Escape, e as transições respeitam movimento reduzido.

As cores, família tipográfica, logotipo fornecido e ícones Lucide existentes foram reutilizados. Os controles de tema/idioma do cabeçalho e o avatar sem seta foram preservados. Estado/status, múltiplos vínculos e arquivamento estendem a referência para os dados reais da aplicação.
