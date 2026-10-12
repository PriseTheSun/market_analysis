# Spec Delta

## Purpose

Disponibilizar conexões Gemini gerenciadas e temporárias com proteção de credenciais, isolamento de sessão e um catálogo confiável de capacidades para configuração e execução de IA.

## ADDED Requirements

### Requirement: Credencial gerenciada exclusivamente no backend

O sistema SHALL resolver a chave Gemini a partir de um segredo AWS configurado no servidor, usando permissões mínimas de leitura. O frontend recebe somente estados e metadados permitidos, nunca chave, conteúdo do segredo ou credenciais AWS.

#### Scenario: Segredo configurado
- **WHEN** região, identificação do segredo, campo JSON e permissões AWS estão válidos
- **THEN** o backend obtém a credencial para a integração Gemini, sem enviar seu valor ou identificação interna ao navegador.

#### Scenario: Segredo ausente ou inacessível
- **WHEN** o segredo não foi configurado, seu formato é inválido ou a leitura é negada
- **THEN** a aplicação continua inicializando e a integração apresenta estado seguro específico, sem fallback para outra credencial.

### Requirement: Rotação e cache limitados

O sistema SHALL limitar a retenção em cache de credenciais gerenciadas e catálogos a cinco minutos, invalidar metadados dependentes quando a versão da credencial mudar e impedir uso de cache vencido se a atualização falhar.

#### Scenario: Rotação gerenciada
- **WHEN** uma nova versão do segredo é detectada na próxima atualização
- **THEN** novas consultas e execuções usam a nova versão após validação, e o catálogo anterior não é reutilizado como verificado para ela.

#### Scenario: Atualização falha após o TTL
- **WHEN** o cache venceu e a AWS não pode ser consultada
- **THEN** novas chamadas ficam indisponíveis em vez de usar indefinidamente a credencial antiga.

### Requirement: Token temporário exige ambiente local explícito

O sistema SHALL aceitar tokens temporários somente com implantação local declarada, opt-in do servidor, processo fora de produção e sessão Global ativa. A restrição deve valer na API independentemente da visibilidade do campo no frontend.

#### Scenario: Tentativa em produção ou staging
- **WHEN** alguém chama a rota temporária em produção ou staging, mesmo com a flag local ligada
- **THEN** o servidor rejeita a operação sem consultar o Gemini ou reter o token.

#### Scenario: Tentativa de forjar ambiente
- **WHEN** a requisição manipula Host, IP encaminhado, ambiente ou sessão no payload
- **THEN** esses valores não habilitam o recurso nem alteram a sessão proprietária resolvida no servidor.

### Requirement: Entrada transitória e ausência de recuperação do token

O sistema SHALL receber o token em campo mascarado e body de requisição protegido, mantê-lo somente em memória no backend e nunca devolvê-lo. O navegador não deve persistir o campo em storage, cache de dados, telemetria ou histórico de URL.

#### Scenario: Conexão criada
- **WHEN** uma chave válida é enviada
- **THEN** o campo é limpo e substituído por Credencial configurada, status e expiração, sem ação para recuperar a chave armazenada.
- **AND** consultas posteriores retornam metadados seguros e respostas sem cache.

#### Scenario: Inspeção de persistência e diagnósticos
- **WHEN** conexão, erro e revogação são exercitados com um token identificável de teste
- **THEN** esse token não aparece no banco, arquivos, logs, auditoria, traces, URLs, respostas ou armazenamentos persistentes do navegador.

### Requirement: Isolamento e validade da conexão temporária

O sistema SHALL vincular cada token à sessão Global autenticada, com validade absoluta de sessenta minutos. Uso por outra sessão é proibido; atividade não renova a validade e reinício do backend não restaura a credencial.

#### Scenario: Duas sessões do mesmo usuário
- **WHEN** uma segunda sessão consulta ou tenta usar a conexão criada pela primeira
- **THEN** não consegue acessar nem executar com o token da primeira, mesmo conhecendo seu identificador.

#### Scenario: Expiração durante atividade
- **WHEN** sessenta minutos transcorreram desde a ativação, mesmo com requisições recentes
- **THEN** a conexão expira, novas operações são recusadas e operações em andamento são interrompidas sem fallback.

