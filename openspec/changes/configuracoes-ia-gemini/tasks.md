# Tasks

As seções 1–9 registram entregas anteriores. A seção 10 substitui as políticas de cotas, pausa e limites de entrada/saída descritas nessas etapas; o comportamento vigente está nas specs e no design atualizados.

## 1. Contratos, módulo e configuração de implantação

- [x] 1.1 Criar contratos Zod de configurações, origens, modelos/capacidades, conexão, operações de teste, uso e erros em `packages/contracts/src`, exportando pelo entrypoint; validar com testes de payloads válidos, modelos nulos, revisão/versão inválida, campos extras e ausência de segredo nas respostas.
- [x] 1.2 Registrar o módulo de IA no NestJS e definir interfaces injetáveis de conexão, catálogo e geração com eventos normalizados; verificar typecheck e inicialização com adapters indisponíveis, sem AWS ou Gemini.
- [x] 1.3 Adicionar configuração de ambiente, rollout Gemini, segredo AWS, habilitação local e limites em `common/config.ts`, preservando defaults conservadores; testar boot sem chave, bloqueio em staging/produção mesmo com flag local e manutenção do demo apenas em desenvolvimento/teste.
- [x] 1.4 Documentar variáveis e placeholders em `.env.example`, Compose/setup local e `docs/ai-settings.md`, incluindo exposição somente em loopback, segredo JSON e futura ativação; validar configuração local sem credencial e conferir que nenhum valor secreto foi adicionado.

## 2. Persistência, autorização e versionamento

- [x] 2.1 Criar migração Prisma aditiva para configuração por ambiente, preferências por sessão e operações/uso/reservas sem tokens ou conteúdo de prompt/resposta; executar migração em banco de teste e verificar unicidade de configuração e operação.
- [x] 2.2 Implementar grants/RLS e acessos internos para administração Global, configuração da própria sessão e uso ligado ao ator/tenant autorizado, sem ampliar `db.global`; testar isolamento com a role runtime entre tenants, usuários e sessões.
- [x] 2.3 Implementar leitura/gravação atômica com versão otimista, modelos opcionais e metadados que preservam conexão expirada após reinício; testar gravações concorrentes, ausência de imagem, isolamento de escopo e impossibilidade de alterar ambiente pelo payload.
- [x] 2.4 Integrar auditoria de metadados e limpeza de preferências encerradas, preservando consumo da janela do ator; testar logout/expiração sem reset de consumo e documentar modelo de dados, retenção e acesso em `docs/architecture.md` e `docs/ai-settings.md`.

## 3. Credencial gerenciada e catálogo Gemini

- [x] 3.1 Adicionar cliente AWS Secrets Manager e leitura lazy do campo JSON configurado, com role padrão, cache de cinco minutos e versionamento; testar segredo ausente, acesso negado, formato inválido, rotação e atualização falha após TTL usando cliente controlado.
- [x] 3.2 Implementar transporte Gemini com host HTTPS fixo, chave em header, redirects bloqueados, limites de body/resposta e AbortSignal; testar destino malicioso, model ID inválido, redirect e erro upstream com segredo sem permitir vazamento em respostas/logs.
- [x] 3.3 Implementar catálogo paginado e cache por origem/revisão/sessão; validar paginação, timeout, invalidação na rotação, isolamento entre chaves e TTL limitado pela conexão temporária com testes sem rede real.
- [x] 3.4 Criar registro de capacidades de texto e imagem nativa Gemini, incluindo parâmetros e limites verificáveis, a partir da documentação vigente; registrar fontes/data e testar interseção com catálogo, modelos retirados/desconhecidos e rejeição de inferência de imagem apenas por método genérico.
- [x] 3.5 Documentar política IAM mínima, campo do segredo, cache/rotação e distinção entre catálogo e autorização/cota de geração em `docs/ai-settings.md`; conferir o exemplo de configuração e política sem usar conta AWS real.

## 4. Conexão local e endpoints de configuração

