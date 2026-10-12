# Validação da primeira entrega

Execução local em 10/10/2026, macOS, Node 24.16.0, pnpm 12.10.1, Docker/Compose. Somente serviços locais; nenhuma publicação ou integração de IA externa. Resultados abaixo correspondem a execuções reais, não à presença de um arquivo de teste.

## Resultado final

| Comando/verificação | Resultado |
| --- | --- |
| `pnpm typecheck`, `pnpm lint`, `pnpm format:check` | Aprovados |
| `pnpm build` e builds Docker | Aprovados; aviso de tamanho de chunk registrado abaixo |
| `pnpm test` | 11/11 |
| `pnpm test:integration` | 30/30, PostgreSQL/S3/SMTP reais pelo Compose |
| `pnpm test:e2e` + suíte administrativa adicionada | 28/28 em Chromium/WebKit, em duas execuções: 24 + 4 |
| `pnpm test:resilience` | Quatro grupos operacionais aprovados |
| Banco vazio / seed repetido / proteção de produção | Aprovados em projeto isolado |
| Scan de segredos em 13 arquivos de bundle/log | Nenhum segredo configurado encontrado |
| Manifesto SHA-256 e origem do poster | Verificados |
| `openspec validate market-analysis-primeira-entrega --strict` | Aprovado |

Logs finais: [integração](evidence/integration.txt), [E2E principal](evidence/e2e-core.txt), [E2E administrativo](evidence/e2e-administration.txt), [resiliência](evidence/resilience.txt). Estes arquivos contêm resultados de teste, sem credenciais de infraestrutura.

## Camadas verificadas

- Unitários: contratos estritos, matriz central de autorização e bloqueio do provider demo em produção.
- Integração: PostgreSQL real com role runtime, fixtures restritas, RLS sem contexto, pool após rollback, FKs compostas, invariantes concorrentes, requests/convites/reset via SMTP, arquivos reais via S3 e SSE incremental pelo Nginx.
- Resiliência: chat interrompido e retry sem duplicar pergunta; SMTP indisponível, backoff/lease e reentrega sem duplicar convite; reinício de serviços mantendo sessão/bytes/histórico; exclusão S3 falhada e limpeza posterior de reserva abandonada.
- Navegador: Chromium e WebKit; login/logout, recuperação, solicitação→triagem→aprovação→Mailpit→aceite, arquivos, chat, duas abas em tenants distintos, preferências, notificações, auditoria Global, tour mobile, vídeo e seus fallbacks.
- Matriz visual: auth em 390/768/1440 × PT/EN/ES × light/dark; chat/arquivos/membros nas mesmas combinações. Capturas em `output/playwright/visual/`; relatório em `playwright-report/`.

Os testes não removem dados preexistentes. Em reexecuções repetidas no mesmo período, `node --env-file=.env scripts/prepare-local-tests.mjs` limpa exclusivamente contadores temporários de rate limit no banco localhost; não altera limites configurados nem dados de aplicação. A proteção 429 foi validada separadamente pela API direta no projeto isolado. Fixtures de isolamento recebem identificador próprio e seus vínculos/tenants são desativados ao final. As contas demo amplas não são usadas como prova negativa de isolamento. As suítes devem rodar sequencialmente para respeitar os rate limits e impedir disputa de preferências demo.

## Ambiente limpo, separado

O segundo projeto Compose usa volumes separados e não publica portas. A imagem é a mesma construída localmente. Foi criado a partir de volumes vazios, aplicou as quatro migrations e o seed explícito, e confirmou os quatro logins, duas agências, quatro tenants, oito memberships Admin/User, dois vínculos Super Admin e nenhuma entrega de e-mail pelo seed.

```sh
docker compose -p market-analysis-validation -f compose.yaml -f infra/validation.compose.yaml up -d --wait db storage mailpit
docker compose -p market-analysis-validation -f compose.yaml -f infra/validation.compose.yaml run --rm migrate
docker compose -p market-analysis-validation -f compose.yaml -f infra/validation.compose.yaml run --rm migrate pnpm --filter @market/api exec tsx prisma/seed.ts
docker compose -p market-analysis-validation -f compose.yaml -f infra/validation.compose.yaml up -d --wait api web
docker compose -p market-analysis-validation -f compose.yaml -f infra/validation.compose.yaml exec -T api node --input-type=module < scripts/validate-clean.mjs
docker compose -p market-analysis-validation -f compose.yaml -f infra/validation.compose.yaml run --rm -T -e VALIDATION_ONLY=true migrate node --input-type=module < scripts/validate-seed.mjs
```

