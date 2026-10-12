# Design

## Context

Ver `proposal.md` para motivação e escopo. O repositório usa React/Vite, NestJS, contratos Zod compartilhados e Prisma/PostgreSQL com RLS. `chat.provider.ts` oferece apenas `demo` e `unavailable`; `chat.service.ts` instancia o provider no construtor e já controla SSE, operações idempotentes, timeout, cancelamento e revalidação de acesso. Não existe integração Gemini, cliente Secrets Manager, configuração de modelos ou interface de geração de imagens.

`SessionGuard` resolve usuário e sessão no servidor. `DatabaseService.global` revalida o perfil Global; `tenant` protege conversas e associações. Mutações usam CSRF e Origin do `SecurityService` (rate limits de outras funcionalidades permanecem); erros têm códigos seguros e `requestId`. A nova integração deve aproveitar essas garantias, sem manter transações abertas durante chamadas à AWS ou Gemini.

O usuário confirmou Gemini, ainda sem chave. Adota-se Gemini Developer API por API key, coerente com a entrada de token solicitada. Vertex AI/OAuth e gateways próprios exigiriam outro contrato de conexão. O inventário de specs duráveis está vazio; a mudança concluída `market-analysis-primeira-entrega` fornece as garantias de compatibilidade, mas não deve ser editada aqui.

## Goals / Non-Goals

**Goals:**

- Resolver origem, modelo e permissões no servidor para cada operação, com configuração imutável durante sua execução.
- Separar metadados administrativos persistentes de credenciais, e configuração do ambiente de preferências da sessão local.
- Entregar comportamento verdadeiro sem chave: configurações acessíveis, integração indisponível e testes automatizados independentes de serviços externos.
- Preservar o shell e o sistema visual atual ao reproduzir a hierarquia da referência fornecida.

**Non-Goals:**

- Criar/editar segredos AWS pela interface, receber credenciais AWS no frontend ou implementar um cofre próprio.
- Suportar outros provedores, endpoints arbitrários, Vertex AI, APIs específicas de Imagen, áudio, agentes, ferramentas, arquivos, RAG ou busca externa nesta versão.
- Construir um estúdio/galeria de imagens, armazenar previews de teste permanentemente ou expor geração anônima.
- Calcular faturas, garantir gratuidade, consultar saldo financeiro ou impor um teto monetário na conta Google. A aplicação não impõe cotas de consumo.

## Decisions

### 1. Módulo de IA e resolução por operação

Criar `apps/api/src/ai` com serviços de configuração, conexão, catálogo, execução e uso, e um adapter Gemini via REST com `fetch` do Node. Isso permite controlar redirecionamentos, cancelamento, streaming e validação de resposta sem adicionar um SDK Gemini para apenas três famílias de chamadas: catálogo, contagem e geração. Acrescentar `@aws-sdk/client-secrets-manager` seguindo o padrão AWS SDK v3 já utilizado para S3.

O adapter expõe eventos normalizados de texto, uso e término; imagem usa geração não streaming com resultado binário validado. As rotas atuais de Chat continuam sendo a entrada do usuário; elas resolvem a configuração efetiva no início de cada operação nova, em vez de compartilhar um provider mutável no processo. O serviço de imagens será reutilizável, mas a única entrada de geração de imagem nesta entrega será o teste administrativo autenticado.

Alternativa descartada: chamar o Gemini diretamente do navegador. Isso exporia credenciais gerenciadas e contornaria autorização e contabilização do backend. A CSP continua sem acesso do frontend ao domínio Gemini.

### 2. Escopos, versionamento e dados

