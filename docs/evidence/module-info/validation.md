# Informações do módulo — validação

Implementado e validado no ambiente local em 12/10/2026 (America/Sao_Paulo).

## Entrega

- Botão com ícone `Info` do Lucide nas páginas internas, com abas Sobre e Atividades.
- Descrição do módulo, escopo e ações disponíveis conforme a autorização atual.
- Histórico real com autor, registro, data, contexto, filtros, paginação e detalhes antes/depois.
- Credenciais, identificadores de sessão e conteúdo das conversas ficam fora dos dados exibidos.
- Eventos permanecem disponíveis após arquivamento ou remoção do registro; links são calculados somente para registros existentes e acessíveis em telas com rota de detalhe suportada.
- Eventos antigos sem snapshot mantêm suas informações básicas, com indicação de que os detalhes não foram registrados. Não há reconstrução retroativa.

## Verificações

- 57 testes de integração distintos aprovados: atividades (11), gestão, permissões, acesso direto, solicitações, IA e arquivos. Incluem isolamento entre agências/clientes, quatro níveis de acesso, revogação imediata, histórico após remoção e mudanças de permissão.
- 3 testes unitários aprovados para campos permitidos e proteção de credenciais/conteúdo.
- Typecheck do monorepo, ESLint dos arquivos alterados, build web e `git diff --check` aprovados. O build mantém o aviso de tamanho do bundle principal.
- Migration `202610120001_module_activities` aplicada ao banco local; cliente Prisma e contratos gerados.
- Teste real no Chrome: criação e edição de agência, filtro de registro/ação, antes/depois, identificação do autor e abertura do cadastro pelo link Ver registro.
- Abas Sobre verificadas na gestão, configurações de IA e chat. No chat, escopo Aurora e histórico restrito ao próprio usuário; estado vazio validado após correção do contador em português.
- Layout móvel em 390 × 844: conteúdo acessível por rolagem interna, sem transbordamento horizontal; viewport restaurado ao terminar.

A agência criada exclusivamente para o teste (`validacao-historico-modulo-20261012`) foi arquivada após a verificação, preservando o histórico. As capturas mostram o estado durante o teste. Nenhuma chamada a provedor de IA foi necessária.

## Evidências

- [Sobre](about.png)
- [Histórico e antes/depois no desktop](activity-desktop.png)
- [Detalhes no celular](activity-mobile.png)

Esta entrega não altera a hierarquia de permissões nem adiciona exclusão definitiva de usuários, agências ou clientes. Ela registra e apresenta os eventos disponíveis nos fluxos existentes.
