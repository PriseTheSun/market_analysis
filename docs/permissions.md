# Permissões e isolamento

| Operação | Global | Super Admin | Admin | User |
| --- | --- | --- | --- | --- |
| Agências/tenants/estado de conta/papel Global | Plataforma | Não | Não | Não |
| Atribuir Super Admin | Plataforma | Suas agências | Não | Não |
| Acessar Central de gestão | Todas as abas | Somente Permissões | Não | Não |
| Triagem de pedido sem classificação | Plataforma | Não | Não | Não |
| Revisar pedido já classificado | Qualquer tenant ativo | Sua agência | Seu tenant | Não |
| Gerir Admin/User e convites | Qualquer tenant ativo | Sua agência | Seu tenant | Não |
| Upload/lista/download/exclusão de arquivos | Qualquer tenant ativo | Sua agência | Seu tenant | Não |
| Conversas pessoais | Apenas próprias | Apenas próprias | Apenas próprias | Apenas próprias |
| Auditoria excepcional de conversas | Tela separada, motivo obrigatório | Não | Não | Não |
| Preferências, notificações, tour | Próprios | Próprios | Próprios | Próprios |

Global é atributo da identidade. Super Admin é vínculo de agência. Admin/User são vínculos de tenant; uma pessoa pode ter papéis diferentes em dois tenants. A política usa o contexto da requisição, não o maior papel da pessoa. Conta e vínculos são revalidados em cada operação; streams revalidam em heartbeat de 2 s, com teste de revogação abaixo de 5 s.

A agência é derivada do tenant no servidor. Nome de agência ou cliente no formulário público nunca concede acesso. Aprovar cria convite e entrega, sem sessão ou vínculo ativo antecipado. Uma identidade existente deve autenticar com o e-mail convidado; o aceite preserva senha e outros vínculos. Tenants novos ficam em provisioning até o primeiro Admin aceitar. Convite antigo não reativa tenant disabled.

Alterações do grafo de acesso usam lock transacional compartilhado e validam que reste um Global ativo e um Admin com conta/vínculo ativos para cada tenant ativo, inclusive ao desativar uma conta com vários vínculos.

PostgreSQL aplica RLS com FORCE ao conteúdo por tenant. O pool runtime não é owner, superuser nem BYPASSRLS; o contexto é definido com `set_config(..., true)` dentro de transações curtas. Relacionamentos compostos impedem mensagem ligada à conversa de outro tenant. Propriedade de conversa é validada no serviço; RLS complementa a fronteira de tenant e não substitui as políticas. O runtime mantém acesso às tabelas de identidade necessárias à autenticação, sem permissão de alterar schema. Auditoria é append-only para runtime.

Notificações têm destinatário e escopo; escopo nulo exige Global. A consulta reavalia permissões e omite antigos eventos administrativos de arquivo/pedido/convite se a pessoa passar a User. Contagens e marcação usam os mesmos filtros. Um link S3 já emitido não pode ser revogado individualmente e permanece válido até a expiração de 60 s.

As contas demo abrangentes servem para demonstrar navegação. A prova negativa usa agências A/B e tenants A1/A2/B1 restritos nos testes, incluindo papel Admin em A1 e User em A2.

## Central de gestão

A Central de gestão exige Global ou vínculo ativo de Super Admin em agência ativa. Global acessa todas as abas e pode conceder até Global. Super Admin acessa somente Permissões, podendo conceder/editar/revogar Super Admin nas suas agências e Admin/User nos clientes dessas agências. Admin e User não acessam a rota nem seus endpoints. Os cadastros de usuários, agências e clientes permanecem exclusivos de Global, inclusive leitura das listas administrativas e restauração. Os formulários validam Agência → Cliente no servidor e não aceitam perfis arbitrários. Salvar dados do usuário afeta seus vínculos diretos com clientes; Global e Super Admin são administrados separadamente na aba Permissões. A criação de cliente na central associa um Admin existente e o ativa na mesma transação; o fluxo anterior de convite/bootstrap continua com suas regras de provisioning.

O arquivamento mantém as entidades e os vínculos, marca usuário/agência como inativos ou cliente como disabled, e registra auditoria. Arquivar usuário revoga sessões e tokens de senha. Edição legada não reativa registros arquivados; restauração é explícita e revalida os responsáveis. Trocar o e-mail invalida sessões, tokens de senha e convites pendentes para o endereço anterior. Nenhuma dessas operações remove conversas ou eventos de auditoria.

Para Super Admin, opções, busca e paginação incluem somente agências administradas, seus clientes e usuários já vinculados a esses escopos. Identidades Global não aparecem e seus vínculos não podem ser modificados por Super Admin. A API revalida o papel e a agência em cada requisição, valida IDs antigos e novos durante edição e mantém alterações sob o lock transacional do grafo de acesso. A revogação do vínculo Super Admin ou a desativação da agência bloqueia a próxima operação.