| Dado | Persistência e acesso |
| --- | --- |
| Configuração gerenciada | Uma configuração por ambiente, com `version`, provider `gemini`, associações opcionais `chatText`/`imageGeneration`, autor e data. Escrita/leitura administrativa por Global. |
| Configuração local | Metadados por sessão Global: versão, origem, modelos, revisão da conexão (campos legados de alerta/pausa são ignorados). Não altera a configuração gerenciada. Removida no encerramento da sessão; metadados vencidos permanecem identificáveis até reconectar ou escolher outra origem explicitamente. |
| Credencial temporária | Somente memória do processo da API, indexada por sessão resolvida no servidor e identificador aleatório. TTL absoluto de 60 minutos. Nunca em tabelas, filas, cache distribuído ou backups. |
| Uso e reserva | Operação única, ambiente, ator, sessão de origem, tenant quando houver, funcionalidade, origem, modelo, versão, status, contagens e timestamps. Sem chave, prompt, resposta ou conteúdo binário. |

Os metadados locais persistidos permitem reconhecer uma escolha temporária após reinício da API: a credencial estará ausente, e a sessão exibirá conexão expirada, em vez de usar silenciosamente a chave gerenciada. O token não sobrevive ao reinício. Identificadores de conexão são referências opacas, não credenciais aceitas sem autenticação.

PUTs usam `expectedVersion`, retornando conflito quando outra gravação venceu. Associações podem ser nulas: salvar Chat configurado com imagem não configurada é válido. Não escolher automaticamente o primeiro modelo. Origem e modelos são validados juntos; catálogos de credenciais ou revisões diferentes não são intercambiáveis.

Em produção e staging, salva-se apenas configuração gerenciada. Em ambiente local, o formulário salva somente a configuração da sessão, inclusive quando ela usa a conexão gerenciada. Leituras para execução são internas e revalidam o acesso ao tenant e à conversa; não dar aos usuários do Chat acesso aos endpoints administrativos. Aplicar grants/RLS às novas tabelas, distinguindo administração Global de gravação restrita de uso vinculada à operação autorizada. Não ampliar `db.global` para usuários comuns.

### 3. Conexão gerenciada na AWS

Usar variáveis opcionais de backend: `AI_GEMINI_SECRET_ID`, `AI_GEMINI_SECRET_REGION` e `AI_GEMINI_SECRET_KEY_FIELD` (padrão `apiKey`). O segredo esperado é um `SecretString` JSON com o campo configurado contendo uma string não vazia; formatos inesperados resultam em erro seguro. Identificação/ARN e região são configuração de implantação, não campos do formulário nem resposta de API.

Obter credenciais AWS pela cadeia padrão do SDK, preferindo role do workload. IAM limita `secretsmanager:GetSecretValue` ao segredo necessário; `kms:Decrypt` somente se a chave KMS utilizada exigir. Não enumerar segredos nem exigir privilégios de escrita. Cache em memória com TTL de 5 minutos, vinculado ao `VersionId`, sem uso após vencer quando a atualização falhar; invalidar catálogo quando a versão mudar. Não registrar valor/JSON do segredo ou headers.

Ausência das variáveis mantém o processo saudável e a conexão `not_configured`. Falta de IAM, formato inválido ou serviço indisponível fica visível como estado recuperável seguro. Resolver o segredo somente quando a integração for consultada/usada, sem tornar AWS requisito de boot. Não tentar outra fonte/modelo automaticamente após erro.

Alternativa descartada: colocar a chave gerenciada no `.env` do frontend. O contrato preserva a origem AWS e permite completar a implantação depois, sem inserir segredos no repositório.

### 4. Token local, sessão e ciclo de vida

Adicionar `APP_ENV` com `local|test|staging|production` e `AI_LOCAL_TOKEN_ENABLED=false`. A conexão temporária só funciona com `APP_ENV=local`, opt-in explícito e `NODE_ENV!=production`. Staging/produção bloqueiam a rota e o recurso mesmo que a flag esteja ligada. `APP_ENV` ausente adota modo conservador sem tokens locais. Host enviado pelo cliente ou `X-Forwarded-For` não pode habilitar essa funcionalidade; documentar o serviço local ligado a loopback ou publicado somente em loopback pelo Compose.

