# Spec Delta

## Purpose

Estabelecer persistência, execução local reproduzível e evidências operacionais para a primeira versão funcional do Market Analysis.

## ADDED Requirements

### Requirement: Ambiente local reproduzível e persistente
O sistema SHALL oferecer um fluxo documentado de configuração, migrations e seed explícito, após o qual `docker compose up --build` inicia web/proxy, API, banco, storage S3 privado e SMTP de desenvolvimento. Dados SHALL sobreviver ao reinício dos serviços; builds SHALL usar versões estáveis fixadas, sem tags latest ou dependências de CDN em runtime.

#### Scenario: Inicialização documentada
- **WHEN** uma pessoa configura as variáveis de exemplo, executa migrations/seed documentados e inicia o Compose
- **THEN** os serviços ficam saudáveis e o login funciona com dados persistidos, sem provisionamento externo obrigatório

#### Scenario: Reinício dos serviços
- **WHEN** o ambiente é reiniciado sem apagar volumes
- **THEN** contas, vínculos, arquivos, conversas e notificações previamente persistidos continuam disponíveis aos respectivos usuários autorizados

### Requirement: Modelo íntegro e evolução versionada
O sistema SHALL persistir identidades, agências, tenants, vínculos, convites, solicitações, sessões, preferências, onboarding, arquivos, conversas, mensagens, notificações e auditoria. E-mail normalizado SHALL ser único, tenant SHALL pertencer a exatamente uma agência, vínculos SHALL ser únicos por pessoa/escopo e datas SHALL ser armazenadas em UTC. Evolução do banco SHALL usar migrations versionadas e relações SHALL impedir referências incompatíveis e exclusões acidentais de árvores de dados.

#### Scenario: Unicidades e relações
- **WHEN** uma operação tenta duplicar e-mail normalizado, vínculo ou slug no mesmo escopo, ou associar mensagem à conversa de outro tenant
- **THEN** a persistência rejeita a operação sem alterar os registros válidos

#### Scenario: Desativação preserva dados
- **WHEN** uma agência ou tenant é desativado pela operação autorizada
- **THEN** seu conteúdo não é apagado por cascata e os acessos subsequentes obedecem ao novo status

### Requirement: Seed demonstrativo exato e idempotente
O provisionamento demo SHALL criar duas agências, pelo menos dois tenants por agência e as identidades `global@marketanalysis.com`, `superadmin@marketanalysis.com`, `admin@marketanalysis.com` e `user@marketanalysis.com`, com senha inicial `MarketGlobal#2027`, pt-BR e light. Global SHALL ter atribuição de plataforma; Super Admin SHALL ter vínculo em cada agência; Admin e User SHALL ter os respectivos vínculos em cada tenant, sem duplicar identidades. Somente hashes de senha SHALL ser persistidos.

#### Scenario: Primeiro provisionamento
- **WHEN** o seed demo é executado em banco local preparado
- **THEN** as quatro contas autenticam com a senha inicial e acessam todos os escopos previstos por seus vínculos, sem memberships artificiais para Global/Super Admin

#### Scenario: Reexecução preserva alterações
- **WHEN** uma senha ou preferência foi alterada e o seed é executado novamente
- **THEN** identidades e vínculos não são duplicados, a senha/preferência alterada é preservada e novos tenants explicitamente demo podem receber os vínculos previstos

#### Scenario: Proteção do provisionamento
- **WHEN** o ambiente é produção ou o tenant não é demonstrativo
- **THEN** o seed demo não executa automaticamente, não amplia vínculos reais e não envia e-mails reais; reset demo exige comando explícito

### Requirement: Contratos de API e operação segura
A API SHALL usar `/api/v1`, separar recursos públicos, pessoais e administrativos e retornar erros com `code`, mensagem segura, `fieldErrors` quando aplicável e `requestId`. O sistema SHALL disponibilizar documentação da API protegida/desabilitada publicamente em produção, healthchecks sem dados sensíveis, logs estruturados e configuração externa de serviços/segredos.

#### Scenario: Erro de validação
- **WHEN** um payload inválido é enviado diretamente à API
- **THEN** ele é rejeitado com status HTTP apropriado e código estável traduzível, sem stack trace ou dados internos

#### Scenario: Diagnóstico em produção
- **WHEN** uma pessoa não autenticada consulta healthcheck ou tenta abrir a documentação administrativa em produção
- **THEN** recebe apenas a condição pública permitida e não obtém contratos protegidos, segredos ou dados de clientes

### Requirement: Auditoria restrita e evidência de entrega
O sistema SHALL registrar ator, ação, escopo, recurso, resultado e correlation ID para mudanças de acesso, administração de agências/tenants, operações relevantes de arquivos e consultas administrativas especiais. Auditoria SHALL excluir senhas, tokens, URLs assinadas e conteúdo integral de chats. A documentação de entrega SHALL distinguir fluxos comprovados, premissas, integrações ausentes e testes efetivamente executados.

#### Scenario: Ação administrativa auditada
- **WHEN** um Global promove alguém, desativa um tenant ou consulta uma conversa alheia pelo fluxo excepcional
- **THEN** há registro rastreável do ator, escopo e resultado sem armazenar conteúdo integral ou credenciais

#### Scenario: Validação de isolamento
- **WHEN** a entrega é validada
- **THEN** são usados banco real e fixtures restritas adicionais às quatro contas demo amplas, com evidência dos testes de isolamento e dos fluxos executados no Compose
