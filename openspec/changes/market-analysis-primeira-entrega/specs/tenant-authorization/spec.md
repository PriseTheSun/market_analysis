# Spec Delta

## Purpose

Garantir que cada ação respeite plataforma, agência, tenant e propriedade do recurso, inclusive sob concorrência e acesso direto à API.

## ADDED Requirements

### Requirement: Privilégios separados por nível
O sistema SHALL distinguir Global de plataforma, Super Admin de agência e Admin/User de tenant. Uma identidade SHALL poder ter papéis distintos em tenants diferentes; Global e Super Admin SHALL acessar seus tenants sem vínculos individuais artificiais. A autorização SHALL negar por padrão e considerar ator, ação, recurso e escopo no backend e em chamadas internas.

#### Scenario: Papéis distintos da mesma pessoa
- **WHEN** uma pessoa é Admin no tenant A e User no tenant B
- **THEN** pode gerir membros/arquivos em A e usar apenas seu chat e funções pessoais em B

#### Scenario: Super Admin restrito
- **WHEN** um Super Admin vinculado somente à agência A solicita recurso da agência B
- **THEN** o acesso é negado, inclusive em listagens, buscas e contagens

### Requirement: Matriz de ações por escopo
Somente Global SHALL administrar agências, criar/configurar/desativar tenants, atribuir/remover Super Admin e promover Global em fluxo explícito auditado. Global, Super Admin da agência e Admin do tenant SHALL gerenciar Admin/User e arquivos no escopo permitido. Todos os papéis SHALL usar seu próprio chat no tenant autorizado e suas preferências/notificações. User SHALL NOT acessar módulos de membros ou arquivos por UI ou API.

#### Scenario: User chama endpoint administrativo
- **WHEN** User tenta listar membros, autorizar upload ou baixar arquivo por chamada direta
- **THEN** a API nega a ação independentemente das opções ocultadas na interface

#### Scenario: Admin tenta alterar identidade global
- **WHEN** Admin tenta mudar e-mail, senha, status global ou vínculos externos de outro usuário
- **THEN** a operação é negada e nenhum privilégio fora do tenant é alterado

#### Scenario: Super Admin tenta ampliar poderes
- **WHEN** Super Admin tenta criar/desativar tenant ou conceder Global/Super Admin
- **THEN** a API nega a operação nesta versão

### Requirement: Contexto explícito e entradas não confiáveis
Operações de tenant SHALL usar contexto explícito por requisição, com rotas `/api/v1/tenants/:tenantId/...` e agência derivada do tenant persistido. IDs enviados SHALL ser validados; campos administrativos, proprietário, papel e associações SHALL NOT ser aceitos por atribuição genérica. Recursos fora do escopo SHALL ter resposta que não revele existência.

#### Scenario: IDs adulterados
- **WHEN** um ator altera IDs no path/query/body para atingir outro tenant, agência ou proprietário
- **THEN** nenhuma consulta, contagem, escrita, relação, upload ou stream atravessa o escopo e o erro não revela o recurso externo

#### Scenario: Associação de agência falsificada
- **WHEN** o body declara agência diferente daquela persistida para o tenant
- **THEN** o servidor não usa essa declaração para autorizar ou relacionar dados

### Requirement: Defesa adicional no banco
Tabelas de conteúdo de tenant SHALL aplicar políticas de leitura e escrita que neguem acesso sem contexto autorizado. A credencial runtime SHALL não ser superuser, dona das tabelas nem capaz de ignorar RLS; migrations SHALL usar credencial separada. O contexto SHALL durar apenas a transação da operação, sem contaminar conexões reutilizadas e sem bypass amplo para Global/Super Admin.

#### Scenario: Consulta sem contexto
- **WHEN** a credencial runtime tenta ler ou escrever conteúdo sem contexto válido
- **THEN** o banco impede acesso ao conteúdo protegido

#### Scenario: Reutilização do pool
- **WHEN** operações de tenants distintos reutilizam conexão após sucesso, erro ou rollback
- **THEN** a operação seguinte não herda o contexto nem os dados da anterior

### Requirement: Propriedade das conversas e acesso excepcional
Listagens e operações pessoais de chat SHALL limitar-se ao proprietário autenticado, inclusive para Admin, Super Admin e Global. Global SHALL poder consultar conversas alheias somente em fluxo administrativo separado, explícito e auditado; esse acesso SHALL NOT aparecer no histórico pessoal.

#### Scenario: Admin tenta abrir conversa de colega
- **WHEN** Admin informa o ID de uma conversa de outro usuário do mesmo tenant
- **THEN** o fluxo pessoal nega acesso sem revelar conteúdo

#### Scenario: Consulta excepcional Global
- **WHEN** Global seleciona tenant e recurso no fluxo administrativo de consulta
- **THEN** a leitura registra ator, motivo, escopo e resultado e não modifica o histórico pessoal do Global

### Requirement: Responsável ativo preservado sob concorrência
Nenhuma operação SHALL deixar tenant ativo sem Admin responsável ativo ou plataforma sem Global ativo. A regra SHALL considerar alteração/remoção de vínculo, papel e desativação da identidade inteira e ser validada atomicamente sob operações concorrentes.

#### Scenario: Remoção concorrente dos últimos responsáveis
- **WHEN** duas transações tentam remover/rebaixar os dois últimos Admins ou Globals ativos
- **THEN** pelo menos uma operação é rejeitada e permanece um responsável válido

#### Scenario: Desativação de identidade com vários escopos
- **WHEN** Global tenta desativar conta que é a única Admin de um tenant ativo
- **THEN** a operação exige preservar outro Admin válido ou desativar explicitamente o tenant, sem deixar estado inválido

### Requirement: Abas e transições isoladas
O tenant ativo SHALL pertencer ao contexto da requisição/aba e não a estado global mutável da sessão no servidor. Trocar tenant SHALL cancelar requisições e streams, fechar diálogos e limpar estado transitório anterior; caches SHALL distinguir usuário e tenant.

#### Scenario: Duas abas em tenants distintos
- **WHEN** a mesma identidade usa simultaneamente A e B e realiza requisições concorrentes
- **THEN** dados, notificações, respostas e ações de cada aba permanecem no respectivo contexto

#### Scenario: Resposta atrasada após troca
- **WHEN** uma operação de A termina depois de a aba navegar para B
- **THEN** seu conteúdo não é exibido nem aplicado ao estado de B
