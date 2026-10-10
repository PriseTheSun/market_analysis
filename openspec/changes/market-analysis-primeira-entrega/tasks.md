# Tasks

## 1. Estrutura, versões e documentação inicial

- [x] 1.1 Criar `apps/web`, `apps/api`, `packages/contracts`, `packages/config`, `infra` e `docs` como monorepo pnpm, preservando OpenSpec; verificar instalação dos workspaces e builds mínimos de React/Vite e NestJS.
- [x] 1.2 Fixar releases estáveis compatíveis de Node 24, pnpm, React 19, Vite 8, NestJS 11, Prisma 7/adapter-pg, PostgreSQL 18 e complementos, com ESM/NodeNext coerente na API; verificar peer dependencies, geração Prisma e typecheck/build sem RC/beta ou tags latest.
- [x] 1.3 Criar scripts de typecheck, lint, build, unitários, integração e E2E, com TypeScript estrito e configurações compartilhadas úteis; verificar que cada comando resolve os pacotes corretos e falha quando seu check falha.
- [x] 1.4 Criar contratos Zod e códigos de erro em `packages/contracts`, incluindo envelopes de erro/paginação e schemas estritos de entradas; verificar uso em web/API e ausência de imports de banco/segredos no grafo do frontend.
- [x] 1.5 Criar `docs/implementation-plan.md`, `docs/architecture.md` e `docs/assumptions.md`, distinguindo requisitos, premissas e exclusões; verificar cobertura das dez capacidades e registrar versões escolhidas, TTLs/limites e fontes oficiais.

## 2. Infraestrutura local e observabilidade básica

- [x] 2.1 Criar Dockerfiles multi-stage e Compose para web/proxy, API e PostgreSQL, com versões fixadas, volumes, healthchecks, rede interna e usuário sem root quando viável; verificar `docker compose config`, build e saúde dos serviços.
- [x] 2.2 Adicionar SeaweedFS/S3 privado com autenticação e volumes, separando endpoint interno do público; verificar upload/HEAD/download de fixture via SDK, negação anônima e preservação após reinício.
- [x] 2.3 Adicionar SMTP Mailpit e configuração externa de e-mail, storage e IA em `.env.example` sem segredos reais; verificar recebimento de mensagem de teste apenas no SMTP local e validação de variáveis inválidas.
- [x] 2.4 Separar comandos/credenciais de migrations e runtime, documentar setup e configurar proxy para API e streaming sem buffering; verificar que runtime não altera schema e que evento de stream de diagnóstico chega progressivamente pelo proxy.
- [x] 2.5 Implementar healthchecks, requestId, logs estruturados com redaction e documentação OpenAPI protegida em produção; verificar respostas/erros seguros e ausência de senha, tokens e URLs assinadas nos logs de amostra.

## 3. Modelagem, políticas e isolamento

- [x] 3.1 Criar schema/migrations das entidades do desenho, incluindo estados de tenant provisioning/active/disabled, PasswordReset, ChatOperation e EmailDelivery; verificar migrations em banco vazio, índices e datas UTC.
- [x] 3.2 Implementar unicidades de e-mail/vínculos/slugs, relações compostas de tenant/agência, índices parciais para pending/operação ativa e regras de exclusão; verificar rejeição de duplicatas, relações cruzadas e cascatas indevidas em PostgreSQL real.
- [x] 3.3 Criar roles de migrations/runtime e RLS de leitura/escrita para conteúdo, com FORCE onde definido; verificar negação sem contexto e confirmar no catálogo que runtime não é owner, superuser ou BYPASSRLS.
- [x] 3.4 Criar acesso Prisma por transação curta com contexto local validado e client restrito da transação; verificar pool após sucesso, exceção e rollback e impedir consultas de conteúdo pelo client global.
- [x] 3.5 Implementar políticas centralizadas, contexto autorizado de serviços e guards com negação padrão; verificar matriz completa Global/Super Admin/Admin/User e pessoa com papéis diferentes em dois tenants por unitários significativos.
- [x] 3.6 Implementar validação de tenant no path, agência derivada e schemas contra mass assignment; verificar adulteração de path/query/body e respostas 401/403/404/409 sem revelar recurso externo.
- [x] 3.7 Implementar lock transacional comum e invariantes do último Admin/Global em todas as mutações do grafo de acesso; verificar remoções/rebaixamentos concorrentes, desativação de conta multi-tenant e ativação de tenant sem responsável.
- [x] 3.8 Implementar criação pública de AccessRequest e acesso Global a pedidos sem escopo com políticas próprias, além de escopo/destinatário em notificações; verificar que contexto nulo não torna pedidos ou notificações publicamente legíveis.
- [x] 3.9 Criar fixtures restritas e harness de integração com role runtime real; verificar Super Admin A contra B, Admin A1 contra outros tenants, User contra membros/arquivos e relação mensagem/conversa cruzada sem usar contas demo amplas como prova negativa.