Todas as rotas de IA exigem sessão ativa e perfil Global revalidado; mutações exigem CSRF/Origin. O token chega em body POST de tamanho limitado, nunca em URL ou header de resposta. O navegador inevitavelmente contém o texto enquanto o usuário o digita; usar input password, estado transitório e request direto que não retenha variáveis no cache de mutations. Limpar o campo ao concluir/cancelar/sair da página; não usar localStorage, sessionStorage, IndexedDB, telemetria ou replay de sessão nesse campo. Respostas administrativas usam `Cache-Control: no-store`.

Conectar/Substituir valida a nova chave com consulta ao catálogo, sem gerar conteúdo. Uma substituição que falha mantém a conexão anterior válida. Uma substituição bem-sucedida invalida a revisão anterior, aborta suas operações, exige revalidação dos modelos e passa a contar um novo TTL; não zera o consumo do usuário. Revogar remove a chave imediatamente. Logout, expiração/revogação de sessão, reset de senha, perda do perfil Global, TTL e reinício impedem novos usos e abortam operações em curso quando aplicável; usar os hooks de sessão e a revalidação periódica já existente no Chat.

Depois de expirar, a configuração que apontava ao token permanece indisponível até reconexão e confirmação, ou até salvar a origem gerenciada explicitamente. Em JavaScript não é possível prometer zeragem física imediata da memória; limitar referências, retenção e diagnósticos, sem persistir heap dumps com segredos. O modo local suporta uma instância de API; múltiplas instâncias exigiriam um desenho de cofre separado e estão fora desta versão.

### 5. Catálogo e segurança de saída

O Secrets Manager guarda a credencial; quem lista modelos é `GET /v1beta/models` do Gemini, paginado. Fixar o host HTTPS `generativelanguage.googleapis.com`, enviar a chave por `x-goog-api-key`, desabilitar redirecionamentos e impedir URLs, hosts ou headers fornecidos pelo cliente. Model IDs precisam corresponder a um item do catálogo e não podem virar caminhos arbitrários.

Cruzar o catálogo autenticado com um registro de capacidades no servidor, revisado e versionado: métodos suportados, modalidade de saída, limites de entrada/saída e parâmetros de geração. `supportedGenerationMethods` não basta para concluir que um modelo gera imagem. Só oferecer modelos com modalidade conhecida; não inferir capacidade pelo nome nem incluir modelos retirados porque constam de uma fixture antiga. Conferir modelos vigentes na documentação durante a implementação, sem escolher um default silencioso.

Cache de catálogo de 5 minutos separado por origem, revisão da credencial e sessão quando temporária; TTL nunca ultrapassa o da conexão. A UI recebe apenas IDs, rótulos, capacidades e limites públicos. Uma listagem bem-sucedida confirma a conexão, mas não garante autorização/cota para gerar com cada modelo; testes podem retornar incompatibilidade, restrição ou cota excedida. Nenhuma entrada compatível com imagem significa estado vazio específico, mantendo Chat utilizável.

Alternativa descartada: uma lista fixa apenas no frontend. Ela ficaria desatualizada, permitiria combinações inválidas e sugeriria disponibilidade não verificada.

### 6. Contratos HTTP

Todos os caminhos abaixo são relativos a `/api/v1` e protegidos por Global. O ambiente e a sessão vêm do servidor; `scope` só pode indicar o escopo permitido para esse ambiente.

