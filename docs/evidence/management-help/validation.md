# Cabeçalho e ajuda da Central de gestão

Validação local em 12/10/2026, no Chrome, com a aplicação em `127.0.0.1:5173`.

- Botão de criação no cabeçalho, à direita do título, nas abas Usuários, Permissões, Agências e Clientes; ajuda outlined com o ícone `CircleQuestionMark` de `lucide-react` antes da ação principal.
- Galeria com oito tours: usuário, acesso direto, agência, cliente, permissões, edição, arquivamento/restauração e busca/visualizações. A galeria filtra as opções pelo papel do usuário.
- Percorridas as 34 etapas dos oito tours no navegador. Conferidos os destaques dos controles, os formulários demonstrativos e a conclusão.
- Verificados voltar uma etapa, encerrar com Escape, fechar o formulário demonstrativo e devolver o foco à ajuda.
- Após o tour, o cadastro normal continua interativo e inicia com acesso direto desligado. Nenhum cadastro foi enviado durante a verificação.
- Formulários dos tours usam `inert` e bloqueiam submissões/mutações, sem preencher credenciais.
- Build/typecheck do frontend, ESLint dos arquivos TypeScript alterados e `git diff --check` aprovados. O aviso existente de bundle acima de 500 kB permanece.

Capturas: `header.png` e `tours.png`. A verificação visual foi feita no viewport desktop existente; não foi executado teste mobile nesta revisão.