## 4. Autenticação, efeitos duráveis e seed

- [x] 4.1 Implementar senha Argon2id, normalização de e-mail e sessão opaca com hash, expiração, rotação e opção lembrar; verificar login válido/inválido, cookie e ausência de token em localStorage/bundle.
- [x] 4.2 Implementar consulta de sessão, logout e revalidação de conta/vínculos a cada operação; verificar cookie reutilizado após logout/expiração e revogação de um escopo preservando outro.
- [x] 4.3 Implementar CSRF de pré-sessão/sessão, Origin/CORS restritos e rate limits configuráveis para login, recuperação, convites, solicitações, chat e autorizações de upload; verificar chamadas forjadas e limitação pela API direta.
- [x] 4.4 Implementar serviços transacionais de auditoria/notificação e EmailDelivery com claim/lease, backoff, payload protegido e redaction; verificar rollback do evento, deduplicação e recuperação após falha SMTP sem convite duplicado.
- [x] 4.5 Implementar recuperação/redefinição com resposta neutra, token protegido de uso único e revogação de sessões; verificar entrega no Mailpit, expiração, consumo concorrente e ausência de enumeração.
- [x] 4.6 Implementar emissão/reenvio/aceitação de convites por escopo, comprovando identidade existente e preservando senha/vínculos; verificar uso único, destinatário diferente, escopo desativado e convites que tentem elevar privilégios.
- [x] 4.7 Implementar bootstrap do primeiro Admin de tenant em provisioning por convite Global; verificar ativação atômica após aceite e impossibilidade de reativar tenant disabled com convite antigo.
- [x] 4.8 Criar seed idempotente das duas agências/quatro tenants e quatro e-mails exatos com senha inicial `MarketGlobal#2027`, idioma pt-BR e light; verificar autenticação, matriz de vínculos e ausência de memberships artificiais para Global/Super Admin.
- [x] 4.9 Adicionar reset demo explícito e proteção de produção/provisionamento de tenants demo; verificar reexecução sem duplicar identidades/vínculos nem redefinir senha/preferências alteradas e sem envio de e-mail pelo seed.

## 5. Sistema visual, preferências e shell funcional

