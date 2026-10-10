# Market Analysis

Plataforma de trabalho para agências e seus clientes: acesso controlado, arquivos privados e conversas pessoais. A hierarquia é Agência → Cliente, como Publicis → Nivea. O chat local demonstra o fluxo com respostas determinísticas; não oferece indicadores de mercado ou análise automática de arquivos.

As referências fornecidas pelo usuário orientam composição e interações, preservando o design compartilhado do sistema: Montserrat local, azul da marca, sidebar compacta com animação, ações em reticências, 12 registros por página, português/inglês/espanhol e temas claro/escuro. Os requisitos atuais da conversa complementam a primeira entrega OpenSpec.

Global entra na Central de gestão (`/plataforma/gestao`), com abas Usuários, Permissões, Agências e Clientes. Criação e edição usam painéis laterais. As permissões gerenciam vínculos dos perfis existentes, sem perfis personalizados: Global na plataforma, Super Admin na agência e Admin/User no cliente. Uma pessoa pode atuar em vários clientes com papéis distintos. O seletor de workspace lista as agências autorizadas e seus clientes.

A Central é acessível somente por **Global e Super Admin**. Global mantém todos os cadastros e pode conceder qualquer perfil, incluindo Global. Super Admin vê somente a aba Permissões e gerencia até Super Admin dentro das agências que administra; não altera identidades Global. Admin e User não acessam essa rota. As opções de usuários e clientes respeitam o escopo autorizado.

Excluir um usuário, agência ou cliente significa arquivar, bloquear acesso e preservar histórico e auditoria, com restauração pela mesma central. A remoção de uma permissão revoga apenas aquele vínculo. As proteções do último Global e do Admin responsável permanecem obrigatórias. Novos usuários definem sua senha por link de e-mail; novos clientes exigem um Admin ativo.

As listagens de Usuários, Agências e Clientes exibem Status e o filtro Não arquivados/Arquivados ao lado da busca. Arquivado é distinto de Inativo; a restauração fica no menu de reticências do registro arquivado.

Preferências permite escolher, pré-visualizar, salvar, substituir e remover a foto da própria conta. JPG, PNG e WebP estáticos até 2 MB são recortados em formato quadrado. A imagem aparece no menu da conta, acompanha a pessoa entre workspaces e persiste entre sessões; sem foto, o avatar mantém as iniciais.

Solicitações de acesso continuam em sua própria rota. Nome de agência ou cliente informado no formulário público não concede acesso. As URLs seguem o idioma da conta; rotas antigas redirecionam para a aba equivalente na central.
