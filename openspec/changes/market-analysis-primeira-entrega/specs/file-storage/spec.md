# Spec Delta

## Purpose

Permitir armazenamento real de arquivos privados por tenant, com controle de acesso, limites de transferência e recuperação de falhas.

## ADDED Requirements

### Requirement: Autorização e limites de upload
O sistema SHALL aceitar inicialmente PDF, CSV, XLSX e TXT, com máximo configurável de 25 MiB por arquivo. Antes de emitir autorização curta de upload, o servidor SHALL validar sessão, papel, tenant, extensão, tipo declarado, tamanho e limites de uso. O limite SHALL ser imposto na transferência por storage/policy ou backend, nunca somente pela interface.

#### Scenario: Upload autorizado
- **WHEN** Admin autorizado solicita enviar arquivo permitido no limite configurado
- **THEN** recebe autorização curta limitada ao objeto e tenant definidos pelo servidor, com transferência real para bucket privado

#### Scenario: Cliente ignora limite da interface
- **WHEN** um cliente tenta transferir mais de 25 MiB ou um tipo não permitido, inclusive adulterando metadados
- **THEN** a transferência excedente é bloqueada e o arquivo não fica disponível

#### Scenario: User tenta upload
- **WHEN** User chama diretamente a emissão de autorização ou finalização
- **THEN** a API nega a operação e nenhum arquivo utilizável é criado

### Requirement: Objetos privados e identidade controlada pelo servidor
Buckets SHALL permanecer privados. Keys e associação com agência/tenant SHALL ser geradas pelo servidor; nenhum endpoint SHALL aceitar key arbitrária como autoridade. URLs/policies SHALL ter expiração curta, e a URL usada no navegador SHALL ser válida para o endpoint público configurado.

#### Scenario: Leitura anônima
- **WHEN** visitante tenta acessar diretamente objeto sem autorização válida
- **THEN** o storage nega acesso

#### Scenario: Alteração de key ou tenant
- **WHEN** cliente altera key/escopo da autorização ou envia um objeto de outro tenant à API
- **THEN** o sistema nega transferência/associação/acesso sem revelar o recurso externo

### Requirement: Verificação real antes da disponibilidade
Um arquivo SHALL tornar-se available somente após o backend confirmar existência, tamanho e metadados reais, verificar tipo/conteúdo quando aplicável e revalidar autorização. Callback de navegador SHALL não ser prova suficiente. Reutilização de autorização de upload SHALL não alterar bytes de arquivo já verificado.

#### Scenario: Finalização sem objeto
- **WHEN** o navegador declara conclusão mas o objeto não existe ou tem tamanho/tipo incompatível
- **THEN** a API não marca available e registra estado de falha recuperável

#### Scenario: Replay depois da verificação
- **WHEN** alguém reutiliza autorização de transferência ainda não expirada depois da finalização
- **THEN** o conteúdo disponibilizado anteriormente não pode ser sobrescrito por bytes não verificados

### Requirement: Download autorizado e seguro
Download SHALL exigir nova verificação de sessão, papel e tenant e produzir acesso de curta duração. Arquivos SHALL ser entregues como attachment com nomes seguros, sem execução ou renderização de HTML/conteúdo ativo na aplicação. User SHALL não receber autorização de download.

#### Scenario: Download após revogação
- **WHEN** um antigo administrador solicita nova URL após perder acesso
- **THEN** a emissão é negada; URLs anteriormente emitidas estão limitadas à expiração curta documentada

#### Scenario: Nome de arquivo hostil
- **WHEN** um arquivo contém caracteres ou nome que tentem injetar HTML/headers
- **THEN** nome e resposta são tratados com segurança e o download não executa conteúdo

### Requirement: Estados e exclusão reconciliável
O fluxo SHALL manter estados pending, uploading, available, failed e deleting, oferecer limpeza de uploads abandonados e reconciliar banco/storage. Exclusão SHALL ser idempotente ou compensável e SHALL NOT informar sucesso quando uma etapa necessária falhou.

#### Scenario: Falha parcial na remoção
- **WHEN** o storage falha ao excluir um objeto cuja remoção foi solicitada
- **THEN** o sistema mantém estado recuperável, informa pendência/falha e permite concluir sem apagar registros incompatíveis com o estado real

#### Scenario: Upload abandonado
- **WHEN** o usuário cancela ou desaparece antes de finalizar
- **THEN** a operação deixa de ocupar reservas indefinidamente e objetos temporários são reconciliados por limpeza controlada

### Requirement: Interface de arquivos completa
Perfis autorizados SHALL dispor de seleção por botão/área de upload, validação antecipada, progresso, cancelamento/repetição e listagem paginada com estados claros. Upload concluído/falho SHALL produzir evento real de notificação para destinatário autorizado. Arquivos enviados SHALL não ser apresentados como analisados pelo chat.

#### Scenario: Transferência no navegador local
- **WHEN** o usuário envia arquivo pelo ambiente Compose
- **THEN** progresso acompanha bytes reais, CORS/assinatura funcionam no endpoint acessível e o arquivo verificado aparece após reload

#### Scenario: Falha de rede
- **WHEN** a transferência é interrompida
- **THEN** a UI mostra erro útil, oferece repetição/cancelamento e não apresenta o arquivo como disponível nem analisado
