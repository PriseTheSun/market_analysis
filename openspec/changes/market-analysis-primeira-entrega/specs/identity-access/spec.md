# Spec Delta

## Purpose

Permitir autenticação, recuperação e ativação de acessos com sessões revogáveis e preservação da identidade única de cada pessoa.

## ADDED Requirements

### Requirement: Login e sessão protegida
O sistema SHALL autenticar contas ativas com e-mail normalizado e senha, criar sessão opaca revogável e consultar o usuário autenticado sem expor tokens ao JavaScript. Cookies SHALL ser HttpOnly e Secure em produção, com expiração e SameSite apropriados; a sessão SHALL ser rotacionada após login. Credenciais e tokens SHALL ser armazenados somente em representação protegida e nunca em localStorage ou bundle web.

#### Scenario: Login válido
- **WHEN** uma conta ativa fornece credenciais válidas
- **THEN** recebe sessão protegida e segue para chat no único tenant acessível ou para seleção de contexto quando houver vários

#### Scenario: Login inválido ou conta inativa
- **WHEN** as credenciais são inválidas ou a conta não pode autenticar
- **THEN** a interface apresenta erro seguro e traduzido sem abrir sessão nem confirmar detalhes internos da conta

### Requirement: Duração de sessão e logout
O login SHALL oferecer “Lembrar de mim” com política de persistência documentada. Logout e expiração SHALL impedir reutilização da sessão e limpar estado pessoal da interface; a consulta da sessão SHALL refletir o estado atual da conta.

#### Scenario: Logout revoga acesso
- **WHEN** o usuário sai e tenta reutilizar o cookie anterior
- **THEN** a API nega acesso e a aplicação não reapresenta conteúdo pessoal em cache

#### Scenario: Sessão expirada
- **WHEN** uma operação ocorre após expiração ou revogação
- **THEN** a aplicação interrompe operações protegidas e oferece retorno ao login com mensagem traduzida

### Requirement: Proteção contra abuso e requisições forjadas
Mutações por cookie, inclusive login e logout, SHALL validar origem e proteção CSRF. Login, recuperação, convites e demais operações sensíveis SHALL ter limites de requisições; CORS SHALL admitir somente origens configuradas e o backend SHALL validar payloads independentemente do frontend.

#### Scenario: Requisição de origem indevida
- **WHEN** uma mutação autenticada é enviada sem prova CSRF válida ou por origem não permitida
- **THEN** a API rejeita a ação sem alterar dados

#### Scenario: Abuso de autenticação
- **WHEN** uma origem/identificador ultrapassa o limite configurado
- **THEN** o endpoint aplica bloqueio temporário com resposta segura e não processa tentativas ilimitadas

### Requirement: Recuperação com uso único
Recuperação SHALL retornar resposta pública neutra para e-mail conhecido ou desconhecido. Redefinição SHALL exigir token válido, protegido, não expirado e consumido atomicamente; uma redefinição bem-sucedida SHALL invalidar sessões anteriores. Falha SMTP SHALL ser rastreável e não apresentada como envio confirmado.

#### Scenario: Recuperação não enumera contas
- **WHEN** são solicitadas recuperações para endereços existentes e inexistentes
- **THEN** a resposta pública tem o mesmo significado e não revela presença de conta

#### Scenario: Consumo concorrente de recuperação
- **WHEN** duas requisições tentam consumir o mesmo token válido
- **THEN** no máximo uma altera a senha e reutilizações/expirações recebem erro seguro

### Requirement: Aceitação de convite cria apenas o acesso aprovado
Convites SHALL carregar destino, papel e escopo validados, validade e consumo único. Uma pessoa nova SHALL definir sua senha na aceitação. Uma conta existente SHALL comprovar controle da identidade convidada e receber somente o vínculo aprovado, preservando senha e demais vínculos. A solicitação pública ou emissão de convite SHALL NOT ativar acesso antes da aceitação válida.

#### Scenario: Nova identidade aceita convite
- **WHEN** um convite válido é aceito com os dados e senha exigidos
- **THEN** a identidade e o vínculo aprovado tornam-se utilizáveis uma única vez e o evento é persistido

#### Scenario: Identidade existente aceita convite
- **WHEN** a pessoa autenticada com o mesmo e-mail aceita um convite para outro tenant
- **THEN** recebe somente o novo vínculo sem alteração da senha nem dos papéis nos outros tenants

#### Scenario: Convite indevido
- **WHEN** o token foi consumido, expirou, a agência/tenant foi desativada ou a identidade autenticada não corresponde ao destinatário
- **THEN** a aceitação é negada sem criar acesso ou elevar privilégios

### Requirement: Revogação efetiva com sessão ainda válida
Toda operação protegida SHALL revalidar status atual de conta, agência, tenant e vínculos necessários. Revogar um vínculo SHALL impedir novas operações naquele escopo sem remover acessos independentes; streams SHALL ser encerrados quando a revogação for detectada.

#### Scenario: Vínculo removido durante sessão
- **WHEN** um usuário com sessão válida perde seu acesso ao tenant A, mantendo acesso ao B
- **THEN** novas operações em A são negadas, streams de A são encerrados após detecção e o acesso autorizado a B permanece