O teste de seed altera e restaura um hash/preferência **apenas nesse banco isolado**, comprova idempotência e recusa em produção. Para outra execução inteiramente vazia, use outro nome de projeto; não apague volumes de projetos existentes. `down` sem `-v` remove os containers de validação preservando seus volumes.

## Cobertura das dez specs

| Capacidade | Implementação principal | Evidência |
| --- | --- | --- |
| platform-foundation | Compose, migrations, seed, contracts, health, mail/outbox | Clean setup/seed, integration, build |
| tenant-authorization | policy, DatabaseService, RLS, access lock | policy.test, isolation.test, duas abas E2E |
| identity-access | auth, security, Argon2id, convites | api/isolation, recovery/access-review E2E |
| access-requests | transação pedido/classificação/revisão | isolation.test, access-review E2E, resiliência SMTP |
| administration | administration API e páginas | permissões negativas, bootstrap, último Admin/Global, matriz membros |
| file-storage | reserva, policy, verificação final, cleanup | storage/api.test, upload E2E, teste operacional |
| assistant-chat | provider, operações, SSE, audit | chat/isolation.test, flows/behavior E2E, recuperação operacional |
| persistent-notifications | EventsService e PersonalController | isolamento/revogação, leitura E2E e reload |
| preferences-onboarding | prefs, SessionProvider, Driver.js | flows E2E, matriz tema/idioma, teardown mobile |
| interface-auth-experience | AuthLayout, tokens, marca, vídeo local | matrizes visuais, behavior E2E, revisão independente |

A revisão visual independente inspecionou 12 capturas válidas. Solicitou reflow de membros/convites no mobile; a correção foi recapturada e recebeu `ship` no escopo desse item. O detector foi executado uma vez: os dois avisos restantes eram a fonte Montserrat, explicitamente exigida pelo briefing. DESIGN.md e `.impeccable/design.json` documentam os tokens finais.

## Limites das evidências

Teclado, foco, nomes acessíveis, alertas, diálogos, reduced motion, leitura semântica e contraste dos tokens foram revisados por automação/capturas. Não foi feita uma sessão manual completa com VoiceOver/NVDA nem certificação WCAG. Os testes usam Chromium e o motor WebKit do Playwright, não todos os aparelhos físicos/Safari distribuídos. O evento de aba oculta é exercitado de forma controlada no teste de vídeo.

A validação de conteúdo de arquivos não é antivírus. A policy impõe tamanho e o servidor valida o objeto final; objetos disponíveis são privados. O chat não executa RAG, OCR ou busca real. O build avisa sobre o chunk inicial acima de 500 kB minificado; as páginas são carregadas sob demanda, e isso não impede a execução local. O benchmark desta entrega não representa carga de produção.


## Ajuste de entrada direta — 10/10/2026

A tela de escolha anterior ao aplicativo foi substituída pela entrada direta no chat e por um menu de troca de cliente/agência na navegação lateral. A preferência do último cliente é local e separada por identidade, sempre validada contra os contextos autorizados retornados pela API. A rota antiga `/contexts` redireciona sem apresentar a seleção.

Validação desta alteração: 15 testes unitários aprovados; typecheck, lint e formatação aprovados. A execução E2E direcionada em `http://127.0.0.1:5173` cobriu entrada direta, memória por identidade, abas independentes, administração, recuperação, chat, upload e navegação mobile. Houve 20 aprovações em 22 casos na execução principal. O caso mobile do Chromium revelou uma sobreposição do dropdown abaixo do drawer; após a correção, o caso passou novamente nos dois projetos (Chromium e WebKit). O outro caso, Super Admin no WebKit, encontrou os dois vínculos demo de agência inativos no banco durante a execução e corretamente mostrou ausência de acesso; esses vínculos não foram reativados para satisfazer o teste. O mesmo fluxo com vínculos ativos passou anteriormente no Chromium.