#### Scenario: Reinício da API
- **WHEN** a API reinicia após uma configuração temporária ter sido salva
- **THEN** a chave não é restaurada e os metadados permitem informar reconexão necessária sem trocar silenciosamente de origem.

### Requirement: Revogação e substituição seguras

O sistema SHALL invalidar a conexão temporária ao revogar, encerrar ou invalidar a sessão, perder privilégio Global ou substituir a chave com sucesso. A invalidação deve impedir novos usos e interromper execuções vinculadas à revisão anterior.

#### Scenario: Logout ou reset de senha
- **WHEN** a sessão é encerrada ou revogada, inclusive por reset de senha
- **THEN** sua credencial deixa de ser utilizável e seus previews temporários são descartados.

#### Scenario: Nova chave inválida
- **WHEN** a validação de uma substituição falha
- **THEN** a chave proposta é descartada e a conexão anterior permanece válida pelo tempo que ainda lhe restar.

#### Scenario: Substituição válida
- **WHEN** a nova chave é validada e ativada
- **THEN** a revisão anterior é invalidada, modelos precisam ser revalidados e o consumo já registrado continua contando na janela do ator.

### Requirement: Destino externo fixo e entrada restrita

O sistema SHALL enviar credenciais Gemini apenas ao endpoint HTTPS permitido do provedor, sem aceitar URL/baseURL, headers ou caminhos arbitrários fornecidos pelo frontend. Redirecionamentos não podem encaminhar a chave a outro destino.

#### Scenario: Tentativa de endpoint arbitrário
- **WHEN** um payload inclui host alternativo, URL interna ou model ID com caminho fora do catálogo
- **THEN** ele é rejeitado antes da requisição externa.

#### Scenario: Redirecionamento upstream
- **WHEN** uma resposta do provedor tenta redirecionar a chamada
- **THEN** o backend não segue o redirecionamento com a credencial e retorna falha segura.

### Requirement: Catálogo real com modalidade verificada

O sistema SHALL listar modelos a partir do Gemini autenticado, processar paginação e filtrar por capacidades de saída verificadas. A origem do segredo não é um catálogo de modelos e suporte a um método genérico não comprova geração de imagem.

#### Scenario: Modelo listado sem modalidade conhecida
- **WHEN** um modelo retorna no catálogo mas sua capacidade de saída não é verificada
- **THEN** ele não é oferecido como opção compatível até existir informação confiável sobre a modalidade.

#### Scenario: Lista com múltiplas páginas
- **WHEN** o Gemini retorna paginação
- **THEN** o catálogo combina as páginas respeitando limites operacionais, sem tratar apenas a primeira como lista completa.

#### Scenario: Autorização de geração diferente da listagem
- **WHEN** a listagem funciona e uma geração é recusada por permissão ou cota
- **THEN** o sistema distingue a conexão verificada da indisponibilidade daquela geração, sem afirmar que todo modelo listado é gratuito ou utilizável.

### Requirement: Cache isolado por conexão

O sistema SHALL isolar catálogos por origem e revisão da credencial e, para tokens temporários, por sessão. O catálogo temporário nunca deve permanecer válido além da própria conexão.

#### Scenario: Troca de chave ou origem
- **WHEN** o Global conecta outra chave ou seleciona outra origem
- **THEN** o sistema consulta/valida o catálogo correspondente e não aceita seleções baseadas apenas na revisão anterior.

### Requirement: Proteção contra abuso e vazamento em erros

O sistema SHALL autorizar conexões e consultas de catálogo sem rate limit da aplicação, validar o formato de credenciais e metadados e normalizar falhas sem expor body ou headers do provedor. A auditoria registra ator, ação, resultado e requestId, sem credencial ou conteúdo gerado.

#### Scenario: Requisições repetidas autorizadas
- **WHEN** um Global repete conexões, testes ou consultas além dos antigos tetos por minuto
- **THEN** o servidor continua validando autorização e formato sem emitir RATE_LIMITED nesses endpoints; cotas retornadas pelo provedor permanecem explícitas.

#### Scenario: Erro upstream contém segredo
- **WHEN** um adapter recebe erro contendo a chave ou headers sensíveis
- **THEN** API, logs e auditoria apresentam somente códigos e metadados permitidos, sem reproduzir a mensagem bruta.
