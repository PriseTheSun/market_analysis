# Spec Delta

## Purpose

Permitir que administradores Global escolham, testem e mantenham os modelos de IA usados por cada funcionalidade, distinguindo configurações gerenciadas do ambiente e preferências de teste da sessão local.

## ADDED Requirements

### Requirement: Administração exclusiva do perfil Global

O sistema SHALL restringir a página, as configurações, os catálogos e os testes administrativos de IA a uma sessão ativa de usuário Global, com autorização revalidada no backend e proteção CSRF nas mutações.

#### Scenario: Acesso administrativo permitido
- **WHEN** um Global ativo acessa a área de plataforma
- **THEN** encontra Configurações de IA após Solicitações de acesso e consegue consultar a configuração do ambiente.

#### Scenario: Tentativa direta sem privilégio
- **WHEN** um usuário não Global chama qualquer endpoint administrativo de IA, mesmo conhecendo sua URL
- **THEN** o backend nega acesso sem retornar configuração, catálogo, conexão ou consumo administrativo e sem realizar chamada externa.

#### Scenario: Mutação sem proteção de sessão
- **WHEN** uma gravação ou teste chega sem sessão válida, CSRF válido ou origem permitida
- **THEN** a operação é recusada antes de gravar dados ou consumir o provedor.

### Requirement: Navegação localizada e contexto do ambiente

O sistema SHALL traduzir navegação, breadcrumb, conteúdo e rota para PT-BR, EN e ES, mostrando o ambiente real informado pelo backend e o alcance da configuração.

#### Scenario: URL em português
- **WHEN** o idioma é PT-BR e o usuário abre Configurações de IA
- **THEN** a URL é `/plataforma/configuracoes-ia`, com breadcrumb Administração global / Configurações de IA.

#### Scenario: Outros idiomas e ambiente gerenciado
- **WHEN** o idioma é EN ou ES
- **THEN** a rota é respectivamente `/platform/ai-settings` ou `/plataforma/configuracion-ia`, sem perder a página ao mudar de idioma.
- **AND** o badge e a mensagem de alcance refletem o ambiente real, sem indicar Ambiente local em produção.

### Requirement: Hierarquia visual da referência

A página SHALL seguir a referência fornecida: cabeçalho e aviso, card horizontal de origem, cards de modelos de texto/imagem, painel de conexão/consumo e rodapé de ações, usando o sistema visual existente e comportamento responsivo acessível.

#### Scenario: Composição desktop
- **WHEN** a página é exibida com 1440px de largura
- **THEN** os cards Chat/Texto e Geração de imagens/Imagem ocupam a coluna principal, enquanto conexão e consumo ocupam a coluna lateral, aproximadamente na proporção 62/38.
- **AND** status, badges, bordas, tipografia e ações mantêm o padrão do sistema e a hierarquia de `Configurações de IA simplificadas.png`.

#### Scenario: Tela estreita e teclado
- **WHEN** a página é exibida com 390px de largura ou usada somente por teclado
- **THEN** as colunas se empilham sem rolagem horizontal, campos e ações permanecem alcançáveis e os resultados são anunciados de forma acessível.

### Requirement: Modelos independentes por funcionalidade

O sistema SHALL permitir associar separadamente Chat a um modelo de texto e geração de imagens a um modelo de imagem compatível com a conexão selecionada. Uma funcionalidade pode permanecer não configurada sem impedir o uso da outra.

#### Scenario: Somente texto disponível
- **WHEN** a conexão possui modelo de texto compatível e nenhum modelo de imagem compatível
- **THEN** o Global pode salvar o modelo do Chat, e o card de imagem mostra indisponibilidade específica sem modelo selecionado automaticamente.

#### Scenario: Seleção incompatível ou manipulada
- **WHEN** um payload associa um modelo desconhecido ou somente de texto à geração de imagens
- **THEN** o servidor recusa a gravação, mantém a configuração anterior e retorna erro seguro identificando a seleção inválida.

### Requirement: Separação das configurações por ambiente e sessão

O sistema SHALL manter configuração gerenciada por ambiente e preferências locais por sessão Global. Salvar na tela local não altera configuração gerenciada nem preferências de outra sessão, e nenhuma falha de conexão autoriza troca automática de origem.