Inspeção visual do menu em desktop e 390px: `output/playwright/direct-entry-switcher.png` e `output/playwright/direct-entry-switcher-mobile.png`.


## Design da listagem de agências — 10/10/2026

A rota `/platform/agencies` recebeu o design de referência: navegação e cabeçalho compactos, busca por nome ou identificador, filtro de status, oito registros por página, iniciais, badges e ações em menu. Os formulários e permissões existentes foram preservados. O endereço é localizado para `/plataforma/agencias` em português.

Validação: 24 testes unitários e 4 testes de integração de filtros/paginação aprovados; typecheck, lint, formatação e build aprovados. Conferência no Chrome em 1202 × 677, 768 × 1024 e 390 × 844 cobriu busca, combinação de filtros, estado vazio, paginação, criação/edição, gerenciamento de administradores e navegação responsiva. A montagem React foi corrigida para reutilizar a raiz durante HMR. Relatório visual completo: `design-qa.md`; evidências em `output/agencies-design/`.


## Revisão da estrutura de Agências — 10/10/2026

A nova referência reorganizou o layout de `/platform/agencies`: contexto e recolhimento no cabeçalho, breadcrumb acima do título e conta do usuário no rodapé da navegação com Preferências/Sair. A tabela ganhou maior espaçamento. A ação de saída reutiliza a lógica anterior, sem mudanças na API.

Build do frontend, TypeScript, lint e formatação aprovados. No Chrome foram conferidos menu da conta, Preferências, recolhimento da navegação, seletor de contexto e drawer mobile. Um recorte do menu em celular foi corrigido abrindo-o acima do usuário. Capturas em `output/agencies-layout/`; relatório atualizado em `design-qa.md`.


## Padronização do sistema — 10/10/2026

O shell de Agências foi promovido a padrão compartilhado das rotas autenticadas: sidebar de 215 px (80 px recolhida), logo 128 × 36 px e cabeçalho de 64 px. Breadcrumb, menu da conta, títulos, busca e estilos das tabelas também compartilham o padrão. A seta do avatar foi removida, e os links da navegação receberam tooltips com suporte a teclado. A preferência de recolhimento é local e separada por identidade.

Todas as listagens paginadas usam 12 registros, com consultas e controles sincronizados; a tabela de convites ganhou paginação local. Selects de opções não foram limitados a 12. O contexto React foi separado do módulo do shell para evitar perda de identidade durante HMR. A variante CSS de botão de contorno foi renomeada para evitar colisão com Tailwind.

Validação: build frontend/TypeScript, lint, formatação e 24 testes unitários aprovados. No navegador: comparação entre rotas, troca de contexto, ícones recolhidos, tooltips via teclado/Escape, menu da conta, Preferências e drawer mobile. Duas páginas de Agências retornaram 12 itens sem sobreposição; busca reiniciou na primeira página. Console da aba final sem erros/avisos. Seletores E2E existentes atualizados, sem reexecução da suíte completa. Evidências: `output/system-layout/`; detalhes e limites: `design-qa.md`.


## Reticências em Organizações — 10/10/2026

A coluna Ações de Organizações agora usa o mesmo componente de reticências de Agências (`RecordActions`), com Abrir/Alterar conforme status e permissões. A coluna ficou compacta e centralizada. As duas rotas compartilham aparência, nome acessível, posicionamento e interação do menu.

Build frontend/TypeScript, lint e formatação aprovados. No Chrome, verificados abertura de Atlas, formulário Alterar sem salvar, menu de organização desativada, Escape, preservação das ações de Agências e menu mobile sem corte. Evidências em `output/organizations-actions/`. Seletores E2E atualizados, sem reexecução da suíte completa nesta rodada.

## Animação da lateral — 10/10/2026

Abertura/recolhimento desktop sincronizados com Motion em 280 ms, mantendo 80/215 px e alinhamento dos ícones. Drawer mobile com entrada de 280 ms e saída de 200 ms. Build/TypeScript, lint e formatação aprovados. Verificação no Chrome cobriu medidas intermediárias da transição, inversão por acionamentos rápidos, restauração da preferência após reload, texto e logo expandidos, abertura/saída mobile e remoção do backdrop ao final. Console sem erros/avisos. Evidências em `output/sidebar-motion/` e detalhes em `design-qa.md`. Movimento reduzido revisado no código; suíte E2E completa não reexecutada para este ajuste.

