# Configurações de IA — revisão visual

- Source visual truth: `/Users/erik/Downloads/Configurações de IA simplificadas.png`.
- Implementação: instância principal em `http://127.0.0.1:5173/plataforma/configuracoes-ia` (API real sem credencial). A revisão inicial usou a prévia em `http://localhost:5174/plataforma/configuracoes-ia` e testes controlados em `http://localhost:5175/plataforma/configuracoes-ia`.
- Evidências: `docs/evidence/ai/desktop-connected-chromium.png`, `desktop-connected-webkit.png`, `1440-chromium.png`, `390-chromium.png`, `390-webkit.png`, `desktop-empty.png`.
- Fonte: 1616 × 973 px. Viewport desktop de comparação: 1616 × 973 CSS px, escala 1. Captura full-page inclui a extensão vertical dos metadados operacionais (janela, imagens e cota); largura normalizada 1:1, sem esticar a fonte. Também verificados viewports 1440 e 390 px.
- Estado comparado: PT-BR, claro, Global, token temporário conectado, modelos ainda não selecionados. A fixture visual usa 12.480/50.000, 9.600 de entrada e 2.880 de saída para corresponder à referência; esses números existem somente no teste. A página real usa exclusivamente a API e mostra zero/Não configurado sem credencial.

## Histórico e correções

1. Comparação inicial entre referência e captura sem chave identificou [P2] controles excessivamente altos: os mínimos globais de formulário aumentavam radios e selects, alongando cards. Foram aplicados mínimos locais de 19/38/23 px para radio/select/switch, mantendo labels e foco.
2. A primeira comparação no estado conectado identificou [P2] painel lateral alto: label redundante do provedor, revogação em linha própria e espaçamento acumulado. O label ficou acessível sem ocupar linha; expiração/revogação compartilham linha no desktop; espaçamentos do painel foram compactados.
3. Capturas posteriores foram abertas junto com a referência na mesma comparação. A composição mantém origem acima, proporção aproximadamente 62/38, cards de funcionalidades à esquerda, conexão/uso à direita e rodapé separado. Metadados adicionais de janela/limites explicam a extensão vertical; no mobile o painel de conexão antecede os modelos e não há overflow horizontal.
4. O teste de duplo clique identificou [P1 funcional] troca imediata de “Testar” por “Cancelar” na mesma posição. Agora Testar permanece desabilitado enquanto Cancelar aparece separado, evitando cancelar no segundo clique. O teste confirma uma única geração.
5. A conferência na instância principal identificou diferença de configuração em relação à prévia: o `.env` local existente não continha `APP_ENV`, `AI_GEMINI_ENABLED` e `AI_LOCAL_TOKEN_ENABLED`. As três opções foram configuradas explicitamente para o uso local solicitado, e a API foi reiniciada em loopback. Verificação no Chrome do usuário (1470 × 779 CSS px, DPR 2) confirmou ambiente local, token temporário e limite local; título permanece em 30px. Evidência real de página inteira: `docs/evidence/ai/desktop-local-5173.png`. A captura inteira inclui conteúdo abaixo da dobra; não representa tudo visível simultaneamente nesse viewport. Nenhuma chave foi cadastrada.

## Superfícies verificadas

- **Tipografia:** Montserrat existente, título 30px (25px mobile), subtítulos 14–16px e textos auxiliares 11–13px. Hierarquia e pesos preservados. Selects têm labels explícitos e opções longas permanecem acessíveis no menu nativo.
- **Espaçamento:** bordas finas, raios 5–7px, padding de cards 15–21px, proporções de colunas e alinhamento do rodapé conferidos. 390px usa coluna única e botões quebram linha sem esconder controles.
- **Cores:** tokens do shell existente, azul primário/seleção, fundo claro, badge verde de conectado, âmbar local e violeta de imagem. Sem cores novas aplicadas ao restante do produto.
- **Assets:** logo vetorial oficial existente, ícones Lucide do produto. Não há imagens ou ilustrações novas a gerar. Avatar usa a identidade real da conta, sem reproduzir o avatar ilustrativo da referência.
- **Conteúdo:** textos localizados em PT-BR/EN/ES; “Google Gemini” substitui o genérico “API de teste”. Fonte, expiração, uso e disponibilidade vêm do backend. Ações adicionais de revogar/cancelar e informação sobre limites são requisitos funcionais do módulo.

As imagens desktop foram comparadas em resolução legível para os campos, títulos, badges e números; não foi necessário um recorte adicional para identificar esses detalhes. Mobile foi aberto separadamente para verificar quebras, labels e alcance dos controles. Não restam diferenças P0/P1/P2 na implementação da tela.

## Interações e acessibilidade

Conectar, apagar a chave do campo, substituir/cancelar, selecionar/salvar sem imagem, testes explícitos, duplo clique, navegação por teclado, origem gerenciada indisponível, troca de idioma e proteção do deep link exercitados no navegador. O teste captura erros de JavaScript e verifica ausência do token sentinela em storage e logs. Conflito de versão preserva o rascunho até recarregar. Radios, selects, switches e botões possuem nomes acessíveis; foco é visível pelo estilo existente.

## Ajustes opcionais (P3)

- A referência possui menos informações operacionais e cabe integralmente em 973px; a implementação admite pequena rolagem vertical para mostrar janela, limite de imagens e distinção entre cota externa e limite local.
- Header, avatar e largura da sidebar seguem o shell real, incluindo seletor de idioma/tema, em vez de redesenhar elementos fora do módulo.

