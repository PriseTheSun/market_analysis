# Design

## Context

Ver `proposal.md` para motivação e capacidades. Em 10/10/2026, o diretório contém apenas OpenSpec e seus workflows, sem aplicação, dependências, testes, configuração de serviços ou repositório Git inicializado. O schema é `spec-driven`, sem contexto/rules adicionais e sem especificações existentes. O briefing anexado é a fonte de requisitos; a invocação atual autoriza planejamento, não implementação.

As duas imagens mostram painel visual à esquerda e formulário à direita, marca no alto do painel, seletor de idioma no alto direito e rodapé discreto. O texto do briefing prevalece nos detalhes divergentes: título de solicitação “Solicitar acesso”, azul nas ações, Montserrat e escala definida, mesmo que a referência apresente botão preto e títulos maiores.

### Assets observados e destinos planejados

Todos os caminhos de origem abaixo ficam em `/Users/erikaraujo/Downloads/`. Nenhum asset foi copiado ou alterado nesta etapa.

| Origem | Observação verificada | Destino na implementação |
| --- | --- | --- |
| `bg_login.mp4` | MP4, 7.474.740 bytes; cabeçalhos indicam 28,491 s, vídeo 1280×720 `avc1` e faixa `mp4a` | Original em `assets/source/auth/bg_login.mp4`; derivado web sem áudio em `apps/web/public/media/bg-login.mp4` |
| `referencia login.png` | Referência de composição de login fornecida | `docs/references/login.png` |
| `Referencia solicitação de cadastro.png` | Referência de composição de solicitação fornecida | `docs/references/access-request.png` |
| `main_logo.svg` | SVG vetorial 1536×1024, fundo branco explícito e marca preta, sem dependência de fonte | Original em `assets/source/brand/`; variante de apresentação em `apps/web/src/assets/brand/` |
| `logo_transicao.svg` | Mesma marca, CSS de animação com atrasos por letra e regra reduced motion | Original em `assets/source/brand/`; uso estático por padrão |

SHA-256 do vídeo de origem: `e295bf7266873b1cac28795859a99f28db4753c81e6532d8adfa3f88fd5d17bf`. A leitura foi dos metadados; reprodução, codecs efetivos nos navegadores, qualidade e contraste quadro a quadro ainda precisam ser validados. `ffprobe` não estava disponível no PATH na inspeção. O poster será extraído do próprio vídeo, sem geração de mídia externa.

## Goals / Non-Goals

**Goals:** manter fronteiras de autorização explícitas nos serviços e banco; tornar efeitos externos recuperáveis; entregar incrementos completos de interface/API/persistência; produzir execução local reproduzível e evidência verificável. Separar requisitos do briefing de premissas técnicas propostas neste desenho.

**Non-Goals:** microserviços, filas distribuídas complexas, autenticação terceirizada, RLS como substituto de políticas, armazenamento de uploads no banco, produção automaticamente provisionada e demonstrações de mercado fictícias. Exclusões funcionais estão na proposta.

## Decisions

### 1. Monorepo e versões

Usar pnpm workspaces, `apps/web`, `apps/api`, `packages/contracts`, `packages/config`, `infra`, `docs`. A API é um monólito modular com auth, users, agencies, tenants, memberships, authorization, access-requests, files/storage, chat, notifications, preferences/onboarding e audit. A organização evita distribuir transações entre serviços. Uma API apenas no frontend ou builder não atende ao contrato.

Baseline proposta, consultada em documentação oficial em 10/10/2026:

| Área | Linha proposta | Evidência e condição |
| --- | --- | --- |
| Runtime | Node.js 24 LTS, pnpm estável compatível | [Node releases](https://nodejs.org/en/about/previous-releases); fixar patches e `packageManager` na aplicação |
| Web | React 19, Vite 8, TypeScript estrito | [Vite](https://vite.dev/guide/) e [shadcn React/Tailwind](https://ui.shadcn.com/docs/tailwind-v4); validar peer dependencies no build |
| UI | Tailwind 4, shadcn/ui baseado em uma única família de primitives, Magic UI gratuita | [shadcn](https://ui.shadcn.com/docs/tailwind-v4), [Magic UI](https://magicui.design/docs/installation); incorporar apenas componentes necessários com licenças |
| API | NestJS 11, módulos ESM/NodeNext coerentes | [Nest migration guide](https://docs.nestjs.com/migration-guide), [Nest Prisma](https://docs.nestjs.com/recipes/prisma) |
| Dados | Prisma ORM 7 com adapter PostgreSQL, PostgreSQL 18 | [Prisma 7](https://www.prisma.io/docs/orm/v7), [bancos suportados](https://docs.prisma.io/docs/orm/reference/supported-databases); não selecionar Prisma 8 RC por tag móvel |
| Complementos | Zod, React Router, TanStack Query, React Hook Form, i18next/react-i18next, Sonner | Resolver versões estáveis mutuamente compatíveis e fixá-las; contratos não importam Prisma nem segredos |
| Movimento/tour/ícones | `motion` via `motion/react`, `driver.js` e CSS local, `lucide-react` | [Motion](https://motion.dev/docs/react), [Driver.js](https://driverjs.com/docs/installation), [Lucide](https://lucide.dev/guide/react) |

Não há lockfile nem teste de build nesta fase: estas são escolhas de linha, não declaração de compatibilidade executada. A primeira tarefa de aplicação fixa versões exatas estáveis, imagens por versão/digest e confirma typecheck/build/peer dependencies. Registrar em `docs/architecture.md` qualquer ajuste de patch ou de ferramenta de build, mantendo as tecnologias mandatórias. Evitar scaffolds que provisionem banco remoto por padrão.

### 2. Modelo e integridade

Identidade é única por e-mail normalizado; privilégios são separados em `User.platformRole`, `AgencyMembership` e `TenantMembership`. Um tenant pertence a uma agência; alteração de agência de tenant existente fica fora das operações iniciais para não mover dados implicitamente.

| Grupo | Entidades e invariantes |
| --- | --- |
| Identidade | `User`, `Session`, `PasswordReset`, `UserPreference`; hashes para senha/tokens, estados ativos e revogados, datas UTC |
| Hierarquia | `Agency`, `Tenant`, `AgencyMembership`, `TenantMembership`; unicidade usuário+escopo, slug de agência único e slug de tenant por agência |
| Acesso | `Invitation`, `AccessRequest`; token de uso único, papel/escopo permitidos, revisor, motivo, consumo, validade e vínculo entre convite e solicitação |
| Conteúdo | `StoredFile`, `Conversation`, `Message`, `ChatOperation`; tenant obrigatório, proprietário de conversa, identificação de operação e estados recuperáveis |
| Experiência | `Notification`, `OnboardingProgress`; destinatário, escopo, versão e unicidades de evento/usuário e usuário/tenant/versão |
| Operação | `AuditLog`, `EmailDelivery`; dados permitidos, correlation ID, estado de entrega, tentativas e próxima tentativa |

`PasswordReset`, `ChatOperation` e `EmailDelivery` são adições técnicas propostas. Relações compostas `(tenantId, id)` impedem mensagem em conversa de outro tenant; `(agencyId, tenantId)` validam escopo classificado. Índices seguem listagens por escopo, proprietário/destinatário, status e data. Índice parcial de e-mail normalizado para AccessRequest pending impede duplicidade concorrente. Convite oriundo de solicitação tem unicidade por solicitação; chaves de idempotência são compostas com ator e tenant.

Preferir desativação explícita de agência/tenant/conta, com `RESTRICT` nas relações de conteúdo. Não apagar a árvore por cascata. Tenant nasce em `provisioning` (sem acesso a conteúdo) e só passa a `active` junto de Admin responsável ativo. O Global pode atribuir uma identidade existente ou emitir convite de bootstrap para Admin; sua aceitação válida ativa vínculo e tenant atomicamente. Esse convite pode ser aceito durante provisioning, mas não em tenant/agência `disabled`. Distinguir provisioning de desativação evita impedir a chegada do primeiro responsável ou reativar um tenant suspenso por meio de convite antigo.

### 3. Políticas, RLS e concorrência

Cada serviço recebe um contexto autorizado contendo ator, ação e escopo validado. Guards resolvem sessão e contexto, e os serviços reaplicam a política para chamadas internas. Campos de autoridade são definidos no servidor; schemas de entrada são estritos. A agência é lida do tenant persistido. Listagens, buscas, contagens e caminhos de erro têm o mesmo isolamento dos detalhes.

```text
Cookie + tenant no path
        |
        v
Sessao atual --> politica (ator, acao, recurso, escopo)
                         |
                         v
                  servico autorizado
                         |
                         v
        transacao curta + contexto local RLS
                         |
                         v
                consulta/escrita + commit
                         |
                         v
          efeito externo fora da transacao
```

Usar `$transaction` interativa do Prisma 7 com configuração `set_config(..., true)` parametrizada na mesma conexão. Todas as operações de conteúdo usam exclusivamente o client da transação. Aplicar RLS com `USING` e `WITH CHECK`, ausência de contexto negada e `FORCE ROW LEVEL SECURITY` nas tabelas protegidas. Runtime é role sem ownership, superuser ou BYPASSRLS; credencial de migrations separada. Global/Super Admin selecionam um tenant por transação e não ganham bypass. A separação entre metadados administrativos e conteúdo evita depender de consultas irrestritas para descobrir contextos. Referências: [RLS PostgreSQL 18](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) e [transações Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

Conteúdo protegido inclui arquivos, conversas, mensagens, operações de chat e progresso por tenant. Notificações recebem políticas distintas para destinatário+tenant e destinatário+plataforma. AccessRequest sem escopo não herda política de conteúdo: criação pública passa exclusivamente por serviço validado, sem permissão de leitura; triagem exige Global. Classificadas passam por política de tenant/agência. Não expor acesso direto do navegador ao banco.

Para a baixa frequência de alterações administrativas, adotar um lock consultivo transacional global do grafo de acesso, usado por **todas** as operações que alteram papéis, status de conta/agência/tenant, memberships e aceitação de convite. Após lock, reler estado e verificar invariantes antes do commit. Serializar essas mutações é mais simples e seguro que locks parciais inconsistentes; consultas e chat não usam esse lock. Contar apenas Admins com conta e vínculo ativos e preservar um Global com conta ativa, inclusive ao desativar conta que administra vários tenants. Testar operações concorrentes e rollback com PostgreSQL real.

Respostas: 401 para sessão inválida, 403 para módulo/ação sem permissão, 404 indistinguível para recurso fora do escopo ou propriedade e 409 para conflitos de negócio seguros. O chat pessoal sempre filtra proprietário; consulta excepcional por Global usa endpoint, tela, motivo e auditoria separados, somente leitura nesta versão.

### 4. Sessões, convites e efeitos de e-mail

Sessão opaca com token aleatório de alta entropia e hash no banco; senha Argon2id com salt individual. Cookie HttpOnly, Secure em produção, SameSite=Lax, Path=/, sem Domain amplo. Rotacionar no login, revogar no logout e reset de senha. Toda requisição verifica status atual de usuário e vínculos. “Lembrar de mim”, presente na referência, controla persistência do cookie: premissa inicial de até 12 h sem lembrar e 30 dias com lembrar, configuráveis e sempre revogáveis no servidor.

Usar token CSRF associado à sessão/pré-sessão e validação de Origin nas mutações, inclusive login/logout; preflight/CORS restritos. Rate limits por IP e identificador normalizado conforme operação, com armazenamento compartilhado no PostgreSQL na topologia inicial e limites documentados. Validação Zod também na API; segredos e tokens não vão para storage JS do navegador.

Convite e recuperação têm token protegido, expiração configurável e consumo transacional único. Premissas iniciais: 72 h para convite, 30 min para recuperação. Conta nova define senha ao aceitar. Conta existente autentica com a identidade convidada antes de adicionar o vínculo, sem redefinir senha ou mudar outros vínculos. Recuperação mantém resposta pública neutra e invalida sessões anteriores após reset.

Aprovação/convite, evento de notificação e registro de entrega de e-mail são atômicos no banco. Um worker simples no mesmo deploy processa `EmailDelivery` com claim/lease e backoff. Tokens ficam hashed na entidade; eventual payload necessário para reenvio fica cifrado na outbox, chave externa, retenção limitada à validade e remoção após consumo/expiração. Enquanto válido, um reenvio usa o mesmo convite e payload protegido, sem precisar recuperar o token de seu hash. Nunca registrar URL/token nos logs. SMTP não oferece exatamente uma entrega: uma falha entre envio e confirmação pode repetir o mesmo e-mail, mas nunca criar outro convite. A UI distingue pendente, enviado e falha e permite reenvio idempotente. Mailpit recebe apenas mensagens de desenvolvimento; o seed não envia e-mails.

### 5. Solicitação de acesso e administração

```text
Formulario publico --> pending sem escopo
                             |
                        triagem Global
                             |
                       pending classificado
                         /             \
                  rejeicao           aprovacao atomica
                     |                 |
                  rejected      approved + convite + entrega
                                       |
                              aceitacao valida do convite
                                       |
                                 vinculo ativo
```

O estado de classificação é representado pelo escopo validado, sem adicionar status público além de pending/approved/rejected. Organização digitada nunca determina agência. Duplicados pendentes retornam a mesma confirmação e não sobrescrevem a solicitação anterior. Global escolhe tenant existente; a agência é derivada. Antes de classificar, somente Global; depois, Global, Super Admin da agência e Admin do tenant revisam. O papel sugerido é User, com alternativa Admin autorizada; o fluxo nunca concede Super Admin/Global.

Revisão usa compare-and-set do pending e lock transacional, com resposta idempotente para a mesma decisão e conflito seguro para decisão concorrente incompatível. Reclassificação só enquanto pending e por Global; notificações do escopo anterior deixam de ser acessíveis se perderem sua autorização. Sem listagem pública de tenants ou status de pedido.

Rotas propostas:

| Área | Recursos principais |
| --- | --- |
| Pública/autenticação | `/api/v1/auth/*`, `POST /api/v1/access-requests`, aceitação de convite com contexto seguro |
| Pessoal | `/api/v1/me`, `/api/v1/contexts`, `/api/v1/me/preferences`, notificações pessoais de plataforma |
| Global | `/api/v1/platform/agencies`, `.../tenants`, `.../users`, `.../access-requests`, operações explícitas de privilégios e consulta auditada |
| Agência | `/api/v1/agencies/:agencyId/tenants` e visão autorizada de membros/solicitações |
| Tenant | `/api/v1/tenants/:tenantId/{members,invitations,access-requests,files,conversations,notifications,onboarding}` |

Listagens têm busca e paginação com limites. Ações destrutivas exibem nome do recurso e escopo. Super Admin não cria/configura/desativa tenants. Admin gerencia vínculos Admin/User, não a identidade global. A conta Global mantém caminhos explícitos para promoção, desativação de identidade e acesso excepcional.

### 6. Upload e storage privado

Propor SeaweedFS em modo local simples com S3 autenticado e volume persistente, imagens estáveis fixadas. O [repositório oficial MinIO](https://github.com/minio/minio) está arquivado; a alternativa é permitida pelo briefing. O [SeaweedFS](https://github.com/seaweedfs/seaweedfs) documenta presigning, browser POST, CORS e políticas. O suporte da versão fixada será comprovado por integração, não presumido a partir do nome S3.

Fluxo: autorizar e reservar metadados em transação curta; emitir POST policy de cerca de 5 min com bucket/key exatos, tipo permitido e `content-length-range` até 26.214.400 bytes; transferir para key temporária; backend verificar HEAD e conteúdo; copiar a mesma versão verificada (VersionId ou condição ETag suportada e testada) para key final exclusiva nunca exposta em credencial de upload; confirmar integridade da cópia final, revalidar autorização e finalizar metadados/notificação em outra transação. Se não houver garantia de cópia condicional, validar os bytes na key final imutável antes de marcar available. A key é gerada no servidor sob agência/tenant/fileId, nunca aceita do cliente. A cópia final separa upload mutável de arquivo já verificado e impede sobrescrita por replay de autorização ainda válida.

O limite de 25 MiB é de bytes do arquivo; limitar também requisições no proxy com margem para multipart. Testar o limite no storage com cliente hostil. Se a versão escolhida não impuser a policy, usar passagem de upload pela API com contagem de bytes e abort imediato; manter transferência S3 privada e URLs curtas de download, registrar o modo e não habilitar transferência direta desprotegida.

Validar extensão, MIME declarado, tamanho real e assinatura/conteúdo: PDF, XLSX com estrutura ZIP limitada, CSV/TXT como texto válido. Não executar nem interpretar conteúdo ativo; a verificação não é antivírus nem análise de dados. Downloads usam disposition attachment, nome seguro, autorização renovada e presigned GET de cerca de 60 s. A URL emitida permanece utilizável até sua expiração; sua duração limita essa janela após revogação.

Estados: pending, uploading, available, failed, deleting; exclusão termina em tombstone/deleted interno. Jobs periódicos reconciliam upload abandonado, cópia órfã e exclusão falha sem transação aberta durante S3. Reservas/quota configurável evitam abuso concorrente; limites documentados, sem cobrança. CORS e hostname público da assinatura precisam funcionar no navegador; endpoint interno é usado pelos serviços. Não reescrever Host de uma URL assinada.

### 7. Chat pessoal, operação e streaming

`ChatProvider` recebe apenas contexto autorizado da conversa e idioma atual. Não há credenciais/configuração existente: entregar adapter demonstrativo determinístico e identificado em dev/test, e indisponibilidade explícita em produção. Uma integração real só será adicionada se já estiver autorizada/configurada na aplicação. Arquivos não são anexados ao contexto automaticamente.

Preferir streaming de `fetch` com eventos SSE: POST de mensagem suporta CSRF e `AbortController`; eventos têm operationId, sequência, delta, conclusão/erro seguro. Proxy desabilita buffering. O limite inicial proposto é 8.000 caracteres por envio, 32.000 de saída e 120 s por operação, configuráveis; mudanças são registradas como premissas operacionais.

Persistir a mensagem do usuário e reivindicar `ChatOperation` antes de chamar o provedor. Índice parcial impede duas operações ativas por conversa. A chave de idempotência repetida retorna estado/resultado existente, sem nova mensagem ou chamada. Retentativa explícita de operação falha cria uma tentativa associada à mesma mensagem, só após encerramento da anterior. Não repetir automaticamente chamada externa ambígua após queda de processo; marcar interrupted e oferecer ação explícita. Persistir parciais em checkpoints curtos e estado final; não manter transação durante geração.

Revalidar acesso antes do envio ao provider, entre checkpoints e a cada heartbeat de até 5 s, inclusive em stream sem novos tokens. Revogação local aborta operações registradas; heartbeat cobre outros processos. Ao cancelar, sair ou trocar tenant, abortar no cliente e no servidor, persistindo estado parcial. Retry/reload recuperam o estado durável. Não prometer cancelamento retroativo de conteúdo já enviado ao provedor.

Markdown sem HTML arbitrário, protocolos de links permitidos e tratamento seguro de links externos. Enter envia apenas fora de composição IME; Shift+Enter quebra linha. Autoscroll só perto do fim; entrada discreta de mensagem sem reanimar histórico a cada token.

### 8. Notificações, preferências e contexto

Persistir notificações no mesmo commit do evento de domínio, com unicidade evento+destinatário e parâmetros seguros para tradução no momento da leitura. Destinatários definidos: upload para seu autor autorizado; pedido sem escopo para Globals ativos; pedido classificado para revisores do escopo; aceite de convite para convidante ainda autorizado; alteração de papel para o usuário afetado se ainda tiver acesso ao escopo. Revisão de pedido não cadastra um destinatário visitante nem publica dados internos por e-mail.

Popover e listagem mostram escopo selecionado e notificações pessoais de plataforma elegíveis. Leitura e contador obedecem destinatário e autorização atual. Polling a aproximadamente 30 s, pausado com aba oculta; foco/evento local invalida consultas. Não usar WebSockets apenas para isso.

Tenant pertence à URL/estado da aba e é enviado explicitamente em cada requisição. Preferência de último tenant pode sugerir navegação, nunca autorizar. Query keys incluem userId e tenantId; trocar contexto aborta fetch/streams/upload visual, fecha diálogos, destrói tour e limpa estado transitório. Rascunhos são isolados por usuário/tenant/conversa, mantidos na troca de idioma, nunca transferidos ao tenant seguinte. Logout limpa caches pessoais.

Idioma: preferência persistida > escolha local explícita > navegador suportado > pt-BR. Tema: preferência manual persistida válida > escolha manual local válida > light; valores inválidos/system resultam em light e não acionam detecção do SO. Usar chave própria e resolver antes da primeira pintura com script compatível com CSP. A preferência remota pode atualizar o tema após sessão carregada; não reivindicar conhecimento prévio dela em dispositivo novo. O app nunca segue `prefers-color-scheme`.

Driver.js tem passos por permissões, seletores `data-tour`, instância única, teardown em cleanup/troca/logout e progresso por usuário+tenant+versão. Oferecer sem bloquear, permitir pular/reiniciar e ignorar alvos ausentes. Preferências e notificações são acessíveis ao User apesar da restrição de módulos de negócio.

### 9. Interface e sistema visual

Adotar tokens novos e componentes sem herdar outros projetos. Montserrat local, fallback Arial/sans-serif, pesos reais 400/500/600, `font-display: swap` e licença [OFL oficial](https://github.com/google/fonts/blob/main/ofl/montserrat/OFL.txt). A licença e distribuição acompanham os arquivos; nenhum pedido ao Google em runtime. Lucide como única biblioteca de controles, 16/20/24 px, stroke 1,75 e nomes acessíveis traduzidos. A marca é asset próprio.

| Token tipográfico | Desktop/mobile | Peso | Line-height | Tracking |
| --- | --- | --- | --- | --- |
| Apresentação auth | 40/32 px | 600 | 1,20 | -0,020em |
| Página | 30/26 px | 600 | 1,30 | -0,015em |
| Seção | 24/22 px | 600 | 1,35 | -0,010em |
| Subseção | 20/18 px | 600 | 1,40 | 0 |
| Card/dialog | 16/16 px | 600 | 1,50 | 0 |
| Corpo/secundário | 14/14 px | 400 | 1,60 | 0 |
| Chat | 15/15 px | 400 | 1,70 | 0 |
| Label/nav/botão | 14/14 px | 500 | 1,40 | 0 |
| Metadata | 12/12 px | 400 | 1,50 | 0 |
| Cabeçalho tabela | 12/12 px | 500 | 1,50 | 0,015em |
| Número eventual | 32/28 px | 600 | 1,20 | -0,025em |

Inputs mobile em 16 px; um h1 por página, apresentação visual sem criar segundo h1. Primária #0A5ED7, branco #FFFFFF; claro #F7F9FC/#FFFFFF/#111827; escuro #0B1120/#111827/#F8FAFC. Espaçamento múltiplo de 4, bordas discretas, contraste verificado e estados além da cor. Um único Sonner global inferior esquerdo respeita safe areas e tema.

`AuthLayout` reutilizado com painel de vídeo arredondado à esquerda em desktop, formulário em superfície sólida à direita e idioma no topo. Título promocional em HTML traduzível: “Dados que revelam. Decisões que transformam.” e descrição da referência. No mobile, priorizar formulário e reduzir/empilhar área decorativa. Camadas: vídeo cover + máscara CSS com tokens e pointer-events none + conteúdo opaco. Login, acesso, recuperação e convite usam a mesma linguagem visual.

Preservar SVGs originais; derivar versão com viewBox ajustado à marca, sem retângulo branco e cores adequadas à superfície, sem redesenhar os traços. `main_logo.svg` define a identidade mesmo quando diverge do pequeno símbolo da referência. A animação por letras de `logo_transicao.svg` conflita com o briefing; manter original disponível e adotar apresentação estática ou fade do conjunto, sem splash obrigatório nem espera de 3 s. Essa é uma premissa de integração reversível, não um novo fluxo de negócio.

Vídeo muted/loop/playsInline, sem áudio no derivado web, poster local, formulário independente do carregamento. Controlar pausa, aba oculta, autoplay bloqueado, falha, rede econômica e reduced motion (poster sem autoplay). Ajustar máscara após inspecionar quadros reais. Não gerar mídia. Termos/privacidade da imagem são opcionais e não devem virar links sem destino ou textos jurídicos inventados; inseri-los somente quando houver conteúdo fornecido.

AppShell com sidebar recolhível, drawer mobile, contexto claramente nomeado, busca/paginação e estados de loading/vazio/erro/sucesso/403/404/sessão expirada. Usuário com um tenant entra no chat; com vários passa pela seleção; sem acesso vê estado útil sem conteúdo de tenant. User vê chat/histórico e controles pessoais. Global/Super Admin/Admin veem apenas módulos autorizados. Nenhum dashboard financeiro fictício.

Motion anima blocos de rota (opacity + 6–10 px, 180–260 ms, stagger 30–50 ms limitado), não cada letra/célula/token. Magic UI pode fornecer um componente gratuito discreto de agrupamento/entrada, sem duplicar animações Motion. Reduced motion remove deslocamento e autoplay; o fluxo continua acessível com teclado, foco visível, dialogs com retorno de foco e aria-live sem excesso de anúncios.

### 10. Seed, operação e verificação

Criar duas agências de demonstração (`agencia-demo-a`, `agencia-demo-b`) e dois tenants em cada (`cliente-1`, `cliente-2`, únicos por agência). Exatamente as quatro identidades base:

| E-mail | Vínculos |
| --- | --- |
| `global@marketanalysis.com` | Global na plataforma, sem memberships artificiais |
| `superadmin@marketanalysis.com` | Super Admin em ambas as agências |
| `admin@marketanalysis.com` | Admin nos quatro tenants |
| `user@marketanalysis.com` | User nos quatro tenants |

Senha de criação: `MarketGlobal#2027`, somente hash no banco. Não incluir no bundle nem logs; README de demo pode documentá-la. Reexecutar seed mantém senha posteriormente alterada, idioma/tema e identidades existentes; reset exige comando explícito. Fixtures de testes separadas (`superadmin-a`, `admin-a1`, `user-a1`, `user-b1`, com e-mails próprios) comprovam bloqueios, sem presumir isolamento das quatro contas amplas. O provisionamento de vínculos aplica apenas a tenants marcados como demo.

Compose: web/proxy, API, PostgreSQL, SeaweedFS/S3 e Mailpit, volumes persistentes, healthchecks, rede interna, portas mínimas e containers sem root quando viável. Migration é comando/serviço separado com credencial própria. Após setup documentado e migrations, `docker compose up --build` inicia o ambiente; seed é explícito e bloqueado em produção. SMTP/IA/storage reais usam configuração externa; `.env.example` não contém segredos reais. Swagger protegido/desabilitado publicamente em produção; logs estruturados com requestId e redaction de tokens, senhas, URLs assinadas e conteúdo integral de chat. Healthcheck não expõe dados internos.

Validação em camadas: unitários de políticas/invariantes; integração contra PostgreSQL com credencial runtime e storage real; E2E Playwright dos fluxos completos e SMTP local; inspeção visual a 390/768/1440 px, três idiomas e dois temas. Testes reais cobrem RLS após erro/rollback, concorrência, troca em duas abas, consumo único de tokens, storage hostil, quedas de stream e falhas de SMTP/S3. `docs/implementation-plan.md`, `docs/architecture.md`, `docs/assumptions.md`, README e relatório de validação serão criados durante aplicação, registrando comandos executados e limitações sem confundir arquivo de teste com teste executado.

## Risks / Trade-offs

- [Escopo extenso em projeto vazio] → entregar em incrementos verticais com critérios de saída; não marcar telas isoladas como capacidade completa.
- [RLS esquecida em caminhos internos] → acesso a conteúdo somente via transação contextual, revisão de repositórios e integração com role runtime real.
- [Serialização do grafo de acesso] → aceita para poucas mutações administrativas; documentar e medir antes de granularizar locks.
- [S3 compatível com diferenças de policy/CORS] → provar transferência, bloqueio de tamanho e assinatura no navegador; fallback com contagem de bytes no backend.
- [Falha entre efeito externo e commit] → outbox, estados recuperáveis, compensação e idempotência; não prometer exactly-once SMTP/IA.
- [URL assinada válida após revogação] → TTL curto, autorização a cada emissão e nenhum objeto público; documentar janela residual.
- [Vídeo horizontal em painel alto] → revisar recorte e máscara com quadros reais; poster local preserva formulário e desempenho.
- [Marca branca/preta com canvas grande e animação por letra] → preservar origem e criar variante funcional estática com geometria intacta.
- [Provedor IA ausente] → demonstração explicitamente limitada a dev/test; produção retorna indisponível até configuração autorizada.
- [Versões e imagens ainda não instaladas] → fixar releases estáveis e validar build/Compose no início da aplicação, sem RC/beta/latest.

## Migration Plan

1. Criar estrutura, contratos e documentação operacional; fixar versões e imagens.
2. Criar banco vazio por migrations versionadas, roles e políticas; nunca aplicar migrations com a credencial runtime.
3. Rodar seed demo explícito e verificar logins/vínculos; validar isolamento antes de habilitar módulos de conteúdo.
4. Integrar os incrementos de acesso, administração, arquivos, chat e experiência, executando os testes relevantes a cada entrega.
5. Executar Compose e E2E finais, registrar evidências e configurações externas pendentes.

Não há dados legados a migrar. Reset de banco demo é comando explícito; não apagar volumes como rotina de rollback. Se houver dados persistidos, fazer backup de banco/bucket e usar migrations corretivas ou restauração documentada; não automatizar rollback destrutivo. Publicação em produção exige uma solicitação própria, fora desta mudança.

## Open Questions

Não há decisão de negócio bloqueante para implementar o escopo. Podem ser definidos depois sem mudar o contrato: provedor/modelo de IA real e suas credenciais, SMTP/domínio de produção e conteúdos/URLs institucionais de termos e privacidade. Sem essas configurações, aplicar os comportamentos explícitos documentados acima.