## Tabelas de Contas e Solicitações — 10/10/2026

Padronizados identidade, coluna de ações e menus de reticências nas duas rotas; Solicitações passou a usar também a tabela responsiva. Build/TypeScript, lint e formatação aprovados. Conferência no Chrome desktop/mobile confirmou 12 linhas por página, menus sem corte e abertura dos formulários existentes sem salvar alterações. Console sem erros/avisos. Seletor E2E da revisão de acesso atualizado, sem reexecutar a suíte completa. Evidências em `output/accounts-requests-tables/`.

## Entrada padrão do perfil Global — 10/10/2026

`workspaceDestination` agora prioriza o perfil Global antes da organização lembrada. Global entra em `/plataforma/agencias`; os demais perfis continuam usando o último contexto autorizado, com os fallbacks existentes. Testes unitários cobrem Global com organização lembrada válida, removida ou ausente, com/sem contextos, além das regras dos demais perfis.

27 testes unitários, build/TypeScript, lint e formatação aprovados. No Chrome, `/app` abriu Administração global; a seleção explícita de Aurora funcionou; após sair de Aurora e fazer login novamente como Global, a rota final foi `/plataforma/agencias` com contexto Market Analysis. `/contexts` também levou à administração global. Evidência: `output/global-entry/after-login.jpg`. Testes E2E existentes atualizados para a nova entrada, incluindo regressão da preferência de organização para não-Global, sem reexecução da suíte completa. O console registrou mensagens de extensões do Chrome; os fluxos de navegação e login concluíram.

## Tema e idioma no cabeçalho — 10/10/2026

Adicionados toggle de tema e seletor de idioma à direita do sino no shell compartilhado. Reutilizam a persistência de preferências da conta; o switch anuncia o estado do modo escuro, oferece tooltip traduzido e fica indisponível durante o salvamento. Build/TypeScript, lint e formatação aprovados. Chrome confirmou a ordem sino → tema → idioma, alternância claro/escuro, troca PT-BR/EN, persistência de tema e idioma após reload e alternância de tema pelo teclado. Cabeçalho de 64 px sem overflow em 390 e 320 px. Preferências restauradas para claro/PT-BR e viewport padrão restaurado. Capturas em `output/header-preferences/`. A suíte E2E completa não foi reexecutada nesta rodada.

## Configurações de IA / Gemini — 11/10/2026

Módulo aplicado com migrações aditivas `202610110001`–`003` no PostgreSQL local. Inicialização real confirmada sem segredo AWS nem chave Gemini; tela vazia real conferida no navegador integrado do Codex. Nenhuma geração real foi realizada.

- `pnpm typecheck`, `pnpm lint`, `pnpm test`: aprovados; 68 testes unitários em 11 arquivos. Contratos, ambiente/produção, TTL absoluto, rotação AWS, catálogo, transporte, SSE fragmentado, cancelamento/timeout e validação de imagem estão cobertos.
- `pnpm test:integration`: 72/72 aprovados em 9 arquivos na instância local de teste. Inclui 16 casos de IA com PostgreSQL/runtime RLS reais, provider controlado e rede externa recusada: isolamento entre sessões, versão otimista, modelo futuro no Chat, histórico autorizado, replay após revogação, reserva concorrente, uso desconhecido, limites sem pausa, preview privado/expirado, revogação de sessão e recuperação de crash.
- HTTP de IA: autenticação/Global, Origin/CSRF, no-store, payload excessivo e 429 exercitados sem chamar Gemini. Produção com token local proibido validada na camada de serviço e configuração, inclusive com flags ligadas.
- `pnpm build`: aprovado. Continua o aviso preexistente de chunk principal acima de 500 kB; a página IA é carregada sob demanda em chunk separado (~16 kB sem gzip).
- `openspec validate configuracoes-ia-gemini --strict`: aprovado.

A repetição de testes de autenticação atingiu contadores normais do ambiente; a validação final usou uma API exclusiva em loopback com segredo efêmero e limites de autenticação maiores somente nesse processo. O `.env` da aplicação e seus limites não foram alterados. Testes devem rodar sequencialmente, sem build/hot reload no meio de uma execução e sem duas instâncias Playwright compartilhando `test-results`.

