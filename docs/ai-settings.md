# Configurações de IA

A integração usa Gemini Developer API e permanece desabilitada por padrão. Nenhuma chave é necessária para iniciar a aplicação ou executar testes com adapters controlados.

## Configuração do ambiente

| Variável do backend | Padrão | Finalidade |
| --- | --- | --- |
| `APP_ENV` | `unknown` | `local`, `test`, `staging` ou `production`; ausência nunca habilita token local. |
| `AI_GEMINI_ENABLED` | `false` | Habilita a integração Gemini. |
| `AI_LOCAL_TOKEN_ENABLED` | `false` | Autoriza conexão temporária somente com `APP_ENV=local` e `NODE_ENV!=production`. |
| `AI_GEMINI_SECRET_ID` | vazio | Identificação/ARN do segredo gerenciado. |
| `AI_GEMINI_SECRET_REGION` | vazio | Região do segredo. |
| `AI_GEMINI_SECRET_KEY_FIELD` | `apiKey` | Campo string dentro do JSON `SecretString`. |
| `BIND_HOST` | loopback se local | O Compose usa a rede privada interna; publica somente o frontend em loopback. |

`pnpm setup:local` copia esses defaults do `.env.example` em instalações novas e preserva um `.env` já existente. Para habilitar testes locais, configurar explicitamente `APP_ENV=local`, `AI_GEMINI_ENABLED=true` e `AI_LOCAL_TOKEN_ENABLED=true`, reiniciar a API e usar o campo da aplicação. Não adicionar a chave Gemini a variáveis `VITE_*`, arquivos versionados ou mensagens de chat.

A API local deve ficar ligada a `127.0.0.1`, ou em rede privada de containers com publicação somente em loopback. `Host` e `X-Forwarded-For` não habilitam o recurso. `NODE_ENV=production` proíbe a conexão temporária mesmo com as flags ligadas.

## Como uma feature usará o token local

1. Entrar com uma sessão Global e abrir Configurações de IA.
2. Escolher Token temporário, inserir uma chave Gemini no campo mascarado e conectar.
3. Selecionar o modelo compatível da funcionalidade e, se desejado, testar explicitamente.
4. Salvar configuração local e abrir o Chat nessa mesma sessão.

A feature chama o backend usando a sessão normal da aplicação. O servidor resolve sua seleção e usa a chave apenas na chamada ao Gemini. O token não é recebido pelo componente da feature, nem usado no navegador para chamar o provedor. A conexão termina após sessenta minutos, logout, revogação ou reinício da API. A configuração fica indisponível até reconectar/confirmar ou selecionar outra origem explicitamente.

O campo do Chat permanece editável enquanto a conexão está indisponível. Somente novos envios aguardam a reconexão; Enter não apaga nem envia o rascunho nesse estado. O Global pode abrir Configurações de IA em outra aba, reconectar e salvar a seleção, preservando a aba do Chat. A ação Verificar conexão e a consulta automática a cada quinze segundos durante a indisponibilidade atualizam o envio sem recarregar a página. Outros perfis recebem orientação para contatar o administrador. Rascunhos ficam na memória da página e não sobrevivem ao fechamento ou recarregamento da aba.

Preferências de modelos podem ser persistidas por sessão, sem a chave; isso permite informar conexão expirada depois de reiniciar. A geração de imagens nesta entrega inclui associação de modelo e teste administrativo com preview temporário; não cria um estúdio/galeria de imagens.

## Ativação gerenciada posterior

Configurar região, identificação do segredo e campo JSON no backend. Usar a role do workload com `secretsmanager:GetSecretValue` restrito ao ARN necessário e, somente quando aplicável, `kms:Decrypt` restrito à chave KMS correspondente. Não fornecer AWS access key pelo frontend. O segredo deve ser um JSON `SecretString` contendo uma string no campo configurado, por exemplo `apiKey`, preenchido diretamente no ambiente AWS.