final result: passed

# Cards e tabelas — revisão de 12/10/2026

- Source visual truth: `/Users/erik/Downloads/Central de gestão em cartões.png`.
- Implementação real: `http://127.0.0.1:5173/plataforma/gestao`, Global, PT-BR, aba Usuários, modo Cards, sem filtros, tema claro.
- Fonte e captura: 1665 × 945 px, viewport 1665 × 945 CSS px, capturas normalizadas pelo navegador em escala 1:1; sem chrome externo. Ambas foram abertas juntas na mesma entrada de comparação.
- Evidência final: `docs/evidence/collections/cards-desktop.png`. Primeira iteração: `docs/evidence/collections/cards-desktop-before.png`. Estados adicionais: `table-desktop.png`, `cards-mobile.png`, `table-mobile.png`, `cards-dark.png` no mesmo diretório. Mobile: 390 × 844 px/CSS px.

## Findings e histórico de comparação

1. [P2, corrigido] Na primeira captura, e-mails nos cards herdavam a cor escura do botão de identidade. A referência distingue nome e e-mail usando texto secundário. Aplicado `color: var(--muted)` ao detalhe; confirmado na captura final.
2. [P2, corrigido] Etiquetas e status estavam menores que a referência. Ajustados chips para 13px, status para 14px com padding 5px/13px e altura mínima do card de usuário para 272px. A captura final mostra a hierarquia, espaçamento e badges corrigidos.
3. [P2, corrigido] O mínimo dos botões fazia Criar usuário ocupar uma linha extra em 390px. Reduzido somente o padding horizontal do seletor móvel; `cards-mobile.png` confirma Cards/Tabela e Criar usuário na mesma linha com alvos de 44px de altura.
4. Comparação final de fonte e captura simultâneas: três colunas, avatar à esquerda, ações à direita, vínculos em chips azuis/violetas, estado ancorado na base. Sem diferenças P0/P1/P2 pendentes.

## Superfícies de fidelidade

- **Tipografia:** Montserrat existente; nomes de cards 16px, detalhes 14px, chips 13px. E-mails longos recebem reticências visuais e título completo. Hierarquia e truncamento comparados em resolução legível.
- **Espaçamento:** cards com padding 20px, raio 9px e gap 18px; três colunas no desktop e uma no celular (duas também verificadas a 1024px). A grade respeita a largura disponível ao abrir o editor. Seletor segmentado junto aos filtros e antes da criação.
- **Cores:** tokens existentes para fundo, bordas, seleção azul e estados verde/cinza; chips de agência e cliente diferenciados. Tema escuro verificado em `cards-dark.png`, sem fundos brancos residuais.
- **Assets:** logo oficial e Lucide existentes, avatares por iniciais como na referência. Nenhum logo ou ícone redesenhado.
- **Conteúdo:** mesmos usuários iniciais e vínculos reais da imagem. A base atual tem mais registros: a página mantém 12 por página, em vez de limitar aos cinco da referência. Todas as cópias novas incluem PT-BR, EN e ES.

**Diferenças intencionais:** o shell existente (largura 215px, cabeçalho e título) foi preservado, enquanto a referência usa um shell ligeiramente maior; por isso a grade começa antes e tem cards de 456px em vez de aproximadamente 448px. O fundo uniforme e os demais tokens continuam os do produto. A entrega altera visualização das listagens, sem redesenhar a navegação. Os detalhes de cards e controles estão legíveis na comparação em tamanho completo; não foi necessário recorte adicional.

## Interações, verificações e limites

- 14 cenários E2E aprovados: sete no Chromium e sete no WebKit. Gestão com API real: abas, paridade dos registros entre layouts, busca, filtro por agência, paginação e abertura/cancelamento da edição. Preferência após recarga, navegação, sincronização entre abas, isolamento por usuário e falha de gravação no storage.
- As demais superfícies usam fixtures determinísticas de resposta nos testes de layout (solicitações, arquivos, membros, convites e auditoria), sem mutar dados de produção. Clientes da agência também conferidos. Os testes não pretendem revalidar upload, download, aprovação ou geração de IA.
- Notificações: teste real com dados isolados confirma leitura individual e em lote, lista e sino vazios, persistência após recarga e isolamento de destinatário/escopo em Cards e Tabela.
- Tabela móvel mantém semântica de tabela e scroll na própria região; página sem overflow horizontal em 390, 1024 e 1665px. Cards/Tabela têm nome acessível e `aria-pressed`; foco usa o padrão do produto.
- Console da conferência no Chrome: nenhum erro/aviso observado. Build web (inclui TypeScript), lint e `git diff --check` aprovados. Aviso de tamanho do chunk principal já existente continua no build.
- O primeiro teste de auditoria usava um nome de campo incorreto no seletor do teste; corrigido para o texto real “Motivo” e reexecutado com sucesso nos dois motores.

## Implementation checklist

- [x] Seletor compartilhado, padrão Cards e preferência por usuário/navegador.
- [x] Mesmos registros, ações, filtros e paginação nos dois modos.
- [x] Aplicação em todas as rotas com listagens de registros.
- [x] Cards responsivos e tabelas acessíveis em celular.
- [x] Comparação visual final, contraste e regressão funcional.

final result: passed
