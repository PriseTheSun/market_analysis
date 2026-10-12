# Spec Delta

## Purpose

Executar texto e imagem com os modelos configurados, preservando autorização e confiabilidade do Chat e tornando uso observado sem expor credenciais.

## ADDED Requirements

### Requirement: Configuração efetiva por operação

O sistema SHALL resolver origem, modelo, capacidade e versão no início de cada operação nova autorizada. A execução usa esse snapshot até terminar; ausência ou falha da configuração não permite trocar automaticamente de modelo, fonte ou modo demo.

#### Scenario: Modelo alterado durante stream
- **WHEN** o Global salva outro modelo enquanto uma resposta do Chat está em andamento
- **THEN** a operação em andamento mantém seu modelo e novas operações usam a configuração nova.

#### Scenario: Configuração ausente em produção
- **WHEN** uma geração é solicitada sem configuração válida
- **THEN** o servidor retorna indisponibilidade explícita, sem resposta demonstrativa ou seleção automática de modelo.

### Requirement: Preservação da autorização e contexto do Chat

O Chat com Gemini SHALL preservar o isolamento por tenant, usuário e conversa, enviando somente conteúdo autorizado da conversa atual dentro dos limites de contexto do modelo. Arquivos, outras conversas e dados externos não entram automaticamente no prompt.

#### Scenario: Tentativa de outra conversa
- **WHEN** um usuário solicita execução usando uma conversa que não pode acessar
- **THEN** o pedido é negado antes de registrar uso ou chamar o provedor.

#### Scenario: Conversa excede o contexto
- **WHEN** as mensagens autorizadas excedem o limite do modelo
- **THEN** o sistema aplica redução determinística e informada ou rejeita a entrada, sem enviar dados fora do limite nem incluir conteúdo de outro contexto.

### Requirement: Streaming e interrupção preservados

O sistema SHALL manter streaming, persistência de mensagens e estados de operação do Chat, interrompendo chamadas por cancelamento, desconexão, timeout ou revogação de acesso/conexão. Partes já recebidas devem manter o tratamento existente de respostas interrompidas.

#### Scenario: Cancelamento durante resposta
- **WHEN** o usuário cancela um stream em andamento
- **THEN** o servidor solicita interrupção ao provedor, encerra a operação e não trata a resposta parcial como concluída com sucesso.

#### Scenario: Perda de acesso durante stream
- **WHEN** a revalidação detecta sessão ou acesso ao tenant/conversa revogado
- **THEN** novos deltas deixam de ser entregues e a execução é interrompida.

### Requirement: Idempotência de geração e contabilização

O sistema SHALL garantir que reenvio do mesmo identificador de operação pelo proprietário não provoque nova geração nem contagem duplicada. Falhas ambíguas e reinícios não autorizam repetição automática no provedor.

#### Scenario: Replay após expiração da conexão
- **WHEN** uma operação já concluída é consultada ou reenviada pelo usuário ainda autorizado, depois de a credencial expirar
- **THEN** o sistema retorna o estado disponível sem exigir nova geração ou reservar novo consumo.

#### Scenario: Duplo clique ou crash
- **WHEN** dois pedidos do mesmo teste chegam juntos, ou a API reinicia durante uma chamada
- **THEN** existe no máximo uma geração iniciada para aquele identificador, e uma operação interrompida é reconciliada sem reexecutar a chamada.

### Requirement: Teste de imagem limitado e preview privado

O sistema SHALL permitir teste autenticado de um modelo de imagem compatível, limitado a uma imagem por operação, com tamanho validado e preview privado temporário. O preview não é um recurso público nem uma galeria persistente.

#### Scenario: Imagem retornada com sucesso
- **WHEN** um teste gera uma imagem válida
- **THEN** apenas a sessão proprietária pode recuperar o preview durante sua validade de até cinco minutos, com resposta sem cache.

#### Scenario: Resposta inválida ou preview vencido
- **WHEN** o provedor retorna conteúdo de tipo/tamanho não permitido, ou o preview vence/desaparece após reinício
- **THEN** o sistema explica a indisponibilidade sem servir conteúdo inseguro ou gerar outra imagem automaticamente.

### Requirement: Falhas do provedor com significado preservado

O sistema SHALL distinguir credencial recusada, modelo incompatível, cota excedida do provedor, timeout e conteúdo bloqueado. A listagem, o teste e a execução não devem tratar falha como sucesso vazio nem expor erro bruto do provedor.

