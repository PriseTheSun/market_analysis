# Spec Delta

## Purpose

Apresentar uma interface independente, responsiva e acessível para o Market Analysis, com autenticação fiel à composição das referências e aos requisitos escritos.

## ADDED Requirements

### Requirement: Identidade visual e tipografia coerentes
A interface SHALL usar sistema minimalista próprio, marca Market Analysis, Montserrat local com pesos disponíveis, fallback e licença, azul #0A5ED7 e branco #FFFFFF. Tema claro SHALL partir de fundo #F7F9FC, superfície branca e texto #111827; escuro SHALL partir de #0B1120, #111827 e #F8FAFC. A hierarquia SHALL aplicar apresentação 40/32 px, página 30/26, seção 24/22, subseção 20/18, card/dialog 16, corpo 14 e chat 15, com pesos 400/500/600 conforme uso. Interface SHALL manter títulos semânticos e um h1 por página, inputs mobile legíveis, contraste e estados além da cor.

#### Scenario: Renderização nos dois temas
- **WHEN** páginas, formulários, tabelas, chat, toasts e tour são exibidos em tema escolhido manualmente
- **THEN** usam tipografia/paleta coerentes, sem fontes ou estilos buscados em CDN e sem identidade herdada de outro projeto

#### Scenario: Tela pequena
- **WHEN** a interface é aberta em aproximadamente 390 px
- **THEN** campos mantêm legibilidade, hierarquia e alvos utilizáveis, sem rolagem horizontal ou texto essencial cortado

### Requirement: Layout compartilhado de autenticação
Login e solicitação SHALL compartilhar composição baseada nas imagens fornecidas: painel visual à esquerda e formulário à direita no desktop, marca, seletor de idioma superior e alinhamentos coerentes. No mobile, formulário SHALL ter prioridade. Texto escrito do briefing SHALL prevalecer sobre divergências visuais da referência, incluindo ações azuis, escala tipográfica e título “Solicitar acesso”. Os assets de marca fornecidos SHALL ser usados preservando sua identidade.

#### Scenario: Navegação entre login e solicitação
- **WHEN** a pessoa usa “Solicitar acesso” em `/login` e retorna por “Já possui acesso? Entrar” ou “Voltar para o login”
- **THEN** navega entre `/login` e `/solicitar-acesso` mantendo consistência de marca, idiomas, layout e tratamento do background

### Requirement: Vídeo local com camadas independentes
As páginas de login e solicitação SHALL usar `bg_login.mp4` local em área decorativa, com recorte responsivo sem distorção, máscara de contraste independente e conteúdo HTML traduzível acima. A máscara SHALL não reduzir a opacidade do formulário nem capturar cliques/foco. Textos SHALL permanecer legíveis em quadros claros e escuros, sem depender de informação gravada no vídeo ou de geração externa de mídia.

#### Scenario: Vídeo em reprodução
- **WHEN** quadros claros e escuros são exibidos no painel
- **THEN** o texto mantém contraste verificado, controles continuam opacos/interativos e o vídeo não invade a prioridade do formulário

### Requirement: Reprodução decorativa resiliente
O vídeo SHALL reproduzir sem som, em loop e inline quando permitido, com poster local e controle acessível de pausa/reprodução. Aba oculta SHALL pausar o vídeo; reduced motion SHALL usar poster sem autoplay; economia de dados/conexão limitada detectável SHALL priorizar poster. Formulários SHALL funcionar antes do carregamento e com vídeo ausente, formato incompatível ou autoplay bloqueado.

#### Scenario: Movimento reduzido
- **WHEN** o navegador indica preferência por movimento reduzido
- **THEN** o login e a solicitação usam poster estático sem autoplay e permanecem integralmente utilizáveis

#### Scenario: Vídeo falha ou é bloqueado
- **WHEN** o asset demora, falha, não é suportado ou autoplay é recusado
- **THEN** aparece fallback local e login/solicitação continuam funcionando sem esperar o vídeo

#### Scenario: Controle por teclado
- **WHEN** a pessoa aciona pausa/reprodução pelo teclado
- **THEN** o vídeo responde, o controle informa seu estado por nome acessível traduzido e o foco permanece previsível

### Requirement: Formulários de autenticação completos
Login SHALL oferecer e-mail, senha, mostrar/ocultar senha, lembrar de mim, Entrar, recuperação e solicitação de acesso, com labels visíveis, autocomplete e erros traduzidos. Solicitação SHALL seguir campos e fluxo de `access-requests`. Recuperação, redefinição e aceitação de convite SHALL ter telas completas, conectadas à API real e com estados de loading/erro/sucesso.

#### Scenario: Autenticação real
- **WHEN** a pessoa envia login válido pela interface
- **THEN** o backend valida credenciais e cria sessão real; um simples efeito visual não é apresentado como autenticação concluída

#### Scenario: Erro em formulário
- **WHEN** há validação ou falha de rede
- **THEN** erros ficam associados aos campos/estado do formulário e não são comunicados somente por toast

### Requirement: Aplicação responsiva orientada a tarefas
A aplicação SHALL oferecer sidebar recolhível, cabeçalho com agência/tenant e drawer mobile; telas de chat/histórico, arquivos, membros, agência, Global, revisão de solicitações, preferências e notificações conforme permissão. SHALL existir tratamento de 403, 404 e sessão expirada. User SHALL encontrar foco em chat e funções pessoais, sem atalhos a módulos proibidos ou dashboards/métricas fictícios.

#### Scenario: Navegação de User
- **WHEN** User abre a aplicação
- **THEN** encontra chat, histórico, notificações, idioma/tema, tour/preferências e logout, sem opções de membros ou arquivos

#### Scenario: Rota inválida ou proibida
- **WHEN** uma URL desconhecida ou fora da permissão é aberta
- **THEN** a aplicação apresenta estado apropriado com navegação útil e não vaza dados do recurso

### Requirement: Movimento discreto e acessibilidade transversal
Transições de rotas/grupos SHALL ser suaves e curtas, respeitar reduced motion e não atrasar foco/interação. O sistema SHALL evitar animação por letra, reanimação do histórico a cada token ou efeitos duplicados. Controles SHALL ter labels/nome acessível traduzido, foco visível, teclado funcional e anúncios de streaming não excessivos. Toasts SHALL usar uma única região inferior esquerda, inclusive mobile com safe areas.

#### Scenario: Uso sem animações
- **WHEN** movimentos são desativados e o usuário navega somente por teclado
- **THEN** todas as ações permanecem disponíveis, diálogos gerenciam foco e não há dependência funcional de animação

#### Scenario: Feedback em viewport pequeno
- **WHEN** um toast é apresentado a 390 px
- **THEN** permanece inferior esquerdo dentro da área segura, traduzido e legível no tema escolhido

### Requirement: Validação visual e acessível registrada
A entrega SHALL registrar revisão das telas críticas em aproximadamente 390, 768 e 1440 px, três idiomas e dois temas, incluindo traduções longas, teclado e leitor de tela. Login/solicitação SHALL ser validados com vídeo ativo, pausado, carregando, ausente e autoplay bloqueado; origem/caminho dos assets, poster e ajuste de máscara SHALL ser documentados.

#### Scenario: Matriz de validação
- **WHEN** a implementação é apresentada como validada
- **THEN** existem evidências dos estados e combinações executados e limitações reais são identificadas sem declarar testes não realizados
