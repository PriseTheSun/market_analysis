# Proposal

## Why

O sistema precisa definir, por funcionalidade, os modelos de IA utilizados pelo Chat e pela geração de imagens. Hoje o Chat usa um provider demonstrativo, e a falta de acesso local à credencial gerenciada na AWS impede validar uma integração real sem expor segredos ou depender da infraestrutura de produção.

## What Changes

- Adicionar o módulo **Configurações de IA**, exclusivo do perfil Global, com navegação localizada e layout baseado em `Configurações de IA simplificadas.png`: origem da conexão, cards de modelos por funcionalidade, conexão temporária, consumo e ações de salvar/cancelar.
- Integrar **Gemini Developer API** como primeiro provedor. A conexão gerenciada obtém a credencial no AWS Secrets Manager; o catálogo de modelos vem do Gemini, filtrado por compatibilidade com texto ou imagem.
- Permitir definir separadamente o modelo de texto do Chat e o modelo de geração de imagens, testar cada seleção explicitamente e salvar as associações sem executar gerações automaticamente.
- Disponibilizar uma conexão de teste com token inserido no frontend somente em ambiente local habilitado no servidor. O token fica em memória no backend, vinculado à sessão Global, com validade absoluta de 60 minutos e revogação; nunca é devolvido ao frontend ou persistido no banco, armazenamento do navegador ou logs.
- Separar configurações gerenciadas por ambiente das preferências temporárias da sessão local, evitando que um teste altere a configuração ou credencial utilizada por outros usuários.
- Conectar o Chat existente ao modelo selecionado, preservando autorização, isolamento de conversas, streaming, cancelamento e idempotência. Entregar configuração e teste real de imagem com preview, além do serviço reutilizável de geração; uma nova interface de criação de imagens não faz parte desta mudança.
- Exibir uso medido e falhas claras, sem orçamento, alertas de consumo ou saldo local. Cota e gratuidade do provedor não serão inferidas do saldo local ou da simples presença de um modelo no catálogo.
- Manter ambas as origens, temporária e AWS Secrets Manager, sem cotas de consumo, imagens, concorrência por ator, frequência de requisições ou tetos locais de entrada/saída. O provedor determina a capacidade nativa do modelo; consumo é apenas informativo e separado por origem.
- Permitir iniciar e validar a aplicação sem credencial real: estado **Não configurado**, seleções e testes indisponíveis quando dependentes da conexão, e testes automatizados com adapters controlados. A integração real será habilitada depois pela configuração da AWS ou pelo token local.

## Capabilities

### New Capabilities

- `ai-configuration`: administração dos modelos por funcionalidade, escopos de configuração, interface localizada e testes de seleção.
- `ai-connections`: resolução segura da conexão Gemini gerenciada ou temporária, ciclo de vida de credenciais e catálogo compatível.
- `ai-execution`: execução de texto e imagem conforme a configuração, contabilização informativa de uso.

### Modified Capabilities

Nenhuma spec durável está publicada em `openspec/specs/`. As specs da mudança concluída `market-analysis-primeira-entrega` são referência de compatibilidade, especialmente `assistant-chat`, `administration` e `platform-foundation`; esta proposta não altera seus arquivos nem substitui suas garantias.

## Impact

- **Frontend:** shell, catálogo de rotas PT-BR/EN/ES, traduções, página de configurações, cliente de API e estados de disponibilidade do Chat.
- **Backend:** novo módulo de IA no NestJS, integração Gemini e AWS Secrets Manager, contratos Zod, controles de sessão/Global/CSRF, auditoria segura e integração com o Chat.
- **Persistência:** migração Prisma para associações/versionamento e registros de uso sem segredos, com autorização e RLS compatíveis com o projeto. Preferências locais ficam vinculadas à sessão; tokens permanecem somente em memória.
- **Operação:** variáveis opcionais de região/identificação/formato do segredo, IAM de privilégio mínimo, ativação explícita de testes locais, timeouts e validação de conteúdo. Não é necessário fornecer uma chave para implementar e testar os fluxos sem rede externa.
- **Validação:** testes unitários, contratos, integração, segurança, regressão do Chat e verificação visual responsiva baseada na imagem de referência. Dependências novas limitadas ao adapter Gemini e ao cliente AWS necessário.