| Método e rota | Entrada e resultado essenciais |
| --- | --- |
| `GET /ai/settings` | Ambiente, permissões, configuração efetiva/versão, estados seguros das conexões, origem e expiração. Não revela tokens/ARNs. |
| `PUT /ai/settings` | `expectedVersion`, `scope`, `source`, modelos opcionais e preferências locais. Valida conexão/catálogo/revisão, grava atomicamente e audita. |
| `GET /ai/models?source=managed\|temporary` | Catálogo compatível da origem autorizada, revisão e data de consulta; cache isolado. |
| `POST /ai/local-connection` | `{provider: "gemini", token}`; cria/substitui após verificação. Retorna status, revisão e `expiresAt`, nunca o token. |
| `DELETE /ai/local-connection` | Revoga a conexão da própria sessão e aborta operações; idempotente. |
| `POST /ai/model-tests` | `{operationId, feature, source, modelId, connectionRevision}`; teste explícito de um rascunho, com prompt inofensivo definido no servidor. |
| `GET /ai/model-tests/:id` | Status/resultado seguro da própria operação e preview disponível, sem nova chamada ao provedor. |
| `GET /ai/model-tests/:id/image` | Preview binário da própria sessão com TTL curto, MIME validado e no-store. Sem URL externa arbitrária. |
| `DELETE /ai/model-tests/:id` | Cancela a operação da própria sessão; aborta a chamada quando possível. |
| `GET /ai/usage` | Uso local do ator na janela atual ou agregado do ambiente gerenciado para Global, contagens reais/reservadas/estimadas e política aplicável. |

Contratos Zod compartilhados em `packages/contracts/src`, exportados pelo entrypoint existente. Estados: `not_configured`, `connected`, `expired`, `unavailable`; códigos distinguem credencial recusada, modelo incompatível, conflito de versão, cota do provedor, timeout e bloqueio de conteúdo. Usar o envelope de erros atual, com mensagens traduzidas e `requestId`, sem body/stack bruto do SDK ou upstream. Não repetir automaticamente gerações após timeout/erro ambíguo.

### 7. Execução, testes e compatibilidade do Chat

Na execução: autorizar sessão/tenant/conversa; resolver replay por `operationId`; capturar snapshot imutável de configuração/conexão/modelo; validar catálogo e registrar estimativa informativa; chamar Gemini fora da transação. Alterar o modelo durante um stream afeta somente operações novas. A chave fica no contexto privado da chamada, nunca no snapshot persistido.

Manter SSE e snapshots existentes do Chat, acrescentando tratamento interno de eventos de uso e modo `gemini` sem expor detalhes da credencial. Enviar somente mensagens autorizadas da conversa atual, sem corte local de quantidade ou tamanho; a capacidade nativa do modelo é validada pelo adapter, sem anexar arquivos ou dados de outras conversas. Interromper em desconexão, cancelamento, timeout, revogação ou perda de acesso e persistir o resultado parcial segundo o comportamento existente. Uma resposta repetida de operação concluída não exige nova geração nem nova reserva, mesmo se a conexão tiver expirado depois.

Testes administrativos retornam `202` com identificador de operação e são consultáveis/canceláveis, evitando manter requests HTTP longos no formulário. O teste de texto pede uma resposta curta; o de imagem pede uma imagem simples, sem dados de clientes, com uma imagem por operação e parâmetros de tamanho limitados pelo registro de capacidades. Streaming de pensamentos não é exibido. Conteúdo bloqueado é estado explícito, nunca sucesso vazio.

Preview de imagem fica em memória por até 5 minutos, vinculado à sessão, e é removido ao revogar/expirar. Validar bytes/MIME/dimensões e tamanho antes de servir; usar as dependências existentes de validação de arquivo/imagem. O endpoint faz novamente autorização, responde no-store/nosniff e não aceita URL de imagem do usuário. Restart pode perder o preview sem executar novamente o teste. Status e uso persistidos permitem explicar essa expiração. Operações interrompidas por crash são reconciliadas como interrompidas, sem reexecução automática.

Preservar `CHAT_PROVIDER=demo` como modo explícito de desenvolvimento/teste para ambientes sem conexão, identificado como demonstração. Configuração Gemini salva tem precedência; falha/expiração nunca volta ao demo ou outra credencial automaticamente. Produção sem configuração válida fica indisponível. Acrescentar `gemini` à seleção de provider e uma flag de rollout da integração, sem quebrar o demo local existente.

### 8. Uso informativo, sem cotas da aplicação

As origens temporária e gerenciada não recebem orçamento de tokens ou imagens, pausa, alerta de saldo, teto de concorrência por ator nem rate limits nos endpoints de IA/Chat. Políticas locais antigas continuam aceitas por compatibilidade de contrato, mas são ignoradas e retornadas como falsas. Variáveis antigas de cotas são removidas da configuração; não precisam ser alteradas para liberar instalações existentes.