- [x] 5.1 Incorporar Montserrat oficial com licença e pesos reais e instalar Lucide local; aplicar escala tipográfica do desenho e tokens de cores/espaçamento novos; verificar estilos calculados, acentos PT/ES e nenhuma requisição runtime a CDN.
- [x] 5.2 Incorporar componentes necessários de shadcn/ui e componente gratuito discreto de Magic UI de forma coerente; verificar licenças, imports compatíveis, foco e ausência de animação duplicada com Motion.
- [x] 5.3 Configurar i18next/react-i18next por domínio e API de preferências pessoais, incluindo idioma, tema manual e fuso de apresentação; verificar precedência perfil/local/navegador, html.lang, Intl e persistência entre sessões.
- [x] 5.4 Implementar tema light/dark explícito antes da primeira pintura com CSP e chave própria, sem prefers-color-scheme; verificar SO escuro no primeiro acesso, valor system/inválido, escolha manual persistida e mudança do SO sem efeito.
- [x] 5.5 Criar um único Sonner inferior esquerdo, componentes de estados/formulários e transições Motion reduzíveis; verificar posição/safe area no mobile e teclado/foco em ambos os temas.
- [x] 5.6 Criar AuthLayout inicial e telas de login, recuperação, redefinição e convite com React Hook Form/Zod, labels/autocomplete/mostrar senha/lembrar; verificar fluxos reais contra API/Mailpit e erros recuperáveis nos três idiomas.
- [x] 5.7 Implementar React Router, TanStack Query, AppShell, sidebar/drawer, seleção de contextos e 403/404/sessão expirada; verificar entrada com zero/um/vários tenants e navegação permitida para cada papel.
- [x] 5.8 Implementar chaves de cache por usuário/tenant e limpeza de requisições/streams/diálogos/estado ao trocar contexto ou sair; verificar duas abas em tenants distintos e resposta atrasada sem exibição no contexto novo.

## 6. Solicitações públicas e revisão

- [x] 6.1 Implementar POST público de solicitação com campos mínimos, validação, rate limit e deduplicação pending; verificar requisições simultâneas, resposta neutra para conta existente e inexistência de listagem/status público.
- [x] 6.2 Criar `/solicitar-acesso` no AuthLayout com mensagem opcional, confirmação, retorno ao login e preservação de dados em erro; verificar teclado e fluxo real sem criar sessão/conta ativa/vínculo.
- [x] 6.3 Implementar API de triagem Global e classificação/reclassificação pending em tenant existente, com agência derivada; verificar que nome de organização não associa automaticamente e que Admin/Super Admin não leem fila sem escopo.
- [x] 6.4 Implementar revisão autorizada por Global/agência/tenant, sugestão User e alternativa Admin, com decisão/convite/entrega/evento atômicos; verificar aprovação concorrente, rejeição e conflito entre decisões incompatíveis.
- [x] 6.5 Criar fila administrativa paginada com busca, status, escopo, revisor/motivo e controles de entrega/reenvio; verificar visibilidade por papel e nenhuma opção para conceder Global/Super Admin.
- [x] 6.6 Executar E2E de pedido até triagem, aprovação, e-mail local e aceite para identidade nova/existente; verificar falta de acesso antes do aceite, preservação de senha/vínculos e reenvio após SMTP indisponível.

## 7. Administração de plataforma, agência e membros

- [x] 7.1 Implementar APIs e telas Global de agências e tenants com provisioning/ativação/desativação e Admin responsável; verificar operações reais, auditoria e bloqueio direto para demais papéis.
- [x] 7.2 Implementar atribuição/remoção de Super Admin, promoção Global e desativação global de conta em fluxos separados; verificar confirmação de escopo, invariantes e auditoria sem mass assignment.
- [x] 7.3 Criar área Super Admin com seus tenants e gestão de membros autorizados; verificar acesso a todos os tenants da agência e negação de agência externa e de criação/desativação de tenant.
- [x] 7.4 Implementar membros/convites do tenant com busca/paginação, troca Admin/User e desativação local; verificar preservação de identidade/vínculos externos e recusa da remoção do último Admin.
- [x] 7.5 Completar loading/vazio/erro/sucesso/falta de permissão e confirmações contextualizadas nas telas administrativas; verificar navegação de cada papel e consistência após conflito concorrente.

## 8. Arquivos e armazenamento real