Evidências visuais e comparação com a referência: [design-qa.md](../design-qa.md), capturas em [docs/evidence/ai](evidence/ai/). Desktop 1616/1440px e mobile 390px, estados vazio/conectado, teclado, fonte/badges/colunas e ausência de overflow horizontal verificados. Fixtures visuais não são dados de produção. Chaves sentinela são geradas em runtime e apagadas do campo; banco/auditoria/respostas não contêm a chave.

O roteiro de ativação, IAM mínimo, registro de capacidades revisado, contratos e rollback estão em [ai-settings.md](ai-settings.md). Teste real de Secret Manager, catálogo, cota e geração aguarda as credenciais do usuário; isso não foi simulado como uma integração real concluída.

E2E final: **12/12 aprovados**, Chromium e WebKit. Comando: `BASE_URL=http://localhost:5175 pnpm test:e2e tests/e2e/ai-settings.spec.ts tests/e2e/flows.spec.ts --grep 'temporary connection|reference composition|AI route|conflicting drafts|login, scoped navigation|manual theme'`. Foram verificados fluxo de token temporário, modelos opcionais, ausência de geração ao carregar/salvar, duplo clique, conflito com preservação do rascunho, consumo com raciocínio/reservas, pausa desligada, teclado, PT/EN/ES, deep link Global, Chat persistente e navegação entre workspaces. O teste antigo de tema foi atualizado para os radios e salvamento explícito que já existem na tela de preferências; o produto não foi alterado nessa área. Os contadores transitórios usados pela validação foram limpos com o script local do projeto ao terminar.

## Teste E2E com Gemini real — 11/10/2026

Teste solicitado pelo usuário e realizado no Chrome da instância principal (`127.0.0.1:5173`), com a conexão temporária já cadastrada na sessão Global. Catálogo carregado, configuração salva e mensagem enviada no Chat do workspace demo Aurora, sem conteúdo preexistente de outras conversas. Nenhuma chave foi copiada para arquivos, evidências ou banco.

- Primeira tentativa, `models/gemini-2.5-flash`: `AI_MODEL_INCOMPATIBLE` antes de enviar a geração (`sentAt=null`). O modelo constava no catálogo; sua disponibilidade para geração não foi confirmada. O Google [restringe os modelos 2.5 a usuários anteriores](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash), explicação compatível com a falha observada, sem afirmar a causa upstream exata.
- Segunda tentativa, `models/gemini-3.5-flash-lite`: operação `0fa8b439-a6ac-41dc-9b2a-176c7966c772`, origem `temporary`, status `completed` tanto em IA quanto no Chat. Resposta real: “Teste Gemini OK — 42”. Uso confirmado: 30 tokens de entrada, 7 de saída, 37 no total.
- Resposta conferida novamente após recarregar e reabrir a conversa. Evidência: [gemini-real-chat-e2e.png](evidence/ai/gemini-real-chat-e2e.png). A primeira tentativa malsucedida permanece visível no histórico do teste.
- A pausa por limite de tokens foi desligada apenas para o envio com 3.5 e restaurada ao final, com salvamento confirmado. O modelo 3.5 permanece selecionado, mas exige desativar essa pausa para novos envios enquanto não houver suporte a orçamento estrito para ele. Limites de concorrência, tamanho e tempo permaneceram ativos.

Resultado: conexão temporária e geração de texto no Chat validadas com provedor real. Este teste não confirma gratuidade/cota futura, outros modelos, imagens ou AWS Secrets Manager. Nenhuma suíte automatizada foi reexecutada nesta rodada; não houve mudança no código de produção.

## Secrets Manager sem cotas temporárias — 11/10/2026

Por solicitação do usuário, orçamento de tokens, quantidade de imagens, duas gerações simultâneas por ator e teto temporário de saída passam a depender da origem `temporary`, não do ambiente. A conexão gerenciada usa o limite de saída do modelo no Chat e não é bloqueada por orçamento estrito. Consumo gerenciado e temporário são separados; a tela consulta a origem em rascunho e mostra “Sem cota local” na gerenciada, sem toggles/progresso de orçamento.

