# Spec Delta

## Purpose

Permitir que visitantes solicitem acesso e que responsáveis autorizados classifiquem, revisem e convidem a pessoa sem liberar acesso antecipadamente.

## ADDED Requirements

### Requirement: Solicitação pública mínima e acessível
`/solicitar-acesso` SHALL permitir informar nome completo, e-mail profissional e empresa/agência obrigatórios e mensagem opcional, com validação no cliente e servidor. O formulário SHALL NOT solicitar senha, oferecer escolha de privilégios ou publicar catálogo de agências/tenants. O envio SHALL usar `POST /api/v1/access-requests`, com proteção contra abuso e estados traduzidos de envio, erro e confirmação.

#### Scenario: Envio válido
- **WHEN** o visitante envia dados válidos
- **THEN** o sistema persiste solicitação pending sem escopo confiável e confirma recebimento de forma neutra, explicando que o acesso depende de aprovação

#### Scenario: Erro recuperável
- **WHEN** há erro de campo ou falha de rede
- **THEN** o formulário mantém os dados, associa erros aos campos e permite tentar novamente sem envios concorrentes acidentais

### Requirement: Privacidade e deduplicação pública
Solicitação SHALL NOT criar conta ativa, vínculo ou sessão automaticamente. Repetições para um e-mail normalizado com pedido pending SHALL não duplicar o pedido e SHALL usar a mesma resposta pública. Não SHALL existir consulta pública de listagem, detalhe ou status por e-mail/ID, nem resposta que confirme conta existente.

#### Scenario: Solicitações simultâneas repetidas
- **WHEN** duas requisições públicas enviam o mesmo e-mail enquanto não há pedido resolvido
- **THEN** existe no máximo um pedido pending e ambas recebem confirmação pública equivalente

#### Scenario: Tentativa de enumeração
- **WHEN** um visitante envia e-mail já cadastrado ou tenta consultar pedido de outra pessoa
- **THEN** não obtém confirmação de identidade, status administrativo nem dados do pedido

### Requirement: Triagem exclusiva e escopo validado
Pedidos sem escopo SHALL ser visíveis apenas a Global para triagem. A empresa/agência informada SHALL ser tratada como declaração e nunca associada automaticamente. Global SHALL escolher tenant existente e agência consistente, podendo encaminhar revisão aos responsáveis autorizados; reclassificação SHALL ser permitida somente enquanto pending.

#### Scenario: Organização declarada corresponde a agência
- **WHEN** o visitante digita o nome exato de uma agência existente
- **THEN** o pedido continua sem escopo até classificação Global e nenhum vínculo é inferido

#### Scenario: Classificação válida
- **WHEN** Global encaminha pedido pending para um tenant
- **THEN** a agência corresponde ao tenant persistido e somente revisores desse escopo, além de Global, passam a poder revisá-lo

### Requirement: Revisão com papéis limitados
Global SHALL revisar pedidos em qualquer escopo, Super Admin somente nos tenants de sua agência e Admin somente no próprio tenant. User SHALL NOT revisar. Revisão SHALL registrar status pending/approved/rejected, revisor, data e motivo administrativo opcional. Aprovação SHALL sugerir User e permitir Admin quando autorizado, nunca Global/Super Admin.

#### Scenario: Revisor externo ao escopo
- **WHEN** Admin ou Super Admin tenta revisar solicitação não classificada ou de outro escopo
- **THEN** a API nega leitura/alteração sem divulgar dados do solicitante

#### Scenario: Rejeição
- **WHEN** revisor autorizado rejeita um pedido pending
- **THEN** o pedido fica rejected com trilha administrativa, nenhum convite/vínculo é criado e a decisão não se torna publicamente consultável

### Requirement: Aprovação atômica e idempotente
Aprovação SHALL persistir decisão, convite e estado de entrega de e-mail atomicamente, sem ativar acesso antes da aceitação. Aprovações concorrentes/repetidas SHALL não criar convites duplicados; decisão concorrente incompatível SHALL produzir conflito seguro.

#### Scenario: Aprovação concorrente
- **WHEN** dois revisores autorizados aprovam o mesmo pedido pending
- **THEN** existe uma única aprovação efetiva e um único convite associado, com estado de entrega recuperável

#### Scenario: Aprovação de conta existente
- **WHEN** pedido de identidade já cadastrada é aprovado
- **THEN** o convite oferece somente o vínculo aprovado e sua aceitação preserva senha e demais acessos

### Requirement: Entrega recuperável e notificações restritas
Falhas SMTP SHALL ser persistidas com possibilidade de reenvio do mesmo convite, sem reportar entrega inexistente. Eventos de solicitação SHALL notificar apenas destinatários autorizados: Global antes da classificação e revisores do escopo depois dela. Mensagens públicas SHALL não revelar notas administrativas ou informações internas.

#### Scenario: SMTP indisponível na aprovação
- **WHEN** a aprovação é confirmada no banco e o envio do e-mail falha
- **THEN** o estado indica falha/pendência, permite reenvio sem novo convite e mantém acesso inativo até aceitação válida

#### Scenario: Solicitação ainda sem tenant
- **WHEN** um novo pedido não classificado é criado
- **THEN** notificações de plataforma são geradas apenas para Globals autorizados, sem broadcast aos tenants
