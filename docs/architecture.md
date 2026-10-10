# Arquitetura

Monorepo pnpm: React/Vite em `apps/web`, monólito modular NestJS em `apps/api`, schemas Zod em `packages/contracts` e TS compartilhado em `packages/config`. O client Prisma permanece exclusivamente na API.

Versões fixadas: Node 24.16.0, pnpm 12.10.1, TypeScript 6.0.3, React 19.3.0, Vite 8.3.4, NestJS 11.2.7, Swagger 11.4.7, Prisma 7.10.0/adapter-pg, Tailwind 4.3.3. Imagens: PostgreSQL 18.6-bookworm, SeaweedFS 4.48, Mailpit 1.31.4, Nginx 1.30.5. O lockfile fixa dependências transitivas. Prisma 8 RC e tags latest não são usados.

Fontes consultadas: [Nest](https://docs.nestjs.com/recipes/prisma), [Prisma 7](https://www.prisma.io/docs/orm/v7), [Vite](https://vite.dev/guide/), [shadcn/Tailwind](https://ui.shadcn.com/docs/tailwind-v4), [pnpm allowBuilds](https://pnpm.io/blog/releases/11.0), registro npm oficial e registros oficiais de imagens. A instalação usa allowBuilds explícito para scripts nativos; telemetry de Scarf é desativada.

Hierarquia plataforma → agência → tenant. Global é papel de plataforma, Super Admin é vínculo por agência, Admin/User são vínculos por tenant. Serviços validam ator/ação/recurso/escopo, queries recebem contexto local em transação Prisma curta e RLS nega conteúdo sem tenant. Runtime não é owner/superuser/BYPASSRLS; migrations usam conexão separada. Um lock transacional serializa mudanças do grafo de acesso e protege o último Admin/Global.

Sessão opaca em cookie HttpOnly com token hashed. CSRF, Origin, rate limits e schemas estritos protegem mutações. E-mail usa outbox cifrada, claim e retry; efeitos externos nunca mantêm transação aberta. Auditoria exclui segredos e conteúdo integral de chat.

Bucket privado: upload temporário por policy curta, verificação/cópia para objeto final imutável e download com URL curta. Chat pessoal usa operação idempotente e streaming com checkpoints; provedor demonstrativo somente dev/test. Notificações persistentes usam destinatário/escopo e polling de 30 s. Tema é claro por padrão e escuro somente manual.

Detalhes completos e razões das decisões: `openspec/changes/market-analysis-primeira-entrega/design.md`. Os resultados executados estão em `docs/validation.md`.

## Fluxos e fronteiras implementadas

Pedidos públicos não têm endpoint público de listagem/status. A deduplicação pending ocorre sob lock por identidade. Classificação deriva agência do tenant existente. Aprovação bloqueia a linha e grava decisão, convite, outbox, auditoria e notificações na mesma transação; decisões incompatíveis retornam conflito.

Sessões de 12 h ou 30 dias usam Argon2id, cookie HttpOnly/SameSite e tokens armazenados como hash. Convites expiram em 72 h e reset em 30 min. A outbox usa AES-GCM para payload, lease de 60 s, claim `FOR UPDATE SKIP LOCKED`, tentativas a cada 3 s e backoff exponencial. O Message-ID é estável. Uma falha de SMTP não desfaz a decisão já persistida nem concede acesso antecipado. O payload é removido quando consumido/expirado.

A reserva S3 cria key temporária e key final aleatória. Presigned POST (5 min) impõe Content-Type, key e faixa exata de tamanho. O backend copia para a key final e verifica HEAD/bytes dessa cópia: PDF, estrutura XLSX com descompactação limitada, ou texto UTF-8. Assim, replay da policy altera somente o temporário. O cleanup de 30 s usa `cleanedAt` para não repetir indefinidamente os primeiros objetos; remove uploads expirados/deleting e só remove a key temporária de um arquivo disponível. Falhas não viram sucesso visual. O SDK tem timeouts limitados e a inicialização aguarda prontidão real do storage, além do healthcheck HTTP.

ChatOperation serializa por conversa, tem chave idempotente e índice parcial impedindo duas operações ativas. Mensagens têm `position` única por conversa, evitando ordem ambígua em timestamps iguais. SSE salva fragmentos em transações curtas, nunca durante a espera pelo provedor. Um heartbeat de 2 s revalida sessão/escopo/cancelamento; operações sem heartbeat por 30 s passam a interrupted por worker de 10 s. Retry é explícito e referencia a pergunta original. A leitura Global é endpoint separado, somente leitura, com motivo e auditoria.

Query keys incluem identidade/contexto. AbortController e cleanup encerram queries/streams/upload visual/tour ao trocar escopo. Logout preserva o observador da query de sessão, grava sessão nula e remove o restante do cache; login busca a sessão nova antes de navegar. Tenant é da URL de cada aba; idioma/tema são preferências pessoais, não permissões.

O nome público de tenant é Organização (Organization / Organización). `packages/contracts/src/routes.ts` centraliza os padrões de navegação, traduções e aliases antigos; o frontend e os links de e-mail usam esse catálogo. As URLs seguem o idioma do perfil, com preferência local/navegador antes da sessão. Links, navegação programática e a URL atual são atualizados sem traduzir IDs, query strings ou fragmentos. A troca de idioma substitui a entrada do histórico e mantém a identidade da página para preservar rascunhos; tokens de convite/recuperação são consumidos em memória e retirados da URL. Endpoints `/api/v1`, modelos, campos e regras de isolamento mantêm o contrato técnico existente.

## Operação

Nginx serve assets locais com CSP e encaminha `/api/` sem buffering, timeout de 150 s. API e web executam como usuários sem root. Os logs de erro incluem event/requestId/tipo seguro, sem corpos, cookies ou URLs assinadas. Health executa consulta ao banco. Em produção, Swagger não é registrado e demo provider não é instanciado. Configuração inválida relata nomes de variáveis, sem seus valores.

Rate limits em PostgreSQL são configuráveis em `RATE_LIMITS_JSON`. Janelas: login 20 por identidade/IP e 100 por IP em 15 min; recuperação 5/15 min; reset 10/15 min; aceite 20/15 min; pedido 10/15 min; convite 20/15 min; reenvio 10/15 min; upload 30/15 min; chat 30/min. A contagem é atômica e compartilhada por processos. CSRF e Origin também são exigidos diretamente na API, antes da autenticação das rotas de mutação.

Após login, `/app` abre diretamente o chat do último tenant usado neste navegador, por identidade, desde que ele continue na lista autorizada da API; sem preferência válida, abre o primeiro tenant disponível. `/contexts` é apenas um redirecionamento compatível. A troca de cliente/agência ocorre no menu lateral do app. Sem tenants, Global entra na administração global, Super Admin na primeira agência acessível e demais usuários veem o estado sem acesso. A preferência local não concede permissões nem altera o tenant de outras abas.