- [x] 8.1 Implementar reserva de upload, key temporária no servidor, quotas/limites e policy curta com tipo/key/tamanho; verificar autorização por papel e teste hostil acima de 25 MiB na versão fixada do S3.
- [x] 8.2 Validar POST policy, CORS e endpoints público/interno pelo navegador; se o storage não impuser limite, implementar passagem pela API com contagem/abort de bytes; verificar limite real sem confiar no cliente e documentar a modalidade usada.
- [x] 8.3 Implementar finalização com HEAD, tipo/conteúdo real e cópia de versão verificada para key final imutável, ou verificação após cópia final; verificar callback falso, MIME/ZIP inválido, objeto alterado entre verificação/cópia e replay da autorização.
- [x] 8.4 Implementar listagem paginada e download com nova autorização, URL curta, attachment e nome seguro; verificar bucket privado, URL expirada, chamada de User e tentativa entre tenants.
- [x] 8.5 Implementar remoção idempotente, estados persistidos e jobs de reconciliação/limpeza de abandonados; verificar falha em cada etapa S3/banco, retomada sem falso sucesso e liberação de reservas.
- [x] 8.6 Criar UI de seleção por botão/dropzone, progresso real, cancelamento/repetição e estados da listagem; verificar upload/download de PDF/CSV/XLSX/TXT no Compose e persistência após reload.
- [x] 8.7 Integrar eventos de upload à auditoria/notificações e cancelamento visual na troca de tenant; verificar destinatário, ausência de broadcast e nenhuma afirmação de análise automática do arquivo pelo chat.

## 9. Chat pessoal e integração de IA

- [x] 9.1 Implementar criação/listagem/abertura de conversas e mensagens por tenant/proprietário; verificar persistência após reload e negação de conversa alheia para Admin/Super Admin/Global no fluxo pessoal.
- [x] 9.2 Implementar ChatProvider e adapter demonstrativo determinístico restrito a dev/test, com estado indisponível em produção sem configuração; verificar indicação visível e ausência de chaves/chamadas externas no frontend.
- [x] 9.3 Implementar ChatOperation, chave idempotente, exclusão de operações simultâneas e tentativas ligadas à mensagem original; verificar duplo envio, retry de transporte e retomada após queda sem nova chamada silenciosa.
- [x] 9.4 Implementar streaming via fetch/SSE, checkpoints curtos, limites de tempo/tamanho e recuperação de interrupted; verificar chegada incremental pelo proxy e persistência de conclusão/erro/parcial sem transações longas.
- [x] 9.5 Implementar cancelamento do provedor, disconnect e revalidação periódica de até 5 s, inclusive sem tokens; verificar revogação em outro processo, saída/troca de tenant e ausência de conteúdo atrasado em outro contexto.
- [x] 9.6 Criar histórico/composer com Enter/Shift+Enter/IME, retry/cancelar, Markdown seguro, autoscroll condicionado e rascunhos isolados; verificar links/HTML hostis, leitura do histórico e troca de idioma sem perder rascunho.
- [x] 9.7 Criar consulta administrativa Global somente leitura de conversas alheias em tela/endpoint separado com motivo/auditoria; verificar autorização por tenant e ausência desses dados no histórico pessoal.
- [x] 9.8 Documentar configuração do provider real e, se uma integração autorizada/configurada estiver disponível, implementar seu adapter; verificar fluxo real ou registrar explicitamente que somente o modo demo foi entregue, sem alegar RAG/mercado/fontes inexistentes.

## 10. Notificações e tour

