# Market Analysis

Primeira entrega local: acesso por convite, triagem de solicitações, administração de agências/clientes, arquivos privados, conversas pessoais, notificações e tour. Interface em português, inglês e espanhol; Montserrat local; temas claro e escuro manual.

**O chat é demonstrativo.** Ele exercita streaming, histórico, cancelamento e isolamento com respostas determinísticas. Não consulta mercado nem analisa arquivos. Sem um adapter real autorizado, o backend de produção retorna indisponibilidade.

## Executar localmente

Requisitos: Docker com Compose v2, Node **24.16.0** e pnpm **12.10.1**. As portas 8080, 55432, 8333, 8025 e 1025 devem estar livres. O projeto Compose usa o nome `market-analysis-local`, com volumes próprios.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:generate
docker compose up -d --wait db storage mailpit
docker compose build api web
docker compose run --rm migrate
docker compose run --rm migrate pnpm --filter @market/api exec tsx prisma/seed.ts
docker compose up -d --wait api web
```

`setup:local` gera `.env` e `infra/local/s3.json` com segredos locais aleatórios, sem imprimi-los. Não substitui `.env` existente. Não commite esses arquivos. Migrations e seed são comandos explícitos; a API não recebe a credencial do migrator. O script de inicialização PostgreSQL é copiado para dentro do container antes de ser lido, evitando execução de bind mount no Docker para macOS.

- Aplicação: [localhost:8080](http://localhost:8080)
- E-mails locais: [Mailpit](http://localhost:8025)
- Saúde: [API health](http://localhost:8080/api/v1/health)
- Contrato OpenAPI local: [Swagger](http://localhost:8080/api/docs) — desabilitado em produção.

| Perfil demo | E-mail | Escopo inicial |
| --- | --- | --- |
| Global | global@marketanalysis.com | Plataforma, duas agências e quatro clientes |
| Super Admin | superadmin@marketanalysis.com | Duas agências, sem vínculos artificiais em clientes |
| Admin | admin@marketanalysis.com | Admin nos quatro clientes |
| User | user@marketanalysis.com | Conversas pessoais nos quatro clientes |

Após o login, contas Global entram na administração global, em `/plataforma/agencias`, mesmo que tenham acessado um cliente anteriormente. Para os demais perfis, o aplicativo abre direto no chat do último cliente autorizado (ou do primeiro disponível). O seletor de espaço do cabeçalho lista as agências autorizadas — todas para Global — e expande os clientes de cada agência para a escolha exata do workspace. O acesso administrativo à agência aparece apenas para quem possui essa permissão.

A hierarquia do produto é **Agência → Cliente**: por exemplo, agência Publicis e cliente Nivea. Cada cliente pertence a uma agência e possui seu próprio espaço de trabalho. A listagem usa `/plataforma/clientes` em português e espanhol, e `/platform/clients` em inglês. Os links antigos de organizações e `/platform/tenants` redirecionam para a nova rota no idioma atual. O mesmo padrão de tradução se aplica às demais páginas. Os identificadores e contratos internos de tenant permanecem estáveis, preservando dados, vínculos e permissões existentes.

Senha inicial de todas: **`MarketGlobal#2027`**. Agências Demo A/B; clientes Aurora, Horizonte, Atlas e Cobalto. O seed é idempotente: preserva senhas, preferências e alterações existentes, não envia e-mails e recusa execução em produção. Para restaurar **explicitamente só as senhas demo**:

```sh
docker compose run --rm migrate pnpm --filter @market/api exec tsx prisma/seed.ts --reset-demo-passwords
```

Para interromper sem apagar dados: `docker compose stop`. Para retomar: `docker compose up -d --wait`. Não é necessário remover volumes. `docker compose down -v` apaga dados e não faz parte do setup ou da atualização.

## Desenvolvimento e verificações

Após o setup inicial, com o Docker Desktop aberto, execute na raiz do projeto:

```sh
pnpm run dev
```

O comando inicia DB/S3/Mailpit no Compose e executa API e frontend juntos, com atualização automática. `pnpm dev` é um atalho equivalente. Use `Ctrl+C` para encerrar os servidores de desenvolvimento; os serviços do Compose continuam ativos. Para executar cada servidor separadamente, use `pnpm dev:api` e `pnpm dev:web` em terminais distintos.

Vite: `http://localhost:5173` ou `http://127.0.0.1:5173`; API de desenvolvimento: `http://localhost:3000`. As duas origens locais estão em `ALLOWED_ORIGINS` no `.env.example`; ambientes criados anteriormente devem incluir ambas no `.env` e reiniciar a API. O Vite mantém a porta 5173 e avisa se ela estiver ocupada. Os convites enviados por padrão continuam apontando para 8080; ajuste `APP_ORIGIN` se quiser abri-los no Vite. Nunca exponha `DB_MIGRATION_PASSWORD`, `OUTBOX_KEY` ou chaves S3 ao Vite.

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:integration
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Integração e E2E usam o Compose em 8080. `API_BASE_URL` e `BASE_URL` permitem selecionar outro ambiente **de teste**, respectivamente. Em reexecuções frequentes, `node --env-file=.env scripts/prepare-local-tests.mjs` limpa somente contadores locais temporários antes da suíte; os limites continuam habilitados. As fixtures restritas ficam identificadas por `fixture` e são desativadas ao final; os testes deixam histórico/auditoria e e-mails locais. Rate limits continuam ativos; evite executar várias suítes simultâneas. O relatório E2E é `playwright-report/index.html` e as capturas ficam em `output/playwright/visual/`.

`pnpm test:resilience` é uma verificação operacional explícita: interrompe temporariamente **somente** Mailpit/storage do projeto local, reinicia API/storage/SMTP, e restaura os serviços em `finally`. Verifica retry de e-mail, lease, recuperação de chat, persistência e limpeza de upload. Execute sem outras suítes em andamento.

As instruções do ambiente isolado, resultados e limitações estão em [Validação](docs/validation.md). [Permissões](docs/permissions.md), [Arquitetura](docs/architecture.md), [Assets](docs/assets.md), [Premissas](docs/assumptions.md) e [Sistema visual](DESIGN.md) detalham as decisões.

## Integrações

O S3 é privado e usa endpoints interno/público distintos. PDF/CSV/XLSX/TXT têm limite real de 25 MiB na policy, conteúdo validado antes de disponibilidade e quota padrão de 1 GiB por tenant. Links de download expiram em 60 s. SMTP local usa Mailpit; entregas falhadas permanecem na outbox cifrada para retry ou reenvio administrativo.

Para ambiente externo, configure banco, SMTP, S3, origens, TLS/cookies e a CSP do proxy. O Compose e sua CSP são deliberadamente locais. Um provider de IA real deve implementar `ChatProvider` em `apps/api/src/chat/chat.provider.ts`, ser registrado pela factory e validado no backend. Apenas fornecer uma chave não ativa uma integração: nenhum provedor real foi configurado nesta entrega. Não houve publicação em produção.