Chat e testes usam o máximo de saída declarado pelo modelo, sem teto adicional de 256 ou 2.048 tokens. Mensagens não têm maxLength local; o JSON do endpoint de mensagens, o histórico autorizado e o streaming de texto não têm cortes locais de bytes, caracteres ou quantidade de mensagens. Preservar a capacidade nativa de entrada/saída do modelo, autorização, CSRF, isolamento, idempotência e serialização de operações da mesma conversa para manter a ordem do histórico. Timeout, cancelamento, TTL da credencial e validação de imagens permanecem controles do ciclo de vida e integridade, sem orçamento de consumo.

Registrar usageMetadata uma vez por operação. Entrada, saída, raciocínio e total ausentes permanecem desconhecidos. Estimativas de operações em andamento ou interrompidas são exclusivamente informativas e nunca bloqueiam novas gerações. Uma janela de uma hora serve somente à visualização, separada por origem. O painel mostra “Sem limites locais”, sem barra de orçamento, saldo ou toggles. Cota Google aparece como não informada; erros 429 originados no provedor continuam normalizados, sem retries automáticos ou promessa de gratuidade.

### 9. Interface conforme a referência

Referência: `/Users/erik/Downloads/Configurações de IA simplificadas.png`. Reutilizar fontes, espaçamento, cores, bordas, badges, ícones e controles existentes; a imagem define hierarquia e proporções, não um novo tema.

- Rota canônica `/platform/ai-settings`; PT-BR `/plataforma/configuracoes-ia`, EN `/platform/ai-settings`, ES `/plataforma/configuracion-ia`, registradas no catálogo compartilhado. Item **Configurações de IA** na seção Plataforma, depois de Solicitações de acesso; breadcrumb e título traduzidos. Disponível no contexto Global.
- Cabeçalho com título, badge do ambiente real e subtítulo; banner local apenas quando local. Origem da conexão em card horizontal com dois radio tiles, status à direita. Em ambiente gerenciado não mostrar campo nem opção temporária e explicar o alcance por ambiente.
- Desktop: coluna de modelos aproximadamente 62% e conexão/consumo 38%; cards Chat/Texto e Geração de imagens/Imagem, selects completos e botão Testar modelo alinhado à direita. Em largura pequena empilhar sem overflow horizontal, mantendo labels e ações visíveis.
- Painel temporário com Gemini (único provider suportado), password input e Conectar no estado inicial; após conectar, substituir por **Credencial configurada**, Substituir, Revogar e expiração baseada no relógio do servidor. Não oferecer recuperar/revelar token armazenado.
- Uso com total observado, entrada/saída, imagens e estimativas quando necessárias, sem saldo, progresso ou toggles de orçamento. Sem consumo ainda, mostrar zero real ou ausência de medição, nunca valores de demonstração como reais.
- Rodapé com estado de alterações, Cancelar e Salvar configuração local/Salvar configuração conforme ambiente. Salvar desabilitado se inalterado, inválido ou em envio. Cancelar descarta somente rascunhos de modelos/origem; conectar, substituir e revogar são ações imediatas com feedback próprio e não são desfeitas pelo Cancelar.
- Testar usa os modelos em rascunho e não salva; um resultado anterior perde validade ao mudar origem, modelo ou revisão da conexão. Aviso próximo ao teste de imagem: disponibilidade e cobrança dependem do plano do provedor. Nenhuma geração no load, refresh, seleção ou salvamento.
- Estados completos: loading, sem chave, conectado, expirado, sem modelo compatível, falha de catálogo, acesso/cota recusados, conflito, sucesso e erro de teste. Feedback acessível, navegação por teclado, labels ligados aos inputs e anúncio de resultados; validar desktop 1440px e mobile 390px.

## Risks / Trade-offs

