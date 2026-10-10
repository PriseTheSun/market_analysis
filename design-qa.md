# Layout compartilhado — revisão de 10/10/2026

**final result: passed**

## Escopo e referência

Referência: imagem inline de Agências (1807 × 870) aprovada na conversa. O pedido mais recente estende esse padrão a todas as rotas autenticadas, alinha os ícones recolhidos, muda as listagens para 12 itens, remove a seta do avatar e acrescenta tooltips. As 12 linhas e as colunas/ações específicas de cada módulo são diferenças intencionais em relação às oito linhas da imagem original.

O shell e os tokens antes condicionados a `/platform/agencies` agora são compartilhados. Plataforma, área de agência e espaços de trabalho usam o mesmo componente. Menus e ações continuam respeitando o escopo autorizado.

## Evidências e comparação visual

- [Organizações](output/system-layout/organizations.jpg): padrão de Agências propagado à outra rota; logo, sidebar, cabeçalho, busca, título, identidades e tabela conferidos.
- [Navegação recolhida e tooltip](output/system-layout/collapsed-tooltip-final.jpg): ícones e avatar centralizados, sem seta; foco e tooltip visíveis. Captura final em inglês, idioma que estava ativo na conta nessa etapa; as conferências anteriores foram em português.
- [Membros](output/system-layout/members.jpg): o mesmo shell no espaço Aurora, com ações e papéis preservados. Captura intermediária anterior à correção das bordas duplicadas nos botões de contorno.
- [Menu mobile](output/system-layout/mobile-menu.jpg): logo compacto, conta sem seta e ações completas dentro da tela.
- [Agências mobile](output/system-layout/mobile-agencies.jpg): filtros e tabela adaptados ao viewport estreito, sem overflow horizontal do documento.

Viewports CSS usados: 1807 × 870 e 390 × 844, DPR 1. A API de captura do Chrome exportou os bitmaps com scrollbar em dimensões ligeiramente diferentes (Organizações: 1796 × 865; Agências mobile: 379 × 820); o menu mobile foi exportado em 390 × 844. Nenhuma imagem foi redimensionada manualmente. A comparação foi visual com a referência inline, acompanhada das medidas reais no DOM; não houve pixel-diff nem montagem lado a lado.

## Medidas e comportamento verificados

- Sidebar expandida: 215 px; recolhida: 80 px; cabeçalho: 64 px; logo: 128 × 36 px. Mesmas medidas ao navegar entre Agências, Organizações, Contas, Solicitações, Notificações, Preferências e o espaço Aurora.
- Todos os cinco ícones da navegação global recolhida tiveram centro horizontal em x=39,5 px, coincidente com o centro do avatar. Links de 44 × 42 px, ícones de 20 px.
- Estado recolhido preservado na navegação entre escopos; restauração para expandido ao finalizar a conferência.
- Tooltips disponíveis nos itens da navegação expandida e recolhida, verificados por teclado; Escape fecha o tooltip. O componente Radix também fornece a abertura por hover.
- Avatar sem SVG de seta; menu da conta abre Preferências no contexto correto. Drawer fecha após navegar. Menu mobile medido entre x=24 e x=214 em viewport de 390 px.
- Agências: páginas 1 e 2 com 12 registros cada, sem repetição de identificadores; buscar `agencia-demo-a` retornou uma agência e limpar a busca voltou à página 1.
- Organizações, Contas e Solicitações da plataforma exibiram 12 registros. Membros e Convites exibiram 7 e 9 registros existentes, respectivamente. Limite compartilhado também aplicado a Arquivos e Notificações; opções de select mantêm suas consultas próprias para não truncar escolhas.
- Layout de Conversas e Arquivos conferido no espaço Aurora; conteúdos vazios ou com menos registros são mantidos sem criar dados artificiais.

## Correções durante a revisão

- Removida a bifurcação de layout por rota; estilos migrados para `app-layout.css` e componentes de tabela reutilizados.
- Eliminada a colisão da variante de botão `outline` com o utilitário CSS homônimo, que produzia contornos duplos.
- Corrigida a identidade do contexto React durante HMR, movendo-o para `lib/scope.ts`. Preferências foi novamente exercitada no mobile, inclusive após atualização do módulo do shell.
- Nenhum P0/P1/P2 aberto nas superfícies verificadas. Pequenas diferenças de rasterização do navegador são P3.

## Verificações técnicas e limites

Build do frontend (incluindo TypeScript), lint e formatação dos arquivos alterados aprovados. Os 24 testes unitários passaram. Console da aba de revisão final: nenhum erro ou aviso. O build mantém o aviso conhecido sobre o chunk inicial acima de 500 kB.

Seletores dos testes E2E existentes foram atualizados para o menu da conta e o contexto no cabeçalho; a suíte E2E completa não foi reexecutada nesta rodada. Os fluxos descritos acima foram exercitados pelo navegador. Não houve alteração de API, migração ou dados de cadastro. Tema escuro, sessão real de leitor de tela e todos os papéis de usuário não receberam nova revisão completa; a área de agência compartilha a implementação, mas não foi aberta com uma sessão Super Admin nesta rodada.