#### Scenario: Cota excedida
- **WHEN** o Gemini retorna limite de uso
- **THEN** a aplicação informa indisponibilidade/cooldown quando conhecido, sem repetir a geração ou sugerir que trocar a chave do mesmo projeto aumenta a cota.

#### Scenario: Conteúdo bloqueado
- **WHEN** o provedor bloqueia a resposta
- **THEN** o usuário vê um estado específico, sem mensagem de sucesso vazia e sem renderização de conteúdo interno do provedor.

### Requirement: Uso medido por operação

O sistema SHALL registrar uma única contabilização por operação com modelo, funcionalidade, origem, versão e uso confirmado, incluindo raciocínio quando informado. Contagens ausentes permanecem desconhecidas e nunca viram zero fictício.

#### Scenario: Metadados cumulativos em streaming
- **WHEN** vários eventos contêm totais cumulativos de uso
- **THEN** o sistema registra o total final uma vez, sem somar novamente os mesmos tokens.

#### Scenario: Total inclui raciocínio
- **WHEN** o provedor informa tokens além de entrada e saída visível
- **THEN** o total e o detalhamento mantêm esses tokens, sem mostrar um total inferior ao informado.

#### Scenario: Falha após envio sem metadados finais
- **WHEN** o consumo real fica desconhecido após possível envio ao provedor
- **THEN** ele é identificado como desconhecido/estimado, e a reserva conservadora não é liberada como se o custo fosse zero.

### Requirement: Gerações sem cotas da aplicação

O sistema SHALL permitir execução temporária e gerenciada sem orçamento de tokens/imagens, pausa por consumo, teto de concorrência por ator ou rate limits nos endpoints de IA/Chat. Políticas e variáveis legadas SHALL NOT reativar esses bloqueios.

#### Scenario: Consumo e concorrência acima dos tetos antigos
- **WHEN** um ator ultrapassa 50.000 tokens ou dez imagens na janela, ou inicia mais de duas gerações independentes simultâneas
- **THEN** nenhuma execução é bloqueada por esses valores e o consumo continua registrado sem duplicação.

#### Scenario: Modelo sem orçamento estrito
- **WHEN** uma configuração antiga tem pausa ativa e o modelo não suporta orçamento estrito
- **THEN** a geração pode executar sem exigir desligar pausa, e políticas retornadas são inativas.

### Requirement: Entrada e saída sem cortes locais

O sistema SHALL encaminhar todo o histórico autorizado sem limites artificiais de caracteres, bytes de texto ou quantidade de mensagens. O endpoint de mensagens SHALL aceitar conteúdo além do antigo limite de JSON, e respostas SHALL permanecer completas além de 32.000 caracteres e 1 MiB de transporte. A saída solicitada SHALL usar a capacidade nativa informada pelo modelo, inclusive nos testes administrativos.

#### Scenario: Conteúdo maior que os tetos anteriores
- **WHEN** o Chat recebe texto com mais de 8.000 caracteres, histórico maior que mil mensagens ou resposta maior que 32.000 caracteres
- **THEN** a aplicação não trunca nem recusa o conteúdo por esses limiares; a capacidade nativa do provedor permanece aplicável.

### Requirement: Uso informativo e controles de integridade

O sistema SHALL acompanhar uso separadamente por origem, com limites de tokens/imagens nulos e sem orçamento de saldo. Autorização, isolamento, CSRF, credenciais efêmeras, idempotência, cancelamento, timeout e validação de imagens SHALL permanecer ativos. Operações da mesma conversa preservam sua ordenação.

#### Scenario: Troca de origem
- **WHEN** o usuário consulta o consumo ou alterna a origem
- **THEN** vê contadores separados e nenhuma origem recebe cotas da aplicação.

### Requirement: Execução validável sem credencial real

O sistema SHALL permitir testes automatizados de configuração, geração, segurança e falhas com adapters controlados, sem AWS ou Gemini reais. O modo demonstrativo continua explícito apenas em desenvolvimento/teste e não substitui uma conexão Gemini configurada que falhou.

#### Scenario: Suíte sem rede externa
- **WHEN** testes são executados sem chave e com chamadas externas bloqueadas
- **THEN** os fluxos de sucesso, expiração, quotas, autorização, cancelamento e replay podem ser validados sem simular Conectado na aplicação real.

#### Scenario: Demo local existente
- **WHEN** não existe configuração Gemini e o ambiente local tem modo demo explicitamente habilitado
- **THEN** o Chat permanece identificado como demonstração, enquanto Configurações de IA continua mostrando a conexão real como não configurada.
