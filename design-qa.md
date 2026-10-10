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

## Atualização — controles de tema e idioma

**final result: passed**. Cabeçalho compartilhado com sino, switch de modo escuro e idioma na ordem solicitada. Controles compactos, alinhados e com cores do tema. Tema e idioma persistiram após reload; alternância pelo teclado conferida. Mobile de 390 e 320 px mantém o cabeçalho de 64 px sem overflow horizontal. Tema claro e PT-BR restaurados após a conferência.

Evidências: [controles](output/header-preferences/controls.jpg), [claro/PT-BR](output/header-preferences/light-pt.jpg), [escuro/EN](output/header-preferences/dark-en.jpg) e [mobile](output/header-preferences/mobile.jpg). Build/TypeScript, lint e formatação aprovados; suíte E2E completa não reexecutada.

## Atualização — Central de gestão

**final result: passed**.

### Referência e evidência

Fonte: [imagem fornecida](docs/references/management-center.png), 1672 × 940 px. Implementação: [edição de usuário](output/management-center/desktop-editor.jpg), captura Chrome de 1672 × 940 px, viewport CSS 1672 × 940, enquadramento explícito 1:1, sem chrome do navegador. Rota `/plataforma/gestao`, sessão Global, tema claro, PT-BR, aba Usuários e painel lateral aberto. As duas imagens foram abertas juntas para a comparação final. Os nomes e vínculos são os dados reais da aplicação; a fonte contém quatro pessoas ilustrativas. A seleção aparece na quarta linha na implementação.

Outras evidências: [listagem desktop](output/management-center/desktop-list.jpg), [listagem mobile](output/management-center/mobile-list.jpg), [formulário mobile](output/management-center/mobile-editor.jpg) e [aviso de arquivamento](output/management-center/archive-confirmation.jpg). Mobile em 390 × 844 CSS/px, com enquadramento explícito 1:1. O recorte do aviso corresponde ao painel de 474 × 876 px. Os controles e textos da referência foram legíveis na imagem original em resolução integral; não foi necessário outro recorte da fonte para avaliar tipografia, ícones e alinhamento dos campos.

### Achados corrigidos e comparação final

- **P2, tabela sem a superfície compartilhada:** a primeira conferência revelou ausência da borda e fundo branco da referência. O contêiner passou a usar `table-scroll`, com os mesmos tokens do restante do sistema. A nova captura confirma a borda, divisórias, superfície branca e seleção azul.
- **P2, dimensões e ritmo:** o painel inicial tinha 460 px e as abas estavam 10 px abaixo da referência. Painel ajustado para 474 px e margem das abas reduzida, preservando sidebar/cabeçalho existentes. Captura final confirma painel em x=1198, cabeçalho de 64 px e início da tabela em aproximadamente y=350.
- **P2, quebra de texto no celular:** a primeira tabela comprimia nomes/e-mails em fragmentos. Largura mínima de 680 px com rolagem horizontal contida corrigiu a leitura; o formulário ocupa a tela inteira e mantém as ações no rodapé. Documento sem overflow horizontal externo.
- Nenhum P0/P1/P2 aberto nas superfícies verificadas. Antialiasing e pequenas diferenças de densidade em relação ao mockup são P3, aceitos para preservar o sistema visual já aplicado.

### Cinco superfícies de fidelidade