- [x] 10.1 Implementar APIs de notificações/contador/marcar uma ou todas, por destinatário e contexto atual, incluindo plataforma; verificar persistência, acesso cruzado e perda posterior de permissão.
- [x] 10.2 Ligar eventos de solicitação, convite e papel aos destinatários definidos no desenho e revisar os eventos de arquivo; verificar deduplicação transacional, escopo nulo só Global e parâmetros seguros traduzíveis.
- [x] 10.3 Criar sininho, popover, listagem e polling de aproximadamente 30 s com pausa em aba oculta e atualização ao foco/eventos; verificar contador entre dispositivos, troca de idioma e limpeza de cache ao trocar tenant.
- [x] 10.4 Implementar progresso de tour por usuário/tenant/versão e reinício nas preferências; verificar que conclusão/dispensa não se propaga a outro tenant ou versão.
- [x] 10.5 Integrar Driver.js e CSS local com passos traduzidos por papel e seletores data-tour; verificar User sem passos de membros/arquivos e administradores com apenas módulos autorizados.
- [x] 10.6 Implementar teardown robusto do tour e tratamento de alvos ausentes; verificar Strict Mode, logout, troca de tenant, teclado/foco, mobile, dois temas e reduced motion sem overlays órfãos.

## 11. Assets de autenticação e acabamento responsivo

- [x] 11.1 Copiar os cinco assets fornecidos para os caminhos estáveis do desenho, preservando originais e origem/checksum; verificar arquivos presentes e registrar referência, vídeo, SVGs e destinos em documentação.
- [x] 11.2 Inspecionar/reproduzir o MP4 e extrair poster local de quadro real, preparando derivado web sem áudio e compatível; verificar duração/dimensões/codecs e reprodução nos navegadores alvo sem geração externa.
- [x] 11.3 Preparar variantes de marca com canvas ajustado e contraste por superfície, preservando geometria e mantendo a transição estática/fade conjunto; verificar legibilidade e ausência de animação por letra ou splash bloqueante.
- [x] 11.4 Aplicar composição desktop das referências ao AuthLayout com vídeo cover, máscara independente e textos HTML traduzidos, título Solicitar acesso e ações azuis; verificar contraste em quadros reais claros/escuros e controles opacos/interativos.
- [x] 11.5 Implementar controle de pausa/reprodução, pausa de aba oculta, reduced motion, economia de dados e fallback de falha/autoplay bloqueado; verificar que os formulários funcionam em todos esses estados antes de o vídeo carregar.
- [x] 11.6 Refinar layout a 390/768/1440 px com três idiomas e dois temas, inputs mobile, rodapé sem links sem destino e Motion discreto; verificar ausência de overflow/cortes e posição inferior esquerda do Sonner.

## 12. Aceite integrado e documentação final

- [x] 12.1 Executar suíte de isolamento PostgreSQL real com role runtime, concorrência, pool após rollback e fixtures restritas; registrar comandos/resultados e corrigir falhas antes de declarar a capacidade pronta.
- [x] 12.2 Executar E2E de autenticação/recuperação, pedido/revisão/convite, administração, troca em duas abas, arquivos, chat, notificações e revogação no Compose; registrar evidência de persistência e autorizações diretas.
- [x] 12.3 Revisar teclado, leitor de tela, foco, aria-live, contraste, reduced motion e matriz visual das telas críticas, incluindo todos os estados do vídeo; registrar capturas/evidências e limitações reais.
- [x] 12.4 Executar typecheck, lint, build e testes críticos apropriados, inspecionando também bundle/rede por segredos/CDN; registrar o que foi efetivamente executado e impedimentos concretos.
- [x] 12.5 Validar setup documentado em ambiente local limpo sem apagar dados existentes, depois reiniciar serviços preservando volumes; verificar `docker compose up --build`, migrations separadas, seed explícito e logins dos quatro papéis.
- [x] 12.6 Finalizar README e docs de arquitetura, permissões, premissas e validação com comandos exatos, credenciais demo, fixtures restritas, SMTP/S3/IA, assets/poster/máscara e limitações; verificar que os passos reproduzem os fluxos comprovados.
- [x] 12.7 Conferir cada requisito das dez specs contra implementação/evidência e registrar pendências sem marcar falso concluído; verificar que nenhuma publicação em produção ou integração externa não autorizada foi realizada.

Evidências finais e limites: `docs/validation.md` e `docs/evidence/`. Entrega local com provider demonstrativo explicitamente identificado; nenhum deploy de produção.
