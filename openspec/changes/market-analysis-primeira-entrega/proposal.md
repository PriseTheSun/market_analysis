# Proposal

## Why

O Market Analysis precisa de uma primeira entrega funcional para agências e seus clientes, com acesso controlado, isolamento entre tenants e fluxos reais de arquivos e chat. O diretório atual contém apenas a configuração OpenSpec; esta mudança estabelece o contrato completo da aplicação descrita no briefing de 10 de outubro de 2026 antes de iniciar sua implementação.

## What Changes

- Criar um monorepo pnpm com React/Vite/TypeScript, API NestJS modular, contratos Zod compartilhados e PostgreSQL/Prisma, executável por Docker Compose.
- Implementar identidade única, sessões seguras, recuperação, convites e autorização em três níveis: plataforma, agência e tenant, com RLS como defesa adicional.
- Entregar solicitação pública de acesso, triagem Global, revisão por escopo, aprovação atômica e ativação somente após aceitação do convite.
- Entregar administração de agências, tenants e vínculos, seleção explícita de contexto e proteção concorrente do último Admin/Global.
- Implementar arquivos em bucket S3 privado, chat pessoal persistente com provedor desacoplado, notificações duráveis e tour por papel.
- Criar um sistema visual independente com Montserrat local, Lucide, shadcn/ui, uso contido de Magic UI, Motion, pt-BR/en/es, tema claro inicial, escuro manual e Sonner inferior esquerdo.
- Aplicar as duas referências de autenticação ao layout compartilhado, usando o vídeo e a marca locais fornecidos, máscara acessível e fallback estático.
- Provisionar seed idempotente com duas agências, ao menos quatro tenants e as quatro identidades exatas do briefing; comprovar isolamento com fixtures restritas adicionais.
- Entregar testes de políticas, integração com PostgreSQL e S3 reais, E2E, revisão visual e documentação de execução e limitações.

Fora desta entrega: cobrança, chat entre pessoas, OCR, RAG, embeddings, consulta a mercado em tempo real, relatórios e publicação em produção. Não há provedor de IA configurado no projeto: o modo demonstrativo será explícito e restrito a desenvolvimento/testes; produção sem provedor retornará indisponibilidade. Higgsfield, geração externa de mídia, builders e serviços pagos adicionais não fazem parte da solução.

## Capabilities

### New Capabilities

- `platform-foundation`: estrutura, persistência, seed, infraestrutura reproduzível, contratos, auditoria e evidências técnicas.
- `identity-access`: login, sessão, logout, recuperação e aceitação segura de convites.
- `tenant-authorization`: escopos, políticas, RLS, propriedade, invariantes concorrentes e contexto por requisição.
- `access-requests`: solicitação pública, triagem, revisão, convite e entrega de e-mail recuperável.
- `administration`: gestão Global/agência/tenant e interfaces de contexto e membros.
- `file-storage`: upload, verificação, download e remoção em storage privado com limites reais.
- `assistant-chat`: conversas pessoais persistentes, streaming, cancelamento, idempotência e adapters de IA.
- `persistent-notifications`: eventos reais, destinatários autorizados, leitura persistente e polling.
- `preferences-onboarding`: idioma, tema explícito, preferências e Driver.js por usuário/tenant/versão.
- `interface-auth-experience`: sistema visual, navegação responsiva, acessibilidade e autenticação conforme assets fornecidos.

### Modified Capabilities

Nenhuma. O inventário de especificações existentes está vazio.

## Impact

A implementação criará `apps/web`, `apps/api`, `packages/contracts`, `packages/config`, `infra`, `docs`, migrations, seed e testes. Introduzirá a API `/api/v1`, banco PostgreSQL, storage S3 local privado (SeaweedFS proposto), SMTP local e proxy com suporte a streaming. Versões estáveis exatas serão fixadas no lockfile e nas imagens durante a implementação, sem tags `latest`.

Os assets estão em `/Users/erikaraujo/Downloads/`: `bg_login.mp4`, `main_logo.svg`, `logo_transicao.svg`, `referencia login.png` e `Referencia solicitação de cadastro.png`. Serão incorporados em caminhos estáveis na implementação, preservando originais. As referências orientam composição; o briefing escrito define cor, tipografia, conteúdo e movimento. Não existe código, integração externa ou histórico Git local a migrar nesta inspeção.

Esta etapa cria apenas os artefatos OpenSpec: proposta, especificações, desenho técnico e tarefas. Os documentos operacionais em `docs/`, os assets e o código serão criados no fluxo de aplicação da mudança.
