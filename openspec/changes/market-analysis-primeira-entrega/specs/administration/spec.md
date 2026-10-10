# Spec Delta

## Purpose

Oferecer gestão de agências, tenants e vínculos com contexto claro e operações administrativas restritas ao alcance de cada papel.

## ADDED Requirements

### Requirement: Gestão de plataforma
Global SHALL criar, consultar, configurar e desativar agências/tenants e atribuir/remover Super Admin por agência em fluxos específicos. Promoção Global e desativação de conta inteira SHALL ser operações separadas, explícitas e auditadas. A ativação de tenant SHALL exigir Admin responsável ativo.

#### Scenario: Criação de tenant aguardando responsável
- **WHEN** Global cria tenant cujo Admin ainda não aceitou convite
- **THEN** o tenant permanece em provisionamento sem acesso a conteúdo; a aceitação válida do convite de Admin emitido por Global pode ativar vínculo e tenant atomicamente, sem reativar tenants desativados

#### Scenario: Administração Global
- **WHEN** Global desativa tenant ou atribui Super Admin à agência selecionada
- **THEN** a mudança afeta somente o recurso/escopo indicado, fica auditada e acessos posteriores refletem a alteração

### Requirement: Gestão de membros por escopo
Global, Super Admin da agência e Admin do tenant SHALL convidar, listar e alterar vínculos entre Admin/User ou desativá-los no escopo autorizado. A interface SHALL indicar o escopo da operação e respeitar a proteção do último Admin. Essas operações SHALL NOT alterar a identidade global ou vínculos em outros tenants.

#### Scenario: Alteração de papel local
- **WHEN** Admin muda um membro de User para Admin no tenant selecionado
- **THEN** somente esse vínculo muda e o resultado gera auditoria e evento autorizado

#### Scenario: Desativação local
- **WHEN** Super Admin remove acesso a um tenant de sua agência
- **THEN** os demais vínculos da pessoa permanecem e a interface informa o escopo afetado

### Requirement: Seleção de contexto e navegação por capacidade
A aplicação SHALL mostrar agência e tenant ativos e oferecer contextos acessíveis conforme autorização atual. Um único tenant SHALL abrir diretamente no chat, múltiplos SHALL permitir seleção e nenhum SHALL apresentar estado útil sem conteúdo protegido. Área de agência SHALL permitir a Super Admin selecionar tenants e gerir seus membros sem funções de criação/desativação de tenant.

#### Scenario: Usuário com múltiplos tenants
- **WHEN** a pessoa entra na aplicação com mais de um contexto autorizado
- **THEN** pode escolher e trocar contexto com agência/tenant claramente identificados e sem opções externas ao seu acesso

#### Scenario: Nenhum contexto disponível
- **WHEN** a conta autenticada não tem tenant ativo acessível
- **THEN** a aplicação apresenta estado sem acesso e mantém logout e controles pessoais disponíveis; Global mantém sua área administrativa

### Requirement: Listagens e ações compreensíveis
Listagens administrativas SHALL oferecer busca e paginação, estados de carregamento/vazio/erro/falta de permissão e feedback de sucesso. Ações destrutivas SHALL exigir confirmação contextual na interface, e erros de conflito SHALL explicar a restrição sem revelar dados externos.

#### Scenario: Tentativa de remover último Admin
- **WHEN** o responsável confirma remoção que deixaria tenant ativo sem Admin
- **THEN** a operação é recusada com erro de negócio traduzido e a listagem mantém estado consistente

#### Scenario: Busca e paginação
- **WHEN** revisor consulta páginas ou busca membros/solicitações
- **THEN** os resultados e contagens permanecem restritos ao seu escopo autorizado