## Atualização — ações de Organizações em reticências

**final result: passed** para o ajuste solicitado em `/plataforma/organizacoes`.

Organizações e Agências agora compartilham `RecordActions`: botão de reticências horizontal de 32 px, nome acessível por registro, menu alinhado à direita e os mesmos espaçamentos/estados. Coluna de ações compacta e centralizada. Organizações mantém Abrir para registros ativos e Alterar na administração global; no escopo de agência, sem ações autorizadas, o botão fica desabilitado.

Conferência no Chrome: 12 linhas com apenas um botão de reticências por célula; Abrir levou a Atlas; Alterar abriu o formulário com Nome=Atlas, fechado sem salvar; organização desativada mostrou apenas Alterar. Escape fechou o menu. Agências manteve Alterar e Super Admins da agência. Em 390 × 844, documento com 390 px e menu de x=16 a x=206, sem corte. A captura desktop usa viewport 1920 × 873. Evidências: [desktop](output/organizations-actions/desktop.jpg) e [mobile](output/organizations-actions/mobile.jpg).

Build frontend/TypeScript, lint e formatação aprovados. Seletores E2E de administração adaptados ao menu; a suíte E2E completa não foi reexecutada para esta alteração visual. O console capturou duas mensagens de canal assíncrono encerrado do navegador; nenhum erro de componente foi observado nesta revisão, e os fluxos acima concluíram. Não houve mudança em dados de organizações ou permissões.


## Atualização — tooltips no azul da marca

**final result: passed**. Fundo e borda dos tooltips usam o token `--brand-blue` (#2453ff), com texto branco. A cor de marca permanece constante nos dois temas. Conferência no navegador confirmou background/border `rgb(36, 83, 255)` e texto `rgb(255, 255, 255)`, com foco de teclado e texto legível. Evidência: [tooltip azul](output/brand-tooltips/blue-tooltip.jpg), recorte de 610 × 410 mostrando a navegação e o contexto da página. Formatação CSS aprovada; alteração apenas de estilo, sem novos testes automatizados.

## Atualização — animação da lateral

**final result: passed**. Motion sincroniza abertura/recolhimento em 280 ms; rótulos fazem fade e o conteúdo acompanha a largura. Chrome em 1920 × 929 confirmou medidas intermediárias, endpoints de 80/215 px, ícones e avatar recolhidos em x=39,5 px, logo expandido de 128 × 36 px, rótulos completos e ausência de overflow. Dois acionamentos rápidos pelo teclado inverteram a transição e terminaram em 80 px. Recarregar a página recolhida restaurou progresso zero e 80 px diretamente.

Em 390 × 844, drawer de 280 px com slide/fade na abertura e saída; a inspeção observou `data-state="closed"` e a transformação intermediária antes da remoção do drawer/backdrop. Nenhum erro ou aviso no console da aba de revisão. Estado expandido e viewport padrão restaurados ao terminar.

Evidências: [transição em andamento](output/sidebar-motion/transition.jpg), [recolhida](output/sidebar-motion/collapsed.jpg), [mobile](output/sidebar-motion/mobile.jpg) e [medidas da animação](output/sidebar-motion/measurements.json). Build/TypeScript, lint e formatação aprovados; aviso já existente de chunk acima de 500 kB permanece. Movimento reduzido tratado pelo hook/CSS e revisado em código, sem emulação da preferência do sistema nesta rodada. Suíte E2E completa não reexecutada.

## Atualização — tabelas de Contas e Solicitações

**final result: passed**. As duas rotas usam `RecordActions` e a mesma coluna de ações das tabelas de Agências/Organizações. Em Contas, os comandos de perfil global e ativação estão no dropdown. Em Solicitações, Abrir está no dropdown; identidade com iniciais/nome/e-mail e tabela responsiva foram incorporadas ao padrão compartilhado.

Chrome desktop: 12 registros em cada tabela, um botão de reticências por célula de ações, coluna de 108 px e alinhamento centralizado. Os dois comandos de Contas abriram os formulários correspondentes, fechados sem salvar; Abrir exibiu os detalhes da solicitação e os controles de classificação/revisão existentes. No mobile de 390 × 844, ambas as tabelas mantiveram o documento com 390 px e menus entre x=16 e x=206, sem corte. Escape fecha os menus. Console sem erros/avisos; viewport restaurado ao final.

Evidências: [Contas](output/accounts-requests-tables/accounts.jpg), [Solicitações](output/accounts-requests-tables/requests.jpg), [Contas mobile](output/accounts-requests-tables/accounts-mobile.jpg) e [Solicitações mobile](output/accounts-requests-tables/requests-mobile.jpg). Build/TypeScript, lint e formatação aprovados. Seletor E2E da revisão de acesso atualizado; suíte completa não reexecutada. Nenhuma alteração em dados, papéis, status de contas ou solicitações durante a conferência.