- **Tipografia:** Montserrat Variable local confirmada no DOM; títulos, labels, tabela e botões seguem a escala compartilhada. Nomes/e-mails reais podem quebrar linha; não foram substituídos pelos dados ilustrativos da fonte.
- **Espaçamento/layout:** sidebar 215 px, logo 128 × 36 px e cabeçalho 64 px preservados. Painel 474 px, tabela com linhas de 80 px, toolbar alinhada e paginação de 12 registros. Status e múltiplos vínculos acrescentam conteúdo ao formulário; a rolagem interna deixa remoção/exclusão acessíveis sem deslocar o rodapé.
- **Cores/tokens:** superfícies, texto, bordas, seleção, azul de ação e mensagens semânticas usam os tokens existentes. Tema/idioma à direita do sino e avatar sem seta mantêm os ajustes anteriores solicitados pelo usuário.
- **Assets/ícones:** logo SVG fornecido e biblioteca Lucide reutilizados, sem ilustrações geradas ou reprodução rasterizada da interface. Iniciais refletem usuários reais, conforme o componente de identidade existente.
- **Texto/conteúdo:** abas Usuários/Permissões/Agências/Clientes; formulário de criação e edição com textos próprios. Exclusão explica arquivamento, bloqueio e restauração. Permissões descreve os quatro perfis atuais; não há editor de perfis personalizados.

### Interações e verificações

Chrome: entrada Global diretamente na central; quatro abas; navegação entre abas com seta; busca; 12 linhas por página; rota antiga de Agências redirecionando para `?tab=agencies`; formulários de usuário, agência, cliente e permissão; erro de campos obrigatórios; alternância de escopo Global/Cliente; agência Demo B oferecendo somente Atlas/Cobalto; cancelamento sem salvar; aviso de arquivamento; mobile com painel de 390 × 844 e ações fixas. Nenhum erro/aviso capturado no console da aba de revisão.

API local: 7 testes da central passaram (CRUD, atribuição/edição/revogação de perfis atuais, e-mail de definição de senha, bloqueio/restauração, preservação de vínculos e histórico, rejeição de agência/cliente incompatíveis, acesso exclusivo de Global e proteção do último Admin). Mais 18 testes existentes de isolamento/agências passaram. Os cadastros novos dos testes são fixtures locais e foram arquivados; não foram alteradas credenciais das contas demo. Migração aditiva aplicada no banco local.

Verificação final: 36 testes unitários, lint, build dos contratos/API/frontend e `git diff --check` aprovados. O aviso conhecido de chunk inicial acima de 500 kB permanece. Os testes E2E foram adaptados à central, mas a suíte Playwright completa não foi reexecutada; os fluxos visuais acima foram conferidos via CUA. Não houve nova revisão integral com leitor de tela nem de todas as traduções/tema escuro. Publicação externa não faz parte desta entrega.

### Checklist da entrega

- [x] Central única com quatro abas e painéis funcionais.
- [x] Perfis atuais e vínculos por agência/cliente.
- [x] Arquivamento/restauração e proteções transacionais.
- [x] Rotas anteriores redirecionadas, login Global atualizado.
- [x] Comparação visual desktop, mobile e documentação.

## Ajuste — nome e e-mail na edição de permissão

**final result: passed**. O seletor “Nome do usuário” apresenta apenas o nome. O e-mail aparece em campo separado, somente leitura, preenchido pela conta selecionada. Conferência visual do painel com Admin, preservando layout e demais campos; nenhuma permissão foi salva durante a revisão. Evidência: [campos separados](output/management-center/permission-fields.jpg). TypeScript, ESLint, formatação e `git diff --check` aprovados para o ajuste.

## Ajuste — hierarquia e acesso à Central

**final result: passed**. Global mantém as quatro abas e pode atribuir Global. Super Admin acessa somente Permissões e pode atribuir Super Admin, Admin e User nas agências que administra. Cadastro, edição, arquivamento e restauração de usuários, agências e clientes na Central permanecem exclusivos de Global. Admin e User não acessam a rota nem a API da Central.

Chrome com conta de teste isolada: somente a aba Permissões, inclusive ao abrir `?tab=users`; formulário oferece Cliente e Agência · Super Admin, sem Global; nomes e e-mails continuam separados. Agência e usuários disponíveis correspondem ao escopo autorizado. Nenhuma permissão foi salva durante a conferência visual. Console sem erros ou avisos. Evidência: [Super Admin na Central](output/management-center/superadmin-permissions.png). A conta demo de Super Admin estava sem vínculo ativo com agência; seus vínculos não foram alterados. Os cadastros isolados da conferência foram arquivados ao final.