Verificação: typecheck, lint, build e OpenSpec estrito aprovados; 68 testes unitários; 18/18 testes de integração de IA; 4/4 E2E afetados em Chromium/WebKit. Casos novos confirmam três operações gerenciadas simultâneas e mais imagens/tokens que a cota temporária em local e produção simulada, saída do Chat até o limite do modelo, ausência de desconto cruzado e preservação das restrições temporárias. AWS/Gemini foram simulados nesses testes, sem chamadas reais. A checagem adicional na aba pessoal do Chrome não foi realizada porque outra interface de extensão bloqueava automação; os E2E em navegadores isolados concluíram. O build mantém apenas o aviso preexistente de tamanho do bundle principal.

Autorização/RLS, CSRF, proteção dos endpoints, limites de transporte/tamanho e timeouts permanecem. AWS real continua pendente de configuração. Hot reload/build reiniciam a API local e descartam, por definição, conexões temporárias mantidas em memória.

## Novo E2E com token temporário real — 11/10/2026, 17:41 BRT

Novo teste solicitado pelo usuário, no Chrome da instância principal (`127.0.0.1:5173`), usando a credencial fornecida no campo temporário e o modelo `models/gemini-3.5-flash-lite`. Reconexão aceita, catálogo carregado e configuração salva. A chave não foi incluída em arquivos, capturas ou documentação.

- Chat do workspace demo Aurora, em uma conversa nova: “Novo teste E2E do token temporário: calcule 17 × 3 e responda somente \"Gemini temporário OK — 51\".”
- Resposta real: **Gemini temporário OK — 51**. Após recarregar a página e reabrir a conversa, a resposta permaneceu salva.
- Operação `31dce7e7-45b3-420a-b384-cf95908ddd50`: origem `temporary`, modelo `models/gemini-3.5-flash-lite`, IA e Chat com status `completed`, sem código de falha. Envio confirmado às `2026-10-11T20:41:37.707Z`.
- Uso desta operação: **33 tokens de entrada + 9 de saída = 42 tokens**. A tela acumulou 79 tokens na janela, incluindo os 37 do teste anterior.
- A pausa de consumo foi desativada somente durante o teste, por incompatibilidade do modelo com orçamento estrito, e restaurada com salvamento confirmado ao final. Modelo 3.5 e conexão temporária permanecem configurados; novos envios com esse modelo exigem desligar a pausa novamente.

Evidência: [gemini-temporary-chat-retest.png](evidence/ai/gemini-temporary-chat-retest.png). Esta rodada validou a integração real pelo navegador; não alterou o código de produção nem reexecutou as suítes com providers simulados. Não houve teste de imagens ou AWS Secrets Manager.

## IA sem cotas da aplicação — 11/10/2026, 18:02 BRT

Por solicitação do usuário, ambas as origens agora executam sem cotas locais de tokens/imagens, limite de gerações independentes por ator ou rate limits nos endpoints de IA e mensagens do Chat. Removidos os tetos locais de entrada, histórico e saída de texto, inclusive o parser JSON do endpoint de mensagens e o transporte SSE. O máximo de saída solicitado vem do próprio modelo; a capacidade nativa de entrada continua validada. A configuração de proxy também libera tamanho de body especificamente nesse endpoint.

O painel mostra “Sem limites locais”, consumo e estimativas apenas informativos, sem pausa, alerta de orçamento ou saldo. Configurações antigas de pausa são ignoradas; variáveis antigas de cota não têm efeito. Autenticação, CSRF, RLS, isolamento de sessão, TTL da chave, cancelamento, timeout, ordenação da mesma conversa e validação do preview de imagem permanecem.

- **70 testes unitários aprovados**, incluindo stream maior que 1 MiB, entrada de 270 mil caracteres e variáveis legadas sem efeito.
- **22 testes de integração aprovados** (IA e Chat): histórico com 1.001 mensagens mais nova entrada, saída acima de 40 mil caracteres, consumo acima de 50 mil tokens, três gerações independentes simultâneas, doze imagens na janela e requisições além dos tetos antigos. Dados/provedor controlados nesses cenários, sem chamar Gemini.
- **10 E2E aprovados em Chromium/WebKit**: duas origens sem controles de cotas, modelo sem orçamento estrito executável, consumo separado, conflito de versão, PT/EN/ES, credencial transitória, permissões e layout desktop/mobile.
- Typecheck, lint, build e OpenSpec estrito aprovados. O build mantém apenas o aviso preexistente do bundle principal. Dependências foram restauradas conforme o lockfile após a instalação de Express, agora declarado diretamente para o parser específico do Chat.

