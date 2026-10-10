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
