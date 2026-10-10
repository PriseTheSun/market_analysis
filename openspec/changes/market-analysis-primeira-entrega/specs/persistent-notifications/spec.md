# Spec Delta

## Purpose

Manter notificações pessoais duráveis e traduzíveis sobre eventos reais, visíveis somente a destinatários atualmente autorizados.

## ADDED Requirements

### Requirement: Eventos reais com destinatários definidos
Notificações SHALL decorrer de eventos reais de upload concluído/falho, solicitação recebida/revisada, convite aceito e alteração de papel. Cada evento SHALL definir destinatários e escopo explicitamente; pedidos sem tenant SHALL notificar apenas Global na plataforma. Quando evento e notificação residirem no mesmo banco, sua persistência SHALL ser atômica e idempotente.

#### Scenario: Evento duplicado
- **WHEN** a finalização de upload ou aceitação de convite é processada novamente
- **THEN** o destinatário autorizado não recebe notificações duplicadas do mesmo evento

#### Scenario: Pedido classificado
- **WHEN** uma solicitação é encaminhada/revisada em um tenant
- **THEN** só destinatários elegíveis ao evento e àquele escopo recebem a notificação, sem broadcast a todos os usuários

### Requirement: Central e leitura persistentes
A aplicação SHALL oferecer sininho com contador de não lidas, popover recente, listagem completa, marcar uma/todas como lidas e estados de carregamento/vazio/erro. Leitura SHALL persistir após reload e em outro dispositivo; contador e mutações SHALL limitar-se ao destinatário e contexto autorizados.

#### Scenario: Leitura em outro dispositivo
- **WHEN** o usuário marca uma notificação como lida e entra em outro dispositivo
- **THEN** encontra o estado atualizado e contador coerente após sincronização

#### Scenario: Alteração de notificação alheia
- **WHEN** um usuário tenta marcar ID de notificação de outra pessoa ou escopo externo
- **THEN** a operação é negada e não altera seu contador nem o do destinatário

### Requirement: Idioma e permissão avaliados na leitura
Notificações SHALL guardar tipo/chave e parâmetros seguros para tradução no idioma corrente, sem copiar conteúdo sensível integral. Acesso e navegação ao recurso relacionado SHALL revalidar permissão atual; perda de acesso SHALL impedir exposição de dados antigos daquele escopo.

#### Scenario: Mudança de idioma
- **WHEN** o usuário altera o idioma depois da criação de notificações
- **THEN** textos de sistema são apresentados no novo idioma sem traduzir nomes próprios e conteúdos do usuário

#### Scenario: Recurso não mais autorizado
- **WHEN** o destinatário perdeu acesso ao tenant ou recurso relacionado
- **THEN** a notificação não expõe dados protegidos e o link não permite acessar o recurso

### Requirement: Atualização eficiente por contexto
A central SHALL atualizar aproximadamente a cada 30 segundos enquanto visível, pausar em aba oculta e atualizar após retorno de foco/eventos locais. Troca de tenant SHALL não reaproveitar notificações/contador do contexto anterior. Toasts SHALL ser feedback temporário e não substituir persistência.

#### Scenario: Aba oculta e retorno
- **WHEN** a aba fica oculta e volta ao foco
- **THEN** polling fica suspenso durante a ausência e a central atualiza o contexto autorizado no retorno