Verificações aprovadas: 14 testes de integração (7 novos de hierarquia e isolamento e 7 existentes da Central), 36 testes unitários, lint, TypeScript/build de contratos/API/frontend e `git diff --check`. Os testes verificam recusa de elevação a Global, acesso a outra agência, alterações em identidades Global, operações de Admin/User e perda de acesso após revogação. Casos E2E foram adicionados; a suíte Playwright completa não foi executada. O aviso existente sobre tamanho do chunk inicial permanece.

## Ajuste — status e acesso aos arquivados

**final result: passed**. Usuários agora possui coluna Status com Ativo, Inativo e Arquivado. Usuários, Agências e Clientes distinguem os cadastros arquivados dos apenas inativos. O filtro “Exibir registros” fica na barra ao lado da busca, com Não arquivados e Arquivados; substitui o checkbox antes localizado no rodapé. O menu de reticências mantém Restaurar para cadastros arquivados. A paginação continua com 12 registros e retorna à primeira página ao alterar o filtro.

Conferência Chrome: listagens arquivadas das três abas, abertura de Restaurar sem efetivar alterações e filtros legíveis em desktop e mobile de 390 × 844. O mobile usa rolagem horizontal contida na tabela, sem overflow do documento. Console sem erros/avisos; viewport restaurado. Evidências: [arquivados e ação Restaurar](output/management-center/archived-users.png) e [filtros mobile](output/management-center/status-mobile.png). Build/TypeScript do frontend, ESLint dos arquivos alterados, Prettier e `git diff --check` aprovados. O E2E existente de arquivamento/restauração foi atualizado para o novo seletor; a suíte completa não foi executada. Nenhuma alteração de backend ou de dados nesta revisão.

## Foto de perfil em Preferências

**final result: passed**. A seção Foto de perfil em `/plataforma/preferencias` oferece escolha, prévia, confirmação de envio, cancelamento, substituição e remoção. Reutiliza o shell, botões, tokens e tipografia existentes; a foto salva atualiza o avatar do menu da conta. Sem imagem ou em falha de carregamento, mantém as iniciais. Textos e erros em PT/EN/ES; campos de idioma, aparência e fuso preservados.

Chrome com conta Global isolada: seleção de PNG pelo seletor nativo do macOS, prévia, envio real, atualização dos dois avatares para a imagem WebP de 256 × 256, persistência após reload e remoção com retorno às iniciais. Desktop e mobile de 390 × 844 conferidos; controles legíveis e documento sem overflow horizontal. Evidências: [foto salva no desktop](output/profile-photo/desktop.png), [mobile](output/profile-photo/mobile.png) e [Preferências sem foto](output/profile-photo/preferences.png). A imagem azul é um arquivo sintético exclusivo de teste, não uma foto real da conta. A extensão não permitiu `setFiles` por falta de acesso a URLs de arquivo; a seleção nativa concluiu o teste sem alterar permissões do navegador. O console registrou mensagens de canal assíncrono de extensão, sem falha observada nos requests da aplicação. Viewport restaurado; conta de teste arquivada e sua imagem removida.

Validação: 8 testes de integração de avatar (JPG/PNG/WebP, persistência entre sessões, isolamento de conta e RLS, formato/tamanho/conteúdo inválidos, sessão/CSRF e remoção), 36 testes unitários, lint, typecheck/build dos contratos/API/web, formatação e `git diff --check` aprovados. Migração aditiva `202610100003_user_avatar` aplicada no banco local. A imagem normalizada fica em tabela pessoal separada, limitada a 256 KiB, e é entregue apenas com sessão, sem cache público. O proxy permite `blob:` em `img-src` para a prévia local; não foi reconstruído o ambiente Compose completo. O aviso existente de chunk inicial acima de 500 kB permanece. A suíte Playwright completa não foi executada.
