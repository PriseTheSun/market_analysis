# Acesso direto — validação local

Data: 12/10/2026.

- Contratos: 6 testes aprovados em `packages/contracts/src/management.test.ts`.
- API: 10 testes aprovados em `tests/integration/direct-access.test.ts` e `tests/integration/management.test.ts`.
- E2E: 4 execuções aprovadas, Admin e User separadamente em Chromium e WebKit, em `tests/e2e/direct-access.spec.ts`. Conferidos os quatro níveis distintos (Global, Super Admin, Admin, User) e a permissão efetivamente salva após trocar o nível com cliente já vinculado.
- Build de contracts/web, typecheck da API, ESLint dos arquivos alterados e `git diff --check` aprovados. Vite mantém o aviso existente de chunk maior que 500 kB.

Verificado: switch desligado por padrão e exclusivo da criação Global; senha descartada ao desligar; validação de comprimento; seleção de nível e vínculo; login imediato com usuário novo; hash Argon2id sem credenciais na resposta/auditoria; ausência de reset e e-mail; conta sem vínculo sem acesso a clientes; escopos Global, agência e Admin/User por cliente; bloqueio de criação por Super Admin/Admin/User; rollback de vínculos inválidos; conflito de e-mail sem sobrescrever senha; edição rejeita credenciais; fluxo de criação por e-mail preservado.

Os usuários descartáveis criados pelos testes foram arquivados no encerramento de cada execução. O operador Global também é exclusivo do E2E e arquivado ao final, sem consumir a janela de login da conta seed nem alterar os limites de segurança. A captura `create-user.png` mostra apenas o formulário vazio, sem criar conta no navegador do usuário.