- [x] 4.1 Implementar armazenamento temporário apenas em memória, indexado pela sessão autenticada, com TTL absoluto de sessenta minutos e ativação somente após validação do catálogo; testar isolamento, tempo não renovável, substituição válida e falha que preserva a conexão anterior.
- [x] 4.2 Integrar revogação ao logout, reset/revogação de sessão, perda de perfil e TTL, com cancelamento de operações e descarte de previews; validar com relógio controlado e testes de sessão que novos usos falham e reinício não restaura token nem causa fallback.
- [x] 4.3 Expor `POST/DELETE /ai/local-connection` com validação Global/ambiente/CSRF/Origin, limites e no-store; testar chamadas diretas em produção, sessão forjada, segunda sessão do mesmo usuário, body excessivo e taxa excedida sem chamadas externas.
- [x] 4.4 Expor `GET/PUT /ai/settings` e `GET /ai/models`, validando origem/revisão/capacidade e escopo permitido; testar conflito, seleção adulterada, texto configurado sem imagem e nenhuma geração em consulta/salvamento.
- [x] 4.5 Definir mapeamento seguro de erros, mantendo falha de credencial Gemini distinta de HTTP 401 da sessão da aplicação; testar erros do upstream com token sentinela gerado em runtime e verificar ausência em banco, logs, auditoria, respostas e URLs.
- [x] 4.6 Documentar contratos HTTP, lifecycle e efeitos imediatos de conectar/substituir/revogar em `docs/ai-settings.md` e permissões em `docs/permissions.md`; validar exemplos contra os schemas compartilhados e registrar que Cancelar só descarta rascunhos.

## 5. Geração e contabilização de uso

- [x] 5.1 Implementar texto Gemini com parsing incremental do stream e normalização de conteúdo/uso/bloqueio; testar chunks fragmentados, metadados cumulativos, raciocínio, resposta bloqueada, cancelamento e timeout sem retry automático.
- [x] 5.2 Implementar geração de uma imagem por operação com parâmetros limitados e validação de MIME/bytes/dimensões; testar resposta válida, conteúdo inválido, tamanho excessivo e modelo sem modalidade de imagem.
- [x] 5.3 Implementar contagem de entrada e reserva atômica de limites por ator/ambiente/janela, incluindo saída/raciocínio/imagem com limites documentados; testar concorrência perto do teto e recusa quando não existir limite superior verificável.
- [x] 5.4 Implementar reconciliação idempotente de uso/reserva, separando confirmado, reservado e desconhecido/estimado; testar término, falha antes do envio, falha ambígua, cancelamento e crash sem liberar consumo indevidamente ou duplicar total.
- [x] 5.5 Aplicar defaults locais de 50.000 tokens/hora, aviso em 80%, pausa ativa, dez operações de imagem/hora e limites de requisição/concorrência; testar que trocar chave/sessão não zera janela e que desligar pausa mantém as demais proteções.
- [x] 5.6 Expor `GET /ai/usage` com escopo autorizado, janela/reset e cota externa desconhecida; verificar agregações com fixtures de texto/imagem e documentar em `docs/ai-settings.md` a diferença entre limite local, cota Google e cobrança.

## 6. Integração do Chat e testes administrativos

- [x] 6.1 Substituir o provider fixo do Chat por resolução por operação, preservando autorização e snapshot de configuração, sem persistir chave; ampliar `tests/integration/chat.test.ts` para comprovar novo modelo em operações futuras, isolamento de conversa e histórico limitado ao contexto autorizado.
- [x] 6.2 Integrar uso, streaming e interrupção do Gemini ao protocolo existente do Chat; validar SSE progressivo, desconexão, timeout, perda de acesso, revogação/expiração da conexão e persistência correta da resposta parcial.
- [x] 6.3 Garantir replay idempotente antes de exigir conexão para operação já concluída e preservar demo explicitamente identificado apenas onde permitido; testar duplicação simultânea, replay após expiração, produção indisponível sem configuração e falha Gemini sem fallback.
- [x] 6.4 Implementar criação `202`, consulta e cancelamento de `/ai/model-tests` com prompt fixo inofensivo, modelo em rascunho e operação única; testar sucesso, cancelamento, limites, replay e ausência de alteração da configuração salva.
- [x] 6.5 Expor preview autenticado de imagem por até cinco minutos com no-store/nosniff e memória limitada; testar acesso de outra sessão, expiração, revogação, reinício e URL manipulada sem permitir recuperação pública ou regeneração automática.
- [x] 6.6 Reconciliar operações interrompidas por reinício sem repetir chamadas externas e documentar os novos estados de Chat/teste em `docs/architecture.md`; validar recuperação com interrupção simulada, contabilização conservadora e ausência de operações presas indefinidamente.

## 7. Frontend localizado conforme a referência

