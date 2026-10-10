# Spec Delta

## Purpose

Personalizar idioma e tema de forma previsível e orientar o primeiro acesso com tour acessível e adaptado às permissões de cada tenant.

## ADDED Requirements

### Requirement: Idiomas completos e precedência definida
A interface SHALL suportar pt-BR, en e es em menus, formulários, validações, acessibilidade, notificações, toasts, tour e erros de negócio. Idioma SHALL resolver preferência persistida do usuário, escolha local explícita, idioma suportado do navegador e pt-BR, nessa ordem. Seletores SHALL existir em login, solicitação e aplicação, atualizando `html.lang` e formatação de datas/números.

#### Scenario: Precedência de idioma
- **WHEN** o perfil salvo está em es e o navegador/local está em en
- **THEN** a aplicação autenticada usa es após carregar o perfil e não exibe chaves de tradução ou textos essenciais ausentes

#### Scenario: Navegador não suportado
- **WHEN** não há preferência explícita e o navegador usa idioma não suportado
- **THEN** a interface usa pt-BR

### Requirement: Conteúdo e sessão preservados na tradução
Trocar idioma SHALL preservar sessão e rascunhos. Erros de API SHALL ser traduzidos a partir de códigos e parâmetros seguros; interpolação/pluralização SHALL evitar frases concatenadas incorretamente. Nomes próprios, nomes de arquivos e mensagens já escritas SHALL não ser traduzidos automaticamente. Datas SHALL ser apresentadas conforme idioma e fuso escolhido.

#### Scenario: Mudança durante composição de chat
- **WHEN** o usuário muda o idioma com mensagem ainda não enviada
- **THEN** controles e mensagens de sistema mudam de idioma e o rascunho permanece intacto

### Requirement: Tema claro inicial e escuro exclusivamente manual
Sem escolha manual válida, todas as telas SHALL iniciar em light independentemente do tema do SO/navegador. Só SHALL existir escolha Claro/Escuro, persistida como light/dark em chave própria e perfil; sistema/automático e valores inválidos SHALL resultar em light. Preferência manual do perfil SHALL prevalecer sobre a local após seu carregamento. A resolução local SHALL ocorrer antes da primeira pintura sem flash evitável do tema oposto.

#### Scenario: Primeiro acesso com SO escuro
- **WHEN** login ou solicitação é aberto sem preferência válida e o SO usa escuro
- **THEN** controles e superfícies aparecem claros, mesmo que o vídeo decorativo contenha tons escuros

#### Scenario: Escolha manual persistida
- **WHEN** a pessoa escolhe Escuro e recarrega ou altera o tema do SO
- **THEN** a aplicação permanece em Escuro por preferência explícita e o SO não altera o resultado

#### Scenario: Preferência inválida
- **WHEN** armazenamento contém system, valor inválido ou preferência legada não comprovadamente manual
- **THEN** o fallback é light sem importar escolhas de outros projetos

### Requirement: Tour por papel e tenant
O primeiro acesso ao tenant SHALL oferecer tour curto e não bloqueante, com pular/reiniciar e textos traduzidos. User SHALL ver chat, notificações e preferências; administradores SHALL ver apenas módulos e contexto autorizados. Progresso/conclusão/dispensa SHALL persistir por usuário, tenant e versão do tour.

#### Scenario: User conclui tour
- **WHEN** User conclui ou dispensa a versão atual do tour no tenant A
- **THEN** o tour não reaparece automaticamente nesse contexto e não apresenta passos de arquivos ou membros

#### Scenario: Outro tenant ou nova versão
- **WHEN** a mesma pessoa entra no tenant B ou recebe nova versão do tour
- **THEN** o progresso anterior não é aplicado indevidamente e o tour apropriado pode ser oferecido

### Requirement: Tour resiliente e acessível
O tour SHALL ignorar elementos ausentes, respeitar teclado, foco, contraste, mobile, idioma, tema e reduced motion. Instâncias/overlays SHALL ser removidos ao sair, desmontar ou trocar tenant, inclusive sob montagens repetidas de desenvolvimento. Preferências SHALL permitir reiniciar o tour.

#### Scenario: Troca durante tour
- **WHEN** o usuário troca de tenant ou sai enquanto um passo está aberto
- **THEN** overlay e instância anteriores são destruídos e não bloqueiam foco ou interação no novo contexto

#### Scenario: Alvo não disponível
- **WHEN** um passo aponta para elemento indisponível no layout ou papel atual
- **THEN** o tour o ignora sem travar a navegação e permite continuar/pular
