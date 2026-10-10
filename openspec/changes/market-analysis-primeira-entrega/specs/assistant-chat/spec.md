# Spec Delta

## Purpose

Oferecer conversas pessoais persistentes com assistente, respostas honestas sobre integração e operações seguras de envio, streaming e cancelamento.

## ADDED Requirements

### Requirement: Histórico pessoal persistente por tenant
Todo papel com acesso ao tenant SHALL poder criar, listar e abrir suas próprias conversas e mensagens. Histórico SHALL persistir após reload e novo login, com separação por tenant/proprietário; privilégios administrativos SHALL não ampliar a listagem pessoal.

#### Scenario: Retomada de conversa
- **WHEN** a pessoa cria conversa, troca mensagens e recarrega a aplicação
- **THEN** encontra o histórico e os estados persistidos no mesmo tenant, sem mensagens de outras pessoas ou contextos

#### Scenario: Identificador de outra pessoa
- **WHEN** usuário autorizado no tenant tenta enviar ou abrir conversa de outro proprietário
- **THEN** a API nega a operação sem revelar conteúdo ou chamar o provedor

### Requirement: Provedor explícito e contexto limitado
Chamadas de IA SHALL ocorrer somente no backend, por integração desacoplada e com contexto autorizado da conversa atual. Sem provedor configurado, desenvolvimento/testes SHALL exibir “Modo demonstrativo — IA não conectada” com respostas determinísticas; produção SHALL retornar indisponibilidade explícita. O sistema SHALL NOT alegar acesso a arquivos, dados de mercado ou fontes não integradas.

#### Scenario: Ambiente local sem IA
- **WHEN** o usuário abre chat no ambiente de desenvolvimento sem provedor
- **THEN** a UI identifica continuamente o modo demonstrativo e respostas não se apresentam como análise real

#### Scenario: Produção sem IA
- **WHEN** uma mensagem é enviada em produção sem integração configurada
- **THEN** o sistema retorna indisponibilidade clara, sem simulação silenciosa

#### Scenario: Provedor real configurado
- **WHEN** a integração autorizada recebe uma operação
- **THEN** recebe somente contexto permitido e preferência do idioma atual, sem segredos no cliente ou históricos de outros tenants

### Requirement: Operações idempotentes e tentativas controladas
Envios SHALL carregar identificação de operação, persistir a mensagem do usuário e impedir duplicidade sob retry de transporte. A mesma conversa SHALL não produzir respostas simultâneas acidentais. Tentativa explícita após erro SHALL manter vínculo com a mensagem original e garantir que a tentativa anterior terminou antes de iniciar outra.

#### Scenario: Duplo envio com mesma chave
- **WHEN** duas requisições usam a mesma chave de operação no mesmo contexto
- **THEN** uma única mensagem e uma única execução efetiva são criadas e ambas observam o estado correspondente

#### Scenario: Reconexão depois de falha ambígua
- **WHEN** o processo perde a conexão durante geração sem confirmar conclusão
- **THEN** o estado persistido indica interrupção/erro e não inicia silenciosamente outra chamada possivelmente duplicada

### Requirement: Streaming cancelável com estado durável
Quando o provedor suportar, o sistema SHALL apresentar resposta progressiva com limites de tempo/tamanho e estados de envio, resposta, conclusão, erro e cancelamento. Parciais e estado final SHALL persistir. Sair, trocar tenant, cancelar ou perder autorização SHALL interromper streams e impedir conteúdo no contexto seguinte.

#### Scenario: Cancelamento de resposta
- **WHEN** o usuário cancela durante streaming
- **THEN** a geração é interrompida quando suportado, o estado parcial fica identificado e nenhum novo envio simultâneo é disparado automaticamente

#### Scenario: Revogação durante silêncio do provedor
- **WHEN** a autorização é revogada enquanto a conexão aguarda tokens
- **THEN** o sistema detecta a revogação por revalidação periódica e encerra o stream sem depender da próxima mensagem do provedor

### Requirement: Composer e leitura acessíveis
O composer SHALL enviar com Enter fora de composição IME, inserir nova linha com Shift+Enter e oferecer botão acessível. Conteúdo SHALL usar Markdown seguro sem HTML arbitrário ou links executáveis. Autoscroll SHALL preservar leitura de mensagens antigas; idioma SHALL poder mudar sem apagar rascunho ou sessão.

#### Scenario: Composição e quebra de linha
- **WHEN** Enter é usado durante composição IME ou Shift+Enter é pressionado
- **THEN** não há envio acidental e o comportamento de composição/quebra é preservado

#### Scenario: Leitura e conteúdo hostil
- **WHEN** chega conteúdo com HTML/link inseguro enquanto o usuário lê mensagens antigas
- **THEN** nada é executado, o link perigoso é neutralizado e a posição de leitura não salta para o fim
