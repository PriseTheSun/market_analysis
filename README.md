# Market Analysis

Primeira entrega local: acesso por convite, triagem de solicitações, administração de agências/clientes, arquivos privados, conversas pessoais, notificações e tour. Interface em português, inglês e espanhol; Montserrat local; temas claro e escuro manual.

**O projeto inicia com chat demonstrativo e Gemini desabilitado.** O modo demonstrativo usa respostas determinísticas, sem consultar mercado ou analisar arquivos. A integração Gemini já está implementada; para usá-la localmente, siga a seção [Ativar o token temporário de IA](#ativar-o-token-temporário-de-ia).

## Rodar em desenvolvimento — recomendado

Requisitos: Docker com Compose v2 em execução, Node **24.16.0** e pnpm **12.10.1**. Execute os comandos na raiz deste repositório. As portas 5173, 3000, 55432, 8333, 8025 e 1025 devem estar livres. O projeto Compose usa o nome `market-analysis-local`, com volumes próprios.

### Primeira execução

O Docker executa banco, armazenamento e e-mail; a API e o frontend rodam na sua máquina, com atualização automática ao editar o código.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm setup:local
docker compose up -d --wait db storage mailpit
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Abra **[http://localhost:5173](http://localhost:5173)** e entre com `global@marketanalysis.com`, senha inicial `MarketGlobal#2027`.

- E-mails locais: [Mailpit](http://localhost:8025).
- Saúde da API: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health), com resposta `{"status":"ok"}`.
- Contrato da API: [Swagger](http://localhost:3000/api/docs), disponível fora de produção.

`setup:local` gera `.env` e `infra/local/s3.json` com segredos locais aleatórios. Se `.env` já existir, o comando o preserva e **não acrescenta novas variáveis**: compare com `.env.example` e adicione as que faltarem, mantendo seus valores existentes. Não commite esses arquivos.

O seed cria as contas de demonstração e preserva senhas, preferências e cadastros já existentes. Migrações e seed são etapas explícitas; `pnpm dev` não as executa.

### Próximas execuções

Com o Docker aberto, basta executar:

```sh
pnpm dev
```

Esse comando inicia DB/S3/Mailpit, compila `@market/contracts`, gera o cliente Prisma e inicia API e frontend. Use `Ctrl+C` para encerrar API e frontend; os serviços do Docker continuam ativos. Para pará-los sem apagar dados, use `docker compose stop`.

Para executar os servidores separadamente, suba os serviços com `docker compose up -d --wait db storage mailpit`, depois rode `pnpm dev:api` e `pnpm dev:web` em terminais distintos. Ambos compilam os contratos, e a API regenera o cliente Prisma.

O frontend também abre em `http://127.0.0.1:5173`. As duas origens devem constar em `ALLOWED_ORIGINS`. Os links de convite e recuperação usam `APP_ORIGIN`, cujo padrão é `http://localhost:8080`; para abri-los no servidor de desenvolvimento, altere para `http://localhost:5173` no `.env` e reinicie a API.

### Depois de atualizar o código

Encerre `pnpm dev` com `Ctrl+C` e execute:

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait db storage mailpit
pnpm db:migrate
pnpm dev
```

Isso aplica as migrações pendentes e recompila contratos e cliente Prisma. Não é necessário repetir o seed. Ao editar `packages/contracts/src` ou o schema Prisma durante o desenvolvimento, reinicie o comando para atualizar os arquivos gerados. Ao alterar `.env`, reinicie a API para que os novos valores sejam lidos.

### Ativar o token temporário de IA

Para exibir a opção **Token temporário** em Configurações de IA, adicione ou ajuste estas variáveis no `.env` local:

```dotenv
NODE_ENV=development
APP_ENV=local
AI_GEMINI_ENABLED=true
AI_LOCAL_TOKEN_ENABLED=true
BIND_HOST=127.0.0.1
```

Reinicie `pnpm dev` depois de salvar. Em seguida:

1. Entre com a conta **Global** e abra **Configurações de IA**, em `/plataforma/configuracoes-ia`.
2. Selecione **Token temporário**, insira a chave Gemini no campo protegido e clique em **Conectar**.
3. Escolha o modelo de texto e, se necessário, o modelo de imagem; clique em **Salvar configuração**.
4. Abra o Chat em um cliente usando a mesma sessão.

A chave é inserida somente na interface e fica em memória no backend. Não a coloque no `.env`, em variáveis `VITE_*` ou no código. A conexão expira após 60 minutos e também termina ao sair, revogá-la ou reiniciar a API; nesses casos, conecte novamente. A opção temporária exige ambiente local e não aparece em produção. Detalhes em [Configurações de IA](docs/ai-settings.md).

### Problemas comuns

| Sintoma | Como resolver |
| --- | --- |
| `Cannot connect to the Docker daemon` | Abra o Docker Desktop e aguarde a inicialização. No macOS, use `open -a Docker`. |
| Erro 500 ao abrir Configurações de IA após atualizar o código | Execute `pnpm db:migrate` e reinicie `pnpm dev`, que regenera o cliente Prisma. Confira as pendências com `pnpm --filter @market/api exec prisma migrate status`. |
| A opção Token temporário não aparece | Confira as variáveis da seção acima e reinicie a API. `setup:local` não atualiza um `.env` existente. A conta precisa ser Global. |
| A tela parece antiga depois de editar o código | Confira a URL: o desenvolvimento abre em 5173. A versão Docker em 8080 só incorpora alterações após reconstruir as imagens. |
| Porta 5173 ou 3000 ocupada | Encerre a instância anterior de desenvolvimento antes de executar `pnpm dev` novamente. O Vite não troca de porta automaticamente. |
| Login retorna 502 em `/auth/session` ou `/auth/csrf` na porta 5173 | O frontend não conseguiu alcançar a API da porta 3000. Confira a saída de `pnpm dev` e reinicie o comando após corrigir o erro. A geração do Prisma usa entrada não interativa para não suspender a API quando executada junto do Vite. |

## Alternativa: executar tudo no Docker

Use este modo para abrir a versão compilada em **[http://localhost:8080](http://localhost:8080)**. Ele utiliza o mesmo banco e os mesmos volumes do modo de desenvolvimento. Execute na raiz, com os requisitos acima instalados e a porta 8080 livre:

```sh
corepack enable
pnpm setup:local
docker compose up -d --wait db storage mailpit
docker compose build api web migrate
docker compose run --rm migrate
docker compose run --rm migrate pnpm --filter @market/api exec tsx prisma/seed.ts
docker compose up -d --wait api web
```

Após atualizar o código, reconstrua as imagens, aplique as migrações e recrie os serviços:

```sh
docker compose build api web migrate
docker compose run --rm migrate
docker compose up -d --wait api web
```

Ao alterar as variáveis de IA no `.env`, use `docker compose up -d --force-recreate --wait api` para aplicá-las; apenas `docker compose restart` não atualiza as variáveis. O Compose define a interface de rede da API dentro do container e publica o frontend apenas em loopback.

Neste modo, a saúde da API fica em [localhost:8080/api/v1/health](http://localhost:8080/api/v1/health) e o Swagger em [localhost:8080/api/docs](http://localhost:8080/api/docs). Para parar, use `docker compose stop`; para retomar os serviços já configurados, `docker compose up -d --wait`. `docker compose down -v` apaga os dados e não faz parte do setup ou da atualização.

## Contas de demonstração e navegação

| Perfil demo | E-mail | Escopo inicial |
| --- | --- | --- |
| Global | global@marketanalysis.com | Plataforma, duas agências e quatro clientes |
| Super Admin | superadmin@marketanalysis.com | Duas agências, sem vínculos artificiais em clientes |
| Admin | admin@marketanalysis.com | Admin nos quatro clientes |
| User | user@marketanalysis.com | Conversas pessoais nos quatro clientes |

Após o login, contas Global entram na administração global, em `/plataforma/gestao`, mesmo que tenham acessado um cliente anteriormente. Para os demais perfis, o aplicativo abre direto no chat do último cliente autorizado (ou do primeiro disponível). O seletor de espaço do cabeçalho lista as agências autorizadas — todas para Global — e expande os clientes de cada agência para a escolha exata do workspace. O acesso administrativo à agência aparece apenas para quem possui essa permissão.

A hierarquia do produto é **Agência → Cliente**: por exemplo, agência Publicis e cliente Nivea. Cada cliente pertence a uma agência e possui seu próprio espaço de trabalho. A administração global reúne Usuários, Permissões, Agências e Clientes na **Central de gestão**, em `/plataforma/gestao` (PT-BR), `/platform/management` (EN) e `/plataforma/gestion` (ES). As antigas rotas de agências, clientes/organizações e contas redirecionam para a aba correspondente, preservando links existentes. O mesmo padrão de tradução se aplica às demais páginas. Os identificadores e contratos internos de tenant permanecem estáveis, preservando dados, vínculos e permissões existentes.

Na Central, todas as listas têm 12 itens por página e ações em reticências. Os formulários laterais criam e editam registros, vinculam usuários a clientes e gerenciam os perfis existentes: Global na plataforma, Super Admin na agência e Admin/User no cliente. Um usuário pode ter vínculos distintos em vários clientes. A criação de um cliente exige um Admin ativo já cadastrado; a criação de um usuário envia um link de definição de senha válido por 24 horas pelo SMTP configurado (Mailpit no ambiente local).

A Central é acessível somente por **Global e Super Admin**. Global mantém todos os cadastros e pode conceder qualquer perfil, incluindo Global. Super Admin vê somente a aba Permissões e gerencia até Super Admin dentro das agências que administra; não altera identidades Global. Admin e User não acessam essa rota. As opções de usuários e clientes respeitam o escopo autorizado.

**Excluir arquiva o registro**, bloqueando o acesso e mantendo o histórico e a auditoria. A opção “Mostrar arquivados” permite restaurá-lo. Vínculos são preservados para a restauração; permissões específicas podem ser revogadas e atribuídas novamente na aba Permissões. Não é possível remover o último Global ativo nem deixar um cliente ativo sem Admin. Restaurar um cliente exige uma agência ativa e um Admin ativo. A migração `202610100002_management_center` adiciona os campos de arquivamento sem apagar dados; aplique-a com `pnpm db:migrate` ao atualizar outro ambiente.

Senha inicial de todas: **`MarketGlobal#2027`**. Agências Demo A/B; clientes Aurora, Horizonte, Atlas e Cobalto. O seed é idempotente: preserva senhas, preferências e alterações existentes, não envia e-mails e recusa execução em produção. Para restaurar **explicitamente só as senhas demo** no modo de desenvolvimento:

```sh
pnpm db:seed --reset-demo-passwords
```

No modo Docker:

```sh
docker compose run --rm migrate pnpm --filter @market/api exec tsx prisma/seed.ts --reset-demo-passwords
```

## Verificações

Com dependências instaladas, contratos compilados e cliente Prisma gerado pelo setup de desenvolvimento:

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

Preferências (`/plataforma/preferencias`) inclui foto de perfil com prévia, envio, substituição e remoção. Aceita JPG/PNG/WebP estáticos até 2 MiB e 20 megapixels. A API valida e converte para WebP quadrado de 256 px, sem metadados, limitado a 256 KiB; somente essa versão é armazenada em `UserAvatar`, separada da identidade e protegida por RLS por usuário. `GET/POST/DELETE /api/v1/preferences/avatar` exige sessão; alterações exigem CSRF. A leitura é privada, sem cache público. O avatar atualiza no menu da conta e persiste entre sessões. Migração: `202610100003_user_avatar` (`pnpm db:migrate` e `pnpm db:generate`). A CSP do proxy permite `blob:` somente em imagens para a prévia local.

O S3 é privado e usa endpoints interno/público distintos. PDF/CSV/XLSX/TXT têm limite real de 25 MiB na policy, conteúdo validado antes de disponibilidade e quota padrão de 1 GiB por tenant. Links de download expiram em 60 s. SMTP local usa Mailpit; entregas falhadas permanecem na outbox cifrada para retry ou reenvio administrativo.

Para ambiente externo, configure banco, SMTP, S3, origens, TLS/cookies e a CSP do proxy. O Compose e sua CSP são deliberadamente locais. A integração Gemini utiliza `AiService`/`AiProvider`; a conexão gerenciada usa AWS Secrets Manager e a conexão temporária é exclusiva do ambiente local. Consulte [Configurações de IA](docs/ai-settings.md) para habilitação, credenciais e seleção de modelos. O modo demonstrativo não fica disponível em produção. Não houve publicação em produção.