- [Modelos e preços mudam] → catálogo real mais registro de capacidades versionado, nenhuma promessa de faixa gratuita, teste explícito e erro recuperável; não usar IDs descontinuados como defaults.
- [Plano gratuito tem condições próprias de dados e cota] → exemplos de teste sem dados de clientes, documentação operacional apontando termos do provedor e restrição da chave à API necessária; não enviar contexto extra automaticamente.
- [Token digitado existe transitoriamente no navegador] → input mascarado e sem persistência/telemetria; proteger contra XSS com a CSP atual e higiene de renderização. Não alegar proteção contra extensões maliciosas ou um dispositivo comprometido.
- [Cache atrasa rotação/revogação gerenciada] → TTL curto e limitado, invalidação em recusa de autenticação, nenhuma repetição automática de geração. Rotação pode exigir uma atualização explícita antes de nova tentativa.
- [Timeout ou cancelamento não prova custo zero] → reservas conservadoras, estados de uso desconhecido e ausência de replay automático no provedor.
- [API local reinicia ou usa mais de um processo] → token some, metadados indicam reconexão necessária; suporte declarado a uma instância local, sem armazenamento secreto adicional implícito.
- [Configurações globais afetam usuários] → acesso Global no backend, escopo por ambiente, versões otimistas e auditoria de metadados. Teste local nunca altera a configuração de outro usuário.

## Migration Plan

1. Adicionar contratos, migrações/grants/RLS, módulo e adapters desabilitados por padrão. Novas tabelas sem chave nem modelo preenchido automaticamente; aplicação inicializa sem AWS/Gemini.
2. Disponibilizar configuração e documentação no `.env.example`, Compose e setup local com placeholders vazios, sem valores secretos. Testes automatizados usam adapters injetados e bloqueiam rede real.
3. Implementar backend e frontend, preservar o modo demo explícito, validar isolamento/segurança, streaming e cenários visuais da referência.
4. Quando a chave existir, configurar a identificação/região/campo do segredo e role AWS no ambiente; ou habilitar a conexão temporária local e inserir a chave no campo da aplicação. Verificar catálogo, testar os modelos escolhidos e salvar explicitamente. Não solicitar tokens pelo chat nem versioná-los.
5. Habilitar a integração Gemini no ambiente desejado. Em rollback, desativar a flag da integração/retornar à versão anterior, revogar conexões temporárias e preservar tabelas aditivas de configuração/uso. Produção sem integração permanece indisponível; não voltar silenciosamente a demo ou outro modelo.

## Open Questions

- Identificação/ARN do segredo, região AWS e nome do campo JSON serão fornecidos na implantação. O contrato já suporta esses valores opcionais; não bloqueiam desenvolvimento/testes.
- IDs de modelos disponíveis e permissões/cota do projeto Google só poderão ser confirmados com uma credencial real. O fluxo trata catálogo vazio, modelo recusado e imagem indisponível sem exigir alteração de escopo.

## References

Fontes primárias consultadas em 11/10/2026; rever disponibilidade dos modelos durante a implementação:

- [Gemini: catálogo de modelos](https://ai.google.dev/api/models) — paginação, métodos e limites públicos.
- [Gemini: autenticação e API keys](https://ai.google.dev/gemini-api/docs/api-key) — uso e restrição da chave.
- [Gemini: geração e usageMetadata](https://ai.google.dev/api/generate-content) — texto/imagem, streaming e contagens.
- [Gemini: contagem de tokens](https://ai.google.dev/api/tokens) — cálculo da entrada antes de gerar.
- [Gemini: limites](https://ai.google.dev/gemini-api/docs/rate-limits) — cota vinculada ao projeto e restrições por modelo.
- [Gemini: preços](https://ai.google.dev/gemini-api/docs/pricing) — disponibilidade da faixa gratuita por modelo, inclusive imagens.
- [AWS: boas práticas do Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html) e [GetSecretValue](https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html) — acesso mínimo, cache e leitura segura.
- [OWASP: prevenção de SSRF](https://cheatsheetseries.owasp.org/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — destino permitido e bloqueio de redirecionamentos.