- [x] 7.1 Adicionar a rota ao catálogo compartilhado, ao router e ao shell Global, com breadcrumb, item de menu e traduções PT-BR/EN/ES; executar testes de rotas verificando `/plataforma/configuracoes-ia`, troca de idioma, deep link e ocultação para não Global.
- [x] 7.2 Construir a página e estilos usando os componentes existentes, com cabeçalho, badge de ambiente, origem, dois cards de modelos e painel lateral da referência; verificar visualmente desktop 1440px e mobile 390px, sem overflow horizontal e com controles acessíveis por teclado.
- [x] 7.3 Integrar conexão temporária com input password transitório, request sem retenção de mutation variables, estados configurado/expirado e ações Substituir/Revogar; testar limpeza do token em sucesso/cancelamento/unmount e ausência em storage, query cache e logs do navegador.
- [x] 7.4 Implementar rascunhos, filtragem de modelos, versão/revisão, invalidação na mudança de origem, salvar/cancelar e estados sem chave/catálogo/credencial/cota; verificar fluxo texto sem imagem, conflito entre abas e que salvar não gera conteúdo nem altera outra sessão.
- [x] 7.5 Integrar testes explícitos, acompanhamento, cancelamento e preview privado, limpando resultados antigos ao alterar modelo/conexão; verificar por contagem de chamadas que load, seleção e salvamento não geram conteúdo, e que duplo clique não gera duas vezes.
- [x] 7.6 Construir painel de consumo, reservas/estimativas, janela/reset, alertas/toggles e estado cota não informada; testar números reais de fixtures, total com raciocínio, pausa desligada e feedback sem sugerir saldo financeiro ou gratuidade.
- [x] 7.7 Atualizar disponibilidade/erro do Chat para modo Gemini e criar E2E da nova tela com adapters controlados; registrar evidências visuais e comportamento acessível em `docs/validation.md`, comparando a composição com a imagem fornecida sem substituir dados reais por valores ilustrativos.

## 8. Validação integrada e entrega preparada sem chave

- [x] 8.1 Executar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration` e `pnpm build`, além dos E2E afetados de IA, Chat e navegação; registrar resultados e corrigir regressões com rede Gemini/AWS bloqueada durante as suítes automatizadas.
- [x] 8.2 Validar aplicação sem credenciais, local habilitado com adapter controlado e produção com token temporário proibido, incluindo fluxo completo conectar → listar → testar → salvar → Chat → expirar; registrar evidência de isolamento e ausência de segredos em `docs/validation.md`.
- [x] 8.3 Entregar roteiro de ativação posterior com segredo/região/campo/role e teste real opcional de texto/imagem, além do rollback por desativação da integração; conferir o roteiro contra as rotas entregues e declarar que validação com chave real fica pendente até sua disponibilidade, sem bloquear a entrega sem credenciais.

## 9. Conexão gerenciada sem cotas de consumo — ajuste solicitado

- [x] 9.1 Restringir orçamento de tokens, quantidade de imagens, concorrência por ator e teto temporário de saída à origem temporária; separar a contabilização por origem e testar conexão gerenciada em local/produção sem rede externa.
- [x] 9.2 Consultar consumo pela origem selecionada, mostrar gerenciada sem cota/progresso/toggles e permitir modelos sem teto estrito nessa origem; validar troca de origem e preservação das cotas temporárias no navegador.
- [x] 9.3 Atualizar documentação, validar tipos/lint/testes/build e registrar que AWS real permanece pendente de configuração.

## 10. IA sem cotas da aplicação — solicitação de 11/10/2026

- [x] 10.1 Remover cotas de tokens/imagens, bloqueio por orçamento estrito, concorrência por ator e frequência dos endpoints de IA/Chat nas duas origens; preservar autenticação, isolamento e idempotência.
- [x] 10.2 Remover tetos artificiais de mensagem, histórico, transporte de texto e saída; usar somente as capacidades nativas do modelo e preservar cancelamento, expiração e validação de conteúdo.
- [x] 10.3 Exibir consumo apenas informativo, sem pausa, alertas de orçamento ou saldo, e ignorar políticas/variáveis antigas de cotas; atualizar documentação e specs.
- [x] 10.4 Executar regressões automatizadas dos limites removidos e teste E2E real com token temporário no Chat, registrando modelo, resposta, persistência e consumo sem expor a credencial.