#### Scenario: Teste local isolado
- **WHEN** o Global salva a origem temporária e os modelos em uma sessão local
- **THEN** apenas operações dessa sessão usam a seleção, inclusive no Chat, e as demais sessões continuam com suas configurações anteriores.

#### Scenario: Fonte escolhida fica indisponível
- **WHEN** o token da configuração ativa expira ou desaparece após reinício
- **THEN** essa configuração fica indisponível até reconexão e confirmação ou escolha explícita de outra origem, sem usar automaticamente a conexão gerenciada ou demo.

### Requirement: Gravação versionada e rascunhos

O sistema SHALL validar origem, revisão de conexão, capacidades e versão de configuração ao salvar. Mudanças do formulário são rascunhos até a gravação; Cancelar descarta rascunhos e conflitos não sobrescrevem alterações concorrentes.

#### Scenario: Conflito entre duas abas
- **WHEN** duas abas salvam a mesma versão e uma delas já gravou
- **THEN** a segunda recebe conflito e pode recarregar a configuração sem sobrescrever a primeira silenciosamente.

#### Scenario: Mudança de origem ou credencial
- **WHEN** o usuário muda a origem ou substitui a credencial
- **THEN** seleções e resultados de teste vinculados à revisão anterior deixam de ser considerados válidos até revalidação.

#### Scenario: Cancelar após conectar
- **WHEN** o usuário conecta uma chave e depois cancela alterações de modelos
- **THEN** somente os rascunhos são descartados, com a interface informando que conectar, substituir e revogar são ações imediatas independentes.

### Requirement: Testes explícitos sem aplicação automática

O sistema SHALL permitir testar o modelo selecionado em rascunho somente por ação explícita, sem salvar a associação. Os testes usam exemplos inofensivos definidos pelo servidor, mostram resultado ou falha e permitem cancelamento.

#### Scenario: Abrir ou salvar não gera conteúdo
- **WHEN** o Global abre a página, atualiza o catálogo, muda seleção ou salva a configuração
- **THEN** nenhuma chamada de geração de texto ou imagem é executada por essas ações.

#### Scenario: Testar imagem antes de salvar
- **WHEN** o usuário testa uma seleção válida de imagem
- **THEN** acompanha a operação e recebe um preview temporário ou erro explícito, mantendo a configuração em produção inalterada até salvar.
- **AND** a interface informa que disponibilidade e cobrança dependem do plano do provedor.

### Requirement: Estados honestos sem credencial

O sistema SHALL permanecer navegável sem credencial Gemini ou configuração AWS, mostrar Não configurado e desabilitar ações que dependem da conexão. Loading, expiração, catálogo vazio, falhas e sucesso real devem ser distinguíveis.

#### Scenario: Instalação sem chave
- **WHEN** a aplicação inicia sem identificação do segredo e sem token temporário
- **THEN** Configurações de IA abre normalmente, não mostra modelos fictícios ou Conectado e explica como configurar uma conexão posteriormente.

#### Scenario: Cota ou credencial recusada
- **WHEN** a consulta ou teste falha por credencial recusada ou cota do provedor
- **THEN** a tela mostra a causa traduzida e uma ação pertinente, sem revelar segredo nem confundir a falha do provedor com logout da aplicação.

### Requirement: Painel de uso com origem dos números explícita

A página SHALL distinguir consumo observado, reservas e valores desconhecidos; informar a janela apenas para acompanhamento; e nunca representar orçamento local como saldo ou gratuidade do provedor.

#### Scenario: Acompanhamento das duas origens
- **WHEN** o Global escolhe a origem temporária ou gerenciada
- **THEN** a tela mostra uso separado com “Sem limites locais”, sem barra de orçamento ou toggles de aviso/pausa, e não bloqueia testes por políticas legadas de orçamento.

#### Scenario: Consumo ainda ausente
- **WHEN** não houve operações na janela atual
- **THEN** o painel não reproduz números ilustrativos da referência como consumo real e identifica a cota da API como não informada quando desconhecida.

#### Scenario: Políticas antigas não reativam cotas
- **WHEN** uma sessão salva anteriormente mantinha alerta ou pausa ativos
- **THEN** a página não exibe esses controles e não exige alterar a política para testar ou usar modelos compatíveis.