**E2E real no Chrome (`127.0.0.1:5173`):** login Global → conectar token temporário pelo campo → catálogo real → salvar Gemini 3.5 Flash Lite → nova conversa em Aurora → enviar “E2E após remoção das cotas locais: calcule 29 + 13 e responda somente \"IA local funcionando — 42\".” → receber **“IA local funcionando — 42”** → recarregar e reabrir, confirmando persistência. Nenhum controle de pausa foi necessário.

Operação `1737099f-4359-49b6-991b-1cac124f1942`: origem `temporary`, modelo `models/gemini-3.5-flash-lite`, IA/Chat `completed`, sem falha, enviada em `2026-10-11T21:02:41.980Z`. Uso informado pelo provedor: **33 tokens de entrada + 7 de saída = 40 tokens**. A chave não foi persistida em arquivos, banco ou evidências. Conexão e seleção permaneceram disponíveis na sessão usada no teste. Este teste não valida imagens reais ou AWS Secrets Manager.

Evidências: [configuração sem cotas](evidence/ai/local-unlimited-settings.png), [resposta real persistida](evidence/ai/local-unlimited-chat-e2e.png). A captura final também contém uma mensagem adicional enviada pelo usuário durante a conferência; ela não integra o consumo de 40 tokens reportado para esta operação.

## Escrita e recuperação do Chat — 11/10/2026, 21h BRT

Problema reproduzido no Chrome da instância principal: Configurações de IA indicava **Conexão expirada**, e o textarea do Chat estava desabilitado quando o backend retornava `provider: unavailable`. O TTL de sessenta minutos da credencial temporária é independente das cotas de consumo, que permanecem removidas.

Correções:

- Escrita liberada mesmo sem conexão; novos envios e Enter aguardam a reconexão sem apagar o rascunho. Orientação PT/EN/ES, configurações em outra aba para Global, ação Verificar conexão e atualização a cada quinze segundos enquanto indisponível.
- O texto enviado é limpo antes da criação assíncrona da conversa, preservando o próximo rascunho digitado durante a espera. Uma criação cancelada não troca a conversa selecionada depois de retornar.
- Interromper resposta cancela o comportamento padrão do clique. No Chromium, a troca rápida do botão Interromper por Enviar podia submeter indevidamente o próximo rascunho; o trace confirmou uma segunda requisição de mensagem. O teste de regressão exige apenas um envio.

**8 E2E aprovados** em `tests/e2e/chat-composer.spec.ts` (Chromium e WebKit): indisponibilidade e reconexão nos perfis Global/User, digitação por teclado, Shift+Enter, bloqueio de novos envios sem conexão, preservação durante streaming/cancelamento/troca de conversa e criação lenta. Autenticação, criação, streaming demonstrativo e persistência usam a API local real; somente o estado de indisponibilidade e o atraso da criação são controlados nesses cenários. Typecheck do frontend, lint dos arquivos alterados e build aprovados; permanece o aviso preexistente do bundle principal.

**E2E Gemini real:** reconexão pelo campo temporário e confirmação de `Gemini 3.5 Flash Lite` → Chat em Aurora → digitação e envio com Enter de “E2E de escrita: calcule 23 + 19 e responda somente \"Chat funcionando — 42\".” → resposta **Chat funcionando — 42** → digitação de novo rascunho → limpeza apenas desse rascunho de teste → recarregamento e reabertura da conversa confirmando a resposta persistida e o campo editável. Sem chamadas Gemini simuladas nessa etapa e sem gravação da credencial nas evidências. A aba inicial foi fechada externamente durante a reconexão; a preservação durante a recuperação da conexão foi coberta pelos cenários automatizados sem recarregamento, e a etapa real continuou na aba disponível.

Evidências: [rascunho com conexão expirada](evidence/ai/chat-draft-expired-connection.png), [resposta Gemini e campo editável](evidence/ai/chat-composer-gemini-e2e.png).
