# Solicitações de acesso — 12/10/2026

- API: 3 testes de integração passaram (`tests/integration/access-request-actions.test.ts`). Cobrem autorização Global, combinação agência/cliente inválida, aprovação idempotente, reatribuição com revogação do convite anterior, reenvio/renovação, rejeição e consulta dos rejeitados, bloqueio após aceite e ausência de criação antecipada de usuário.
- Interface: `tests/e2e/request-actions.spec.ts` passou em Chromium e WebKit (2 execuções). Fluxo real com solicitações descartáveis: cards/tabela, tag única, agência atribuída, seletor com recuo de pelo menos 12px, edição, reenvio, cancelamento/rejeição e persistência após recarregar.
- Jornada pública: `tests/e2e/access-review.spec.ts` passou em Chromium e WebKit (2 execuções). Solicitação pública, escolha de agência/cliente, aprovação, entrega no Mailpit, aceite e login do novo usuário, ações bloqueadas após aceite.
- Typecheck da API, build do frontend, ESLint dos arquivos alterados e `git diff --check` passaram.
- Inspeção no Chrome: seta recuada 14px; coluna “Nome da agência”; uma tag por registro; menu com Reenviar e-mail, Editar e Rejeitar. Para convite aceito, o menu informa que os vínculos são gerenciados na Central de gestão.

Captura: [tabela atualizada](table-updated.png).