A credencial e o catálogo são armazenados em memória por até cinco minutos. Rotação invalida o catálogo dependente; cache vencido não permanece utilizável quando a atualização falha. O Secrets Manager fornece a credencial, enquanto o Gemini fornece a lista de modelos. A presença no catálogo não comprova disponibilidade, faixa gratuita ou cota para geração.

O acompanhamento de uso não representa saldo financeiro Google. Chaves do mesmo projeto compartilham cota. Modelos de imagem podem exigir um plano pago; consultar os [preços do Gemini](https://ai.google.dev/gemini-api/docs/pricing) antes de testes reais.

## Validação sem credenciais

Os testes usam credenciais sentinela geradas em runtime e adapters injetados, sem AWS/Gemini reais. O estado real sem credenciais é Não configurado. O Chat demonstrativo, quando explicitamente habilitado em desenvolvimento/teste, continua identificado como demonstração. Validação real de catálogo e geração depende de uma chave e não deve ser apresentada como concluída antes disso.

## Endpoints e permissões

Todos os caminhos abaixo têm prefixo `/api/v1`, exigem sessão Global atual e retornam `Cache-Control: no-store`. Escritas passam pelo middleware existente de Origin/CSRF. A API não aceita URLs, endpoints de provedor, ambiente, usuário ou duração fornecidos pelo navegador. Credenciais Gemini recusadas usam `AI_CREDENTIAL_REJECTED` (não HTTP 401, reservado à sessão da aplicação).

| Método e caminho | Contrato / efeito |
| --- | --- |
| `GET /ai/settings` | Ambiente, habilitação, configuração, versão e metadados das conexões; nunca retorna chave. |
| `PUT /ai/settings` | `scope`, `expectedVersion`, `source`, `connectionRevision`, `models: {chatText, imageGeneration}` (o campo legado `localPolicy`, somente local, é aceito mas ignorado). Modelos podem ser nulos. Conflito de versão/revisão retorna 409. |
| `GET /ai/models?source=managed\|temporary` | Catálogo compatível, revisionado e filtrado por capacidade; nenhuma geração. |
| `POST /ai/local-connection` | `{provider: "gemini", token: "<preencher somente no campo protegido>"}`. Valida catálogo antes de substituir a conexão anterior. |
| `DELETE /ai/local-connection` | Revoga a conexão e aborta operações; preferências sem segredo continuam indicando a origem expirada. |
| `POST /ai/model-tests` | `{operationId: UUID, feature: "chatText" ou "imageGeneration", source, modelId, connectionRevision}`. Resposta 202, execução assíncrona com prompt fixo. |
| `GET /ai/model-tests/:id` | Estado/uso/texto de teste e metadados de preview da própria sessão. |
| `DELETE /ai/model-tests/:id` | Solicita cancelamento; não repete a geração. |
| `GET /ai/model-tests/:id/image` | PNG autenticado em memória; no-store/nosniff, até cinco minutos, máximo vinte resultados por processo. |
| `GET /ai/usage?source=managed\|temporary` | Uso separado por origem: janela, confirmado, reservado, estimado, entrada, saída, raciocínio, imagens e cota externa nula. Origem omitida usa a configuração salva; as duas origens retornam limites nulos. |

Conectar, substituir e revogar têm efeito imediato. **Cancelar** no rodapé descarta somente os rascunhos de modelo/origem; não desfaz uma conexão ou revogação já realizada. Após substituir uma chave, confirme os modelos e salve novamente. O campo de chave é apagado ao enviar/cancelar/sair e não é colocado no React Query, localStorage ou sessionStorage.

As rotas são localizadas: `/plataforma/configuracoes-ia` (PT-BR), `/platform/ai-settings` (EN) e `/plataforma/configuracion-ia` (ES). Apenas Global vê o menu; autorização também é aplicada no backend.

## Execução de uma feature

O Chat envia a requisição normal de mensagens, com cookie de sessão e CSRF, sem token Gemini. `ChatService` verifica tenant, proprietário e conversa, monta somente o histórico autorizado e chama `AiService.chat(context, operationId, contents, signal)`. O serviço captura origem, modelo, versão, revisão da conexão por operação. Mudar a configuração afeta operações futuras. A resposta segue o SSE existente e é persistida como mensagem da conversa.

A abstração `AiProvider` normaliza texto, imagem e uso. Features futuras devem usar essa camada no backend, acrescentando sua autorização e seu contexto, sem chamar Gemini diretamente do frontend. O endpoint administrativo de teste não deve virar um endpoint público genérico de geração. Nesta entrega, imagem está disponível como configuração e teste administrativo, sem galeria ou estúdio.

Não há retry automático de geração. Reenviar o mesmo `operationId` devolve o estado anterior sem cobrar uma nova geração, inclusive após expirar a credencial. Erros de provedor são códigos seguros com `requestId`; corpos upstream e headers de autenticação nunca são encaminhados ao cliente ou auditados. O transporte aceita somente HTTPS para `generativelanguage.googleapis.com`, sem redirects, com chave no header `x-goog-api-key`.

## Uso sem limites da aplicação

- Origem temporária e AWS Secrets Manager: sem orçamento de tokens, imagens por hora, limite de gerações independentes simultâneas por ator ou rate limits nos endpoints de IA/Chat. Login e demais módulos preservam seus próprios controles.
- Entrada de Chat, JSON do endpoint de mensagens e histórico autorizado não recebem cortes locais por caracteres, bytes ou quantidade de mensagens. Respostas de texto não são truncadas em 32.000 caracteres ou 1 MiB. Testes administrativos também não cortam texto.
- A saída solicitada usa o máximo informado pelo modelo no catálogo; não há teto adicional de 256 ou 2.048 tokens. A capacidade nativa de contexto e cotas do Gemini continuam aplicáveis.
- O painel exibe “Sem limites locais”. A janela de uma hora é somente para acompanhamento, com contadores separados por origem, sem saldo, progresso, alerta em 80% ou pausa.
- confirmed soma o uso final do provedor. Campos legados reserved e estimated representam estimativas informativas de operações em andamento ou sem confirmação. Nunca bloqueiam gerações. Uso desconhecido não vira zero confirmado; metadados cumulativos substituem snapshots.
- Campos legados localPolicy são ignorados e retornados como falsos, mesmo para configurações antigas com pausa ativa. As variáveis removidas AI_LOCAL_TOKEN_LIMIT, AI_LOCAL_IMAGE_LIMIT, AI_OUTPUT_TOKEN_LIMIT e CHAT_OUTPUT_MAX_CHARS não têm efeito.
- Autorização, RLS, Origin/CSRF, TTL absoluto da credencial, idempotência, cancelamento e timeout continuam. A mesma conversa mantém uma operação ativa por vez para preservar a ordem do histórico; conversas independentes não têm esse teto por ator.
- O teste de imagem gera uma imagem 1:1 de tamanho 1K. A validação de formato, bytes/dimensões e reencodificação PNG protege o preview privado; isso não estabelece cota de gerações.

## Registro de capacidades (revisado em 11/10/2026)

O [catálogo Gemini](https://ai.google.dev/api/models) informa métodos e limites de entrada/saída; o método genérico `generateContent` não prova modalidade de imagem. O registro do código é a interseção entre esse catálogo e capacidades revisadas:

| Modelo | Feature | Parâmetros |
| --- | --- | --- |
| [`gemini-2.5-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) | Chat, raciocínio desativado | Raciocínio desligado; acesso pode ser restrito a projetos existentes. |
| [`gemini-3.5-flash-lite`](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) | Chat | Raciocínio LOW. |
| [`gemini-3.8-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) | Chat | Raciocínio LOW. |
| [`gemini-3.1-flash-image`](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image) | Imagem nativa Gemini | Imagem 1:1, 1K. |

Verificar [parâmetros/uso de geração](https://ai.google.dev/api/generate-content) e [limites de raciocínio](https://ai.google.dev/gemini-api/docs/generate-content/thinking) ao adicionar modelos. O registro não inventa disponibilidade: sem chave, a lista permanece vazia.

## Persistência, revogação e recuperação

`AiConfiguration` guarda escopo, ambiente, modelos, revisão opaca, versão e campos legados inativos de política, sem credencial. Há unicidade por ambiente gerenciado e por sessão local. Escritas usam versão otimista. Em local não se altera a configuração compartilhada, mesmo escolhendo a conexão gerenciada.

`AiOperation` guarda somente IDs, modelo, versão/revisão, estados, contadores, reservas e tempos. Prompt/resposta de teste e chave não são persistidos; texto de Chat permanece na tabela de mensagens já existente. RLS força isolamento por ator/tenant e sessão para testes. A leitura interna de uso agrega operações do próprio ator entre sessões; administração Global pode agregar o ambiente gerenciado. Contextos internos de execução/reconciliação são definidos apenas no servidor.

O token fica em memória por TTL absoluto de sessenta minutos e não é renovado por atividade. Logout, reset/revogação de sessão, inativação e perda de Global são revalidados antes do uso e durante execução; a limpeza ocorre a cada dois segundos. Reiniciar a API elimina tokens e previews; preferências indicam expiração. Não há fallback automático para outra chave ou demo. Preferências são removidas quando a sessão encerra; metadados de operações permanecem para auditoria, sem conteúdo, e só a janela corrente aparece no painel. Retenção histórica desses metadados segue a política operacional do ambiente; a entrega não apaga auditoria automaticamente.

Operações sem heartbeat há mais de trinta segundos viram `interrupted`. Antes do envio, a reserva é liberada; após envio, é preservada como estimativa até sair da janela. Nunca há regeneração automática após crash. Na implantação local, usar uma instância da API: credenciais/previews são memória do processo; múltiplas instâncias exigem afinidade de sessão ou um cofre efêmero compartilhado a ser projetado separadamente.

## IAM mínimo e ativação

Exemplo sem credenciais (substituir ARN, região e conta):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:REGIAO:CONTA:secret:NOME-SUFIXO"
  }]
}
```

Caso o segredo use uma chave KMS própria, adicionar `kms:Decrypt` apenas para o ARN dessa chave, com condição `kms:ViaService` do Secrets Manager na região. A role padrão do workload fornece a identidade; não cadastrar credenciais IAM no frontend. A leitura é lazy, cache máximo cinco minutos, e falha após TTL não reaproveita chave vencida. Consulte [GetSecretValue](https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html).

Roteiro posterior:
1. Preencher o JSON do segredo diretamente na AWS, usando o campo configurado (`apiKey` por padrão).
2. Informar `AI_GEMINI_SECRET_ID`, `AI_GEMINI_SECRET_REGION` e, se necessário, `AI_GEMINI_SECRET_KEY_FIELD` no backend; configurar a role mínima.
3. Habilitar `AI_GEMINI_ENABLED=true`; manter `AI_LOCAL_TOKEN_ENABLED=false` fora de local. Reiniciar a API.
4. Entrar como Global, escolher conexão gerenciada, conferir catálogo e selecionar modelo de texto; imagem é opcional.
5. Testar explicitamente texto e, se autorizado pelo plano/cota, imagem. Salvar e confirmar uma nova mensagem no Chat.
6. Para rollback operacional, desabilitar `AI_GEMINI_ENABLED` e reiniciar a API. Manter as migrações aditivas; não remover dados para desativar o recurso.

A validação real de credencial/cota/catálogo/imagem fica pendente até existir uma chave. Os testes automatizados não prometem acesso gratuito a modelos.
